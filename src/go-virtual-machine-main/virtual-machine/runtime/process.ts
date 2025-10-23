import * as seedrandom from 'seedrandom'

import { TokenLocation } from '../compiler/tokens'
import {
  DoneInstruction,
  GoInstruction,
  Instruction,
} from '../executor/instructions'
import { Heap, is_tri_color } from '../heap'
import { ContextNode } from '../heap/types/context'
import { EnvironmentNode, FrameNode } from '../heap/types/environment'
import { MethodNode } from '../heap/types/func'
import { QueueNode } from '../heap/types/queue'

import { Debugger, StateInfo } from './debugger'

// Represents the result when a process finishes
type ProcessOutput = {
  stdout: string
  visual_data: StateInfo[]
  errorMessage?: string
}

export class Process {
  instructions: Instruction[] // Sequence of instructions
  heap: Heap // Memory manager
  context: ContextNode // Current execution context
  contexts: QueueNode // Queue of contexts for managing multiple goroutines, can be thought of as ready queues
  stdout: string // Text accumulated in program
  generator: seedrandom.PRNG // Pseudo random number generator
  debug_mode: boolean // True if running visual debugging mode
  debugger: Debugger // Trace states
  runtime_count = 0 // Counts how many instructions executed
  deterministic: boolean // Whether execution should be deterministic or not
  save_stack: number[]
  constructor(
    instructions: Instruction[],
    heapsize: number,
    symbols: (TokenLocation | null)[], // metadata for debugging
    deterministic: boolean,
    visualmode = false,
  ) {
    this.instructions = instructions
    this.heap = new Heap(heapsize)
    this.contexts = this.heap.contexts
    // Create initial execution context using the first context in the queue. This will be the main context
    this.context = new ContextNode(this.heap, this.contexts.peek())
    this.stdout = ''
    console.log(this.heap.mem_left)
    // Base call frame at heap addr 0
    const base_frame = FrameNode.create(0, this.heap)
    const base_env = EnvironmentNode.create(
      base_frame.addr, // tied to base frame addr
      [], // initialise empty list of variables
      false,
      this.heap,
    )
    // Links context's environment ptr to this new env
    this.context.set_E(base_env.addr)
    const randomSeed = Math.random().toString(36).substring(2)
    this.generator = seedrandom.default(randomSeed)
    this.deterministic = deterministic
    this.save_stack = this.heap.save_stack

    this.debug_mode = visualmode
    this.debugger = new Debugger(this.heap, this.instructions, symbols)
    if (this.debug_mode)
      this.debugger.context_id_map.set(
        this.context.addr,
        this.debugger.context_id++, // increase id after storing so next context has increasing id
      )
    this.heap.debugger = this.debugger
  }

  start(): ProcessOutput {
    // Each context can run up to 30 instructions
    this.heap.gc_profiler.start_program()
    const time_quantum = 30
    this.runtime_count = 0
    let completed = false
    try {
      const main_context = this.contexts.peek()
      // While there are contexts in the run queue
      while (this.contexts.sz()) {
        if (this.deterministic) {
          this.context = new ContextNode(this.heap, this.contexts.peek())
        } else {
          this.context = new ContextNode(this.heap, this.contexts.randompeek())
        }
        let cur_time = 0
        // Execute this context until it hits a done instruction
        while (!DoneInstruction.is(this.instructions[this.context.PC()])) {
          if (is_tri_color) this.heap.tri_color_step()
          if (cur_time >= time_quantum) {
            // Context Switch by pushing context to end of queue
            this.contexts.push(this.context.addr)
            break
          }
          // OS stands for Operand Stack, 1 means treat next instruction as a goroutine method call
          if (this.context.OS().sz() > 0 && this.context.peekOS() === 1) {
            // a hacky way of handling goroutines when the callee is a MethodNode instead of FuncNode
            this.context.popOS()
            const instr = this.instructions[
              this.context.incr_PC()
            ] as GoInstruction
            // MethodNode represents the callee
            const func = this.heap.get_value(
              this.context.peekOSIdx(instr.args),
            ) as MethodNode
            const receiver = func.receiver()
            receiver.handleMethodCall(this, func.identifier(), instr.args)
            break
          }
          // Save current pc and get next instruction for execution
          const pc = this.context.PC()
          const instr = this.instructions[this.context.incr_PC()]
          // console.log('ctx:', this.context.addr)
          // console.log('Instr:', instr, this.context.PC() - 1)
          instr.execute(this)
          // this.context.printOS()
          // this.context.printRTS()
          // this.context.heap.print_freelist()
          this.runtime_count += 1
          cur_time += 1
          // If this is not the main context and runtime stack is empty, goroutine is completed
          if (
            this.context.addr !== main_context &&
            this.context.RTS().sz() === 0
          ) {
            // thread has completed
            break
          }
          // State snapshot for debug mode
          if (this.debug_mode) this.debugger.generate_state(pc, this.stdout)
          // Stop context if blocked
          if (this.context.is_blocked()) {
            break
          }
        }
        // If done instruction has been hit in main context then stop all
        if (
          DoneInstruction.is(this.instructions[this.context.PC()]) &&
          this.context.addr === main_context
        ) {
          completed = true
          break
        }
        // Remove old head from ready queue
        this.contexts.pop()
        // console.log('%c SWITCH!', 'background: #F7FF00; color: #FF0000')
        if (this.runtime_count > 10 ** 5) throw Error('Time Limit Exceeded!')
        // console.log('PC', this.contexts.get_vals())
      }

      // If main didn't complete and there are blocked goroutines with no runnable ones, throw deadlock error
      if (!completed && !this.heap.blocked_contexts.is_empty())
        throw Error('all goroutines are asleep - deadlock!')

      this.heap.gc_profiler.end_program()

      const pause_time = (this.heap.gc_profiler.total_pause_time - this.heap.gc_profiler.partial_pause_time) / this.heap.gc_profiler.num_gc
      const mutator_time = this.heap.gc_profiler.program_time - this.heap.gc_profiler.total_pause_time
      const throughput_ratio = mutator_time / (mutator_time + this.heap.gc_profiler.total_gc_time)

      console.log('Program Time: %d', this.heap.gc_profiler.program_time)
      console.log('Avg Pause Time: %d', pause_time)
      console.log('GC Frequency: %d', this.heap.gc_profiler.num_gc)
      console.log('Pause Time: %d', this.heap.gc_profiler.total_pause_time)
      console.log('Throughput Ratio: %d', throughput_ratio)
      
      return {
        stdout: this.stdout,
        visual_data: this.debug_mode ? this.debugger.data : [],
      }
    } catch (err) {
      console.warn(err)
      let errorMessage: string | undefined = undefined
      if (err instanceof Error) errorMessage = 'Execution Error: ' + err.message

      return {
        stdout: 'An Error Occurred!',
        visual_data: this.debug_mode ? this.debugger.data : [],
        errorMessage,
      }
    }
  }

  mark_save_stack(addr: number) {
    if (this.heap.bitmap.is_marked(addr)) return
    this.heap.bitmap.set_mark(addr, true)
    this.save_stack.push(addr)
  }

  print(string: string) {
    this.stdout += string
  }
}
