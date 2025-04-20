import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'

import { TokenLocation } from '../../go-virtual-machine-main/virtual-machine/compiler/tokens'
import {
  ContextInfo,
  StateInfo,
} from '../../go-virtual-machine-main/virtual-machine/runtime/debugger'

export interface ExecutionState {
  currentStep: number
  setStep: (step: number) => void
  data: StateInfo[]
  setVisualData: (data: StateInfo[]) => void
  cur_data: ContextInfo[]
  output: string
  setOutput: (output: string) => void
  setLocation: (location: TokenLocation | null) => void
  location: TokenLocation | null
}

const defaultValues = {
  currentStep: 0,
  data: [],
  cur_data: [],
  output: '',
  location: null,
}

/**
 * Factory function for execution store
 * with option to seed inital values (For automated tests)
 * @param initalValues Initial Values (optional)
 * @returns
 */
export const createExecutionStore = (initialState: Partial<ExecutionState>) => {
  return createWithEqualityFn<ExecutionState>(
    (set, get) => ({
      ...defaultValues,
      /**
       * Change the current execution step to given value.
       * Note this operation updates all related variables like table data
       * @param step
       */
      setStep: (step: number) => {
        if (step < get().data.length) {
          set({
            currentStep: step,
            cur_data: get().data[step].contexts,
            output: get().data[step].output,
            location: get().data[step].location,
          })
        }
      },
      /**
       * Resets the execution from the start with new instructions.
       * @param instructions New instructions
       */
      setVisualData: (data: StateInfo[]) => {
        set({
          currentStep: 0,
          data,
        })
      },
      setOutput: (output: string) => {
        set({ output })
      },
      setLocation: (location: TokenLocation | null) => {
        set({ location })
      },
      ...initialState,
    }),
    shallow,
  )
}

export const useExecutionStore = createExecutionStore({})
