import { BoolNode } from '../../heap/types/primitives'
import { Process } from '../../runtime/process'

import { Instruction } from './base'

export class JumpInstruction extends Instruction {
  addr: number

  constructor(addr = 0) {
    super('JUMP')
    this.addr = addr
  }

  override toString(): string {
    return super.toString() + ' ' + this.addr.toString()
  }

  set_addr(addr: number) {
    this.addr = addr
  }

  override execute(process: Process): void {
    process.context.set_PC(this.addr)
  }
}

export class JumpIfFalseInstruction extends JumpInstruction {
  constructor(addr = 0) {
    super(addr)
    this.tag = 'JUMP_IF_FALSE'
  }

  override execute(process: Process): void {
    const pred = (
      process.heap.get_value(process.context.popOS()) as BoolNode
    ).get_value()
    if (!pred) process.context.set_PC(this.addr)
  }
}

export class ExitLoopInstruction extends JumpInstruction {
  constructor(addr = 0) {
    super(addr)
    this.tag = 'JUMP_LOOP'
  }

  override execute(process: Process): void {
    while (!process.context.E().if_for_block()) {
      process.context.popRTS()
    }
    process.context.set_PC(this.addr)
  }
}
