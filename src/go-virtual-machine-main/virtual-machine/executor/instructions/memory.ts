import { Process } from '../../runtime/process'
import { ArrayNode, SliceNode } from '../../heap/types/array'
import { IntegerNode } from '../../heap/types/primitives'

import { Instruction } from './base'

/** Allocates a memory block with the required size, and returns the starting address. */
export class MemoryAllocationInstruction extends Instruction {
  size: number
  constructor(size: number) {
    super('MALLOC')
    this.size = size
  }

  override execute(process: Process): number {
    return process.context.heap.allocate(this.size)
  }
}