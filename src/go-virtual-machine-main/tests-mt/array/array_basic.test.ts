import { describe, expect, test } from 'vitest'

import {
  codeRunnerMT as codeRunner,
  mainRunnerMT as mainRunner,
} from '../utility'

describe('Array Execution', () => {
  test('Arrays with 1 element work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println([1]int{3})
        }
      `).output,
    ).toEqual('[3]\n')
  })

  test('Arrays with 2 elements work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println([2]float64{5.5})
        }
      `).output,
    ).toEqual('[5.5 0]\n')
  })

  test('Arrays with 3 elements work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println([3]bool{false, true, true})
        }
      `).output,
    ).toEqual('[false true true]\n')
  })

  test('Pointers to arrays with 1 element work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println(&[1]int{3})
        }
      `).output,
    ).toEqual('&[3]\n')
  })

  test('Pointers to arrays with 2 elements work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println(&[2]float64{5.5})
        }
      `).output,
    ).toEqual('&[5.5 0]\n')
  })

  test('Pointers to arrays with 3 elements work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        fmt.Println(&[3]bool{false, true, true})
        }
      `).output,
    ).toEqual('&[false true true]\n')
  })

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
})
