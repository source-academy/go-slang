import { describe, expect, test } from 'vitest'

import { Heap, TAG } from '../virtual-machine/heap'
import { FrameNode } from '../virtual-machine/heap/types/environment'
import { BoolNode, IntegerNode } from '../virtual-machine/heap/types/primitives'

import { codeRunnerMT, compileCodeMT } from './utility'

describe('Heap Tests (MT)', () => {
  test('Get Set Bits', () => {
    const heap = new Heap(320, false, false)
    heap.memory.set_bits(8796013022207, 121, 45, 2)
    expect(heap.memory.get_bits(121, 45, 2)).toEqual(8796013022207)
  })
  test('Get Set Bits 2', () => {
    const heap = new Heap(320, false, false)
    heap.memory.set_bits(-1, 121, 45, 2)
    expect(heap.memory.get_bits(121, 45, 2)).toEqual(35184372088831)
  })
  test('Get Set Bits 3', () => {
    const heap = new Heap(100, false, false)
    heap.memory.set_bits(1, 1, 29, 6)
    heap.memory.set_bits(2, 2, 29, 3)
    expect(heap.memory.get_bits(1, 29, 6)).toEqual(1)
  })
  test('Get Set Bits 4', () => {
    const heap = new Heap(64, false, false)
    heap.memory.set_bits(2, 3, 5, 1)
    heap.memory.set_bits(3, 3, 29, 6)
    expect(heap.memory.get_bits(3, 5, 1)).toEqual(2)
  })
  test('Mark And Sweep: OOM on very small heap', () => {
    const heap = new Heap(64, false, false)
    expect(() => FrameNode.create(0, heap)).toThrow(Error)
  })

  test('Array memory allocation for integers produces correct output', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]int{1, 25, 32, 43, 15, 46, 87, 83, 97, 610};
      fmt.Println(a)
    }
    `
    expect(codeRunnerMT(code).output).toEqual('[1 25 32 43 15 46 87 83 97 610]\n')
  })

  test('Array memory allocation for booleans produces correct output', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]bool{true, true, true, false, true, false, true, false, false, true};
      fmt.Println(a)
    }
    `
    expect(codeRunnerMT(code).output).toEqual('[true true true false true false true false false true]\n')
  })

  test('Array memory allocates integers at contiguous addresses', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]int{1, 25, 32, 43, 15, 46, 87, 83, 97, 610};
      fmt.Println(a)
    }
    `
    const compiled = compileCodeMT(code)
    const result = codeRunnerMT(code)
    expect(result.output).toEqual('[1 25 32 43 15 46 87 83 97 610]\n')
    expect(result.error).toBeUndefined()
  })

  test('Array memory allocates booleans at contiguous addresses', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]bool{true, true, true, false, true, false, true, false, false, true};
      fmt.Println(a)
    }
    `
    const result = codeRunnerMT(code)
    expect(result.output).toEqual('[true true true false true false true false false true]\n')
    expect(result.error).toBeUndefined()
  })
})
