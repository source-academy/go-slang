import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ChannelArrayNode } from './channel'
import { EnvironmentNode } from './environment'
import { CallRefNode } from './func'
import { PrimitiveNode } from './primitives'
import { StackNode } from './stack'

export class ContextNode extends BaseNode {
  // [metadata | blocked?] [PC] [OS] [RTS] [WaitLists] [DeferStack]
  static create(heap: Heap) {
    const addr = heap.allocate(6)
    heap.set_tag(addr, TAG.CONTEXT)
    heap.memory.set_number(0, addr + 1) // PC
    heap.temp_push(addr)
    for (let i = 2; i <= 5; i++) heap.memory.set_number(-1, addr + i)
    heap.memory.set_word(StackNode.create(heap).addr, addr + 2) // OS
    heap.memory.set_word(StackNode.create(heap).addr, addr + 3) // RTS
    heap.memory.set_word(StackNode.create(heap).addr, addr + 5) // DeferStack
    heap.temp_pop()
    return new ContextNode(heap, addr)
  }

  is_blocked() {
    return this.heap.memory.get_bits(this.addr, 1, 16) === 1
  }

  set_blocked(val: boolean) {
    this.heap.memory.set_bits(val ? 1 : 0, this.addr, 1, 16)
  }

  set_PC(PC: number) {
    this.heap.memory.set_number(PC, this.addr + 1)
  }

  PC() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  OS() {
    return new StackNode(this.heap, this.heap.memory.get_word(this.addr + 2))
  }

  E(): EnvironmentNode {
    return this.heap.get_value(this.RTS().peek()) as EnvironmentNode
  }

  set_E(addr: number) {
    this.pushRTS(addr)
  }

  RTS() {
    return new StackNode(this.heap, this.heap.memory.get_word(this.addr + 3))
  }

  incr_PC() {
    const pc = this.PC()
    this.set_PC(pc + 1)
    return pc
  }

  pushOS(addr: number) {
    this.heap.temp_push(addr)
    this.OS().push(addr)
    this.heap.temp_pop()
  }

  peekOS() {
    return this.OS().peek()
  }

  /**
   * @param val 0-indexed from the back
   * @returns
   */
  peekOSIdx(val: number) {
    const sz = this.OS().sz()
    return this.OS().get_idx(sz - val - 1)
  }

  popOS() {
    return this.OS().pop()
  }

  /** Pops the OS and constructs a node with its address.  */
  popOSNode<T extends BaseNode>(nodeType: new (heap: Heap, addr: number) => T) {
    return new nodeType(this.heap, this.OS().pop())
  }

  printOS() {
    console.log('OS:')
    for (let i = 0; i < this.OS().sz(); i++) {
      const val = this.heap.get_value(this.OS().get_idx(i)) as PrimitiveNode
      console.log(val)
      // console.log(val.get_value())
    }
  }

  pushRTS(addr: number) {
    this.heap.temp_push(addr)
    this.RTS().push(addr)
    this.heap.temp_pop()
  }

  popRTS(): number {
    const old_E = this.RTS().pop()
    return old_E
  }

  peekRTS(): EnvironmentNode | CallRefNode {
    return this.heap.get_value(this.RTS().peek()) as
      | EnvironmentNode
      | CallRefNode
  }

  printRTS() {
    console.log('RTS:')
    for (let i = 0; i < this.RTS().sz(); i++) {
      const addr = this.RTS().get_idx(i)
      const val = addr === -1 ? -1 : this.heap.get_value(addr)
      //   console.log(val)
      let for_block = false
      if (val instanceof EnvironmentNode && val.if_for_block()) for_block = true
      console.log(
        val,
        val === -1 ? -1 : val.get_children().slice(1),
        for_block ? 'for block' : '',
      )
    }
  }

  fork() {
    const newContext = ContextNode.create(this.heap)
    newContext.set_PC(this.PC())
    newContext.set_E(this.E().addr)
    return newContext
  }

  go() {
    const newContext = ContextNode.create(this.heap)
    newContext.set_PC(this.PC())
    newContext.set_E(this.E().addr)
    return newContext
  }

  set_waitlist(addr: number) {
    this.heap.memory.set_number(addr, this.addr + 4)
  }

  waitlist() {
    return new ChannelArrayNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 4),
    )
  }

  deferStack(): StackNode {
    return new StackNode(this.heap, this.heap.memory.get_number(this.addr + 5))
  }

  pushDeferStack(): void {
    const stack = StackNode.create(this.heap)
    this.heap.temp_push(stack.addr)
    this.deferStack().push(stack.addr)
    this.heap.temp_pop()
  }

  peekDeferStack(): StackNode {
    return new StackNode(this.heap, this.deferStack().peek())
  }

  popDeferStack(): StackNode {
    return new StackNode(this.heap, this.deferStack().pop())
  }

  override get_children(): number[] {
    const children = [
      this.RTS().addr,
      this.OS().addr,
      this.waitlist().addr,
      this.deferStack().addr,
    ]
    return children
  }
}
