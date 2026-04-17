import { } from '../executor/typing'
import { BoolType } from '../executor/typing/bool_type'
import { Float64Type } from '../executor/typing/float64_type'
import { Int64Type } from '../executor/typing/int64_type'
import { NoType } from '../executor/typing/no_type'
import { StringType } from '../executor/typing/string_type'
import { is_multithreaded } from '../runtime'
import { Debugger } from '../runtime/debugger'
import { MessageType, WorkerToScheduler } from '../runtime/message'
import { local_thread } from '../runtime/worker'

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
import { CounterNode, FlagNode, LockNode } from './types/internal'
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
import { RunQueueNode } from './types/runqueue'
import { SaveStackNode } from './types/saveStack'
import { StackListNode, StackNode } from './types/stack'
import { StructNode } from './types/struct'
import { UnsafePkgNode } from './types/unsafe'
import { WaitGroupNode } from './types/waitGroup'
import { BitMap } from './bitmap'
import { Freelist } from './freelist'
import { GCProfiler } from './gc_profiler'
import { Memory } from './memory'
import { MetaData } from './metadata'

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
  RUNQUEUE = 34,
  LOCK = 35,
  COUNTER = 36,
  FLAG = 37,
}

export enum GCPHASE {
  INVALID = -1,
  NONE = 0,
  MARK = 1,
  SWEEP = 2,
}

export type LoadHeapConfig = {
  mem_sab: SharedArrayBuffer;
  metadata_sab: SharedArrayBuffer;
  freelist_sab: SharedArrayBuffer;
  bitmap_sab: SharedArrayBuffer;
  unassigned: number;
  save_stack_addrs: number[];
  alloc_lock_addr: number;
  alloc_count_addr: number;
  gc_init_flag_addr: number;
  save_stack_flag_addr: number;
}

export const word_size = 4
export const is_tri_color = true

export class Heap {
  memory: Memory // Assume memory is an array of 8 byte words, holds actual memory
  size: number // Total number of words in memory
  UNASSIGNED: UnassignedNode // Unassigned memory
  freelist: Freelist // SAB of linked lists storing free blocks at that size
  max_level: number // Largest block size power of 2 supported
  temp_roots: StackNode // [Single Threaded] Temporary stack of root references
  contexts: QueueNode // [Single Threaded] Queue to schedule execution contexts
  blocked_contexts: LinkedListNode // [Single Threaded] Linked list of blocked execution contexts
  metadata: MetaData // [Mem Left] [GC Phase] [Sweeper] [GC Target Mem]
  temp = -1 // [Single Threaded] Temp register to hold an address
  debugger: Debugger | undefined
  mark_stack: number[] // [Only GC Thread] Stack used to track gray nodes, only accessed by GC thread
  bitmap: BitMap // SAB to store mark status, used for tri-color
  save_stack_addrs: number[] // [PER THREAD EXPECT FOR GC] Used to mark for Yuasa write barrier
  GOGC: number // Ratio used to determine GC target memory
  gc_heap_min: number // Minimum ratio (decimals) of total memory to be used for GOGC to be checked
  gc_profiler: GCProfiler // [Only GC Thread] Get stats for GC
  is_alloc_ready = false // Set to true only after allocation occurs in memory
  alloc_lock_addr: number // Lock for allocation
  alloc_count_addr: number // Total number of allocations ongoing (to sync with GC)
  gc_init_flag_addr: number // Address of GC Init Flag which indicates if GC wants to initialise
  save_stack_flag_addr: number // Address of save stack flag to indicate if GC wants to pop from save stack
  constructor(size: number, config?: LoadHeapConfig) {
    this.size = size
    // Size must be power of 2 for buddy allocation
    if (this.size % 2 === 1) this.size -= 1
    if (this.size < 34) throw Error('Insufficient Memory')
    this.GOGC = 100
    this.gc_heap_min = 0.3
    const initialise_heap = config === undefined
    this.memory = initialise_heap ? Memory.create(size, word_size) : Memory.load(config.mem_sab, word_size)
    this.metadata = initialise_heap ? MetaData.create(size, this.gc_heap_min, word_size) : MetaData.load(config.metadata_sab, word_size)
    this.mark_stack = []
    this.bitmap = initialise_heap ? BitMap.create(this.size, word_size) : BitMap.load(config.bitmap_sab, word_size)
    this.save_stack_addrs = initialise_heap ? [] : config.save_stack_addrs
    this.gc_profiler = new GCProfiler()
    this.max_level = Math.floor(Math.log2(size)) + 1
    this.freelist = initialise_heap ? Freelist.create(this.max_level, word_size) : Freelist.load(config.freelist_sab, word_size)
    if (initialise_heap) {
      let cur_addr = 0
      while (cur_addr < size) {
        this.set_free(cur_addr, true)
        const lvl = Math.floor(Math.log2(size - cur_addr))
        this.add_list(cur_addr, lvl)
        cur_addr += 2 ** lvl
      }
    }
    // Create internal nodes needed for memory allocation first
    this.alloc_lock_addr = initialise_heap ? LockNode.create(this).addr : config.alloc_lock_addr
    this.alloc_count_addr = initialise_heap ? CounterNode.create(this).addr : config.alloc_count_addr
    this.gc_init_flag_addr = initialise_heap ? FlagNode.create(this).addr : config.gc_init_flag_addr
    this.save_stack_flag_addr = initialise_heap ? FlagNode.create(this).addr : config.save_stack_flag_addr
    this.UNASSIGNED = initialise_heap ? UnassignedNode.create(this) : this.get_value(config.unassigned) as UnassignedNode
    // --- For single threaded ---
    this.temp_roots = is_multithreaded ? new StackNode(this, 0) : StackNode.create(this) // Only used for single threaded
    this.contexts = is_multithreaded ? new QueueNode(this, 0) : QueueNode.create(this) // Only used for single threaded
    this.blocked_contexts = is_multithreaded ? new LinkedListNode(this, 0) : LinkedListNode.create(this) // Only used for single threaded
    // Create first execution context so that it can run (only single threaded)
    if (!is_multithreaded) {
      const context = ContextNode.create(this) // Only used for single threaded
      this.contexts.push(context.addr) // Only used for single threaded
    }
    this.metadata.set_gc_phase(GCPHASE.NONE)
    this.is_alloc_ready = !initialise_heap // If initialising, wait for main goroutine and runqueues to be created
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
      case TAG.RUNQUEUE:
        return new RunQueueNode(this, addr)
      case TAG.LOCK:
        return new LockNode(this, addr)
      case TAG.COUNTER:
        return new CounterNode(this, addr)
      case TAG.FLAG:
        return new FlagNode(this, addr)
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
      let cur = this.freelist.get_value(lvl)
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
    if (this.freelist.get_value(lvl) === -1) {
      // If freelist is empty at this level, set next pointer to self
      this.set_next(addr, addr)
    } else {
      // If freelist not empty, insert block before the current freelist head and update the old head's prev pointer to addr
      this.set_next(addr, this.freelist.get_value(lvl))
      this.set_prev(this.freelist.get_value(lvl), addr)
    }
    this.freelist.set_value(lvl, addr)
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
      this.freelist.set_value(lvl, next_addr === addr ? -1 : next_addr)
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
    // Handle case where addr is invalid
    if (addr === -1) {
      return 0
    }
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
    this.is_alloc_ready && (this.get_value(this.alloc_lock_addr) as LockNode).get_lock()
    // Try allocating to the smallest possible available memory
    const try_allocate = () => {
      const lvl = Math.max(1, this.calc_level(size))
      for (let cur_lvl = lvl; cur_lvl < this.freelist.length; cur_lvl++) {
        if (this.freelist.get_value(cur_lvl) !== -1) {
          const addr = this.freelist.get_value(cur_lvl)
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
      if (is_multithreaded && this.metadata.get_gc_phase() !== GCPHASE.INVALID) {
        this.metadata.set_out_of_mem(true)
        const gen = this.metadata.get_gc_cycle()
        const message: WorkerToScheduler = {
          type: MessageType.GC,
          thread_id: local_thread.thread_id,
        }
        postMessage(message)
        while (this.metadata.get_gc_cycle() === gen) {
          this.metadata.wait_gc_cycle(gen)
        }
        this.metadata.set_out_of_mem(false)
      } else if (is_tri_color && this.metadata.get_gc_phase() !== GCPHASE.INVALID) {
        do {
          this.tri_color_step()
        } while (this.metadata.get_gc_phase() !== GCPHASE.NONE)
      } else if (!is_tri_color) {
        this.mark_and_sweep()
      }
      addr = try_allocate()
    }
    if (addr === -1) {
      this.is_alloc_ready && (this.get_value(this.alloc_lock_addr) as LockNode).release_lock()
      throw Error('Ran out of memory!')
    }
    size = this.get_size(addr)
    if (is_multithreaded) {
      this.metadata.increment_alloc_total(size)
    } else {
      this.gc_profiler.increment_alloc(size)
    }
    this.metadata.increment_mem_left(-size)

    if (is_multithreaded
      && this.metadata.get_gc_phase() === GCPHASE.NONE
      && (this.size - this.metadata.get_mem_left() >= this.metadata.get_gc_target_mem())) {
      // const flag = this.get_value(this.gc_init_flag_addr) as FlagNode
      // flag.set_flag(1)
      const message: WorkerToScheduler = {
        type: MessageType.GC,
        thread_id: local_thread.thread_id,
      }
      postMessage(message)
    } else if (is_tri_color && this.metadata.get_gc_phase() !== GCPHASE.INVALID) {
      switch (this.metadata.get_gc_phase()) {
        case GCPHASE.NONE:
          if (this.size - this.metadata.get_mem_left() >= this.metadata.get_gc_target_mem()) {
            this.initiate_tri_color()
          }
          break
        case GCPHASE.MARK:
          // If GC cycle is underway, mark as black
          this.bitmap.set_mark(addr, true)
          break
        case GCPHASE.SWEEP:
          if (this.metadata.get_sweeper() <= addr) {
            this.bitmap.set_mark(addr, true)
          }
          break
      }
    }
    this.is_alloc_ready && (this.get_value(this.alloc_lock_addr) as LockNode).release_lock()
    return addr
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Frees memory in a buddy allocator system
   * @return End address of the merged free block
   */
  free(addr: number) {
    !this.metadata.get_out_of_mem() && (this.get_value(this.alloc_lock_addr) as LockNode).get_lock() // If out of memory, a worker will be holding onto the lock
    let lvl = this.get_level(addr)
    this.metadata.increment_mem_left(2 ** lvl)
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
    if (is_multithreaded) {
      this.metadata.increment_freed_total(this.get_size(addr))
    } else {
      this.gc_profiler.increment_freed(this.get_size(addr))
    }

    this.debugger?.identifier_map.delete(addr);
    !this.metadata.get_out_of_mem() && (this.get_value(this.alloc_lock_addr) as LockNode).release_lock()
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
    if (!is_multithreaded) {
      // Use temp to safeguard handling temporary GC roots
      this.temp = addr
      this.temp_roots.push(addr)
      this.temp = -1
    }
  }

  /**
   * Removes last temporary root from the stack
   */
  temp_pop() {
    if (!is_multithreaded) {
      this.temp_roots.pop()
    }
  }

  handle_before_alloc() {
    if (is_multithreaded && this.is_alloc_ready) {
      const flag = this.get_value(this.gc_init_flag_addr) as FlagNode
      if (flag.get_flag() === 1 && (local_thread === undefined || local_thread.alloc_depth === 0)) {
        flag.sleep_thread(1)
      }

      if (local_thread !== undefined) local_thread.alloc_depth += 1 // Done locally within same thread so no race condition
      const total_alloc_count = this.get_value(this.alloc_count_addr) as CounterNode
      total_alloc_count.increase_count()

      // Recheck after increment
      if (flag.get_flag() === 1 && (local_thread === undefined || local_thread.alloc_depth === 1)) {
        flag.sleep_thread(1)
      }
    }
  }

  handle_after_alloc() {
    if (is_multithreaded && this.is_alloc_ready) {
      if (local_thread !== undefined) local_thread.alloc_depth -= 1
      const total_alloc_count = this.get_value(this.alloc_count_addr) as CounterNode
      total_alloc_count.decrease_count()
    }
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
   * @return Child addr representing child object
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

  tri_color_step(all_contexts: number[] = []) {
    switch (this.metadata.get_gc_phase()) {
      case GCPHASE.NONE:
        this.initiate_tri_color(all_contexts)
        break
      case GCPHASE.MARK:
        // Must make it stop all other webworkers
        this.mark_tri_color(10, 4)
        break
      case GCPHASE.SWEEP:
        this.sweep_tri_color(10, all_contexts)
        break
    }
  }

  initiate_tri_color(all_contexts: number[] = []) {
    this.gc_profiler.start_pause()
    console.log("TRI COLOR START")
    const lock = this.get_value(this.alloc_lock_addr) as LockNode
    if (!is_multithreaded) {
      all_contexts = [
        this.contexts.addr, // Current running program state
        this.blocked_contexts.addr, // Suspended goroutines
      ]
    } else {
      if (!this.metadata.get_out_of_mem()) lock.get_lock()
    }
    // All root references
    const roots: number[] = [
      ...all_contexts,
      this.temp_roots.addr, // Stack of temporary roots
      this.UNASSIGNED.addr, // Special global constant or object
      this.alloc_lock_addr, // Heap's lock for allocating memory
      this.alloc_count_addr, // Number of allocations occuring
      this.gc_init_flag_addr, // GC flag for whether GC wants to mark
      this.save_stack_flag_addr,
      ...this.save_stack_addrs,
      this.temp, // Single temp pointer
    ]
    for (const root of roots) {
      if (root === -1) continue
      this.mark_gray(root)
    }
    if (is_multithreaded) {
      if (!this.metadata.get_out_of_mem()) lock.release_lock()
      const flag = this.get_value(this.gc_init_flag_addr) as FlagNode
      flag.set_flag(0)
      flag.notify_threads()
    }
    this.metadata.set_gc_phase(GCPHASE.MARK)
    this.gc_profiler.end_pause()
    return
  }

  /**
   * @param addr Starting Byte of the Memory
   * @desc Plan to deprecate
   * @desc Mark phase of mark and sweep
   */
  mark_tri_color(k1: number, k2: number) {
    if (is_multithreaded) {
      this.gc_profiler.start_increment()
    } else {
      this.gc_profiler.start_pause()
    }
    // Process mark stack
    for (let i = 0; i < k1; i++) {
      const addr = this.mark_stack.pop()
      if (addr === undefined) break
      if (addr === -1) continue
      // Get the node object representation at addr
      const val = this.get_value(addr)
      const children = val.get_children()
      for (const child of children) {
        if (child === -1) continue
        this.mark_gray(child)
      }
    }

    // Transfer from save stacks to mark stack
    const flag = this.get_value(this.save_stack_flag_addr) as FlagNode
    flag.set_flag(1)

    // If save stacks are all empty, no reason to try popping from them
    let is_save_stack_empty = true
    for (let i = 0; i < this.save_stack_addrs.length; i++) {
      const save_stack = this.get_value(this.save_stack_addrs[i % this.save_stack_addrs.length]) as SaveStackNode
      if (save_stack.sz() > 0) {
        is_save_stack_empty = false
        break
      }
    }

    if (!is_save_stack_empty) {
      for (let i = 0; i < k2; i++) {
        const save_stack = this.get_value(this.save_stack_addrs[i % this.save_stack_addrs.length]) as SaveStackNode
        const addr = save_stack.pop()
        if (addr === undefined || addr === -1) {
          i -= 1
          continue
        }
        this.mark_gray(addr)
      }

      // Check if save stack is empty again to handle termination condition
      for (let i = 0; i < this.save_stack_addrs.length; i++) {
        const save_stack = this.get_value(this.save_stack_addrs[i % this.save_stack_addrs.length]) as SaveStackNode
        if (save_stack.sz() > 0) {
          is_save_stack_empty = false
          break
        }
      }
    }


    // Check if mark phase should be terminated
    if (this.mark_stack.length === 0 && is_save_stack_empty) {
      this.metadata.set_gc_phase(GCPHASE.SWEEP)
    }
    flag.set_flag(0)
    flag.notify_threads()
    if (is_multithreaded) {
      this.gc_profiler.end_increment()
    } else {
      this.gc_profiler.end_pause()
    }
  }

  sweep_tri_color(k3: number, all_contexts: number[] = []) {
    if (is_multithreaded) {
      this.gc_profiler.start_increment()
    } else {
      this.gc_profiler.start_pause()
    }
    for (let i = 0; i < k3; i++) {
      if (this.metadata.get_sweeper() >= this.size) {
        this.terminate_sweep(all_contexts)
        break
      }
      // Store original addr before increasing sweeper
      const addr = this.metadata.get_sweeper()
      if (!this.bitmap.is_marked(addr)) {
        this.metadata.set_sweeper(this.free(addr))
      } else {
        this.bitmap.set_mark(addr, false)
        this.metadata.increment_sweeper(this.get_size(addr))
      }
    }
    // check in case sweeper exceeds size only at the end
    if (this.metadata.get_sweeper() >= this.size) {
      this.terminate_sweep(all_contexts)
    }
    if (is_multithreaded) {
      this.gc_profiler.end_increment()
    } else {
      this.gc_profiler.end_pause()
    }
  }

  terminate_sweep(all_contexts: number[] = []) {
    this.metadata.set_sweeper(0)
    this.metadata.set_gc_phase(GCPHASE.NONE)
    this.calc_target_mem(all_contexts)
    this.gc_profiler.end_gc_cycle()
  }

  mark_gray(addr: number) {
    if (this.bitmap.is_marked(addr)) return
    this.bitmap.set_mark(addr, true)
    this.mark_stack.push(addr)
  }

  mark_save_stack(addr: number) {
    if (this.bitmap.is_marked(addr)) return
    const flag = this.get_value(this.save_stack_flag_addr) as FlagNode
    flag.sleep_thread(1)
    this.bitmap.set_mark(addr, true)
    const save_stack = this.get_value(this.save_stack_addrs[0]) as SaveStackNode
    save_stack.push(addr)
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
      this.alloc_lock_addr, // Heap's lock for allocating memory
      this.alloc_count_addr, // Number of allocations occuring
      this.gc_init_flag_addr, // GC flag for whether GC wants to mark
      this.save_stack_flag_addr,
      ...this.save_stack_addrs,
      this.temp, // Single temp pointer
    ]
    for (const root of roots) {
      this.mark(root)
    }
    // Sweep phase
    for (let cur_addr = 0; cur_addr < this.size;) {
      if (!this.is_free(cur_addr) && !this.is_marked(cur_addr)) {
        // Free memory since it is used but unmarked
        cur_addr = this.free(cur_addr)
      } else {
        // Reset marking to false
        if (this.is_marked(cur_addr)) this.set_mark(cur_addr, false)
        cur_addr += this.get_size(cur_addr)
      }
    }
    this.gc_profiler.end_pause()
    this.gc_profiler.end_gc_cycle()
    return
  }

  get_roots_mem(all_contexts: number[] = []): number {
    if (!is_multithreaded) {
      all_contexts = [
        this.contexts.addr, // Current running program state
        this.blocked_contexts.addr, // Suspended goroutines
      ]
    }
    // All root references
    const roots: number[] = [
      ...all_contexts,
      this.temp_roots.addr, // Stack of temporary roots
      this.UNASSIGNED.addr, // Special global constant or object
      this.alloc_lock_addr, // Heap's lock for allocating memory
      this.alloc_count_addr, // Number of allocations occuring
      this.gc_init_flag_addr, // GC flag for whether GC wants to mark
      this.save_stack_flag_addr,
      ...this.save_stack_addrs,
      this.temp, // Single temp pointer
    ]
    let size = 0
    for (const root of roots) {
      size += this.get_size(root)
    }
    return size
  }

  calc_target_mem(all_contexts: number[] = []) {
    const live_heap = this.size - this.metadata.get_mem_left()
    const res =
      live_heap + (live_heap + this.get_roots_mem(all_contexts)) * (this.GOGC / 100)
    this.metadata.set_gc_target_mem(Math.max(res, this.size * this.gc_heap_min))
  }

  /**
   * @param dst Starting Byte of the Memory to be copied to
   * @param src Starting Byte of the Memory to be copied from
   * @desc Copy value over
   */
  copy(dst: number, src: number) {
    if (dst === -1) return
    if (dst === src) return
    if (dst === this.alloc_lock_addr) {
        console.log("ILLEGAL COPY TO ALLOC LOCK", new Error().stack)
        return
    }
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
