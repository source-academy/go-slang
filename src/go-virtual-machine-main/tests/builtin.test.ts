import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Builtins Type Checking', () => {
  test('Assignment of make with incompatible type should fail', () => {
    expect(
      mainRunner('var a chan int = make(chan string)').error?.message,
    ).toEqual('Cannot use chan string as chan int64 in variable declaration')
  })
})
