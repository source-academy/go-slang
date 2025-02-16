import { Compiler } from '../../executor'
import {
  ArrayType,
  BoolType,
  ChannelType,
  DeclaredType,
  Float64Type,
  FunctionType,
  Int64Type,
  NoType,
  ParameterType,
  ReturnType,
  SliceType,
  StringType,
  StructType,
  Type,
} from '../../executor/typing'
import { IdentifierToken } from './identifier'

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

  override compileUnchecked(compiler: Compiler): Type {
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

export class DeclaredTypeToken extends TypeToken {
  name: string
  constructor(sourceLocation: TokenLocation, name: string) {
    super(sourceLocation)
    this.name = name
  }

  override compileUnchecked(compiler: Compiler): Type {
    const [baseTypes, internalName] = compiler.context.env.create_type(this.name)
    // load the underlying types
    // need to configure to use declared type if possible
    return new DeclaredType(internalName, baseTypes)
  }
}

export class StructTypeToken extends TypeToken {
  constructor(
    sourceLocation: TokenLocation,
    public fields: Token[],
  ) {
    super(sourceLocation)
    this.fields = fields
  }

  override compileUnchecked(compiler: Compiler): Type {
    // load the underlying types
    // need to configure to use declared type if possible
    // make sense of the fields to construct the structure of the struct
    const struct = {} as Record<string, Type>
    // this.fields.length represents the number of lines of code
    // used to declare the fields of the struct
    for (let i = 0; i < this.fields.length; i++) {
      // get type of each field line first
      const type = (this.fields[i].type as TypeToken).compile(compiler)
      for (let j = 0; j < this.fields[i].list.length; j++) {
        // link the identifier of each field line to the type
        struct[this.fields[i].list[j].identifier] = type
      }
    }
    /*
    for (let i = 0; i < this.fields.length; i++) {
      for (let j = 0; j < this.fields[i].length; j++) {
        if (this.fields[0][j] != null && this.fields[0][j][0] instanceof Array) {
          let type = undefined
          // get type first
          for (let k = 0; k < this.fields[i][j][0].length; k++) {
            if (this.fields[i][j][0][k] instanceof TypeToken) {
              type = this.fields[i][j][0][k].compile(compiler)
              break
            }
          }
          for (let k = 0; k < this.fields[i][j][0].length; k++) {
            if (!(this.fields[i][j][0][k] instanceof TypeToken) && this.fields[i][j][0][k].length > 0) {
              for (let l = 0; l < this.fields[i][j][0][k].length; l++) {
                if (this.fields[i][j][0][k][l] instanceof IdentifierToken) {
                  var x = this.fields[i][j][0][k][l]
                  struct[this.fields[i][j][0][k][l].identifier] = type
                }
              }
            }
          }
        }
      }
    }
    */
    return new StructType(struct)
  }
}