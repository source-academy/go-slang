import { Process } from '../../runtime/process'
import { ProcessV2 } from '../../runtime/processV2'
import { Heap } from '..'

export abstract class BaseNode {
  addr = 0
  heap: Heap
  constructor(heap: Heap, addr: number) {
    this.heap = heap
    this.addr = addr
  }

  get_children(): number[] {
    return []
  }

  // Calls the select operator on this node.
  select(_process: Process | ProcessV2, _identifier: string): void {
    throw new Error('Unreachable')
  }

  sizeof(): number {
    return 0
  }

  // Calls the method of this node, with arguments on the OS.
  handleMethodCall(
    _process: Process,
    _identifier: string,
    _argCount: number,
  ): void {
    throw new Error('Unreachable')
  }

  // Calls the method of this node, with arguments on the OS.
  handleMethodCallV2(
    _process: ProcessV2,
    _identifier: string,
    _argCount: number,
  ): void {
    throw new Error('Unreachable')
  }
}
