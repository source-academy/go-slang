import parser from './compiler/parser'
import { SourceFileTokens, TokenLocation } from './compiler/tokens'
import { Instruction } from './executor/instructions'
import { StateInfo } from './runtime/debugger'
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

interface CompileData {
  output?: string
  instructions: Instruction[]
  symbols: (TokenLocation | null)[]
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
  let tokens: SourceFileTokens

  // this function is written by ChatGPT:
  // https://chatgpt.com/share/67bdd28d-454c-800f-8213-16fd7d6fbee1
  function insertSemicolons(input: string) {
    let output = ''
    let insideStructOrArray = false
    let insideFunction = false
    const lines = input.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect function definitions (e.g., `func foo() {`)
      if (line.match(/^func\s+[A-Za-z_][A-Za-z0-9_]*\s*\(.*\)\s*\{$/)) {
        insideFunction = true
      }

      // Detect struct, slice, or array literals (e.g., `Person {`, `[]int {`, `[...]int {`)
      if (
        !insideFunction &&
        line.match(/^(\.\.\.|[A-Za-z_\[\]])+[A-Za-z0-9_\[\]]*\s*\{$/)
      ) {
        insideStructOrArray = true
      }

      // Add semicolon if it's a statement and not inside a struct/array/slice
      if (!insideStructOrArray && line.match(/.*[a-zA-Z0-9_)}\-\+"]$/)) {
        output += line + ';\n'
      } else {
        output += line + '\n'
      }
    }
    return output
  }
  const code = insertSemicolons(source_code)
  try {
    tokens = parser.parse(code) as SourceFileTokens
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

export { type CompileData, type InstructionData, type ProgramData, runCode }
