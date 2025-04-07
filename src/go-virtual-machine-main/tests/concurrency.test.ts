import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

describe('Concurrency Check', () => {
  test('Basic Check for small loops', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"
        func add(a int){
          fmt.Println(a);
        }

        func main() {
          for i := 0; i < 10; i++ {
            go add(i);
          }
          fmt.Println("Done");
        }
      `).output,
    ).toEqual('0\n1\n2\n3\n4\n5\n6\n7\n8\n9\nDone\n')
  })
  test('Basic Check for large loops', () => {
    expect(
      mainRunner(`
          a := 0
          for i := 0; i < 5; i++ {
            go func(){
              a+=1
            }()
          }
          a+=1
          for j := 0; j < 100 ; j++ {
          }
          fmt.Println(a)`).output,
    ).toEqual('6\n')
  })
  test('Race Cond', () => {
    expect(
      parseInt(
        mainRunner(`
      a := 0
      for i := 0; i < 5; i++ {
        go func(){
          for j := 0; j < 100 ; j++ {
            a += 1
          }
        }()
      }
        for j := 0; j < 1000 ; j++ {
        }
      fmt.Println(a)`).output || '100',
      ),
    ).toBeLessThan(500)
  })

  test(`Arguments supplied to go statements are evaluated at that line
    with calling an anonymous function`, () => {
    const code = `
    package main
    import "fmt"
    import "sync"

    func main() {
      a := 3
      var wg sync.WaitGroup
      wg.Add(1)
      go func(b int) {
        fmt.Println(b)
        wg.Done()
      }(a)
      a = a + 345
      fmt.Println("hello")
      wg.Wait()
    }
    `
    expect(codeRunner(code).output).toEqual('3\nhello\n')
  })

  test(`Arguments supplied to go statements are evaluated at that line
    with calling a pre-declared function`, () => {
    const code = `
    package main
    import "fmt"
    import "sync"

    func main() {
      a := 3
      go fmt.Println(a)
      a = a + 345
      go fmt.Println(a)
      a = a + 1000
      fmt.Println("hello")
    }
    `
    expect(codeRunner(code).output).toEqual('3\nhello\n')
  })
})
