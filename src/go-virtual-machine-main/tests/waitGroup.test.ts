import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Wait Group Type Checking', () => {
  test('Wait groups should not work without importing sync.', () => {
    const code = `
    package main

    func main() {
      var a sync.WaitGroup
    }
    `
    expect(codeRunner(code).error?.message).toEqual('Variable sync not found')
  })

  test('Assinging a variable of another type to WaitGroup should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.WaitGroup = "hello"
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Cannot use string as sync.WaitGroup in variable declaration',
    )
  })

  test('Calling .Add() with too many arguments should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.WaitGroup
      a.Add(1, 2)
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Too many arguments in function call\nhave (int64, int64)\nwant (int64)',
    )
  })
})

describe('Wait Group Execution', () => {
  test('Making the WaitGroup counter negative by adding should panic.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.WaitGroup
      a.Add(-5)
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Execution Error: sync: negative WaitGroup counter.',
    )
  })

  test('Making the WaitGroup counter negative by Done should panic.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.WaitGroup
      a.Add(1)
      a.Done()
      a.Done()
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Execution Error: sync: negative WaitGroup counter.',
    )
  })

  test('Waiting works with a small number of goroutines.', () => {
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
          count++
          wg.Done()
        }()
      }
      wg.Wait()
      fmt.Println(count)
    }
    `
    expect(codeRunner(code).output).toEqual('30\n')
  })

  test('Waiting works with a large number of goroutines.', () => {
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
          count++
          wg.Done()
        }()
      }
      wg.Wait()
      fmt.Println(count)
    }
    `
    expect(codeRunner(code).output).toEqual('1000\n')
  })
})
