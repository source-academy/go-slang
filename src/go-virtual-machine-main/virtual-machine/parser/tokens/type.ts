import { Compiler } from '../../compiler'
import {
  ArrayType,
  BoolType,
  ChannelType,
  Float64Type,
  FunctionType,
  Int64Type,
  NoType,
  ParameterType,
  ReturnType,
  SliceType,
  StringType,
  Type,
} from '../../compiler/typing'

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
    else return new NoType()
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

  override compileUnchecked(compiler: Compiler): ArrayType {
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
