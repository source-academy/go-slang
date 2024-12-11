import { Instruction } from './executor/instructions'
import { StateInfo } from './runtime/debugger'
import parser from './compiler/parser'
import { SourceFileToken, TokenLocation } from './compiler/tokens'
import { compile_tokens, CompileError } from './executor'
import { execute_instructions } from './runtime'

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
  deterministic = true,
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
      output: message,
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
      output: message,
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
    deterministic,
    visualisation,
  )
  if (result.errorMessage) {
    console.warn(result.errorMessage)
    return {
      instructions: [],
      output: result.errorMessage,
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
