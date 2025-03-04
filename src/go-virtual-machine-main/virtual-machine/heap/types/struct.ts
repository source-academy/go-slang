import { Heap, TAG } from '..'
import { StructType, Type } from '../../executor/typing'
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
    let size = 0
    for (let i = 0; i < Object.values(fields).length; i++) {
      size += Object.values(fields)[i].sizeof()
    }
    const addr = heap.allocate(size)
    const nodeAddr = heap.allocate(2 + defaultCreator.length)
    const struct = new StructNode(heap, nodeAddr)
    let nextAddr = addr
    for (let i = 0; i < Object.values(fields).length; i++) {
      if (Object.values(fields)[i] instanceof StructType) {
        let node = Object.values(fields)[i].defaultNodeAllocator()(heap, nextAddr).addr
        struct.set_child(i, node)
      } else {
        Object.values(fields)[i].defaultNodeAllocator()(heap, nextAddr)
        struct.set_child(i, nextAddr)
      }
      nextAddr += Object.values(fields)[i].sizeof()
    }
    heap.set_tag(nodeAddr, TAG.STRUCT)
    heap.memory.set_number(defaultCreator.length, nodeAddr + 1)
    let a = struct.get_children()
    for (let i = 0; i < a.length; i++) {
      let b = heap.get_value(a[i])
      let c = 0
    }
    return struct
  }

  static allocate(
    fields: Record<string, Type>,
    defaultCreator: Array<(heap: Heap) => number>,
    heap: Heap,
    addr: number
  ) {
    let size = 0
    for (let i = 0; i < Object.values(fields).length; i++) {
      size += Object.values(fields)[i].sizeof()
    }
    //const addr = heap.allocate(size)
    const nodeAddr = heap.allocate(2 + defaultCreator.length)
    const struct = new StructNode(heap, nodeAddr)
    let nextAddr = addr
    for (let i = 0; i < Object.values(fields).length; i++) {
      if (Object.values(fields)[i] instanceof StructType) {
        let node = Object.values(fields)[i].defaultNodeAllocator()(heap, nextAddr).addr
        struct.set_child(i, node)
      } else {
        Object.values(fields)[i].defaultNodeAllocator()(heap, nextAddr)
        struct.set_child(i, nextAddr)
      }
      nextAddr += Object.values(fields)[i].sizeof()
    }
    heap.set_tag(nodeAddr, TAG.STRUCT)
    heap.memory.set_number(defaultCreator.length, nodeAddr + 1)
    let a = struct.get_children()
    return struct
  }

  length(): number {
    return this.heap.memory.get_number(this.addr + 1)
  }

  capacity(): number {
    return this.length()
  }

  sizeof() {
    let size = 0
    for (let i = 0; i < this.get_children().length; i++) {
      size += this.heap.get_value(this.get_child(i)).sizeof()
    }
    return size
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
    return `{${elements.join(' ')}}`
  }
}