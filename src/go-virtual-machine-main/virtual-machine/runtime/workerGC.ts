import { GCPHASE, Heap } from "../heap"

import { MessageType, SchedulerToGC, WorkerToScheduler } from "./message"

export let gc_heap: Heap

onmessage = (event: MessageEvent<SchedulerToGC>) => {
    const type = event.data.type
    switch (type) {
        case MessageType.GC_INIT: {
            const { load_heap_config, heapsize, extra_roots } = event.data
            gc_heap = new Heap(heapsize, load_heap_config)
            do {
                gc_heap.tri_color_step(extra_roots)
            } while (gc_heap.metadata.get_gc_phase() !== GCPHASE.NONE)
            gc_heap.metadata.increment_gc_cycle(1)
            gc_heap.metadata.notify_gc_cycle()
            const message: WorkerToScheduler = {
                type: MessageType.GC_COMPLETED,
                gc_profiler: gc_heap.gc_profiler,
            }
            postMessage(message)
            break;
        }
        case MessageType.GC_RUN: {
            const { extra_roots } = event.data
            do {
                gc_heap.tri_color_step(extra_roots)
            } while (gc_heap.metadata.get_gc_phase() !== GCPHASE.NONE)
            gc_heap.metadata.increment_gc_cycle(1)
            gc_heap.metadata.notify_gc_cycle()
            const message: WorkerToScheduler = {
                type: MessageType.GC_COMPLETED,
                gc_profiler: gc_heap.gc_profiler,
            }
            postMessage(message)
            break;
        }
    }
}