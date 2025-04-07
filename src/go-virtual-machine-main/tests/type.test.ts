import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Assignment Type Checking', () => {
  test('Declaration', () => {
    expect(mainRunner('var a int = 1.0').error?.message).toEqual(
      'Cannot use float64 as int64 in variable declaration',
    )
  })

  test('Short variable declaration', () => {
    expect(mainRunner('a := 1; var b string = a').error?.message).toEqual(
      'Cannot use int64 as string in variable declaration',
    )
  })

  test('Assigment', () => {
    expect(mainRunner('a := "hi"; a = 2').error?.message).toEqual(
      'Cannot use int64 as string in assignment',
    )
  })
})

describe('Binary Operator Type Checking', () => {
  test('Add assign', () => {
    expect(mainRunner('a := "hi"; a = 2 * "xyz"').error?.message).toEqual(
      'Invalid operation (mismatched types int64 and string)',
    )
  })

  test('Binary multiplication', () => {
    expect(mainRunner('a := 1 * 1.0').error?.message).toEqual(
      'Invalid operation (mismatched types int64 and float64)',
    )
  })
})

describe('Miscellaneous Type Checking', () => {
  test('Variable shadowing', () => {
    expect(mainRunner('a := 1; { a := 2.0; a = 1 }').error?.message).toEqual(
      'Cannot use int64 as float64 in assignment',
    )
  })
})
