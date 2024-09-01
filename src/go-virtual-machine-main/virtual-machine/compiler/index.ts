import { Token, TokenLocation } from '../parser/tokens'

import { TypeEnvironment } from './typing/type_environment'
import { CompileContext } from './environment'
import { DoneInstruction, Instruction } from './instructions'

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
  }

  throwCompileError(message: string, sourceLocation: TokenLocation): never {
    throw new CompileError(message, sourceLocation)
  }
}

const compile_tokens = (token: Token) => {
  const compiler = new Compiler()
  compiler.compile_program(token)
  return {
    instructions: compiler.instructions,
    symbols: compiler.symbols,
  }
}

export { compile_tokens }
