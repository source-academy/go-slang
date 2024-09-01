import { Heap, TAG } from '..'

import { BaseNode } from './base'

export class FrameNode extends BaseNode {
  static create(frame_size: number, heap: Heap) {
    const addr = heap.allocate(frame_size + 1)

    heap.set_tag(addr, TAG.FRAME)
    heap.set_children(addr, Array(frame_size).fill(heap.UNASSIGNED), 1)
    return new FrameNode(heap, addr)
  }

  set_idx(addr: number, index: number) {
    this.heap.set_child(addr, this.addr + 1, index)
  }

  get_idx(index: number) {
    return this.heap.get_child(this.addr + 1, index)
  }

  override get_children(): number[] {
    return this.heap.get_children(this.addr, 1)
  }
}

export class EnvironmentNode extends BaseNode {
  // [metadata] [frame] [...parents]
  // Note parents is terminated by -1 in the heap or by end of node block capacity
  static create(
    frame: number,
    parents: number[],
    for_block: boolean,
    heap: Heap,
  ) {
    const addr = heap.allocate(parents.length + 2)
    heap.set_tag(addr, TAG.ENVIRONMENT)
    heap.memory.set_bits(for_block ? 1 : 0, addr, 1, 16)
    heap.memory.set_word(frame, addr + 1)
    heap.set_children(addr, parents, 2)
    return new EnvironmentNode(heap, addr)
  }

  extend_env(frame: number, for_block = false) {
    const parents = [this.addr]
    let cur_par = new EnvironmentNode(this.heap, this.addr)
    let new_par = cur_par.get_parent(parents.length - 1)
    while (new_par) {
      parents.push(new_par.addr)
      cur_par = new_par
      new_par = cur_par.get_parent(parents.length - 1)
    }
    return EnvironmentNode.create(frame, parents, for_block, this.heap)
  }

  get_frame() {
    return new FrameNode(this.heap, this.heap.memory.get_word(this.addr + 1))
  }

  get_frame_idx(idx: number): FrameNode {
    if (idx === 0) return this.get_frame()
    const lvl = Math.floor(Math.log2(idx))
    const par = this.get_parent(lvl)
    if (!par) throw Error('Execution Error: Invalid frame index')
    return par.get_frame_idx(idx - 2 ** lvl)
  }

  get_parent(idx: number) {
    if (
      idx + 2 >= this.heap.get_size(this.addr) ||
      this.heap.memory.get_number(this.addr + idx + 2) === -1
    )
      return undefined
    else
      return new EnvironmentNode(
        this.heap,
        this.heap.memory.get_number(this.addr + idx + 2),
      )
  }

  get_var(frame_idx: number, var_idx: number) {
    return this.get_frame_idx(frame_idx).get_idx(var_idx)
  }

  if_for_block() {
    return this.heap.memory.get_bits(this.addr, 1, 16) === 1
  }

  override get_children(): number[] {
    return [this.get_frame().addr, ...this.heap.get_children(this.addr, 2)]
  }
}
