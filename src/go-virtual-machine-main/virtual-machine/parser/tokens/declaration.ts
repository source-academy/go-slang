import { env } from 'process'
import { Compiler } from '../../compiler'
import {
  Instruction,
  LoadVariableInstruction,
  StoreInstruction,
} from '../../compiler/instructions'
import { NoType, ReturnType, Type } from '../../compiler/typing'

import { Token, TokenLocation } from './base'
import { ExpressionToken, PrimaryExpressionModifierToken, PrimaryExpressionToken } from './expressions'
import { IdentifierToken } from './identifier'
import { FunctionLiteralToken } from './literals'
import { TypeToken } from './type'

export type TopLevelDeclarationToken =
  | DeclarationToken
  | FunctionDeclarationToken

export class FunctionDeclarationToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public name: IdentifierToken,
    public func: FunctionLiteralToken,
  ) {
    super('function_declaration', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const [frame_idx, var_idx] = compiler.context.env.declare_var(
      this.name.identifier,
    )
    //! TODO (P5): There is a double compilation of func.signature, once here and
    //! once in the func.compile() call. Not really an issue as compiling types has
    //! no side effects, but would be nice to fix.
    compiler.type_environment.addType(
      this.name.identifier,
      this.func.signature.compile(compiler),
    )
    this.func.compile(compiler)
    this.pushInstruction(
      compiler,
      new LoadVariableInstruction(frame_idx, var_idx, this.name.identifier),
    )
    this.pushInstruction(compiler, new StoreInstruction())
    return new NoType()
  }
}

export abstract class DeclarationToken extends Token {}

export class ShortVariableDeclarationToken extends DeclarationToken {
  constructor(
    sourceLocation: TokenLocation,
    public identifiers: IdentifierToken[],
    // Note: A variable declaration must have at least one of varType / expressions.
    public varType?: TypeToken,
    public expressions?: ExpressionToken[],
  ) {
    super('short_variable_declaration', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const { identifiers, varType, expressions } = this
    if (varType === undefined && expressions === undefined) {
      //! TODO (P5): Golang implements this as a syntax error. Unfortunately, our current parsing
      //! is unable to detect this error. A correct parser should require one of them to be present.
      throw Error(
        'Either variable type or assignment value(s) must be defined in variable declaration.',
      )
    }

    // Add identifiers to environment.
    for (const identifier of identifiers) {
      compiler.context.env.declare_var(identifier.identifier)
    }

    const expectedType = varType ? varType.compile(compiler) : undefined

    // Compile and add identifiers to type environment.
    if (expressions) {
      /*
      if (identifiers.length !== expressions.length) {
        throw Error(
          `Assignment mismatch: ${identifiers.length} variable(s) but ${expressions.length} value(s).`,
        )
      }
        */
      let delta = 0
      for (let i = 0; i < expressions.length; i++) {
        const expressionTypes = expressions[i].compile(compiler)
        let identifier = identifiers[i + delta].identifier
        if (expressionTypes instanceof ReturnType) {
            for (let j = 0; j < expressionTypes.types.length; j++) {
              identifier = identifiers[i + j].identifier
              const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
              if (expectedType && !expectedType.assignableBy(expressionTypes.types[j])) {
                throw Error(
                  `Cannot use ${expressionTypes.types[j]} as ${expectedType} in variable declaration`,
                )
              }
              compiler.type_environment.addType(identifier, expressionTypes.types[j])
              this.pushInstruction(
                compiler,
                new LoadVariableInstruction(frame_idx, var_idx, identifier),
              )
              this.pushInstruction(compiler, new StoreInstruction())
            }
            delta += expressionTypes.types.length - 1

            // as the return values are loaded onto OS and thus popped in reverse order,
            // storing them into variables should be in reverse order
            // it is impossible to change how return values are loaded onto OS
            // as it will conflict with other instructions such as binops.
            let reverse_instructions = []
            for (let j = 0; j < expressionTypes.types.length; j++) {
              compiler.instructions.pop() // store instruction gets popped
              reverse_instructions[j] = compiler.instructions.pop() // load instruction gets popped
            }

            for (let j = 0; j < expressionTypes.types.length; j++) {
              this.pushInstruction(compiler, reverse_instructions[j] as Instruction)
              this.pushInstruction(compiler, new StoreInstruction())
            }
        }
        else {
          const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
          if (expectedType && !expectedType.assignableBy(expressionTypes)) {
            throw Error(
              `Cannot use ${expressionTypes} as ${expectedType} in variable declaration`,
            )
          }
          compiler.type_environment.addType(identifier, expressionTypes)
          this.pushInstruction(
            compiler,
            new LoadVariableInstruction(frame_idx, var_idx, identifier),
          )
          this.pushInstruction(compiler, new StoreInstruction())
        }
      }
    } else {
      // Variables are uninitialized, but their type is given.
      for (const identifier of identifiers) {
        compiler.type_environment.addType(
          identifier.identifier,
          expectedType as Type,
        )
      }
    }
    return new NoType()
  }
}

export class VariableDeclarationToken extends DeclarationToken {
  constructor(
    sourceLocation: TokenLocation,
    public identifiers: IdentifierToken[],
    // Note: A variable declaration must have at least one of varType / expressions.
    public varType?: TypeToken,
    public expressions?: ExpressionToken[],
  ) {
    super('variable_declaration', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const { identifiers, varType, expressions } = this
    if (varType === undefined && expressions === undefined) {
      //! TODO (P5): Golang implements this as a syntax error. Unfortunately, our current parsing
      //! is unable to detect this error. A correct parser should require one of them to be present.
      throw Error(
        'Either variable type or assignment value(s) must be defined in variable declaration.',
      )
    }

    // Add identifiers to environment.
    for (const identifier of identifiers) {
      compiler.context.env.declare_var(identifier.identifier)
    }

    const expectedType = varType ? varType.compile(compiler) : undefined

    // Compile and add identifiers to type environment.
    if (expressions) {
      /*
      if (identifiers.length !== expressions.length) {
        throw Error(
          `Assignment mismatch: ${identifiers.length} variable(s) but ${expressions.length} value(s).`,
        )
      }
        */
      let delta = 0
      for (let i = 0; i < expressions.length; i++) {
        const expressionTypes = expressions[i].compile(compiler)
        let identifier = identifiers[i + delta].identifier
        if (expressionTypes instanceof ReturnType) {
            for (let j = 0; j < expressionTypes.types.length; j++) {
              identifier = identifiers[i + j].identifier
              const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
              if (expectedType && !expectedType.assignableBy(expressionTypes.types[j])) {
                throw Error(
                  `Cannot use ${expressionTypes.types[j]} as ${expectedType} in variable declaration`,
                )
              }
              compiler.type_environment.addType(identifier, expressionTypes.types[j])
              this.pushInstruction(
                compiler,
                new LoadVariableInstruction(frame_idx, var_idx, identifier),
              )
              this.pushInstruction(compiler, new StoreInstruction())
            }
            delta += expressionTypes.types.length - 1

            // as the return values are loaded onto OS and thus popped in reverse order,
            // storing them into variables should be in reverse order
            // it is impossible to change how return values are loaded onto OS
            // as it will conflict with other instructions such as binops.
            let reverse_instructions = []
            for (let j = 0; j < expressionTypes.types.length; j++) {
              compiler.instructions.pop() // store instruction gets popped
              reverse_instructions[j] = compiler.instructions.pop() // load instruction gets popped
            }

            for (let j = 0; j < expressionTypes.types.length; j++) {
              this.pushInstruction(compiler, reverse_instructions[j] as Instruction)
              this.pushInstruction(compiler, new StoreInstruction())
            }
        }
        else {
          const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
          if (expectedType && !expectedType.assignableBy(expressionTypes)) {
            throw Error(
              `Cannot use ${expressionTypes} as ${expectedType} in variable declaration`,
            )
          }
          compiler.type_environment.addType(identifier, expressionTypes)
          this.pushInstruction(
            compiler,
            new LoadVariableInstruction(frame_idx, var_idx, identifier),
          )
          this.pushInstruction(compiler, new StoreInstruction())
        }
      }
    } else {
      // Variables are uninitialized, but their type is given.
      for (const identifier of identifiers) {
        compiler.type_environment.addType(
          identifier.identifier,
          expectedType as Type,
        )
      }
    }
    return new NoType()
  }
}

export class ConstantDeclarationToken extends DeclarationToken {
  constructor(
    sourceLocation: TokenLocation,
    public identifiers: IdentifierToken[],
    public expressions: ExpressionToken[],
    public varType?: TypeToken,
  ) {
    super('const_declaration', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    /**
     * TODO: Handle Const separately, several different methods
     *  1. Runtime Const and const tag to variable to make it immutable
     *  2. Compile Time Const: Replace each reference to variable with Expression Token
     *  3. Compile Time Const: Evaluate Expression Token literal value and replace each reference (Golang only allow compile time const)
     */
    const { identifiers, varType, expressions } = this
    const expectedType = varType ? varType.compile(compiler) : undefined
    for (let i = 0; i < identifiers.length; i++) {
      const var_name = identifiers[i].identifier
      const expr = expressions[i]
      const [frame_idx, var_idx] = compiler.context.env.declare_var(var_name)
      const expressionType = expr.compile(compiler)
      if (expectedType && !expressionType.assignableBy(expectedType)) {
        throw Error(
          `Cannot use ${expressionType} as ${expectedType} in constant declaration`,
        )
      }
      compiler.type_environment.addType(var_name, expressionType)
      this.pushInstruction(
        compiler,
        new LoadVariableInstruction(frame_idx, var_idx, var_name),
      )
      this.pushInstruction(compiler, new StoreInstruction())
    }
    return new NoType()
  }
}
