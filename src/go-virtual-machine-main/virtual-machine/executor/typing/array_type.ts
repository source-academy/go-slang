import { Heap } from '../../heap'
import { ArrayNode } from '../../heap/types/array'

import { Type } from '.'

/** Type descriptor for arrays that acts as a schema to tell runtime how to size/allocate/compare arrays */
export class ArrayType extends Type {
  /**
   * @param element Type of each array item
   * @param length Number of element in the array
   */
  constructor(public element: Type, public length: number) {
    super()
  }

  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return `[${this.length}]${this.element.toString()}`
  }

  sizeof(): number {
    return this.length * this.element.sizeof()
  }

  override equals(t: Type): boolean {
    return (
      t instanceof ArrayType &&
      this.element.equals(t.element) &&
      this.length === t.length
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ArrayNode.default(this.length, this.element, heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => this.element.bulkDefaultNodeCreator()(heap, length)
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap, addr) =>
      ArrayNode.allocate(heap, addr, this.length, this.element).addr
  }
}
