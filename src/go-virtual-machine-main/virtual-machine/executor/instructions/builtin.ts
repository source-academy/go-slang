import { ArrayNode, SliceNode } from '../../heap/types/array'
import { ChannelArrayNode } from '../../heap/types/channel'
import { IntegerNode } from '../../heap/types/primitives'
import { Process } from '../../runtime/process'

import { Instruction } from './base'

/** Takes an object address from the OS, and returns the length of that object. */
export class BuiltinLenInstruction extends Instruction {
  constructor() {
    super('BUILTIN_LEN')
  }

  override execute(process: Process): void {
    const node = process.heap.get_value(process.context.popOS())
    if (
      node instanceof ArrayNode ||
      node instanceof SliceNode ||
      node instanceof ChannelArrayNode
    ) {
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
    if (
      node instanceof ArrayNode ||
      node instanceof SliceNode ||
      node instanceof ChannelArrayNode
    ) {
      const capacity = node.capacity()
      process.context.pushOS(IntegerNode.create(capacity, process.heap).addr)
    } else {
      throw new Error('Unreachable')
    }
  }
}
