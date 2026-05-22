import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Anonymous structs work with keys', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
	        p := struct {
		        x int
		        y float64
            z bool
	        }{
		        y: 2.5,
		        x: 3,
            z: true,
	        }
	        fmt.Println(p)
        }
      `).output,
    ).toEqual('{3 2.5 true}\n')
  })

  test('Nested anonymous structs work with keys on outer layer', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Code int
            Person struct {
              Name string
              Age int
            }
          }{
            Code: 456321,
            Person: struct {
              Name string
              Age int
            }{
              "Jack",
              32,
            },
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{456321 {Jack 32}}\n')
  })

  test('Nested declared type structs work with keys on outer layer', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Person struct {
          Name string
          Age float64
        }

        type A struct {
          Person Person
          Code int
        }

        func main() {
          a := A{
            Code: 3934,
            Person: {"Alice", 25.5},
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{Alice 25.5} 3934}\n')
  })

  test('Structs with 1 field work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x int
        }

        func main() {
	        fmt.Println(P{2})
        }
      `).output,
    ).toEqual('{2}\n')
  })

  test('Structs with 2 fields work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x, y int
        }

        func main() {
	        fmt.Println(P{2, 5})
        }
      `).output,
    ).toEqual('{2 5}\n')
  })

  test('Structs with 2 fields work when supplied directly as arguments with keys', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x, y int
        }

        func main() {
	        fmt.Println(P{y: 2, x: 5})
        }
      `).output,
    ).toEqual('{5 2}\n')
  })

  test('Structs with 2 fields work when supplied directly as multiple arguments with keys', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x, y int
        }

        func main() {
	        fmt.Println(P{y: 2, x: 5}, P{y: 4, x: 10}, P{x: 3, y: 32})
        }
      `).output,
    ).toEqual('{5 2} {10 4} {3 32}\n')
  })

  test('Structs with 2 fields work when supplied directly as multiple arguments with or without keys', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x, y int
        }

        func main() {
	        fmt.Println(P{y: 2, x: 5}, P{4, 11}, P{x: 3, y: 32})
        }
      `).output,
    ).toEqual('{5 2} {4 11} {3 32}\n')
  })

  test('Structs with 3 fields work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x, y int
          z string
        }

        func main() {
	        fmt.Println(P{2, 5, "vhe"})
        }
      `).output,
    ).toEqual('{2 5 vhe}\n')
  })

  test('Pointers to structs with 1 field work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x int
        }

        func main() {
	        fmt.Println(&P{2})
        }
      `).output,
    ).toEqual('&{2}\n')
  })

  test('Pointers to structs with 2 fields work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
            x, y int
        }

        func main() {
	        fmt.Println(&P{2, 5})
        }
      `).output,
    ).toEqual('&{2 5}\n')
  })

  test('Pointers to structs with 3 fields work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
            x, y int
            z string
        }

        func main() {
	        fmt.Println(&P{2, 5, "vhe"})
        }
      `).output,
    ).toEqual('&{2 5 vhe}\n')
  })

  test('Pointers to structs with 3 keyed fields work when supplied directly as arguments', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
            x, y int
            z string
        }

        func main() {
	        fmt.Println(&P{y: 2, x: 5, z: "vhe"})
        }
      `).output,
    ).toEqual('&{5 2 vhe}\n')
  })

  test('Field of declared type passes when using literal untyped values', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Years int
        type Person struct {
          Age Years
          Name string
        }

        func main() {
          var a Person = Person{30, "John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30 John}\n')
  })

  test('Field of declared type passes when using literal untyped values with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Years int
        type Person struct {
          Age Years
          Name string
        }

        func main() {
          a := Person{30, "John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30 John}\n')
  })

  test('Field of declared type passes when using literal untyped values with key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Years int
        type Person struct {
          Age Years
          Name string
        }

        func main() {
          var a Person = Person{Age: 30, Name: "John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30 John}\n')
  })

  test('Field of declared type passes when using literal untyped values with key with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Years int
        type Person struct {
          Age Years
          Name string
        }

        func main() {
          a := Person{Age: 30, Name: "John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30 John}\n')
  })

  test('Field of declared type passes when using literal untyped values for value modification', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type Years int
        type Person struct {
          Age Years
          Name string
        }

        func main() {
          var a Person = Person{30, "John"}
          a.Age = 40
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{40 John}\n')
  })

  test('Single field line with multiple fields work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }

        func main() {
          var a A
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0 0}\n')
  })

  test('Single field line works', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          var a A
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0}\n')
  })

  test('Multiple (2) field lines work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0 }\n')
  })

  test('Multiple (3) field lines work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Underage bool
          Name string
          Age int
        }

        func main() {
          var a A
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{false  0}\n')
  })
})
