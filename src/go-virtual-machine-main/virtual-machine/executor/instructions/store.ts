import { ArrayNode } from '../../heap/types/array'
import { BaseNode } from '../../heap/types/base'
import { BoolNode, StringNode } from '../../heap/types/primitives'
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

  peek(process: Process, struct: StructNode | ArrayNode, target: number, count: number): number | BaseNode {
    for (let i = 0; i < struct.get_children().length; i++) {
      let child = process.heap.get_value(struct.get_child(i))
      if (child instanceof StructNode || child instanceof ArrayNode) {
        let res = this.peek(process, child, target, count)
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
    const dst = process.context.popOS()
    const src = process.context.popOS()
    const node = process.heap.get_value(dst)

    let elemAddr = node.get_child(0)
    if (node instanceof StructNode || node instanceof ArrayNode) {
      elemAddr = this.peek(process, node, this.index, 0).addr
    }
    //const array = new ArrayNode(process.heap, dst)
    /*
    if (this.index < 0 || this.index >= array.length()) {
      throw new Error(
        `Index out of range [${this.index}] with length ${array.length()}`,
      )
    }
    */
    process.heap.copy(elemAddr, src)
    
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

  peek(process: Process, struct: StructNode | ArrayNode, target: number, count: number): number | BaseNode {
    for (let i = 0; i < struct.get_children().length; i++) {
      let child = process.heap.get_value(struct.get_child(i))
      if (child instanceof StructNode || child instanceof ArrayNode) {
        let res = this.peek(process, child, target, count)
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
    const dst = process.context.popOS()
    const src = process.context.popOS()
    const struct = new StructNode(process.heap, dst)
    /*
    if (this.index < 0 || this.index >= array.length()) {
      throw new Error(
        `Index out of range [${this.index}] with length ${array.length()}`,
      )
    }
    */
    let fieldAddr = this.peek(process, struct, this.index, 0).addr
    process.heap.copy(fieldAddr, src)
    /*
    let element = struct.get_child(0)
    let a = process.heap.get_value(element)
    while (process.heap.get_value(element) instanceof StructNode) {
      element = (process.heap.get_value(element) as StructNode).get_child(0)
    }
    let sizeof = 4
    if (process.heap.get_value(element) instanceof BoolNode) sizeof = 1
    if (process.heap.get_value(element) instanceof StringNode) sizeof = 2
    process.heap.copy(element + sizeof * this.index, src)
    */
    
    if (process.debug_mode) {
      process.debugger.modified_buffer.add(dst)
    }
  }
}
