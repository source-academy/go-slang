import { TokenLocation } from '../compiler/tokens'
import { Instruction } from '../executor/instructions'
import { Heap } from '../heap'
import { ChannelNode } from '../heap/types/channel'
import { ContextNode } from '../heap/types/context'
import { EnvironmentNode, FrameNode } from '../heap/types/environment'
import { MutexNode } from '../heap/types/mutex'
import { RunQueueNode } from '../heap/types/runqueue'
import { WaitGroupNode } from '../heap/types/waitGroup'
import { DebuggerV2 } from './debuggerV2'
import { MessageType, SchedulerToWorker, WorkerToScheduler } from './message'
import { ProcessOutput } from './process'
import { Thread } from './thread'

export type Callback = (result: ProcessOutput) => void

export type BlockingContext = {
    addr: number,
    generation: number,
}

export class Scheduler {
    MAX_THREADS: number
    workers: Worker[] // Arr of actual webworkers
    threads: Thread[] // Arr of thread objects
    runqueues: number[] // Arr of runqueue addrs
    idle_threads: number[] // Arr of idle thread indexes
    blocking_waitlists: Map<number, BlockingContext[]> // Map of mutex address to arr of context addresses blocked on it
    blocked_contexts: Set<number> // Arr of goroutine addresses that are currently blocked
    GC_Worker: Worker | undefined

    main_goroutine_addr: number
    is_completed = false
    callback: Callback // Callback function to call once execution is complete, pass in from frontend to update the output and visualiser with the final state of the program
    stdout = ""

    instructions: Instruction[]
    heapsize: number
    symbols: (TokenLocation | null)[]
    deterministic: boolean
    visualmode: boolean
    heap: Heap
    debugger: DebuggerV2

    static create(
        instructions: Instruction[],
        heapsize: number,
        symbols: (TokenLocation | null)[], // metadata for debugging
        deterministic: boolean,
        visualmode = false,
        max_threads: number = 8,
        callback: Callback
    ) {
        const scheduler = new Scheduler(
            instructions,
            heapsize,
            symbols,
            deterministic,
            visualmode,
            max_threads,
            callback
        )
        scheduler.init()
        return scheduler
    }

    private constructor(
        instructions: Instruction[],
        heapsize: number,
        symbols: (TokenLocation | null)[], // metadata for debugging
        deterministic: boolean,
        visualmode = false,
        max_threads: number = 8,
        callback: Callback
    ) {
        this.MAX_THREADS = max_threads
        this.workers = []
        this.threads = []
        this.runqueues = [] // Replace with contexts later
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

        this.debugger = new DebuggerV2(this, this.heap, this.instructions, symbols)
        if (this.visualmode) {
            this.debugger.context_id_map.set(
                this.main_goroutine_addr,
                this.debugger.context_id++, // increase id after storing so next context has increasing id
            )
        }
        this.heap.debugger = this.debugger
    }

    private init() {
        const id = this.handle_thread_creation()
        const worker = this.workers[id]
        const thread = this.threads[id]
        const runqueue = this.heap.get_value(this.runqueues[id]) as RunQueueNode
        runqueue.push(this.main_goroutine_addr)

        const message: SchedulerToWorker = {
            type: MessageType.START,
            new_thread: thread,
        }
        worker.postMessage(message)
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
        const id = this.count_threads()
        if (id >= this.MAX_THREADS) {
            throw new Error('Max thread count reached')
        }
        this.create_worker()
        this.create_runqueue()
        this.create_thread(id)
        return id
    }

    count_threads(): number {
        return this.threads.length
    }

    create_thread(id: number): number {
        const thread = new Thread(
            id,
            this.runqueues[id],
            this.instructions,
            this.heap,
            this.debugger,
            this.deterministic,
            this.visualmode,
            this.main_goroutine_addr,
        )
        this.threads.push(thread)
        return id
    }

    create_runqueue() {
        const runqueue = RunQueueNode.create(this.heap)
        this.runqueues.push(runqueue.addr)
    }

    create_worker(): number {
        const worker = new Worker(new URL('worker.ts', import.meta.url))
        this.setup_worker(worker)
        this.workers.push(worker)
        return this.workers.length - 1
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
                case MessageType.READY:
                    const idle_id = event.data.thread_id
                    // Steal work from other runqueues if possible
                    for (let i = 0; i <= this.threads.length; i++) {
                        const active_id = this.threads[i].thread_id
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
                        return
                    }
                    // If not, set to idle and wait for work to be pushed to its runqueue
                    this.idle_threads.push(idle_id)
                    break;
                case MessageType.STDOUT:
                    this.stdout += event.data.message
                    break;
                case MessageType.ERROR:
                    const error_message = event.data.error_message
                    const error_output: ProcessOutput = {
                        stdout: this.stdout,
                        visual_data: [],
                        errorMessage: error_message,
                    }
                    this.callback(error_output)
                    break;
                case MessageType.BLOCK:
                    const { thread_id, context_addr, obj_addrs, generations } = event.data
                    if (obj_addrs.length !== generations.length) {
                        const error_output: ProcessOutput = {
                            stdout: this.stdout,
                            visual_data: [],
                            errorMessage: "Object addresses don't match generations"
                        }
                        this.callback(error_output)
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
                            const running_context_addr = from_runqueue.peek()
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
                case MessageType.UNBLOCK:
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
                case MessageType.UNBLOCK_ALL:
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
                case MessageType.GC:
                    break;
                case MessageType.NEW_GOROUTINE:
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
                case MessageType.FINISHED:
                    this.is_completed = true
                    const finish_output: ProcessOutput = {
                        stdout: this.stdout,
                        visual_data: [],
                    }
                    this.callback(finish_output)
                    break;
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
            const worker = this.workers[new_id]
            const thread = this.threads[new_id]
            const runqueue = this.heap.get_value(this.runqueues[new_id]) as RunQueueNode
            runqueue.push(ctx_addr)

            const message: SchedulerToWorker = {
                type: MessageType.START,
                new_thread: thread,
            }
            worker.postMessage(message)
            return
        }

        // Max threads all running, randomly assign
        const random_id = Math.floor(Math.random() * this.MAX_THREADS)
        const worker = this.workers[random_id]
        const runqueue = this.heap.get_value(this.runqueues[random_id]) as RunQueueNode
        runqueue.push(ctx_addr)

        const message: SchedulerToWorker = {
            type: MessageType.RUN_PROGRAM,
        }
        worker.postMessage(message)
    }
    
    get_contexts(): ContextNode[] {
        const running_contexts_addr = this.runqueues.map((rq_addr) => {
            const rq = this.heap.get_value(rq_addr) as RunQueueNode
            return rq.get_vals()
        })
        return [
            ...running_contexts_addr.flat(),
            ...this.blocked_contexts,
        ].map((x) => new ContextNode(this.heap, x))
    }
}