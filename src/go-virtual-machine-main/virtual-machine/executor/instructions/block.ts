import { Process } from '../../runtime/process'
import { FrameNode } from '../../heap/types/environment'
import { ArrayType, BoolType, DeclaredType, PointerType, StringType, StructType, Type } from '../typing'

import { Instruction } from './base'
import { PrimitiveTypeToken } from '../../compiler/tokens'
import { ArrayNode } from '../../heap/types/array'
import { StructNode } from '../../heap/types/struct'
import { a } from 'vitest/dist/suite-IbNSsUWN'
import { BaseNode } from '../../heap/types/base'

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
        let sizeof = 4
        if (next instanceof BoolType) sizeof = 1
        if (next instanceof StringType) sizeof = 2
        if (next instanceof StructType) {
          sizeof = 0
          let fields = [...next.fields.values()]
          for (let j = 0; j < fields.length; j++) {
            sizeof += fields[j].sizeof()
          }
        }
        let arrayNodes = [] as ArrayNode[]
        if (T.element instanceof ArrayType) {
          let next2 = T.element
          while (next2.element instanceof ArrayType) {
            next2 = next2.element
          }
          let baseType = next2.element
          if (baseType instanceof BoolType) sizeof = 1
          if (baseType instanceof StringType) sizeof = 2
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
          if (addr instanceof Array) {
            const length = addr.length
            for (let k = 0; k < length; k++) {
              array.set_child(k, addr[k])
            }
          }
          new_frame.set_idx(array.addr, i)
        }
      } else if (T instanceof StructType) {
        let size = 0
        let next = [...T.fields.values()]
        for (let i = 0; i < next.length; i++) {
          if (next[i] instanceof DeclaredType) {
            // Find underlying type to load default values into
            let actualType = next[i]
            let nextType = next[i].type
            // TODO: Morph to support structs
            while (nextType[0] instanceof DeclaredType) {
              actualType = nextType[0]
              nextType = actualType.type
            }
            size += nextType[0].sizeof()
          } else {
            size += next[i].sizeof()
          }
        }
        let addr = T.defaultNodeCreator()(process.heap, size)
        /*
        let size = 0
        for (let i = 0; i < [...T.fields.values()].length; i++) {
          size += [...T.fields.values()].sizeof()
        }
        let nextAddr = addr
        for (let i = 0; i < [...T.fields.values()].length; i++) {
          [...T.fields.values()][i].defaultNodeAllocator()(process.heap, nextAddr)
          nextAddr += [...T.fields.values()][i].sizeof()
        }
          */
        new_frame.set_idx(addr, i)
      } else {
        const addr = T.defaultNodeCreator()(process.heap)
        new_frame.set_idx(addr, i)
        if (T instanceof PointerType && T.type instanceof DeclaredType && T.type.type[0] instanceof StructType) {
          let size = 0
          let next = [...T.type.type[0].fields.values()]
          for (let i = 0; i < next.length; i++) {
            if (next[i] instanceof DeclaredType) {
              // Find underlying type to load default values into
              let actualType = next[i]
              let nextType = next[i].type
              // TODO: Morph to support structs
              while (nextType[0] instanceof DeclaredType) {
                actualType = nextType[0]
                nextType = actualType.type
              }
              size += nextType[0].sizeof()
            } else {
              size += next[i].sizeof()
            }
          }
          const structAddr = T.type.type[0].defaultNodeCreator()(process.heap, size)
          process.heap.get_value(addr).set_child(structAddr)
        } else if (T instanceof PointerType && T.type instanceof ArrayType) {
          let dimensions = [] as number[]
          let length = T.type.length
          let next = T.type.element
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
          let arrayAddr = next.bulkDefaultNodeCreator()(process.heap, length)
          let sizeof = 4
          if (next instanceof BoolType) sizeof = 1
          if (next instanceof StringType) sizeof = 2
          if (next instanceof StructType) {
            sizeof = 0
            let fields = [...next.fields.values()]
            for (let j = 0; j < fields.length; j++) {
              sizeof += fields[j].sizeof()
            }
          }
          let arrayNodes = [] as ArrayNode[]
          if (T.type.element instanceof ArrayType) {
            let next2 = T.type.element
            while (next2.element instanceof ArrayType) {
              next2 = next2.element
            }
            let baseType = next2.element
            if (baseType instanceof BoolType) sizeof = 1
            if (baseType instanceof StringType) sizeof = 2
            let addr2 = arrayAddr
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
                let array = ArrayNode.create(dim, process.heap, sizeof, arrayAddr)
                for (let b = 0; b < dim; b++) {
                  array.set_child(b, arrayNodes.shift().addr)
                }
                arrayNodes.push(array)
              }
            }
            const pointer = process.heap.get_value(addr)
            pointer.set_child(arrayNodes.pop().addr)
          } else {
            // in the case of 1D array
            let array = ArrayNode.create(T.type.length, process.heap, sizeof, arrayAddr)
            if (arrayAddr instanceof Array) {
              const length = arrayAddr.length
              for (let k = 0; k < length; k++) {
                array.set_child(k, arrayAddr[k])
              }
            }
            const pointer = process.heap.get_value(addr)
            pointer.set_child(array.addr)
          }
        }
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
      // deepcopy if struct or array
      let node = process.heap.get_value(src)
      if (node instanceof ArrayNode) {
        // deepcopy if array
        let dimensions = [] as number[]
        let length = node.length()
        let next = process.heap.get_value(node.get_child(0))
        let arrayStart = node.get_child(0)
        dimensions.push(length)
        while (next instanceof ArrayNode) {
          dimensions.push(next.length())
          length = length * next.length()
          arrayStart = next.get_child(0)
          next = process.heap.get_value(next.get_child(0))
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
        let type = process.heap.get_type(next.addr)
        let addr = type.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 4
        if (type instanceof BoolType) sizeof = 1
        if (type instanceof StringType) sizeof = 2
        // deepcopy each element
        for (let i = 0; i < length; i++) {
          process.heap.copy(addr + sizeof * i, arrayStart + sizeof * i)
        }
        let arrayNodes = [] as ArrayNode[]
        if (node instanceof ArrayNode) {
          let next2 = process.heap.get_value(node.get_child(0))
          let length2 = node.length()
          while (next2 instanceof ArrayNode) {
            length2 = next2.length()
            next2 = process.heap.get_value(next2.get_child(0))
          }
          let baseType = process.heap.get_type(next2.addr)
          if (baseType instanceof BoolType) sizeof = 1
          if (baseType instanceof StringType) sizeof = 2
          let addr2 = addr
          // handle multi-dimensional arrays: inner-most layer
          // we ensured that the memory block is contiguous earlier
          // so we need to link ArrayNodes to the correct memory addresses
          for (let a = 0; a < length / length2; a++) {
            arrayNodes.push(ArrayNode.create(length2, process.heap, sizeof, addr2))
            addr2 += sizeof * length2
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
          process.heap.copy(dst, arrayNodes.pop().addr)
        } else {
          // in the case of 1D array
          let array = ArrayNode.create(node.length(), process.heap, sizeof, addr)
          process.heap.copy(dst, array.addr)
        }
      } else if (node instanceof StructNode) {
        // deepcopy if struct
        let size = 0
        let baseNodes = [] as BaseNode[]
        let structStart = -1
        let next = process.heap.get_value(node.get_child(0))
        while (next instanceof StructNode) {
          next = process.heap.get_value(next.get_child(0))
        }
        structStart = next.addr

        

        function push(a: BaseNode[], node: StructNode) {
          let children = node.get_children()
          for (let i = 0; i < children.length; i++) {
            let child = process.heap.get_value(node.get_child(i))
            while (child instanceof StructNode) {
              a.push(child)
              push(a, child)
            }
            a.push(child)
          }
        }

        push(baseNodes, node)
        

        let addr = process.heap.allocate(node.sizeof())
        let struct = StructNode.create(node.length(), process.heap)
        for (let i = 0, count = 0; i < node.sizeof();) {
          let node = baseNodes.shift()
          if (!(node instanceof StructNode)) {
            process.heap.copy(addr + i, structStart + i)
            struct.set_child(count, addr + i)
            i += node.sizeof()
            count++
          }
        }
        process.heap.copy(dst, struct.addr)
      }
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
