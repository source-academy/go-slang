import { Type } from '../../executor/typing'
import { ArrayType } from '../../executor/typing/array_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { StructType } from '../../executor/typing/struct_type'
import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ReferenceNode } from './reference'

/**
 * Each ArrayNode occupies (2 + `length`) words.
 * Word 0: Array tag.
 * Word 1: Length of array.
 * Remaining `length` words: Each word is the address of an element.
 */
export class ArrayNode extends BaseNode {
  static create(
    length: number,
    heap: Heap,
    sizeof: number,
    startAddr: number,
  ): ArrayNode {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.ARRAY)
    heap.memory.set_number(length, addr + 1)
    for (let i = 0; i < length; i++) {
      heap.memory.set_word(startAddr + sizeof * i, addr + 2 + i)
    }
    return new ArrayNode(heap, addr)
  }

  /**
   * `defaultCreator` is a function that allocates a default element on the heap,
   * and returns its address.
   */
  static default(length: number, type: Type, heap: Heap) {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.ARRAY)
    heap.memory.set_number(length, addr + 1)
    heap.temp_push(addr)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    for (let i = 0; i < length; i++) {
      heap.memory.set_word(type.defaultNodeCreator()(heap), addr + 2 + i)
    }
    heap.temp_pop()
    return new ArrayNode(heap, addr)
  }

  static allocate(heap: Heap, addr: number, length: number, type: Type) {
    const nodeAddr = heap.allocate(2 + length)
    heap.set_tag(nodeAddr, TAG.ARRAY)
    heap.memory.set_number(length, nodeAddr + 1)
    heap.temp_push(nodeAddr)
    for (let i = 0; i < length; i++)
      heap.memory.set_number(-1, nodeAddr + i + 2)
    for (let i = 0; i < length; i++) {
      const nodeAddr2 = type.defaultNodeAllocator()(
        heap,
        addr + i * type.sizeof(),
      )
      if (
        type instanceof ArrayType ||
        (type instanceof DeclaredType && type.type[0] instanceof StructType)
      ) {
        heap.memory.set_word(nodeAddr2, nodeAddr + 2 + i)
      } else {
        heap.memory.set_word(addr + i * type.sizeof(), nodeAddr + 2 + i)
      }
    }
    heap.temp_pop()
    return new ArrayNode(heap, nodeAddr)
  }

  static defaultBlank(length: number, heap: Heap) {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.ARRAY)
    heap.memory.set_number(length, addr + 1)
    heap.temp_push(addr)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    heap.temp_pop()
    return new ArrayNode(heap, addr)
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

  override sizeof() {
    return this.length() * this.heap.get_value(this.get_child(0)).sizeof()
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

  apply_unary(operator: string) {
    if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}

/**
 * Each SliceNode occupies 4 words.
 * Word 0: Slice tag.
 * Word 1: Underlying array address.
 * Word 2: Start (a number), the starting index in the array.
 * Word 3: End (a number), the ending index in the array.
 */
export class SliceNode extends BaseNode {
  static create(
    array: number,
    start: number,
    end: number,
    heap: Heap,
  ): SliceNode {
    const addr = heap.allocate(5)
    heap.set_tag(addr, TAG.SLICE)
    heap.memory.set_word(array, addr + 1)
    heap.memory.set_number(start, addr + 2)
    heap.memory.set_number(end, addr + 3)
    return new SliceNode(heap, addr)
  }

  static default(heap: Heap): SliceNode {
    return SliceNode.create(0, 0, 0, heap)
  }

  array(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  arrayNode(): ArrayNode {
    return new ArrayNode(this.heap, this.array())
  }

  start(): number {
    return this.heap.memory.get_number(this.addr + 2)
  }

  end(): number {
    return this.heap.memory.get_number(this.addr + 3)
  }

  length(): number {
    return this.end() - this.start()
  }

  capacity(): number {
    return this.arrayNode().length() - this.start()
  }

  get_child(index: number): number {
    return this.arrayNode().get_child(this.start() + index)
  }

  set_child(index: number, address: number) {
    this.arrayNode().set_child(this.start() + index, address)
  }

  override get_children(): number[] {
    return [this.array()]
  }

  override toString(): string {
    const length = this.length()
    const elements = []
    for (let i = 0; i < length; i++) {
      elements.push(this.heap.get_value(this.get_child(i)).toString())
    }
    return `[${elements.join(' ')}]`
  }

  apply_unary(operator: string) {
    if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}
