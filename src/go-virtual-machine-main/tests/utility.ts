import * as seedrandom from 'seedrandom'

import { CompileData, runCode } from '../virtual-machine'
import parser from '../virtual-machine/compiler/parser'
import {
  SourceFileTokens,
  TokenLocation,
} from '../virtual-machine/compiler/tokens'
import { compile_tokens, CompileError } from '../virtual-machine/executor'
import { Instruction } from '../virtual-machine/executor/instructions'
import { Heap } from '../virtual-machine/heap'
import { ContextNode } from '../virtual-machine/heap/types/context'
import {
  EnvironmentNode,
  FrameNode,
} from '../virtual-machine/heap/types/environment'
import { Debugger } from '../virtual-machine/runtime/debugger'
import { Process } from '../virtual-machine/runtime/process'

/** Runs the code in a main function */
export const mainRunner = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCode(packagedCode, 4096, true)
}

/** Runs the code in a main function with randomised context switch */
export const mainRunnerRandom = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCode(packagedCode, 4096, false)
}

/** Runs the code as a whole */
export const codeRunner = (code: string) => {
  return runCode(code, 4096, true)
}

export const compileCode = (source_code: string): CompileData => {
  let instructions: Instruction[] = []
  let symbols: (TokenLocation | null)[] = []
  let message = ''
  const err = ''
  let tokens = null
  try {
    tokens = parser.parse(source_code) as SourceFileTokens
    console.log(tokens)
  } catch (err) {
    message = (err as Error).message
    return {
      instructions: [],
      symbols: [],
      output: message,
      error: {
        message,
        type: 'parse',
        details: err as string,
      },
      visualData: [],
    }
  }
  try {
    const temp = compile_tokens(tokens)
    instructions = temp.instructions
    symbols = temp.symbols
    console.log(instructions)
  } catch (err) {
    message = (err as CompileError).message
  }
  return {
    instructions,
    symbols,
    output: message,
    error: {
      message,
      type: 'compile',
      details: err as string,
    },
    visualData: [],
  }
}

export const runCodeWithHeap = (
  compiled: CompileData,
  heap: Heap,
  deterministic = true,
  visualisation = true,
) => {
  // Execution.
  const instructions = compiled.instructions
  const symbols = compiled.symbols
  const process = new Process(
    instructions,
    4096,
    symbols,
    deterministic,
    visualisation,
  )
  process.instructions = instructions
  process.heap = heap
  process.contexts = process.heap.contexts
  process.context = new ContextNode(process.heap, process.contexts.peek())
  process.stdout = ''
  const base_frame = FrameNode.create(0, process.heap)
  const base_env = EnvironmentNode.create(
    base_frame.addr,
    [],
    false,
    process.heap,
  )
  process.context.set_E(base_env.addr)
  const randomSeed = Math.random().toString(36).substring(2)
  process.generator = seedrandom.default(randomSeed)
  process.deterministic = deterministic
  process.debug_mode = true
  process.debugger = new Debugger(process.heap, process.instructions, symbols)
  if (process.debug_mode)
    process.debugger.context_id_map.set(
      process.context.addr,
      process.debugger.context_id++,
    )
  process.heap.debugger = process.debugger
  const result = process.start()
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
    instructions,
    output: result.stdout,
    visualData: result.visual_data,
    error: undefined,
  }
}

/** Runs the code as a whole with randomised context switch */
export const codeRunnerRandom = (code: string) => {
  return runCode(code, 4096, false)
}

export { runCode }
