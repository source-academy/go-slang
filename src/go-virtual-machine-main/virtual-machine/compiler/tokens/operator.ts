import { Compiler } from '../../executor'
import {
  BinaryInstruction,
  LoadChannelReqInstruction,
  LoadDefaultInstruction,
  LoadVariableInstruction,
  StoreArrayElementInstruction,
  StoreStructFieldInstruction,
  TryChannelReqInstruction,
  UnaryInstruction,
} from '../../executor/instructions'
import { Type } from '../../executor/typing'
import { BoolType } from '../../executor/typing/bool_type'
import { ChannelType } from '../../executor/typing/channel_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { PointerType } from '../../executor/typing/pointer_type'

import { Token, TokenLocation } from './base'
import { PrimaryExpressionToken } from './expressions'

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
      if (this.name === 'indirection') {
        if (!(expressionType instanceof PointerType)) {
          throw new Error('Cannot indirect a non-pointer')
        }
      } else if (this.name === 'address') {
        if (expressionType instanceof PointerType) {
          if (
            this.children[0] instanceof PrimaryExpressionToken &&
            this.children[0].operand instanceof UnaryOperator &&
            this.children[0].operand.name === 'address'
          ) {
            throw new Error('Cannot obtain address of a pointer')
          }
        }
      }
      if (
        compiler.instructions[compiler.instructions.length - 1] instanceof
          StoreStructFieldInstruction ||
        compiler.instructions[compiler.instructions.length - 1] instanceof
          StoreArrayElementInstruction
      ) {
        this.pushInstruction(compiler, new LoadVariableInstruction(0, 0, ''))
      }
      this.pushInstruction(compiler, new UnaryInstruction(this.name))
      if (this.name === 'address') {
        return new PointerType(expressionType)
      } else if (
        expressionType instanceof PointerType &&
        this.name === 'indirection'
      ) {
        return expressionType.type
      }
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
    // needs to find a way to determine whether to use lenient check (transitive check)
    // or strict check (declared types must match exactly even if they are transitive)
    let leftType = this.children[0].compile(compiler)
    let rightType = this.children[1].compile(compiler)
    // literals have unnamed types, so it can match a declared type
    if (
      this.children[0] instanceof PrimaryExpressionToken &&
      this.children[0].operand.type === 'literal' &&
      rightType instanceof DeclaredType
    ) {
      // LHS of the binop is a literal, make it match type of RHS
      let actualType = rightType
      let nextType = compiler.context.env.find_type(actualType.name)[0]
      while (nextType instanceof DeclaredType) {
        actualType = nextType
        nextType = compiler.context.env.find_type(actualType.name)[0]
      }
      if (nextType.assignableBy(leftType)) {
        leftType = rightType
      }
    } else if (
      this.children[1] instanceof PrimaryExpressionToken &&
      this.children[1].operand.type === 'literal' &&
      leftType instanceof DeclaredType
    ) {
      // RHS of the binop is a literal, make it match type of LHS
      let actualType = leftType
      let nextType = compiler.context.env.find_type(actualType.name)[0]
      while (nextType instanceof DeclaredType) {
        actualType = nextType
        nextType = compiler.context.env.find_type(actualType.name)[0]
      }
      if (nextType.assignableBy(rightType)) {
        rightType = leftType
      }
    }
    // special handling for literals to act as int or float
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
