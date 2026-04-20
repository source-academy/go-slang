import { Instruction } from '../executor/instructions'
import { GCPHASE, Heap } from '../heap'

import { DebuggerV2 } from './debuggerV2'
import { MessageType, WorkerToScheduler } from './message'
import { ProcessV2, ProcessV2Status } from './processV2'

export enum ThreadState {
    READY,
    RUNNING,
    BLOCKED,
}

export class Thread {
    thread_id: number
    heap: Heap
    process: ProcessV2
    debugger: DebuggerV2
    alloc_depth: number

    local_runqueue_addr: number
    main_goroutine_addr: number

    deterministic: boolean
    visual_mode: boolean
 
    // Per-worker free cache: block_size -> list of free addresses. Lets this worker re-use freed blocks on the next allocation without competing for alloc_lock.
    local_free_cache: Map<number, number[]>

    constructor(
        thread_id: number,
        runqueue: number,
        instructions: Instruction[],
        heap: Heap,
        debug: DebuggerV2,
        deterministic: boolean,
        visualmode = false,
        main_goroutine_addr: number
    ) {
        this.thread_id = thread_id
        this.heap = heap
        this.debugger = debug
        this.alloc_depth = 0
        this.local_runqueue_addr = runqueue
        this.main_goroutine_addr = main_goroutine_addr
        this.deterministic = deterministic
        this.visual_mode = visualmode
        // Change to create pass in heap
        this.process = new ProcessV2(
            this.thread_id,
            instructions,
            this.heap,
            this.main_goroutine_addr,
            this.local_runqueue_addr,
            this.deterministic,
            this.visual_mode,
            this.debugger
        )
        this.local_free_cache = new Map()
    }
 
    // Return all cached blocks to the global buddy allocator so other workers can allocate them.
    flush_cache() {
        for (const [_, addrs] of this.local_free_cache) {
            for (const addr of addrs) {
                // free_to_global sets is_free, so the sweeper will skip this block from this point on.
                this.heap.free_to_global(addr)
                // Preserve SATB only while a GC cycle is underway; unconditional marking would
                // prevent reclamation of these blocks in future cycles.
                if (this.heap.metadata.get_gc_phase() !== GCPHASE.NONE) {
                    this.heap.gc_bitmap.set_mark(addr, true)
                }
                // Release from cache last — is_free already protects the block, but this keeps
                // the bitmap consistent for any future sweep that checks it.
                this.heap.cache_bitmap.set_mark(addr, false)
            }
        }
        this.local_free_cache.clear()
    }

    run() {
        const result = this.process.start()
        switch (result.status) {
            case ProcessV2Status.ERROR: {
                const errMsg: WorkerToScheduler = {
                    type: MessageType.ERROR,
                    thread_id: this.thread_id,
                    error_message: result.message,
                }
                postMessage(errMsg)
                break;
            }
            case ProcessV2Status.EMPTY_RUNQUEUE: {
                this.flush_cache()
                const rdyMsg: WorkerToScheduler = {
                    type: MessageType.READY,
                    thread_id: this.thread_id,
                }
                postMessage(rdyMsg)
                break;
            }
            case ProcessV2Status.FINISHED: {
                const finishMsg: WorkerToScheduler = {
                    type: MessageType.FINISHED,
                    thread_id: this.thread_id,
                }
                postMessage(finishMsg)
            }
        }
    }
}