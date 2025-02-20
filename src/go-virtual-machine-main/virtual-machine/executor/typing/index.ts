import { compiler } from 'peggy'
import { Heap } from '../../heap'
import { ArrayNode, SliceNode } from '../../heap/types/array'
import { ChannelNode } from '../../heap/types/channel'
import { PkgNode } from '../../heap/types/fmt'
import { FuncNode } from '../../heap/types/func'
import {
  BoolNode,
  FloatNode,
  IntegerNode,
  StringNode,
} from '../../heap/types/primitives'
import { IdentifierToken, PrimitiveTypeToken } from '../../compiler/tokens'
import { StructNode } from '../../heap/types/struct'

export abstract class Type {
  variadic: any
  parameters: any
  results: any
  abstract isPrimitive(): boolean
  abstract toString(): string
  abstract equals(t: Type): boolean

  /** Returns true if `t` can be assigned to this type. */
  assignableBy(t: Type): boolean {
    return this.equals(t)
  }

  /** Returns a function that creates a default node of this type on the heap, and returns its address. */
  abstract defaultNodeCreator(): (heap: Heap) => number

  /** Returns a function that sets a default node on already allocated memory, and returns its address.
   *  It is mainly used for arrays and structs as memory must be pre-allocated first
   *  to ensure that the memory is contiguous.
  */
  abstract bulkDefaultNodeCreator(): (heap: Heap, length: number) => number
  

  /** Returns the type of selecting an identifier on the given type. */
  select(identifier: string): Type {
    throw new Error(
      `undefined (type ${this} has no field or method ${identifier})`,
    )
  }
}

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
}

export class BoolType extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'bool'
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
}

export class Int64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'int64'
  }

  override equals(t: Type): boolean {
    return t instanceof Int64Type
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => IntegerNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => IntegerNode.bulkDefault(heap, length).addr
  }
}

export class Float64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'float64'
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
}

export class StringType extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'string'
  }

  override equals(t: Type): boolean {
    return t instanceof StringType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => StringNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => StringNode.bulkDefault(heap, length).addr
  }
}

export class ArrayType extends Type {
  constructor(public element: Type, public length: number) {
    super()
  }

  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return `[${this.length}]${this.element.toString()}`
  }

  override equals(t: Type): boolean {
    return (
      t instanceof ArrayType &&
      this.element.equals(t.element) &&
      this.length === t.length
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ArrayNode.default(this.length, this.element, heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap, length) => this.element.bulkDefaultNodeCreator()(heap, length)
  }
}

export class SliceType extends Type {
  constructor(public element: Type) {
    super()
  }

  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return `[]${this.element.toString()}`
  }

  override equals(t: Type): boolean {
    return t instanceof SliceType && this.element.equals(t.element)
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => SliceNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => SliceNode.default(heap).addr
  }
}

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
}

export class FunctionType extends Type {
  constructor(
    public override parameters: ParameterType[],
    public override results: ReturnType,
    public override variadic: boolean = false,
  ) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  toString(): string {
    const parametersString = TypeUtility.arrayToString(this.parameters)
    return `func(${parametersString}) ${this.results}`
  }

  override equals(t: Type): boolean {
    return (
      t instanceof FunctionType &&
      this.parameters.length === t.parameters.length &&
      this.parameters.every((p, index) => p.equals(t.parameters[index])) &&
      this.results.equals(t.results)
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => FuncNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => FuncNode.default(heap).addr
  }
}

export class ChannelType extends Type {
  constructor(
    public element: Type,
    public readable: boolean,
    public writable: boolean,
  ) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    if (this.readable && this.writable) {
      return `chan ${this.element}`
    } else if (this.readable) {
      return `<-chan ${this.element}`
    } else {
      return `chan<- ${this.element}`
    }
  }

  override equals(t: Type): boolean {
    return (
      t instanceof ChannelType &&
      this.readable === t.readable &&
      this.writable === t.writable &&
      this.element.equals(t.element)
    )
  }

  override assignableBy(t: Type): boolean {
    return (
      this.equals(t) ||
      (this.readable &&
        this.writable &&
        t instanceof ChannelType &&
        this.element.equals(t.element))
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ChannelNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => ChannelNode.default(heap).addr
  }
}

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

  isVoid(): boolean {
    return this.types.length === 0
  }
}

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

  override select(identifier: string): Type {
    if (!(identifier in this.types)) {
      throw new Error(`undefined: ${this.name}.${identifier}`)
    }
    return this.types[identifier]
  }
}

export const TypeUtility = {
  // Similar to Array.toString(), but adds a space after each comma.
  arrayToString(types: Type[] | null) {
    return (types ?? []).map((t) => t.toString()).join(', ')
  },
}

export class DeclaredType extends Type {
  constructor(public name: string, public type: Type) {
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

  override equals(t: Type): boolean {
    // TODO: Morph to support structs
    return t instanceof DeclaredType && t.name === this.name && this.type[0].equals(t.type[0])
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    // Do nothing.
    return (_) => 0
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    // Do nothing.
    return (_) => 0
  }
}

export class StructType extends Type {
  constructor(public fields: Record<string, Type>) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `struct ${this.fields.toString()}`
  }

  override equals(t: Type): boolean {
    // TODO: Morph to support structs
    return t instanceof StructType
      && t.fields === this.fields
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    const creators = [] as Array<(heap: Heap) => number>
    for (let key in this.fields) {
      creators.push(this.fields[key].defaultNodeCreator())
    }
    return (heap) => StructNode.default(this.fields, creators, heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    const creators = [] as Array<(heap: Heap) => number>
    for (let key in this.fields) {
      creators.push(this.fields[key].defaultNodeCreator())
    }
    return (heap) => StructNode.default(this.fields, creators, heap).addr
  }
}