import { Heap, TAG } from '..'

import { BaseNode } from './base'

export class StackNode extends BaseNode {
  static create(heap: Heap) {
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.STACK)
    if (heap.temp_roots) heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list = StackListNode.create(heap)
    if (heap.temp_roots) heap.temp_pop()
    heap.memory.set_word(list.addr, addr + 1)
    return new StackNode(heap, addr)
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

export class StackListNode extends BaseNode {
  static init_sz = 4
  static create(heap: Heap) {
    const addr = heap.allocate(this.init_sz)
    heap.set_tag(addr, TAG.STACK_LIST)
    heap.memory.set_number(0, addr + 1)
    return new StackListNode(heap, addr)
  }

  resize(new_size: number) {
    const new_pos = this.heap.allocate(new_size)
    this.heap.set_tag(new_pos, TAG.STACK_LIST)
    const new_list = new StackListNode(this.heap, new_pos)
    const sz = this.get_sz()
    new_list.set_sz(sz)
    for (let i = 0; i < sz; i++) {
      new_list.set_idx(this.get_idx(i), i)
    }
    this.addr = new_pos
  }

  get_sz() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  set_sz(val: number) {
    this.heap.memory.set_number(val, this.addr + 1)
  }

  push(addr: number) {
    const sz = this.get_sz()
    const capacity = this.heap.get_size(this.addr)
    if (sz + 3 > capacity) this.resize(capacity * 2)
    this.set_idx(addr, sz)
    this.set_sz(sz + 1)
  }

  pop() {
    const sz = this.get_sz()
    if (sz === 0) throw Error('List Empty!')
    const capacity = this.heap.get_size(this.addr)
    const val = this.get_idx(sz - 1)
    this.set_sz(sz - 1)
    if (4 * (sz + 1) < capacity) this.resize(capacity / 2)
    return val
  }

  peek() {
    const sz = this.get_sz()
    if (sz === 0) throw Error('List Empty!')
    return this.get_idx(sz - 1)
  }

  get_idx(index: number) {
    return this.heap.memory.get_word(this.addr + 2 + index)
  }

  set_idx(val: number, index: number) {
    return this.heap.memory.set_word(val, this.addr + 2 + index)
  }

  override get_children(): number[] {
    const sz = this.get_sz()
    return [...Array(sz).keys()].map((x) => this.get_idx(x))
  }
}
