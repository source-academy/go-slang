import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

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
    expect(mainRunner(code).error?.type).toEqual('compile')
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
    expect(mainRunner(code).output).toEqual('3\n2\n')
  })

  test('Reassignment to a different type should fail', () => {
    const code = `
    x := 2
    x = "Hi"
    `
    expect(mainRunner(code).error?.type).toEqual('compile')
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
    expect(mainRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should throw error if types do not match in binop', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 3
    var y int = 2
    x = x + y
    `
    expect(mainRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should throw error if types do not match in assignment', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 3
    var y int = 2
    x = y
    `
    expect(mainRunner(code).error?.type).toEqual('compile')
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
    expect(mainRunner(code).output).toEqual('8\n3\n12\n4\n16\n2\n36\n1\n')
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
    expect(mainRunner(code).output).toEqual('9\n8\n24\n6\n18\n306\n2\n-2\n')
  })

  test('Type declaration based on string should still work correctly when applying +', () => {
    const code = `
    type text string
    var x text = "Hello"
    fmt.Println(x + "4")
    `
    expect(mainRunner(code).output).toEqual('Hello4\n')
  })

  test('Type declaration based on string should still work correctly when uninitialised', () => {
    const code = `
    type text string
    var x text
    fmt.Println(x + "4")
    `
    expect(mainRunner(code).output).toEqual('4\n')
  })

  test('Type declaration based on int should still work correctly when uninitialised', () => {
    const code = `
    type Num int
    var x Num
    fmt.Println(x + 45)
    `
    expect(mainRunner(code).output).toEqual('45\n')
  })

  test('Type declaration based on float should still work correctly when uninitialised', () => {
    const code = `
    type Num float64
    var x Num
    fmt.Println(x + 49.25)
    `
    expect(mainRunner(code).output).toEqual('49.25\n')
  })

  test('+ should work on 2 variables with string as underlying type', () => {
    const code = `
    type text string
    var x text = "Hello"
    var y text = " there"
    fmt.Println(x + y)
    `
    expect(mainRunner(code).output).toEqual('Hello there\n')
  })

  test('+ should work on 2 variables with int as underlying type', () => {
    const code = `
    type Age int
    type Num Age
    var x Num = 3
    var y Num = 2
    fmt.Println(x + y)
    `
    expect(mainRunner(code).output).toEqual('5\n')
  })

  test('+ should work on 2 variables with float as underlying type', () => {
    const code = `
    type Age float64
    type Num Age
    var x Num = 3.5
    var y Num = 2.25
    fmt.Println(x + y)
    `
    expect(mainRunner(code).output).toEqual('5.75\n')
  })

  test('Type declaration works on function arguments with typed variable', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(a A) {
      fmt.Println(a)
    }

    func main() {
      var aa A = 38
      help(aa)
    }
    `
    expect(codeRunner(code).output).toEqual('38\n')
  })

  test('Type declaration works on function arguments with literal', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(a A) {
      fmt.Println(a)
    }

    func main() {
      help(47)
    }
    `
    expect(codeRunner(code).output).toEqual('47\n')
  })

  test('Type declaration of multiple layers works on function arguments with literal', () => {
    const code = `
    package main
    import "fmt"

    type A int
    type B A
    func help(a B) {
      fmt.Println(a)
    }

    func main() {
      help(474)
    }
    `
    expect(codeRunner(code).output).toEqual('474\n')
  })

  test('Type declaration fails if function argument types do not match (argument = declared, supplied = underlying)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(a A) {
      fmt.Println(a)
    }

    func main() {
      var aa int = 0
      help(aa)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration fails if function argument types do not match (argument = underlying, supplied = declared)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(a int) {
      fmt.Println(a)
    }

    func main() {
      var aa A = 0
      help(aa)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should work on functions with literal as return values used for another function)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(c A) {
      fmt.Println(c)
    }

    func help2(a A) A {
      return 30
    }

    func main() {
      help(help2(6))
    }
    `
    expect(codeRunner(code).output).toEqual('30\n')
  })

  test('Type declaration should work on functions with matching type return values used for another function)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(c A) {
      fmt.Println(c)
    }

    func help2(a A) A {
      return a * 2
    }

    func main() {
      help(help2(6))
    }
    `
    expect(codeRunner(code).output).toEqual('12\n')
  })

  test('Type declaration should fail on functions with not matching type return values used for another function)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    type B int
    func help(c B) {
      fmt.Println(c)
    }

    func help2(a A) A {
      return 2
    }

    func main() {
      help(help2(6))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should work on arrays', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      a := []B{12, 21}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[12 21]\n')
  })

  test('Type declaration should work on arrays (double layer)', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      type B A
      a := []B{12, 21}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[12 21]\n')
  })

  test('Type declaration should work on 1D arrays', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      a := []B{12, 21}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[12 21]\n')
  })

  test('Type declaration should work on 2D arrays', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      a := [][]B{{12, 18}, {21, 93}}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[[12 18] [21 93]]\n')
  })

  test('Type declaration should work on array elements', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      a := []B{12, 21}
      fmt.Println(a[0] + a[1])
    }
    `
    expect(codeRunner(code).output).toEqual('33\n')
  })

  test('Type declaration should work on array elements (double layer)', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      type B A
      a := []B{12, 21}
      fmt.Println(a[0] + a[1])
    }
    `
    expect(codeRunner(code).output).toEqual('33\n')
  })

  test('Type declaration should fail on array elements of different types', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      type B A
      a := []B{12, 21}
      b := []A{48, 77}
      fmt.Println(a[0] + b[1])
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should fail on arrays of different types', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      type B A
      a := []B{12, 21}
      b := []A{48, 77}
      b = a
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declaration should work on functions with matching type return values used for array element assignment', () => {
    const code = `
    package main
    import "fmt"

    type A int
    func help(c A) {
      fmt.Println(c)
    }

    func help2(a A) A {
      return a * 2
    }

    func main() {
      a := []A{help2(24), help2(67)}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[48 134]\n')
  })

  test('Same type name on different scopes should be seen as different types', () => {
    const code = `
    package main
    import "fmt"

    type A int
    var a A = 1

    func main() {
      type A int
      var b A = 1
      fmt.Println(a + b)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type not in scope but with same name should fail', () => {
    const code = `
    package main
    import "fmt"

    var a A = 1

    func main() {
      type A int
      var b A = 1
      fmt.Println(a + b)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Same type name on different scopes should be seen as different types (multiple layers)', () => {
    const code = `
    package main
    import "fmt"

    type A int
    var a A = 1

    func main() {
      type B A
      type A B
      var b A = 1
      fmt.Println(b + a)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Same type name on different scopes should be seen as different types (for loops)', () => {
    const code = `
    package main
    import "fmt"
    
    func main() {
      type A int
      var c A = 3
      for i := 0; i < 9; i++ {
        type A int
        var b A = 2
        fmt.Println(b + c)
      }
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Type declarations are preserved in loops', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      var c A = 3
      for i := 0; i < 9; i++ {
        var b A = 2
        fmt.Println(b + c)
      }
    }
    `
    expect(codeRunner(code).output).toEqual('5\n5\n5\n5\n5\n5\n5\n5\n5\n')
  })

  test('Type declarations are preserved across functions', () => {
    const code = `
    package main
    import "fmt"
    
    type A int

    func help(a A) A {
      var b A = a
      fmt.Println(b * a)
      return b
    }

    func main() {
      var c A = 14
      var d A = help(c)
      fmt.Println(c + d)
      fmt.Println(d)
    }
    `
    expect(codeRunner(code).output).toEqual('196\n28\n14\n')
  })
})
