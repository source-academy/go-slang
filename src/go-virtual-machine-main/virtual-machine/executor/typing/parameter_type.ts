import { Heap } from '../../heap'

import { Type } from '.'

export class ParameterType extends Type {
  constructor(public identifier: string | null, public type: Type) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return this.identifier === null
      ? `${this.type}`
      : `${this.identifier} ${this.type}`
  }

  override equals(t: Type): boolean {
    return t instanceof ParameterType && this.type.equals(t.type)
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    // Do nothing.
    return (_) => 0
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    // Do nothing.
    return (_) => 0
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    // Do nothing.
    return (_) => 0
  }

  override sizeof(): number {
    return 0
  }
}
