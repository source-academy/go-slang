import { Token, TokenLocation } from '../compiler/tokens'

import { TypeEnvironment } from './typing/type_environment'
import { CompileContext } from './environment'
import { DoneInstruction, Instruction, LoadVariableInstruction, NoInstruction, StoreArrayElementInstruction, StoreStructFieldInstruction, UnaryInstruction } from './instructions'

export class CompileError extends Error {
  constructor(message: string, public sourceLocation: TokenLocation) {
    super(message)
  }
}

export class Compiler {
  instructions: Instruction[] = []
  symbols: (TokenLocation | null)[] = []
  context = new CompileContext()
  type_environment = new TypeEnvironment()

  compile_program(token: Token) {
    token.compile(this)
    this.instructions.push(new DoneInstruction())
    for (let i = 2; i < this.instructions.length; i++) {
      if (
        this.instructions[i] instanceof UnaryInstruction
          && (this.instructions[i] as UnaryInstruction).op === "address"
      ) {
        // handle the specific case of array/struct declared directly as pointer
        // if struct or array is not to be popped from OS after StoreArrayElement/StoreStructField,
        // we have to remove the additional LoadVariableInstruction
        if (this.instructions[i - 1] instanceof LoadVariableInstruction
          && (
            (
              this.instructions[i - 2] instanceof StoreArrayElementInstruction
              && !(this.instructions[i - 2] as StoreArrayElementInstruction).toPop
            ) || (
              this.instructions[i - 2] instanceof StoreStructFieldInstruction
              && !(this.instructions[i - 2] as StoreStructFieldInstruction).toPop
            )
          )
        ) {
          // since it will affect the pc counters for some instructions,
          // we simply "no-op" them
          this.instructions[i - 1] = new NoInstruction()
        }
      }
    }
  }

  throwCompileError(message: string, sourceLocation: TokenLocation): never {
    throw new CompileError(message, sourceLocation)
  }
}

const compile_tokens = (tokens: Token) => {
  const compiler = new Compiler()
  compiler.compile_program(tokens)
  return {
    instructions: compiler.instructions,
    symbols: compiler.symbols,
  }
}

export { compile_tokens }
