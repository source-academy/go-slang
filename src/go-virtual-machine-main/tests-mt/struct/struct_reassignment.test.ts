import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Reassignment of field values work for structs with 1 field', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          var a A = A{45}
          a.Age = 40
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{40}\n')
  })

  test('Reassignment of field values work for structs with 2 fields', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{45, "Goh"}
          a.Name = "Sally"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{45 Sally}\n')
  })

  test('Printing of field values after reassignment work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          var a A = A{45}
          a.Age = 40
          fmt.Println(a.Age)
        }
      `).output,
    ).toEqual('40\n')
  })

  test('Printing of structs after reassignment work with partial initialisation', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{Name: "SA"}
          a.Age = 40
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{40 SA}\n')
  })

  test('Printing of structs after reassignment work without initialisation', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{}
          a.Name = "Jess"
          fmt.Println(a.Age)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('0\n{0 Jess}\n')
  })

  test('Reassignment to non-existent field should throw compile error', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{}
          a.Ag = 0
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test('Reassignment of field values work with shorthand for structs with 1 field', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          a := A{45}
          a.Age = 40
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{40}\n')
  })

  test('Reassignment of field values work with shorthand for structs with 2 fields', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          a := A{45, "Goh"}
          a.Name = "Sally"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{45 Sally}\n')
  })

  test('Printing of field values after reassignment work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          a := A{45}
          a.Age = 40
          fmt.Println(a.Age)
        }
      `).output,
    ).toEqual('40\n')
  })

  test('Printing of structs after reassignment work with shorthand with partial initialisation', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          a := A{Name: "SA"}
          a.Age = 40
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{40 SA}\n')
  })

  test('Printing of structs after reassignment work with shorthand with no initialisation', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          a := A{}
          a.Name = "Jess"
          fmt.Println(a.Age)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('0\n{0 Jess}\n')
  })

  test('Shorthand syntax to reassign field value should throw compile or parse error', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          a := A{}
          a.Name := "Jess"
        }
      `).error?.type,
    ).toMatch(/(compile)|(parse)/)
  })

  test('Passing struct field values to functions should not change struct field values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func help(a int, b string) {
          a = 934
          b = "Byebye"
          fmt.Println(a)
          fmt.Println(b)
        }

        func main() {
          a := A{}
          a.Name = "Jess"
          help(a.Age, a.Name)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('934\nByebye\n{0 Jess}\n')
  })

  test('Passing struct field values to goroutines should not change struct field values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func help(a int, b string) {
          a = 934
          b = "Byebye"
          fmt.Println(a)
          fmt.Println(b)
        }

        func main() {
          a := A{}
          a.Name = "Jess"
          fmt.Println(a)
          go help(a.Age, a.Name)
          a.Age = 53
          for i := 0; i < 99; i++ {
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0 Jess}\n934\nByebye\n{53 Jess}\n')
  })

  test('Passing structs to functions should also not change struct field values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func help(a A) {
          fmt.Println(a)
          a.Age = 934
          a.Name = "Byebye"
          fmt.Println(a)
        }

        func main() {
          a := A{345}
          a.Name = "Jess"
          help(a)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{345 Jess}\n{934 Byebye}\n{345 Jess}\n')
  })

  test('Passing structs to goroutines should also not change struct field values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func help(a A) {
          fmt.Println(a)
          a.Age = 934
          a.Name = "Byebye"
          fmt.Println(a)
        }

        func main() {
          a := A{345}
          go help(a)
          a.Name = "Jess"
          fmt.Println(a)
          for i := 0; i < 99; i++ {
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{345 Jess}\n{345 }\n{934 Byebye}\n{345 Jess}\n')
  })
})
