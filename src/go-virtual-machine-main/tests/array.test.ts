import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

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

describe('Array Execution', () => {
  test('Array indexing with valid index works.', () => {
    expect(
      mainRunner(
        'var a [3]string = [3]string{"a", "b", "c"}\n fmt.Println(a[2])',
      ).output,
    ).toEqual('c\n')
  })

  test('Array indexing with negative index fails.', () => {
    expect(
      mainRunner(
        'var a [3]string = [3]string{"a", "b", "c"}\n fmt.Println(a[-1])',
      ).error?.message,
    ).toEqual('Execution Error: Index out of range [-1] with length 3')
  })

  test('Array indexing with out of range index fails.', () => {
    expect(
      mainRunner(
        'var a [3]string = [3]string{"a", "b", "c"}\n fmt.Println(a[3])',
      ).error?.message,
    ).toEqual('Execution Error: Index out of range [3] with length 3')
  })

  test('2D arrays work with partial initialisation.', () => {
    expect(
      mainRunner(
        `a := [3][3]int{{1, 2}, {4, 5, 6}, {7}};
        fmt.Println(a)
        `,
      ).output,
    ).toEqual('[[1 2 0] [4 5 6] [7 0 0]]\n')
  })

  test('2D arrays work.', () => {
    expect(
      mainRunner(
        `a := [3][3]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        fmt.Println(a[1][2])
        fmt.Println(a[0][1])
        fmt.Println(a[2][1])
        fmt.Println(a[1][1])
        fmt.Println(a[0][2])
        fmt.Println(a[0][0])
        fmt.Println(a[2][2])
        fmt.Println(a[1][0])
        fmt.Println(a[2][0])
        fmt.Println(a)
        `,
      ).output,
    ).toEqual('6\n2\n8\n5\n3\n1\n9\n4\n7\n[[1 2 3] [4 5 6] [7 8 9]]\n')
  })

  test('3D arrays work.', () => {
    expect(
      mainRunner(
        `arr2D := [2][3][4]int{{{1, 2, 3, 11}, {4, 5, 6, 22}, {7, 8, 9, 33}}, {{10, 20, 30, 44}, {40, 50, 60, 55}, {70, 80, 90, 66}}}
        fmt.Println(arr2D)
        `,
      ).output,
    ).toEqual(
      '[[[1 2 3 11] [4 5 6 22] [7 8 9 33]] [[10 20 30 44] [40 50 60 55] [70 80 90 66]]]\n',
    )
  })

  test('2D arrays work with reassignments.', () => {
    expect(
      mainRunner(
        `a := [3][3]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        a[0][0] = 5
        a[0][1] = 6
        a[0][2] = 7
        a[1][0] = 8
        a[1][1] = 9
        a[1][2] = 10
        a[2][0] = 11
        a[2][1] = 12
        a[2][2] = 13
        fmt.Println(a[1][2])
        fmt.Println(a[0][1])
        fmt.Println(a[2][1])
        fmt.Println(a[1][1])
        fmt.Println(a[0][2])
        fmt.Println(a[0][0])
        fmt.Println(a[2][2])
        fmt.Println(a[1][0])
        fmt.Println(a[2][0])
        `,
      ).output,
    ).toEqual('10\n6\n12\n9\n7\n5\n13\n8\n11\n')
  })

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
