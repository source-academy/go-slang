import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Modifying array of declared structs containing arrays as the later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        func main() {
          var a [2]A = [2]A{{123, [2]string{"dd"}}, {352, [2]string{"ee"}}}
          a[1].Names[1] = "ff"
          a[0].Code = 463
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{463 [dd ]} {352 [ee ff]}]\n')
  })

  test('Declared structs containing array work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2]string
          Code int
        }

        type B struct {
          Person A
          Age int
        }

        func main() {
          var a B = B{A{[2]string{"A", "Z"}, 485}, 39}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{[A Z] 485} 39}\n')
  })

  test('Modifying declared structs containing array work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2]string
          Code int
        }

        type B struct {
          Person A
          Age int
        }

        func main() {
          var a B = B{A{[2]string{"A", "Z"}, 485}, 39}
          a.Person.Names[1] = "ff"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{[A ff] 927} 53}\n')
  })

  test('Declared structs containing array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        type B struct {
          Person A
          Age int
        }

        func main() {
          var a B = B{A{485, [2]string{"A", "Z"}}, 39}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{485 [A Z]} 39}\n')
  })

  test('Modifying declared structs containing array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        type B struct {
          Person A
          Age int
        }

        func main() {
          var a B = B{A{485, [2]string{"A", "Z"}}, 39}
          a.Person.Names[1] = "ff"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{927 [A ff]} 53}\n')
  })

  test('Modifying declared structs as a later field containing array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        type B struct {
          Age int
          Person A
        }

        func main() {
          var a B = B{39, A{485, [2]string{"A", "Z"}}}
          a.Person.Names[1] = "ff"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{53 {927 [A ff]}}\n')
  })

  test('Nesting 2D arrays within another declared struct work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2][2]string
          Code int
        }

        func main() {
          a := A{
            [2][2]string{{"H", "A"}, {"B", "C"}},
            3934,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[[H A] [B C]] 3934}\n')
  })

  test('Modifying array elements within another declared struct work with 2D array at the start', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [3][2]string
          Code int
        }

        func main() {
          a := A{
            [3][2]string{{"H", "A"}, {"E", "B"}, {"C", "F"}},
            3934,
          }
          a.Names[1][1] = "G"
          a.Names[2][0] = "O"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[[H A] [E G] [O F]] 3934}\n')
  })

  test('Modifying array elements within another declared struct work with 2D array at the middle', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [3][2]string
          Phone int
        }

        func main() {
          a := A{
            3934,
            [3][2]string{{"H", "A"}, {"E", "B"}, {"C", "F"}},
            604935,
          }
          a.Names[1][1] = "G"
          a.Names[2][0] = "O"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{3934 [[H A] [E G] [O F]] 604935}\n')
  })

  test('2D array of declared structs work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          a := [2][2]A{{{"dd", 123}, {"ee", 352}}, {{"ff", 144}, {"gg", 222}}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[{dd 123} {ee 352}] [{ff 144} {gg 222}]]\n')
  })

  test('Modifying structs in 2D arrays work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          a := [2][2]A{{{"dd", 123}, {"ee", 352}}, {{"ff", 144}, {"gg", 222}}}
          a[1][1].Name = "ff"
          a[0][0].Code = 463
          a[0][1].Name = "aa"
          a[1][0].Code = 567
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[{dd 463} {aa 352}] [{ff 567} {ff 222}]]\n')
  })

  test('2D array of declared structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          var a [2][2]A = [2][2]A{{{"dd", 123}, {"ee", 352}}, {{"ff", 144}, {"gg", 222}}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[{dd 123} {ee 352}] [{ff 144} {gg 222}]]\n')
  })

  test('Modifying structs in 2D arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          var a [2][2]A = [2][2]A{{{"dd", 123}, {"ee", 352}}, {{"ff", 144}, {"gg", 222}}}
          a[1][1].Name = "ff"
          a[0][0].Code = 463
          a[0][1].Name = "aa"
          a[1][0].Code = 567
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[[{dd 463} {aa 352}] [{ff 567} {ff 222}]]\n')
  })

  test('Array of declared structs containing 2D arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Weight [2][2]float64
          Code int
        }

        func main() {
          var a [2]A = [2]A{{[2][2]float64{{34.25}}, 123}, {[2][2]float64{{11.5, 32.5}, {33.25, 33.5}}, 352}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{[[34.25 0] [0 0]] 123} {[[11.5 32.5] [33.25 33.5]] 352}]\n')
  })

  test('Modifying array of declared structs containing 2D arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Weight [2][2]float64
          Code int
        }

        func main() {
          var a [2]A = [2]A{{[2][2]float64{{34.25}}, 123}, {[2][2]float64{{11.5, 32.5}, {33.25, 33.5}}, 352}}
          a[0].Weight[1][1] = 4.25
          a[0].Weight[1][0] = 94.25
          a[0].Code = 234
          a[1].Weight[0][1] = 34.5
          a[1].Code = 999
          fmt.Println(a)
        }
      `).output,
    ).toEqual(
      '[{[[34.25 0] [94.25 4.25]] 234} {[[11.5 34.5] [33.25 33.5]] 999}]\n',
    )
  })

  test('Array of declared structs containing 2D arrays as the later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Weight [2][2]float64
        }

        func main() {
          var a [2]A = [2]A{{123, [2][2]float64{{34.25}}}, {352, [2][2]float64{{11.5, 32.5}, {33.25, 33.5}}}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{123 [[34.25 0] [0 0]]} {352 [[11.5 32.5] [33.25 33.5]]}]\n')
  })

  test('Modifying array of declared structs containing 2D arrays as the later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Weight [2][2]float64
        }

        func main() {
          var a [2]A = [2]A{{123, [2][2]float64{{34.25}}}, {352, [2][2]float64{{11.5, 32.5}, {33.25, 33.5}}}}
          a[0].Weight[1][1] = 4.25
          a[0].Weight[1][0] = 94.25
          a[0].Code = 234
          a[1].Weight[0][1] = 34.5
          a[1].Code = 999
          fmt.Println(a)
        }
      `).output,
    ).toEqual(
      '[{234 [[34.25 0] [94.25 4.25]]} {999 [[11.5 34.5] [33.25 33.5]]}]\n',
    )
  })
})
