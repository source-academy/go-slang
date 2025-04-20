import { Compiler } from '../../executor'
import {
  BlockInstruction,
  ExitBlockInstruction,
} from '../../executor/instructions'
import { Type } from '../../executor/typing'
import { NoType } from '../../executor/typing/no_type'
import { ReturnType } from '../../executor/typing/return_type'

import { Token, TokenLocation } from './base'
import { StatementToken } from './statement'

export class BlockToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public statements: StatementToken[],
    public name = 'BLOCK',
  ) {
    super('block', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    compiler.context.push_env()
    const block_instr = new BlockInstruction(this.name)
    this.pushInstruction(compiler, block_instr)
    compiler.type_environment = compiler.type_environment.extend()
    let hasReturn = false
    for (const sub_token of this.statements) {
      const statementType = sub_token.compile(compiler)
      hasReturn ||= statementType instanceof ReturnType
    }
    const blockType = hasReturn
      ? compiler.type_environment.expectedReturn
      : new NoType()

    const vars = compiler.context.env.get_frame()
    block_instr.set_frame(
      vars.map((name) => compiler.type_environment.get(name)),
    )
    block_instr.set_identifiers(vars)
    compiler.type_environment = compiler.type_environment.pop()
    compiler.context.pop_env()

    this.pushInstruction(compiler, new ExitBlockInstruction())

    return blockType
  }
}
