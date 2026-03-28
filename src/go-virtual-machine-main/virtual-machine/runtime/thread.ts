import { Instruction } from '../executor/instructions'
import { Heap } from '../heap'

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