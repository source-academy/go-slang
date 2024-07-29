import { describe, expect, test } from 'vitest'

import { mainRunner } from './utility'

describe('Concurrency Check', () => {
  test('Basic Check', () => {
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
