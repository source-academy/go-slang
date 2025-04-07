import { Heap } from 'src/go-virtual-machine-main/virtual-machine/heap'
import { MutexNode } from 'src/go-virtual-machine-main/virtual-machine/heap/types/mutex'

import { FunctionType } from '../function_type'
import { ReturnType } from '../return_type'
import { Type } from '..'

export class MutexType extends Type {
  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => MutexNode.default(heap).addr
  }
  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    return (heap) => MutexNode.default(heap).addr
  }
  override sizeof(): number {
    return 3
  }
  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    return `sync.Mutex`
  }

  override equals(t: Type): boolean {
    return t instanceof MutexType
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => MutexNode.default(heap).addr
  }

  override select(identifier: string): Type {
    if (identifier === 'Lock') {
      return new FunctionType([], new ReturnType([]))
    } else if (identifier === 'Unlock') {
      return new FunctionType([], new ReturnType([]))
    }
    throw new Error(
      `.${identifier} undefined (type ${this} has no field or method ${identifier})`,
    )
  }
}
