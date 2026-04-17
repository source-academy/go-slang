import * as seedrandom from "seedrandom"

import { DoneInstruction, GoInstruction, Instruction } from "../executor/instructions"
import { Heap } from "../heap"
import { ContextNode } from "../heap/types/context"
import { MethodNode } from "../heap/types/func"
import { RunQueueNode } from "../heap/types/runqueue"
import { SaveStackNode } from "../heap/types/saveStack"

import { DebuggerV2 } from "./debuggerV2"
import { MessageType } from "./message"

export type ProcessV2Result = {
    status: ProcessV2Status,
    message: string
}

export enum ProcessV2Status {
    ERROR,
    EMPTY_RUNQUEUE,
    FINISHED,
}

const EMPTY_MSG = ""

export class ProcessV2 {
    thread_id: number
    instructions: Instruction[] // Sequence of instructions
    heap: Heap
    main_goroutine_addr: number // Address of main goroutine in heap
    context: ContextNode // Current execution context (equivalent to goroutine)
    contexts: RunQueueNode // Current execution context
    deterministic: boolean
    generator: seedrandom.PRNG // Pseudo random number generator
    debug_mode: boolean // True if running visual debugging mode
    debugger: DebuggerV2 // Trace states
    runtime_count = 0 // Counts how many instructions executed
    save_stack: SaveStackNode

    constructor(
        thread_id: number,
        instructions: Instruction[],
        heap: Heap,
        main_goroutine_addr: number,
        contexts_addr: number,
        deterministic: boolean,
        visual_mode: boolean,
        debugger_instance: DebuggerV2,
    ) {
        this.thread_id = thread_id
        this.instructions = instructions
        this.heap = heap
        this.main_goroutine_addr = main_goroutine_addr
        this.context = this.heap.get_value(main_goroutine_addr) as ContextNode // Initialise context at the start to ensure not null
        this.contexts = this.heap.get_value(contexts_addr) as RunQueueNode
        this.deterministic = deterministic
        this.save_stack = this.heap.get_value(this.heap.save_stack_addrs[0]) as SaveStackNode
        // Check use of random seed later for non-deterministic execution
        const randomSeed = Math.random().toString(36).substring(2)
        this.generator = seedrandom.default(randomSeed)
        this.debug_mode = visual_mode
        this.debugger = debugger_instance
    }

    start(): ProcessV2Result {
        const time_quantum = 30
        this.runtime_count = 0
        let need_pop = true // When trying to context switch, the scheduler should not job steal the current context before it can be removed from the runqueue

        try {
            while (this.contexts.sz()) {
                if (this.deterministic) {
                    this.context = new ContextNode(this.heap, this.contexts.peek())
                } else {
                    this.context = new ContextNode(this.heap, this.contexts.randompeek())
                }
                let cur_time = 0
                // Execute this context until it hits a done instruction
                while (!DoneInstruction.is(this.instructions[this.context.PC()])) {
                    if (cur_time >= time_quantum) {
                        // Context Switch by pushing context to end of queue
                        this.contexts.push_and_pop(this.context.addr)
                        need_pop = false
                        break
                    }
                    // OS stands for Operand Stack, 1 means treat next instruction as a goroutine method call
                    if (this.context.OS().sz() > 0 && this.context.peekOS() === 1) {
                        // a hacky way of handling goroutines when the callee is a MethodNode instead of FuncNode
                        this.context.popOS()
                        const instr = this.instructions[
                            this.context.incr_PC()
                        ] as GoInstruction
                        // MethodNode represents the callee
                        const func = this.heap.get_value(
                            this.context.peekOSIdx(instr.args),
                        ) as MethodNode
                        const receiver = func.receiver()
                        receiver.handleMethodCallV2(this, func.identifier(), instr.args)
                        break
                    }
                    // Save current pc and get next instruction for execution
                    const pc = this.context.PC()
                    const instr = this.instructions[this.context.incr_PC()]
                    instr.executeV2(this)
                    this.runtime_count += 1
                    cur_time += 1
                    // If this is not the main context and runtime stack is empty, goroutine is completed
                    if (
                        this.context.addr !== this.main_goroutine_addr &&
                        this.context.RTS().sz() === 0
                    ) {
                        // thread has completed
                        break
                    }
                    // State snapshot for debug mode
                    if (this.debug_mode) this.debugger.generate_state(pc)
                    // Stop context if blocked
                    if (this.context.is_blocked()) {
                        break
                    }
                }

                // If done instruction has been hit in the main goroutine then stop all
                if (
                    DoneInstruction.is(this.instructions[this.context.PC()]) &&
                    this.context.addr === this.main_goroutine_addr
                ) {
                    return {
                        status: ProcessV2Status.FINISHED,
                        message: EMPTY_MSG
                    }
                }
                // Remove old head from runqueue
                need_pop ? this.contexts.pop() : need_pop = true
                if (this.runtime_count > 10 ** 5) throw Error('Time Limit Exceeded!')
            }

            // If code falls through without returning, return empty runqueue
            return {
                status: ProcessV2Status.EMPTY_RUNQUEUE,
                message: EMPTY_MSG
            }

            // If main didn't complete and there are blocked goroutines with no runnable ones, throw deadlock error
            // SETTLE IN SCHEDULER!!! if (!completed && !)
        } catch (err) {
            console.warn(err)
            let errorMessage: string | undefined = undefined
            if (err instanceof Error) errorMessage = 'Execution Error: ' + err.message
            return {
                status: ProcessV2Status.ERROR,
                message: errorMessage ?? 'Unknown Execution Error'
            }
        }
    }

    mark_save_stack(addr: number) {
        this.heap.mark_save_stack(addr)
    }

    print(string: string) {
        postMessage({
            type: MessageType.STDOUT,
            message: string,
        })
    }
}