import {
  BoolBinaryOp,
  BoolUnaryOp,
  NumBinaryOp,
  NumStrBinaryToBoolOp,
  NumUnaryOp,
  StrBinaryOp,
} from '../../runtime/ops'
import { Heap, TAG, word_size } from '..'

import { BaseNode } from './base'
import { ReferenceNode } from './reference'

export abstract class PrimitiveNode extends BaseNode {
  abstract apply_binop(operand: PrimitiveNode, operator: string): PrimitiveNode
  abstract apply_unary(operator: string): PrimitiveNode | ReferenceNode
  abstract get_value(): number | boolean | string

  override toString(): string {
    return this.get_value().toString()
  }
}

export class IntegerNode extends PrimitiveNode {
  static create(num: number, heap: Heap) {
    const addr = heap.allocate(IntegerNode.sizeof())
    heap.set_tag(addr, TAG.NUMBER)
    heap.memory.set_number(num, addr + 1)
    return new IntegerNode(heap, addr)
  }
  static default(heap: Heap) {
    return IntegerNode.create(0, heap)
  }

  static bulkDefault(heap: Heap, length: number) {
    const addr = heap.allocate(IntegerNode.sizeof() * length)
    for (let i = 0; i < length; i++) {
      heap.set_tag(addr + IntegerNode.sizeof() * i, TAG.NUMBER)
      heap.memory.set_number(0, addr + 1 + IntegerNode.sizeof() * i)
    }
    return new IntegerNode(heap, addr)
  }

  static allocate(heap: Heap, addr: number) {
    heap.set_tag(addr, TAG.NUMBER)
    heap.memory.set_number(0, addr + 1)
    return new IntegerNode(heap, addr)
  }

  override sizeof() {
    return 4
  }

  static sizeof() {
    return 4
  }

  get_value() {
    return this.heap.memory.get_number(this.addr + 1)
  }

  override apply_binop(operand: IntegerNode, operator: string): PrimitiveNode {
    if (NumBinaryOp[operator]) {
      return IntegerNode.create(
        NumBinaryOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    if (NumStrBinaryToBoolOp[operator]) {
      return BoolNode.create(
        NumStrBinaryToBoolOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    throw Error('Invalid Operation')
  }

  override apply_unary(operator: string): PrimitiveNode | ReferenceNode {
    if (NumUnaryOp[operator]) {
      return IntegerNode.create(
        NumUnaryOp[operator](this.get_value()),
        this.heap,
      )
    } else if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}

export class FloatNode extends PrimitiveNode {
  static create(num: number, heap: Heap) {
    const addr = heap.allocate(FloatNode.sizeof())
    heap.set_tag(addr, TAG.FLOAT)
    heap.memory.set_float(num, addr + 1)
    return new FloatNode(heap, addr)
  }

  override sizeof() {
    return 4
  }

  static sizeof() {
    return 4
  }

  static default(heap: Heap) {
    return FloatNode.create(0.0, heap)
  }

  static bulkDefault(heap: Heap, length: number) {
    const addr = heap.allocate(FloatNode.sizeof() * length)
    for (let i = 0; i < length; i++) {
      heap.set_tag(addr + FloatNode.sizeof() * i, TAG.FLOAT)
      heap.memory.set_float(0.0, addr + 1 + FloatNode.sizeof() * i)
    }
    return new FloatNode(heap, addr)
  }

  static allocate(heap: Heap, addr: number) {
    heap.set_tag(addr, TAG.FLOAT)
    heap.memory.set_float(0.0, addr + 1)
    return new FloatNode(heap, addr)
  }

  get_value() {
    return this.heap.memory.get_float(this.addr + 1)
  }

  override apply_binop(operand: FloatNode, operator: string): PrimitiveNode {
    if (NumBinaryOp[operator]) {
      return FloatNode.create(
        NumBinaryOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    if (NumStrBinaryToBoolOp[operator]) {
      return BoolNode.create(
        NumStrBinaryToBoolOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    throw Error('Invalid Operation')
  }
  override apply_unary(operator: string): PrimitiveNode | ReferenceNode {
    if (NumUnaryOp[operator]) {
      return FloatNode.create(NumUnaryOp[operator](this.get_value()), this.heap)
    } else if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}

export class BoolNode extends PrimitiveNode {
  static create(val: boolean, heap: Heap) {
    const addr = heap.allocate(BoolNode.sizeof())
    heap.set_tag(addr, TAG.BOOLEAN)
    heap.memory.set_bits(val ? 1 : 0, addr, 1, 16)
    return new BoolNode(heap, addr)
  }

  override sizeof() {
    return 1
  }

  static sizeof() {
    return 1
  }

  static default(heap: Heap) {
    return BoolNode.create(false, heap)
  }

  static allocate(heap: Heap, addr: number) {
    heap.set_tag(addr, TAG.BOOLEAN)
    heap.memory.set_bits(0, addr, 1, 16)
    return new BoolNode(heap, addr)
  }

  static bulkDefault(heap: Heap, length: number) {
    const addr = heap.allocate(BoolNode.sizeof() * length)
    for (let i = 0; i < length; i++) {
      heap.set_tag(addr + i, TAG.BOOLEAN)
      heap.memory.set_bits(0, addr + i, 1, 16)
    }
    return new BoolNode(heap, addr)
  }

  get_value() {
    return this.heap.memory.get_bits(this.addr, 1, 16) === 1
  }
  override apply_binop(operand: BoolNode, operator: string): PrimitiveNode {
    if (BoolBinaryOp[operator]) {
      return BoolNode.create(
        BoolBinaryOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    throw Error('Invalid Operation')
  }
  override apply_unary(operator: string): PrimitiveNode | ReferenceNode {
    if (BoolUnaryOp[operator]) {
      return BoolNode.create(BoolUnaryOp[operator](this.get_value()), this.heap)
    } else if (operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Operation')
  }
}

export class StringNode extends PrimitiveNode {
  static create(str: string, heap: Heap) {
    const addr = heap.allocate(StringNode.sizeof())
    heap.set_tag(addr, TAG.STRING)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list_addr = heap.allocate(Math.ceil((str.length + 1) / word_size) + 1)
    heap.set_tag(list_addr, TAG.STRING_LIST)
    heap.memory.set_word(list_addr, addr + 1)
    heap.temp_pop()
    for (let i = 0; i <= str.length; i++) {
      let val = 0
      if (i < str.length) val = str.charCodeAt(i)
      heap.memory.set_bytes(
        val,
        Math.floor(i / word_size) + list_addr + 1,
        1,
        i % word_size,
      )
    }
    return new StringNode(heap, addr)
  }

  override sizeof() {
    return 2
  }

  static sizeof() {
    return 2
  }

  static default(heap: Heap) {
    return StringNode.create('', heap)
  }

  static bulkDefault(heap: Heap, length: number) {
    const addr = heap.allocate(StringNode.sizeof() * length)
    for (let i = 0; i < length; i++) {
      heap.set_tag(addr + StringNode.sizeof() * i, TAG.STRING)
      heap.temp_push(addr + StringNode.sizeof() * i)
      heap.memory.set_number(-1, addr + 1 + StringNode.sizeof() * i)
      const list_addr = heap.allocate(
        Math.ceil((''.length + 1) / word_size) + 1,
      )
      heap.set_tag(list_addr, TAG.STRING_LIST)
      heap.memory.set_word(list_addr, addr + 1 + StringNode.sizeof() * i)
      heap.temp_pop()
      for (let j = 0; j <= ''.length; j++) {
        let val = 0
        if (j < ''.length) val = ''.charCodeAt(j)
        heap.memory.set_bytes(
          val,
          Math.floor(j / word_size) + list_addr + 1,
          1,
          j % word_size,
        )
      }
    }
    return new StringNode(heap, addr)
  }

  static allocate(heap: Heap, addr: number) {
    heap.set_tag(addr, TAG.STRING)
    heap.temp_push(addr)
    heap.memory.set_number(-1, addr + 1)
    const list_addr = heap.allocate(Math.ceil(1 / word_size) + 1)
    heap.set_tag(list_addr, TAG.STRING_LIST)
    heap.memory.set_word(list_addr, addr + 1)
    heap.temp_pop()
    for (let i = 0; i <= 0; i++) {
      let val = 0
      if (i < 0) val = ''.charCodeAt(i)
      heap.memory.set_bytes(
        val,
        Math.floor(i / word_size) + list_addr + 1,
        1,
        i % word_size,
      )
    }
    return new StringNode(heap, addr)
  }

  get_list() {
    return this.heap.memory.get_word(this.addr + 1)
  }

  get_value() {
    let res = ''
    let idx = 0
    const max_sz = (this.heap.get_size(this.get_list()) - 1) * word_size
    while (idx < max_sz) {
      const val = this.heap.memory.get_bytes(
        Math.floor(idx / word_size) + this.get_list() + 1,
        1,
        idx % word_size,
      )
      if (val === 0) break
      res += String.fromCharCode(val)
      idx++
    }
    return res
  }

  override get_children(): number[] {
    return [this.get_list()]
  }

  override apply_binop(operand: StringNode, operator: string): PrimitiveNode {
    if (StrBinaryOp[operator]) {
      return StringNode.create(
        StrBinaryOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    if (NumStrBinaryToBoolOp[operator]) {
      return BoolNode.create(
        NumStrBinaryToBoolOp[operator](this.get_value(), operand.get_value()),
        this.heap,
      )
    }
    throw Error('Invalid Operation')
  }
  override apply_unary(_operator: string): PrimitiveNode | ReferenceNode {
    if (_operator === 'address') {
      return ReferenceNode.create(this.addr, this.heap)
    }
    throw Error('Invalid Opeartion')
  }
}
export class StringListNode extends BaseNode {}

export class UnassignedNode extends BaseNode {
  static create(heap: Heap) {
    const addr = heap.allocate(1)
    heap.set_tag(addr, TAG.UNKNOWN)
    return new UnassignedNode(heap, addr)
  }
}
