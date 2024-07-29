import * as seedrandom from 'seedrandom'

import { DoneInstruction, Instruction } from '../compiler/instructions'
import { Heap } from '../heap'
import { ContextNode } from '../heap/types/context'
import { EnvironmentNode, FrameNode } from '../heap/types/environment'
import { QueueNode } from '../heap/types/queue'
import { TokenLocation } from '../parser/tokens'

import { Debugger, StateInfo } from './debugger'

type ProcessOutput = {
  stdout: string
  visual_data: StateInfo[]
  errorMessage?: string
}

export class Process {
  instructions: Instruction[]
  heap: Heap
  context: ContextNode
  contexts: QueueNode
  stdout: string
  generator: seedrandom.PRNG
  debug_mode: boolean
  debugger: Debugger
  runtime_count = 0
  constructor(
    instructions: Instruction[],
    heapsize: number,
    symbols: (TokenLocation | null)[],
    visualmode = false,
  ) {
    this.instructions = instructions
    this.heap = new Heap(heapsize)
    this.contexts = this.heap.contexts
    this.context = new ContextNode(this.heap, this.contexts.peek())
    this.stdout = ''
    console.log(this.heap.mem_left)
    const base_frame = FrameNode.create(0, this.heap)
    const base_env = EnvironmentNode.create(
      base_frame.addr,
      [],
      false,
      this.heap,
    )
    this.context.set_E(base_env.addr)
    const randomSeed = Math.random().toString(36).substring(2)
    this.generator = seedrandom.default(randomSeed)

    this.debug_mode = visualmode
    this.debugger = new Debugger(this.heap, this.instructions, symbols)
    if (this.debug_mode)
      this.debugger.context_id_map.set(
        this.context.addr,
        this.debugger.context_id++,
      )
    this.heap.debugger = this.debugger
  }

  start(): ProcessOutput {
    try {
      const time_quantum = 30
      this.runtime_count = 0
      let completed = false
      const main_context = this.contexts.peek()
      while (this.contexts.sz()) {
        this.context = new ContextNode(this.heap, this.contexts.peek())
        let cur_time = 0
        while (!DoneInstruction.is(this.instructions[this.context.PC()])) {
          if (cur_time >= time_quantum) {
            // Context Switch
            this.contexts.push(this.context.addr)
            break
          }
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
          if (this.debug_mode) this.debugger.generate_state(pc, this.stdout)
          if (this.context.is_blocked()) break
        }
        if (
          DoneInstruction.is(this.instructions[this.context.PC()]) &&
          this.context.addr === main_context
        ) {
          completed = true
          break
        }
        this.contexts.pop()
        // console.log('%c SWITCH!', 'background: #F7FF00; color: #FF0000')
        if (this.runtime_count > 10 ** 5) throw Error('Time Limit Exceeded!')
        // console.log('PC', this.contexts.get_vals())
      }
      if (!completed && !this.heap.blocked_contexts.is_empty())
        throw Error('All threads are blocked!')

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

  print(string: string) {
    this.stdout += string
  }
}
