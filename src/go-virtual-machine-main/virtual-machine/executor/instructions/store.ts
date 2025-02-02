import { Process } from '../../runtime/process'

import { Instruction } from './base'

export class StoreInstruction extends Instruction {
  constructor() {
    super('STORE')
  }

  override execute(process: Process): void {
    const dst = process.context.popOS()
    const src = process.context.popOS()
    process.heap.copy(dst, src)

    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}

export class StoreArrayElementInstruction extends Instruction {
  index: number
  constructor(index: number) {
    super('STORE ARRAY ELEMENT ' + index)
    this.index = index
  }

  override execute(process: Process): void {
    const dst = process.context.popOS()
    const src = process.context.popOS()
    process.heap.copy(dst + 4 + 2 * this.index, src)
    process.context.pushOS(dst)

    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}
