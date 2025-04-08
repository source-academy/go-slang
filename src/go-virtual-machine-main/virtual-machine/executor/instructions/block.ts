import { ArrayNode } from '../../heap/types/array'
import { BaseNode } from '../../heap/types/base'
import { FrameNode } from '../../heap/types/environment'
import { ReferenceNode } from '../../heap/types/reference'
import { StructNode } from '../../heap/types/struct'
import { Process } from '../../runtime/process'
import {
  Type,
} from '../typing'
import { ArrayType } from '../typing/array_type'
import { BoolType } from '../typing/bool_type'
import { DeclaredType } from '../typing/declared_type'
import { PointerType } from '../typing/pointer_type'
import { StringType } from '../typing/string_type'
import { StructType } from '../typing/struct_type'

import { Instruction } from './base'

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
    const new_frame = FrameNode.create(this.frame.length, process.heap)
    process.heap.temp_push(new_frame.addr)
    for (let i = 0; i < this.frame.length; i++) {
      const T = this.frame[i]
      if (T instanceof DeclaredType) {
        // Find underlying type to load default values into
        let actualType = T
        let nextType = T.type[0]
        while (nextType instanceof DeclaredType) {
          actualType = nextType
          nextType = actualType.type[0]
        }
        new_frame.set_idx(nextType.defaultNodeCreator()(process.heap), i)
      } else if (T instanceof ArrayType) {
        const dimensions = [] as number[]
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
          let nextType = next.type[0]
          while (nextType instanceof DeclaredType) {
            actualType = nextType
            nextType = actualType.type[0]
          }
          next = nextType
        }
        // handle structs elegantly
        const addr = next.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 4
        if (next instanceof BoolType) sizeof = 1
        if (next instanceof StringType) sizeof = 2
        if (next instanceof StructType) {
          sizeof = 0
          const fields = [...next.fields.values()]
          for (let j = 0; j < fields.length; j++) {
            sizeof += fields[j].sizeof()
          }
        }
        const arrayNodes = [] as ArrayNode[]
        if (T.element instanceof ArrayType) {
          if (next instanceof StructType) {
            // we get the ArrayNode containing all the structs from bulkDefault
            // now we have to split them into the correct dimension
            const dimensions2 = [] as number[]
            for (let i = 0; i < dimensions.length; i++) {
              dimensions2[i] = dimensions[i]
            }
            const structs = process.heap.get_value(addr).get_children()
            const structNodes = [] as StructNode[]
            for (let i = 0; i < structs.length; i++) {
              structNodes.push(process.heap.get_value(structs[i]) as StructNode)
            }
            while (dimensions2.length > 0) {
              const dim = dimensions2.pop()
              if (dim !== undefined) {
                const n = structNodes.length
                for (let a = 0; a < n / dim; a++) {
                  const array = ArrayNode.create(dim, process.heap, sizeof, addr)
                  for (let b = 0; b < dim; b++) {
                    const node = structNodes.shift()
                    if (node !== undefined) array.set_child(b, node.addr)
                  }
                  arrayNodes.push(array)
                }
              }
            }
            dimensions.pop()
            while (dimensions.length > 0) {
              const dim = dimensions.pop()
              if (dim !== undefined) {
                const n = arrayNodes.length
                for (let a = 0; a < n / dim; a++) {
                  const array = ArrayNode.create(dim, process.heap, sizeof, addr)
                  for (let b = 0; b < dim; b++) {
                    const node = arrayNodes.shift()
                    if (node !== undefined) array.set_child(b, node.addr)
                  }
                  arrayNodes.push(array)
                }
              }
            }
            const node = arrayNodes.pop()
            if (node !== undefined) {
              new_frame.set_idx(node.addr, i)
            }
          } else {
            let next2 = T.element
            while (next2.element instanceof ArrayType) {
              next2 = next2.element
            }
            const baseType = next2.element
            if (baseType instanceof BoolType) sizeof = 1
            if (baseType instanceof StringType) sizeof = 2
            let addr2 = addr
            // handle multi-dimensional arrays: inner-most layer
            // we ensured that the memory block is contiguous earlier
            // so we need to link ArrayNodes to the correct memory addresses
            for (let a = 0; a < length / next2.length; a++) {
              arrayNodes.push(
                ArrayNode.create(next2.length, process.heap, sizeof, addr2),
              )
              addr2 += sizeof * next2.length
            }
            dimensions.pop()
            while (dimensions.length > 0) {
              const dim = dimensions.pop()
              if (dim !== undefined) {
                const n = arrayNodes.length
                for (let a = 0; a < n / dim; a++) {
                  const array = ArrayNode.create(dim, process.heap, sizeof, addr)
                  for (let b = 0; b < dim; b++) {
                    const node = arrayNodes.shift()
                    if (node !== undefined) array.set_child(b, node.addr)
                  }
                  arrayNodes.push(array)
                }
              }
            }
            const node = arrayNodes.pop()
            if (node !== undefined) {
              new_frame.set_idx(node.addr, i)
            }
          }
        } else {
          // in the case of array of structs, since bulk default returns an ArrayNode
          // there is no need to create a separate array
          if (next instanceof StructType) {
            new_frame.set_idx(addr, i)
          } else {
          // in the case of 1D array
            const array = ArrayNode.create(T.length, process.heap, sizeof, addr)
            if (Array.isArray(addr)) {
              const length = addr.length
              for (let k = 0; k < length; k++) {
                array.set_child(k, addr[k])
              }
            }
            new_frame.set_idx(array.addr, i)
          }
        }
      } else {
        const addr = T.defaultNodeCreator()(process.heap)
        new_frame.set_idx(addr, i)
        if (
          T instanceof PointerType &&
          T.type instanceof DeclaredType &&
          T.type.type[0] instanceof StructType
        ) {
          const structAddr = T.type.type[0].defaultNodeCreator()(process.heap)
          const node = process.heap.get_value(addr) as ReferenceNode
          node.set_child(structAddr)
        } else if (T instanceof PointerType && T.type instanceof ArrayType) {
          const dimensions = [] as number[]
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
            while (nextType[0] instanceof DeclaredType) {
              actualType = nextType[0]
              nextType = actualType.type
            }
            next = nextType[0]
          }
          const arrayAddr = next.bulkDefaultNodeCreator()(process.heap, length)
          let sizeof = 4
          if (next instanceof BoolType) sizeof = 1
          if (next instanceof StringType) sizeof = 2
          if (next instanceof StructType) {
            sizeof = 0
            const fields = [...next.fields.values()]
            for (let j = 0; j < fields.length; j++) {
              sizeof += fields[j].sizeof()
            }
          }
          const arrayNodes = [] as ArrayNode[]
          if (T.type.element instanceof ArrayType) {
            let next2 = T.type.element
            while (next2.element instanceof ArrayType) {
              next2 = next2.element
            }
            const baseType = next2.element
            if (baseType instanceof BoolType) sizeof = 1
            if (baseType instanceof StringType) sizeof = 2
            let addr2 = arrayAddr
            // handle multi-dimensional arrays: inner-most layer
            // we ensured that the memory block is contiguous earlier
            // so we need to link ArrayNodes to the correct memory addresses
            for (let a = 0; a < length / next2.length; a++) {
              arrayNodes.push(
                ArrayNode.create(next2.length, process.heap, sizeof, addr2),
              )
              addr2 += sizeof * next2.length
            }
            dimensions.pop()
            while (dimensions.length > 0) {
              const dim = dimensions.pop()
              const n = arrayNodes.length
              if (dim !== undefined) {
                for (let a = 0; a < n / dim; a++) {
                  const array = ArrayNode.create(
                    dim,
                    process.heap,
                    sizeof,
                    arrayAddr,
                  )
                  for (let b = 0; b < dim; b++) {
                    const node = arrayNodes.shift()
                    if (node !== undefined) {
                      array.set_child(b, node.addr)
                    }
                  }
                  arrayNodes.push(array)
                }
              }
            }
            const pointer = process.heap.get_value(addr) as ReferenceNode
            const node = arrayNodes.pop()
            if (node !== undefined) {
              pointer.set_child(node.addr)
            }
          } else {
            // in the case of array of structs, since bulk default returns an ArrayNode
            // there is no need to create a separate array
            if (next instanceof StructType) {
              //const pointer = process.heap.get_value(addr) as ReferenceNode
              //pointer.set_child(array.addr)
              new_frame.set_idx(addr, i)
            } else {
              // in the case of 1D array
              const array = ArrayNode.create(
                T.type.length,
                process.heap,
                sizeof,
                arrayAddr,
              )
              if (Array.isArray(arrayAddr)) {
                const length = arrayAddr.length
                for (let k = 0; k < length; k++) {
                  array.set_child(k, arrayAddr[k])
                }
              }
              const pointer = process.heap.get_value(addr) as ReferenceNode
              pointer.set_child(array.addr)
            }
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
      const node = process.heap.get_value(src)
      if (node instanceof ArrayNode) {
        // deepcopy if array
        const dimensions = [] as number[]
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
        const type = process.heap.get_type(next.addr)
        const addr = type.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 4
        if (type instanceof BoolType) sizeof = 1
        if (type instanceof StringType) sizeof = 2
        // deepcopy each element
        for (let i = 0; i < length; i++) {
          process.heap.copy(addr + sizeof * i, arrayStart + sizeof * i)
        }
        const arrayNodes = [] as ArrayNode[]
        if (node instanceof ArrayNode) {
          let next2 = process.heap.get_value(node.get_child(0))
          let length2 = node.length()
          while (next2 instanceof ArrayNode) {
            length2 = next2.length()
            next2 = process.heap.get_value(next2.get_child(0))
          }
          const baseType = process.heap.get_type(next2.addr)
          if (baseType instanceof BoolType) sizeof = 1
          if (baseType instanceof StringType) sizeof = 2
          let addr2 = addr
          // handle multi-dimensional arrays: inner-most layer
          // we ensured that the memory block is contiguous earlier
          // so we need to link ArrayNodes to the correct memory addresses
          for (let a = 0; a < length / length2; a++) {
            arrayNodes.push(
              ArrayNode.create(length2, process.heap, sizeof, addr2),
            )
            addr2 += sizeof * length2
          }
          dimensions.pop()
          while (dimensions.length > 0) {
            const dim = dimensions.pop()
            const n = arrayNodes.length
            if (dim !== undefined) {
              for (let a = 0; a < n / dim; a++) {
                const array = ArrayNode.create(dim, process.heap, sizeof, addr)
                for (let b = 0; b < dim; b++) {
                  const node = arrayNodes.shift()
                  if (node !== undefined) {
                    array.set_child(b, node.addr)
                  }
                }
                arrayNodes.push(array)
              }
            }
          }
          const arrayNode = arrayNodes.pop()
          if (arrayNode !== undefined) {
            process.heap.copy(dst, arrayNode.addr)
          }
        }
      } else if (node instanceof StructNode) {
        // deepcopy if struct
        const baseNodes = [] as BaseNode[]
        let structStart = -1
        let next = process.heap.get_value(node.get_child(0))
        while (next instanceof StructNode) {
          next = process.heap.get_value(next.get_child(0))
        }
        structStart = next.addr
        push(process, baseNodes, node)
        const addr = process.heap.allocate(node.sizeof())
        const struct = StructNode.create(node.length(), process.heap)
        for (let i = 0, count = 0; i < node.sizeof(); ) {
          const node = baseNodes.shift()
          if (!(node instanceof StructNode) && node !== undefined) {
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

function push(process: Process, a: BaseNode[], node: StructNode) {
  const children = node.get_children()
  for (let i = 0; i < children.length; i++) {
    const child = process.heap.get_value(node.get_child(i))
    while (child instanceof StructNode) {
      a.push(child)
      push(process, a, child)
    }
    a.push(child)
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
