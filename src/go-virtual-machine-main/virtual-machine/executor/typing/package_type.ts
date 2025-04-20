import { Heap } from '../../heap'
import { PkgNode } from '../../heap/types/fmt'

import { Type } from '.'

export class PackageType extends Type {
  constructor(public name: string, public types: Record<string, Type>) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `package ${this.name}`
  }

  override equals(t: Type): boolean {
    return t instanceof PackageType && t.name === this.name
  }

  override defaultNodeCreator(): (_heap: Heap) => number {
    return (heap) => PkgNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (_heap: Heap) => number {
    return (heap) => PkgNode.default(heap).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }

  override select(identifier: string): Type {
    if (!(identifier in this.types)) {
      throw new Error(`undefined: ${this.name}.${identifier}`)
    }
    return this.types[identifier]
  }

  override sizeof(): number {
    return 0
  }
}
