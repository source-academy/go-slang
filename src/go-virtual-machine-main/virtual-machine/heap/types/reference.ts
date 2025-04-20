import { Heap, TAG } from '..'

import { ArrayNode, SliceNode } from './array'
import { BaseNode } from './base'
import { StructNode } from './struct'

export class ReferenceNode extends BaseNode {
  static create(nodeAddr: number, heap: Heap): ReferenceNode {
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.REFERENCE)
    heap.memory.set_number(nodeAddr, addr + 1)
    return new ReferenceNode(heap, addr)
  }

  set_child(address: number) {
    this.heap.memory.set_word(address, this.addr + 1)
  }

  get_child(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  override toString(): string {
    const node = this.heap.get_value(this.get_child())
    if (
      node instanceof ArrayNode ||
      node instanceof StructNode ||
      node instanceof SliceNode
    ) {
      return `&${node.toString()}`
    } else {
      return `0x${this.get_child().toString(16).padStart(8, '0')}`
    }
  }

  apply_unary(operator: string): BaseNode {
    if (operator === 'indirection') {
      return this.heap.get_value(this.get_child())
    }
    if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}
