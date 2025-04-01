import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Comments Tests', () => {
  test('Comments are correctly ignored', () => {
    const code = `
    package main
    // comments in global
    import "fmt"
    /*
    multiline
    comments in global
    */

    func main() {
        a := 1 + 2 // comment at end of line
        /* multiline
        comment */
        /**/
        //
        fmt.Println(/* comment in middle of code */a)
    }
    `
    expect(codeRunner(code).output).toEqual('3\n')
  })
}, 60000)
