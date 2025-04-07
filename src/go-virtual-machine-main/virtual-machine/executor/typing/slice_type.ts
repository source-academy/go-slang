import { Heap } from '../../heap'
import { SliceNode } from '../../heap/types/array'

import { Type } from '.'

export class SliceType extends Type {
  constructor(public element: Type) {
    super()
  }

  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return `[]${this.element.toString()}`
  }

  sizeof(): number {
    return this.element.sizeof()
  }

  override equals(t: Type): boolean {
    return t instanceof SliceType && this.element.equals(t.element)
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => SliceNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => SliceNode.default(heap).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }
}
