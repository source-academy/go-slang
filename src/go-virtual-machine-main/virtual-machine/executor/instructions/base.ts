import { Process } from '../../runtime/process'

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