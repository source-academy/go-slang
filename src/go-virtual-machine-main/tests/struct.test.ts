import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Struct tests', () => {
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

  test('Assignment of anonymous struct values work', () => {
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

  test('Assignment of anonymous struct values work', () => {
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

  test('Partial assignment of typed struct values with different type should work', () => {
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

  test('Partial assignment of typed struct values with different type should work', () => {
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

  test('Partial assignment of typed struct values with different type with shorthand should work', () => {
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

  test('Partial assignment of typed struct values with different type with shorthand should work', () => {
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

  test('Reassignment of field values work', () => {
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

  test('Reassignment of field values work', () => {
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

  test('Printing of structs after reassignment work', () => {
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

  test('Printing of structs after reassignment work', () => {
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

  test('Reassignment of field values work with shorthand', () => {
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

  test('Reassignment of field values work with shorthand', () => {
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

  test('Printing of structs after reassignment work with shorthand', () => {
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

  test('Printing of structs after reassignment work with shorthand', () => {
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
          a.Age = 934
          a.Name = "Byebye"
        }
        
        func main() {
          a := A{}
          a.Name = "Jess"
          help(a)
          fmt.Println(a)
        }
      `).output,
    ).toEqual('934\nByebye\n{0 Jess}\n')
  })
})
