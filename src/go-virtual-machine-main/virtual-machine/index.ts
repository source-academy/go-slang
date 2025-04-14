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
  // https://chatgpt.com/share/67fd2063-2c0c-800f-a830-8a1954add927
  function insertSemicolons(input: string) {
    // Tokens after which semicolons are auto-inserted in Go
  const autoInsertTokens = [
    /^[\*&]?[a-zA-Z_][a-zA-Z0-9_]*$/,        // identifiers including address and indirection
    /^[0-9]+$/,                              // integer literals
    /^[0-9]+\.[0-9]*$/,                      // float literals
    /^0x[0-9a-fA-F]+$/,                      // hex integer literals
    /^0b[01]+$/,                             // binary integer literals
    /^0o[0-7]+$/,                            // octal integer literals
    /^".*"$/, /^'.*'$/, /^`[^`]*`$/,         // string/rune literals
    /[)\]\}]$/,                              // closing ), ], }
    /(\+\+|--)\s*$/,                         // ++ or --
    /\b(break|continue|fallthrough|return)$/, // specific keywords
  ];

  const lines = input.split('\n');
  const resultLines = lines.map((line) => {
    const trimmed = line.trim();

    // If it's empty or already ends with semicolon or is the last line of a block, skip it
    if (
      trimmed === '' ||
      trimmed.endsWith(';') ||
      trimmed.endsWith('{') ||
      trimmed.startsWith('//') // comment line
    ) {
      return line;
    }

    const tokens = trimmed.split(/\s+/);
    const lastToken = tokens[tokens.length - 1];

    const shouldInsert = autoInsertTokens.some((rule) =>
      typeof rule === 'string'
        ? rule === lastToken
        : rule.test(lastToken)
    );

    if (shouldInsert) {
      return line + ';';
    }

    return line;
  });

  return resultLines.join('\n');
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
