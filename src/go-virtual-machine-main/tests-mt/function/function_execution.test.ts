import { describe, expect, test } from 'vitest'

import {
  codeRunnerMT as codeRunner,
  mainRunnerMT as mainRunner,
} from '../utility'

describe('Function Execution tests', () => {
  test('Function Literals', () => {
    expect(
      mainRunner(
        'f := func(x int, y int) int{\
        return x + y\
      }\
      fmt.Println(1 + f(1, 2))',
      ).output,
    ).toEqual('4\n')
  })

  test('Function Declaration', () => {
    expect(
      codeRunner(
        `package main
        import "fmt"

        var a int = 1

        func f(x, y int) int {
          return x + y + a
        }

        func main() {
          f := func(x, y int) int {
            return x + y + 100
          }
          fmt.Println(f(1, 2))
        }`,
      ).output,
    ).toEqual('103\n')
  })

  test('Function assignment in loop', () => {
    expect(
      codeRunner(
        `package main
        import "fmt"
        func main() {
          f := func(x, y int) int {
            return x + y
          }
          for i := 0; i < 5; i++ {
            f = func(x, y int) int {
              return x + y + i
            }
          }
          fmt.Println(f(1, 2))
        }`,
      ).output,
    ).toEqual('8\n')
  })

  test('Function assignment in loop and if', () => {
    expect(
      codeRunner(
        `package main
        import "fmt"
        func main() {
          f := func(x, y int) int {
            return x + y
          }
          for i := 0; i < 100; i++ {
            if i < 50 {
              f = func(x, y int) int {
                return x + y + i
              }
            }
          }
          fmt.Println(f(1, 2))
        }`,
      ).output,
    ).toEqual('103\n')
  })

  test('Recursive function', () => {
    expect(
      codeRunner(
        `package main

      import "fmt"

      func f(x int) int {
        if x == 0 {
          return 0
        }
        return f(x - 1) + 1
      }

      func main() {
        fmt.Println(f(10))
      }`,
      ).output,
    ).toEqual('10\n')
  })

  test('Calling a function twice.', () => {
    expect(
      mainRunner('f := func(){ fmt.Println(1) }; f(); f()').output,
    ).toEqual('1\n1\n')
  })

  test('Closures', () => {
    expect(
      codeRunner(
        `package main
        import "fmt"

        func getAreaFunc() func(int, int) int {
          a := 0
          k := func(x, y int) int {
            a += 1
            return x*y + a
          }
          a += 1
          return k
        }

        func main() {
          f := getAreaFunc()
          f2 := getAreaFunc()
          fmt.Println(f(3, 2))
          fmt.Println(f(1, 1))
          fmt.Println(f(1, 1))
          fmt.Println(f2(1, 1))
          fmt.Println(f2(2, 3))
          fmt.Println(f2(1, 1))
        }
    `,
      ).output,
    ).toEqual('8\n4\n5\n3\n9\n5\n')
  })

  test('Function can reassign variables in parent scope', () => {
    expect(
      mainRunner(`
        x := 0
        func() {
          x = 99
        }()
        fmt.Println(x)
      `).output,
    ).toEqual('99\n')
  })

  test('Function works as first class citizens using lambda expression', () => {
    expect(
      mainRunner(`
        q, g := 10, func() int { return q }
        fmt.Println(g())
      `).output,
    ).toEqual('10\n')
  })

  test('Return values are stored correctly for functions returning multiple values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func f() (int, int, string) {
          return 1, 2, "IUCvevfde"
        }

        func x() string {
	        a, b, s := f()
          return s
        }

        func main() {
          e := x()
          m, n, o := f()
          fmt.Println(e)
          fmt.Println(m)
          fmt.Println(n)
          fmt.Println(o)
        }
      `).output,
    ).toEqual('IUCvevfde\n1\n2\nIUCvevfde\n')
  })

  test('Nested function calls are executed correctly', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func f() (int, int, string) {
          return 1, 2, "IUCvevfde"
        }

        func x(a int, b int, s string) (int, int, string) {
          return a * 10, b * 10, s
        }

        func main() {
          c, d, e := x(f())
          fmt.Println(c)
          fmt.Println(d)
          fmt.Println(e)
        }
      `).output,
    ).toEqual('10\n20\nIUCvevfde\n')
  })

  test('Arguments are handled correctly and return values are stored correctly', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func x(a int, b int, s string) (int, int, string) {
          return a * 10, b * 10, s
        }

        func main() {
          c, d, e := x(1, 2, "IUCvevfde")
          fmt.Println(c)
          fmt.Println(d)
          fmt.Println(e)
        }
      `).output,
    ).toEqual('10\n20\nIUCvevfde\n')
  })

  test('Return values are stored correctly', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func x(a int, s string) (int, string) {
          return a * 10, s
        }

        func main() {
          d, e := x(3, "IUCvevfde")
          c, f := 3, 2
          fmt.Println(c)
          fmt.Println(d)
          fmt.Println(e)
          fmt.Println(f)
          fmt.Println(x(3, "IUCvevfde"))
        }
      `).output,
    ).toEqual('3\n30\nIUCvevfde\n2\n30 IUCvevfde\n')
  })
})
