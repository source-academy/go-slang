import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Basic Expression Tests', () => {
  test('Basic Arithmetic 1', () => {
    expect(mainRunner('fmt.Println(5 * -1 + 3 * 4 / 2 + 3)').output).toEqual(
      '4\n',
    )
  })
  test('Basic Arithmetic 2', () => {
    expect(mainRunner('fmt.Println((4+3)*5%(5+3)+2)').output).toEqual('5\n')
  })
  test('Boolean Expression', () => {
    expect(
      mainRunner('fmt.Println((2+1 < 3) || (7 == 9%5 + 15/5))').output,
    ).toEqual('true\n')
  })
})
