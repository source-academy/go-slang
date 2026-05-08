import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from '../utility'

describe('Struct tests', () => {
  test('Single field line works with key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
        }

        func main() {
          var a A = A{Age: 30}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{30}\n')
  })

  test('Multiple (2) field lines works with key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{Name: "Tom", Age: 34}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{34 Tom}\n')
  })

  test('Multiple (3) field lines works with key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
          Male bool
        }

        func main() {
          var a A = A{Name: "Tom", Male: true, Age: 34}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{34 Tom true}\n')
  })

  test('Multiple (3) field lines works without key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
          Male bool
        }

        func main() {
          var a A = A{56, "Jerry", true}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{56 Jerry true}\n')
  })

  test('Multiple fields in a single line works with key', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }

        func main() {
          var a A = A{Age2: 695, Age: 34}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{34 695}\n')
  })

  test('Multiple fields in a single line works with key across multiple lines', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }

        func main() {
          var a A = A{
            Age2: 695,
            Age: 34,
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{34 695}\n')
  })

  test(`Multiple fields in a single line works with key across multiple lines
    with closing curly braces at the same line as the last field`, () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }

        func main() {
          var a A = A{
            Age2: 695,
            Age: 34}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{34 695}\n')
  })

  test('Multiple fields in a single line works with key in same order', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }

        func main() {
          var a A = A{Age: 644, Age2: 13}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{644 13}\n')
  })

  test('Partial assignment on typed structs work with keys', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{Name: "Tales"}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0 Tales}\n')
  })

  test('Partial assignment on typed structs work with keys in the same order', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{Age: 45}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{45 }\n')
  })

  test('Non-existent keys should fail', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age int
          Name string
        }

        func main() {
          var a A = A{Age4: 45}
          fmt.Println(a)
        }
      `).error?.type,
    ).toEqual('compile')
  })
})
