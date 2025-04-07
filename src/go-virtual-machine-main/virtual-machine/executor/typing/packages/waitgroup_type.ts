import { Heap } from 'src/go-virtual-machine-main/virtual-machine/heap'
import { WaitGroupNode } from 'src/go-virtual-machine-main/virtual-machine/heap/types/waitGroup'

import { FunctionType } from '../function_type'
import { Int64Type } from '../int64_type'
import { ParameterType } from '../parameter_type'
import { ReturnType } from '../return_type'
import { Type } from '..'

export class WaitGroupType extends Type {
  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    throw new Error('Method not implemented.')
  }
  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }
  override sizeof(): number {
    throw new Error('Method not implemented.')
  }
  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `sync.WaitGroup`
  }

  override equals(t: Type): boolean {
    return t instanceof WaitGroupType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => WaitGroupNode.default(heap).addr
  }

  override select(identifier: string): Type {
    if (identifier === 'Add') {
      return new FunctionType(
        [new ParameterType(null, new Int64Type())],
        new ReturnType([]),
      )
    } else if (identifier === 'Done') {
      return new FunctionType([], new ReturnType([]))
    } else if (identifier === 'Wait') {
      return new FunctionType([], new ReturnType([]))
    }
    throw new Error(
      `.${identifier} undefined (type ${this} has no field or method ${identifier})`,
    )
  }
}
