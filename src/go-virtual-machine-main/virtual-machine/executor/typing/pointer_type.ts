import { Heap } from '../../heap'
import { ReferenceNode } from '../../heap/types/reference'

import { ArbitraryType, Type } from '.'

export class PointerType extends Type {
  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    throw new Error('Method not implemented.')
  }
  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }
  constructor(public type: Type) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `pointer to ${this.type.toString()}`
  }

  override sizeof(): number {
    return 2
  }

  override equals(t: Type): boolean {
    return t instanceof PointerType && t.type.equals(this.type)
  }

  override assignableBy(t: Type): boolean {
    return (
      t.equals(this) ||
      (t instanceof PointerType && t.type instanceof ArbitraryType)
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ReferenceNode.create(NaN, heap).addr
  }
}
