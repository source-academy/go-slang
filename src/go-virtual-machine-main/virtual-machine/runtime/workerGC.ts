import { Heap } from "../heap"
import { MessageType, SchedulerToGC } from "./message"

var heap: Heap

self.onmessage = (event: MessageEvent<SchedulerToGC>) => {
    const type = event.data.type
    switch (type) {
        case MessageType.GC_START:
            heap = event.data.heap
            break;
        case MessageType.GC_RUN:
    }
}