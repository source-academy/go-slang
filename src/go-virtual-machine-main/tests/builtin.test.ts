import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

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
    ).toEqual(
      'cannot assign to a (neither addressable nor a map index expression)',
    )
  })
}, 60000)
