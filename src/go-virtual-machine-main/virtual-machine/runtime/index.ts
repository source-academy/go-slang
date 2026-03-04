import { TokenLocation } from '../compiler/tokens'
import { Instruction } from '../executor/instructions'

import { Process } from './process'
import { Callback } from './scheduler'

export var is_multithreaded = true

const execute_instructions = (
  instrs: Instruction[],
  heapsize: number,
  symbols: (TokenLocation | null)[],
  deterministic: boolean,
  visualisation = false,
  callback: Callback,
) => {
  const process = new Process(
    instrs,
    heapsize,
    symbols,
    deterministic,
    visualisation,
  )
  return process.start()
}

export { execute_instructions }
