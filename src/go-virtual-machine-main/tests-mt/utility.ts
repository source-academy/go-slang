import { CompileData } from '../virtual-machine'
import parser from '../virtual-machine/compiler/parser'
import {
  SourceFileTokens,
  TokenLocation,
} from '../virtual-machine/compiler/tokens'
import { compile_tokens, CompileError } from '../virtual-machine/executor'
import { Instruction } from '../virtual-machine/executor/instructions'
import { GCPHASE, Heap } from '../virtual-machine/heap'
import { ContextNode } from '../virtual-machine/heap/types/context'
import {
  EnvironmentNode,
  FrameNode,
} from '../virtual-machine/heap/types/environment'
import { RunQueueNode } from '../virtual-machine/heap/types/runqueue'
import { SaveStackNode } from '../virtual-machine/heap/types/saveStack'
import { StateInfo } from '../virtual-machine/runtime/debugger'
import { DebuggerV2 } from '../virtual-machine/runtime/debuggerV2'
import {
  MessageType,
  WorkerToScheduler,
} from '../virtual-machine/runtime/message'
import { ProcessV2Status } from '../virtual-machine/runtime/processV2'
import { Thread } from '../virtual-machine/runtime/thread'
import {
  clearLocalThread,
  setLocalThread,
} from '../virtual-machine/runtime/worker'

type RunResult = {
  output?: string
  instructions: Instruction[]
  symbols?: (TokenLocation | null)[]
  error?: {
    message: string
    type: 'parse' | 'compile' | 'runtime'
    details?: Error | string
  }
  visualData: StateInfo[]
}

function insertSemicolons(input: string): string {
  const autoInsertTokens = [
    /^[*&]?[a-zA-Z_][a-zA-Z0-9_]*$/,
    /^[0-9]+$/,
    /^[0-9]+\.[0-9]*$/,
    /^0x[0-9a-fA-F]+$/,
    /^0b[01]+$/,
    /^0o[0-7]+$/,
    /^".*"$/,
    /^'.*'$/,
    /^`[^`]*`$/,
    /[)\]}]$/,
    /(\+\+|--)\s*$/,
    /\b(break|continue|fallthrough|return)$/,
  ]
  const lines = input.split('\n')
  const resultLines = lines.map((line) => {
    const trimmed = line.trim()
    if (
      trimmed === '' ||
      trimmed.endsWith(';') ||
      trimmed.endsWith('{') ||
      trimmed.startsWith('//')
    ) {
      return line
    }
    const tokens = trimmed.split(/\s+/)
    const lastToken = tokens[tokens.length - 1]
    const shouldInsert = autoInsertTokens.some((rule) =>
      typeof rule === 'string' ? rule === lastToken : rule.test(lastToken),
    )
    return shouldInsert ? line + ';' : line
  })
  return resultLines.join('\n')
}

type BlockingContext = { addr: number; generation: number }

function runCodeSyncMT(
  source_code: string,
  heapsize: number,
  deterministic = true,
): RunResult {
  const code = insertSemicolons(source_code)
  let tokens: SourceFileTokens
  try {
    tokens = parser.parse(code) as SourceFileTokens
  } catch (err) {
    const message = (err as Error).message
    return {
      instructions: [],
      output: message,
      error: { message, type: 'parse', details: err as string },
      visualData: [],
    }
  }

  let instructions: Instruction[] = []
  let symbols: (TokenLocation | null)[] = []
  try {
    const temp = compile_tokens(tokens)
    instructions = temp.instructions
    symbols = temp.symbols
  } catch (err) {
    const message = (err as CompileError).message
    return {
      instructions: [],
      output: message,
      error: { message, type: 'compile', details: err as CompileError },
      visualData: [],
    }
  }

  // Clear stale local_thread from any prior test so the new heap's constructor
  // doesn't see a non-undefined thread with cached addresses that reference
  // the old heap (gc_init_flag_addr is unset during construction).
  clearLocalThread()

  // Set up MT heap (is_alloc_ready = false during init)
  const heap = new Heap(heapsize, true, true)

  // Create main goroutine (mirrors Scheduler.create_main_goroutine)
  const main_goroutine = ContextNode.create(heap)
  const base_frame = FrameNode.create(0, heap)
  const base_env = EnvironmentNode.create(base_frame.addr, [], false, heap)
  main_goroutine.set_E(base_env.addr)
  const main_goroutine_addr = main_goroutine.addr

  // Create a single runqueue and save stack
  const runqueue = RunQueueNode.create(heap)
  const save_stack = SaveStackNode.create(heap)
  heap.save_stack_addrs = [save_stack.addr]

  // Create debugger and thread (no heap allocation)
  const debugger_instance = new DebuggerV2(
    [runqueue.addr],
    heap,
    instructions,
    symbols,
  )
  const thread = new Thread(
    0,
    runqueue.addr,
    instructions,
    heap,
    debugger_instance,
    deterministic,
    false,
    main_goroutine_addr,
  )

  // Set local_thread before enabling allocation so handle_before_alloc works
  setLocalThread(thread)

  heap.is_alloc_ready = true
  heap.calc_target_mem()

  // Push main goroutine into runqueue
  runqueue.push(main_goroutine_addr)

  // Mini-scheduler: intercept postMessage calls synchronously
  let stdout = ''
  const blocking_waitlists = new Map<number, BlockingContext[]>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const original_postMessage = (globalThis as any).postMessage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).postMessage = (message: WorkerToScheduler) => {
    switch (message.type) {
      case MessageType.STDOUT:
        stdout += message.message
        break
      case MessageType.BLOCK: {
        const { context_addr, obj_addrs, generations } = message
        for (let i = 0; i < obj_addrs.length; i++) {
          const obj_addr = obj_addrs[i]
          if (!blocking_waitlists.has(obj_addr)) {
            blocking_waitlists.set(obj_addr, [])
          }
          ;(blocking_waitlists.get(obj_addr) as BlockingContext[]).push({
            addr: context_addr,
            generation: generations[i],
          })
        }
        break
      }
      case MessageType.UNBLOCK: {
        for (let i = 0; i < message.obj_addrs.length; i++) {
          const obj_addr = message.obj_addrs[i]
          const obj_gen = message.generations[i]
          const waitlist = blocking_waitlists.get(obj_addr)
          const unblocked = waitlist?.shift()
          if (unblocked === undefined) continue
          if (unblocked.generation >= obj_gen) {
            waitlist?.unshift(unblocked)
            continue
          }
          const ctx = heap.get_value(unblocked.addr) as ContextNode
          if (!ctx.is_blocked()) continue
          ctx.set_blocked(false)
          runqueue.push(unblocked.addr)
        }
        break
      }
      case MessageType.UNBLOCK_ALL: {
        for (let i = 0; i < message.obj_addrs.length; i++) {
          const obj_addr = message.obj_addrs[i]
          const obj_gen = message.generations[i]
          const waitlist = blocking_waitlists.get(obj_addr)
          while (waitlist && waitlist.length > 0) {
            const unblocked = waitlist.shift()
            if (unblocked === undefined) break
            if (unblocked.generation >= obj_gen) {
              waitlist.unshift(unblocked)
              break
            }
            const ctx = heap.get_value(unblocked.addr) as ContextNode
            if (!ctx.is_blocked()) continue
            ctx.set_blocked(false)
            runqueue.push(unblocked.addr)
          }
        }
        break
      }
      case MessageType.GC: {
        if (heap.metadata.get_out_of_mem()) {
          const extra_roots: number[] = [runqueue.addr, save_stack.addr]
          for (const waitlist of blocking_waitlists.values()) {
            for (const entry of waitlist) extra_roots.push(entry.addr)
          }
          do {
            heap.tri_color_step(extra_roots)
          } while (heap.metadata.get_gc_phase() !== GCPHASE.NONE)
          heap.metadata.increment_gc_cycle(1)
          heap.metadata.notify_gc_cycle()
        }
        break
      }
      // NEW_GOROUTINE, FINISHED, READY, ERROR: ignored in test environment
      default:
        break
    }
  }

  let result: { status: ProcessV2Status; message: string }
  try {
    result = thread.process.start()
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).postMessage = original_postMessage
  }

  if (result.status === ProcessV2Status.ERROR) {
    return {
      instructions,
      output: result.message,
      error: {
        message: result.message,
        type: 'runtime',
        details: result.message,
      },
      visualData: [],
    }
  }

  if (result.status === ProcessV2Status.EMPTY_RUNQUEUE) {
    const hasBlocked = Array.from(blocking_waitlists.values()).some(
      (list) => list.length > 0,
    )
    if (hasBlocked) {
      const errorMessage =
        'Execution Error: all goroutines are asleep - deadlock!'
      return {
        instructions,
        output: errorMessage,
        error: {
          message: errorMessage,
          type: 'runtime',
          details: errorMessage,
        },
        visualData: [],
      }
    }
    return {
      instructions,
      symbols,
      output: stdout,
      visualData: [],
      error: undefined,
    }
  }

  // FINISHED: main goroutine completed — return output collected so far
  return {
    instructions,
    symbols,
    output: stdout,
    visualData: [],
    error: undefined,
  }
}

/** Runs the code in a main function (MT runtime) */
export const mainRunnerMT = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCodeSyncMT(packagedCode, 65536, true)
}

/** Runs the code in a main function with randomised context switch (MT runtime) */
export const mainRunnerRandomMT = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCodeSyncMT(packagedCode, 65536, false)
}

/** Runs the code as a whole (MT runtime) */
export const codeRunnerMT = (code: string) => {
  return runCodeSyncMT(code, 65536, true)
}

/** Runs the code as a whole with randomised context switch (MT runtime) */
export const codeRunnerRandomMT = (code: string) => {
  return runCodeSyncMT(code, 65536, false)
}

export const compileCodeMT = (source_code: string): CompileData => {
  const code = insertSemicolons(source_code)
  let instructions: Instruction[] = []
  let symbols: (TokenLocation | null)[] = []
  let message = ''
  let tokens = null
  try {
    tokens = parser.parse(code) as SourceFileTokens
  } catch (err) {
    message = (err as Error).message
    return {
      instructions: [],
      symbols: [],
      output: message,
      error: { message, type: 'parse', details: err as string },
      visualData: [],
    }
  }
  try {
    const temp = compile_tokens(tokens)
    instructions = temp.instructions
    symbols = temp.symbols
  } catch (err) {
    message = (err as CompileError).message
    return {
      instructions: [],
      symbols: [],
      output: message,
      error: { message, type: 'compile', details: err as string },
      visualData: [],
    }
  }
  return {
    instructions,
    symbols,
    output: '',
    error: undefined,
    visualData: [],
  }
}
