import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Mutex Type Checking', () => {
  test('Mutex should not work without importing sync.', () => {
    const code = `
    package main

    func main() {
      var a sync.Mutex
    }
    `
    expect(codeRunner(code).error?.message).toEqual('Variable sync not found')
  })

  test('Assinging a variable of another type to Mutex should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.Mutex = "hello"
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Cannot use string as sync.Mutex in variable declaration',
    )
  })

  test('Calling .Lock() with too many arguments should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.Mutex
      a.Lock(1, 2)
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Too many arguments in function call\nhave (int64, int64)\nwant ()',
    )
  })

  test('Calling invalid functions should fail.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.Mutex
      a.Add(1)
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      '.Add undefined (type sync.Mutex has no field or method Add)',
    )
  })
})

describe('Wait Group Execution', () => {
  test('Unlocking an unlocked mutex should panic.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.Mutex
      a.Unlock()
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Execution Error: sync: unlock of unlocked mutex',
    )
  })

  test('Double locking the same mutex should block.', () => {
    const code = `
    package main
    import "sync"
    func main() {
      var a sync.Mutex
      a.Lock()
      a.Lock()
    }
    `
    expect(codeRunner(code).error?.message).toEqual(
      'Execution Error: all goroutines are asleep - deadlock!',
    )
  })

  test('Mutex works without unlocking.', () => {
    const code = `
    package main
    import "fmt"
    import "sync"
    func main() {
      var mu sync.Mutex
      mu.Lock()
      fmt.Println("Done")
    }
    `
    expect(codeRunner(code).output).toEqual('Done\n')
  })

  test('Mutex works with unlocking.', () => {
    const code = `
    package main
    import "fmt"
    import "sync"
    func main() {
      var mu sync.Mutex
      mu.Lock()
      mu.Unlock()
      fmt.Println("Done")
    }
    `
    expect(codeRunner(code).output).toEqual('Done\n')
  })

  test('Mutex works with multiple goroutines', () => {
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
          count++
          fmt.Println(count)
          mu.Unlock()
        }()
      }
    }
    `
    expect(codeRunner(code).output).toEqual('1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n')
  })
})
