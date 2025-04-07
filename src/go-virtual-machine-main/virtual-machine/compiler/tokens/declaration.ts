import { Compiler } from '../../executor'
import {
  CallInstruction,
  Instruction,
  LoadVariableInstruction,
  StoreInstruction,
} from '../../executor/instructions'
import { Type } from '../../executor/typing'
import { ArrayType } from '../../executor/typing/array_type'
import { DeclaredType } from '../../executor/typing/declared_type'
import { NoType } from '../../executor/typing/no_type'
import { PointerType } from '../../executor/typing/pointer_type'
import { ReturnType } from '../../executor/typing/return_type'
import { StructType } from '../../executor/typing/struct_type'

import { Token, TokenLocation } from './base'
import { ExpressionToken, PrimaryExpressionToken } from './expressions'
import { IdentifierToken } from './identifier'
import { ArrayLiteralToken, FunctionLiteralToken } from './literals'
import { StructTypeToken, TypeToken } from './type'

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

export class TypeDeclarationToken extends DeclarationToken {
  constructor(
    sourceLocation: TokenLocation,
    public identifier: IdentifierToken,
    public varType: TypeToken,
  ) {
    super('type_declaration', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    // bind varType to identifier
    const { identifier, varType } = this
    if (identifier === undefined && varType === undefined) {
      //! TODO (P5): Golang implements this as a syntax error. Unfortunately, our current parsing
      //! is unable to detect this error. A correct parser should require one of them to be present.
      throw Error(
        'Either type(s) or name assignment(s) must be defined in type declaration.',
      )
    }
    compiler.context.env.declare_type(
      identifier.identifier,
      varType.compile(compiler),
    )
    const expectedType = varType ? varType.compile(compiler) : undefined
    compiler.type_environment.addType(
      identifier.identifier,
      expectedType as Type,
    )
    return new NoType()
  }
}

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
      // TODO: Modify to recognise multiple return values from function calls
      if (identifiers.length !== expressions.length) {
        throw Error(
          `Assignment mismatch: ${identifiers.length} variable(s) but ${expressions.length} value(s).`,
        )
      }
        */
      let delta = 0
      for (let i = 0; i < expressions.length; i++) {
        const start = compiler.instructions.length
        const expressionTypes = expressions[i].compile(compiler)
        const identifier = identifiers[i + delta].identifier
        if (expressionTypes instanceof ReturnType) {
          delta += handleReturnType(
            compiler,
            expressionTypes,
            identifiers,
            i,
            expectedType,
          )
        } else {
          const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
          if (
            expressionTypes instanceof ArrayType ||
            expressionTypes instanceof StructType ||
            (expressionTypes instanceof DeclaredType &&
              expressionTypes.type[0] instanceof StructType) ||
            (expressionTypes instanceof PointerType &&
              expressionTypes.type instanceof DeclaredType &&
              expressionTypes.type.type[0] instanceof StructType) ||
            (expressionTypes instanceof PointerType &&
              expressionTypes.type instanceof ArrayType)
          ) {
            // Since we are loading the "LoadVariableInstruction" while compiling arrays, structs
            // and pointers, at that time, we have no access to the identifier ("variable name"),
            // frame_idx and var_idx, so we have to modify those instructions to include the
            // variable name, frame_idx and var_idx
            for (let j = start; j < compiler.instructions.length; j++) {
              if (
                compiler.instructions[j] instanceof LoadVariableInstruction &&
                (compiler.instructions[j] as LoadVariableInstruction).id === ''
              ) {
                compiler.instructions[j] = new LoadVariableInstruction(
                  frame_idx,
                  var_idx,
                  identifier,
                )
              }
            }
          }
          if (
            expectedType &&
            !expectedType.assignableBy(expressionTypes as Type)
          ) {
            throw Error(
              `Cannot use ${expressionTypes} as ${expectedType} in variable declaration`,
            )
          }
          compiler.type_environment.addType(identifier, expressionTypes as Type)
          if (
            (expressionTypes instanceof ArrayType &&
              expressions[0] instanceof PrimaryExpressionToken &&
              expressions[0].operand instanceof ArrayLiteralToken) ||
            expressionTypes instanceof StructType ||
            (expressionTypes instanceof DeclaredType &&
              expressionTypes.type[0] instanceof StructType)
          ) {
            // instruction correction for array literals and structs to load and store it
            // again, just to decouple the instructions from nested structs/multi-dimensional arrays
            this.pushInstruction(
              compiler,
              new LoadVariableInstruction(frame_idx, var_idx, identifier),
            )
          } else if (
            expressionTypes instanceof PointerType &&
            (expressionTypes.type instanceof ArrayType ||
              (expressionTypes.type instanceof DeclaredType &&
                expressionTypes.type.type[0] instanceof StructType))
          ) {
            // instruction correction for pointers of arrays and structs, since pointers
            // come with a unary instruction, we move LoadVariableInstruction to be before
            // the UnaryInstruction that retrieves the pointer
            compiler.instructions[compiler.instructions.length - 2] =
              new LoadVariableInstruction(frame_idx, var_idx, identifier)
            compiler.instructions.pop()
          }
          this.pushInstruction(
            compiler,
            new LoadVariableInstruction(frame_idx, var_idx, identifier),
          )
          this.pushInstruction(compiler, new StoreInstruction())
        }
      }
      if (expressions instanceof StructTypeToken) {
        // register the whole struct as a type on its own
        const expressionTypes = expressions.compile(compiler)
        for (let i = 0; i < identifiers.length; i++) {
          compiler.type_environment.addType(
            identifiers[i].identifier,
            expressionTypes,
          )
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

    let expectedType = varType ? varType.compile(compiler) : undefined

    // Compile and add identifiers to type environment.
    if (expressions) {
      /*
      // TODO: Modify to recognise multiple return values from function calls
      if (identifiers.length !== expressions.length) {
        throw Error(
          `Assignment mismatch: ${identifiers.length} variable(s) but ${expressions.length} value(s).`,
        )
      }
        */
      let delta = 0
      for (let i = 0; i < expressions.length; i++) {
        const start = compiler.instructions.length
        let expressionTypes = expressions[i].compile(compiler)
        const identifier = identifiers[i + delta].identifier
        if (expressionTypes instanceof ReturnType) {
          delta += handleReturnType(
            compiler,
            expressionTypes,
            identifiers,
            i,
            expectedType,
          )
        } else {
          const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
          if (
            expressionTypes instanceof ArrayType ||
            (expressionTypes instanceof DeclaredType &&
              expressionTypes.type[0] instanceof StructType)
          ) {
            for (let j = start; j < compiler.instructions.length; j++) {
              if (
                compiler.instructions[j] instanceof LoadVariableInstruction &&
                (compiler.instructions[j] as LoadVariableInstruction).id === ''
              ) {
                compiler.instructions[j] = new LoadVariableInstruction(
                  frame_idx,
                  var_idx,
                  identifier,
                )
              }
            }
          }
          // varType is the type of the variable to be declared
          if (expectedType instanceof DeclaredType) {
            // change the type of literal values, not the declared variable
            let actualType = expectedType.name
            let nextType = compiler.context.env.find_type(actualType)[0]
            while (nextType instanceof DeclaredType) {
              actualType = nextType.name
              nextType = compiler.context.env.find_type(actualType)[0]
            }
            if (
              expressions[i] instanceof PrimaryExpressionToken &&
              (expressions[i] as PrimaryExpressionToken).operand.type ===
                'literal'
            ) {
              if (nextType.assignableBy(expressionTypes as Type)) {
                expressionTypes = expectedType as Type
              }
            } else if (nextType instanceof PointerType) {
              expectedType = nextType
            }
          }

          if (
            expectedType &&
            !expectedType.assignableBy(expressionTypes as Type)
          ) {
            throw Error(
              `Cannot use ${expressionTypes} as ${expectedType} in variable declaration`,
            )
          }
          compiler.type_environment.addType(identifier, expressionTypes as Type)
          if (
            !(expressionTypes instanceof ArrayType) &&
            !(
              expressionTypes instanceof DeclaredType &&
              expressionTypes.type[0] instanceof StructType
            )
          ) {
            // instruction correction for arrays and structs
            this.pushInstruction(
              compiler,
              new LoadVariableInstruction(frame_idx, var_idx, identifier),
            )
            this.pushInstruction(compiler, new StoreInstruction())
          }
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

// Handles the case where the expressionTypes are from return values
// It is abstracted to reduce duplicate code
function handleReturnType(
  compiler: Compiler,
  expressionTypes: ReturnType,
  identifiers: IdentifierToken[],
  i: number,
  expectedType: Type | undefined,
): number {
  for (let j = 0; j < expressionTypes.types.length; j++) {
    const identifier = identifiers[i + j].identifier
    const [frame_idx, var_idx] = compiler.context.env.find_var(identifier)
    if (expectedType && !expectedType.assignableBy(expressionTypes.types[j])) {
      throw Error(
        `Cannot use ${expressionTypes.types[j]} as ${expectedType} in variable declaration`,
      )
    }
    compiler.type_environment.addType(identifier, expressionTypes.types[j])
    compiler.instructions.push(
      new LoadVariableInstruction(frame_idx, var_idx, identifier),
    )
    compiler.instructions.push(new StoreInstruction())
  }

  // as the return values are loaded onto OS and thus popped in reverse order,
  // storing them into variables should be in reverse order
  // it is impossible to change how return values are loaded onto OS
  // as it will conflict with other instructions such as binops.
  const reverse_instructions = []
  for (let j = 0; j < expressionTypes.types.length; j++) {
    compiler.instructions.pop() // store instruction gets popped
    const instructionSet = []
    let a = 0
    let next = compiler.instructions.pop()
    while (
      !(next instanceof StoreInstruction || next instanceof CallInstruction)
    ) {
      instructionSet[a] = next // load and intermediate instructions get popped
      a++
      next = compiler.instructions.pop()
    }
    compiler.instructions.push(next)
    reverse_instructions[j] = instructionSet
  }
  for (let j = 0; j < expressionTypes.types.length; j++) {
    for (let k = reverse_instructions[j].length - 1; k >= 0; k--) {
      compiler.instructions.push(reverse_instructions[j][k] as Instruction)
    }
    compiler.instructions.push(new StoreInstruction())
  }
  return expressionTypes.types.length - 1
}
