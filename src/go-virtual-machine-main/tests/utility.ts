import * as seedrandom from 'seedrandom'

import { CompileData } from '../virtual-machine'
import parser from '../virtual-machine/compiler/parser'
import {
  SourceFileTokens,
  TokenLocation,
} from '../virtual-machine/compiler/tokens'
import { compile_tokens, CompileError } from '../virtual-machine/executor'
import { Instruction } from '../virtual-machine/executor/instructions'
import { Heap } from '../virtual-machine/heap'
import { ContextNode } from '../virtual-machine/heap/types/context'
import {
  EnvironmentNode,
  FrameNode,
} from '../virtual-machine/heap/types/environment'
import { Debugger, StateInfo } from '../virtual-machine/runtime/debugger'
import { Process } from '../virtual-machine/runtime/process'

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

function runCodeSync(
  source_code: string,
  heapsize: number,
  deterministic = true,
  visualisation = false,
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

  const process = new Process(
    instructions,
    heapsize,
    symbols,
    deterministic,
    visualisation,
    false,
  )
  const result = process.start()

  if (result.errorMessage) {
    return {
      instructions,
      output: result.errorMessage,
      error: {
        message: result.errorMessage,
        type: 'runtime',
        details: result.errorMessage,
      },
      visualData: result.visual_data,
    }
  }

  return {
    instructions,
    symbols,
    output: result.stdout,
    visualData: result.visual_data,
    error: undefined,
  }
}

/** Runs the code in a main function */
export const mainRunner = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCodeSync(packagedCode, 4096, true)
}

/** Runs the code in a main function with randomised context switch */
export const mainRunnerRandom = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCodeSync(packagedCode, 4096, false)
}

/** Runs the code as a whole */
export const codeRunner = (code: string) => {
  return runCodeSync(code, 4096, true)
}

/** Runs the code as a whole with randomised context switch */
export const codeRunnerRandom = (code: string) => {
  return runCodeSync(code, 4096, false)
}

export const compileCode = (source_code: string): CompileData => {
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
      error: {
        message,
        type: 'parse',
        details: err as string,
      },
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
      error: {
        message,
        type: 'compile',
        details: err as string,
      },
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

export const runCodeWithHeap = (
  compiled: CompileData,
  heap: Heap,
  deterministic = true,
  visualisation = true,
) => {
  const instructions = compiled.instructions
  const symbols = compiled.symbols
  const process = new Process(
    instructions,
    4096,
    symbols,
    deterministic,
    visualisation,
    false,
  )
  process.instructions = instructions
  process.heap = heap
  process.contexts = process.heap.contexts
  process.context = new ContextNode(process.heap, process.contexts.peek())
  process.stdout = ''
  const base_frame = FrameNode.create(0, process.heap)
  const base_env = EnvironmentNode.create(
    base_frame.addr,
    [],
    false,
    process.heap,
  )
  process.context.set_E(base_env.addr)
  const randomSeed = Math.random().toString(36).substring(2)
  process.generator = seedrandom.default(randomSeed)
  process.deterministic = deterministic
  process.debug_mode = visualisation
  process.debugger = new Debugger(process.heap, process.instructions, symbols)
  if (process.debug_mode)
    process.debugger.context_id_map.set(
      process.context.addr,
      process.debugger.context_id++,
    )
  process.heap.debugger = process.debugger
  const result = process.start()
  if (result.errorMessage) {
    return {
      instructions: [],
      output: result.errorMessage,
      error: {
        message: result.errorMessage,
        type: 'runtime' as const,
        details: result.errorMessage,
      },
      visualData: [],
    }
  }
  return {
    instructions,
    output: result.stdout,
    visualData: result.visual_data,
    error: undefined,
  }
}
