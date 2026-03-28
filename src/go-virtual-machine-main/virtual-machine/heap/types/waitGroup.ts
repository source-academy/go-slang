import { is_multithreaded } from '../../runtime'
import { MessageType, WorkerToScheduler } from '../../runtime/message'
import { Process } from '../../runtime/process'
import { ProcessV2 } from '../../runtime/processV2'
import { local_thread } from '../../runtime/worker'
import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ChannelArrayNode } from './channel'
import { ContextNode } from './context'
import { MethodNode } from './func'
import { LinkedListEntryNode } from './linkedlist'
import { IntegerNode } from './primitives'
import { QueueNode } from './queue'

/**
 * Each WaitGroupNode occupies 3 words.
 * Word 0: Wait Group tag.
 * Word 1: A non-negative number, representing how number of .Add - number of .Done calls.
 * Word 2: The address to a queue of waiting contexts.
 * Word 3: A lock for critical sections where 0 is available, 1 is unavailable
 * Word 4: The generation / version of the WaitGroup's blocking and unblocking
 */
export class WaitGroupNode extends BaseNode {
  static create(heap: Heap): WaitGroupNode {
    heap.handle_before_alloc()
    const addr = heap.allocate(5)
    heap.set_tag(addr, TAG.WAIT_GROUP)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 2)
    heap.memory.set_number(0, addr + 1)
    heap.memory.set_word(QueueNode.create(heap).addr, addr + 2)
    heap.memory.atomic_set_word_i32(0, addr + 3) // Represents lock where 0 is available
    heap.memory.atomic_set_word_i32(0, addr + 4) //Represents generation/version
    heap.temp_pop()
    heap.handle_after_alloc()
    return new WaitGroupNode(heap, addr)
  }

  static default(heap: Heap): WaitGroupNode {
    return WaitGroupNode.create(heap)
  }

  count(): number {
    return this.heap.memory.get_number(this.addr + 1)
  }

  set_count(new_count: number): void {
    if (new_count < 0) {
      throw new Error('sync: negative WaitGroup counter.')
    }
    this.heap.memory.set_number(new_count, this.addr + 1)
  }

  queue(): QueueNode {
    return new QueueNode(this.heap, this.heap.memory.get_word(this.addr + 2))
  }

  /**
   * Get spinlock for critical section
   */
  private get_lock() {
    while (this.heap.memory.atomic_cas_i32(this.addr + 3, 0, 1) !== 0) {
      this.heap.memory.atomic_wait_i32(1, this.addr + 3)
    }
  }

  /**
   * Release spinlock for critical section
   */
  private release_lock() {
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
    if (identifier === 'Add') {
      this.handleAdd(process)
    } else if (identifier === 'Done') {
      this.handleDone(process)
    } else if (identifier === 'Wait') {
      this.handleWait(process)
    }
  }

  /** [V2] Arguments to builtin methods should be on the OS. Remember to pop the receiver from OS. */
  override handleMethodCallV2(
    process: ProcessV2,
    identifier: string,
    _argCount: number,
  ) {
    if (identifier === 'Add') {
      this.handleAdd(process)
    } else if (identifier === 'Done') {
      this.handleDone(process)
    } else if (identifier === 'Wait') {
      this.handleWait(process)
    }
  }

  handleAdd(process: Process | ProcessV2): void {
    const amount = process.context.popOSNode(IntegerNode).get_value()
    process.context.popOS()
    this.get_lock()
    this.set_count(this.count() + amount)
    this.release_lock()
  }

  handleDone(process: Process | ProcessV2): void {
    process.context.popOS()
    this.get_lock()
    this.set_count(this.count() - 1)
    if (this.count() === 0) {
      if (is_multithreaded) {
        this.increment_generation()
        const message: WorkerToScheduler = {
          type: MessageType.UNBLOCK_ALL,
          obj_addrs: [this.addr],
          generations: [this.get_generation()]
        }
        postMessage(message)
      } else {
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
    }
    this.release_lock()
  }

  handleWait(process: Process | ProcessV2): void {
    process.context.popOS()
    this.get_lock()
    if (this.count() === 0) {
      this.release_lock()
      return
    }
    process.context.set_blocked(true)
    if (is_multithreaded) {
      const message: WorkerToScheduler = {
        type: MessageType.BLOCK,
        thread_id: local_thread.thread_id, // Use local_thread to obtain since we are keeping 2 versions of Process temporarily
        context_addr: process.context.addr,
        obj_addrs: [this.addr],
        generations: [this.get_generation()],
      }
      postMessage(message)
    } else {
      this.queue().push(process.context.addr)
      process.context.set_waitlist(ChannelArrayNode.create(1, process.heap).addr)
      process.context
        .waitlist()
        .set_child(
          0,
          process.heap.blocked_contexts.push_back(process.context.addr),
        )
    }
    this.release_lock()
  }

  override get_children(): number[] {
    return [this.queue().addr]
  }

  override toString(): string {
    return 'WG COUNT ' + this.count().toString()
    // throw new Error('Unimplemented')
  }
}
