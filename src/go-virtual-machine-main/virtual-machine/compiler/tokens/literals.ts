import { Compiler } from '../../executor'
import {
  FuncBlockInstruction,
  JumpInstruction,
  LoadArrayElementInstruction,
  LoadArrayInstruction,
  LoadConstantInstruction,
  LoadDefaultInstruction,
  LoadFuncInstruction,
  LoadSliceInstruction,
  LoadVariableInstruction,
  ReturnInstruction,
  StoreArrayElementInstruction,
  StoreInstruction,
  StoreStructFieldInstruction,
} from '../../executor/instructions'
import { MemoryAllocationInstruction } from '../../executor/instructions/memory'
import {
  ArrayType,
  DeclaredType,
  Float64Type,
  FunctionType,
  Int64Type,
  ReturnType,
  SliceType,
  StringType,
  StructType,
  Type,
} from '../../executor/typing'

import { Token, TokenLocation } from './base'
import { BlockToken } from './block'
import { ExpressionToken, PrimaryExpressionToken } from './expressions'
import { ArrayTypeToken, DeclaredTypeToken, FunctionTypeToken, SliceTypeToken, StructTypeToken, TypeToken } from './type'

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
    // may need to change so that it can be a float as well
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
      let a = 0
      if (a == 0 && compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction) {
        a += (compiler.instructions[compiler.instructions.length - 1] as StoreArrayElementInstruction).index + 1
      }
      for (const element of this.elements) {
        this.compileElement(compiler, type.element, element, 'array literal')
        // load element in actual array and then store element
        if (!(type.element instanceof ArrayType)) {
        this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
        this.pushInstruction(compiler, new StoreArrayElementInstruction(a))
        a++
        }
      }
      for (let i = 0; i < type.length - this.elements.length; i++) {
        // Ran out of literal values, use the default values.
        this.pushInstruction(compiler, new LoadDefaultInstruction(type.element))
        // load element in actual array and then store element
        if (!(type.element instanceof ArrayType)) {
        this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
        this.pushInstruction(compiler, new StoreArrayElementInstruction(a))
        a++
        }
      }
    } else if (type instanceof SliceType) {
      for (const element of this.elements) {
        this.compileElement(compiler, type.element, element, 'slice literal')
      }
      const sliceLength = this.elements.length
      this.pushInstruction(
        compiler,
        new LoadArrayInstruction(sliceLength, type),
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
      let actualType = element.compile(compiler)
      // make untyped element match the required type
      let finalType = type
      if (element instanceof PrimaryExpressionToken
        && (element as PrimaryExpressionToken).operand.type === "literal"
        && type instanceof DeclaredType) {
        let nextType = (type as DeclaredType).type[0]
        while (nextType instanceof DeclaredType) {
          finalType = nextType
          nextType = (finalType as DeclaredType).type[0]
        }
        if (actualType.assignableBy(nextType)) {
          actualType = type
        }
      }
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

export class StructLiteralToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public override type: StructTypeToken,
    public body: LiteralValueToken,
  ) {
    super('struct_literal', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    // anonymous structs
    if (this.type instanceof StructTypeToken) {
      for (let i = 0; i < this.body.elements.length; i++) {
        for (let j = 0; j < this.type.fields.length; j++) {
          for (let k = 0; k < this.type.fields[j].list.length; k++) {
            const valueType = this.body.elements[i].compile(compiler)
            const fieldType = this.type.fields[j].type.compile(compiler)
            if (!valueType.assignableBy(fieldType)) {
              throw new Error('Value type does not match field type.')
            }
            if (!(fieldType instanceof StructType)) {
              if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(i + (compiler.instructions[compiler.instructions.length - 3] as StoreStructFieldInstruction).index))
              } else {
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(i))
              }
            }
            i++
          }
        }
      }
    } else if (this.type instanceof DeclaredTypeToken) {
      // explicitly type-declared structs
      let struct = compiler.context.env.find_type(this.type.name)[0] as StructType
      for (let i = 0; i < this.body.elements.length; i++) {
        let fieldType = Object.entries(struct.fields)[i][1] as Type
        const hasKey = this.body.elements[i].key !== undefined
        const valueType = hasKey
          ? this.body.elements[i].element.compile(compiler)
          : this.body.elements[i].compile(compiler)
        if (hasKey) {
          const key = this.body.elements[i].key.identifier
          fieldType = struct.fields[key]
        }
        if (!valueType.assignableBy(fieldType)) {
          throw new Error('Value type does not match field type.')
        }
        this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
        if (hasKey) {
          const index = Object.keys(struct.fields).indexOf(this.body.elements[i].key.identifier)
          this.pushInstruction(compiler, new StoreStructFieldInstruction(index))
        } else {
          this.pushInstruction(compiler, new StoreStructFieldInstruction(i))
        }
      }
    }
    return this.type.compile(compiler)
  }
}
