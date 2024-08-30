import { describe, expect, test } from 'vitest'

import { runCode } from '../src/virtual-machine'

import { mainRunner } from './utility'

describe('Defer Type Checking', () => {
  test('Defer on non call should fail.', () => {
    const code = `
    defer "hello"
    `
    expect(mainRunner(code).error?.message).toEqual(
      'Expression in defer must be function call.',
    )
  })
})

describe('Defer Execution', () => {
  test('Defer runs in order', () => {
    const code = `
    defer func(){ fmt.Println("!!!") }()
    defer func(){ fmt.Println("world") }()
    fmt.Println("hello")
    `
    expect(mainRunner(code).output).toEqual('hello\nworld\n!!!\n')
  })

  test('Defer with wait groups work', () => {
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
    expect(runCode(code, 2048).output).toEqual('1000\n')
  })
})
