import { ArrayNode } from '../../heap/types/array'
import { BaseNode } from '../../heap/types/base'
import { ReferenceNode } from '../../heap/types/reference'
import { StructNode } from '../../heap/types/struct'
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

  peek(
    process: Process,
    struct: StructNode | ArrayNode,
    target: number,
    count: number,
  ): number | BaseNode {
    for (let i = 0; i < struct.get_children().length; i++) {
      const child = process.heap.get_value(struct.get_child(i))
      if (child instanceof StructNode || child instanceof ArrayNode) {
        const res = this.peek(process, child, target, count)
        if (res instanceof BaseNode) {
          return res
        } else {
          count = res
        }
      } else {
        if (count === target) {
          return child
        }
        count++
      }
    }
    return count
  }

  override execute(process: Process): void {
    let dst = process.context.popOS()
    const src = process.context.popOS()
    if (process.heap.get_value(dst) instanceof ReferenceNode) {
      dst = (process.heap.get_value(dst) as ReferenceNode).get_child()
    }

    const node = process.heap.get_value(dst)
    if (node instanceof StructNode || node instanceof ArrayNode) {
      let elemAddr = this.peek(process, node, this.index, 0)
      if (elemAddr instanceof BaseNode) elemAddr = elemAddr.addr
      process.heap.copy(elemAddr, src)
    }
    //const array = new ArrayNode(process.heap, dst)
    /*
    if (this.index < 0 || this.index >= array.length()) {
      throw new Error(
        `Index out of range [${this.index}] with length ${array.length()}`,
      )
    }
    */

    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}

export class StoreStructFieldInstruction extends Instruction {
  index: number
  constructor(index: number) {
    super('STORE STRUCT FIELD ' + index)
    this.index = index
  }

  peek(
    process: Process,
    struct: StructNode | ArrayNode,
    target: number,
    count: number,
  ): number | BaseNode {
    for (let i = 0; i < struct.get_children().length; i++) {
      const child = process.heap.get_value(struct.get_child(i))
      if (child instanceof StructNode || child instanceof ArrayNode) {
        const res = this.peek(process, child, target, count)
        if (res instanceof BaseNode) {
          return res
        } else {
          count = res
        }
      } else {
        if (count === target) {
          return child
        }
        count++
      }
    }
    return count
  }

  override execute(process: Process): void {
    let dst = process.context.popOS()
    const src = process.context.popOS()
    if (process.heap.get_value(dst) instanceof ReferenceNode) {
      dst = (process.heap.get_value(dst) as ReferenceNode).get_child()
    }
    const struct = new StructNode(process.heap, dst)
    let fieldAddr = this.peek(process, struct, this.index, 0)
    if (fieldAddr instanceof BaseNode) fieldAddr = fieldAddr.addr
    process.heap.copy(fieldAddr, src)

    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}
