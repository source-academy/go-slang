import { runCode } from '../src/virtual-machine'

/** Runs the code in a main function */
export const mainRunner = (code: string) => {
  const packagedCode = `
  package main
  import "fmt"
  func main() {
    ${code}
  }
  `
  return runCode(packagedCode, 2048)
}
