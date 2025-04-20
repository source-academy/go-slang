import { Process } from '../../runtime/process'
import { Heap, TAG, word_size } from '..'

import { BaseNode } from './base'
import { MethodNode } from './func'
import { IntegerNode, StringNode } from './primitives'
import { ReferenceNode } from './reference'

/**
 * This node represents the `fmt` package. It only occupies one word, its tag.
 */
export class UnsafePkgNode extends BaseNode {
  static create(heap: Heap): UnsafePkgNode {
    const addr = heap.allocate(1)
    heap.set_tag(addr, TAG.UNSAFE_PKG)
    return new UnsafePkgNode(heap, addr)
  }

  static default(heap: Heap): UnsafePkgNode {
    return UnsafePkgNode.create(heap)
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
    argCount: number,
  ) {
    if (identifier === 'Alignof') {
      this.handleAlignof(process, argCount)
    } else if (identifier === 'Offsetof') {
      this.handleOffsetof(process, argCount)
    } else if (identifier === 'Sizeof') {
      this.handleSizeof(process, argCount)
    } else if (identifier === 'String') {
      this.handleString(process, argCount)
    } else if (identifier === 'StringData') {
      this.handleStringData(process, argCount)
    } else if (identifier === 'Add') {
      this.handleAdd(process, argCount)
    }
  }

  handleAlignof(process: Process, argCount: number): void {
    if (argCount === 1) {
      const addr = process.context.popOS() // argument
      const node = process.heap.get_value(addr)
      process.context.popOS() // "Alignof" method node
      process.context.pushOS(
        IntegerNode.create(node.sizeof(), process.heap).addr,
      )
    } else {
      throw new Error('Alignof requires 1 argument but got ' + argCount)
    }
  }

  handleOffsetof(process: Process, argCount: number): void {
    if (argCount === 1) {
      const addr = process.context.popOS() // argument, must be field in a struct
      const node = process.heap.get_value(addr)
      process.context.popOS() // "Offsetof" method node
      process.context.pushOS(node.addr)
    } else {
      throw new Error('Offsetof requires 1 argument but got ' + argCount)
    }
  }

  handleSizeof(process: Process, argCount: number): void {
    if (argCount === 1) {
      const addr = process.context.popOS() // argument
      const node = process.heap.get_value(addr)
      process.context.popOS() // "Sizeof" method node
      process.context.pushOS(
        IntegerNode.create(node.sizeof(), process.heap).addr,
      )
    } else {
      throw new Error('Sizeof requires 1 argument but got ' + argCount)
    }
  }

  handleString(process: Process, argCount: number): void {
    if (argCount === 2) {
      const addr = process.context.popOS() // argument "len IntegerType"
      const addr2 = process.context.popOS() // argument "ptr *byte"
      const node = process.heap.get_value(addr) as IntegerNode
      const node2 = process.heap.get_value(addr2)
      if (node2 instanceof ReferenceNode) {
        const len = node.get_value()
        const bytes = process.heap.get_value(node2.get_child())
        process.context.popOS() // "String" method node
        let str = ''
        for (let i = 0; i < len; i++) {
          str += String.fromCharCode(
            this.heap.memory.get_bytes(
              Math.floor(i / word_size) + bytes.addr + 1,
              1,
              i % word_size,
            ),
          )
        }
        process.context.pushOS(StringNode.create(str, process.heap).addr)
      }
    } else {
      throw new Error('String requires 2 arguments but got ' + argCount)
    }
  }

  handleStringData(process: Process, argCount: number): void {
    if (argCount === 1) {
      const addr = process.context.popOS() // argument
      const node = process.heap.get_value(addr) as StringNode
      process.context.popOS() // "StringData" method node
      process.context.pushOS(
        ReferenceNode.create(node.get_list(), process.heap).addr,
      )
    } else {
      throw new Error('StringData requires 1 argument but got ' + argCount)
    }
  }

  handleAdd(process: Process, argCount: number): void {
    if (argCount === 2) {
      const addr = process.context.popOS() // argument "len IntegerType"
      const addr2 = process.context.popOS() // argument "ptr Pointer"
      const node = process.heap.get_value(addr) as IntegerNode
      const node2 = process.heap.get_value(addr2)
      if (node2 instanceof ReferenceNode) {
        process.context.popOS() // "Add" method node
        process.context.pushOS(
          ReferenceNode.create(
            node.get_value() + node2.get_child(),
            process.heap,
          ).addr,
        )
      }
    } else {
      throw new Error('Add requires 2 arguments but got ' + argCount)
    }
  }

  override get_children(): number[] {
    return []
  }

  override toString(): string {
    return 'UNSAFE PACKAGE'
  }
}
