import { GCPHASE, Heap } from "../heap"

import { MessageType, SchedulerToGC } from "./message"

let heap: Heap

onmessage = (event: MessageEvent<SchedulerToGC>) => {
    const type = event.data.type
    switch (type) {
        case MessageType.GC_INIT: {
            const { load_heap_config, heapsize } = event.data
            heap = new Heap(heapsize, load_heap_config)
            postMessage({ type: MessageType.GC_INITIALISED })
            break;
        }
        case MessageType.GC_RUN: {
            do {
                heap.tri_color_step()
            } while (heap.metadata.get_gc_phase() !== GCPHASE.NONE)
            heap.metadata.increment_gc_generation(1)
            heap.metadata.notify_gc_generation()
            postMessage({ type: MessageType.GC_RUN })
            break;
        }
    }
}