import { Compiler } from '../../compiler'
import {
  BinaryInstruction,
  BlockInstruction,
  CallInstruction,
  DeferredCallInstruction,
  DoneInstruction,
  ExitBlockInstruction,
  ForkInstruction,
  LoadChannelReqInstruction,
  LoadConstantInstruction,
  PopInstruction,
  ReturnInstruction,
  SelectInstruction,
  StoreInstruction,
  TryChannelReqInstruction,
} from '../../compiler/instructions'
import {
  ExitLoopInstruction,
  JumpIfFalseInstruction,
  JumpInstruction,
} from '../../compiler/instructions/control'
import {
  BoolType,
  ChannelType,
  Int64Type,
  NoType,
  ReturnType,
  Type,
} from '../../compiler/typing'

import { Token, TokenLocation } from './base'
import { BlockToken } from './block'
import { DeclarationToken, ShortVariableDeclarationToken } from './declaration'
import {
  CallToken,
  EmptyExpressionToken,
  ExpressionToken,
  PrimaryExpressionToken,
} from './expressions'
import { IdentifierToken } from './identifier'
import { UnaryOperator } from './operator'

export type StatementToken =
  | DeclarationToken
  | SimpleStatementToken
  | GoStatementToken
  | ReturnStatementToken
  | BreakStatementToken
  | ContinueStatementToken
  | FallthroughStatementToken
  | BlockToken
  | IfStatementToken
  | SwitchStatementToken
  | SelectStatementToken
  | ForStatementToken
  | DeferStatementToken

export type SimpleStatementToken =
  | ExpressionStatementToken
  | SendStatementToken
  | IncDecStatementToken
  | AssignmentStatementToken
  | ShortVariableDeclarationToken

export class AssignmentStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public left: ExpressionToken[],
    public operation: '=' | '+=' | '*=',
    public right: ExpressionToken[],
  ) {
    super('assignment', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    // TODO: Custom Instructions to avoid recalculation?
    for (let i = 0; i < this.left.length; i++) {
      const left = this.left[i]
      const right = this.right[i]
      let assignType: Type
      if (this.operation === '+=') {
        const leftType = left.compile(compiler)
        const rightType = right.compile(compiler)
        if (!leftType.equals(rightType)) {
          throw Error(
            `Invalid operation (mismatched types ${leftType} and ${rightType})`,
          )
        }
        assignType = leftType
        this.pushInstruction(compiler, new BinaryInstruction('sum'))
      } else if (this.operation === '*=') {
        const leftType = left.compile(compiler)
        const rightType = right.compile(compiler)
        if (!leftType.equals(rightType)) {
          throw Error(
            `Invalid operation (mismatched types ${leftType} and ${rightType})`,
          )
        }
        assignType = leftType
        this.pushInstruction(compiler, new BinaryInstruction('product'))
      } else if (this.operation === '=') {
        assignType = right.compile(compiler)
      } else {
        throw Error('Unimplemented')
      }
      const varType = left.compile(compiler)
      if (!varType.assignableBy(assignType)) {
        throw Error(`Cannot use ${assignType} as ${varType} in assignment`)
      }
      this.pushInstruction(compiler, new StoreInstruction())
    }
    return new NoType()
  }
}

export class IncDecStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public expression: ExpressionToken,
    public operation: '++' | '--',
  ) {
    super('inc_dec', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    // TODO: Custom Instructions to avoid recalculation?
    this.expression.compile(compiler)
    this.pushInstruction(
      compiler,
      new LoadConstantInstruction(1, new Int64Type()),
    )
    if (this.operation === '++') {
      this.pushInstruction(compiler, new BinaryInstruction('sum'))
    } else if (this.operation === '--') {
      this.pushInstruction(compiler, new BinaryInstruction('difference'))
    }
    this.expression.compile(compiler)
    this.pushInstruction(compiler, new StoreInstruction())
    return new NoType()
  }
}

export class ReturnStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public returns?: ExpressionToken[],
  ) {
    super('return', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const returnType = new ReturnType(
      (this.returns ?? []).map((expr) => expr.compile(compiler)),
    )

    if (
      returnType.types.length >
      compiler.type_environment.expectedReturn.types.length
    ) {
      throw new Error(
        `Too many return values\nhave ${returnType}\nwant ${compiler.type_environment.expectedReturn}`,
      )
    }

    if (!returnType.equals(compiler.type_environment.expectedReturn)) {
      throw new Error(
        `Cannot use ${returnType} as ${compiler.type_environment.expectedReturn} value in return statement.`,
      )
    }

    this.pushInstruction(compiler, new ReturnInstruction())
    return returnType
  }
}

export class BreakStatementToken extends Token {
  constructor(sourceLocation: TokenLocation) {
    super('break', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const jumpInstr = new ExitLoopInstruction()
    compiler.context.add_break(jumpInstr)
    this.pushInstruction(compiler, jumpInstr)
    return new NoType()
  }
}

export class ContinueStatementToken extends Token {
  constructor(sourceLocation: TokenLocation) {
    super('continue', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const jumpInstr = new ExitLoopInstruction()
    compiler.context.add_continue(jumpInstr)
    this.pushInstruction(compiler, jumpInstr)
    return new NoType()
  }
}

export class FallthroughStatementToken extends Token {
  constructor(sourceLocation: TokenLocation) {
    super('fallthrough', sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    // TODO: Implement
    return new NoType()
  }
}

export class IfStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    /** Executed before the predicate (e.g. if x := 0; x < 1 {} ) */
    public initialization: SimpleStatementToken | null,
    public predicate: ExpressionToken,
    public consequent: BlockToken,
    public alternative: IfStatementToken | BlockToken | null,
  ) {
    super('if', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    compiler.context.push_env()
    const block_instr = new BlockInstruction('IF BLOCK')
    this.pushInstruction(compiler, block_instr)
    compiler.type_environment = compiler.type_environment.extend()
    // Initialisation
    if (this.initialization) this.initialization.compile(compiler)

    // Eval Predicate
    const predicateType = this.predicate.compile(compiler)
    if (!(predicateType instanceof BoolType)) {
      throw new Error(`Non-boolean condition in if statement.`)
    }
    // If False jump to alternative / end
    const jumpToAlternative = new JumpIfFalseInstruction()

    // Consequent Block
    this.pushInstruction(compiler, jumpToAlternative)
    this.consequent.name = 'IF BODY'
    const consequentType = this.consequent.compile(compiler)
    const jumpToEnd = new JumpInstruction()
    this.pushInstruction(compiler, jumpToEnd)

    // Alternative Block
    jumpToAlternative.set_addr(compiler.instructions.length)
    // AlternativeType defaults to the expected return type, so that if there is no alternative,
    // we simply treat the consequent type as the type of the whole if statement.
    let alternativeType: Type = compiler.type_environment.expectedReturn
    if (this.alternative) {
      if (this.alternative instanceof BlockInstruction)
        this.alternative.name = 'IF BODY'
      alternativeType = this.alternative.compile(compiler)
    }
    jumpToEnd.set_addr(compiler.instructions.length)

    this.pushInstruction(compiler, new ExitBlockInstruction())
    const vars = compiler.context.env.get_frame()
    block_instr.set_frame(
      vars.map((name) => compiler.type_environment.get(name)),
    )
    block_instr.set_identifiers(vars)
    compiler.type_environment = compiler.type_environment.pop()
    compiler.context.pop_env()

    if (
      consequentType instanceof ReturnType &&
      alternativeType instanceof ReturnType
    ) {
      return consequentType
    }
    return new NoType()
  }
}

export class SwitchStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public init: SimpleStatementToken | null,
    public expressions: ExpressionToken | null,
    public cases: SwitchCaseToken[],
  ) {
    super('switch', sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    //! TODO: Implement.
    return new NoType()
  }
}

export class SwitchCaseToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public expressions: ExpressionToken[] | null,
    public statements: StatementToken[],
  ) {
    super('case', sourceLocation)
  }

  override compileUnchecked(_compiler: Compiler): Type {
    //! TODO: Implement.
    return new NoType()
  }
}

export class ForStatementToken extends Token {
  // There are 4 types of for loops:
  // 1. For statement that iterates the body repeatedly.
  // 2. For statements with a single condition.
  // 3. For statements with a for clause (init, condition, post).
  // 4. For statements with a range clause.
  //! Note that range clauses are not supported for now. They will likely be a seperate class.
  constructor(
    sourceLocation: TokenLocation,
    public initialization: SimpleStatementToken | null,
    public condition: ExpressionToken | null,
    public post: ExpressionToken | null,
    public body: BlockToken,
  ) {
    super('for', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    compiler.context.push_env()
    compiler.type_environment = compiler.type_environment.extend()
    const block_instr = new BlockInstruction('FOR INIT', true)
    this.pushInstruction(compiler, block_instr)
    compiler.context.push_loop()

    // Initialisation
    if (this.initialization) this.initialization.compile(compiler)
    const start_addr = compiler.instructions.length

    // Predicate
    const predicate_false = new JumpIfFalseInstruction()
    if (this.condition) {
      const predicateType = this.condition.compile(compiler)
      if (!(predicateType instanceof BoolType)) {
        throw new Error(`Non-boolean condition in for statement condition.`)
      }
      this.pushInstruction(compiler, predicate_false)
    }
    this.body.name = 'FOR BODY'
    const bodyType = this.body.compile(compiler)

    const pre_post_addr = compiler.instructions.length
    if (this.post) this.post.compile(compiler)
    this.pushInstruction(compiler, new JumpInstruction(start_addr))
    const post_post_addr = compiler.instructions.length
    predicate_false.set_addr(post_post_addr)

    compiler.context.pop_loop(pre_post_addr, post_post_addr)
    this.pushInstruction(compiler, new ExitBlockInstruction())
    const vars = compiler.context.env.get_frame()
    block_instr.set_frame(
      vars.map((name) => compiler.type_environment.get(name)),
    )
    block_instr.set_identifiers(vars)
    compiler.type_environment = compiler.type_environment.pop()
    compiler.context.pop_env()
    return bodyType
  }
}

export class DeferStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public expression: ExpressionToken,
  ) {
    super('defer', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    if (!this.isFunctionCall()) {
      throw new Error('Expression in defer must be function call.')
    }

    this.expression.compile(compiler)
    const call = compiler.instructions[compiler.instructions.length - 1]
    compiler.instructions[compiler.instructions.length - 1] =
      DeferredCallInstruction.fromCallInstruction(call as CallInstruction)

    return new NoType()
  }

  private isFunctionCall(): boolean {
    if (!(this.expression instanceof PrimaryExpressionToken)) return false
    const modifiers = this.expression.rest ?? []
    if (modifiers.length === 0) return false
    if (!(modifiers[modifiers.length - 1] instanceof CallToken)) return false
    return true
  }
}

export class GoStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public call: PrimaryExpressionToken,
  ) {
    super('go', sourceLocation)
  }

  /** Used in the parser to only parse function calls */
  static isValidGoroutine(expression: PrimaryExpressionToken) {
    return (
      expression.rest &&
      expression.rest.length > 0 &&
      expression.rest[expression.rest.length - 1] instanceof CallToken
    )
  }

  override compileUnchecked(compiler: Compiler): Type {
    const fork_instr = new ForkInstruction()
    this.pushInstruction(compiler, fork_instr)
    this.call.compile(compiler)
    this.pushInstruction(compiler, new DoneInstruction())
    fork_instr.set_addr(compiler.instructions.length)
    return new NoType()
  }
}

/** Sends a `value` into `channel`. */
export class SendStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public channel: IdentifierToken,
    public value: ExpressionToken,
  ) {
    super('send', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const chanType = this.channel.compile(compiler)
    if (!(chanType instanceof ChannelType))
      throw Error('Not instance of channel type')
    const argType = chanType.element
    const exprType = this.value.compile(compiler)
    if (!argType.assignableBy(exprType)) {
      throw Error(`Cannot use ${exprType} as ${argType} in assignment`)
    }
    if (!argType.equals(exprType)) throw Error('')
    this.pushInstruction(
      compiler,
      new LoadChannelReqInstruction(false, compiler.instructions.length + 2),
    )
    this.pushInstruction(compiler, new TryChannelReqInstruction())
    return new NoType()
  }
}

/** Receive and assign the results to one or two variables. Note that RecvStmt is NOT a SimpleStmt. */
export class ReceiveStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    /** Whether this is a shorthand variable declaration (else it is an assignment). */
    public declaration: boolean,
    public identifiers: IdentifierToken[] | null,
    /** expression is guarenteed to be a receive operator. */
    public expression: UnaryOperator,
  ) {
    super('receive', sourceLocation)
  }

  /** Used in the parser to only parse valid receive statements. */
  static isReceiveStatement(identifiers: IdentifierToken[] | null) {
    return (
      identifiers === null ||
      (identifiers.length > 0 && identifiers.length <= 2)
    )
  }

  override compileUnchecked(compiler: Compiler): Type {
    const chanType = this.expression.compile(compiler)
    return chanType
  }
}

export class SelectStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public clauses: CommunicationClauseToken[],
  ) {
    super('select', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    let default_case = false
    const end_jumps = []
    for (const clause of this.clauses) {
      if (clause.predicate === 'default') {
        if (default_case) throw Error('Multiple Default cases!')
        default_case = true
        continue
      }
      clause.compile(compiler)
      const jump_instr = new JumpInstruction()
      this.pushInstruction(compiler, jump_instr)
      end_jumps.push(jump_instr)
    }
    if (default_case) {
      for (const clause of this.clauses) {
        if (clause.predicate === 'default') {
          clause.compile(compiler)
          const jump_instr = new JumpInstruction()
          this.pushInstruction(compiler, jump_instr)
          end_jumps.push(jump_instr)
          break
        }
      }
    }
    this.pushInstruction(
      compiler,
      new SelectInstruction(
        this.clauses.length - (default_case ? 1 : 0),
        default_case,
      ),
    )
    for (const jump_instr of end_jumps)
      jump_instr.set_addr(compiler.instructions.length)

    return new NoType()
  }
}
export class CommunicationClauseToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public predicate: 'default' | SendStatementToken | ReceiveStatementToken,
    public body: StatementToken[],
  ) {
    super('communication_clause', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    if (!(this.predicate instanceof ReceiveStatementToken)) {
      if (this.predicate === 'default') {
        const load_instr = new LoadConstantInstruction(
          compiler.instructions.length + 2,
          new Int64Type(),
        )
        this.pushInstruction(compiler, load_instr)
      } else {
        // Is send statement
        this.predicate.compile(compiler)
        compiler.instructions.pop() // Removing blocking op
        compiler.symbols.pop()
      }
      const jump_instr = new JumpInstruction()
      this.pushInstruction(compiler, jump_instr)
      new BlockToken(this.sourceLocation, this.body, 'CASE BLOCK').compile(
        compiler,
      )
      jump_instr.set_addr(compiler.instructions.length + 1)
    } else {
      // This is recv statement
      const chanType = this.predicate.expression.compile(compiler)
      compiler.instructions.pop()
      compiler.symbols.pop()
      const jump_instr = new JumpInstruction()
      this.pushInstruction(compiler, jump_instr)
      if (this.predicate.identifiers) {
        if (this.predicate.declaration) {
          this.body.unshift(
            new ShortVariableDeclarationToken(
              this.sourceLocation,
              this.predicate.identifiers,
              [new EmptyExpressionToken(this.sourceLocation, chanType)],
            ),
          )
        } else {
          // !TODO: Hacky see if better way to implement this
          this.body.unshift(
            new AssignmentStatementToken(
              this.sourceLocation,
              [
                new PrimaryExpressionToken(
                  this.sourceLocation,
                  this.predicate.identifiers[0],
                  null,
                ),
              ],
              '=',
              [new EmptyExpressionToken(this.sourceLocation, chanType)],
            ),
          )
        }
      } else this.pushInstruction(compiler, new PopInstruction())
      new BlockToken(this.sourceLocation, this.body, 'CASE BLOCK').compile(
        compiler,
      )
      jump_instr.set_addr(compiler.instructions.length + 1)
    }
    return new NoType()
  }
}

/** An ExpressionStatement differs from an Expression: it should not leave a value on the OS. */
export class ExpressionStatementToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public expression: ExpressionToken,
  ) {
    super('expression_statement', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    this.expression.compile(compiler)
    this.pushInstruction(compiler, new PopInstruction())
    return new NoType()
  }
}
