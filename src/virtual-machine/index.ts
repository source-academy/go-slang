import { Instruction } from './compiler/instructions'
import { StateInfo } from './executor/debugger'
import parser from './parser/parser'
import { SourceFileToken, TokenLocation } from './parser/tokens'
import { compile_tokens, CompileError } from './compiler'
import { execute_instructions } from './executor'

interface InstructionData {
  val: string
}

interface ProgramData {
  output?: string
  instructions: InstructionData[]
  error?: {
    message: string
    type: 'parse' | 'compile' | 'runtime'
    details?: Error | string
  }
  visualData: StateInfo[]
}

const runCode = (
  source_code: string,
  heapsize: number,
  visualisation = true,
): ProgramData => {
  // Parsing.
  let tokens: SourceFileToken
  try {
    tokens = parser.parse(source_code) as SourceFileToken
    console.log(tokens)
  } catch (err) {
    const message = (err as Error).message
    return {
      instructions: [],
      output: 'Syntax Error!',
      error: {
        message,
        type: 'parse',
        details: err as string,
      },
      visualData: [],
    }
  }

  // Compilation.
  let instructions: Instruction[] = []
  let symbols: (TokenLocation | null)[] = []
  try {
    const temp = compile_tokens(tokens)
    instructions = temp.instructions
    symbols = temp.symbols
    console.log(instructions)
  } catch (err) {
    const message = (err as CompileError).message
    return {
      instructions: [],
      output: 'Compilation Error!',
      error: {
        message,
        type: 'compile',
        details: err as CompileError,
      },
      visualData: [],
    }
  }

  // Execution.
  const result = execute_instructions(
    instructions,
    heapsize,
    symbols,
    visualisation,
  )
  if (result.errorMessage) {
    console.warn(result.errorMessage)
    return {
      instructions: [],
      output: 'Runtime Error!',
      error: {
        message: result.errorMessage,
        type: 'runtime',
        details: result.errorMessage,
      },
      visualData: [],
    }
  }

  return {
    instructions: [],
    output: result.stdout,
    visualData: result.visual_data,
    error: undefined,
  }
}

export { type InstructionData, type ProgramData, runCode }
