import {
  CallRefNode,
  DeferFuncNode,
  DeferMethodNode,
  FuncNode,
  MethodNode,
} from '../../heap/types/func'
import { Process } from '../../runtime/process'

import { Instruction } from './base'

export class LoadFuncInstruction extends Instruction {
  PC: number
  constructor(PC: number) {
    super('LF')
    this.PC = PC
  }

  override toString(): string {
    return 'LOAD FUNC'
  }

  static is(instr: Instruction): instr is LoadFuncInstruction {
    return instr.tag === 'LF'
  }

  override execute(process: Process): void {
    process.context.pushOS(
      FuncNode.create(this.PC, process.context.E().addr, process.heap).addr,
    )
  }
}

export class CallInstruction extends Instruction {
  constructor(public args: number) {
    super('CALL')
  }

  override toString(): string {
    return 'CALL ' + this.args.toString() + ' ARGS'
  }

  static is(instr: Instruction): instr is CallInstruction {
    return instr.tag === 'CALL'
  }

  override execute(process: Process): void {
    const func = process.heap.get_value(process.context.peekOSIdx(this.args))
    if (!(func instanceof FuncNode) && !(func instanceof MethodNode))
      throw Error('Stack does not contain closure')

    if (func instanceof FuncNode) {
      process.context.pushDeferStack()
      process.context.pushRTS(
        CallRefNode.create(process.context.PC(), process.heap).addr,
      )
      process.context.pushRTS(func.E())
      process.context.set_PC(func.PC())
    } else {
      const receiver = func.receiver()
      receiver.handleMethodCall(process, func.identifier(), this.args)
    }
  }
}

export class DeferredCallInstruction extends Instruction {
  constructor(public args: number) {
    super('DEFERRED_CALL')
  }

  override toString(): string {
    return 'DEFER CALL ' + this.args.toString() + ' ARGS'
  }

  static fromCallInstruction(call: CallInstruction): DeferredCallInstruction {
    return new DeferredCallInstruction(call.args)
  }

  static is(instr: Instruction): instr is DeferredCallInstruction {
    return instr.tag === 'DEFERRED_CALL'
  }

  override execute(process: Process): void {
    const func = process.heap.get_value(process.context.peekOSIdx(this.args))
    if (!(func instanceof FuncNode) && !(func instanceof MethodNode))
      throw Error('Stack does not contain closure')

    let deferNode
    if (func instanceof FuncNode) {
      deferNode = DeferFuncNode.create(this.args, process)
    } else {
      deferNode = DeferMethodNode.create(this.args, process)
    }
    process.context.peekDeferStack().push(deferNode.addr)
  }
}

export class ReturnInstruction extends Instruction {
  constructor() {
    super('RET')
  }

  static is(instr: Instruction): instr is ReturnInstruction {
    return instr.tag === 'RET'
  }

  override execute(process: Process): void {
    // Clear remnant environment nodes on the RTS (e.g. from blocks).
    while (!(process.context.peekRTS() instanceof CallRefNode)) {
      process.context.popRTS()
      if (process.context.RTS().sz() === 0) break
    }

    const defers = process.context.peekDeferStack()
    if (defers.sz()) {
      // There are still deferred calls to be carried out.
      const deferNode = process.heap.get_value(defers.pop())
      if (
        !(deferNode instanceof DeferFuncNode) &&
        !(deferNode instanceof DeferMethodNode)
      ) {
        throw new Error('Unreachable')
      }

      // Push everything back onto OS before resuming the call.
      if (deferNode instanceof DeferFuncNode) {
        process.context.pushOS(deferNode.funcAddr())
        while (deferNode.stack().sz()) {
          process.context.pushOS(deferNode.stack().pop())
        }
        process.context.pushDeferStack()
        process.context.pushRTS(
          CallRefNode.create(process.context.PC() - 1, process.heap).addr,
        )
        process.context.pushRTS(deferNode.func().E())
        process.context.set_PC(deferNode.func().PC())
      } else {
        const methodNode = deferNode.methodNode()
        process.context.pushOS(methodNode.addr)
        process.context.pushOS(methodNode.receiverAddr())
        const argCount = deferNode.stack().sz()
        while (deferNode.stack().sz()) {
          process.context.pushOS(deferNode.stack().pop())
        }
        methodNode
          .receiver()
          .handleMethodCall(process, methodNode.identifier(), argCount)

        // Since methods are hardcoded and don't behave like functions, they don't jump back to an address.
        // Manually decrement PC here so that the next executor step will return to this instruction.
        process.context.set_PC(process.context.PC() - 1)
      }

      // Return here to account for this as one instruction,
      // to avoid hogging the CPU while going through deferred calls.
      return
    } else {
      process.context.popDeferStack()
    }

    if (process.context.RTS().sz() === 0) return // handles goroutines exiting
    const callRef = process.heap.get_value(process.context.popRTS())
    if (!(callRef instanceof CallRefNode)) throw new Error('Unreachable')
    process.context.set_PC(callRef.PC())
  }
}
