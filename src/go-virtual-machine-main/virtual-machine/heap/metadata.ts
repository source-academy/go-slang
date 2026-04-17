import { GCPHASE } from "."

const FIELD_COUNT = 8

enum MetaDataIndex {
    MEM_LEFT = 0,
    GC_PHASE = 1,
    SWEEPER = 2,
    GC_TARGET_MEM = 3,
    GC_CYCLE = 4,
    ALLOC_TOTAL = 5,
    FREED_TOTAL = 6,
    OUT_OF_MEM = 7,
}

/**
 * Metadata represents data held in the heap which need to be coordinated between workers
 * Index 0: Memory left
 * Index 1: GC Phase
 * Index 2: Sweeper
 * Index 3: GC Target Memory
 * Index 4: GC Cycle
 * Index 5: Total Allocations
 * Index 6: Total Freed
 * Index 7: Out of Memory Status
 */
export class MetaData {
    array: SharedArrayBuffer
    word_size: number
    i32: Int32Array

    constructor(sab: SharedArrayBuffer, word_size = 4) {
        if (!Number.isInteger(Math.log(word_size) / Math.log(2)))
            throw Error('Word Size must be power of 2')
        this.word_size = word_size
        this.array = sab
        this.i32 = new Int32Array(this.array)
    }

    static create(size: number, gc_heap_min: number, word_size = 4) {
        const sab = new SharedArrayBuffer(FIELD_COUNT * word_size)
        const metadata = new MetaData(sab, word_size)
        metadata.set_mem_left(size)
        metadata.set_gc_phase(GCPHASE.INVALID)
        metadata.set_sweeper(0)
        metadata.set_gc_target_mem(size * gc_heap_min)
        metadata.set_gc_cycle(0)
        metadata.set_alloc_total(0)
        metadata.set_freed_total(0)
        metadata.set_out_of_mem(false)
        return metadata
    }

    static load(sab: SharedArrayBuffer, word_size = 4) {
        return new MetaData(sab, word_size)
    }

    get_mem_left() {
        return Atomics.load(this.i32, MetaDataIndex.MEM_LEFT)
    }

    set_mem_left(val: number) {
        return Atomics.store(this.i32, MetaDataIndex.MEM_LEFT, val | 0)
    }

    increment_mem_left(val: number) {
        Atomics.add(this.i32, MetaDataIndex.MEM_LEFT, val | 0)
    }

    get_gc_phase(): GCPHASE {
        return Atomics.load(this.i32, MetaDataIndex.GC_PHASE)
    }

    set_gc_phase(val: GCPHASE) {
        Atomics.store(this.i32, MetaDataIndex.GC_PHASE, val | 0)
    }

    get_sweeper() {
        return Atomics.load(this.i32, MetaDataIndex.SWEEPER)
    }

    set_sweeper(val: number) {
        Atomics.store(this.i32, MetaDataIndex.SWEEPER, val | 0)
    }

    increment_sweeper(val: number) {
        Atomics.add(this.i32, MetaDataIndex.SWEEPER, val | 0)
    }

    get_gc_target_mem() {
        return Atomics.load(this.i32, MetaDataIndex.GC_TARGET_MEM)
    }

    set_gc_target_mem(val: number) {
        Atomics.store(this.i32, MetaDataIndex.GC_TARGET_MEM, val | 0)
    }

    get_gc_cycle() {
        return Atomics.load(this.i32, MetaDataIndex.GC_CYCLE)
    }

    set_gc_cycle(val: number) {
        Atomics.store(this.i32, MetaDataIndex.GC_CYCLE, val | 0)
    }

    increment_gc_cycle(val: number) {
        Atomics.add(this.i32, MetaDataIndex.GC_CYCLE, val | 0)
    }

    wait_gc_cycle(val: number) {
        return Atomics.wait(this.i32, MetaDataIndex.GC_CYCLE, val | 0)
    }

    notify_gc_cycle() {
        return Atomics.notify(this.i32, MetaDataIndex.GC_CYCLE)
    }

    get_alloc_total() {
        return Atomics.load(this.i32, MetaDataIndex.ALLOC_TOTAL)
    }

    set_alloc_total(val: number) {
        Atomics.store(this.i32, MetaDataIndex.ALLOC_TOTAL, val | 0)
    }

    increment_alloc_total(val: number) {
        Atomics.add(this.i32, MetaDataIndex.ALLOC_TOTAL, val | 0)
    }

    get_freed_total() {
        return Atomics.load(this.i32, MetaDataIndex.FREED_TOTAL)
    }

    set_freed_total(val: number) {
        Atomics.store(this.i32, MetaDataIndex.FREED_TOTAL, val | 0)
    }

    increment_freed_total(val: number) {
        Atomics.add(this.i32, MetaDataIndex.FREED_TOTAL, val | 0)
    }

    get_out_of_mem() {
        return Atomics.load(this.i32, MetaDataIndex.OUT_OF_MEM) === 1
    }

    set_out_of_mem(is_out_of_mem: boolean) {
        const val = is_out_of_mem ? 1 : 0
        Atomics.store(this.i32, MetaDataIndex.OUT_OF_MEM, val | 0)
    }
}