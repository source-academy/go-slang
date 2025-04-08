import { Type } from '../../executor/typing'
import { ArrayType } from '../../executor/typing/array_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { StructType } from '../../executor/typing/struct_type'
import { Heap, TAG } from '..'

import { ArrayNode } from './array'
import { BaseNode } from './base'
import { ReferenceNode } from './reference'

/**
 * Each ArrayNode occupies (2 + `length`) words.
 * Word 0: Array tag.
 * Word 1: Length of array.
 * Remaining `length` words: Each word is the address of an element.
 */
export class StructNode extends BaseNode {
  static create(length: number, heap: Heap): StructNode {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.STRUCT)
    heap.memory.set_number(length, addr + 1)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    return new StructNode(heap, addr)
  }

  /**
   * `defaultCreator` is a function that allocates a default element on the heap,
   * and returns its address.
   */
  static default(
    fields: Map<string, Type>,
    defaultCreator: Array<(heap: Heap) => number>,
    heap: Heap,
  ) {
    let size = 0
    for (let i = 0; i < [...fields.values()].length; i++) {
      size += [...fields.values()][i].sizeof()
    }
    const addr = heap.allocate(size)
    const nodeAddr = heap.allocate(2 + defaultCreator.length)
    const struct = new StructNode(heap, nodeAddr)
    let nextAddr = addr
    for (let i = 0; i < [...fields.values()].length; i++) {
      if ([...fields.values()][i] instanceof StructType) {
        const node = [...fields.values()][i].defaultNodeAllocator()(
          heap,
          nextAddr,
        )
        struct.set_child(i, node)
      } else if (
        [...fields.values()][i] instanceof DeclaredType &&
        ([...fields.values()][i] as DeclaredType).type[0] instanceof StructType
      ) {
        const node = ([...fields.values()][i] as DeclaredType).type[0].defaultNodeAllocator()(
          heap,
          nextAddr,
        )
        struct.set_child(i, node)
      } else {
        if ([...fields.values()][i] instanceof ArrayType) {
          const arrayNodeAddr = [...fields.values()][i].defaultNodeAllocator()(
            heap,
            nextAddr,
          )
          struct.set_child(i, arrayNodeAddr)
        } else {
          [...fields.values()][i].defaultNodeAllocator()(heap, nextAddr)
          struct.set_child(i, nextAddr)
        }
      }
      nextAddr += [...fields.values()][i].sizeof()
    }
    heap.set_tag(nodeAddr, TAG.STRUCT)
    heap.memory.set_number(defaultCreator.length, nodeAddr + 1)
    return struct
  }

  static bulkDefault(
    fields: Map<string, Type>,
    defaultCreator: Array<(heap: Heap) => number>,
    heap: Heap,
    length: number,
  ) {
    let size = 0
    for (let i = 0; i < [...fields.values()].length; i++) {
      size += [...fields.values()][i].sizeof()
    }
    size *= length
    const addr = heap.allocate(size) // allocate actual values in heap
    let nextAddr = addr
    const structList = [] as number[]
    for (let i = 0; i < length; i++) {
      // handle 1 struct
      const nodeAddr = heap.allocate(2 + defaultCreator.length)
      const struct = new StructNode(heap, nodeAddr)
      for (let i = 0; i < [...fields.values()].length; i++) {
        // handle fields in 1 struct
        if ([...fields.values()][i] instanceof StructType) {
          const node = [...fields.values()][i].defaultNodeAllocator()(
            heap,
            nextAddr,
          )
          struct.set_child(i, node)
        } else if (
          [...fields.values()][i] instanceof DeclaredType &&
          ([...fields.values()][i] as DeclaredType).type[0] instanceof
            StructType
        ) {
          const node = (
            [...fields.values()][i] as DeclaredType
          ).type[0].defaultNodeAllocator()(heap, nextAddr)
          struct.set_child(i, node)
        } else {
          if ([...fields.values()][i] instanceof ArrayType) {
            const arrayNodeAddr = [...fields.values()][
              i
            ].defaultNodeAllocator()(
              heap,
              nextAddr,
            )
            struct.set_child(i, arrayNodeAddr)
          } else {
            [...fields.values()][i].defaultNodeAllocator()(heap, nextAddr)
            struct.set_child(i, nextAddr)
          }
        }
        nextAddr += [...fields.values()][i].sizeof()
      }
      heap.set_tag(nodeAddr, TAG.STRUCT)
      heap.memory.set_number(defaultCreator.length, nodeAddr + 1)
      structList.push(struct.addr)
    }
    // link the inner fields to the main array, since it is a bulkDefault method
    const arrayAddr = ArrayNode.defaultBlank(length, heap).addr
    const array = new ArrayNode(heap, arrayAddr)
    const structLength = structList.length
    for (let i = 0; i < structLength; i++) {
      const child = structList.shift()
      if (child !== undefined) {
        array.set_child(i, child)
      }
    }
    return array
  }

  static allocate(
    fields: Map<string, Type>,
    defaultCreator: Array<(heap: Heap) => number>,
    heap: Heap,
    addr: number,
  ) {
    const nodeAddr = heap.allocate(2 + defaultCreator.length)
    const struct = new StructNode(heap, nodeAddr)
    let nextAddr = addr
    for (let i = 0; i < [...fields.values()].length; i++) {
      if ([...fields.values()][i] instanceof StructType) {
        const node = [...fields.values()][i].defaultNodeAllocator()(
          heap,
          nextAddr,
        )
        struct.set_child(i, node)
      } else if (
        [...fields.values()][i] instanceof DeclaredType &&
        ([...fields.values()][i] as DeclaredType).type[0] instanceof StructType
      ) {
        const node = ([...fields.values()][i] as DeclaredType).type[0].defaultNodeAllocator()(
          heap,
          nextAddr,
        )
        struct.set_child(i, node)
      } else {
        if ([...fields.values()][i] instanceof ArrayType) {
          const arrayNodeAddr = [...fields.values()][i].defaultNodeAllocator()(
            heap,
            nextAddr,
          )
          struct.set_child(i, arrayNodeAddr)
        } else {
          [...fields.values()][i].defaultNodeAllocator()(heap, nextAddr)
          struct.set_child(i, nextAddr)
        }
      }
      nextAddr += [...fields.values()][i].sizeof()
    }
    heap.set_tag(nodeAddr, TAG.STRUCT)
    heap.memory.set_number(defaultCreator.length, nodeAddr + 1)
    return struct
  }

  length(): number {
    return this.heap.memory.get_number(this.addr + 1)
  }

  capacity(): number {
    return this.length()
  }

  override sizeof() {
    let size = 0
    for (let i = 0; i < this.get_children().length; i++) {
      size += this.heap.get_value(this.get_child(i)).sizeof()
    }
    return size
  }

  offsetof(index: number) {
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += this.heap.get_value(this.get_child(i)).sizeof()
    }
    return offset
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

  apply_unary(operator: string) {
    if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}
