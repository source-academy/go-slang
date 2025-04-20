import { Heap } from '../../heap'
import { IntegerNode } from '../../heap/types/primitives'

import { Type } from '.'

export class Int64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'int64'
  }

  sizeof(): number {
    return 4
  }

  override equals(t: Type): boolean {
    return t instanceof Int64Type
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => IntegerNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => IntegerNode.bulkDefault(heap, length).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap, addr) => IntegerNode.allocate(heap, addr).addr
  }
}
