import { describe, expect, test } from 'vitest'

import { mainRunnerMT as mainRunner } from '../utility'

describe('Array Type Checking', () => {
  test('Array literal with more elements than in the type should fail.', () => {
    expect(
      mainRunner('var a [3]int = [3]int{1, 2, 3, 4}').error?.message,
    ).toEqual(
      'Array literal has 4 elements but only expected 3, in type [3]int64.',
    )
  })

  test('Commas as part of string literals should pass correctly', () => {
    expect(
      mainRunner(`var a [3]string = [3]string{"1", "2, 3", "4"}
        fmt.Println(a)`).output,
    ).toEqual('[1 2, 3 4]\n')
  })

  test('Array literal with less elements than in the type should still pass.', () => {
    const code = `var a [3]int = [3]int{1}
    fmt.Println(a)`
    expect(mainRunner(code).output).toEqual('[1 0 0]\n')
  })

  test('Array boolean literal with less elements than in the type should still pass.', () => {
    const code = `var a [3]bool = [3]bool{true}
    fmt.Println(a)`
    expect(mainRunner(code).output).toEqual('[true false false]\n')
  })

  test('Array string literal with less elements than in the type should still pass.', () => {
    const code = `var a [3]string = [3]string{"Hi", "there"}
    fmt.Println(a)`
    expect(mainRunner(code).output).toEqual('[Hi there ]\n')
  })

  test('Array literal should ignore newline between elements being declared.', () => {
    // note: does not ignore newline between elements and comma/close semi-colon,
    // it would result in compilation error even in the actual language
    const code = `	var a [3]int = [3]int{
    1,
		2,
		3}
		fmt.Println(a)`
    expect(mainRunner(code).output).toEqual('[1 2 3]\n')
  })

  test('Array literal must have the same type as the declared type.', () => {
    expect(
      mainRunner('var a [3]int = [3]int{1, "wrong type", 3}').error?.message,
    ).toEqual('Cannot use string as int64 value in array literal.')
  })

  test('Array indexing with non integer type should fail.', () => {
    expect(
      mainRunner('var a [3]int = [3]int{1, 2, 3}; fmt.Println(a[1.2])').error
        ?.message,
    ).toEqual('Invalid argument: Index has type float64 but must be an integer')
  })
})
