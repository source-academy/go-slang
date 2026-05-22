import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Nested anonymous structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Person struct {
              Name string
              Age int
            }
            Code int
          }{
            struct {
              Name string
              Age int
            }{
              "Jack",
              32,
            },
            1345,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Jack 32} 1345}\n')
  })

  test('Modifying inner field of an anonymous nested struct', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Person struct {
              Name string
              Age int
            }
            Code int
          }{
            struct {
              Name string
              Age int
            }{
              "Jack",
              32,
            },
            1345,
          }
          a.Person.Name = "andy"
          a.Person.Age = 55
          a.Code = 9999
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{andy 55} 9999}\n')
  })

  test('Nested declared structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Person struct {
            Name string
            Age int
          }
          Code int
        }

        func main() {
          a := A{
            Person: struct{
              Name string
              Age int
            }{
              "Alice",
              25,
            },
            Code: 3934,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Alice 25} 3934}\n')
  })

  test('Modifying inner field of a declared nested struct', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Person struct {
            Name string
            Age int
          }
          Code int
        }

        func main() {
          a := A{
            Person: struct{
              Name string
              Age int
            }{
              "Alice",
              25,
            },
            Code: 3934,
          }
          a.Person.Name = "Sammy"
          a.Person.Age = 35
          a.Code = 1241
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Sammy 35} 1241}\n')
  })

  test('Nesting declared structs within another declared struct work with a declared type as a field', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type a int

        type Person struct {
          Name string
          Age a
        }

        type A struct {
          Person Person
          Code int
        }

        func main() {
          a := A{
            Person: struct{
              Name string
              Age a
            }{
              "Alice",
              25,
            },
            Code: 3934,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Alice 25} 3934}\n')
  })

  test('Nesting declared structs within another declared struct work with only primitives as fields', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Person struct {
          Name string
          Age int
        }

        type A struct {
          Person Person
          Code int
        }

        func main() {
          a := A{
            Person: {"Alice", 25},
            Code: 3934,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Alice 25} 3934}\n')
  })

  test('Modifying inner field of a declared nested struct with inner struct declared separately', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Person struct {
          Name string
          Age int
        }

        type A struct {
          Person Person
          Code int
        }

        func main() {
          a := A{
            Person: {"Alice", 25},
            Code: 3934,
          }
          a.Person.Name = "Sammy"
          a.Person.Age = 35
          a.Code = 1241
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Sammy 35} 1241}\n')
  })

  test('Nesting arrays within another declared struct work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2]string
          Code int
        }

        func main() {
          a := A{
            [2]string{"H", "A"},
            3934,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[H A] 3934}\n')
  })

  test('Modifying array elements within another declared struct work with array at the start', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [3]string
          Code int
        }

        func main() {
          a := A{
            [3]string{"H", "A", "E"},
            3934,
          }
          a.Names[1] = "B"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[H B E] 3934}\n')
  })

  test('Modifying array elements within another declared struct work with array at the middle', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [3]string
          Phone int
        }

        func main() {
          a := A{
            3934,
            [3]string{"H", "A", "E"},
            604935,
          }
          a.Names[1] = "B"
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{3934 [H B E] 604935}\n')
  })

  test('Array of declared structs work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          a := [2]A{{"dd", 123}, {"ee", 352}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{dd 123} {ee 352}]\n')
  })

  test('Modifying structs in arrays work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          a := [2]A{{"dd", 123}, {"ee", 352}}
          a[1].Name = "ff"
          a[0].Code = 463
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{dd 463} {ff 352}]\n')
  })

  test('Array of declared structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          var a [2]A = [2]A{{"dd", 123}, {"ee", 352}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{dd 123} {ee 352}]\n')
  })

  test('Modifying structs in arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name string
          Code int
        }

        func main() {
          var a [2]A = [2]A{{"dd", 123}, {"ee", 352}}
          a[1].Name = "ff"
          a[0].Code = 463
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{dd 463} {ff 352}]\n')
  })

  test('Array of declared structs containing arrays work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2]string
          Code int
        }

        func main() {
          var a [2]A = [2]A{{[2]string{"dd"}, 123}, {[2]string{"ee"}, 352}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{[dd ] 123} {[ee ] 352}]\n')
  })

  test('Array of declared structs containing arrays work work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2]string
          Code int
        }

        func main() {
          var a [2]A = [2]A{{[2]string{"dd"}, 123}, {[2]string{"ee"}, 352}}
          a[1].Names[1] = "ff"
          a[0].Code = 463
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{[dd ] 463} {[ee ff] 352}]\n')
  })

  test('Array of declared structs containing arrays as the later field work', () => {
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
          fmt.Println(a)
        }
      `).output,
    ).toEqual('[{123 [dd ]} {352 [ee ]}]\n')
  })
})
