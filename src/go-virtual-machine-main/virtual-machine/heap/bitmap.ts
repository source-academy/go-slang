export class BitMap {
  array: SharedArrayBuffer
  word_size: number
  i32: Int32Array

  constructor(sab: SharedArrayBuffer, word_size = 4) {
    if (!Number.isInteger(Math.log(word_size) / Math.log(2)))
      throw Error('Word Size must be power of 2')
    this.word_size = word_size
    this.array = sab
    this.i32 = new Int32Array(this.array)
  }

  static create(size: number, word_size = 4) {
    const sab = new SharedArrayBuffer(size * word_size)
    return new BitMap(sab, word_size)
  }

  static load(sab: SharedArrayBuffer, word_size = 4) {
    return new BitMap(sab, word_size)
  }

  set_mark(addr: number, mark: boolean): void {
    Atomics.store(this.i32, addr, mark ? 1 : 0)
  }

  is_marked(addr: number): boolean {
    return Atomics.load(this.i32, addr) === 1
  }
}
