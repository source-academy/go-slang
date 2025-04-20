import { Heap } from '../../heap'

import { Type } from '.'

/** This type represents the byte itself. */
export class ByteType extends Type {
  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return ''
  }

  override equals(t: Type): boolean {
    return t instanceof ByteType
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
