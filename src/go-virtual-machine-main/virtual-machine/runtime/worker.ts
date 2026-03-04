import { MessageType, SchedulerToWorker } from "./message"
import { Thread } from "./thread"

export var local_thread: Thread

self.onmessage = (event: MessageEvent<SchedulerToWorker>) => {
    const type = event.data.type
    switch (type) {
        case MessageType.START:
            const { new_thread } = event.data
            local_thread = new_thread
            local_thread.run()
            break
        case MessageType.RUN_PROGRAM:
            local_thread.run()
            break;
    }
}