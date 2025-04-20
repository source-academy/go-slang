import {} from '../executor/typing'
import { BoolType } from '../executor/typing/bool_type'
import { Float64Type } from '../executor/typing/float64_type'
import { Int64Type } from '../executor/typing/int64_type'
import { NoType } from '../executor/typing/no_type'
import { StringType } from '../executor/typing/string_type'
import { Debugger } from '../runtime/debugger'

import { ArrayNode, SliceNode } from './types/array'
import { BaseNode } from './types/base'
import {
  ChannelArrayNode,
  ChannelNode,
  ChannelReqNode,
  ReqInfoNode,
} from './types/channel'
import { ContextNode } from './types/context'
import { EnvironmentNode, FrameNode } from './types/environment'
import { FmtPkgNode, PkgNode } from './types/fmt'
import {
  CallRefNode,
  DeferFuncNode,
  DeferMethodNode,
  FuncNode,
  MethodNode,
} from './types/func'
import { LinkedListEntryNode, LinkedListNode } from './types/linkedlist'
import { MutexNode } from './types/mutex'
import {
  BoolNode,
  FloatNode,
  IntegerNode,
  StringListNode,
  StringNode,
  UnassignedNode,
} from './types/primitives'
import { QueueListNode, QueueNode } from './types/queue'
import { ReferenceNode } from './types/reference'
import { StackListNode, StackNode } from './types/stack'
import { StructNode } from './types/struct'
import { UnsafePkgNode } from './types/unsafe'
import { WaitGroupNode } from './types/waitGroup'
import { Memory } from './memory'

export enum TAG {
  UNKNOWN = 0,
  BOOLEAN = 1,
  NUMBER = 2,
  CONTEXT = 3,
  FRAME = 4,
  ENVIRONMENT = 5,
  FLOAT = 6,
  STRING = 7,
  STRING_LIST = 8,
  STACK = 9,
  STACK_LIST = 10,
  FUNC = 11,
  CALLREF = 12,
  ARRAY = 13,
  QUEUE = 14,
  QUEUE_LIST = 15,
  LINKED_LIST = 16,
  LINKED_LIST_ENTRY = 17,
  CHANNEL = 18,
  CHANNEL_REQ = 19,
  REQ_INFO = 20,
  SLICE = 21,
  WAIT_GROUP = 22,
  METHOD = 23,
  DEFER_FUNC = 24,
  DEFER_METHOD = 25,
  PKG = 26,
  FMT_PKG = 27,
  MUTEX = 28,
  DECLARED = 29,
  STRUCT = 30,
  CHANNEL_ARRAY = 31,
  REFERENCE = 32,
  UNSAFE_PKG = 33,
}

export const word_size = 4

export class Heap {
  // Assume memory is an array of 8 byte words
  memory: Memory
  size: number
  UNASSIGNED: UnassignedNode
  freelist: number[]
  max_level: number
  temp_roots: StackNode
  contexts: QueueNode
  blocked_contexts: LinkedListNode
  mem_left: number
  temp = -1
  debugger: Debugger | undefined
  constructor(size: number) {
    this.size = size
    this.mem_left = size
    if (this.size % 2 === 1) this.size -= 1
    if (this.size < 34) throw Error('Insufficient Memory')
    this.memory = new Memory(size, word_size)
    this.max_level = Math.floor(Math.log2(size)) + 1
    this.freelist = []
    for (let i = 0; i < this.max_level; i++) this.freelist.push(-1)
    let cur_addr = 0
    while (cur_addr < size) {
      this.set_free(cur_addr, true)
      const lvl = Math.floor(Math.log2(size - cur_addr))
      this.add_list(cur_addr, lvl)
      cur_addr += 2 ** lvl
    }
    this.UNASSIGNED = UnassignedNode.create(this)
    this.temp_roots = StackNode.create(this)
    this.contexts = QueueNode.create(this)
    this.blocked_contexts = LinkedListNode.create(this)
    const context = ContextNode.create(this)
    this.contexts.push(context.addr)
  }

  get_value(addr: number): BaseNode {
    const tag = this.get_tag(addr)
    switch (tag) {
      case TAG.UNKNOWN:
        return new UnassignedNode(this, addr)
      case TAG.NUMBER:
        return new IntegerNode(this, addr)
      case TAG.FLOAT:
        return new FloatNode(this, addr)
      case TAG.STRING:
        return new StringNode(this, addr)
      case TAG.STRING_LIST:
        return new StringListNode(this, addr)
      case TAG.BOOLEAN:
        return new BoolNode(this, addr)
      case TAG.CONTEXT:
        return new ContextNode(this, addr)
      case TAG.FRAME:
        return new FrameNode(this, addr)
      case TAG.ENVIRONMENT:
        return new EnvironmentNode(this, addr)
      case TAG.STACK_LIST:
        return new StackListNode(this, addr)
      case TAG.STACK:
        return new StackNode(this, addr)
      case TAG.FUNC:
        return new FuncNode(this, addr)
      case TAG.CALLREF:
        return new CallRefNode(this, addr)
      case TAG.ARRAY:
        return new ArrayNode(this, addr)
      case TAG.SLICE:
        return new SliceNode(this, addr)
      case TAG.QUEUE:
        return new QueueNode(this, addr)
      case TAG.QUEUE_LIST:
        return new QueueListNode(this, addr)
      case TAG.LINKED_LIST:
        return new LinkedListNode(this, addr)
      case TAG.LINKED_LIST_ENTRY:
        return new LinkedListEntryNode(this, addr)
      case TAG.CHANNEL:
        return new ChannelNode(this, addr)
      case TAG.CHANNEL_REQ:
        return new ChannelReqNode(this, addr)
      case TAG.REQ_INFO:
        return new ReqInfoNode(this, addr)
      case TAG.WAIT_GROUP:
        return new WaitGroupNode(this, addr)
      case TAG.METHOD:
        return new MethodNode(this, addr)
      case TAG.DEFER_FUNC:
        return new DeferFuncNode(this, addr)
      case TAG.DEFER_METHOD:
        return new DeferMethodNode(this, addr)
      case TAG.PKG:
        return new PkgNode(this, addr)
      case TAG.FMT_PKG:
        return new FmtPkgNode(this, addr)
      case TAG.MUTEX:
        return new MutexNode(this, addr)
      case TAG.STRUCT:
        return new StructNode(this, addr)
      case TAG.CHANNEL_ARRAY:
        return new ChannelArrayNode(this, addr)
      case TAG.REFERENCE:
        return new ReferenceNode(this, addr)
      case TAG.UNSAFE_PKG:
        return new UnsafePkgNode(this, addr)
      default:
        // return new UnassignedNode(this, addr)
        throw Error('Unknown Data Type')
    }
  }

  get_type(addr: number) {
    const tag = this.get_tag(addr)
    switch (tag) {
      case TAG.UNKNOWN:
        return new NoType()
      case TAG.NUMBER:
        return new Int64Type()
      case TAG.FLOAT:
        return new Float64Type()
      case TAG.STRING:
        return new StringType()
      case TAG.BOOLEAN:
        return new BoolType()
      default:
        return new NoType()
    }
  }

  // [********** Linked List Helper Funcs ****************]

  /**
   * Doubly Linked List Implementation for LogN Freelists
   * A Node is the first node if prev_node = cur_addr
   * Similarly a node is the last node if next_node = cur_addr
   */

  print_freelist() {
    for (let lvl = 0; lvl < this.freelist.length; lvl++) {
      let cur = this.freelist[lvl]
      const arr = []
      while (cur !== -1) {
        arr.push(cur)
        const nex = this.get_next(cur)
        if (nex === cur) break
        cur = nex
      }
      console.log('LEVEL', lvl, arr)
    }
  }

  add_list(addr: number, lvl: number) {
    this.set_level(addr, lvl)
    this.set_prev(addr, addr)
    if (this.freelist[lvl] === -1) {
      this.set_next(addr, addr)
    } else {
      this.set_next(addr, this.freelist[lvl])
      this.set_prev(this.freelist[lvl], addr)
    }
    this.freelist[lvl] = addr
  }

  pop_list(addr: number) {
    const lvl = this.get_level(addr)
    const prev_addr = this.get_prev(addr)
    const next_addr = this.get_next(addr)
    if (prev_addr === addr) {
      // Is head
      this.freelist[lvl] = next_addr === addr ? -1 : next_addr
    } else {
      this.set_next(prev_addr, next_addr === addr ? prev_addr : next_addr)
    }
    if (next_addr !== addr) {
      this.set_prev(next_addr, prev_addr === addr ? next_addr : prev_addr)
    }
    this.memory.set_word(0, addr)
  }

  get_prev(addr: number) {
    return this.memory.get_bits(addr, 29, 6) * 2
  }

  set_prev(addr: number, val: number) {
    this.memory.set_bits(val / 2, addr, 29, 6)
  }

  get_next(addr: number) {
    return this.memory.get_bits(addr + 1, 29, 3) * 2
  }

  set_next(addr: number, val: number) {
    this.memory.set_bits(val / 2, addr + 1, 29, 3)
  }

  set_level(addr: number, lvl: number) {
    this.memory.set_bits(lvl, addr, 5, 1)
  }

  get_level(addr: number) {
    return this.memory.get_bits(addr, 5, 1)
  }

  get_size(addr: number) {
    return 2 ** this.get_level(addr)
  }

  is_free(addr: number) {
    return this.memory.get_bits(addr, 1) === 1
  }

  set_free(addr: number, free: boolean) {
    this.memory.set_bits(free ? 1 : 0, addr, 1)
  }

  // [********** Buddy Block Allocation + Free-ing ****************]

  allocate(size: number) {
    const try_allocate = () => {
      const lvl = Math.max(1, this.calc_level(size))
      for (let cur_lvl = lvl; cur_lvl < this.freelist.length; cur_lvl++) {
        if (this.freelist[cur_lvl] !== -1) {
          const addr = this.freelist[cur_lvl]
          this.pop_list(addr)
          this.set_free(addr, false)
          while (cur_lvl > lvl) {
            cur_lvl--
            const sibling = addr + 2 ** cur_lvl
            this.set_free(sibling, true)
            this.add_list(sibling, cur_lvl)
          }
          this.set_level(addr, lvl)
          return addr
        }
      }
      return -1
    }

    let addr = try_allocate()
    if (addr === -1) {
      this.mark_and_sweep()
      addr = try_allocate()
    }
    if (addr === -1) throw Error('Ran out of memory!')
    size = this.get_size(addr)
    this.mem_left -= size
    return addr
  }

  free(addr: number) {
    let lvl = this.get_level(addr)
    this.mem_left += 2 ** lvl
    while (lvl < this.freelist.length) {
      const sibling = addr ^ (1 << lvl)
      if (
        sibling >= this.size ||
        !this.is_free(sibling) ||
        this.get_level(sibling) !== lvl
      )
        break
      this.set_free(sibling, false)
      this.pop_list(sibling)
      addr = Math.min(addr, sibling)
      lvl++
    }
    this.set_free(addr, true)
    this.add_list(addr, lvl)

    this.debugger?.identifier_map.delete(addr)
    return addr + (1 << lvl)
  }
  calc_level(x: number) {
    return Math.ceil(Math.log2(x))
  }

  temp_push(addr: number) {
    this.temp = addr
    this.temp_roots.push(addr)
    this.temp = -1
  }

  temp_pop() {
    this.temp_roots.pop()
  }

  // [********** Garbage Collection: Mark and Sweep ****************]

  is_marked(addr: number) {
    return this.memory.get_bits(addr, 1, 6) === 1
  }

  set_mark(addr: number, mark: boolean) {
    this.memory.set_bits(mark ? 1 : 0, addr, 1, 6)
  }

  get_child(addr: number, index: number) {
    return this.memory.get_word(addr + index)
  }

  set_child(val: number, addr: number, index: number) {
    this.memory.set_word(val, addr + index)
  }

  set_end_child(addr: number, index: number) {
    this.memory.set_number(-1, addr + index)
  }

  set_children(addr: number, children: number[], offset = 1) {
    const max_size = this.get_size(addr) + addr
    addr += offset
    if (children.length + addr > max_size) throw Error('Too many children!')
    for (let i = 0; i < children.length; i++) {
      this.set_child(children[i], addr, i)
    }
    if (children.length + addr < max_size) {
      this.set_end_child(addr, children.length)
    }
  }

  get_children(addr: number, offset = 1) {
    const max_size = this.get_size(addr) + addr
    addr += offset
    const children: number[] = []
    let idx = 0
    while (idx + addr < max_size) {
      if (this.get_child(addr, idx) === -1) break
      children.push(this.get_child(addr, idx))
      idx++
    }
    return children
  }

  mark(addr: number) {
    if (addr === -1) return
    if (this.is_marked(addr)) return
    this.set_mark(addr, true)
    const val = this.get_value(addr)
    const children = val.get_children()
    for (const child of children) {
      this.mark(child)
    }
  }

  mark_and_sweep() {
    console.log('CLEAN')
    // console.trace()
    const roots: number[] = [
      this.contexts.addr,
      this.blocked_contexts.addr,
      this.temp_roots.addr,
      this.UNASSIGNED.addr,
      this.temp,
    ]
    for (const root of roots) {
      this.mark(root)
    }
    for (let cur_addr = 0; cur_addr < this.size; ) {
      if (!this.is_free(cur_addr) && !this.is_marked(cur_addr)) {
        cur_addr = this.free(cur_addr)
      } else {
        if (this.is_marked(cur_addr)) this.set_mark(cur_addr, false)
        cur_addr += this.get_size(cur_addr)
      }
    }
    return
  }

  copy(dst: number, src: number) {
    if (dst === -1) return
    if (dst === src) return
    let sz = this.get_size(src)
    if (this.get_type(src) instanceof Int64Type) sz = 4
    if (this.get_type(src) instanceof BoolType) sz = 1
    if (this.get_type(src) instanceof Float64Type) sz = 4
    if (this.get_type(src) instanceof StringType) sz = 2
    for (let i = 0; i < sz; i++) {
      this.memory.set_word(this.memory.get_word(src + i), dst + i)
    }
  }

  clone(addr: number) {
    const sz = 2 ** this.get_level(addr)
    const res = this.allocate(sz)
    // console.log("clone", res)
    this.copy(res, addr)
    return res
  }

  /**
   *                [ Word Format ]
   *
   *     Free Node: [1 bit free bit] [5 bits Level data] [29 bits Prev Node] [29 bits Next Node]
   * Not-Free Node: [1 bit free bit] [5 bits Level data] [1 bit Mark & Sweep] [1 bit Used]
   *                [1 Byte Type Tag] [2 Bytes Payload - Depends on type]
   *
   * Assumptions:
   *    - Address space is 2^32 bytes or 2^29 words max (Browser Memory Limit is 64 GB)
   *    - Nodes that store data in their adjacent nodes have no children
   * Notes:
   *    - We can actually store the children in ceiling(children/2) words instead
   */

  set_tag(addr: number, tag: number) {
    this.memory.set_bytes(tag, addr, 1, 1)
  }

  get_tag(addr: number) {
    return this.memory.get_bytes(addr, 1, 1)
  }
}
