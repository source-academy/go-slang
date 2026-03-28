import { TokenLocation } from '../compiler/tokens'
import { Instruction } from '../executor/instructions'
import { Heap, LoadHeapConfig } from '../heap'
import { ChannelNode } from '../heap/types/channel'
import { ContextNode } from '../heap/types/context'
import { EnvironmentNode, FrameNode } from '../heap/types/environment'
import { MutexNode } from '../heap/types/mutex'
import { RunQueueNode } from '../heap/types/runqueue'
import { SaveStackNode } from '../heap/types/saveStack'
import { WaitGroupNode } from '../heap/types/waitGroup'
import { ProgramData } from '..'

import { DebuggerV2 } from './debuggerV2'
import { MessageType, SchedulerToGC, SchedulerToWorker, WorkerToScheduler } from './message'
import { ProcessOutput } from './process'

export type Callback = (result: ProcessOutput, completeExecution: CompleteExecution) => void
export type CompleteExecution = (result: ProgramData) => void

export type BlockingContext = {
    addr: number,
    generation: number,
}

export type ThreadConfig = {
    runqueue: number,
    instructions: Instruction[],
    symbols: (TokenLocation | null)[],
    heapsize: number,
    runqueues: number[],
    deterministic: boolean,
    visualmode: boolean,
    main_goroutine_addr: number,
}

export let initiating_worker = false

export class Scheduler {
    MAX_THREADS: number
    workers: Worker[] // Arr of actual webworkers
    runqueues: number[] // Arr of runqueue addrs
    idle_threads: number[] // Arr of idle thread indexes
    save_stacks: number[] // Arr of save stack addrs
    blocking_waitlists: Map<number, BlockingContext[]> // Map of object address to Map of [context address to arr of context addresses blocked on it]
    blocked_contexts: Set<number> // Arr of goroutine addresses that are currently blocked
    GC_Worker: Worker | undefined
    is_gc_running = false

    main_goroutine_addr: number
    is_completed = false
    callback: Callback // Callback function to call once execution is complete, pass in from frontend to update the output and visualiser with the final state of the program
    completeExecution: CompleteExecution // Sends data to frontend
    stdout = ""

    instructions: Instruction[]
    heapsize: number
    symbols: (TokenLocation | null)[]
    deterministic: boolean
    visualmode: boolean
    heap: Heap
    debugger: DebuggerV2

    // Need to share with worker for initialisation
    load_heap_config: LoadHeapConfig
    thread_config: ThreadConfig

    constructor(
        instructions: Instruction[],
        heapsize: number,
        symbols: (TokenLocation | null)[], // metadata for debugging
        deterministic: boolean,
        visualmode = false,
        callback: Callback,
        completeExecution: CompleteExecution,
        max_threads = 8
    ) {
        this.MAX_THREADS = max_threads
        this.workers = []
        this.runqueues = []
        this.save_stacks = []
        this.idle_threads = []
        this.blocking_waitlists = new Map()
        this.blocked_contexts = new Set()
        this.instructions = instructions
        this.heapsize = heapsize
        this.symbols = symbols
        this.deterministic = deterministic
        this.visualmode = visualmode
        this.heap = new Heap(heapsize)
        this.main_goroutine_addr = this.create_main_goroutine()
        this.callback = callback
        this.completeExecution = completeExecution

        this.debugger = new DebuggerV2(this.runqueues, this.heap, this.instructions, symbols)
        if (this.visualmode) {
            this.debugger.context_id_map.set(
                this.main_goroutine_addr,
                this.debugger.context_id++, // increase id after storing so next context has increasing id
            )
        }
        this.heap.debugger = this.debugger

        // Initialise runqueues so that can pass into each debugger
        for (let i = 0; i < this.MAX_THREADS; i++) {
            this.create_runqueue()
        }

        this.load_heap_config = {
            mem_sab: this.heap.memory.array,
            metadata_sab: this.heap.metadata.array,
            freelist_sab: this.heap.freelist.array,
            bitmap_sab: this.heap.bitmap.array,
            unassigned: this.heap.UNASSIGNED.addr,
            save_stack_addrs: [], // Fill manually each time
            alloc_lock_addr: this.heap.alloc_lock_addr,
            alloc_count_addr: this.heap.alloc_count_addr,
            gc_init_flag_addr: this.heap.gc_init_flag_addr,
            save_stack_flag_addr: this.heap.save_stack_flag_addr,
        }
        this.thread_config = {
            runqueue: -1, // Fill manually each time
            instructions: this.instructions,
            symbols: this.symbols,
            heapsize: this.heapsize,
            runqueues: this.runqueues,
            deterministic: this.deterministic,
            visualmode: this.visualmode,
            main_goroutine_addr: this.main_goroutine_addr,
        }
    }

    init() {
        const id = this.handle_thread_creation()
        this.heap.is_alloc_ready = true
        const save_stack_addrs = [this.save_stacks[id]]
        const runqueue_addr = this.runqueues[id]
        const runqueue = this.heap.get_value(runqueue_addr) as RunQueueNode
        // Push main goroutine into first runqueue to be executed
        runqueue.push(this.main_goroutine_addr)
        this.start_worker(id, runqueue_addr, save_stack_addrs)
    }

    private create_main_goroutine(): number {
        const main_goroutine = ContextNode.create(this.heap)
        // Base call frame at heap addr 0
        const base_frame = FrameNode.create(0, this.heap)
        const base_env = EnvironmentNode.create(
            base_frame.addr, // tied to base frame addr
            [], // initialise empty list of variables
            false,
            this.heap,
        )
        // Links context's environment ptr to this new env
        main_goroutine.set_E(base_env.addr)
        return main_goroutine.addr
    }

    handle_thread_creation(): number {
        initiating_worker = true
        const id = this.count_threads()
        if (id >= this.MAX_THREADS) {
            throw new Error('Max thread count reached')
        }
        this.create_worker()
        this.create_save_stack()
        initiating_worker = false
        return id
    }

    count_threads(): number {
        return this.workers.length
    }

    create_runqueue() {
        const runqueue = RunQueueNode.create(this.heap)
        this.runqueues.push(runqueue.addr)
    }

    create_save_stack() {
        const save_stack = SaveStackNode.create(this.heap)
        this.save_stacks.push(save_stack.addr)
    }

    create_worker(): number {
        const worker = new Worker(new URL('worker.ts', import.meta.url))
        this.setup_worker(worker)
        this.workers.push(worker)
        return this.workers.length - 1
    }

    private start_worker(thread_id: number, runqueue_addr: number, save_stack_addrs: number[]) {
        const worker = this.workers[thread_id]
        const message: SchedulerToWorker = {
            type: MessageType.START,
            thread_id: thread_id,
            load_heap_config: {
                ...this.load_heap_config,
                save_stack_addrs: save_stack_addrs,
            },
            worker_config: {
                ...this.thread_config,
                runqueue: runqueue_addr,
            },
        }
        worker.postMessage(message)
    }

    private init_worker_gc() {
        this.GC_Worker = new Worker(new URL('workerGC.ts', import.meta.url))
        const message: SchedulerToGC = {
            type: MessageType.GC_INIT,
            load_heap_config: {
                ...this.load_heap_config,
                save_stack_addrs: this.save_stacks,
            },
            heapsize: this.heapsize,
        }
        this.GC_Worker.postMessage(message)
    }

    setup_worker(worker: Worker) {
        worker.onmessage = (event: MessageEvent<WorkerToScheduler>) => {
            // If main thread has already completed execution ignore the rest
            if (this.is_completed) {
                return
            }

            // Handle messages coming from workers
            const type = event.data.type
            switch (type) {
                case MessageType.READY: {
                    const idle_id = event.data.thread_id
                    // Steal work from other runqueues if possible
                    for (let active_id = 0; active_id < this.workers.length; active_id++) {
                        if (active_id === idle_id) {
                            continue;
                        }

                        const active_runqueue = this.heap.get_value(this.runqueues[active_id]) as RunQueueNode
                        const ctx_addr = active_runqueue.steal()
                        if (ctx_addr === -1) {
                            continue;
                        }

                        const idle_runqueue = this.heap.get_value(this.runqueues[idle_id]) as RunQueueNode
                        idle_runqueue.push(ctx_addr)
                        const idle_worker = this.workers[idle_id]
                        const message: SchedulerToWorker = {
                            type: MessageType.RUN_PROGRAM,
                        }
                        idle_worker.postMessage(message)
                        return
                    }
                    // If not, set to idle and wait for work to be pushed to its runqueue
                    this.idle_threads.push(idle_id)
                    break;
                }
                case MessageType.STDOUT: {
                    this.stdout += event.data.message
                    break;
                }
                case MessageType.ERROR: {
                    const error_message = event.data.error_message
                    const error_output: ProcessOutput = {
                        stdout: this.stdout,
                        visual_data: [],
                        errorMessage: error_message,
                    }
                    this.callback(error_output, this.completeExecution)
                    break;
                }
                case MessageType.BLOCK: {
                    const { thread_id, context_addr, obj_addrs, generations } = event.data
                    if (obj_addrs.length !== generations.length) {
                        const error_output: ProcessOutput = {
                            stdout: this.stdout,
                            visual_data: [],
                            errorMessage: "Object addresses don't match generations"
                        }
                        this.callback(error_output, this.completeExecution)
                        break;
                    }

                    for (let i = 0; i < obj_addrs.length; i++) {
                        const obj_addr = obj_addrs[i]
                        const generation = generations[i]
                        const obj = this.heap.get_value(obj_addr) as MutexNode | ChannelNode | WaitGroupNode
                        // If generation not equal to blocking object's generation, should not block
                        if (generation !== obj.get_generation()) {
                            // Might be removed from runqueue, so unblock and check runqueue
                            const ctx = this.heap.get_value(context_addr) as ContextNode
                            ctx.set_blocked(false)
                            const from_runqueue = this.heap.get_value(this.runqueues[thread_id]) as RunQueueNode
                            const running_context_addr = from_runqueue.scheduler_peek()
                            // If running context not blocking context, means it was removed from runqueue
                            if (running_context_addr !== context_addr) {
                                this.assign_goroutine_to_runqueue(context_addr)
                            }
                            continue;
                        }

                        if (!this.blocking_waitlists.has(obj_addr)) {
                            this.blocking_waitlists.set(obj_addr, [])
                        }
                        const blocking_context: BlockingContext = {
                            addr: context_addr,
                            generation: generation
                        }
                        this.blocking_waitlists.get(obj_addr)?.push(blocking_context)
                        this.blocked_contexts.add(context_addr)
                        // Goroutine should be popped from runqueue by worker, not scheduler
                    }
                    break;
                }
                case MessageType.UNBLOCK: {
                    for (let i = 0; i < event.data.obj_addrs.length; i++) {
                        const obj_addr = event.data.obj_addrs[i]
                        const unblocked_context = this.blocking_waitlists.get(obj_addr)?.shift()
                        if (unblocked_context === undefined) {
                            // In the event unblock message gets received before earlier block message
                            continue;
                        }

                        const {
                            addr: unblocked_context_addr,
                            generation: unblocked_generation,
                        } = unblocked_context
                        const obj_gen = event.data.generations[i]
                        if (unblocked_generation >= obj_gen) {
                            // In the event unblock message gets received after future block message
                            this.blocking_waitlists.get(obj_addr)?.unshift(unblocked_context)
                            continue;
                        }

                        this.blocked_contexts.delete(unblocked_context_addr)
                        const ctx = this.heap.get_value(unblocked_context_addr) as ContextNode
                        ctx.set_blocked(false)
                        this.assign_goroutine_to_runqueue(unblocked_context_addr)
                    }
                    break;
                }
                case MessageType.UNBLOCK_ALL: {
                    for (let i = 0; i < event.data.obj_addrs.length; i++) {
                        const obj_addr = event.data.obj_addrs[i]
                        const obj_gen = event.data.generations[i]
                        const waitlist = this.blocking_waitlists.get(obj_addr)
                        while (waitlist && waitlist.length > 0) {
                            const unblocked_context = waitlist.shift()
                            if (unblocked_context === undefined) {
                                // In the event unblock message gets received before earlier block message
                                break;
                            }

                            const {
                                addr: unblocked_context_addr,
                                generation: unblocked_generation,
                            } = unblocked_context
                            if (unblocked_generation >= obj_gen) {
                                // In the event unblock message gets received after future block message
                                waitlist.unshift(unblocked_context)
                                break;
                            }

                            this.blocked_contexts.delete(unblocked_context_addr)
                            const ctx = this.heap.get_value(unblocked_context_addr) as ContextNode
                            ctx.set_blocked(false)
                            this.assign_goroutine_to_runqueue(unblocked_context_addr)
                        }
                    }
                    break;
                }
                case MessageType.GC: {
                    if (this.GC_Worker === undefined) {
                        this.init_worker_gc()
                        break
                    }
                    this.GC_Worker.postMessage({ type: MessageType.GC_RUN })
                    this.is_gc_running = true
                    break;
                }
                case MessageType.GC_INITIALISED: {
                    this.GC_Worker?.postMessage({ type: MessageType.GC_RUN })
                    this.is_gc_running = true
                    break;
                }
                case MessageType.GC_COMPLETED: {
                    this.is_gc_running = false
                    break;
                }
                case MessageType.NEW_GOROUTINE: {
                    const has_idle = this.idle_threads.length > 0
                    const is_max_thread = this.count_threads() >= this.MAX_THREADS
                    if (!has_idle && is_max_thread) {
                        break;
                    }

                    const curr_id = event.data.thread_id
                    const old_runqueue = this.heap.get_value(this.runqueues[curr_id]) as RunQueueNode
                    const popped_ctx_addr = old_runqueue.steal()
                    // If cannot pop context, means runqueue is empty
                    if (popped_ctx_addr === -1) {
                        break;
                    }

                    // Only assign to idle or new thread, not random thread
                    this.assign_goroutine_to_runqueue(popped_ctx_addr)
                    break;
                }
                case MessageType.FINISHED: {
                    this.is_completed = true
                    const finish_output: ProcessOutput = {
                        stdout: this.stdout,
                        visual_data: [],
                    }
                    this.callback(finish_output, this.completeExecution)
                    break;
                }
            }
        }
    }

    assign_goroutine_to_runqueue(ctx_addr: number) {
        const has_idle = this.idle_threads.length > 0
        const is_max_thread = this.count_threads() >= this.MAX_THREADS

        if (has_idle) {
            const idle_id = this.idle_threads.pop()
            if (idle_id === undefined) {
                return;
            }
            const worker = this.workers[idle_id]
            const runqueue = this.heap.get_value(this.runqueues[idle_id]) as RunQueueNode
            runqueue.push(ctx_addr)

            const message: SchedulerToWorker = {
                type: MessageType.RUN_PROGRAM,
            }
            worker.postMessage(message)
            return
        }

        if (!is_max_thread) {
            const new_id = this.handle_thread_creation()
            const save_stack_addrs = [this.save_stacks[new_id]]
            const runqueue_addr = this.runqueues[new_id]
            const runqueue = this.heap.get_value(runqueue_addr) as RunQueueNode
            runqueue.push(ctx_addr)
            this.start_worker(new_id, runqueue_addr, save_stack_addrs)
            return
        }

        // Max threads all running, randomly assign
        const random_id = Math.floor(Math.random() * this.MAX_THREADS)
        const worker = this.workers[random_id]
        const runqueue = this.heap.get_value(this.runqueues[random_id]) as RunQueueNode
        runqueue.push(ctx_addr)

        // There's a chance that the worker could be completing execution right as the ctx is pushed
        // However, sending a run program will likely send after the program has been completed by the worker
        // Needs to be fixed
        const message: SchedulerToWorker = {
            type: MessageType.RUN_PROGRAM,
        }
        worker.postMessage(message)
    }

    /**
     * Retrieves all contexts including blocked contexts
     * (incomplete for blocked contexts, need SAB)
     * Might need to put method in debugger
     * @param heap 
     * @param runqueues 
     * @param blocked_contexts 
     * @returns All running and blocked contexts
     */
    static get_contexts(heap: Heap, runqueues: number[], blocked_contexts: number[]): ContextNode[] {
        const running_contexts_addr = runqueues.map((rq_addr) => {
            const rq = heap.get_value(rq_addr) as RunQueueNode
            return rq.get_vals()
        })
        return [
            ...running_contexts_addr.flat(),
            ...blocked_contexts,
        ].map((x) => new ContextNode(heap, x))
    }
}