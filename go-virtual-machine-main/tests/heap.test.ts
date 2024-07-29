import { describe, expect, test } from 'vitest'

import { Heap } from '../src/virtual-machine/heap'
import { ContextNode } from '../src/virtual-machine/heap/types/context'
import {
  EnvironmentNode,
  FrameNode,
} from '../src/virtual-machine/heap/types/environment'

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
})
