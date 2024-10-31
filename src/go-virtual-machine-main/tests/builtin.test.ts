import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

describe('Builtins Type Checking', () => {
  test('Assignment of make with incompatible type should fail', () => {
    expect(
      mainRunner('var a chan int = make(chan string)').error?.message,
    ).toEqual('Cannot use chan string as chan int64 in variable declaration')
  })

  test('Reassignment to constants should fail', () => {
    expect(
      mainRunner(`
        const a = 5
        a = 6
      `).error?.message,
    ).toEqual('cannot assign to a (neither addressable nor a map index expression)')
  })
})

describe('Import statement syntax check', () => {
  test(`Missing bracket for multiple imports with a single
    "import" keyword should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"; "sync"
      `).error?.type,
    ).toEqual("parse")
  })

  test(`Import statement with comma should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import ("fmt", "sync")
      `).error?.type,
    ).toEqual("parse")
  })
})

describe('If statement syntax check', () => {
  test(`Missing conditional in if statements should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          if {
            fmt.Println("Hi")
          }
        }
      `).error?.type,
    ).toEqual("parse")
  })

  test(`Using a function with no boolean returned as a conditional
    for if statements should throw compilation error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func yes() {
        }

        func main() {
          if yes() {
            fmt.Println("Hi")
          }
        }
      `).error?.type,
    ).toEqual("compile")
  })

  test(`Using a non-boolean as a conditional
    for if statements should throw compilation error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := 5
          if a {
            fmt.Println("Hi")
          }
        }
      `).error?.type,
    ).toEqual("compile")
  })

  test(`Missing curly braces for if-blocks should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          if true
        }
      `).error?.type,
    ).toEqual("parse")
  })

  test(`Else statements without if should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          else
        }
      `).error?.type,
    ).toEqual("parse")
  })

  test(`Declaring new variables in if should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          if (var x = true) {}
        }
      `).error?.type,
    ).toEqual("parse")
  })

  test(`Declaring new variables in for loops should throw parsing error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          for var i = 0; i < 10; i++ {}
        }
      `).error?.type,
    ).toEqual("parse")
  })
})
