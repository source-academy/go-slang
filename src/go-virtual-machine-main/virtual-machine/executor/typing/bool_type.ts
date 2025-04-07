import { Heap } from '../../heap'
import { BoolNode } from '../../heap/types/primitives'

import { Type } from '.'

export class BoolType extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'bool'
  }

  override sizeof(): number {
    return 1
  }

  override equals(t: Type): boolean {
    return t instanceof BoolType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => BoolNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => BoolNode.bulkDefault(heap, length).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap, addr) => BoolNode.allocate(heap, addr).addr
  }
}
