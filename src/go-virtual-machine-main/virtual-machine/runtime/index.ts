import { TokenLocation } from '../compiler/tokens'
import { Instruction } from '../executor/instructions'
import { ProgramData } from '..'

import { Process } from './process'
import { Callback, Scheduler } from './scheduler'

export const is_multithreaded = true

const execute_instructions = (
  instrs: Instruction[],
  heapsize: number,
  symbols: (TokenLocation | null)[],
  deterministic: boolean,
  visualisation = false,
  callback: Callback,
  completeExecution: (result: ProgramData) => void
) => {
  if (is_multithreaded) {
    const scheduler = new Scheduler(
      instrs,
      heapsize,
      symbols,
      deterministic,
      visualisation,
      callback,
      completeExecution
    )
    scheduler.init()
  } else {
    const process = new Process(
      instrs,
      heapsize,
      symbols,
      deterministic,
      visualisation,
    )
    callback(process.start(), completeExecution)
  }
}

export { execute_instructions }
