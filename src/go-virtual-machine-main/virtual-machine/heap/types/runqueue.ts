import { Heap, TAG } from ".."

import { BaseNode } from "./base"
import { QueueListNode } from "./queue"

export class RunQueueNode extends BaseNode {
  static create(heap: Heap) {
    heap.handle_before_alloc()
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.RUNQUEUE)
    heap.temp_push(addr)
    heap.memory.set_number(0, addr + 1) // Represents lock where 0 is available
    heap.memory.set_number(-1, addr + 2) // Addr of QueueListNode
    const list = QueueListNode.create(heap)
    heap.temp_pop()
    heap.memory.set_word(list.addr, addr + 2)
    heap.handle_after_alloc()
    return new RunQueueNode(heap, addr)
  }

  /** Scheduler cannot be put to sleep */
  private scheduler_get_lock() {
    let is_waiting = true
    while (is_waiting) {
      const val = this.heap.memory.atomic_cas_i32(this.addr + 1, 0, 1)
      if (val === 0) is_waiting = false
    }
  }

  private get_lock() {
    while (this.heap.memory.atomic_cas_i32(this.addr + 1, 0, 1) !== 0) {
      this.heap.memory.atomic_wait_i32(1, this.addr + 1)
    }
  }

  private release_lock() {
    this.heap.memory.atomic_set_word_i32(0, this.addr + 1)
    this.heap.memory.atomic_notify_i32(this.addr + 1, 1)
  }

  list() {
    return new QueueListNode(
      this.heap,
      this.heap.memory.get_word(this.addr + 2),
    )
  }

  push(addr: number) {
    this.get_lock()
    const list = this.list()
    list.push(addr)
    this.heap.memory.set_word(list.addr, this.addr + 2)
    this.release_lock()
  }

  go(addr: number) {
    const list = this.list()
    list.push(addr)
    this.heap.memory.set_word(list.addr, this.addr)
  }

  pop() {
    this.get_lock()
    const list = this.list()
    const res = list.pop()
    this.heap.memory.set_word(list.addr, this.addr + 2)
    this.release_lock()
    return res
  }

  push_and_pop(addr: number) {
    this.get_lock()
    const list = this.list()
    list.push(addr)
    const res = list.pop()
    this.heap.memory.set_word(list.addr, this.addr + 2)
    this.release_lock()
    return res
  }

  steal() {
    this.scheduler_get_lock()
    // If stealing, the runqueue should have minimally 2 goroutines
    if (this.list().get_sz() <= 1) {
      this.release_lock()
      return -1 // runqueue should only hold context addrs, -1 is invalid
    }
    const list = this.list()
    const res = list.pop_back()
    this.heap.memory.set_word(list.addr, this.addr + 2)
    this.release_lock()
    return res
  }

  randompeek() {
    return this.list().randompeek()
  }

  peek() {
    this.get_lock()
    const val = this.list().peek()
    this.release_lock()
    return val
  }

  scheduler_peek() {
    this.scheduler_get_lock()
    if (this.list().get_sz() <= 1) {
      this.release_lock()
      return -1 // runqueue should only hold context addrs, -1 is invalid
    }
    const val = this.list().peek()
    this.release_lock()
    return val
  }

  sz() {
    this.get_lock()
    const sz = this.list().get_sz()
    this.release_lock()
    return sz
  }

  get_vals() {
    this.get_lock()
    const vals = this.list().get_children()
    this.release_lock()
    return vals
  }

  override get_children(): number[] {
    return [this.heap.memory.get_word(this.addr + 2)]
  }
}