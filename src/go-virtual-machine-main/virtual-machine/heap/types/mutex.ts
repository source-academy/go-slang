import { MessageType, WorkerToScheduler } from '../../runtime/message'
import { Process } from '../../runtime/process'
import { ProcessV2 } from '../../runtime/processV2'
import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ChannelArrayNode } from './channel'
import { ContextNode } from './context'
import { MethodNode } from './func'
import { LinkedListEntryNode } from './linkedlist'
import { QueueNode } from './queue'

/**
 * Each MutexNode occupies 3 words.
 * Word 0: Mutex tag.
 * Word 1: Availability, -1 means it is locked, 0 means it is not locked (same as semaphores).
 * Word 2: The address to a queue of waiting contexts.
 * Word 3: Lock to handle critical sections of the mutex, ensuring atomicity
 * Word 4: The generation / version of the Mutex's blocking and unblocking
 */
export class MutexNode extends BaseNode {
  static create(heap: Heap): MutexNode {
    heap.handle_before_alloc()
    const addr = heap.allocate(5)
    heap.set_tag(addr, TAG.MUTEX)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 2)
    heap.memory.atomic_set_word_i32(0, addr + 1)
    heap.memory.set_word(QueueNode.create(heap).addr, addr + 2)
    heap.memory.atomic_set_word_i32(0, addr + 3)
    heap.memory.atomic_set_word_i32(0, addr + 4)
    heap.temp_pop()
    heap.handle_after_alloc()
    return new MutexNode(heap, addr)
  }

  static default(heap: Heap): MutexNode {
    return MutexNode.create(heap)
  }

  is_locked(): boolean {
    return this.heap.memory.atomic_get_word_i32(this.addr + 1) < 0
  }

  // lock(): void {
  //   this.heap.memory.set_number(-1, this.addr + 1)
  // }

  // unlock(): void {
  //   if (this.is_locked()) {
  //     this.heap.memory.set_number(0, this.addr + 1)
  //   } else {
  //     throw new Error('sync: unlock of unlocked mutex')
  //   }
  // }

  tryLock(): boolean {
    return this.heap.memory.atomic_cas_i32(this.addr + 1, 0, -1) === 0
  }

  tryUnlock(): boolean {
    return this.heap.memory.atomic_cas_i32(this.addr + 1, -1, 0) === -1
  }

  queue(): QueueNode {
    return new QueueNode(this.heap, this.heap.memory.get_word(this.addr + 2))
  }

  /**
   * Get spinlock for critical section
   */
  private get_lock_critical() {
    while (this.heap.memory.atomic_cas_i32(this.addr + 3, 0, 1) !== 0) {
      this.heap.memory.atomic_wait_i32(1, this.addr + 3)
    }
  }

  /**
   * Release spinlock for critical section
   */
  private release_lock_critical() {
    this.heap.memory.atomic_set_word_i32(0, this.addr + 3)
    this.heap.memory.atomic_notify_i32(this.addr + 3, 1)
  }

  get_generation() {
    return this.heap.memory.atomic_get_word_i32(this.addr + 4)
  }

  increment_generation() {
    this.heap.memory.atomic_add_i32(1, this.addr + 4)
  }

  override select(process: Process | ProcessV2, identifier: string): void {
    process.context.pushOS(
      MethodNode.create(this.addr, identifier, this.heap).addr,
    )
  }

  /** Arguments to builtin methods should be on the OS. Remember to pop the receiver from OS. */
  override handleMethodCall(
    process: Process,
    identifier: string,
    _argCount: number,
  ) {
    if (identifier === 'Lock') {
      this.handleLock(process)
    } else if (identifier === 'Unlock') {
      this.handleUnlock(process)
    }
  }

  /** [V2] Arguments to builtin methods should be on the OS. Remember to pop the receiver from OS. */
  override handleMethodCallV2(
    process: ProcessV2,
    identifier: string,
    _argCount: number,
  ) {
    this.get_lock_critical() // Guard critical section
    if (identifier === 'Lock') {
      this.handleLockV2(process)
    } else if (identifier === 'Unlock') {
      this.handleUnlockV2(process)
    }
    this.release_lock_critical() // Release for critical section
  }

  handleLock(process: Process): void {
    if (this.tryLock()) {
      return
    }
    // If unable to lock, should block the current context and add it to the wait queue
    this.queue().push(process.context.addr)
    process.context.set_waitlist(
      ChannelArrayNode.create(1, process.heap).addr,
    )
    process.context
    .waitlist()
    .set_child(
      0,
      process.heap.blocked_contexts.push_back(process.context.addr),
    )
    process.context.set_blocked(true)
  }
  
  handleUnlock(process: Process): void {
    if (!this.tryUnlock()) {
      throw new Error('sync: unlock of unlocked mutex')
    }
    process.context.popOS()
    // Wake up waiting contexts
    while (this.queue().sz()) {
      const context = new ContextNode(this.heap, this.queue().pop())
      const wait_nodes = context.waitlist().get_children()
      for (const wait_node of wait_nodes) {
        const node = new LinkedListEntryNode(this.heap, wait_node)
        node.del()
      }
      context.set_blocked(false)
      this.heap.contexts.push(context.addr)
    }
  }
  
  handleLockV2(process: ProcessV2): void {
    if (this.tryLock()) {
      return
    }
    // If unable to lock, should block the current context and add it to the wait queue
    process.context.set_PC(process.context.PC() - 1) // Set PC back to the Lock instruction for retry after waking up
    process.context.set_blocked(true)
    const message: WorkerToScheduler = {
      type: MessageType.BLOCK,
      thread_id: process.thread_id,
      context_addr: process.context.addr,
      obj_addrs: [this.addr],
      generations: [this.get_generation()],
    }
    postMessage(message)
  }
  
  handleUnlockV2(process: ProcessV2): void {
    if (!this.tryUnlock()) {
      throw new Error('sync: unlock of unlocked mutex')
    }
    const number_awoken = this.heap.memory.atomic_notify_i32(this.addr + 1, 1)
    process.context.popOS()
    this.increment_generation()
    if (number_awoken > 0) {
      return
    }
    const message: WorkerToScheduler = {
      type: MessageType.UNBLOCK,
      obj_addrs: [this.addr],
      generations: [this.get_generation()]
    }
    postMessage(message)
  }

  override get_children(): number[] {
    return [this.queue().addr]
  }

  override toString(): string {
    return 'MUTEX LOCKED ' + this.is_locked().toString()
  }
}
