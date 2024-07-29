import { Process } from '../../executor/process'
import { ArrayNode, SliceNode } from '../../heap/types/array'
import { IntegerNode } from '../../heap/types/primitives'

import { Instruction } from './base'

/** Takes an object address from the OS, and returns the length of that object. */
export class BuiltinLenInstruction extends Instruction {
  constructor() {
    super('BUILTIN_LEN')
  }

  override execute(process: Process): void {
    const node = process.heap.get_value(process.context.popOS())
    if (node instanceof ArrayNode || node instanceof SliceNode) {
      const length = node.length()
      process.context.pushOS(IntegerNode.create(length, process.heap).addr)
    } else {
      throw new Error('Unreachable')
    }
  }
}

/** Takes an object address from the OS, and returns the capacity of that object. */
export class BuiltinCapInstruction extends Instruction {
  constructor() {
    super('BUILTIN_CAP')
  }

  override execute(process: Process): void {
    const node = process.heap.get_value(process.context.popOS())
    if (node instanceof ArrayNode || node instanceof SliceNode) {
      const capacity = node.capacity()
      process.context.pushOS(IntegerNode.create(capacity, process.heap).addr)
    } else {
      throw new Error('Unreachable')
    }
  }
}
