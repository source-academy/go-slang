import { LoadHeapConfig } from '../heap';

import { ThreadConfig as WorkerConfig } from './scheduler';

export enum MessageType {
  // Scheduler to Worker messages
  START,
  RUN_PROGRAM,
  // Worker to Scheduler messages
  READY,
  STDOUT,
  ERROR,
  BLOCK,
  UNBLOCK,
  UNBLOCK_ALL,
  GC,
  NEW_GOROUTINE,
  FINISHED,
  // Scheduler To GC messages
  GC_INIT,
  GC_RUN,
  // GC to Scheduler messages
  GC_INITIALISED,
  GC_COMPLETED,
}

export type SchedulerToWorker =
  | { type: MessageType.START; thread_id: number; load_heap_config: LoadHeapConfig; worker_config: WorkerConfig }
  | { type: MessageType.RUN_PROGRAM }

export type WorkerToScheduler =
  | { type: MessageType.READY; thread_id: number }
  | { type: MessageType.STDOUT; message: string }
  | { type: MessageType.ERROR; thread_id: number; error_message: string }
  | { type: MessageType.BLOCK; thread_id: number; context_addr: number; obj_addrs: number[]; generations: number[] }
  | { type: MessageType.UNBLOCK; obj_addrs: number[]; generations: number[] }
  | { type: MessageType.UNBLOCK_ALL; obj_addrs: number[]; generations: number[] }
  | { type: MessageType.GC; thread_id: number }
  | { type: MessageType.NEW_GOROUTINE; thread_id: number }
  | { type: MessageType.FINISHED; thread_id: number }
  | { type: MessageType.GC_INITIALISED }
  | { type: MessageType.GC_COMPLETED }

export type SchedulerToGC =
  | { type: MessageType.GC_INIT; load_heap_config: LoadHeapConfig; heapsize: number }
  | { type: MessageType.GC_RUN; }