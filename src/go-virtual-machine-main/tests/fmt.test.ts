import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('fmt Type Checking', () => {
  test('Selector on fmt should fail unless it is fmt.Println.', () => {
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
})
