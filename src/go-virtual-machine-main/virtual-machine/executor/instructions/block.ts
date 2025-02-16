import { Process } from '../../runtime/process'
import { FrameNode } from '../../heap/types/environment'
import { ArrayType, BoolType, DeclaredType, StructType, Type } from '../typing'

import { Instruction } from './base'
import { PrimitiveTypeToken } from '../../compiler/tokens'
import { ArrayNode } from '../../heap/types/array'

export class BlockInstruction extends Instruction {
  frame: Type[] = []
  identifiers: string[] = []
  constructor(public name: string, public for_block = false) {
    super('BLOCK')
  }

  set_frame(frame: Type[]) {
    this.frame = [...frame]
  }

  set_identifiers(identifiers: string[]) {
    this.identifiers = [...identifiers]
  }

  override toString(): string {
    return super.toString() + ' ' + this.name
  }

  override execute(process: Process): void {
    // make structs contiguous too
    const new_frame = FrameNode.create(this.frame.length, process.heap)
    process.heap.temp_push(new_frame.addr)
    for (let i = 0; i < this.frame.length; i++) {
      const T = this.frame[i]
      if (T instanceof DeclaredType) {
        // Find underlying type to load default values into
        let actualType = T
        let nextType = T.type
        // TODO: Morph to support structs
        while (nextType[0] instanceof DeclaredType) {
          actualType = nextType[0]
          nextType = actualType.type
        }
        new_frame.set_idx(nextType[0].defaultNodeCreator()(process.heap), i)
      } else if (T instanceof ArrayType) {
        let dimensions = [] as number[]
        let length = T.length
        let next = T.element
        dimensions.push(length)
        while (next instanceof ArrayType) {
          dimensions.push(next.length)
          length = length * next.length
          next = next.element
        }
        if (next instanceof DeclaredType) {
          // Find underlying type to load default values into
          let actualType = next
          let nextType = next.type
          // TODO: Morph to support structs
          while (nextType[0] instanceof DeclaredType) {
            actualType = nextType[0]
            nextType = actualType.type
          }
          next = nextType[0]
        }
        let addr = next.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 2
        if (next instanceof BoolType) sizeof = 1
        let arrayNodes = [] as ArrayNode[]
        if (T.element instanceof ArrayType) {
          let next2 = T.element
          while (next2.element instanceof ArrayType) {
            next2 = next2.element
          }
          let baseType = next2.element
          if (baseType instanceof BoolType) sizeof = 1
          let addr2 = addr
          // handle multi-dimensional arrays: inner-most layer
          // we ensured that the memory block is contiguous earlier
          // so we need to link ArrayNodes to the correct memory addresses
          for (let a = 0; a < length / next2.length; a++) {
            arrayNodes.push(ArrayNode.create(next2.length, process.heap, sizeof, addr2))
            addr2 += sizeof * next2.length
          }
          dimensions.pop()
          while (dimensions.length > 0) {
            let dim = dimensions.pop()
            let n = arrayNodes.length
            for (let a = 0; a < n / dim; a++) {
              let array = ArrayNode.create(dim, process.heap, sizeof, addr)
              for (let b = 0; b < dim; b++) {
                array.set_child(b, arrayNodes.shift().addr)
              }
              arrayNodes.push(array)
            }
          }
          new_frame.set_idx(arrayNodes.pop().addr, i)
        } else {
          // in the case of 1D array
          let array = ArrayNode.create(T.length, process.heap, sizeof, addr)
          new_frame.set_idx(array.addr, i)
        }
      } else {
        new_frame.set_idx(T.defaultNodeCreator()(process.heap), i)
      }
    }
    const new_env = process.context
      .E()
      .extend_env(new_frame.addr, this.for_block).addr
    process.context.pushRTS(new_env)
    process.heap.temp_pop()

    if (process.debug_mode) {
      process.debugger.env_alloc_map.set(new_env, process.runtime_count)
      process.debugger.env_name_map.set(new_env, this.name)
      const children = new_frame.get_children()
      for (let i = 0; i < children.length; i++) {
        process.debugger.identifier_map.set(children[i], this.identifiers[i])
      }
    }
  }
}
export class FuncBlockInstruction extends BlockInstruction {
  constructor(public args: number) {
    super('ANONY FUNC', false)
    this.tag = 'FUNC_BLOCK'
  }

  override toString(): string {
    return this.tag
  }

  override execute(process: Process): void {
    super.execute(process)
    for (let i = this.args - 1; i >= 0; i--) {
      const src = process.context.popOS()
      const dst = process.context.E().get_frame().get_idx(i)
      process.heap.copy(dst, src)
    }
    // Pop function in stack
    const id = process.context.popOS()
    if (process.debug_mode) {
      const identifier = process.debugger.identifier_map.get(id)
      if (identifier) {
        process.debugger.env_name_map.set(process.context.E().addr, identifier)
      }
    }
  }
}

export class ExitBlockInstruction extends Instruction {
  constructor() {
    super('EXIT_BLOCK')
  }

  override execute(process: Process): void {
    process.context.popRTS()
  }
}
