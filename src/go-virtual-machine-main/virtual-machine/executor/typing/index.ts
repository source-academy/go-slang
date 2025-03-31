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
import { ReferenceNode } from '../../heap/types/reference'

export abstract class Type {
  variadic: any
  parameters: any
  results: any
  abstract isPrimitive(): boolean
  abstract toString(): string
  abstract equals(t: Type): boolean

  /** Returns true if `t` can be assigned to this type. */
  assignableBy(t: Type): boolean {
    return t instanceof ArbitraryType || this.equals(t)
  }

  /** Returns a function that creates a default node of this type on the heap, and returns its address. */
  abstract defaultNodeCreator(): (heap: Heap) => number

  /** Returns a function that sets a default node on already allocated memory, and returns its address.
   *  It is mainly used for arrays and structs as memory must be pre-allocated first
   *  to ensure that the memory is contiguous.
  */
  abstract bulkDefaultNodeCreator(): (heap: Heap, length: number) => number

   /** Returns a function that directly manipulates already allocated memory.
    *  Only used for structs and arrays since memory must be pre-allocated first,
    *  to ensure that the memory is contiguous.
  */
   abstract defaultNodeAllocator(): (heap: Heap, addr: number) => void
  
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    throw new Error('Cannot create values of type NoType')
  }
}

/** This type represents arguments that don't have a fixed type. */
export class ArbitraryType extends Type {
  isPrimitive(): boolean {
    return false
  }

  toString(): string {
    return ''
  }

  override equals(t: Type): boolean {
    return t instanceof ArbitraryType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    throw new Error('Cannot create values of type NoType')
  }
}

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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
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

  sizeof(): number {
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => BoolNode.allocate(heap, addr)
  }
}

export class Int64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'int64'
  }

  sizeof(): number {
    return 4
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => IntegerNode.allocate(heap, addr)
  }
}

export class Float64Type extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'float64'
  }

  sizeof(): number {
    return 4
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => FloatNode.allocate(heap, addr)
  }
}

export class StringType extends Type {
  isPrimitive(): boolean {
    return true
  }

  toString(): string {
    return 'string'
  }

  sizeof(): number {
    return 2
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => StringNode.allocate(heap, addr)
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

  sizeof(): number {
    return this.length * this.element.sizeof()
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

  override defaultNodeAllocator(): (heap: Heap, addr: number, length: number, type: Type) => number {
    return (heap, addr, length, type) => ArrayNode.allocate(heap, addr, length, type)
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

  sizeof(): number {
    return this.element.sizeof()
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => SliceNode.allocate(heap, addr)
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => FuncNode.allocate(heap, addr)
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => ChannelNode.allocate(heap, addr)
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    return (heap, addr) => PkgNode.allocate(heap, addr)
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

  sizeof(): number {
    return this.type[0].sizeof()
  }

  override equals(t: Type): boolean {
    // TODO: Morph to support structs
    if (this.type instanceof PointerType) {
      return 
    }
    return t instanceof DeclaredType && t.name === this.name && this.type[0].equals(t.type[0])
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    // Do nothing.
    let type = this.type[0]
    while (type instanceof DeclaredType) type = type.type[0]
    return type.defaultNodeAllocator()
  }
}

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

  sizeof(): number {
    let size = 0
    for (let i = 0; i < [...this.fields.values()].length; i++) {
      size += [...this.fields.values()][i].sizeof()
    }
    return size
  }

  override equals(t: Type): boolean {
    // TODO: Morph to support structs
    return t instanceof StructType
      && t.fields === this.fields
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    const creators = [] as Array<(heap: Heap) => number>
    let keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    return (heap) => StructNode.default(this.fields, creators, heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number[] {
    const creators = [] as Array<(heap: Heap) => number>
    let keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    return (heap, length) => StructNode.bulkDefault(this.fields, creators, heap, length)
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => void {
    const creators = [] as Array<(heap: Heap) => number>
    let keys = [...this.fields.values()]
    for (let i = 0; i < keys.length; i++) {
      creators.push(keys[i].defaultNodeCreator())
    }
    return (heap, addr) => StructNode.allocate(this.fields, creators, heap, addr)
  }

  override assignableBy(t: Type): boolean {
    // map comparison code provided by ChatGPT
    // https://chatgpt.com/share/67cdc0fc-6008-800f-a618-1a76c957217f
    if (t instanceof StructType) {
      const entries1 = Array.from(t.fields.entries());
      const entries2 = Array.from(this.fields.entries());

      return entries1.every(([key, value], index) => {
        const [key2, value2] = entries2[index];
        return key === key2 && value.equals(value2);
      });
    } else if (t instanceof DeclaredType && t.type[0] instanceof StructType) {
      const entries1 = Array.from(t.type[0].fields.entries());
      const entries2 = Array.from(this.fields.entries());

      return entries1.every(([key, value], index) => {
        const [key2, value2] = entries2[index];
        return key === key2 && value.equals(value2);
      });
    }
    return false
  }
}

export class PointerType extends Type {
  constructor(public type: Type) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `pointer to ${this.type.toString()}`
  }

  sizeof(): number {
    return 2
  }

  override equals(t: Type): boolean {
    return t instanceof PointerType
      && t.type.equals(this.type)
  }

  override assignableBy(t: Type): boolean {
    return t.equals(this) || (t instanceof PointerType && t.type instanceof ArbitraryType)
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ReferenceNode.create(undefined, heap).addr
  }
}