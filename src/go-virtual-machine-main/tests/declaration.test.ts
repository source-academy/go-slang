import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Variable Declaration Tests', () => {
  test('Const Variables', () => {
    expect(
      mainRunner(
        'var a int = 3;\
        const b int = 5;\
        const c int = b;\
        fmt.Println(a+b+c)',
      ).output,
    ).toEqual('13\n')
  })

  test('Multiple constants in a line', () => {
    expect(
      mainRunner(
        `const b, c int = 5, 12;
        fmt.Println(b+c)`,
      ).output,
    ).toEqual('17\n')
  })

  test('Multiple variables in a line', () => {
    expect(
      mainRunner(
        `var b, c int = 5, 12;
        fmt.Println(b+c)`,
      ).output,
    ).toEqual('17\n')
  })

  test('Multiple variables in a line, shorthand version', () => {
    expect(
      mainRunner(
        `b, c := 5, 12;
        fmt.Println(b+c)`,
      ).output,
    ).toEqual('17\n')
  })

  test('String Variables', () => {
    expect(
      mainRunner(
        'a := "hi";\
        b := "hi2";\
        fmt.Println(a + b)',
      ).output,
    ).toEqual('hihi2\n')
  })

  test('Boolean constants true and false are predeclared', () => {
    const code = `
    if false {
      fmt.Println("false")
    }
    if true {
      fmt.Println("true")
    }
    `
    expect(mainRunner(code).output).toEqual('true\n')
  })

  test('Boolean constants true and false can be shadowed by local declaration', () => {
    const code = `
    true := false
    false := true
    if false {
      fmt.Println("false")
    }
    if true {
      fmt.Println("true")
    }
    `
    expect(mainRunner(code).output).toEqual('')
  })

  test('Declaring variables with same name in same scope should throw compilation error', () => {
    const code = `
    x, x := 3, 6
    `
    expect(mainRunner(code).error?.type).toEqual("compile")
  })

  test('Declaring variables with same name in different scopes should pass', () => {
    const code = `
    x := 2
    {
      x := 3
      fmt.Println(x)
    }
    fmt.Println(x)
    `
    expect(mainRunner(code).output).toEqual("3\n2\n")
  })

  test('Reassignment to a different type should fail', () => {
    const code = `
    x := 2
    x = "Hi"
    `
    expect(mainRunner(code).error?.type).toEqual("compile")
  })
})
