import { runCode } from '../virtual-machine'

/** Runs the code in a main function */
export const mainRunner = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCode(packagedCode, 2048, true)
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
  return runCode(packagedCode, 2048, false)
}

/** Runs the code as a whole */
export const codeRunner = (code: string) => {
  return runCode(code, 2048, true)
}

/** Runs the code as a whole with randomised context switch */
export const codeRunnerRandom = (code: string) => {
  return runCode(code, 2048, false)
}
