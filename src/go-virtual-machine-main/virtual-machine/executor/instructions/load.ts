import { ArrayNode, SliceNode } from '../../heap/types/array'
import { FmtPkgNode } from '../../heap/types/fmt'
import { MethodNode } from '../../heap/types/func'
import {
  BoolNode,
  FloatNode,
  IntegerNode,
  StringNode,
} from '../../heap/types/primitives'
import { ReferenceNode } from '../../heap/types/reference'
import { StructNode } from '../../heap/types/struct'
import { UnsafePkgNode } from '../../heap/types/unsafe'
import { Process } from '../../runtime/process'
import { Type } from '../typing'
import { BoolType } from '../typing/bool_type'
import { Float64Type } from '../typing/float64_type'
import { Int64Type } from '../typing/int64_type'
import { StringType } from '../typing/string_type'

import { Instruction } from './base'

export class LoadConstantInstruction extends Instruction {
  val: number | string | boolean
  data_type: Type
  constructor(val: number | string | boolean, data_type: Type) {
    super('LDC')
    this.val = val
    this.data_type = data_type
  }

  override toString(): string {
    return 'LOAD ' + this.val.toString()
  }

  static is(instr: Instruction): instr is LoadConstantInstruction {
    return instr.tag === 'LDC'
  }

  override execute(process: Process): void {
    if (this.data_type instanceof BoolType) {
      process.context.pushOS(
        BoolNode.create(this.val as boolean, process.heap).addr,
      )
    } else if (this.data_type instanceof Float64Type) {
      process.context.pushOS(
        FloatNode.create(this.val as number, process.heap).addr,
      )
    } else if (this.data_type instanceof Int64Type) {
      const temp = IntegerNode.create(this.val as number, process.heap).addr
      process.context.pushOS(temp)
    } else if (this.data_type instanceof StringType) {
      process.context.pushOS(
        StringNode.create(this.val as string, process.heap).addr,
      )
    }
  }
}

/** Loads a default value of the given type onto the OS. */
export class LoadDefaultInstruction extends Instruction {
  constructor(public dataType: Type) {
    super('LDD')
  }

  override toString(): string {
    return 'LOAD DEFAULT ' + this.dataType.toString()
  }

  override execute(process: Process): void {
    const defaultNodeAddress = this.dataType.defaultNodeCreator()(process.heap)
    process.context.pushOS(defaultNodeAddress)
  }
}

/**
 * Creates an array on the heap, with element addresses taken from the OS (starting from the back).
 * Pushes the address of the array back onto the OS.
 */
export class LoadArrayInstruction extends Instruction {
  constructor(public length: number, public type: Type) {
    super('LDA')
  }

  override toString(): string {
    return 'LOAD ARRAY ' + this.length.toString()
  }

  override execute(process: Process): void {
    // this is for dynamic arrays (slices) only, actual arrays are allocated
    // when entering function and uses a different instruction
    const arrayNode = ArrayNode.create(this.length, process.heap, NaN, NaN)
    for (let i = this.length - 1; i >= 0; i--) {
      arrayNode.set_child(i, process.context.popOS())
    }
    process.context.pushOS(arrayNode.addr)
  }
}

/** Takes the index, then array from the heap, and loads the element at the index onto the OS.  */
export class LoadArrayElementInstruction extends Instruction {
  constructor() {
    super('LDAE')
  }

  override toString(): string {
    return 'LOAD ARRAY ENTRY'
  }

  override execute(process: Process): void {
    const indexNode = new IntegerNode(process.heap, process.context.popOS())
    const index = indexNode.get_value()
    let a = process.context.popOS()
    if (process.heap.get_value(a) instanceof ReferenceNode) {
      a = (process.heap.get_value(a) as ReferenceNode).get_child()
    }
    const array = new ArrayNode(process.heap, a)
    if (index < 0 || index >= array.length()) {
      throw new Error(
        `Index out of range [${index}] with length ${array.length()}`,
      )
    }
    const element = array.get_child(index)
    process.context.pushOS(element)
  }
}
/** Takes the index, then array from the heap, and loads the element at the index onto the OS.  */
export class LoadSliceElementInstruction extends Instruction {
  constructor() {
    super('LDAE')
  }

  override execute(process: Process): void {
    const index = process.context.popOSNode(IntegerNode).get_value()
    const slice = process.context.popOSNode(SliceNode)
    const array = slice.arrayNode()
    if (index < 0 || index >= array.length()) {
      throw new Error(
        `Index out of range [${index}] with length ${array.length()}`,
      )
    }
    const element = array.get_child(index)
    process.context.pushOS(element)
  }
}

/**
 * Creates a slice on the heap, with the following arguments taken from the OS (bottom to top).
 * - Array address
 * - Start index of the slice.
 * - End index of the slice.
 * Pushes the address of the slice back onto the OS.
 */
export class LoadSliceInstruction extends Instruction {
  constructor() {
    super('LDS')
  }

  override execute(process: Process): void {
    const end = process.context.popOSNode(IntegerNode).get_value()
    const start = process.context.popOSNode(IntegerNode).get_value()
    const array = process.context.popOS()
    const sliceNode = SliceNode.create(array, start, end, process.heap)
    process.context.pushOS(sliceNode.addr)
  }
}

export class LoadVariableInstruction extends Instruction {
  constructor(
    public frame_idx: number,
    public var_idx: number,
    public id: string,
  ) {
    super('LD')
  }

  override toString() {
    return 'LOAD VAR ' + this.id
  }

  override execute(process: Process): void {
    process.context.pushOS(
      process.context.E().get_var(this.frame_idx, this.var_idx),
    )
  }
}

/**
 * Takes a package name (string literal) from the OS and loads the corresponding package node back onto the OS.
 * Currently this is only implemented for `fmt`, as it is the only package requiring runtime values.
 */
export class LoadPackageInstruction extends Instruction {
  constructor() {
    super('LDP')
  }

  override execute(process: Process): void {
    const packageName = process.context.popOSNode(StringNode).get_value()
    if (packageName !== 'fmt' && packageName !== 'unsafe')
      throw new Error('Unreachable')
    if (packageName === 'fmt') {
      const packageNode = FmtPkgNode.default(process.heap)
      process.context.pushOS(packageNode.addr)
    } else if (packageName === 'unsafe') {
      const packageNode = UnsafePkgNode.default(process.heap)
      process.context.pushOS(packageNode.addr)
    }
  }
}

/** Takes the index, then struct from the heap, and loads the field at the index onto the OS.  */
export class LoadStructFieldInstruction extends Instruction {
  index: number
  constructor(index: number) {
    super('LDSF')
    this.index = index
  }

  override toString(): string {
    return 'LOAD STRUCT FIELD'
  }

  override execute(process: Process): void {
    //const indexNode = new IntegerNode(process.heap, process.context.popOS())
    let a = process.context.popOS()
    if (process.heap.get_value(a) instanceof ReferenceNode) {
      a = (process.heap.get_value(a) as ReferenceNode).get_child()
    }
    const struct = new StructNode(process.heap, a)
    const field = struct.get_child(this.index)
    if (
      process.heap.get_value(process.context.peekOS()) instanceof MethodNode &&
      (
        process.heap.get_value(process.context.peekOS()) as MethodNode
      ).identifier() === 'Offsetof' &&
      !(process.heap.get_value(field) instanceof StructNode)
    ) {
      const offset = struct.offsetof(this.index)
      process.context.pushOS(IntegerNode.create(offset, process.heap).addr)
    } else {
      process.context.pushOS(field)
    }
  }
}
