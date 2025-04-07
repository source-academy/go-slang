import { Heap } from '../../heap'
import { FuncNode } from '../../heap/types/func'

import { ParameterType } from './parameter_type'
import { ReturnType } from './return_type'
import { Type, TypeUtility } from '.'

export class FunctionType extends Type {
  constructor(
    public parameters: ParameterType[],
    public results: ReturnType,
    public variadic: boolean = false,
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

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }

  override sizeof(): number {
    return 0
  }
}
