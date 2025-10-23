export class BitMap {
  private bits: Uint8Array
  private word_size: number

  constructor(size: number, word_size = 4) {
    if (!Number.isInteger(Math.log(word_size) / Math.log(2)))
      throw Error('Word Size must be power of 2')
    this.word_size = word_size
    this.bits = new Uint8Array(size * word_size)
  }

  set_mark(addr: number, mark: boolean): void {
    const wordIndex = Math.floor(addr / this.word_size)
    this.bits[wordIndex] = mark ? 1 : 0
  }

  is_marked(addr: number): boolean {
    const wordIndex = Math.floor(addr / this.word_size)
    return this.bits[wordIndex] === 1
  }
}
