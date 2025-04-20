import { Heap } from '../../heap'
import { StringNode } from '../../heap/types/primitives'

import { Type } from '.'

export class StringType extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'string'
  }

  sizeof(): number {
    return 2
  }

  override equals(t: Type): boolean {
    return t instanceof StringType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => StringNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => StringNode.bulkDefault(heap, length).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap, addr) => StringNode.allocate(heap, addr).addr
  }
}
