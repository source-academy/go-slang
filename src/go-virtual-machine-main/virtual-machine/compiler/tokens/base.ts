import { CompileError, Compiler } from '../../executor'
import { Instruction } from '../../executor/instructions'
import { Type } from '../../executor/typing'

export type TokenLocation = {
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

export abstract class Token {
  constructor(public type: string, public sourceLocation: TokenLocation) {}

  abstract compileUnchecked(compiler: Compiler): Type

  pushInstruction(compiler: Compiler, ...instr: Instruction[]) {
    compiler.instructions.push(...instr)
    compiler.symbols.push(...Array(instr.length).fill(this.sourceLocation))
  }

  compile(compiler: Compiler): Type {
    try {
      return this.compileUnchecked(compiler)
    } catch (err) {
      if (err instanceof CompileError) throw err

      // Error originated from this token.
      compiler.throwCompileError((err as Error).message, this.sourceLocation)
    }
  }
}
