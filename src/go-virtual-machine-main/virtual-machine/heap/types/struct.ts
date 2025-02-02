import { Heap, TAG } from '..'
import { Type } from '../../executor/typing'
import { ArrayNode } from './array'

import { BaseNode } from './base'

/**
 * Each ArrayNode occupies (2 + `length`) words.
 * Word 0: Array tag.
 * Word 1: Length of array.
 * Remaining `length` words: Each word is the address of an element.
 */
export class StructNode extends BaseNode {
  /*
  static create(length: number, heap: Heap): StructNode {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.STRUCT)
    heap.memory.set_number(length, addr + 1)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    return new StructNode(heap, addr)
  }
  */

  /**
   * `defaultCreator` is a function that allocates a default element on the heap,
   * and returns its address.
   */
  static default(
    fields: Record<string, Type>,
    defaultCreator: Array<(heap: Heap) => number>,
    heap: Heap,
  ) {
    const addr = heap.allocate(2 + defaultCreator.length)
    heap.set_tag(addr, TAG.STRUCT)
    heap.memory.set_number(defaultCreator.length, addr + 1)
    heap.temp_push(addr)
    for (let i = 0; i < defaultCreator.length; i++) heap.memory.set_number(-1, addr + i + 2)
    let j = 0
    for (let key in defaultCreator) {
      heap.memory.set_word(defaultCreator[key](heap), addr + 2 + j)
      j++
    }
    heap.temp_pop()
    return new StructNode(heap, addr)
  }

  length(): number {
    return this.heap.memory.get_number(this.addr + 1)
  }

  capacity(): number {
    return this.length()
  }

  set_child(index: number, address: number) {
    this.heap.memory.set_word(address, this.addr + 2 + index)
  }

  get_child(index: number): number {
    return this.heap.memory.get_word(this.addr + 2 + index)
  }

  override get_children(): number[] {
    return [...Array(this.length()).keys()].map((x) => this.get_child(x))
  } 

  override toString(): string {
    const length = this.length()
    const elements = []
    for (let i = 0; i < length; i++) {
      elements.push(this.heap.get_value(this.get_child(i)).toString())
    }
    return `[${elements.join(' ')}]`
  }
}