import { Heap } from '../../heap'
import { WaitGroupNode } from '../../heap/types/waitGroup'
import {
  LoadConstantInstruction,
  LoadPackageInstruction,
  LoadVariableInstruction,
  StoreInstruction,
} from '../instructions'
import { Compiler } from '..'

import {
  FunctionType,
  Int64Type,
  PackageType,
  ParameterType,
  ReturnType,
  StringType,
  Type,
} from '.'

export class WaitGroupType extends Type {
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

/**
 * Builtin packages are functions that take in a single `compiler` argument,
 * and does all the package setup within itself.
 */
export const builtinPackages = {
  fmt: (compiler: Compiler): Type => {
    const pkg = new PackageType('fmt', {
      Println: new FunctionType([], new ReturnType([]), true),
    })
    compiler.type_environment.addType('fmt', pkg)
    const [frame_idx, var_idx] = compiler.context.env.declare_var('fmt')
    compiler.instructions.push(
      new LoadConstantInstruction('fmt', new StringType()),
      new LoadPackageInstruction(),
      new LoadVariableInstruction(frame_idx, var_idx, 'fmt'),
      new StoreInstruction(),
    )
    compiler.symbols.push(...Array(4).fill(null))
    return pkg
  },
  sync: (compiler: Compiler): Type => {
    const pkg = new PackageType('sync', {
      WaitGroup: new WaitGroupType(),
    })
    compiler.type_environment.addType('sync', pkg)
    return pkg
  },
}
