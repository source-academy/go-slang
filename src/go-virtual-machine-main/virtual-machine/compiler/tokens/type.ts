import { Compiler } from '../../executor'
import { Type } from '../../executor/typing'
import { ArrayType } from '../../executor/typing/array_type'
import { BoolType } from '../../executor/typing/bool_type'
import { ChannelType } from '../../executor/typing/channel_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { Float64Type } from '../../executor/typing/float64_type'
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
import { IntegerLiteralToken } from './literals'

export abstract class TypeToken extends Token {
  constructor(sourceLocation: TokenLocation) {
    super('type', sourceLocation)
  }
}

/**
 * Note that PrimitiveTypeToken is not a native Golang construct.
 * It is used to encompass Boolean, Numeric, and String types.
 */
export class PrimitiveTypeToken extends TypeToken {
  static primitiveTypes = ['bool', 'int64', 'float64', 'int', 'string'] as const

  static isPrimitive = (
    name: unknown,
  ): name is (typeof PrimitiveTypeToken.primitiveTypes)[number] => {
    return PrimitiveTypeToken.primitiveTypes.includes(
      // This type cast is necessary as .includes only accepts types equal to an array element.
      name as (typeof PrimitiveTypeToken.primitiveTypes)[number],
    )
  }

  static isPrimitiveToken = (token: unknown): token is PrimitiveTypeToken => {
    return (
      token instanceof PrimitiveTypeToken &&
      PrimitiveTypeToken.isPrimitive(token.name)
    )
  }

  name: (typeof PrimitiveTypeToken.primitiveTypes)[number]

  constructor(sourceLocation: TokenLocation, name: string) {
    super(sourceLocation)
    if (!PrimitiveTypeToken.isPrimitive(name)) {
      throw Error(`Invalid primitive type: ${name}`)
    }
    this.name = name
  }

  override compileUnchecked(_compiler: Compiler): Type {
    if (this.name === 'bool') return new BoolType()
    else if (this.name === 'float64') return new Float64Type()
    else if (this.name === 'int') return new Int64Type()
    else if (this.name === 'int64') return new Int64Type()
    else if (this.name === 'string') return new StringType()
    return new NoType()
  }
}

export class ArrayTypeToken extends TypeToken {
  constructor(
    sourceLocation: TokenLocation,
    public element: TypeToken,
    public length: IntegerLiteralToken,
  ) {
    super(sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    return new ArrayType(this.element.compile(compiler), this.length.getValue())
  }
}

export class SliceTypeToken extends TypeToken {
  constructor(sourceLocation: TokenLocation, public element: TypeToken) {
    super(sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): SliceType {
    return new SliceType(this.element.compile(compiler))
  }
}

type ParameterDecl = {
  identifier: string | null
  type: TypeToken
}
export class FunctionTypeToken extends TypeToken {
  public parameters: ParameterDecl[]
  public results: ParameterDecl[]

  constructor(
    sourceLocation: TokenLocation,
    parameters: ParameterDecl[],
    results: ParameterDecl[] | null,
  ) {
    super(sourceLocation)
    this.parameters = parameters
    this.results = results ?? []
  }

  override compileUnchecked(compiler: Compiler): FunctionType {
    const parameterTypes = this.parameters.map(
      (p) => new ParameterType(p.identifier, p.type.compile(compiler)),
    )
    const resultTypes = new ReturnType(
      this.results.map((r) => r.type.compile(compiler)),
    )
    return new FunctionType(parameterTypes, resultTypes)
  }
}

export class MapTypeToken extends TypeToken {
  constructor(
    sourceLocation: TokenLocation,
    public key: TypeToken,
    public element: TypeToken,
  ) {
    super(sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    //! TODO: Implement.
    return new NoType()
  }
}

export class ChannelTypeToken extends TypeToken {
  constructor(
    sourceLocation: TokenLocation,
    public element: TypeToken,
    public readable: boolean,
    public writable: boolean,
  ) {
    super(sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    return new ChannelType(
      this.element.compile(compiler),
      this.readable,
      this.writable,
    )
  }
}

export class DeclaredTypeToken extends TypeToken {
  name: string
  constructor(sourceLocation: TokenLocation, name: string) {
    super(sourceLocation)
    this.name = name
  }

  override compileUnchecked(compiler: Compiler): Type {
    const result = compiler.context.env.create_type(this.name)
    const internalName = Object.keys(result)[0]
    const baseTypes = Object.values(result)[0]
    // load the underlying types
    // need to configure to use declared type if possible
    return new DeclaredType(internalName, baseTypes)
  }
}

export class StructTypeToken extends TypeToken {
  constructor(sourceLocation: TokenLocation, public fields: Token[]) {
    super(sourceLocation)
    this.fields = fields
  }

  override compileUnchecked(compiler: Compiler): Type {
    // load the underlying types
    // need to configure to use declared type if possible
    // make sense of the fields to construct the structure of the struct
    const struct = new Map<string, Type>()
    // this.fields.length represents the number of lines of code
    // used to declare the fields of the struct
    for (let i = 0; i < this.fields.length; i++) {
      // get type of each field line first
      const type = Object.values(this.fields[i])[1].compile(compiler)
      for (let j = 0; j < Object.values(this.fields[i])[0].length; j++) {
        // link the identifier of each field line to the type
        struct.set(Object.values(this.fields[i])[0][j].identifier, type)
      }
    }
    return new StructType(struct)
  }
}

export class PointerTypeToken extends TypeToken {
  constructor(sourceLocation: TokenLocation, public pointingType: Token) {
    super(sourceLocation)
    this.pointingType = pointingType
  }

  override compileUnchecked(compiler: Compiler): Type {
    const baseType = this.pointingType.compile(compiler)
    return new PointerType(baseType)
  }
}
