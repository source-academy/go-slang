import { Process } from '../../runtime/process'
import { ChannelArrayNode } from '../../heap/types/channel'
import {
  ChannelNode,
  ChannelReqNode,
  ReqInfoNode,
} from '../../heap/types/channel'
import { FuncNode, MethodNode } from '../../heap/types/func'
import { IntegerNode } from '../../heap/types/primitives'

import { Instruction } from './base'
import { CallInstruction } from './funcs'

export class ForkInstruction extends Instruction {
  addr: number

  constructor(addr = 0) {
    super('FORK')
    this.addr = addr
  }

  set_addr(addr: number) {
    this.addr = addr
  }

  override execute(process: Process): void {
    const new_context = process.context.fork().addr
    process.contexts.push(new_context)
    process.context.set_PC(this.addr)
    if (process.debug_mode) {
      process.debugger.context_id_map.set(
        new_context,
        process.debugger.context_id++,
      )
    }
  }
}

export class GoInstruction extends Instruction {
  addr: number

  constructor(public args: number, addr = 0) {
    super('GO')
    this.addr = addr
  }

  override toString(): string {
    return 'GO ' + this.args.toString() + ' ARGS'
  }

  set_addr(addr: number) {
    this.addr = addr
  }

  static is(instr: Instruction): instr is GoInstruction {
    return instr.tag === 'GO'
  }

  override execute(process: Process): void {
    const func = process.heap.get_value(process.context.peekOSIdx(this.args))
    if (!(func instanceof FuncNode) && !(func instanceof MethodNode))
      throw Error('Stack does not contain closure')

    if (func instanceof FuncNode) {
      const new_context = process.context.go()
      new_context.pushRTS(func.E())
      new_context.set_PC(func.PC())
      new_context.pushOS(func.addr)
      const results = []
      for (let i = this.args - 1; i >= 0; i--) {
        const src = process.context.popOS()
        results[i] = src
      }
      for (let i = 0; i < this.args; i++) {
        // making it "pass by value" instead of by reference
        const allocate = process.heap.allocate(process.heap.get_size(results[i]))
        process.heap.copy(allocate, results[i])
        new_context.pushOS(allocate)
      }
      new_context.pushDeferStack()
      process.contexts.push(new_context.addr)

      if (process.debug_mode) {
        process.debugger.context_id_map.set(
          new_context.addr,
          process.debugger.context_id++,
        )
      }
      process.context.popOS()
    } else {
      // create the frame for function, put arguments in frame
      // func is a methodnode
      const receiver = func.receiver()
      receiver.handleMethodCall(process, func.identifier(), this.args)
    }
  }

  static fromCallInstruction(call: CallInstruction): GoInstruction {
    return new GoInstruction(call.args)
  }
}

export class LoadChannelInstruction extends Instruction {
  constructor() {
    super('LDCH')
  }

  override toString(): string {
    return 'LOAD CHANNEL'
  }

  override execute(process: Process): void {
    const buffer_sz = new IntegerNode(
      process.heap,
      process.context.popOS(),
    ).get_value()
    process.context.pushOS(ChannelNode.create(buffer_sz, process.heap).addr)
  }
}

export class LoadChannelReqInstruction extends Instruction {
  constructor(public recv: boolean, public PC: number) {
    super('LDCR')
  }

  override toString(): string {
    return 'LOAD CHAN ' + (this.recv ? 'RECV' : 'SEND') + ' REQ'
  }

  override execute(process: Process): void {
    const clone = process.heap.clone(process.context.peekOS())
    process.heap.temp_push(clone)
    const req = ReqInfoNode.create(
      clone,
      process.context.addr,
      this.PC,
      this.recv,
      process.heap,
    )
    process.heap.temp_pop()
    process.context.popOS()
    process.heap.temp_push(req.addr)
    const chan = new ChannelNode(process.heap, process.context.popOS())
    const chan_req = ChannelReqNode.create(chan.addr, req.addr, process.heap)
    process.heap.temp_pop()
    process.context.pushOS(chan_req.addr)
  }
}

export class TryChannelReqInstruction extends Instruction {
  constructor() {
    super('TRY_CHAN_REQ')
  }
  override execute(process: Process): void {
    const chan_req = new ChannelReqNode(process.heap, process.context.popOS())
    process.heap.temp_push(chan_req.addr)
    const chan = chan_req.channel()
    const req = chan_req.req()
    if (!chan.try(req)) {
      process.context.set_waitlist(ChannelArrayNode.create(2, process.heap).addr)
      process.context.waitlist().set_child(0, chan.wait(req))
      process.context
        .waitlist()
        .set_child(
          1,
          process.heap.blocked_contexts.push_back(process.context.addr),
        )
      process.context.set_blocked(true)
    } else {
      process.context.set_PC(req.PC())
      if (req.is_recv()) process.context.pushOS(req.io())
    }
    process.heap.temp_pop()
  }
}

export class SelectInstruction extends Instruction {
  constructor(public cases: number, public default_case: boolean) {
    super('SELECT CASES')
  }
  override execute(process: Process): void {
    let pc = -1
    if (this.default_case) {
      pc = new IntegerNode(process.heap, process.context.popOS()).get_value()
    }
    let cases = []
    for (let i = 0; i < this.cases; i++) {
      cases.push(new ChannelReqNode(process.heap, process.context.peekOS()))
      process.heap.temp_push(process.context.popOS())
    }
    cases = cases
      .map((a) => ({ sort: process.generator(), value: a }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.value)
    let done = false
    for (const cas of cases) {
      const chan = cas.channel()
      const req = cas.req()
      if (chan.try(req)) {
        done = true
        process.context.set_PC(req.PC())
        if (req.is_recv()) process.context.pushOS(req.io())
        break
      }
    }
    if (!done) {
      if (pc !== -1) {
        process.context.set_PC(pc)
      } else {
        process.context.set_blocked(true)
        process.context.set_waitlist(
          ChannelArrayNode.create(cases.length + 1, process.heap).addr,
        )
        for (let i = 0; i < cases.length; i++) {
          const chan = cases[i].channel()
          const req = cases[i].req()
          process.context.waitlist().set_child(i, chan.wait(req))
        }
        process.context
          .waitlist()
          .set_child(
            cases.length,
            process.heap.blocked_contexts.push_back(process.context.addr),
          )
      }
    }
    for (let i = 0; i < cases.length; i++) process.heap.temp_pop()
  }
}
