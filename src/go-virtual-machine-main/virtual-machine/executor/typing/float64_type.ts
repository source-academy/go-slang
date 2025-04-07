import { Heap } from '../../heap'
import { FloatNode } from '../../heap/types/primitives'

import { Type } from '.'

export class Float64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'float64'
  }

  sizeof(): number {
    return 4
  }

  override equals(t: Type): boolean {
    return t instanceof Float64Type
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => FloatNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => FloatNode.bulkDefault(heap, length).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap, addr) => FloatNode.allocate(heap, addr).addr
  }
}
