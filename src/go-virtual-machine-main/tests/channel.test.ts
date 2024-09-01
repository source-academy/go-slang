import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Channel Tests', () => {
  test('Assign int to channel should fail', () => {
    expect(mainRunner('var a <-chan int = 1').error?.message).toEqual(
      'Cannot use int64 as <-chan int64 in variable declaration',
    )
  })

  test('Channels Basic Test', () => {
    expect(
      mainRunner(`
      c1 := make(chan int)
      go func(){
        for i:=0; i < 100; i++ {
          
        }
        fmt.Println("hi")
        c1 <- 1
      }()
      a := <- c1
      fmt.Println(a)`).output,
    ).toEqual('hi\n1\n')
  })

  test('Channels Operator Test', () => {
    expect(
      mainRunner(`
      c1 := make(chan int)
      go func() {
          c1<- 5
      }()
      fmt.Println(4 + <- c1)`).output,
    ).toEqual('9\n')
  })

  test('Channels Select Case Test', () => {
    const strs = mainRunner(`
        c1 := make(chan int)
        c2 := make(chan string)
        c3 := make(chan string)
        go func() {
         for {
          select {
          case <-c2:
            c3 <- "stop"
           break
          default:
            c1 <- 1
          }
         }
        }()
         
        go func() {
         for {
          select {
          case  <- c1:
           fmt.Println("recv!")
          case <-c3:
            fmt.Println("stopped")
           break
          }
         }
        }()
         for i:=0; i < 5; i++{}
         fmt.Println("done")
         c2 <- "stop"
         for i:=0; i < 100; i++{}`)
      .output?.trim()
      .split('\n')
    let done = false
    let stopped = false
    if (!strs) throw Error('No output')
    for (const str of strs) {
      if (str === 'done') {
        if (done) throw Error('Multiple Dones!')
        done = true
      }
      if (str === 'stopped') {
        if (!done) throw Error('Stopped before main thread done!')
        if (stopped) throw Error('Multiple Stopped!')
        stopped = true
      }
    }
    if (strs[strs.length - 1] !== 'stopped')
      throw Error('Final string not stopped')
  })

  test('Channels Select Case Test 2', () => {
    const strs = mainRunner(`
        c1 := make(chan int)
        n := 25
       
        go func() {
         for i := 0; i < n; i++ {
          select {
          case c1 <- 1:
           fmt.Println("Write 1 1")
          case <-c1:
           fmt.Println("Read 1 2")
          }
         }
        }()
       
        go func() {
         for i := 0; i < n; i++ {
          select {
          case c1 <- 2:
           fmt.Println("Write 2 2")
          case <-c1:
           fmt.Println("Read 2 1")
          }
         }
        }()
        for i:=0; i < 100; i++{}`)
      .output?.trim()
      .split('\n')
    const arr1: number[] = [],
      arr2: number[] = []
    expect(strs?.length).toEqual(50)
    for (const str of strs || []) {
      if (str.startsWith('Write 1') || str.startsWith('Read 1')) {
        arr1.push(parseInt(str[str.length - 1]))
      } else if (str.startsWith('Write 2') || str.startsWith('Read 2')) {
        arr2.push(parseInt(str[str.length - 1]))
      } else throw Error('Invalid String')
    }
    expect(arr1.length).toEqual(25)
    expect(arr2.length).toEqual(25)
    for (let i = 0; i < 25; i++) {
      expect(arr1[i]).toEqual(arr2[i])
    }
  })
  test('Channels Buffer Test', () => {
    expect(
      mainRunner(`
      c1 := make(chan int, 3)
      for i:= 0; i < 3; i++ {
        c1 <- 1
      }
      go func(){
        c1<- 1
        fmt.Println("done2")
      }()
      for i:=0;i < 100;i++ {
      }
      fmt.Println("done1")
      <-c1
      for i:=0; i < 100; i++{}`).output,
    ).toEqual('done1\ndone2\n')
  })
})
