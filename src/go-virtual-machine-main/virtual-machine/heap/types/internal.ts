// For internal structures not meant to be used by the user program

import { Heap, TAG } from ".."
import { BaseNode } from "./base"

export class LockNode extends BaseNode {
    static create(heap: Heap) {
        const addr = heap.allocate(2)
        heap.set_tag(addr, TAG.LOCK)
        heap.memory.set_number(0, addr + 1)
        return new LockNode(heap, addr)
    }

    override sizeof(): number {
        return 2;
    }

    get_lock() {
        while (this.heap.memory.atomic_cas_i32(this.addr + 1, 0, 1) !== 0) {
            this.heap.memory.atomic_wait_i32(1, this.addr + 1)
        }
    }

    release_lock() {
        this.heap.memory.atomic_set_word_i32(0, this.addr + 1)
        this.heap.memory.atomic_notify_i32(this.addr + 1, 1)
    }
}

export class CounterNode extends BaseNode {
    static create(heap: Heap) {
        const addr = heap.allocate(2)
        heap.set_tag(addr, TAG.COUNTER)
        heap.memory.set_number(0, addr + 1)
        return new CounterNode(heap, addr)
    }

    override sizeof(): number {
        return 2;
    }

    get_count() {
        return this.heap.memory.atomic_get_word_i32(this.addr + 1)
    }

    increase_count() {
        this.heap.memory.atomic_add_i32(1, this.addr + 1)
    }

    decrease_count() {
        this.heap.memory.atomic_add_i32(-1, this.addr + 1)
    }
}

export class FlagNode extends BaseNode {
    static create(heap: Heap) {
        const addr = heap.allocate(2)
        heap.set_tag(addr, TAG.FLAG)
        heap.memory.set_number(0, addr + 1)
        return new FlagNode(heap, addr)
    }

    override sizeof(): number {
        return 2;
    }

    get_flag() {
        return this.heap.memory.atomic_get_word_i32(this.addr + 1)
    }

    set_flag(val: number) {
        this.heap.memory.atomic_set_word_i32(val, this.addr + 1)
    }

    sleep_thread(val: number) {
        this.heap.memory.atomic_wait_i32(val, this.addr + 1)
    }

    notify_threads() {
        this.heap.memory.atomic_notify_i32(this.addr + 1)
    }
}