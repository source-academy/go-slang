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

  test('Assignment of typed struct values work', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        type A struct {
          Age, Age2 int
        }
        
        func main() {
          var a A = A{2, 5}
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{2 5}\n')
  })
})
