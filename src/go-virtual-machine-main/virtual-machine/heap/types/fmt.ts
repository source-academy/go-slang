import { Process } from '../../runtime/process'
import { Heap, TAG } from '..'

import { BaseNode } from './base'
import { MethodNode } from './func'
import { StringNode } from './primitives'

/**
 * This node represents an uninitialized package. It only occupies one word, its tag.
 */
export class PkgNode extends BaseNode {
  static create(heap: Heap): PkgNode {
    const addr = heap.allocate(1)
    heap.set_tag(addr, TAG.PKG)
    return new PkgNode(heap, addr)
  }

  static default(heap: Heap): PkgNode {
    return PkgNode.create(heap)
  }

  override toString(): string {
    return 'PKG'
  }
}

/**
 * This node represents the `fmt` package. It only occupies one word, its tag.
 */
export class FmtPkgNode extends BaseNode {
  static create(heap: Heap): FmtPkgNode {
    const addr = heap.allocate(1)
    heap.set_tag(addr, TAG.FMT_PKG)
    return new FmtPkgNode(heap, addr)
  }

  static default(heap: Heap): FmtPkgNode {
    return FmtPkgNode.create(heap)
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
    if (identifier === 'Println') {
      this.handlePrintln(process, argCount)
    } else if (identifier === 'Print') {
      this.handlePrint(process, argCount)
    } else if (identifier === 'Printf') {
      this.handlePrintf(process, argCount)
    }
  }

  handlePrintln(process: Process, argCount: number): void {
    const argAddresses = []
    for (let i = 0; i < argCount; i++) {
      argAddresses.push(process.context.popOS())
    }
    for (let i = argCount - 1; i >= 0; i--) {
      const string = process.heap.get_value(argAddresses[i]).toString()
      process.print(string)

      process.print(i > 0 ? ' ' : '\n')
    }
    process.context.popOS()
  }

  handlePrint(process: Process, argCount: number): void {
    const argAddresses = []
    for (let i = 0; i < argCount; i++) {
      argAddresses.push(process.context.popOS())
    }
    for (let i = argCount - 1; i >= 0; i--) {
      const string = process.heap.get_value(argAddresses[i]).toString()
      process.print(string)
      if (i > 0) {
        // the argument before and after the string argument will coalesce with the string argument
        if (
          process.heap.get_value(argAddresses[i]) instanceof StringNode ||
          (i < argCount - 1 &&
            process.heap.get_value(argAddresses[i + 1]) instanceof
              StringNode) ||
          (i > 0 &&
            process.heap.get_value(argAddresses[i - 1]) instanceof StringNode)
        ) {
          process.print('')
        } else {
          process.print(' ')
        }
      }
    }
    process.context.popOS()
  }

  handlePrintf(process: Process, argCount: number): void {
    const argAddresses = []
    for (let i = 0; i < argCount; i++) {
      argAddresses.push(process.context.popOS())
    }
    // "format string" argument / the text to print out
    const text = process.heap.get_value(argAddresses[0]).toString()
    for (let i = argCount - 1; i >= 1; i--) {
      const string = process.heap.get_value(argAddresses[i]).toString()
      process.print(string)
      if (i > 0) {
        // the argument before and after the string argument will coalesce with the string argument
        if (
          process.heap.get_value(argAddresses[i]) instanceof StringNode ||
          (i < argCount - 1 &&
            process.heap.get_value(argAddresses[i + 1]) instanceof
              StringNode) ||
          (i > 0 &&
            process.heap.get_value(argAddresses[i - 1]) instanceof StringNode)
        ) {
          process.print('')
        } else {
          process.print(' ')
        }
      }
    }
    process.print(text)
    process.context.popOS()
  }

  override get_children(): number[] {
    return []
  }

  override toString(): string {
    return 'FMT PACKAGE'
  }
}
