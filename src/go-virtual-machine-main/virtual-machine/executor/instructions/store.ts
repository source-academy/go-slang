import { ArrayNode } from '../../heap/types/array'
import { BoolNode } from '../../heap/types/primitives'
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
    super('STORE ARRAY ELEMENT')
    this.index = index
  }

  override execute(process: Process): void {
    const dst = process.context.popOS()
    const src = process.context.popOS()
    const array = new ArrayNode(process.heap, dst)
    /*
    if (this.index < 0 || this.index >= array.length()) {
      throw new Error(
        `Index out of range [${this.index}] with length ${array.length()}`,
      )
    }
    */
    let element = array.get_child(0)
    while (process.heap.get_value(element) instanceof ArrayNode) {
      element = (process.heap.get_value(element) as ArrayNode).get_child(0)
    }
    let sizeof = 2
    if (process.heap.get_value(element) instanceof BoolNode) sizeof = 1
    process.heap.copy(element + sizeof * this.index, src)
    
    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}
