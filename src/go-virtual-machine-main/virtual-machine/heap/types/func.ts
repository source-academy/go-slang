import { Process } from '../../runtime/process'
import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { StringNode } from './primitives'
import { ReferenceNode } from './reference'
import { StackNode } from './stack'

export class FuncNode extends BaseNode {
  static create(PC: number, env: number, heap: Heap) {
    const addr = heap.allocate(3)

    heap.set_tag(addr, TAG.FUNC)
    heap.memory.set_word(PC, addr + 1)
    heap.memory.set_word(env, addr + 2)
    return new FuncNode(heap, addr)
  }

  static default(heap: Heap) {
    return FuncNode.create(-1, -1, heap)
  }

  PC() {
    return this.heap.memory.get_word(this.addr + 1)
  }

  E() {
    return this.heap.memory.get_word(this.addr + 2)
  }

  override get_children(): number[] {
    return [this.E()]
  }

  override toString(): string {
    return 'CLOSURE'
  }

  apply_unary(operator: string) {
    if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}

export class CallRefNode extends BaseNode {
  static create(PC: number, heap: Heap) {
    const addr = heap.allocate(2)

    heap.set_tag(addr, TAG.CALLREF)
    heap.memory.set_word(PC, addr + 1)
    return new CallRefNode(heap, addr)
  }
  PC() {
    return this.heap.memory.get_word(this.addr + 1)
  }
}

/**
 * Represents a hardcoded method.
 * Word 0 - MethodNode tag.
 * Word 1 - Receiver address.
 * Word 2 - String literal address, representing the method name.
 * */
export class MethodNode extends BaseNode {
  static create(receiver: number, identifier: string, heap: Heap): MethodNode {
    const addr = heap.allocate(3)
    heap.set_tag(addr, TAG.METHOD)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 2)
    heap.memory.set_word(receiver, addr + 1)
    heap.memory.set_word(StringNode.create(identifier, heap).addr, addr + 2)
    heap.temp_pop()
    return new MethodNode(heap, addr)
  }

  receiverAddr(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  receiver(): BaseNode {
    return this.heap.get_value(this.receiverAddr())
  }

  identifierAddr(): number {
    return this.heap.memory.get_word(this.addr + 2)
  }

  identifier(): string {
    return new StringNode(this.heap, this.identifierAddr()).get_value()
  }

  override get_children(): number[] {
    return [this.receiverAddr(), this.identifierAddr()]
  }

  override toString(): string {
    return this.identifier()
  }
}

/**
 * Stores the function literal and arguments of a deferred function call.
 * Word 0: DeferFuncNode tag.
 * Word 1: Function literal address.
 * Word 2: Address of a stack containing all the arguments (first argument at the top).
 */
export class DeferFuncNode extends BaseNode {
  static create(argCount: number, process: Process): DeferFuncNode {
    const addr = process.heap.allocate(3)
    process.heap.temp_push(addr)
    process.heap.set_tag(addr, TAG.DEFER_FUNC)
    process.heap.memory.set_word(-1, addr + 2)

    const stack = StackNode.create(process.heap)
    const results = []
    for (let i = argCount - 1; i >= 0; i--) {
      const src = process.context.popOS()
      results[i] = src
    }
    for (let i = 0; i < argCount; i++) {
      // pass by value instead of pass by reference
      const allocate = process.heap.allocate(process.heap.get_size(results[i]))
      process.heap.copy(allocate, results[i])
      stack.push(allocate)
    }
    process.heap.memory.set_word(stack.addr, addr + 2)
    process.heap.memory.set_word(process.context.popOS(), addr + 1)
    process.heap.temp_pop()
    return new DeferFuncNode(process.heap, addr)
  }

  funcAddr(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  func(): FuncNode {
    return new FuncNode(this.heap, this.funcAddr())
  }

  argCount(): number {
    return this.stack().sz()
  }

  stackAddr(): number {
    return this.heap.memory.get_word(this.addr + 2)
  }

  stack(): StackNode {
    return new StackNode(this.heap, this.stackAddr())
  }

  override get_children(): number[] {
    return [this.funcAddr(), this.stackAddr()]
  }

  override toString(): string {
    return 'DEFER ' + this.func().toString()
  }
}

/**
 * Stores the MethodNode and arguments of a deferred method call.
 * Word 0: DeferMethodNode tag.
 * Word 1: MethodNode address.
 * Word 2: Address of a stack containing all the arguments (first argument at the top).
 */
export class DeferMethodNode extends BaseNode {
  static create(argCount: number, process: Process): DeferMethodNode {
    const addr = process.heap.allocate(3)
    process.heap.set_tag(addr, TAG.DEFER_METHOD)
    process.heap.temp_push(addr)
    process.heap.memory.set_word(-1, addr + 1)
    process.heap.memory.set_word(-1, addr + 2)

    const stack = StackNode.create(process.heap)
    process.heap.memory.set_word(stack.addr, addr + 2)
    const results = []
    for (let i = argCount - 1; i >= 0; i--) {
      const src = process.context.popOS()
      results[i] = src
    }
    for (let i = 0; i < argCount; i++) {
      // pass by value instead of pass by reference
      const allocate = process.heap.allocate(process.heap.get_size(results[i]))
      process.heap.copy(allocate, results[i])
      stack.push(allocate)
    }

    const methodNode = process.context.popOS()
    process.heap.memory.set_word(methodNode, addr + 1)

    process.heap.temp_pop()
    return new DeferMethodNode(process.heap, addr)
  }

  methodAddr(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  methodNode(): MethodNode {
    return this.heap.get_value(this.methodAddr()) as MethodNode
  }

  stackAddr(): number {
    return this.heap.memory.get_word(this.addr + 2)
  }

  stack(): StackNode {
    return this.heap.get_value(this.stackAddr()) as StackNode
  }

  override get_children(): number[] {
    return [this.methodAddr(), this.stackAddr()]
  }

  override toString(): string {
    return 'DEFER ' + this.methodNode().toString()
  }
}
