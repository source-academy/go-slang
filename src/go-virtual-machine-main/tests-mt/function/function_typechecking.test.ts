import { describe, expect, test } from 'vitest'

import {
  codeRunnerMT as codeRunner,
  mainRunnerMT as mainRunner,
} from '../utility'

describe('Function Type Checking', () => {
  test('Function assignment', () => {
    expect(
      mainRunner('var a func(int, int) = func(int, int, int) {}').error
        ?.message,
    ).toEqual(
      'Cannot use func(int64, int64, int64) () as func(int64, int64) () in variable declaration',
    )
  })

  test('Function call - too many arguments', () => {
    expect(
      mainRunner('f := func(int, int) {}; f(1, 2, 3)').error?.message,
    ).toEqual(
      'Too many arguments in function call\n' +
        'have (int64, int64, int64)\n' +
        'want (int64, int64)',
    )
  })

  test('Function call - too few arguments', () => {
    expect(mainRunner('f := func(int, int) {}; f(1)').error?.message).toEqual(
      'Not enough arguments in function call\n' +
        'have (int64)\n' +
        'want (int64, int64)',
    )
  })

  test('Function call - incorrect argument type', () => {
    expect(
      mainRunner('f := func(int, int) {}; f(1, "a")').error?.message,
    ).toEqual('Cannot use string as int64 in argument to function call')
  })

  test('Function missing return', () => {
    expect(mainRunner('f := func(x int) int { x += 1}').error?.message).toEqual(
      'Missing return.',
    )
  })

  test('Function with if statement missing return in one branch', () => {
    expect(
      mainRunner(
        'f := func(x int) int { if x == 1 { x += 1 } else { return 1 } }',
      ).error?.message,
    ).toEqual('Missing return.')
  })

  test('Function with wrong return type', () => {
    expect(
      mainRunner(
        'f := func(x int) int { if x == 1 { return "hi" } else { return 1 } }',
      ).error?.message,
    ).toEqual('Cannot use (string) as (int64) value in return statement.')
  })

  test('Function with too many return values', () => {
    expect(
      mainRunner(
        'f := func(x int) { if x == 1 { return 1 } else { return 1 } }',
      ).error?.message,
    ).toEqual('Too many return values\nhave (int64)\nwant ()')
  })

  test('Function with more than 1 return value as argument for another function', () => {
    const code = `
    package main
    import "fmt"
    func u(x int) (y int, z int) {
      return x, x;
    }

    func main() {
      fmt.Print(u(6));
    }
    `
    expect(codeRunner(code).output).toEqual('6 6')
  })

  test('Function with more than 1 return value to be assigned to variables', () => {
    const code = `
    package main
    import "fmt"
    func u(x int) (int, int) {
      return x, x + 3;
    }

    func main() {
      var a, b = u(8)
      fmt.Println(a);
      fmt.Println(b);
    }
    `
    expect(codeRunner(code).output).toEqual('8\n11\n')
  })

  test('Nested function', () => {
    const code = `
    package main
    import "fmt"
    func f(x int) int {
      return x + 2;
    }

    func g(x int) int {
      return x + 5;
    }

    func main() {
      fmt.Println(g(f(1)));
    }
    `
    expect(codeRunner(code).output).toEqual('8\n')
  })
})
