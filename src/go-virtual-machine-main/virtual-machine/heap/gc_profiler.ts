export class GCProfiler {
  program_time: number
  program_start: number
  program_end: number
  num_gc: number
  total_gc_time: number
  partial_gc_time: number
  increment_start: number
  increment_end: number
  total_pause_time: number
  partial_pause_time: number
  pause_start: number
  pause_end: number
  total_alloc: number
  total_freed: number

  constructor() {
    this.program_time = 0
    this.program_start = 0
    this.program_end = 0
    this.num_gc = 0
    this.total_gc_time = 0
    this.partial_gc_time = 0
    this.increment_start = 0
    this.increment_end = 0
    this.total_pause_time = 0
    this.partial_pause_time = 0 // for case where gc cycle is incomplete
    this.pause_start = 0
    this.pause_end = 0
    this.total_alloc = 0
    this.total_freed = 0
  }

  start_program() {
    this.program_start = performance.now()
  }

  end_program() {
    this.program_end = performance.now()
    this.program_time = this.program_end - this.program_start
    // incomplete GC cycle
    if (this.partial_pause_time > 0) {
      this.total_pause_time += this.partial_pause_time // for metrics add in, for avg then remove
    }
    if (this.partial_gc_time > 0) {
      this.total_gc_time += this.partial_gc_time // for metrics add in, for avg then remove
    }
  }

  start_increment() {
    this.increment_start = performance.now()
  }

  end_increment() {
    this.increment_end = performance.now()
    this.partial_gc_time += this.increment_end - this.increment_start
  }

  end_gc_cycle() {
    this.num_gc += 1
    this.total_pause_time += this.partial_pause_time
    this.total_gc_time += this.partial_gc_time
    this.partial_pause_time = 0
    this.partial_gc_time = 0
  }

  start_pause() {
    this.pause_start = performance.now()
  }

  /** Increases gc time too */
  end_pause() {
    this.pause_end = performance.now()
    this.partial_pause_time += this.pause_end - this.pause_start
    this.partial_gc_time += this.pause_end - this.pause_start
  }

  increment_alloc(size: number) {
    this.total_alloc += size * 4
  }

  increment_freed(size: number) {
    this.total_freed += size * 4
  }
}
