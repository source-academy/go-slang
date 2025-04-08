import { Heap } from '../../heap'
import { StructNode } from '../../heap/types/struct'

import { DeclaredType } from './declared_type'
import { Type } from '.'

export class StructType extends Type {
  constructor(public fields: Map<string, Type>) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `struct ${this.fields.toString()}`
  }

  override sizeof(): number {
    let size = 0
    for (let i = 0; i < [...this.fields.values()].length; i++) {
      size += [...this.fields.values()][i].sizeof()
    }
    return size
  }

  override equals(t: Type): boolean {
    return t instanceof StructType && t.fields === this.fields
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    const creators = [] as Array<(heap: Heap) => number>
    const keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    return (heap) => StructNode.default(this.fields, creators, heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    const creators = [] as Array<(heap: Heap) => number>
    const keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    // since it is a bulk default, it returns an array
    return (heap, length) =>
      StructNode.bulkDefault(this.fields, creators, heap, length).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    const creators = [] as Array<(heap: Heap) => number>
    const keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    return (heap, addr) =>
      StructNode.allocate(this.fields, creators, heap, addr).addr
  }

  override assignableBy(t: Type): boolean {
    // map comparison code provided by ChatGPT
    // https://chatgpt.com/share/67cdc0fc-6008-800f-a618-1a76c957217f
    if (t instanceof StructType) {
      const entries1 = Array.from(t.fields.entries())
      const entries2 = Array.from(this.fields.entries())

      return entries1.every(([key, value], index) => {
        const [key2, value2] = entries2[index]
        return key === key2 && value.equals(value2)
      })
    } else if (t instanceof DeclaredType && t.type[0] instanceof StructType) {
      const entries1 = Array.from(t.type[0].fields.entries())
      const entries2 = Array.from(this.fields.entries())

      return entries1.every(([key, value], index) => {
        const [key2, value2] = entries2[index]
        return key === key2 && value.equals(value2)
      })
    }
    return false
  }
}
