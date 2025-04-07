import { Compiler } from '../../executor'
import {
  BuiltinCapInstruction,
  BuiltinLenInstruction,
  Instruction,
  LoadArrayElementInstruction,
  LoadChannelInstruction,
  LoadConstantInstruction,
  LoadSliceElementInstruction,
  LoadStructFieldInstruction,
  SelectorOperationInstruction,
  SliceOperationInstruction,
} from '../../executor/instructions'
import { CallInstruction } from '../../executor/instructions/funcs'
import { Type, TypeUtility } from '../../executor/typing'
import { ArrayType } from '../../executor/typing/array_type'
import { BoolType } from '../../executor/typing/bool_type'
import { ChannelType } from '../../executor/typing/channel_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { FunctionType } from '../../executor/typing/function_type'
import { Int64Type } from '../../executor/typing/int64_type'
import { NoType } from '../../executor/typing/no_type'
import { ParameterType } from '../../executor/typing/parameter_type'
import { PointerType } from '../../executor/typing/pointer_type'
import { ReturnType } from '../../executor/typing/return_type'
import { SliceType } from '../../executor/typing/slice_type'
import { StringType } from '../../executor/typing/string_type'
import { StructType } from '../../executor/typing/struct_type'

import { Token, TokenLocation } from './base'
import { IdentifierToken } from './identifier'
import { LiteralToken } from './literals'
import { BinaryOperator, UnaryOperator } from './operator'
import { TypeToken } from './type'

export type ExpressionToken =
  | LiteralToken
  | UnaryOperator
  | BinaryOperator
  | PrimaryExpressionToken
  | BuiltinCallToken
  | EmptyExpressionToken

export type OperandToken = IdentifierToken | ExpressionToken

export class EmptyExpressionToken extends Token {
  constructor(sourceLocation: TokenLocation, public argType: Type) {
    super('empty_expression', sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    // Does nothing - Intended
    return this.argType
  }
}
export class PrimaryExpressionToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public operand: OperandToken,
    /** The remaining modifier that is applied to the current operand. E.g. selector / index etc. */
    public rest: PrimaryExpressionModifierToken[] | null,
  ) {
    super('primary_expression', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    // TODO: Figure what this does for non-trivial ops like array access and selector
    let operandType = this.operand.compile(compiler)
    // special handling for unsafe.Offsetof since it needs to be a struct field
    let offsetof = false
    for (const modifier of this.rest ?? []) {
      if (
        this.operand instanceof IdentifierToken &&
        this.operand.identifier === 'unsafe' &&
        modifier instanceof SelectorToken &&
        modifier.identifier === 'Offsetof'
      ) {
        offsetof = true
      } else if (
        offsetof &&
        modifier instanceof CallToken &&
        modifier.expressions[0] instanceof PrimaryExpressionToken &&
        modifier.expressions[0].rest !== null &&
        modifier.expressions[0].rest.length > 0 &&
        modifier.expressions[0].rest[0] instanceof SelectorToken
      ) {
        offsetof = false
      }
      operandType = modifier.compile(compiler, operandType)
    }
    if (offsetof) throw new Error('Offsetof needs a struct field value.')
    return operandType
  }
}

// Note: The reason this class DOES NOT extend from Token, is because each modifier
// requires type information about the previous operand in the chain in order to compile.
// Hence, its compilation method must take in an extra argument. Idk if this is the correct way
// to fix, but it doesn't make sense to force them to follow the structure of Token.
export abstract class PrimaryExpressionModifierToken {
  constructor(public type: string, public sourceLocation: TokenLocation) {}
  abstract compile(compiler: Compiler, operandType: Type): Type

  pushInstruction(compiler: Compiler, ...instr: Instruction[]) {
    compiler.instructions.push(...instr)
    compiler.symbols.push(...Array(instr.length).fill(this.sourceLocation))
  }
}

export class SelectorToken extends PrimaryExpressionModifierToken {
  constructor(sourceLocation: TokenLocation, public identifier: string) {
    super('selector', sourceLocation)
  }

  override compile(compiler: Compiler, operandType: Type): Type {
    // handle structs first since parser sees them as the same as packages
    if (
      operandType instanceof DeclaredType &&
      operandType.type[0] instanceof StructType
    ) {
      // declared type structs
      if (operandType.type[0].fields.size >= 0) {
        const resultType = operandType.type[0].fields.get(this.identifier)
        if (resultType === undefined) return new NoType()
        const index = [...operandType.type[0].fields.keys()].indexOf(
          this.identifier,
        )
        compiler.instructions.push(new LoadStructFieldInstruction(index))
        return resultType
      }
    } else if (operandType instanceof StructType) {
      // anonymous structs
      if (operandType.fields.size >= 0) {
        const resultType = operandType.fields.get(this.identifier)
        if (resultType === undefined) return new NoType()
        const index = [...operandType.fields.keys()].indexOf(this.identifier)
        compiler.instructions.push(new LoadStructFieldInstruction(index))
        return resultType
      }
    } else if (operandType instanceof PointerType) {
      // pointers
      const baseType = operandType.type
      if (
        baseType instanceof DeclaredType &&
        baseType.type[0] instanceof StructType
      ) {
        // pointers to declared type structs
        if (baseType.type[0].fields.size >= 0) {
          const resultType = baseType.type[0].fields.get(this.identifier)
          if (resultType === undefined) return new NoType()
          const index = [...baseType.type[0].fields.keys()].indexOf(
            this.identifier,
          )
          compiler.instructions.push(new LoadStructFieldInstruction(index))
          return resultType
        }
      } else if (baseType instanceof StructType) {
        // pointers to anonymous structs
        if (baseType.fields.size >= 0) {
          const resultType = baseType.fields.get(this.identifier)
          if (resultType === undefined) return new NoType()
          const index = [...baseType.fields.keys()].indexOf(this.identifier)
          compiler.instructions.push(new LoadStructFieldInstruction(index))
          return resultType
        }
      }
    }
    // standard package operations
    const resultType = operandType.select(this.identifier)
    this.pushInstruction(
      compiler,
      new LoadConstantInstruction(this.identifier, new StringType()),
      new SelectorOperationInstruction(),
    )
    return resultType
  }
}

export class IndexToken extends PrimaryExpressionModifierToken {
  constructor(
    sourceLocation: TokenLocation,
    public expression: ExpressionToken,
  ) {
    super('index', sourceLocation)
  }

  override compile(compiler: Compiler, operandType: Type): Type {
    if (operandType instanceof ArrayType) {
      this.compileIndex(compiler)
      this.pushInstruction(compiler, new LoadArrayElementInstruction())
      if (operandType.element === undefined) return new NoType()
      return operandType.element
    } else if (operandType instanceof SliceType) {
      this.compileIndex(compiler)
      this.pushInstruction(compiler, new LoadSliceElementInstruction())
      if (operandType.element === undefined) return new NoType()
      return operandType.element
    } else if (operandType instanceof PointerType) {
      const baseType = operandType.type
      if (baseType instanceof ArrayType) {
        this.compileIndex(compiler)
        this.pushInstruction(compiler, new LoadArrayElementInstruction())
        if (baseType.element === undefined) return new NoType()
        return baseType.element
      } else if (baseType instanceof SliceType) {
        this.compileIndex(compiler)
        this.pushInstruction(compiler, new LoadSliceElementInstruction())
        if (baseType.element === undefined) return new NoType()

        return baseType.element
      }
    }
    throw new Error(
      `Invalid operation: Cannot index a variable of type ${operandType}`,
    )
  }

  private compileIndex(compiler: Compiler) {
    const indexType = this.expression.compile(compiler)
    if (!(indexType instanceof Int64Type)) {
      throw new Error(
        `Invalid argument: Index has type ${indexType} but must be an integer`,
      )
    }
  }
}

export class SliceToken extends PrimaryExpressionModifierToken {
  constructor(
    sourceLocation: TokenLocation,
    public from: ExpressionToken | null,
    public to: ExpressionToken | null,
  ) {
    super('slice', sourceLocation)
  }

  override compile(compiler: Compiler, operandType: Type): Type {
    if (operandType instanceof ArrayType || operandType instanceof SliceType) {
      this.compileIndex(compiler, this.from)
      this.compileIndex(compiler, this.to)
      this.pushInstruction(compiler, new SliceOperationInstruction())
      return new SliceType(operandType.element)
    }
    throw new Error(`Invalid operation: Cannot slice ${operandType}`)
  }

  private compileIndex(compiler: Compiler, index: ExpressionToken | null) {
    if (index) index.compile(compiler)
    else {
      // Use a non integer type to represent the default value for the index.
      this.pushInstruction(
        compiler,
        new LoadConstantInstruction(false, new BoolType()),
      )
    }
  }
}

export class CallToken extends PrimaryExpressionModifierToken {
  expressions: ExpressionToken[]

  constructor(
    sourceLocation: TokenLocation,
    expressions: ExpressionToken[] | null,
  ) {
    super('call', sourceLocation)
    this.expressions = expressions ?? []
  }

  override compile(compiler: Compiler, operandType: Type): Type {
    if (!(operandType instanceof FunctionType)) {
      throw Error(
        `Invalid operation: cannot call non-function (of type ${operandType})`,
      )
    }

    const argumentTypes = this.expressions.map((e) => e.compile(compiler))
    let argumentLength = 0
    for (let i = 0; i < argumentTypes.length; i++) {
      argumentLength =
        argumentTypes[i] instanceof ReturnType
          ? argumentLength + (argumentTypes[i] as ReturnType).types.length
          : argumentLength + 1
    }
    this.pushInstruction(compiler, new CallInstruction(argumentLength))

    // We only implement variadic functions that accept any number of any type of arguments,
    // so variadic functions do not require type checking.
    if (!operandType.variadic) {
      if (argumentLength < operandType.parameters.length) {
        throw Error(
          `Not enough arguments in function call\n` +
            `have (${TypeUtility.arrayToString(argumentTypes)})\n` +
            `want (${TypeUtility.arrayToString(operandType.parameters)})`,
        )
      }
      if (argumentLength > operandType.parameters.length) {
        throw Error(
          `Too many arguments in function call\n` +
            `have (${TypeUtility.arrayToString(argumentTypes)})\n` +
            `want (${TypeUtility.arrayToString(operandType.parameters)})`,
        )
      }

      let delta = 0
      for (let i = 0; i < argumentTypes.length; i++) {
        if (argumentTypes[i] instanceof ReturnType) {
          if ((argumentTypes[i] as ReturnType).types.length > 1) {
            for (
              let j = 0;
              j < (argumentTypes[i] as ReturnType).types.length;
              j++
            ) {
              // literals have unnamed types, so it can match a declared type
              let type = (argumentTypes[i] as ReturnType).types[j]
              if (
                this.expressions[i] instanceof PrimaryExpressionToken &&
                (this.expressions[i] as PrimaryExpressionToken).operand.type ===
                  'literal' &&
                operandType.parameters[i + j + delta] instanceof
                  ParameterType &&
                operandType.parameters[i + j + delta].type instanceof
                  DeclaredType
              ) {
                // argument is a literal, make it match type of required type by function
                let actualType = operandType.parameters[i + j + delta]
                  .type as DeclaredType
                let nextType = compiler.context.env.find_type(
                  actualType.name,
                )[0]
                while (nextType instanceof DeclaredType) {
                  actualType = nextType
                  nextType = compiler.context.env.find_type(actualType.name)[0]
                }
                if (
                  (argumentTypes[i] as ReturnType).types[j].assignableBy(
                    nextType,
                  )
                ) {
                  type = nextType
                  break
                }
              }
              if (type.assignableBy(operandType.parameters[i + j + delta].type))
                continue
              throw Error(
                `Cannot use ${type} as ${
                  operandType.parameters[i + j + delta]
                } in argument to function call`,
              )
            }
            delta += (argumentTypes[i] as ReturnType).types.length - 1
          } else {
            let type = argumentTypes[i]
            if (
              this.expressions[i] instanceof PrimaryExpressionToken &&
              (this.expressions[i] as PrimaryExpressionToken).operand.type ===
                'literal' &&
              operandType.parameters[i] instanceof ParameterType &&
              operandType.parameters[i].type instanceof DeclaredType
            ) {
              // argument is a literal, make it match type of required type by function
              let actualType = operandType.parameters[i].type as DeclaredType
              let nextType = compiler.context.env.find_type(actualType.name)[0]
              while (nextType instanceof DeclaredType) {
                actualType = nextType
                nextType = compiler.context.env.find_type(actualType.name)[0]
              }
              if (argumentTypes[i].assignableBy(nextType)) {
                type = nextType
                break
              }
            }
            if (type.assignableBy(operandType.parameters[i].type)) continue
            throw Error(
              `Cannot use ${type} as ${operandType.parameters[i]} in argument to function call`,
            )
          }
        } else {
          let type = argumentTypes[i]
          if (
            this.expressions[i] instanceof PrimaryExpressionToken &&
            (this.expressions[i] as PrimaryExpressionToken).operand.type ===
              'literal' &&
            operandType.parameters[i] instanceof ParameterType &&
            operandType.parameters[i].type instanceof DeclaredType
          ) {
            // argument is a literal, make it match type of required type by function
            let actualType = operandType.parameters[i].type as DeclaredType
            let nextType = compiler.context.env.find_type(actualType.name)[0]
            while (nextType instanceof DeclaredType) {
              actualType = nextType
              nextType = compiler.context.env.find_type(actualType.name)[0]
            }
            if (argumentTypes[i].assignableBy(nextType)) {
              type = nextType
              break
            }
          }
          if (type.assignableBy(operandType.parameters[i].type)) continue
          throw Error(
            `Cannot use ${type} as ${operandType.parameters[i]} in argument to function call`,
          )
        }
      }
    }

    if (operandType.results.isVoid()) {
      return new NoType()
    }
    if (operandType.results.types.length === 1) {
      // A return type with a single value can be unwrapped.
      return operandType.results.types[0]
    }
    return operandType.results
  }
}

type BuiltinFunctionName = (typeof BuiltinCallToken.validNames)[number]
// The following builtin functions are omitted: new, panic, recover.
// This does not extend from PrimaryExpression because its parsing is completely separate:
// Certain builtin functions take in a type as the first argument (as opposed to a value).
export class BuiltinCallToken extends Token {
  static validNames = [
    'append',
    'clear',
    'close',
    'delete',
    'len',
    'cap',
    'make',
    'min',
    'max',
  ] as const

  static namesThatTakeType = ['make'] as const

  constructor(
    sourceLocation: TokenLocation,
    public name: BuiltinFunctionName,
    /** The first argument if it is a type. */
    public firstTypeArg: TypeToken | null,
    public args: ExpressionToken[],
  ) {
    super('builtin', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    if (this.name === 'make') return this.compileMake(compiler)
    else if (this.name === 'len') return this.compileLen(compiler)
    else if (this.name === 'cap') return this.compileCap(compiler)
    else {
      throw new Error(`Builtin function ${this.name} is not yet implemented.`)
    }
  }

  private compileCap(compiler: Compiler): Type {
    if (this.args.length !== 1) {
      this.throwArgumentLengthError('cap', 1, this.args.length)
    }
    const argType = this.args[0].compile(compiler)
    if (argType instanceof ArrayType || argType instanceof SliceType) {
      this.pushInstruction(compiler, new BuiltinCapInstruction())
    } else {
      this.throwArgumentTypeError('cap', argType)
    }
    return new Int64Type()
  }

  private compileLen(compiler: Compiler): Type {
    if (this.args.length !== 1) {
      this.throwArgumentLengthError('len', 1, this.args.length)
    }
    const argType = this.args[0].compile(compiler)
    if (argType instanceof ArrayType || argType instanceof SliceType) {
      this.pushInstruction(compiler, new BuiltinLenInstruction())
    } else {
      this.throwArgumentTypeError('len', argType)
    }
    return new Int64Type()
  }

  private compileMake(compiler: Compiler): Type {
    const typeArg = (this.firstTypeArg as TypeToken).compile(compiler)
    if (!(typeArg instanceof SliceType || typeArg instanceof ChannelType)) {
      throw new Error(
        `Invalid argument: cannot make ${typeArg}; type must be slice, map, or channel`,
      )
    }
    if (typeArg instanceof ChannelType) {
      if (this.args.length === 0)
        this.pushInstruction(
          compiler,
          new LoadConstantInstruction(0, new Int64Type()),
        )
      else {
        const buffer_sz = this.args[0].compile(compiler)
        if (!(buffer_sz instanceof Int64Type)) {
          throw new Error(`Non-integer condition in channel buffer size`)
        }
      }
    }
    // !TODO Make for slice
    this.pushInstruction(compiler, new LoadChannelInstruction())
    return typeArg
  }

  private throwArgumentLengthError(
    name: string,
    expectedNum: number,
    actualNum: number,
  ) {
    const errorMessage =
      expectedNum < actualNum
        ? `Invalid operation: too many arguments for ${name} (expected ${expectedNum}, found ${actualNum})`
        : `Invalid operation: not enough arguments for ${name} (expected ${expectedNum}, found ${actualNum})`
    throw new Error(errorMessage)
  }

  private throwArgumentTypeError(name: string, type: Type) {
    const errorMessage = `Invalid argument: (${type}) for ${name}`
    throw new Error(errorMessage)
  }
}
