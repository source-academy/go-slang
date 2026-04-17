import { TokenLocation } from "../compiler/tokens"
import { BinaryInstruction, BlockInstruction, BuiltinCapInstruction, BuiltinLenInstruction, CallInstruction, DeferredCallInstruction, DoneInstruction, ExitBlockInstruction, ExitLoopInstruction, ForkInstruction, FuncBlockInstruction, GoInstruction, Instruction, JumpIfFalseInstruction, JumpInstruction, LoadArrayElementInstruction, LoadArrayInstruction, LoadChannelInstruction, LoadChannelReqInstruction, LoadConstantInstruction, LoadDefaultInstruction, LoadFuncInstruction, LoadPackageInstruction, LoadSliceElementInstruction, LoadSliceInstruction, LoadStructFieldInstruction, LoadVariableInstruction, NoInstruction, PopInstruction, ReturnInstruction, SelectInstruction, SelectorOperationInstruction, SliceOperationInstruction, StoreArrayElementInstruction, StoreInstruction, StoreStructFieldInstruction, TryChannelReqInstruction, UnaryInstruction } from "../executor/instructions"
import { MemoryAllocationInstruction } from "../executor/instructions/memory"
import { ArbitraryType, Type } from "../executor/typing"
import { ArrayType } from "../executor/typing/array_type"
import { BoolType } from "../executor/typing/bool_type"
import { ByteType } from "../executor/typing/byte_type"
import { ChannelType } from "../executor/typing/channel_type"
import { DeclaredType } from "../executor/typing/declared_type"
import { Float64Type } from "../executor/typing/float64_type"
import { FunctionType } from "../executor/typing/function_type"
import { Int64Type } from "../executor/typing/int64_type"
import { NoType } from "../executor/typing/no_type"
import { PackageType } from "../executor/typing/package_type"
import { MutexType } from "../executor/typing/packages/mutex_type"
import { WaitGroupType } from "../executor/typing/packages/waitgroup_type"
import { ParameterType } from "../executor/typing/parameter_type"
import { PointerType } from "../executor/typing/pointer_type"
import { ReturnType } from "../executor/typing/return_type"
import { SliceType } from "../executor/typing/slice_type"
import { StringType } from "../executor/typing/string_type"
import { StructType } from "../executor/typing/struct_type"
import { Heap } from "../heap"

import { DebuggerV2 } from "./debuggerV2"
import { MessageType, SchedulerToWorker } from "./message"
import { Thread } from "./thread"

export let local_thread: Thread

onmessage = (event: MessageEvent<SchedulerToWorker>) => {
    const type = event.data.type
    switch (type) {
        case MessageType.START: {
            const { thread_id, load_heap_config, worker_config } = event.data
            const {
                runqueue,
                instructions,
                symbols,
                heapsize,
                runqueues,
                deterministic,
                visualmode,
                main_goroutine_addr
            } = worker_config

            // Need to reconstruct instructions and symbols since worker receiving them will lose their types
            const instrs: Instruction[] = []
            for (let i = 0; i < instructions.length; i++) {
                const instr = instructions[i]
                instrs.push(object_to_instr(instr))
            }
            const symbs: (TokenLocation | null)[] = []
            for (let i = 0; i < symbols.length; i++) {
                const sym = symbols[i] as (TokenLocation | null)
                symbs.push(object_to_token_location(sym))
            }

            const heap = new Heap(heapsize, load_heap_config)
            const debug = new DebuggerV2(runqueues, heap, instrs, symbs)
            if (visualmode) {
                debug.context_id_map.set(
                    main_goroutine_addr,
                    debug.context_id++, // increase id after storing so next context has increasing id
                )
            }
            heap.debugger = debug

            local_thread = new Thread(
                thread_id,
                runqueue,
                instrs,
                heap,
                debug,
                deterministic,
                visualmode,
                main_goroutine_addr
            )
            local_thread.run()
            break;
        }
        case MessageType.RUN_PROGRAM: {
            local_thread.run()
            break;
        }
    }
}

const object_to_instr = (object: Instruction): Instruction => {
    const tag = object.tag
    switch (tag) {
      case ('DONE'): { return new DoneInstruction() }
      case ('POP'): { return new PopInstruction() }
      case ('NIL'): { return new NoInstruction() }
      case ('BLOCK'): {
        const obj_instr = object as BlockInstruction
        const instr = new BlockInstruction(obj_instr.name, obj_instr.for_block)
        const frame: Type[] = []
        for (let i = 0; i < obj_instr.frame.length; i++) {
            frame.push(object_to_type(obj_instr.frame[i]))
        }
        instr.set_frame(frame)
        instr.set_identifiers(obj_instr.identifiers)
        return instr
      }
      case ('FUNC_BLOCK'): {
        const obj_instr = object as FuncBlockInstruction
        const instr = new FuncBlockInstruction(obj_instr.args)
        const frame: Type[] = []
        for (let i = 0; i < obj_instr.frame.length; i++) {
            frame.push(object_to_type(obj_instr.frame[i]))
        }
        instr.set_frame(frame)
        instr.set_identifiers(obj_instr.identifiers)
        return instr
      }
      case ('EXIT_BLOCK'): { return new ExitBlockInstruction() }
      case ('BUILTIN_LEN'): { return new BuiltinLenInstruction() }
      case ('BUILTIN_CAP'): { return new BuiltinCapInstruction() }
      case ('FORK'): {
        const obj_instr = object as ForkInstruction
        return new ForkInstruction(obj_instr.addr)
      }
      case ('GO'): {
        const obj_instr = object as GoInstruction
        return new GoInstruction(obj_instr.args, obj_instr.addr)
      }
      case ('LDCH'): { return new LoadChannelInstruction() }
      case ('LDCR'): {
        const obj_instr = object as LoadChannelReqInstruction
        return new LoadChannelReqInstruction(obj_instr.recv, obj_instr.PC)
      }
      case ('TRY_CHAN_REQ'): { return new TryChannelReqInstruction() }
      case ('SELECT CASES'): {
        const obj_instr = object as SelectInstruction
        return new SelectInstruction(obj_instr.cases, obj_instr.default_case)
      }
      case ('JUMP'): {
        const obj_instr = object as JumpInstruction
        return new JumpInstruction(obj_instr.addr)
      }
      case ('JUMP_IF_FALSE'): {
        const obj_instr = object as JumpIfFalseInstruction
        return new JumpIfFalseInstruction(obj_instr.addr)
      }
      case ('JUMP_LOOP'): {
        const obj_instr = object as ExitLoopInstruction
        return new ExitLoopInstruction(obj_instr.addr)
      }
      case ('LF'): {
        const obj_instr = object as LoadFuncInstruction
        return new LoadFuncInstruction(obj_instr.PC)
      }
      case ('CALL'): {
        const obj_instr = object as CallInstruction
        return new CallInstruction(obj_instr.args)
      }
      case ('DEFERRED_CALL'): {
        const obj_instr = object as DeferredCallInstruction
        return new DeferredCallInstruction(obj_instr.args)
      }
      case ('RET'): { return new ReturnInstruction() }
      case ('LDC'): {
        const obj_instr = object as LoadConstantInstruction
        return new LoadConstantInstruction(obj_instr.val, object_to_type(obj_instr.data_type))
      }
      case ('LDD'): {
        const obj_instr = object as LoadDefaultInstruction
        return new LoadDefaultInstruction(object_to_type(obj_instr.dataType))
      }
      case ('LDA'): {
        const obj_instr = object as LoadArrayInstruction
        return new LoadArrayInstruction(obj_instr.length, object_to_type(obj_instr.type))
      }
      case ('LDAE'): { 
        const obj_instr = object as LoadArrayElementInstruction // Typecast to this just to obtain clarify field
        if (obj_instr.clarify === 'LOAD ARRAY') {
          return new LoadArrayElementInstruction()
        } else {
          return new LoadSliceElementInstruction()
        }
      }
      case ('LDS'): { return new LoadSliceInstruction() }
      case ('LD'): {
        const obj_instr = object as LoadVariableInstruction
        return new LoadVariableInstruction(
          obj_instr.frame_idx,
          obj_instr.var_idx,
          obj_instr.id,
          object_to_type(obj_instr.type)
        )
      }
      case ('LDP'): { return new LoadPackageInstruction() }
      case ('LDSF'): {
        const obj_instr = object as LoadStructFieldInstruction
        return new LoadStructFieldInstruction(obj_instr.index)
      }
      case ('MALLOC'): {
        const obj_instr = object as MemoryAllocationInstruction
        return new MemoryAllocationInstruction(obj_instr.size)
      }
      case ('UNARY'): {
        const obj_instr = object as UnaryInstruction
        return new UnaryInstruction(obj_instr.op)
      }
      case ('BINOP'): {
        const obj_instr = object as BinaryInstruction
        return new BinaryInstruction(obj_instr.op)
      }
      case ('SLICEOP'): { return new SliceOperationInstruction() }
      case ('SELECTOP'): { return new SelectorOperationInstruction() }
      case ('STORE'): { return new StoreInstruction() }
    }
    if (tag.startsWith('STORE ARRAY ELEMENT ')) {
      const obj_instr = object as StoreArrayElementInstruction
      return new StoreArrayElementInstruction(obj_instr.index, obj_instr.toPop)
    } else if (tag.startsWith('STORE STRUCT FIELD ')) {
      const obj_instr = object as StoreStructFieldInstruction
      return new StoreStructFieldInstruction(obj_instr.index, obj_instr.order, obj_instr.hasKey, obj_instr.toPop)
    }
    return new NoInstruction() // default, should not occur
}

const object_to_type = (object: Type): Type => {
    const tag = object.tag
    switch (tag) {
        case ('ARBITRARY'): { return new ArbitraryType() }
        case ('ARRAY'): {
            const obj_type = object as ArrayType
            return new ArrayType(object_to_type(obj_type.element), obj_type.length)
        }
        case ('BOOL'): { return new BoolType() }
        case ('BYTE'): { return new ByteType() }
        case ('CHANNEL'): {
            const obj_type = object as ChannelType
            return new ChannelType(object_to_type(obj_type.element), obj_type.readable, obj_type.writable)
        }
        case ('DECLARED'): {
            const obj_type = object as DeclaredType
            const types: Type[] = []
            for (let i = 0; i < obj_type.type.length; i++) {
                types.push(object_to_type(obj_type.type[i]))
            }
            return new DeclaredType(obj_type.name, types)
        }
        case ('FLOAT'): { return new Float64Type() }
        case ('FUNCTION'): {
            const obj_type = object as FunctionType
            const params: ParameterType[] = []
            for (let i = 0; i < obj_type.parameters.length; i++) {
                params.push(object_to_type(obj_type.parameters[i]) as ParameterType)
            }
            return new FunctionType(params, object_to_type(obj_type.results) as ReturnType, obj_type.variadic)
        }
        case ('INT64'): { return new Int64Type() }
        case ('NO TYPE'): { return new NoType() }
        case ('PACKAGE'): {
            const obj_type = object as PackageType
            const types: Record<string, Type> = {}
            for (const key in obj_type.types) {
                types[key] = object_to_type(obj_type.types[key])
            }
            return new PackageType(obj_type.name, types)
        }
        case ('PARAM'): {
            const obj_type = object as ParameterType
            return new ParameterType(obj_type.identifier, object_to_type(obj_type.type))
        }
        case ('POINTER'): {
            const obj_type = object as PointerType
            return new PointerType(object_to_type(obj_type.type))
        }
        case ('RETURN'): {
            const obj_type = object as ReturnType
            const types: Type[] = []
            for (let i = 0; i < obj_type.types.length; i++) {
                types.push(object_to_type(obj_type.types[i]))
            }
            return new ReturnType(types)
        }
        case ('SLICE'): {
            const obj_type = object as SliceType
            return new SliceType(object_to_type(obj_type.element))
        }
        case ('STRING'): { return new StringType() }
        case ('STRUCT'): {
            const obj_type = object as StructType
            const fields: Map<string, Type> = new Map<string, Type>()
            for (const key in obj_type.fields) {
                fields.set(key, object_to_type(obj_type.fields.get(key) as Type))
            }
            return new StructType(fields)
        }
        case ('MUTEX'): { return new MutexType() }
        case ('WAITGROUP'): { return new WaitGroupType() }
    }
    return new NoType() // Should not fall through
}

const object_to_token_location = (object: (TokenLocation | null)) => {
    if (object === null) {
        return null
    }
    const tokenLocation: TokenLocation = {
        start: object.start,
        end: object.end
    }
    return tokenLocation
}