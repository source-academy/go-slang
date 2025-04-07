import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

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
