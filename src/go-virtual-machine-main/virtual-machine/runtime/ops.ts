type AnyToBoolFunc = (
  x: number | string | boolean,
  y: number | string | boolean,
) => boolean
type BinaryOpToBoolType = Record<string, AnyToBoolFunc>

export const AnyBinaryToBoolOp: BinaryOpToBoolType = {
  equal: (x: number | string | boolean, y: number | string | boolean) =>
    x === y,
  not_equal: (x: number | string | boolean, y: number | string | boolean) =>
    x !== y,
}

type NumStrToBoolFunc = (x: number | string, y: number | string) => boolean
type NumStrBinaryOpToBoolType = Record<string, NumStrToBoolFunc>

export const NumStrBinaryToBoolOp: NumStrBinaryOpToBoolType = {
  less: (x: number | string, y: number | string) => x < y,
  less_or_equal: (x: number | string, y: number | string) => x <= y,
  greater: (x: number | string, y: number | string) => x > y,
  greater_or_equal: (x: number | string, y: number | string) => x >= y,
  ...AnyBinaryToBoolOp,
}

// ---------------- [ Number Ops] -------------------

type NumFunc = (x: number, y: number) => number
type NumBinaryOpType = Record<string, NumFunc>

export const NumBinaryOp: NumBinaryOpType = {
  sum: (x: number, y: number) => x + y,
  difference: (x: number, y: number) => x - y,
  bitwise_or: (x: number, y: number) => x | y,
  bitwise_xor: (x: number, y: number) => x ^ y,
  product: (x: number, y: number) => x * y,
  quotient: (x: number, y: number) => x / y,
  remainder: (x: number, y: number) => x % y,
  left_shift: (x: number, y: number) => x << y,
  right_shift: (x: number, y: number) => x >> y,
  bitwise_and: (x: number, y: number) => x & y,
  bit_clear: (x: number, y: number) => x & ~y,
}

// ---------------- [ Boolean Ops] -------------------

type BoolFunc = (x: boolean, y: boolean) => boolean
type BoolBinaryOpType = Record<string, BoolFunc>

export const BoolBinaryOp: BoolBinaryOpType = {
  conditional_or: (x: boolean, y: boolean) => x || y,
  conditional_and: (x: boolean, y: boolean) => x && y,
  ...AnyBinaryToBoolOp,
}

// ---------------- [ String Ops] -------------------

type StrFunc = (x: string, y: string) => string
type StrBinaryOpType = Record<string, StrFunc>

export const StrBinaryOp: StrBinaryOpType = {
  sum: (x: string, y: string) => x + y,
}

type NumUnaryOpFunc = (x: number) => number
type NumUnaryOpType = Record<string, NumUnaryOpFunc>

// NOTE: Leaving out "indirection", "address" and "receive" unary op to be implemented as an exception in executor
export const NumUnaryOp: NumUnaryOpType = {
  plus: (x: number) => x,
  negation: (x: number) => -x,
  bitwise_complement: (x: number) => ~x,
}

type BoolUnaryOpFunc = (x: boolean) => boolean
type BoolUnaryOpType = Record<string, BoolUnaryOpFunc>

export const BoolUnaryOp: BoolUnaryOpType = {
  not: (x: boolean) => !x,
}
