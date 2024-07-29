import { JumpInstruction } from './instructions/control'

class CompileEnvironment {
  frames: string[][]
  constructor(parent?: CompileEnvironment) {
    if (!parent) {
      this.frames = [[]]
    } else {
      this.frames = parent.frames.slice()
      this.frames.push([])
    }
  }

  find_var(name: string) {
    let frame_idx = 0
    const frame_sz = this.frames.length - 1
    while (frame_sz >= frame_idx) {
      let var_idx = this.frames[frame_sz - frame_idx].length - 1
      while (var_idx >= 0) {
        if (this.frames[frame_sz - frame_idx][var_idx] === name)
          return [frame_idx, var_idx]
        var_idx--
      }
      frame_idx++
    }
    throw Error('Unable to find variable: ' + name)
  }

  declare_var(name: string) {
    const frame_idx = this.frames.length - 1
    for (const var_name of this.frames[frame_idx]) {
      if (var_name === name) throw Error('Variable already declared')
    }
    const new_len = this.frames[frame_idx].push(name)
    return [0, new_len - 1]
  }

  get_frame() {
    const frame_idx = this.frames.length - 1
    return this.frames[frame_idx]
  }
}

class LoopMarker {
  break_instrs: JumpInstruction[]
  cont_instrs: JumpInstruction[]
  constructor() {
    this.break_instrs = []
    this.cont_instrs = []
  }
}

export class CompileContext {
  env: CompileEnvironment
  env_stack: CompileEnvironment[]
  loop_stack: LoopMarker[]
  constructor() {
    this.env = new CompileEnvironment()
    this.env_stack = [this.env]
    this.loop_stack = []
  }

  push_env() {
    const new_env = new CompileEnvironment(this.env)
    this.env_stack.push(this.env)
    this.env = new_env
  }

  pop_env() {
    const old_env = this.env_stack.pop()
    if (!old_env) throw Error('Compile Env Stack Empty!')
    this.env = old_env
  }

  push_loop() {
    this.loop_stack.push(new LoopMarker())
  }

  add_break(instr: JumpInstruction) {
    this.loop_stack[this.loop_stack.length - 1].break_instrs.push(instr)
  }
  add_continue(instr: JumpInstruction) {
    this.loop_stack[this.loop_stack.length - 1].cont_instrs.push(instr)
  }

  pop_loop(pre_addr: number, post_addr: number) {
    const old_loop = this.loop_stack.pop()
    if (!old_loop) throw Error('Compile Loop Stack Empty!')
    for (const instr of old_loop.cont_instrs) {
      instr.set_addr(pre_addr)
    }
    for (const instr of old_loop.break_instrs) {
      instr.set_addr(post_addr)
    }
  }
}
