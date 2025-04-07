import { Heap } from '../../heap'

import { Type } from '.'

/** This type represents things that don't have an associated type, like statements. */
export class NoType extends Type {
  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return ''
  }

  override equals(t: Type): boolean {
    return t instanceof NoType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override sizeof(): number {
    return 0
  }
}
