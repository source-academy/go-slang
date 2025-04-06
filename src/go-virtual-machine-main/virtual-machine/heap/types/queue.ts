import { Heap, TAG } from '..'

import { BaseNode } from './base'

export class QueueNode extends BaseNode {
  static create(heap: Heap) {
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.QUEUE)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list = QueueListNode.create(heap)
    heap.temp_pop()
    heap.memory.set_word(list.addr, addr + 1)
    return new QueueNode(heap, addr)
  }

  list() {
    return new QueueListNode(
      this.heap,
      this.heap.memory.get_word(this.addr + 1),
    )
  }

  push(addr: number) {
    const list = this.list()
    list.push(addr)
    this.heap.memory.set_word(list.addr, this.addr + 1)
  }

  go(addr: number) {
    const list = this.list()
    list.push(addr)
    this.heap.memory.set_word(list.addr, this.addr)
  }

  pop() {
    const list = this.list()
    const res = list.pop()
    this.heap.memory.set_word(list.addr, this.addr + 1)
    return res
  }

  randompeek() {
    return this.list().randompeek()
  }

  peek() {
    return this.list().peek()
  }

  sz() {
    return this.list().get_sz()
  }

  get_vals() {
    return this.list().get_children()
  }

  override get_children(): number[] {
    return [this.heap.memory.get_word(this.addr + 1)]
  }
}

export class QueueListNode extends BaseNode {
  static init_sz = 8
  static create(heap: Heap) {
    const addr = heap.allocate(this.init_sz)
    heap.set_tag(addr, TAG.QUEUE_LIST)
    heap.memory.set_number(0, addr + 1)
    heap.memory.set_number(0, addr + 2)
    heap.memory.set_number(0, addr + 3)
    return new QueueListNode(heap, addr)
  }

  resize(new_size: number) {
    const new_pos = this.heap.allocate(new_size)
    this.heap.set_tag(new_pos, TAG.QUEUE_LIST)
    const newQueueList = new QueueListNode(this.heap, new_pos)
    newQueueList.set_sz(this.get_sz())
    newQueueList.set_start(0)
    newQueueList.set_end(this.get_sz())
    const start = this.get_start()
    const cap = this.get_cap()
    for (let x = 0; x < this.get_sz(); x++) {
      newQueueList.set_idx(this.get_idx((start + x) % cap), x)
    }
    this.addr = new_pos
  }

  get_cap() {
    return this.heap.get_size(this.addr) - 4
  }

  get_sz() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  set_sz(val: number) {
    this.heap.memory.set_number(val, this.addr + 1)
  }

  get_start() {
    return this.heap.memory.get_number(this.addr + 2)
  }

  set_start(val: number) {
    this.heap.memory.set_number(val, this.addr + 2)
  }

  get_end() {
    return this.heap.memory.get_number(this.addr + 3)
  }

  set_end(val: number) {
    this.heap.memory.set_number(val, this.addr + 3)
  }

  push(addr: number) {
    const sz = this.get_sz()
    const node_sz = this.heap.get_size(this.addr)
    if (sz + 5 > node_sz) this.resize(node_sz * 2)
    this.set_idx(addr, this.get_end())
    this.set_end((this.get_end() + 1) % this.get_cap())
    this.set_sz(sz + 1)
  }

  pop() {
    const sz = this.get_sz()
    if (sz === 0) throw Error('Queue Empty!')
    const node_sz = this.heap.get_size(this.addr)
    const val = this.get_idx(this.get_start())
    this.set_start((this.get_start() + 1) % this.get_cap())
    this.set_sz(sz - 1)
    if (4 * (sz + 3) < node_sz) this.resize(node_sz / 2)
    return val
  }

  randompeek() {
    const sz = this.get_sz()
    if (sz === 0) throw Error('Queue Empty!')
    const rand = Math.random()
    const next = Math.floor(
      this.get_start() + rand * (this.get_end() - this.get_start() + 1),
    )
    const val = this.get_idx(next)
    if (sz > 1) {
      for (let i = next; i > this.get_start(); i--) {
        this.set_idx(this.get_idx(i - 1), i)
      }
      this.set_idx(val, this.get_start())
    }
    return this.get_idx(this.get_start())
  }

  peek() {
    const sz = this.get_sz()
    if (sz === 0) throw Error('Queue List is Empty!')
    return this.get_idx(this.get_start())
  }

  get_idx(index: number) {
    return this.heap.memory.get_word(this.addr + 4 + index)
  }

  set_idx(val: number, index: number) {
    return this.heap.memory.set_word(val, this.addr + 4 + index)
  }

  override get_children(): number[] {
    const sz = this.get_sz()
    const start = this.get_start()
    const cap = this.get_cap()
    return [...Array(sz).keys()].map((x) => this.get_idx((start + x) % cap))
  }
}
