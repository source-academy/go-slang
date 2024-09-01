import { Compiler } from '../../compiler'
import {
  FuncBlockInstruction,
  JumpInstruction,
  LoadArrayInstruction,
  LoadConstantInstruction,
  LoadDefaultInstruction,
  LoadFuncInstruction,
  LoadSliceInstruction,
  ReturnInstruction,
} from '../../compiler/instructions'
import {
  ArrayType,
  Float64Type,
  FunctionType,
  Int64Type,
  ReturnType,
  SliceType,
  StringType,
  Type,
} from '../../compiler/typing'

import { Token, TokenLocation } from './base'
import { BlockToken } from './block'
import { ExpressionToken } from './expressions'
import { ArrayTypeToken, FunctionTypeToken, SliceTypeToken } from './type'

export abstract class LiteralToken extends Token {
  constructor(sourceLocation: TokenLocation, public value: number | string) {
    super('literal', sourceLocation)
  }

  static is(token: Token): token is LiteralToken {
    return token.type === 'literal'
  }
}

export class IntegerLiteralToken extends LiteralToken {
  /** Tokenize an integer literal in the given base. */
  static fromSource(sourceLocation: TokenLocation, str: string, base: number) {
    // Golang numbers can be underscore delimited.
    const value = parseInt(str.replace('_', ''), base)
    return new IntegerLiteralToken(sourceLocation, value)
  }

  getValue(): number {
    return this.value as number
  }

  override compileUnchecked(compiler: Compiler): Type {
    this.pushInstruction(
      compiler,
      new LoadConstantInstruction(this.value, new Int64Type()),
    )
    return new Int64Type()
  }
}

export class FloatLiteralToken extends LiteralToken {
  /** Tokenize a float literal. */
  static fromSource(sourceLocation: TokenLocation, str: string) {
    const value = parseFloat(str)
    return new FloatLiteralToken(sourceLocation, value)
  }

  getValue(): number {
    return this.value as number
  }

  override compileUnchecked(compiler: Compiler): Type {
    this.pushInstruction(
      compiler,
      new LoadConstantInstruction(this.value, new Float64Type()),
    )
    return new Float64Type()
  }
}

export class StringLiteralToken extends LiteralToken {
  /** Tokenize a raw string literal. */
  static fromSourceRaw(sourceLocation: TokenLocation, str: string) {
    // Carriage returns are discarded from raw strings.
    str = str.replaceAll('\r', '')
    return new StringLiteralToken(sourceLocation, str)
  }

  /** Tokenize an interpreted string literal. */
  static fromSourceInterpreted(sourceLocation: TokenLocation, str: string) {
    return new StringLiteralToken(sourceLocation, str)
  }

  getValue(): string {
    return this.value as string
  }

  override compileUnchecked(compiler: Compiler): Type {
    this.pushInstruction(
      compiler,
      new LoadConstantInstruction(this.value, new StringType()),
    )
    return new StringType()
  }
}

export class FunctionLiteralToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public signature: FunctionTypeToken,
    public body: BlockToken,
  ) {
    super('function_literal', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    compiler.context.push_env()
    const jump_instr = new JumpInstruction()
    this.pushInstruction(compiler, jump_instr)
    const func_start = compiler.instructions.length
    const block_instr = new FuncBlockInstruction(
      this.signature.parameters.length,
    )
    this.pushInstruction(compiler, block_instr)

    const signatureType = this.signature.compile(compiler) as FunctionType
    compiler.type_environment = compiler.type_environment.extend()
    compiler.type_environment.updateReturnType(signatureType.results)

    let cnt = 0
    for (const param of this.signature.parameters) {
      const name = param.identifier || (cnt++).toString()
      compiler.context.env.declare_var(name)
      compiler.type_environment.addType(name, param.type.compile(compiler))
    }

    let hasReturn = false
    for (const sub_token of this.body.statements) {
      const statementType = sub_token.compile(compiler)
      hasReturn ||= statementType instanceof ReturnType
    }
    const vars = compiler.context.env.get_frame()
    block_instr.set_frame(
      vars.map((name) => compiler.type_environment.get(name)),
    )
    block_instr.set_identifiers(vars)
    compiler.type_environment = compiler.type_environment.pop()
    compiler.context.pop_env()

    this.pushInstruction(compiler, new ReturnInstruction())
    jump_instr.set_addr(compiler.instructions.length)
    this.pushInstruction(compiler, new LoadFuncInstruction(func_start))

    if (!hasReturn && signatureType.results.types.length > 0) {
      throw new Error(`Missing return.`)
    }
    return signatureType
  }
}

export class LiteralValueToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public elements: (LiteralValueToken | ExpressionToken)[],
  ) {
    super('literal_value', sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    throw new Error(
      'Do not use LiteralValueToken.compile, instead use LiteralValueToken.compileWithType',
    )
  }

  //! TODO (P5): It is extremely weird to define a separate compilation method,
  //! but we need the extra type information here. How to fix this?
  compileWithType(compiler: Compiler, type: Type) {
    if (type instanceof ArrayType) {
      if (this.elements.length > type.length) {
        throw new Error(
          `Array literal has ${this.elements.length} elements but only expected ${type.length}, in type ${type}.`,
        )
      }

      for (const element of this.elements) {
        this.compileElement(compiler, type.element, element, 'array literal')
      }
      for (let i = 0; i < type.length - this.elements.length; i++) {
        // Ran out of literal values, use the default values.
        this.pushInstruction(compiler, new LoadDefaultInstruction(type.element))
      }

      this.pushInstruction(compiler, new LoadArrayInstruction(type.length))
    } else if (type instanceof SliceType) {
      for (const element of this.elements) {
        this.compileElement(compiler, type.element, element, 'slice literal')
      }
      const sliceLength = this.elements.length
      this.pushInstruction(
        compiler,
        new LoadArrayInstruction(sliceLength),
        new LoadConstantInstruction(0, new Int64Type()),
        new LoadConstantInstruction(sliceLength, new Int64Type()),
        new LoadSliceInstruction(),
      )
    } else {
      throw new Error('Parser Bug: Type of literal value is not supported.')
    }
  }

  /** Compile an element and check that it matches the given type.
   * typeName is the name of the structure (e.g. array literal) for the error message. */
  private compileElement(
    compiler: Compiler,
    type: Type,
    element: LiteralValueToken | ExpressionToken,
    typeName: string,
  ) {
    if (element instanceof LiteralValueToken) {
      element.compileWithType(compiler, type)
    } else {
      const actualType = element.compile(compiler)
      if (!type.equals(actualType)) {
        throw new Error(
          `Cannot use ${actualType} as ${type} value in ${typeName}.`,
        )
      }
    }
  }
}

export class ArrayLiteralToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public arrayType: ArrayTypeToken,
    public body: LiteralValueToken,
  ) {
    super('array_literal', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const type = this.arrayType.compile(compiler)
    this.body.compileWithType(compiler, type)
    return type
  }
}

export class SliceLiteralToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public sliceType: SliceTypeToken,
    public body: LiteralValueToken,
  ) {
    super('slice_literal', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const type = this.sliceType.compile(compiler)
    this.body.compileWithType(compiler, type)
    return type
  }
}
