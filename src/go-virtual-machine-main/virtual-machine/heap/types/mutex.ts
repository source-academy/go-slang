import { Process } from '../../runtime/process'
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
 */
export class MutexNode extends BaseNode {
  static create(heap: Heap): MutexNode {
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.MUTEX)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 2)
    heap.memory.set_number(0, addr + 1)
    heap.memory.set_word(QueueNode.create(heap).addr, addr + 2)
    heap.temp_pop()
    return new MutexNode(heap, addr)
  }

  static default(heap: Heap): MutexNode {
    return MutexNode.create(heap)
  }

  is_locked(): boolean {
    return this.heap.memory.get_number(this.addr + 1) < 0
  }

  lock(): void {
    this.heap.memory.set_number(-1, this.addr + 1)
  }

  unlock(): void {
    if (this.is_locked()) {
      this.heap.memory.set_number(0, this.addr + 1)
    } else {
      throw new Error('sync: unlock of unlocked mutex')
    }
  }

  queue(): QueueNode {
    return new QueueNode(this.heap, this.heap.memory.get_word(this.addr + 2))
  }

  override select(process: Process, identifier: string): void {
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

  handleLock(process: Process): void {
    if (this.is_locked()) {
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
    } else {
      this.lock()
    }
  }

  handleUnlock(process: Process): void {
    process.context.popOS()
    this.unlock()
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

  override get_children(): number[] {
    return [this.queue().addr]
  }

  override toString(): string {
    return 'MUTEX LOCKED ' + this.is_locked().toString()
  }
}
