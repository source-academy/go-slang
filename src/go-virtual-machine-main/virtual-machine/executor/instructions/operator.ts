import { ArrayNode, SliceNode } from '../../heap/types/array'
import {
  IntegerNode,
  PrimitiveNode,
  StringNode,
} from '../../heap/types/primitives'
import { Process } from '../../runtime/process'

import { Instruction } from './base'

export abstract class OpInstruction extends Instruction {
  op: string

  constructor(tag: string, op: string) {
    super(tag)
    this.op = op
  }
}

export class UnaryInstruction extends OpInstruction {
  constructor(op: string) {
    super('UNARY', op)
  }

  override toString(): string {
    return 'UNARY ' + this.op
  }

  override execute(process: Process): void {
    const arg1 = process.heap.get_value(
      process.context.popOS(),
    ) as PrimitiveNode
    process.context.pushOS(arg1.apply_unary(this.op).addr)
  }
}

export class BinaryInstruction extends OpInstruction {
  constructor(op: string) {
    super('BINOP', op)
  }

  override toString(): string {
    return 'BINOP ' + this.op
  }

  override execute(process: Process): void {
    const arg2 = process.heap.get_value(
      process.context.popOS(),
    ) as PrimitiveNode
    const arg1 = process.heap.get_value(
      process.context.popOS(),
    ) as PrimitiveNode
    process.context.pushOS(arg1.apply_binop(arg2, this.op).addr)
  }
}

/**
 * Takes its arguments from the OS, and pushes a new slice onto the OS.
 * - Node address: Address of the node to slice.
 * - Low: A number for the starting index (non-integer if the start).
 * - High: A number for the ending index (non-integer if the end).
 */
export class SliceOperationInstruction extends Instruction {
  constructor() {
    super('SLICEOP')
  }

  override execute(process: Process): void {
    const highNode = process.heap.get_value(process.context.popOS())
    const lowNode = process.heap.get_value(process.context.popOS())
    const node = process.heap.get_value(process.context.popOS())
    const low = lowNode instanceof IntegerNode ? lowNode.get_value() : 0
    // If high is not provided, its default value will be resolved later on in the code.
    const high = highNode instanceof IntegerNode ? highNode.get_value() : null

    if (node instanceof ArrayNode) {
      process.context.pushOS(this.sliceArray(process, node, low, high))
    } else if (node instanceof SliceNode) {
      process.context.pushOS(this.sliceSlice(process, node, low, high))
    } else {
      throw new Error('Unreachable')
    }
  }

  private sliceArray(
    process: Process,
    array: ArrayNode,
    low: number,
    high: number | null,
  ): number {
    low ??= 0
    high ??= array.length()
    this.checkSliceRange(low, high, array.length())
    const newSlice = SliceNode.create(array.addr, low, high, process.heap)
    return newSlice.addr
  }

  private sliceSlice(
    process: Process,
    slice: SliceNode,
    low: number,
    high: number | null,
  ): number {
    low ??= 0
    high ??= slice.capacity()
    this.checkSliceRange(low, high, slice.capacity())
    const start = low + slice.start()
    const end = high + slice.start()
    const newSlice = SliceNode.create(slice.array(), start, end, process.heap)
    return newSlice.addr
  }

  /** Checks that the slice [low:high] is valid on an underlying container with given length. */
  private checkSliceRange(low: number, high: number, length: number) {
    if (low < 0 || low > length || high < 0 || high > length || high < low) {
      throw new Error('Slice bounds out of range')
    }
  }
}

/**
 * Takes its operand and identifier string from the OS,
 * and selects the given identifier from the operand.
 */
export class SelectorOperationInstruction extends Instruction {
  constructor() {
    super('SELECTOP')
  }

  override execute(process: Process): void {
    const identifier = process.context.popOSNode(StringNode).get_value()
    const node = process.heap.get_value(process.context.popOS())
    node.select(process, identifier)
  }
}
