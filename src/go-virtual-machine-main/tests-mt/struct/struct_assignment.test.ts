import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Multiple (3) field lines with mixed number of fields work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name, Family string
          Age int
        }

        func main() {
          var a A
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{  0}\n')
  })

  test('Assignment of anonymous struct values work with multiple fields in a line of code', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Age, Age2 int
          }{1, 3}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{1 3}\n')
  })

  test('Assignment of anonymous struct values work with multiple line of codes defining fields', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Age int
            Age2 int
          }{1, 3}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{1 3}\n')
  })

  test('Assignment of anonymous struct values with different types work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Age int
            Name string
          }{30, "John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30 John}\n')
  })

  test('Assignment of typed struct values work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          var a A = A{2, 5}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{2 5}\n')
  })

  test('Partial assignment of typed struct values work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          var a A = A{57}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{57 0}\n')
  })

  test('Partial assignment of typed struct values with wrong type should throw error', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          var a A = A{"57"}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test(`Partial assignment of typed struct values of different types
    using the wrong type should throw error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age int
            Name string
          }
          var a A = A{"57"}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test('Partial assignment of typed struct values with different type should work with struct type declared locally', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Name string
            Age int
          }
          var a A = A{"John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{John 0}\n')
  })

  test('Partial assignment of typed struct values with different type should work with struct type declared globally', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name, Family string
          Age int
        }

        func main() {
          var a A = A{"Tim"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{Tim  0}\n')
  })

  test('Assignment of typed struct values work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          a := A{2, 5}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{2 5}\n')
  })

  test('Partial assignment of typed struct values work with shorthand', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          a := A{57}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{57 0}\n')
  })

  test('Partial assignment of typed struct values with wrong type with shorthand should throw error', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age, Age2 int
          }
          a := A{"57"}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test(`Partial assignment of typed struct values of different types
    using the wrong type with shorthand should throw error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Age int
            Name string
          }
          a := A{"57"}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test('Partial assignment of typed struct values with different type with shorthand should work with struct type declared locally', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          type A struct {
            Name string
            Age int
          }
          a := A{"John"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{John 0}\n')
  })

  test('Partial assignment of typed struct values with different type with shorthand should work with struct type declared globally', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Name, Family string
          Age int
        }

        func main() {
          a := A{"Tim"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{Tim  0}\n')
  })

  test(`Partial assignment of anonymous struct values of different types
    using the wrong type should throw error`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Age int
            Name string
          }{"Test"}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })

  test('Anonymous struct without initialised values work', () => {
    // anonymous structs require exactly all or no fields to be
    // initialised together when used without keys
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct{
            Name string
            Age int
          }{}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{ 0}\n')
  })
})
