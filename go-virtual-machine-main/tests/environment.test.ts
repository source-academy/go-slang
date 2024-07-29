import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Basic Environment Tests', () => {
  test('Number Variables', () => {
    expect(
      mainRunner(
        'var a int = 3;\
          b:= a + 3;\
          c := a + b;\
          c *= a;\
          fmt.Println(a + b + c)',
      ).output,
    ).toEqual('36\n')
  })
  test('Number Variables Scoping', () => {
    expect(
      mainRunner(
        ' var a int = 3;\
        {\
          var a int = 1;\
          a = 2;\
        };\
        fmt.Println(a)',
      ).output,
    ).toEqual('3\n')
  })
})
