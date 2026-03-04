import { Heap } from '../heap';
import { QueueNode } from '../heap/types/queue';
import { ProcessOutput } from './process';
import { Thread } from './thread';

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
  GC_START,
  GC_RUN,
}

export type SchedulerToWorker =
  | { type: MessageType.START; new_thread: Thread; }
  | { type: MessageType.RUN_PROGRAM }
  | { type: MessageType.GC; }

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

export type SchedulerToGC =
  | { type: MessageType.GC_START; heap: Heap }
  | { type: MessageType.GC_RUN; }