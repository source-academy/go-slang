import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { ChannelArrayNode } from './channel'
import { EnvironmentNode } from './environment'
import { CallRefNode } from './func'
import { PrimitiveNode } from './primitives'
import { StackNode } from './stack'

export class ContextNode extends BaseNode {
  // 6 words: [metadata | blocked?] [PC - Program Counter] [OS - Operand Stack] [RTS - Runtime Stack] [WaitLists] [DeferStack]
  static create(heap: Heap) {
    const addr = heap.allocate(6)
    heap.set_tag(addr, TAG.CONTEXT)
    heap.memory.set_number(0, addr + 1) // PC initialise to 0
    heap.temp_push(addr) // Temporary since need to initialise
    for (let i = 2; i <= 5; i++) heap.memory.set_number(-1, addr + i) // Initialise the remaining words to -1
    heap.memory.set_word(StackNode.create(heap).addr, addr + 2) // OS
    heap.memory.set_word(StackNode.create(heap).addr, addr + 3) // RTS
    heap.memory.set_word(StackNode.create(heap).addr, addr + 5) // DeferStack
    heap.temp_pop()
    return new ContextNode(heap, addr)
  }

  /**
   * @returns Check whether context is blocked at bit 17 using 1 bit
   */
  is_blocked() {
    return this.heap.memory.get_bits(this.addr, 1, 16) === 1
  }

  /**
   * @param val Set if context is blocked
   * @desc Set whether context is blocked at bit 17 using 1 bit
   */
  set_blocked(val: boolean) {
    this.heap.memory.set_bits(val ? 1 : 0, this.addr, 1, 16)
  }

  /**
   * @param PC Number to be set as PC
   * @desc Set PC number at 2nd word
   */
  set_PC(PC: number) {
    this.heap.memory.set_number(PC, this.addr + 1)
  }

  /**
   * @returns PC number at 2nd word
   */
  PC() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  /**
   * @returns StackNode Object representing Operand Stack by referencing the 3rd word
   */
  OS() {
    return new StackNode(this.heap, this.heap.memory.get_word(this.addr + 2))
  }

  /**
   * @returns Top value on runtime stack which by convention holds the current environment's address
   */
  E(): EnvironmentNode {
    return this.heap.get_value(this.RTS().peek()) as EnvironmentNode
  }

  /**
   * @desc Push environment's addr onto runtime stack
   */
  set_E(addr: number) {
    this.pushRTS(addr)
  }

  /**
   * @returns StackNode Object representing Runtime Stack by referencing the 4th word
   */
  RTS() {
    return new StackNode(this.heap, this.heap.memory.get_word(this.addr + 3))
  }

  /**
   * @desc Increment PC number by 1
   * @returns PC number after being incremented
   */
  incr_PC() {
    const pc = this.PC()
    this.set_PC(pc + 1)
    return pc
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Push addr into Operand Stack
   */
  pushOS(addr: number) {
    this.heap.temp_push(addr)
    this.OS().push(addr)
    this.heap.temp_pop()
  }

  /**
   * @desc Unlike popOS, peekOS does not remove the top of the Operand Stack
   * @return Addr at top of Operand Stack
   */
  peekOS() {
    return this.OS().peek()
  }

  /**
   * @param val 0-indexed from the back
   * @returns Addr at specified index of Operand Stack
   */
  peekOSIdx(val: number) {
    const sz = this.OS().sz()
    return this.OS().get_idx(sz - val - 1)
  }

  /**
   * @desc Removes the top of the Operand Stack
   * @return Addr at top of Operand Stack
   */
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

  /**
   * @param addr Starting Byte of the Memory
   * @desc Push addr into Runtime Stack
   */
  pushRTS(addr: number) {
    this.heap.temp_push(addr)
    this.RTS().push(addr)
    this.heap.temp_pop()
  }

  /**
   * @desc Removes the top of the Runtime Stack
   * @return Addr at top of Runtime Stack
   */
  popRTS(): number {
    const old_E = this.RTS().pop()
    return old_E
  }

  /**
   * @desc Peeks at the top of the Runtime Stack, does not remove it
   * @return Addr at top of Runtime Stack as either an EnvironmentNode or CallRefNode
   */
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

  /**
   * @desc Creates a parallel context
   * @return New context forked from the current context
   */
  fork() {
    const newContext = ContextNode.create(this.heap)
    newContext.set_PC(this.PC())
    newContext.set_E(this.E().addr)
    return newContext
  }

  /**
   * @desc Creates a new context that runs independently
   * @return New context created from the current context
   */
  go() {
    const newContext = ContextNode.create(this.heap)
    newContext.set_PC(this.PC())
    newContext.set_E(this.E().addr)
    return newContext
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Set addr at waitlist in the 5th word
   */
  set_waitlist(addr: number) {
    this.heap.memory.set_number(addr, this.addr + 4)
  }

  /**
   * @return Instance of ChannelArrayNode
   */
  waitlist() {
    return new ChannelArrayNode(
      this.heap,
      this.heap.memory.get_number(this.addr + 4),
    )
  }

  /**
   * @return Instance of StackNode to represent waitlist at the 6th word
   */
  deferStack(): StackNode {
    return new StackNode(this.heap, this.heap.memory.get_number(this.addr + 5))
  }

  /**
   * Push addr of deferred code into defer stack
   */
  pushDeferStack(): void {
    const stack = StackNode.create(this.heap)
    this.heap.temp_push(stack.addr)
    this.deferStack().push(stack.addr)
    this.heap.temp_pop()
  }

  /**
   * @desc Peeks at the top of the Defer Stack, does not remove it
   * @return StackNode object at top of Runtime Stack
   */
  peekDeferStack(): StackNode {
    return new StackNode(this.heap, this.deferStack().peek())
  }

  /**
   * @desc Removes the top of the Defer Stack
   * @return StackNode object at top of Runtime Stack
   */
  popDeferStack(): StackNode {
    return new StackNode(this.heap, this.deferStack().pop())
  }

  /**
   * @returns Addr of Runtime Stack, Operand Stack, Waitlist and Defer Stack
   */
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
