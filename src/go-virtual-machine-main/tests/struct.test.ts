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
    ).toEqual('[{[[34.25 0] [94.25 4.25]] 234} {[[11.5 34.5] [33.25 33.5]] 999}]\n')
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
    ).toEqual('[{234 [[34.25 0] [94.25 4.25]]} {999 [[11.5 34.5] [33.25 33.5]]}]\n')
  })

  // Large test cases due to heavy recursion during parsing, requires PeggyJS parser optimisation
  /*
  test('Declared structs containing 2D array work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2][2]string
          Code int
        }

        type B struct {
          Person A
          Age int
        }
        
        func main() {
          var a B = B{A{[2][2]string{{"A", "Z"}, {"K", "I"}}, 485}, 39}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{[[A Z] [K I]] 485} 39}\n')
  })

  test('Modifying declared structs containing 2D array work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Names [2][2]string
          Code int
        }

        type B struct {
          Person A
          Age int
        }
        
        func main() {
          var a B = B{A{[2][2]string{{"A", "Z"}, {"K", "I"}}, 485}, 39}
          a.Person.Names[1][0] = "ff"
          a.Person.Names[0][1] = "gg"
          a.Person.Names[0][0] = "ss"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{[[ss gg] [ff I]] 927} 53}\n')
  })

  test('Declared structs containing 2D array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2][2]string
        }

        type B struct {
          Person A
          Age int
        }
        
        func main() {
          var a B = B{A{285, [2][2]string{{"A", "Z"}, {"K", "I"}}}, 39}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{285 [[A Z] [K I]]} 39}\n')
  })

  test('Modifying declared structs containing 2D array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2][2]string
        }

        type B struct {
          Person A
          Age int
        }
        
        func main() {
          var a B = B{A{485, [2][2]string{{"A", "Z"}, {"K", "I"}}}, 39}
          a.Person.Names[1][0] = "ff"
          a.Person.Names[0][1] = "gg"
          a.Person.Names[0][0] = "ss"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{{927 [[ss gg] [ff I]]} 53}\n')
  })

  test('Modifying declared structs as a later field containing 2D array as a later field work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2][2]string
        }

        type B struct {
          Age int
          Person A
        }
        
        func main() {
          var a B = B{39, A{485, [2][2]string{{"A", "Z"}, {"K", "I"}}}}
          a.Person.Names[1][0] = "ff"
          a.Person.Names[0][1] = "gg"
          a.Person.Names[0][0] = "ss"
          a.Person.Code = 927
          a.Age = 53
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{53 {927 [[ss gg] [ff I]]}}\n')
  })

  test('Declared structs of arrays containing structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        type B struct {
          Person [2]A
          Ages [2]int
        }
        
        func main() {
          var a B = B{[2]A{{485, [2]string{"A", "Z"}},
            {989, [2]string{"Art", "Zuf"}}}, [2]int{39, 42}}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[{485 [A Z]} {989 [Art Zuf]}] [39 42]}\n')
  })

  test('Declared structs of arrays containing structs work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type A struct {
          Code int
          Names [2]string
        }

        type B struct {
          Person [2]A
          Ages [2]int
        }
        
        func main() {
          var a B = B{[2]A{{485, [2]string{"A", "Z"}},
            {989, [2]string{"Art", "Zuf"}}}, [2]int{39, 42}}
          a.Person[0].Names[1] = "Hello"
          a.Person[1].Code = 231
          a.Ages[1] = 33
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{[{485 [A Hello]} {231 [Art Zuf]}] [39 33]}\n')
  })
    */
})
