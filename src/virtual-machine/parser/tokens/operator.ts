import { Compiler } from '../../compiler'
import {
  BinaryInstruction,
  LoadChannelReqInstruction,
  LoadDefaultInstruction,
  TryChannelReqInstruction,
  UnaryInstruction,
} from '../../compiler/instructions'
import { BoolType, ChannelType, Type } from '../../compiler/typing'

import { Token, TokenLocation } from './base'

abstract class Operator extends Token {
  name: string
  children: Token[]

  constructor(
    type: string,
    sourceLocation: TokenLocation,
    name: string,
    children: Token[],
  ) {
    super(type, sourceLocation)
    this.name = name
    this.children = children
  }
}

export class UnaryOperator extends Operator {
  constructor(sourceLocation: TokenLocation, name: string, child: Token) {
    super('unary_operator', sourceLocation, name, [child])
  }

  /** Returns a function that can be applied on its child token to create a UnaryOperator. */
  static fromSource(sourceLocation: TokenLocation, name: string) {
    return (child: Token) => {
      return new UnaryOperator(sourceLocation, name, child)
    }
  }

  override compileUnchecked(compiler: Compiler): Type {
    const expressionType = this.children[0].compile(compiler)
    if (this.name === 'receive') {
      if (!(expressionType instanceof ChannelType))
        throw Error('Receive Expression not chan')
      const recvType = expressionType.element
      this.pushInstruction(compiler, new LoadDefaultInstruction(recvType))
      this.pushInstruction(
        compiler,
        new LoadChannelReqInstruction(true, compiler.instructions.length + 2),
      )
      this.pushInstruction(compiler, new TryChannelReqInstruction())
      return recvType
    } else {
      this.pushInstruction(compiler, new UnaryInstruction(this.name))
      return expressionType
    }
  }
}

export class BinaryOperator extends Operator {
  constructor(
    sourceLocation: TokenLocation,
    name: string,
    left: Token,
    right: Token,
  ) {
    super('binary_operator', sourceLocation, name, [left, right])
  }

  /** Returns a function that can be applied on its children tokens to create a BinaryOperator. */
  static fromSource(sourceLocation: TokenLocation, name: string) {
    return (left: Token, right: Token) => {
      return new BinaryOperator(sourceLocation, name, left, right)
    }
  }

  override compileUnchecked(compiler: Compiler): Type {
    const leftType = this.children[0].compile(compiler)
    const rightType = this.children[1].compile(compiler)
    if (!leftType.equals(rightType)) {
      throw Error(
        `Invalid operation (mismatched types ${leftType} and ${rightType})`,
      )
    }
    this.pushInstruction(compiler, new BinaryInstruction(this.name))
    const logical_operators = [
      'equal',
      'not_equal',
      'less',
      'less_or_equal',
      'greater',
      'greater_or_equal',
      'conditional_or',
      'conditional_and',
    ]
    return logical_operators.includes(this.name) ? new BoolType() : leftType
  }
}
