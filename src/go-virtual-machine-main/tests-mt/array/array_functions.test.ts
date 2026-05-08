import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Array Execution', () => {
  test('Single element assignment should fail when using multiple return values from a single function', () => {
    const code = `
    package main
    import "fmt"

    func help2(a int) (int, int) {
      return a * 2, a * 3
    }

    func main() {
      a := [2]int{help2(24)}
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Array assignment should fail when using multiple return values from a single function', () => {
    const code = `
    package main
    import "fmt"

    func help2(a int) (int, int) {
      return a * 2, a * 3
    }

    func main() {
      a := [2]int{0, 0}
      a = help2(4)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Array multiple elements assignment should work when using multiple (2) return values from a single function', () => {
    const code = `
    package main
    import "fmt"

    func help2(a int) (int, int) {
      return a * 2, a * 3
    }

    func main() {
      a := [4]int{0, 0, 0, 0}
      a[0], a[2] = help2(4)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[8 0 12 0]\n')
  })

  test('Array multiple elements assignment should work when using multiple (4) return values from a single function', () => {
    const code = `
    package main
    import "fmt"

    func help2(a int) (int, int, int, int) {
      return a * 2, a * 3, a * 6, a * 10
    }

    func main() {
      a := [4]int{0, 0, 0, 0}
      a[0], a[2], a[3], a[1] = help2(4)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[8 40 12 24]\n')
  })

  test('Array multiple elements assignment should work with expression indices when using multiple return values from a single function', () => {
    const code = `
    package main
    import "fmt"

    func help2(a int) (int, int, int, int) {
      return a * 2, a * 3, a * 6, a * 10
    }

    func main() {
      a := [4]int{0, 0, 0, 0}
      a[0 + 3], a[2 - 1], a[3 * 0], a[6 / 3] = help2(4 + 7)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual('[66 33 110 22]\n')
  })

  test('Passing arrays to functions should also not change array element values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func help(a [3]int) {
          a[0] = 934
        }

        func main() {
          a := [3]int{3, 4, 5}
          help(a)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[3 4 5]\n')
  })

  test('Passing arrays to goroutines should also not change array element values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := [3]int{3, 4, 5}
          go func(a [3]int) {
            a[0] = 934
            fmt.Println(a)
          }(a)
          fmt.Println(a)
          a[2] = 66
          for i := 0; i < 99; i++ {
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[3 4 5]\n[934 4 5]\n[3 4 66]\n')
  })

  test(`Passing arrays of declared types to functions should also not change array element values`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [3]A) {
          a[0] = 934
        }

        func main() {
          a := [3]A{3, 4, 5}
          help(a)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[3 4 5]\n')
  })

  test(`Passing arrays of declared types to goroutines should also not change array element values`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [3]A) {
          a[0] = 930
          fmt.Println(a)
        }

        func main() {
          a := [3]A{3, 4, 5}
          fmt.Println(a)
          go help(a)
          a[2] = 77
          for i := 0; i < 99; i++ {
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[3 4 5]\n[930 4 5]\n[3 4 77]\n')
  })

  test('Passing 2D arrays of declared types to functions should also not change array element values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) {
          a[0][0] = 934
          fmt.Println(a)
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          help(a)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[934 0 4] [2 5 1]]\n[[3 0 4] [2 5 1]]\n')
  })

  test('Passing 2D arrays of declared types to goroutines should also not change array element values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) {
          a[0][0] = 934
          fmt.Println(a)
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          go help(a)
          for i := 0; i < 99; i++ {
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[934 0 4] [2 5 1]]\n[[3 0 4] [2 5 1]]\n')
  })

  test('Returning 2D arrays of declared types work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([2][3]A) {
          a[0][0] = 934
          return a
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          b := help(a)
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual('[[3 0 4] [2 5 1]]\n[[934 0 4] [2 5 1]]\n')
  })

  test('Returning 1D array of declared types work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          b := help(a)
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual('[[3 0 4] [2 5 1]]\n[888 5 999]\n')
  })

  test('Returning 1D array of declared types to be part of another array work with partial initialisation', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          b := [2][3]A{}
          b[1] = help(a)
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual('[[3 0 4] [2 5 1]]\n[[0 0 0] [888 5 999]]\n')
  })

  test('Returning 1D array of declared types to be part of another array work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          b := [2][3]A{{1, 2, 3}, {4, 5, 6}}
          b[1] = help(a)
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual('[[3 0 4] [2 5 1]]\n[[1 2 3] [888 5 999]]\n')
  })

  test('Returning 1D array of declared types to be part of another array work even with reassignment', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func help2(a [2][3]A) ([3]A) {
          a[0][0] = 888
          return a[0]
        }

        func main() {
          a := [2][3]A{{3, 0, 4}, {2, 5, 1}}
          b := [2][3]A{{1, 2, 3}, {4, 5, 6}}
          b[1] = help(a) // b = [[1 2 3] [888 5 999]]
          a[0] = help2(b) // a = [[888 2 3] [888 5 999]]
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual('[[888 2 3] [2 5 1]]\n[[1 2 3] [888 5 999]]\n')
  })

  test('3D arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func help2(a [2][3]A) ([3]A) {
          a[0][0] = 888
          return a[0]
        }

        func main() {
          a := [2][2][3]A{{{3, 0, 4}, {2, 5, 1}}, {{32, 13, 24}, {29, 56, 15}}}
          b := [2][3]A{{1, 2, 3}, {4, 5, 6}}
          b[1] = help(a[1]) // b = [[1, 2, 3] [888, 56, 999]]
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual(
      '[[[3 0 4] [2 5 1]] [[32 13 24] [29 56 15]]]\n[[1 2 3] [888 56 999]]\n',
    )
  })

  test('3D arrays work with reassignment', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A int

        func help(a [2][3]A) ([3]A) {
          a[1][0] = 888
          a[1][2] = 999
          return a[1]
        }

        func help2(a [2][3]A) ([2][3]A) {
          a[0][0] = 888
          return a
        }

        func main() {
          a := [2][2][3]A{{{3, 0, 4}, {2, 5, 1}}, {{32, 13, 24}, {29, 56, 15}}}
          b := [2][3]A{{1, 2, 3}, {4, 5, 6}}
          a[1] = help2(a[1]) // a = [[[3 0 4] [2 5 1]] [[888 13 24] [29 56 15]]]
          b[1] = help(a[1]) // b = [[1, 2, 3] [888, 56, 999]]
          fmt.Println(a)
          fmt.Println(b)
        }
      `).output,
    ).toEqual(
      '[[[3 0 4] [2 5 1]] [[888 13 24] [29 56 15]]]\n[[1 2 3] [888 56 999]]\n',
    )
  })
})
