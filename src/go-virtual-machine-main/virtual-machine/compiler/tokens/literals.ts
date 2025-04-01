import { Compiler } from '../../executor'
import {
  FuncBlockInstruction,
  JumpInstruction,
  LoadArrayInstruction,
  LoadConstantInstruction,
  LoadDefaultInstruction,
  LoadFuncInstruction,
  LoadSliceInstruction,
  LoadVariableInstruction,
  ReturnInstruction,
  StoreArrayElementInstruction,
  StoreStructFieldInstruction,
} from '../../executor/instructions'
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
      let offset = 0
      // we want the array to be contiguous in memory, so we count them in sequence, even if the array is
      // multi-dimensional
      if (offset == 0 && compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction) {
        offset += (compiler.instructions[compiler.instructions.length - 1] as StoreArrayElementInstruction).index + 1
      } else if (offset == 0 && compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) {
        offset += (compiler.instructions[compiler.instructions.length - 1] as StoreStructFieldInstruction).index + 1
      }
      for (const element of this.elements) {
        this.compileElement(compiler, type.element, element, 'array literal')
        // load element in actual array and then store element
        offset = handleInstructions(compiler, type, offset)
      }
      for (let i = 0; i < type.length - this.elements.length; i++) {
        // Ran out of literal values, use the default values.
        this.pushInstruction(compiler, new LoadDefaultInstruction(type.element))
        // load element in actual array and then store element
        offset = handleInstructions(compiler, type, offset)
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
    } else if (type instanceof DeclaredType) {
      let actualType = type.type[0]
      while (actualType instanceof DeclaredType) {
        actualType = actualType.type[0]
      }
      let offset = 0
      if (offset == 0 && compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction) {
        offset += (compiler.instructions[compiler.instructions.length - 1] as StoreArrayElementInstruction).index + 1
      } else if (offset == 0 && compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) {
        offset += (compiler.instructions[compiler.instructions.length - 1] as StoreStructFieldInstruction).index + 1
      }
      for (let i = 0; i < this.elements.length; i++) {
        this.compileElement(compiler, [...actualType.fields.values()][i], this.elements[i], 'array literal')
        // load element in actual array and then store element
        offset = handleInstructions(compiler, type, offset)
      }
      for (let i = 0; i < type.length - this.elements.length; i++) {
        // Ran out of literal values, use the default values.
        this.pushInstruction(compiler, new LoadDefaultInstruction(type.element))
        // load element in actual array and then store element
        offset = handleInstructions(compiler, type, offset)
      }
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
              if (this.body.elements[i].operand instanceof LiteralToken) {
                let baseType = fieldType
                while (baseType instanceof DeclaredType) {
                  baseType = baseType.type[0]
                }
                if (!(baseType.assignableBy(valueType))) {
                  throw new Error('Value type does not match field type.')
                }
              } else {
                throw new Error('Value type does not match field type.')
              }
            }
            if (!(fieldType instanceof StructType)) {
              if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
                if (!(fieldType instanceof ArrayType)
                  && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                  && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
                ) {
                  // instruction correction to ensure that struct fields are stored correctly
                  this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                  this.pushInstruction(compiler, new StoreStructFieldInstruction(1 + (compiler.instructions[compiler.instructions.length - 3] as StoreStructFieldInstruction).index))
                }
              } else {
                if (!(fieldType instanceof ArrayType)
                  && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                  && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
                ) {
                  // instruction correction to ensure that struct fields are stored correctly
                  this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                  this.pushInstruction(compiler, new StoreStructFieldInstruction(i))
                }
              }
            }
            i++
          }
        }
      }
    } else if (this.type instanceof DeclaredTypeToken) {
      // explicitly type-declared structs
      const struct = compiler.context.env.find_type(this.type.name)[0] as StructType
      for (let i = 0; i < this.body.elements.length; i++) {
        let fieldType = [...struct.fields.values()][i]
        const hasKey = this.body.elements[i].key !== undefined
        let valueType = undefined
        // compile struct values separately if nested struct
        if (hasKey && this.body.elements[i].element instanceof LiteralValueToken) {
          const map = new Map<string, Type>()
          const names = [...struct.fields.values()]
          for (let j = 0; j < this.body.elements[i].element.elements.length; j++) {
            map.set([...names[i].type[0].fields.keys()][j], this.body.elements[i].element.elements[j].compile(compiler))
            if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(1 + (compiler.instructions[compiler.instructions.length - 3] as StoreStructFieldInstruction).index))
              }
            } else {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(j))
              }
            }
          }
          valueType = new StructType(map)
        } else if (!hasKey && this.body.elements[i] instanceof LiteralValueToken) {
          const map = new Map<string, Type>()
          const names = [...struct.fields.values()]
          for (let j = 0; j < this.body.elements[i].element.elements.length; j++) {
            map.set([...names[i].type[0].fields.keys()][j], this.body.elements[i].element.elements[j].compile(compiler))
            if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(1 + (compiler.instructions[compiler.instructions.length - 3] as StoreStructFieldInstruction).index))
              }
            } else {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(j))
              }
            }
          }
          valueType = new StructType(map)
        } else if (hasKey) {
          valueType = this.body.elements[i].element.compile(compiler)
        } else {
          valueType = this.body.elements[i].compile(compiler)
        }
        if (hasKey) {
          let fieldName = undefined
          const key = this.body.elements[i].key.identifier
          for (const [k, v] of struct.fields) {
            if (k === key) {
              fieldType = v
              fieldName = k
              break
            }
          }
          if (fieldName === undefined) {
            throw new Error('Value type does not match field type.')
          }
        }
        if (!valueType.assignableBy(fieldType)) {
          throw new Error('Value type does not match field type.')
        }
        if (!(fieldType instanceof StructType || valueType instanceof StructType)) {
          if (hasKey) {
            const index = [...struct.fields.keys()].indexOf(this.body.elements[i].key.identifier)
            if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
              let place = 0
              for (let i = 0; i < index; i++) {
                if (this.body.elements[i].element instanceof PrimaryExpressionToken
                  && this.body.elements[i].element.operand instanceof StructLiteralToken) {
                  place += fieldCounterStruct(this.body.elements[i].element.operand, 0)
                } else if (this.body.elements[i].element instanceof LiteralValueToken) {
                  place += fieldCounterLiteral(this.body.elements[i].element, 0)
                }
              }
              if (place > 0) place--
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(index + place))
              }
            } else {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(index))
              }
            }
          } else {
            if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction) {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(1 + (compiler.instructions[compiler.instructions.length - 3] as StoreStructFieldInstruction).index))
              }
            } else if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreArrayElementInstruction) {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(1 + (compiler.instructions[compiler.instructions.length - 3] as StoreArrayElementInstruction).index))
              }
            } else {
              if (!(fieldType instanceof ArrayType)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
                && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction) 
              ) {
                // instruction correction to ensure that struct fields are stored correctly
                this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ""))
                this.pushInstruction(compiler, new StoreStructFieldInstruction(i))
              }
            }
          }
        }
      }
    }
    return this.type.compile(compiler)
  }
}

function fieldCounterStruct(x: StructLiteralToken, c: number) {
  for (let i = 0; i < x.body.elements.length; i++) {
    if (x.body.elements[i].element instanceof LiteralValueToken) {
      c = fieldCounterLiteral(x.body.elements[i].element, c)
    } else if (x.body.elements[i].element instanceof PrimaryExpressionToken
      && x.body.elements[i].element.operand instanceof StructLiteralToken) {
      c = fieldCounterStruct(x.body.elements[i].element.operand, c)
    } else {
      c++
    }
  }
  return c
}

function fieldCounterLiteral(x: LiteralValueToken, c: number) {
  for (let i = 0; i < x.elements.length; i++) {
    if (x.elements[i].element instanceof LiteralValueToken) {
      c = fieldCounterLiteral(x.elements[i].element, c)
    } else if (x.elements[i].element instanceof PrimaryExpressionToken
      && x.elements[i].element.operand instanceof StructLiteralToken) {
      c = fieldCounterStruct(x.elements[i].element.operand, c)
    } else {
      c++
    }
  }
  return c
}

function handleInstructions(compiler: Compiler, type: Type, offset: number): number {
  if (!(type.element instanceof ArrayType) && !(type.element instanceof DeclaredType && type.element.type[0] instanceof StructType)
    && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreArrayElementInstruction)
    && !(compiler.instructions[compiler.instructions.length - 1] instanceof StoreStructFieldInstruction)) {
    if (compiler.instructions[compiler.instructions.length - 2] instanceof StoreStructFieldInstruction
      || compiler.instructions[compiler.instructions.length - 2] instanceof StoreArrayElementInstruction
    ) {
      // instruction correction to ensure the storing of array elements are in the correct place
      compiler.instructions.push(new LoadVariableInstruction(0, 0, ""))
      compiler.instructions.push(new StoreArrayElementInstruction(1 + compiler.instructions[compiler.instructions.length - 3].index))
    } else {
      compiler.instructions.push(new LoadVariableInstruction(0, 0, ""))
      compiler.instructions.push(new StoreArrayElementInstruction(offset))
    }
    return offset + 1
  }
  return offset
}