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

  test('Type declaration should work for multiple layers', () => {
    const code = `
    type Age int
    type B Age
    var x B = 3
    fmt.Println(x)
    `
    expect(mainRunner(code).output).toEqual('3\n')
  })

  test('Type declaration should work', () => {
    const code = `
    type Age int
    var x Age = 3
    fmt.Println(x)
    `
    expect(mainRunner(code).output).toEqual('3\n')
  })

  test('Type declaration should not interfere with primitive declarations', () => {
    const code = `
    type Age int
    type B Age
    var x int = 3
    fmt.Println(x)
    `
    expect(mainRunner(code).output).toEqual('3\n')
  })

  test('Type declaration should throw error if not found', () => {
    const code = `
    type Age int
    type B Ag
    `
    expect(mainRunner(code).error?.type).toEqual("compile")
  })

  test('Type declaration should throw error if types do not match in binop', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 3
    var y int = 2
    x = x + y
    `
    expect(mainRunner(code).error?.type).toEqual("compile")
  })

  test('Type declaration should throw error if types do not match in assignment', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 3
    var y int = 2
    x = y
    `
    expect(mainRunner(code).error?.type).toEqual("compile")
  })

  test('Type declaration based on int should still work correctly when applying binops', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 6
    fmt.Println(x + 2)
    fmt.Println(x / 2)
    fmt.Println(x * 2)
    fmt.Println(x - 2)
    fmt.Println((x + 2) * 2)
    fmt.Println((x - 2) / 2)
    fmt.Println(x * x)
    fmt.Println(x / x)
    `
    expect(mainRunner(code).output).toEqual("8\n3\n12\n4\n16\n2\n36\n1\n")
  })

  test('Type declaration based on int should still work correctly when applying arithmetic assignments', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 6
    x += 3
    fmt.Println(x)
    x -= 1
    fmt.Println(x)
    x *= 3
    fmt.Println(x)
    x /= 4
    fmt.Println(x)
    x += 2 * x
    fmt.Println(x)
    x *= x - 1
    fmt.Println(x)
    x /= x / 2
    fmt.Println(x)
    x -= x + 2
    fmt.Println(x)
    `
    expect(mainRunner(code).output).toEqual("9\n8\n24\n6\n18\n306\n2\n-2\n")
  })

  test('Type declaration based on string should still work correctly when applying +', () => {
    const code = `
    type text string
    var x text = "Hello"
    fmt.Println(x + "4")
    `
    expect(mainRunner(code).output).toEqual("Hello4\n")
  })

  test('Type declaration based on string should still work correctly when uninitialised', () => {
    const code = `
    type text string
    var x text
    fmt.Println(x + "4")
    `
    expect(mainRunner(code).output).toEqual("4\n")
  })
})
