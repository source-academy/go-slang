import { Heap } from '../../heap'
import { ChannelNode } from '../../heap/types/channel'

import { Type } from '.'

export class ChannelType extends Type {
  constructor(
    public element: Type,
    public readable: boolean,
    public writable: boolean,
  ) {
    super()
  }

  override isPrimitive(): boolean {
    return false
  }

  override toString(): string {
    if (this.readable && this.writable) {
      return `chan ${this.element}`
    } else if (this.readable) {
      return `<-chan ${this.element}`
    } else {
      return `chan<- ${this.element}`
    }
  }

  override equals(t: Type): boolean {
    return (
      t instanceof ChannelType &&
      this.readable === t.readable &&
      this.writable === t.writable &&
      this.element.equals(t.element)
    )
  }

  override assignableBy(t: Type): boolean {
    return (
      this.equals(t) ||
      (this.readable &&
        this.writable &&
        t instanceof ChannelType &&
        this.element.equals(t.element))
    )
  }

  override defaultNodeCreator(): (heap: Heap) => number {
    return (heap) => ChannelNode.default(heap).addr
  }

  override bulkDefaultNodeCreator(): (heap: Heap, length: number) => number {
    return (heap) => ChannelNode.default(heap).addr
  }

  override defaultNodeAllocator(): (heap: Heap, addr: number) => number {
    throw new Error('Method not implemented.')
  }

  override sizeof(): number {
    return 0
  }
}
