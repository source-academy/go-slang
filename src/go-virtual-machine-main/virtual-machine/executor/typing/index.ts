import { Heap } from '../../heap'

export abstract class Type {
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
  abstract defaultNodeAllocator(): (heap: Heap, addr: number) => number

  /**
   * Returns the size of the memory required by the node.
   */
  abstract sizeof(): number

  /** Returns the type of selecting an identifier on the given type. */
  select(identifier: string): Type {
    throw new Error(
      `undefined (type ${this} has no field or method ${identifier})`,
    )
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Cannot create values of type NoType')
  }

  override sizeof(): number {
    return 0
  }
}

export const TypeUtility = {
  // Similar to Array.toString(), but adds a space after each comma.
  arrayToString(types: Type[] | null) {
    return (types ?? []).map((t) => t.toString()).join(', ')
  },
}
