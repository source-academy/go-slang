import { Heap, TAG } from '..'

import { BaseNode } from './base'

export class LinkedListNode extends BaseNode {
  static create(heap: Heap) {
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.LINKED_LIST)
    heap.temp_push(addr)
    for (let i = 1; i <= 2; i++) heap.memory.set_number(-1, addr + i)
    const head = LinkedListEntryNode.create(-1, heap)
    heap.memory.set_number(head.addr, addr + 1)
    const tail = LinkedListEntryNode.create(-1, heap)
    heap.memory.set_number(tail.addr, addr + 2)
    heap.temp_pop()
    head.set_next(tail.addr)
    tail.set_prev(head.addr)
    return new LinkedListNode(heap, addr)
  }

  head() {
    return new LinkedListEntryNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 1),
    )
  }
  tail() {
    return new LinkedListEntryNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 2),
    )
  }

  is_empty() {
    return this.head().next().addr === this.tail().addr
  }

  push_back(addr: number) {
    const newNode = LinkedListEntryNode.create(addr, this.heap)
    const tail = this.tail()
    const pre = tail.prev()
    pre.set_next(newNode.addr)
    tail.set_prev(newNode.addr)
    newNode.set_next(tail.addr)
    newNode.set_prev(pre.addr)
    return newNode.addr
  }

  push_front(addr: number) {
    const newNode = LinkedListEntryNode.create(addr, this.heap)
    const head = this.head()
    const nex = head.next()
    head.set_next(newNode.addr)
    nex.set_prev(newNode.addr)
    newNode.set_next(nex.addr)
    newNode.set_prev(head.addr)
    return newNode.addr
  }

  pop_front() {
    if (this.is_empty()) throw Error('Linkedlist Empty')
    const node = this.tail().prev()
    node.del()
    return node.get_val()
  }

  pop_back() {
    if (this.is_empty()) throw Error('Linkedlist Empty')
    const node = this.head().next()
    node.del()
    return node.get_val()
  }

  override get_children(): number[] {
    return [this.head().addr, this.tail().addr]
  }

  get_items() {
    const vals = []
    let cur = this.head().next()
    while (cur.addr !== this.tail().addr) {
      vals.push(cur.get_val())
      cur = cur.next()
    }
    return vals
  }

  print() {
    this.head().next().print()
  }
}

export class LinkedListEntryNode extends BaseNode {
  static create(val: number, heap: Heap) {
    const addr = heap.allocate(4)
    heap.set_tag(addr, TAG.LINKED_LIST_ENTRY)
    heap.memory.set_number(addr, addr + 1)
    heap.memory.set_number(addr, addr + 2)
    heap.memory.set_number(val, addr + 3)
    return new LinkedListEntryNode(heap, addr)
  }

  set_prev(val: number) {
    this.heap.memory.set_number(val, this.addr + 1)
  }

  prev() {
    return new LinkedListEntryNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 1),
    )
  }

  set_next(val: number) {
    this.heap.memory.set_number(val, this.addr + 2)
  }

  next() {
    return new LinkedListEntryNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 2),
    )
  }

  get_val() {
    return this.heap.memory.get_number(this.addr + 3)
  }

  del() {
    const pre = this.prev()
    const nex = this.next()
    pre.set_next(nex.addr)
    nex.set_prev(pre.addr)
  }

  override get_children(): number[] {
    return [this.prev().addr, this.next().addr, this.get_val()]
  }

  print() {
    if (this.get_val() === -1) return
    const val = this.heap.get_value(this.get_val())
    console.log(val)
    this.next().print()
  }
}
