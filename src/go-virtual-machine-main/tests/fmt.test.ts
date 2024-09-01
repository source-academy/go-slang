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

describe('fmt Execution', () => {
  test('fmt.Println works', () => {
    const code = `
    fmt.Println("Hello", "world", true, false)
    fmt.Println(1, 2, 3, 4)
    `
    expect(mainRunner(code).output).toEqual('Hello world true false\n1 2 3 4\n')
  })

  test('fmt.Print works', () => {
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
})
