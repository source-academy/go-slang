import { Process } from '../../executor/process'

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
