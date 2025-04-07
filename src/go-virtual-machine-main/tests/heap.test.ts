import { describe, expect, test } from 'vitest'

import { CompileData } from '../virtual-machine'
import { Heap, TAG } from '../virtual-machine/heap'
import { ContextNode } from '../virtual-machine/heap/types/context'
import {
  EnvironmentNode,
  FrameNode,
} from '../virtual-machine/heap/types/environment'
import { BoolNode, IntegerNode } from '../virtual-machine/heap/types/primitives'

import { compileCode, runCodeWithHeap } from './utility'

describe('Heap Tests', () => {
  test('Get Set Bits', () => {
    const heap = new Heap(320)
    heap.memory.set_bits(8796013022207, 121, 45, 2)
    // heap.memory.print()
    expect(heap.memory.get_bits(121, 45, 2)).toEqual(8796013022207)
  })
  test('Get Set Bits 2', () => {
    const heap = new Heap(320)
    heap.memory.set_bits(-1, 121, 45, 2)
    expect(heap.memory.get_bits(121, 45, 2)).toEqual(35184372088831) // 2**45 - 1
  })
  test('Get Set Bits 3', () => {
    const heap = new Heap(100)
    heap.memory.set_bits(1, 1, 29, 6)
    heap.memory.set_bits(2, 2, 29, 3)
    expect(heap.memory.get_bits(1, 29, 6)).toEqual(1)
  })
  test('Get Set Bits 4', () => {
    const heap = new Heap(56)
    heap.memory.set_bits(2, 3, 5, 1)
    heap.memory.set_bits(3, 3, 29, 6)
    expect(heap.memory.get_bits(3, 5, 1)).toEqual(2)
  })
  test('Mark And Sweep', () => {
    const heap = new Heap(56)
    expect(() => FrameNode.create(0, heap)).toThrow(Error)
  })
  test('Mark And Sweep 2', () => {
    const heap = new Heap(62)
    const context = new ContextNode(heap, heap.contexts.peek())
    const base_frame = FrameNode.create(0, heap)
    const base_env = EnvironmentNode.create(base_frame.addr, [], false, heap)
    context.set_E(base_env.addr)
    heap.allocate(2)
    heap.allocate(2)
    heap.allocate(2)
    expect(() => heap.allocate(4)).toThrow(Error)
  })

  test('Array memory allocation for integers', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]int{1, 25, 32, 43, 15, 46, 87, 83, 97, 610};
      fmt.Println(a)
    }
    `
    const compiled = compileCode(code) as CompileData
    const heap = new Heap(2048)
    runCodeWithHeap(compiled, heap)
    let arrayNode = 0
    for (let i = 0; i < 2048; i++) {
      if (heap.get_tag(i) === TAG.ARRAY) {
        arrayNode = i
        break
      }
    }
    const start = heap.get_value(arrayNode).get_children()[0]
    expect((heap.get_value(start) as IntegerNode).get_value()).toEqual(1)
    expect(start + 4).toEqual(heap.get_value(arrayNode).get_children()[1])
    expect((heap.get_value(start + 4) as IntegerNode).get_value()).toEqual(25)
    expect(start + 8).toEqual(heap.get_value(arrayNode).get_children()[2])
    expect((heap.get_value(start + 8) as IntegerNode).get_value()).toEqual(32)
    expect(start + 12).toEqual(heap.get_value(arrayNode).get_children()[3])
    expect((heap.get_value(start + 12) as IntegerNode).get_value()).toEqual(43)
    expect(start + 16).toEqual(heap.get_value(arrayNode).get_children()[4])
    expect((heap.get_value(start + 16) as IntegerNode).get_value()).toEqual(15)
    expect(start + 20).toEqual(heap.get_value(arrayNode).get_children()[5])
    expect((heap.get_value(start + 20) as IntegerNode).get_value()).toEqual(46)
    expect(start + 24).toEqual(heap.get_value(arrayNode).get_children()[6])
    expect((heap.get_value(start + 24) as IntegerNode).get_value()).toEqual(87)
    expect(start + 28).toEqual(heap.get_value(arrayNode).get_children()[7])
    expect((heap.get_value(start + 28) as IntegerNode).get_value()).toEqual(83)
    expect(start + 32).toEqual(heap.get_value(arrayNode).get_children()[8])
    expect((heap.get_value(start + 32) as IntegerNode).get_value()).toEqual(97)
    expect(start + 36).toEqual(heap.get_value(arrayNode).get_children()[9])
    expect((heap.get_value(start + 36) as IntegerNode).get_value()).toEqual(610)
  })

  test('Array memory allocation for booleans', () => {
    const code = `
    package main
    import "fmt"
    func main() {
      a := [10]bool{true, true, true, false, true, false, true, false, false, true};
      fmt.Println(a)
    }
    `
    const compiled = compileCode(code) as CompileData
    const heap = new Heap(2048)
    runCodeWithHeap(compiled, heap)
    let arrayNode = 0
    for (let i = 0; i < 2048; i++) {
      if (heap.get_tag(i) === TAG.ARRAY) {
        arrayNode = i
        break
      }
    }
    const start = heap.get_value(arrayNode).get_children()[0]
    expect((heap.get_value(start) as BoolNode).get_value()).toEqual(true)
    expect(start + 1).toEqual(heap.get_value(arrayNode).get_children()[1])
    expect((heap.get_value(start + 1) as BoolNode).get_value()).toEqual(true)
    expect(start + 2).toEqual(heap.get_value(arrayNode).get_children()[2])
    expect((heap.get_value(start + 2) as BoolNode).get_value()).toEqual(true)
    expect(start + 3).toEqual(heap.get_value(arrayNode).get_children()[3])
    expect((heap.get_value(start + 3) as BoolNode).get_value()).toEqual(false)
    expect(start + 4).toEqual(heap.get_value(arrayNode).get_children()[4])
    expect((heap.get_value(start + 4) as BoolNode).get_value()).toEqual(true)
    expect(start + 5).toEqual(heap.get_value(arrayNode).get_children()[5])
    expect((heap.get_value(start + 5) as BoolNode).get_value()).toEqual(false)
    expect(start + 6).toEqual(heap.get_value(arrayNode).get_children()[6])
    expect((heap.get_value(start + 6) as BoolNode).get_value()).toEqual(true)
    expect(start + 7).toEqual(heap.get_value(arrayNode).get_children()[7])
    expect((heap.get_value(start + 7) as BoolNode).get_value()).toEqual(false)
    expect(start + 8).toEqual(heap.get_value(arrayNode).get_children()[8])
    expect((heap.get_value(start + 8) as BoolNode).get_value()).toEqual(false)
    expect(start + 9).toEqual(heap.get_value(arrayNode).get_children()[9])
    expect((heap.get_value(start + 9) as BoolNode).get_value()).toEqual(true)
  })
})
