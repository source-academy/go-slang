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

  test('int literal can act as a float too', () => {
    const code = `
    type Age float64
    type Num Age
    var x Num = 3.25
    fmt.Println(x + 52)
    `
    expect(mainRunner(code).output).toEqual("55.25\n")
  })

  test('float literal can act as an int too if it has no floating point values', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 12
    fmt.Println(x + 3.00000)
    `
    expect(mainRunner(code).output).toEqual("15\n")
  })

  test('Division truncates result when denominator is an int', () => {
    const code = `
    var x int = 340
    fmt.Println(100 / 7)
    fmt.Println(8000 / x)
    `
    expect(mainRunner(code).output).toEqual("14\n23\n")
  })

  test('Division does not truncate result when denominator is a float', () => {
    const code = `
    var x float64 = 6400.0
    fmt.Println(100.0 / 8.0)
    fmt.Println(800.0 / x)
    `
    expect(mainRunner(code).output).toEqual("12.5\n0.125\n")
  })

  test('Binops work on untyped literals with 1 being a float and another being an int', () => {
    const code = `
    fmt.Println(80 / 32.0)
    fmt.Println(80 * 32.0)
    fmt.Println(80 + 32.0)
    fmt.Println(80 - 32.0)
    fmt.Println(80.0 / 32)
    fmt.Println(80.0 * 32)
    fmt.Println(80.0 + 32)
    fmt.Println(80.0 - 32)
    `
    expect(mainRunner(code).output).toEqual("2.5\n2560\n112\n48\n2\n2560\n112\n48")
  })
}, 60000)
