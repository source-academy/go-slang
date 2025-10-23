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
import { BitMap } from './bitmap'
import { GCProfiler } from './gc_profiler'
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

export enum GCPHASE {
  NONE = 0,
  MARK = 1,
  SWEEP = 2,
}

export const word_size = 4
export const is_tri_color = false

export class Heap {
  memory: Memory // Assume memory is an array of 8 byte words, holds actual memory
  size: number // Total number of words in memory
  UNASSIGNED: UnassignedNode // Unassigned memory
  freelist: number[] // List of linked lists storing free blocks at that size
  max_level: number // Largest block size power of 2 supported
  temp_roots: StackNode // Temporary stack of root references
  contexts: QueueNode // Queue to schedule execution contexts
  blocked_contexts: LinkedListNode // Linked list of blocked execution contexts
  mem_left: number // Tracks remaining memory
  temp = -1 // Temp register to hold an address
  debugger: Debugger | undefined
  mark_stack: number[]
  gc_phase: GCPHASE
  bitmap: BitMap
  save_stack: number[]
  sweeper: number
  GOGC: number
  gc_heap_min: number
  gc_target_mem: number
  gc_profiler: GCProfiler
  constructor(size: number) {
    this.size = size
    this.mem_left = size
    // Size must be power of 2 for buddy allocation
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
    // Create first execution context so that it can run
    const context = ContextNode.create(this)
    this.contexts.push(context.addr)
    this.mark_stack = []
    this.gc_phase = GCPHASE.NONE
    this.bitmap = new BitMap(this.size, word_size)
    this.save_stack = [] // to initialise
    this.sweeper = 0
    this.GOGC = 0
    this.gc_heap_min = 0.5
    this.gc_target_mem = this.size * this.gc_heap_min
    this.gc_profiler = new GCProfiler()
  }

  /**
   * @param addr Starting Byte of the Memory
   * @returns Node class representing the object at that address
   */
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

  /**
   * @param addr Starting Byte of the Memory
   * @returns Type object representing the type at that address
   */
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

  /**
   * @param addr Starting Byte of the Memory
   * @param lvl Block size power of 2
   * @desc Add addr to freelist at the specified level
   */
  add_list(addr: number, lvl: number) {
    // Mark block at addr to lvl
    this.set_level(addr, lvl)
    // Set its previous pointer to itself
    this.set_prev(addr, addr)
    if (this.freelist[lvl] === -1) {
      // If freelist is empty at this level, set next pointer to self
      this.set_next(addr, addr)
    } else {
      // If freelist not empty, insert block before the current freelist head and update the old head's prev pointer to addr
      this.set_next(addr, this.freelist[lvl])
      this.set_prev(this.freelist[lvl], addr)
    }
    this.freelist[lvl] = addr
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Remove addr from freelist at the specified level
   */
  pop_list(addr: number) {
    const lvl = this.get_level(addr)
    const prev_addr = this.get_prev(addr)
    const next_addr = this.get_next(addr)
    if (prev_addr === addr) {
      // Is head
      // Set head to either the next address or -1 if no other addr
      this.freelist[lvl] = next_addr === addr ? -1 : next_addr
    } else {
      // Remove addr from the previous addr's next node
      this.set_next(prev_addr, next_addr === addr ? prev_addr : next_addr)
    }
    // Remove addr from the next addr's prev node
    if (next_addr !== addr) {
      this.set_prev(next_addr, prev_addr === addr ? next_addr : prev_addr)
    }
    // Wipe the block's first word in memory
    this.memory.set_word(0, addr)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Prev addr stored at bit 7 using 29 bits (addr word aligned so stored as /2)
   */
  get_prev(addr: number) {
    return this.memory.get_bits(addr, 29, 6) * 2
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param val Starting Byte of the prev addr
   * @desc Set prev addr at bit 7 using 29 bits (addr word aligned so stored as /2)
   */
  set_prev(addr: number, val: number) {
    this.memory.set_bits(val / 2, addr, 29, 6)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Next addr stored in next word at bit 36 using 29 bits (addr word aligned so stored as /2)
   */
  get_next(addr: number) {
    return this.memory.get_bits(addr + 1, 29, 3) * 2
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param val Starting Byte of the next addr
   * @desc Set next addr in next word at bit 36 using 29 bits (addr word aligned so stored as /2)
   */
  set_next(addr: number, val: number) {
    this.memory.set_bits(val / 2, addr + 1, 29, 3)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param lvl Block size power of 2
   * @desc Set level at bit 2 using 5 bits
   */
  set_level(addr: number, lvl: number) {
    this.memory.set_bits(lvl, addr, 5, 1)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Get level at bit 2 using 5 bits
   */
  get_level(addr: number) {
    return this.memory.get_bits(addr, 5, 1)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Get size using 2 to the power of the level
   */
  get_size(addr: number) {
    return 2 ** this.get_level(addr)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Checks if first bit is 1 to determine is free
   */
  is_free(addr: number) {
    return this.memory.get_bits(addr, 1) === 1
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param free Should addr be free or not
   * @desc Sets the addr to free or not free
   */
  set_free(addr: number, free: boolean) {
    this.memory.set_bits(free ? 1 : 0, addr, 1)
  }

  // [********** Buddy Block Allocation + Free-ing ****************]

  /**
   * @param size Size of memory to be allocated
   * @desc Allocates memory using buddy allocator
   */
  allocate(size: number) {
    // Try allocating to th smallest possible available memory
    const try_allocate = () => {
      const lvl = Math.max(1, this.calc_level(size))
      for (let cur_lvl = lvl; cur_lvl < this.freelist.length; cur_lvl++) {
        if (this.freelist[cur_lvl] !== -1) {
          const addr = this.freelist[cur_lvl]
          this.pop_list(addr)
          this.set_free(addr, false)
          while (cur_lvl > lvl) {
            cur_lvl--
            // split block into half since higher levels are at least twice as big
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
    // Update mark to be done concurrently while sweep be done when GOGC ratio is hit
    if (addr === -1) {
      if (is_tri_color) {
        do {
          this.tri_color_step()
        } while (this.gc_phase !== GCPHASE.NONE)
      } else {
        this.mark_and_sweep()
      }
      addr = try_allocate()
    }
    if (addr === -1) throw Error('Ran out of memory!')
    size = this.get_size(addr)
    this.mem_left -= size
    //console.log(size)

    if (is_tri_color) {
      if (this.gc_phase === GCPHASE.NONE) {
        if (this.size - this.mem_left >= this.gc_heap_min) {
          // Needs to stop the world while occuring
          this.initiate_tri_color()
        }
      } else {
        // If GC cycle is underway, mark as black
        this.bitmap.set_mark(addr, true)
      }
    }
    return addr
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Frees memory in a buddy allocator system
   * @return End address of the merged free block
   */
  free(addr: number) {
    let lvl = this.get_level(addr)
    this.mem_left += 2 ** lvl
    console.log(this.get_value(addr))
    // Increase until the highest level
    while (lvl < this.freelist.length) {
      // Flipping the bit at pos lvl will go to sibling if it exists
      const sibling = addr ^ (1 << lvl)
      if (
        sibling >= this.size ||
        !this.is_free(sibling) ||
        this.get_level(sibling) !== lvl
      )
        break
      // Mark as false since we are using it to form a larger block
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

  /**
   * @param x Size of the memory being calculated for
   * @return Level with math ceil
   */
  calc_level(x: number) {
    return Math.ceil(Math.log2(x))
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Add address to a special stack
   */
  temp_push(addr: number) {
    // Use temp to safeguard handling temporary GC roots
    this.temp = addr
    this.temp_roots.push(addr)
    this.temp = -1
  }

  /**
   * Removes last temporary root from the stack
   */
  temp_pop() {
    this.temp_roots.pop()
  }

  // [********** Garbage Collection: Mark and Sweep ****************]

  /**
   * @param addr Starting Byte of the Memory
   * @return whether or not the addr has been marked by gc
   */
  is_marked(addr: number) {
    return this.memory.get_bits(addr, 1, 6) === 1
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param mark Whether the addr has been marked by gc
   */
  set_mark(addr: number, mark: boolean) {
    this.memory.set_bits(mark ? 1 : 0, addr, 1, 6)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param index Index of child
   * @return Child node representing child object
   */
  get_child(addr: number, index: number) {
    return this.memory.get_word(addr + index)
  }

  /**
   * @param val Value to be set in child node
   * @param addr Starting Byte of the Memory
   * @param index Index of child
   * @desc Set data stored in child node to val
   */
  set_child(val: number, addr: number, index: number) {
    this.memory.set_word(val, addr + index)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param index Index of child
   * @desc Set data stored in child node to sentinel -1 to indicate no more children
   */
  set_end_child(addr: number, index: number) {
    this.memory.set_number(-1, addr + index)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param children Array of children node
   * @param offset Number of words to offset
   * @desc Set children node in memory
   */
  set_children(addr: number, children: number[], offset = 1) {
    // End addr of block to ensure children do not exceed allocated block
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

  /**
   * @param addr Starting Byte of the Memory
   * @param offset Number of words to offset
   * @return List of all children nodes
   */
  get_children(addr: number, offset = 1) {
    // End addr of block to ensure children do not exceed allocated block
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

  /**
   * @param addr Starting Byte of the Memory
   * @desc Plan to deprecate
   * @desc Mark phase of mark and sweep
   */
  mark(addr: number) {
    if (addr === -1) return
    if (this.is_marked(addr)) return
    this.set_mark(addr, true)
    // Get the node object representation at addr
    const val = this.get_value(addr)
    const children = val.get_children()
    for (const child of children) {
      this.mark(child)
    }
  }

  tri_color_step() {
    switch (this.gc_phase) {
      case GCPHASE.MARK:
        // Must make it stop all other webworkers
        this.mark_tri_color(10, 4)
        break
      case GCPHASE.SWEEP:
        this.sweep_tri_color(10)
        this.calc_target_mem()
        break
    }
  }

  initiate_tri_color() {
    this.gc_profiler.start_pause()
    // console.trace()
    // All root references
    const roots: number[] = [
      this.contexts.addr, // Current running program state
      this.blocked_contexts.addr, // Suspended goroutines
      this.temp_roots.addr, // Stack of temporary roots
      this.UNASSIGNED.addr, // Special global constant or object
      this.temp, // Single temp pointer
    ]
    for (const root of roots) {
      this.mark_stack.push(root)
    }
    this.gc_phase = GCPHASE.MARK

    this.gc_profiler.end_pause()
    return
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Plan to deprecate
   * @desc Mark phase of mark and sweep
   */
  mark_tri_color(k1: number, k2: number) {
    this.gc_profiler.start_increment()
    // Process mark stack
    for (let i = 0; i < k1; i++) {
      const addr = this.mark_stack.shift()
      if (addr === undefined || addr === -1) break
      // Get the node object representation at addr
      const val = this.get_value(addr)
      const children = val.get_children()
      for (const child of children) {
        this.mark_gray(child)
      }
    }

    // Transfer from save stacks to mark stack
    for (let i = 0; i < k2; i++) {
      const addr = this.save_stack.shift()
      if (addr === undefined || addr === -1) break
      this.mark_gray(addr)
    }

    // Check if mark phase should be terminated
    if (this.mark_stack.length === 0 && this.save_stack.length === 0) {
      this.gc_phase = GCPHASE.SWEEP
    }
    this.gc_profiler.end_increment()
  }

  sweep_tri_color(k3: number) {
    this.gc_profiler.start_increment()
    for (let i = 0; i < k3; i++) {
      if (this.sweeper >= this.size) {
        this.gc_phase = GCPHASE.NONE
        this.gc_profiler.end_gc_cycle()
        return
      }
      if (!this.bitmap.is_marked(this.sweeper)) {
        this.free(this.sweeper)
      } else {
        this.bitmap.set_mark(this.sweeper, false)
      }
      // increment sweeper
      this.sweeper += this.get_size(this.sweeper)
    }
    this.gc_profiler.end_increment()
  }

  mark_gray(addr: number) {
    if (this.bitmap.is_marked(addr)) return
    this.bitmap.set_mark(addr, true)
    this.mark_stack.push(addr)
  }

  mark_and_sweep() {
    this.gc_profiler.start_pause()
    console.log('CLEAN')
    // console.trace()
    // All root references
    const roots: number[] = [
      this.contexts.addr, // Current running program state
      this.blocked_contexts.addr, // Suspended goroutines
      this.temp_roots.addr, // Stack of temporary roots
      this.UNASSIGNED.addr, // Special global constant or object
      this.temp, // Single temp pointer
    ]
    for (const root of roots) {
      this.mark(root)
    }
    // Sweep phase
    for (let cur_addr = 0; cur_addr < this.size; ) {
      if (!this.is_free(cur_addr) && this.is_marked(cur_addr)) {
        // Free memory since it is used but unmarked
        cur_addr = this.free(cur_addr)
      } else {
        // Reset marking to false
        if (!this.is_marked(cur_addr)) this.set_mark(cur_addr, false)
        cur_addr += this.get_size(cur_addr)
      }
    }
    this.gc_profiler.end_pause()
    this.gc_profiler.end_gc_cycle()
    return
  }

  get_roots_mem(): number {
    // All root references
    const roots: number[] = [
      this.contexts.addr, // Current running program state
      this.blocked_contexts.addr, // Suspended goroutines
      this.temp_roots.addr, // Stack of temporary roots
      this.UNASSIGNED.addr, // Special global constant or object
      this.temp, // Single temp pointer
    ]
    let size = 0
    for (const root of roots) {
      size += this.get_size(root)
    }
    return size
  }

  calc_target_mem() {
    const live_heap = this.size - this.mem_left
    const res =
      live_heap + (live_heap + this.get_roots_mem()) * (this.GOGC / 100)
    this.gc_target_mem = Math.max(res, this.size * this.gc_heap_min)
  }

  /**
   * @param dst Starting Byte of the Memory to be copied to
   * @param src Starting Byte of the Memory to be copied from
   * @desc Mark phase of mark and sweep
   */
  copy(dst: number, src: number) {
    if (dst === -1) return
    if (dst === src) return
    let sz = this.get_size(src)
    if (this.get_type(src) instanceof Int64Type) sz = 4
    if (this.get_type(src) instanceof BoolType) sz = 1
    if (this.get_type(src) instanceof Float64Type) sz = 4
    if (this.get_type(src) instanceof StringType) sz = 2
    // Copy over the values of all words
    for (let i = 0; i < sz; i++) {
      this.memory.set_word(this.memory.get_word(src + i), dst + i)
    }
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Create new independent copy of the object at addr
   * @return Addr of copy
   */
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

  /**
   * @param addr Starting Byte of the Memory
   * @param tag Type of object
   * @desc Set tag to indicate object type using 1 byte
   */
  set_tag(addr: number, tag: number) {
    this.memory.set_bytes(tag, addr, 1, 1)
  }

  /**
   * @param addr Starting Byte of the Memory
   * @return Tag to indicate object type
   */
  get_tag(addr: number) {
    return this.memory.get_bytes(addr, 1, 1)
  }
}
