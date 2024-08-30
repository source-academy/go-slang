import { describe, expect, test } from 'vitest'

import { runCode } from '../src/virtual-machine'

describe('Wait Group Type Checking', () => {
  test('Wait groups should not work without importing sync.', () => {
    const code = `
    package main

    func main() {
      var a sync.WaitGroup
    }
    `
    expect(runCode(code, 2048).error?.message).toEqual(
      'Variable sync not found',
    )
  })

  test('Assinging a variable of another type to WaitGroup should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.WaitGroup = "hello"
    }
    `
    expect(runCode(code, 2048).error?.message).toEqual(
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
    expect(runCode(code, 2048).error?.message).toEqual(
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
    expect(runCode(code, 2048).error?.message).toEqual(
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
    expect(runCode(code, 2048).error?.message).toEqual(
      'Execution Error: sync: negative WaitGroup counter.',
    )
  })

  test('Waiting works.', () => {
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
    expect(runCode(code, 2048).output).toEqual('1000\n')
  })
})
