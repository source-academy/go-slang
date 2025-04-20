import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ContextNode } from './context'
import { LinkedListEntryNode, LinkedListNode } from './linkedlist'
import { QueueNode } from './queue'

export class ChannelNode extends BaseNode {
  static create(buffer: number, heap: Heap) {
    const addr = heap.allocate(5)
    heap.set_tag(addr, TAG.CHANNEL)
    heap.memory.set_number(buffer, addr + 1)
    heap.temp_push(addr)
    for (let i = 2; i <= 4; i++) heap.memory.set_number(-1, addr + i)
    const buffer_queue = QueueNode.create(heap)
    heap.memory.set_word(buffer_queue.addr, addr + 2)
    const recv_wait_queue = LinkedListNode.create(heap)
    heap.memory.set_number(recv_wait_queue.addr, addr + 3)
    const send_wait_queue = LinkedListNode.create(heap)
    heap.memory.set_number(send_wait_queue.addr, addr + 4)
    heap.temp_pop()
    return new ChannelNode(heap, addr)
  }
  static default(heap: Heap) {
    return ChannelNode.create(0, heap)
  }

  buffer() {
    return new QueueNode(this.heap, this.heap.memory.get_number(this.addr + 2))
  }

  wait_queue(recv: boolean) {
    return new LinkedListNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 3 + (recv ? 0 : 1)),
    )
  }

  get_buffer_sz() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  try(req: ReqInfoNode) {
    if (req.is_recv()) {
      if (this.buffer().sz()) {
        // Buffer have entries
        const src = this.buffer().pop()
        this.heap.copy(req.io(), src)
        if (!this.wait_queue(false).is_empty()) {
          // If wait queue contain send reqs should unblock since there is space
          const send_req = new ReqInfoNode(
            this.heap,
            this.wait_queue(false).pop_front(),
          )
          this.buffer().push(send_req.io())
          send_req.unblock()
        }
        return true
      }
      if (!this.wait_queue(false).is_empty()) {
        // Case where buffer size is 0 and send reqs in wait queue
        const send_req = new ReqInfoNode(
          this.heap,
          this.wait_queue(false).pop_front(),
        )
        this.heap.copy(req.io(), send_req.io())
        send_req.unblock()
        return true
      }
    } else {
      if (!this.wait_queue(true).is_empty()) {
        // Exist matching recv request (Note assumes wait queue contains no recv req)
        const recv_req = new ReqInfoNode(
          this.heap,
          this.wait_queue(true).pop_front(),
        )
        this.heap.copy(recv_req.io(), req.io())
        recv_req.unblock()
        return true
      }
      if (this.buffer().sz() < this.get_buffer_sz()) {
        this.buffer().push(req.io())
        return true
      }
    }
    return false
  }
  wait(req: ReqInfoNode) {
    return this.wait_queue(req.is_recv()).push_back(req.addr)
  }

  override get_children(): number[] {
    return [
      this.buffer().addr,
      this.wait_queue(true).addr,
      this.wait_queue(false).addr,
    ]
  }

  override toString(): string {
    return 'CHANNEL ' + this.addr.toString()
  }
}

export class ReqInfoNode extends BaseNode {
  static create(
    io_addr: number,
    context: number,
    pc: number,
    recv: boolean,
    heap: Heap,
  ) {
    const addr = heap.allocate(4)
    heap.set_tag(addr, TAG.REQ_INFO)
    heap.memory.set_bits(recv ? 1 : 0, addr, 1, 16)
    heap.memory.set_number(io_addr, addr + 1)
    heap.memory.set_number(context, addr + 2)
    heap.memory.set_number(pc, addr + 3)
    return new ReqInfoNode(heap, addr)
  }

  is_recv() {
    return this.heap.memory.get_bits(this.addr, 1, 16) === 1
  }

  io() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  PC() {
    return this.heap.memory.get_number(this.addr + 3)
  }

  context() {
    return new ContextNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 2),
    )
  }

  unblock() {
    const context = this.context()
    context.set_PC(this.PC())
    if (this.is_recv()) context.pushOS(this.io())
    const wait_nodes = context.waitlist().get_children()
    for (const wait_node of wait_nodes) {
      const node = new LinkedListEntryNode(this.heap, wait_node)
      node.del()
    }
    context.set_blocked(false)
    this.heap.contexts.push(context.addr)
  }

  override get_children(): number[] {
    return [this.context().addr, this.io()]
  }

  override toString(): string {
    return (
      'CHAN ' +
      (this.is_recv() ? 'RECV' : 'SEND') +
      '\n' +
      this.heap.get_value(this.io()).toString()
    )
  }
}

export class ChannelReqNode extends BaseNode {
  static create(channel: number, req: number, heap: Heap) {
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.CHANNEL_REQ)
    heap.memory.set_number(channel, addr + 1)
    heap.memory.set_number(req, addr + 2)
    return new ChannelReqNode(heap, addr)
  }

  channel() {
    return new ChannelNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 1),
    )
  }

  req() {
    return new ReqInfoNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 2),
    )
  }

  override get_children(): number[] {
    return [this.channel().addr, this.req().addr]
  }

  override toString() {
    return this.channel().toString() + '\n' + this.req().toString()
  }
}

/**
 * Each ChannelArrayNode occupies (2 + `length`) words.
 * Word 0: Array tag.
 * Word 1: Length of array.
 * Remaining `length` words: Each word is the address of an element.
 */
export class ChannelArrayNode extends BaseNode {
  static create(length: number, heap: Heap): ChannelArrayNode {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.CHANNEL_ARRAY)
    heap.memory.set_number(length, addr + 1)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    return new ChannelArrayNode(heap, addr)
  }

  /**
   * `defaultCreator` is a function that allocates a default element on the heap,
   * and returns its address.
   */
  static default(
    length: number,
    defaultCreator: (heap: Heap) => number,
    heap: Heap,
  ) {
    const addr = heap.allocate(2 + length)
    heap.set_tag(addr, TAG.CHANNEL_ARRAY)
    heap.memory.set_number(length, addr + 1)
    heap.temp_push(addr)
    for (let i = 0; i < length; i++) heap.memory.set_number(-1, addr + i + 2)
    for (let i = 0; i < length; i++) {
      heap.memory.set_word(defaultCreator(heap), addr + 2 + i)
    }
    heap.temp_pop()
    return new ChannelArrayNode(heap, addr)
  }

  length(): number {
    return this.heap.memory.get_number(this.addr + 1)
  }

  capacity(): number {
    return this.length()
  }

  set_child(index: number, address: number) {
    this.heap.memory.set_word(address, this.addr + 2 + index)
  }

  get_child(index: number): number {
    return this.heap.memory.get_word(this.addr + 2 + index)
  }

  override get_children(): number[] {
    return [...Array(this.length()).keys()].map((x) => this.get_child(x))
  }

  override toString(): string {
    const length = this.length()
    const elements = []
    for (let i = 0; i < length; i++) {
      elements.push(this.heap.get_value(this.get_child(i)).toString())
    }
    return `[${elements.join(' ')}]`
  }
}
