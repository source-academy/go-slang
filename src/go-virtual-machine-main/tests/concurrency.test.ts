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
})

/*
describe('Concurrency randomised check', () => {
  test('Basic Check', () => {
    expect(
       codeRunnerRandom(`
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
    ).toEqual('6\n')
  })
})
*/