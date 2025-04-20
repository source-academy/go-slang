import { Heap } from '../../heap'

import { Type, TypeUtility } from '.'

export class ReturnType extends Type {
  constructor(public types: Type[]) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `(${TypeUtility.arrayToString(this.types)})`
  }

  override equals(t: Type): boolean {
    return (
      t instanceof ReturnType &&
      t.types.length === this.types.length &&
      this.types.every((r, index) => r.equals(t.types[index]))
    )
  }

  override defaultNodeCreator(): (_heap: Heap) => number {
    // Return values are pushed onto the OS, and should not be allocated.
    throw Error('Unreachable')
  }

  override bulkDefaultNodeCreator(): (_heap: Heap) => number {
    // Return values are pushed onto the OS, and should not be allocated.
    throw Error('Unreachable')
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw Error('Unreachable')
  }

  isVoid(): boolean {
    return this.types.length === 0
  }

  override sizeof(): number {
    return 0
  }
}
