import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Import statement syntax check', () => {
  test(`Missing bracket for multiple imports with a single
      "import" keyword should throw parsing error`, () => {
    expect(
      codeRunner(`
          package main
          import "fmt"; "sync"
        `).error?.type,
    ).toEqual('parse')
  })

  test(`Import statement with comma should throw parsing error`, () => {
    expect(
      codeRunner(`
          package main
          import ("fmt", "sync")
        `).error?.type,
    ).toEqual('parse')
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
    ).toEqual('parse')
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
    ).toEqual('compile')
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
    ).toEqual('compile')
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
    ).toEqual('parse')
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
    ).toEqual('parse')
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
    ).toEqual('parse')
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
    ).toEqual('parse')
  })
  test(`Declaring hexadecimal should parse correctly`, () => {
    expect(
      codeRunner(`
          package main
          import "fmt"
  
          func main() {
            a := 0x789
            b := 0Xfae
            fmt.Println(a)
            fmt.Println(b)
          }
        `).output,
    ).toEqual('1929\n4014\n')
  })

  test(`Declaring octal should parse correctly`, () => {
    expect(
      codeRunner(`
          package main
          import "fmt"
  
          func main() {
            a := 0o735
            b := 0O170
            fmt.Println(a)
            fmt.Println(b)
          }
        `).output,
    ).toEqual('477\n120\n')
  })

  test(`Declaring binary should parse correctly`, () => {
    expect(
      codeRunner(`
          package main
          import "fmt"
  
          func main() {
            a := 0b111111
            b := 0B101001
            fmt.Println(a)
            fmt.Println(b)
          }
        `).output,
    ).toEqual('63\n41\n')
  })
})
