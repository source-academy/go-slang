import { Process } from '../../runtime/process'

// Interface for all instructions
export abstract class Instruction {
  tag: string

  constructor(tag: string) {
    this.tag = tag
  }

  abstract execute(process: Process): void

  toString(): string {
    return this.tag
  }
}

// Instruction class that marks the end of a process/program
export class DoneInstruction extends Instruction {
  constructor() {
    super('DONE')
  }

  static is(instr: Instruction): instr is DoneInstruction {
    return instr.tag === 'DONE'
  }

  override execute(_process: Process): void {
    // Do nothing.
  }
}

/** Instruction class for popping a value off the operand stack of the process */
export class PopInstruction extends Instruction {
  constructor() {
    super('POP')
  }

  static is(instr: Instruction): instr is DoneInstruction {
    return instr.tag === 'POP'
  }

  override execute(process: Process): void {
    process.context.popOS()
  }
}

/** Instruction class for no operation, used as a placeholder instruction  */
export class NoInstruction extends Instruction {
  constructor() {
    super('NIL')
  }

  static is(instr: Instruction): instr is DoneInstruction {
    return instr.tag === 'NIL'
  }

  override execute(_process: Process): void {
    // Do nothing.
  }
}
