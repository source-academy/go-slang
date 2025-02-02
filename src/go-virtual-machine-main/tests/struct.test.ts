import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('test', () => {
  test('test', () => {
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
    ).toEqual('[0 0]\n')
  })

  test('test', () => {
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
    ).toEqual('[0 ]\n')
  })

  test('test', () => {
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
    ).toEqual('[false  0]\n')
  })

  test('test', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
          a := struct {
            Age, Age2 int
          }
          fmt.Println(a)
        }
      `).output,
    ).toEqual('{0 0}')
  })
})
