import { Process } from '../../runtime/process'
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
 */
export class WaitGroupNode extends BaseNode {
  static create(heap: Heap): WaitGroupNode {
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.WAIT_GROUP)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 2)
    heap.memory.set_number(0, addr + 1)
    heap.memory.set_word(QueueNode.create(heap).addr, addr + 2)
    heap.temp_pop()
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
    if (identifier === 'Add') {
      this.handleAdd(process)
    } else if (identifier === 'Done') {
      this.handleDone(process)
    } else if (identifier === 'Wait') {
      this.handleWait(process)
    }
  }

  handleAdd(process: Process): void {
    const amount = process.context.popOSNode(IntegerNode).get_value()
    process.context.popOS()
    this.set_count(this.count() + amount)
  }

  handleDone(process: Process): void {
    process.context.popOS()
    this.set_count(this.count() - 1)
    if (this.count() === 0) {
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

  handleWait(process: Process): void {
    process.context.popOS()
    if (this.count() === 0) return
    this.queue().push(process.context.addr)
    process.context.set_waitlist(ChannelArrayNode.create(1, process.heap).addr)
    process.context
      .waitlist()
      .set_child(
        0,
        process.heap.blocked_contexts.push_back(process.context.addr),
      )
    process.context.set_blocked(true)
  }

  override get_children(): number[] {
    return [this.queue().addr]
  }

  override toString(): string {
    return 'WG COUNT ' + this.count().toString()
    // throw new Error('Unimplemented')
  }
}
