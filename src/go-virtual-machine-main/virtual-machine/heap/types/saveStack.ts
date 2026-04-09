import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { StackListNode } from './stack'

export class SaveStackNode extends BaseNode {
  static create(heap: Heap) {
    heap.handle_before_alloc()
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.STACK)
    if (heap.temp_roots) heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list = StackListNode.create(heap)
    if (heap.temp_roots) heap.temp_pop()
    heap.memory.set_word(list.addr, addr + 1)
    heap.handle_after_alloc()
    return new SaveStackNode(heap, addr)
  }

  static clone(heap: Heap) {
    heap.handle_before_alloc()
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.STACK)
    if (heap.temp_roots) heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list = StackListNode.clone(heap)
    if (heap.temp_roots) heap.temp_pop()
    heap.memory.set_word(heap.clone(list.addr), addr + 1)
    heap.handle_after_alloc()
    return new SaveStackNode(heap, addr)
  }

  list() {
    return new StackListNode(
      this.heap,
      this.heap.memory.get_word(this.addr + 1),
    )
  }

  push(addr: number) {
    const list = this.list()
    list.push(addr)
    this.heap.memory.set_word(list.addr, this.addr + 1)
  }
  pop() {
    const list = this.list()
    if (list.get_sz() === 0) {
      return -1 // runqueue should only hold context addrs, -1 is invalid
    }
    const res = list.pop()
    this.heap.memory.set_word(list.addr, this.addr + 1)
    return res
  }
  peek() {
    return this.list().peek()
  }
  get_idx(idx: number) {
    return this.list().get_idx(idx)
  }
  sz() {
    return this.list().get_sz()
  }
  override get_children(): number[] {
    return [this.list().addr]
  }
}