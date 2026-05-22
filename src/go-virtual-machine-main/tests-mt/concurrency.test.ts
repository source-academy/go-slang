import { describe, expect, test } from 'vitest'

import {
  codeRunnerMT as codeRunner,
  mainRunnerMT as mainRunner,
} from './utility'

describe('Concurrency Check (MT)', () => {
  test('Basic Check for small loops', () => {
    // With time_quantum=1000, main completes all instructions before any goroutine runs
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
    ).toEqual('Done\n')
  })
  test('Basic Check for large loops', () => {
    // With time_quantum=1000, main's 50-iteration loop fits comfortably within one quantum
    // so no goroutine runs before main's fmt.Println
    expect(
      mainRunner(`
          a := 0
          for i := 0; i < 5; i++ {
            go func(){
              a+=1
            }()
          }
          a+=1
          for j := 0; j < 50 ; j++ {
          }
          fmt.Println(a)`).output,
    ).toEqual('1\n')
  })
  test('Race Cond', () => {
    // With time_quantum=1000, each goroutine's 40-iteration loop fits within one quantum
    // so each goroutine runs atomically — no lost increments, result is always 200
    expect(
      mainRunner(`
      a := 0
      for i := 0; i < 5; i++ {
        go func(){
          for j := 0; j < 40 ; j++ {
            a += 1
          }
        }()
      }
        for j := 0; j < 1000 ; j++ {
        }
      fmt.Println(a)`).output,
    ).toEqual('200\n')
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
    expect(codeRunner(code).output).toEqual('hello\n3\n')
  })

  test(`Arguments supplied to go statements are evaluated at that line
    with calling a pre-declared function`, () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 3
      go fmt.Println(a)
      a = a + 345
      go fmt.Println(a)
      a = a + 1000
      fmt.Println("hello")
    }
    `
    // With time_quantum=1000, main completes before goroutines get scheduled
    expect(codeRunner(code).output).toEqual('hello\n')
  })
})
