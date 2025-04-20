import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('fmt Type Checking', () => {
  test('Selector on fmt should fail unless it is a supported fmt function.', () => {
    const code = `
    fmt.nonexistent("hi")
    `
    expect(mainRunner(code).error?.message).toEqual(
      'undefined: fmt.nonexistent',
    )
  })
})

describe('fmt.Println', () => {
  test('fmt.Println handles string and boolean', () => {
    const code = `
    fmt.Println("Hello", "world", true, false)
    fmt.Println(1, 2, 3, 4)
    `
    expect(mainRunner(code).output).toEqual('Hello world true false\n1 2 3 4\n')
  })

  test('fmt.Println handles string and variable concatenation', () => {
    const code = `
    const name = "John Doe"
    const age = 17
    fmt.Println(name, "is", age, "years old")
    fmt.Println(1, 2, 3, 4)
    `
    expect(mainRunner(code).output).toEqual(
      'John Doe is 17 years old\n1 2 3 4\n',
    )
  })
})

describe('fmt.Print', () => {
  test('boolean/integer printing', () => {
    const code = `
    fmt.Print(true, false)
    fmt.Print(1, 2, 3, 4)
    `
    expect(mainRunner(code).output).toEqual('true false1 2 3 4')
  })

  // the argument before and after the string argument will coalesce with the string argument
  test('fmt.Print works correctly when handling strings', () => {
    const code = `
    fmt.Print("Hello", false, "world", true, "false")
    fmt.Print(1, 2, "3", 4)
    `
    expect(mainRunner(code).output).toEqual('Hellofalseworldtruefalse1 234')
  })

  test('fmt.Print handles string and variable concatenation', () => {
    const code = `
    const name = "John Doe"
    const age = 17
    fmt.Print(name, "is", age, "years old")
    fmt.Print(1, 2, 3, 4)
    `
    expect(mainRunner(code).output).toEqual('John Doeis17years old1 2 3 4')
  })
})

describe('fmt.Printf', () => {
  test('fmt.Printf works the same as fmt.Print if only 1 string argument is supplied', () => {
    const code = `
    fmt.Printf("Hello World")
    fmt.Printf("Byebye World")
    `
    expect(mainRunner(code).output).toEqual('Hello WorldByebye World')
  })
})
