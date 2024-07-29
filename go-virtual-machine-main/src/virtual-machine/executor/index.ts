import { Instruction } from '../compiler/instructions'
import { TokenLocation } from '../parser/tokens'

import { Process } from './process'

const execute_instructions = (
  instrs: Instruction[],
  heapsize: number,
  symbols: (TokenLocation | null)[],
  visualisation = false,
) => {
  const process = new Process(instrs, heapsize, symbols, visualisation)
  return process.start()
}

export { execute_instructions }
