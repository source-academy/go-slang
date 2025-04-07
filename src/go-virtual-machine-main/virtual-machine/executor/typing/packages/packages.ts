import { Compiler } from '../..'
import {
  LoadConstantInstruction,
  LoadPackageInstruction,
  LoadVariableInstruction,
  StoreInstruction,
} from '../../instructions'
import { ByteType } from '../byte_type'
import { FunctionType } from '../function_type'
import { Int64Type } from '../int64_type'
import { PackageType } from '../package_type'
import { ParameterType } from '../parameter_type'
import { PointerType } from '../pointer_type'
import { ReturnType } from '../return_type'
import { StringType } from '../string_type'
import { ArbitraryType, Type } from '..'

import { MutexType } from './mutex_type'
import { WaitGroupType } from './waitgroup_type'

/**
 * Builtin packages are functions that take in a single `compiler` argument,
 * and does all the package setup within itself.
 */
export const builtinPackages = {
  fmt: (compiler: Compiler): Type => {
    const pkg = new PackageType('fmt', {
      Println: new FunctionType([], new ReturnType([]), true),
      Print: new FunctionType([], new ReturnType([]), true),
      Printf: new FunctionType([], new ReturnType([]), true),
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
      Mutex: new MutexType(),
    })
    compiler.type_environment.addType('sync', pkg)
    return pkg
  },
  unsafe: (compiler: Compiler): Type => {
    const pkg = new PackageType('unsafe', {
      // variadic should be false but we accept any type
      // we will handle it separately like in fmt package functions
      // throw an error if incorrect number of arguments
      Alignof: new FunctionType(
        [new ParameterType('x', new ArbitraryType())],
        new ReturnType([new Int64Type()]),
        false,
      ),
      Offsetof: new FunctionType(
        [new ParameterType('x', new ArbitraryType())],
        new ReturnType([new Int64Type()]),
        false,
      ),
      Sizeof: new FunctionType(
        [new ParameterType('x', new ArbitraryType())],
        new ReturnType([new Int64Type()]),
        false,
      ),
      String: new FunctionType(
        [
          new ParameterType('ptr', new PointerType(new ByteType())),
          new ParameterType('len', new Int64Type()),
        ],
        new ReturnType([new StringType()]),
        false,
      ),
      StringData: new FunctionType(
        [new ParameterType('str', new StringType())],
        new ReturnType([new PointerType(new ByteType())]),
        false,
      ),
      Add: new FunctionType(
        [
          new ParameterType('ptr', new PointerType(new ArbitraryType())),
          new ParameterType('len', new Int64Type()),
        ],
        new ReturnType([new PointerType(new ArbitraryType())]),
        false,
      ),
      Pointer: new FunctionType(
        [new ParameterType('ptr', new PointerType(new ArbitraryType()))],
        new ReturnType([new Int64Type()]),
        false,
      ),
    })
    compiler.type_environment.addType('unsafe', pkg)
    const [frame_idx, var_idx] = compiler.context.env.declare_var('unsafe')
    compiler.instructions.push(
      new LoadConstantInstruction('unsafe', new StringType()),
      new LoadPackageInstruction(),
      new LoadVariableInstruction(frame_idx, var_idx, 'unsafe'),
      new StoreInstruction(),
    )
    compiler.symbols.push(...Array(4).fill(null))
    return pkg
  },
}
