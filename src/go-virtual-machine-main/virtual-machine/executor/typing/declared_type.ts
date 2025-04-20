import { Heap } from '../../heap'

import { Type } from '.'

export class DeclaredType extends Type {
  constructor(public name: string, public type: Type[]) {
    super()
    this.name = name
    this.type = type
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `type ${this.name}`
  }

  override sizeof(): number {
    return this.type[0].sizeof()
  }

  override equals(t: Type): boolean {
    return (
      t instanceof DeclaredType &&
      t.name === this.name &&
      this.type[0].equals(t.type[0])
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    // Do nothing.
    let type = this.type[0]
    while (type instanceof DeclaredType) type = type.type[0]
    return type.defaultNodeCreator()
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    // Do nothing.
    let type = this.type[0]
    while (type instanceof DeclaredType) type = type.type[0]
    return type.bulkDefaultNodeCreator()
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    // Do nothing.
    let type = this.type[0]
    while (type instanceof DeclaredType) type = type.type[0]
    return type.defaultNodeAllocator()
  }
}
