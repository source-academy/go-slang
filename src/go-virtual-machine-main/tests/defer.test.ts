import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

describe('Defer Type Checking', () => {
  test('Defer on non call should fail.', () => {
    const code = `
    defer "hello"
    `
    expect(mainRunner(code).error?.message).toEqual(
      'Expression in defer must be function call.',
    )
  })
}, 60000)

describe('Defer Execution', () => {
  test('Defer runs in order', () => {
    const code = `
    defer func(){ fmt.Println("!!!") }()
    defer func(){ fmt.Println("world") }()
    fmt.Println("hello")
    `
    expect(mainRunner(code).output).toEqual('hello\nworld\n!!!\n')
  })

  test('Defer argument is evaluated at that line with anonymous function', () => {
    const code = `
    a := 3
    defer func(b int) {
      fmt.Println(b)
    }(a)
    a = a + 345
    defer func(){ fmt.Println("world") }()
    fmt.Println("hello")
    `
    expect(mainRunner(code).output).toEqual('hello\nworld\n3\n')
  })

  test('Defer argument is evaluated at that line with calling a pre-declared function directly', () => {
    const code = `
    a := 3
    defer func(b int) {
      fmt.Println(b)
    }(a)
    a = a + 3
    defer fmt.Println(a)
    a = a + 345
    fmt.Println("hello")
    `
    expect(mainRunner(code).output).toEqual('hello\n6\n3\n')
  })

  test('Defer with wait groups work with a small number of goroutines', () => {
    const code = `
    package main
    import "fmt"
    import "sync"
    func main() {
      count := 0
      var wg sync.WaitGroup
      for i := 0; i < 30; i++ {
        wg.Add(1)
        go func() {
          defer wg.Done()
          count++
        }()
      }
      wg.Wait()
      fmt.Println(count)
    }
    `
    expect(codeRunner(code).output).toEqual('30\n')
  })

  test('Defer with wait groups work with a large number of goroutines', () => {
    const code = `
    package main
    import "fmt"
    import "sync"
    func main() {
      count := 0
      var wg sync.WaitGroup
      for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
          defer wg.Done()
          count++
        }()
      }
      wg.Wait()
      fmt.Println(count)
    }
    `
    expect(codeRunner(code).output).toEqual('1000\n')
  })

  test('Defer with mutex work with a small number of goroutines', () => {
    const code = `
    package main
    import "fmt"
    import "sync"
    func main() {
      count := 0
      var mu sync.Mutex
      for i := 0; i < 10; i++ {
        go func() {
          mu.Lock()
          defer mu.Unlock()
          count++
          fmt.Println(count)
        }()
      }
    }
    `
    expect(codeRunner(code).output).toEqual('1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n')
  })
}, 60000)
