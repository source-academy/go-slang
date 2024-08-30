const bytes_in_int = 4 // Number of bytes in int
const bits_in_byte = 8 // Number of bits in byte
const bits_in_int = bytes_in_int * bits_in_byte

export class Memory {
  array: ArrayBuffer
  view: DataView
  word_size: number
  /**
   * Constructor for memory
   * @param size Number of bytes in memory
   * @param word_size How many bytes in a word
   */
  constructor(size: number, word_size = 4) {
    if (!Number.isInteger(Math.log(word_size) / Math.log(2)))
      throw Error('Word Size must be power of 2')
    this.word_size = word_size
    this.array = new ArrayBuffer(size * word_size)
    this.view = new DataView(this.array)
  }

  check_valid(num_bits: number, bit_offset: number) {
    if (bit_offset >= bits_in_int || num_bits < 0 || bit_offset < 0)
      throw Error('Invalid number of bits')
  }

  /**
   * @param addr Starting Byte of the Memory
   * @param num_bits Number of bits to retrieve
   * @param bit_offset Bit offset within the byte ([0 - 31]: Defaults to 0)
   * @returns Number which is the value at the requested position
   */
  get_bits(addr: number, num_bits: number, bit_offset = 0) {
    this.check_valid(num_bits, bit_offset)
    let val = 0
    let carry = 1
    while (num_bits > 0) {
      const effective_bits = Math.min(num_bits, bits_in_int - bit_offset)
      const mask = (2 ** num_bits - 1) * 2 ** bit_offset
      val +=
        Math.floor(
          ((mask & this.view.getUint32(addr * 4)) >>> 0) / 2 ** bit_offset,
        ) * carry
      carry *= 2 ** effective_bits
      bit_offset = 0
      num_bits -= effective_bits
      addr += 1
    }
    return val
  }

  /**
   * @param val Value to update
   * @param addr Starting Word of the Memory
   * @param num_bits Number of bits to retrieve
   * @param bit_offset Bit offset within the byte ([0 - 31]: Defaults to 0)
   */
  set_bits(val: number, addr: number, num_bits: number, bit_offset = 0) {
    this.check_valid(num_bits, bit_offset)
    while (num_bits > 0) {
      const effective_bits = Math.min(num_bits, bits_in_int - bit_offset)
      const mask = ~((2 ** effective_bits - 1) * 2 ** bit_offset)
      const val_mask =
        ((2 ** num_bits - 1) & val % 2 ** effective_bits) * 2 ** bit_offset
      const temp_val = (this.view.getUint32(addr * 4) & mask) | val_mask
      this.view.setUint32(addr * 4, temp_val)
      bit_offset = 0
      val = Math.floor(val / 2 ** effective_bits)
      num_bits -= effective_bits
      addr += 1
    }
  }

  /**
   * @param val Value to update
   * @param addr Starting Word
   * @param num_of_bytes Number of bytes to modify
   */
  set_bytes(val: number, addr: number, num_of_bytes: number, bytes_offset = 0) {
    this.set_bits(
      val,
      addr,
      bits_in_byte * num_of_bytes,
      bytes_offset * bits_in_byte,
    )
  }

  /**
   * @param addr Starting Word
   * @param num_of_bytes Number of bytes to retrieve
   */
  get_bytes(addr: number, num_of_bytes: number, bytes_offset = 0) {
    return this.get_bits(
      addr,
      bits_in_byte * num_of_bytes,
      bytes_offset * bits_in_byte,
    )
  }

  /**
   * @param val Value to update
   * @param addr Starting word index
   */
  set_word(val: number, addr: number) {
    this.view.setInt32(addr * 4, val >>> 0)
  }

  /**
   * @param addr Starting word index
   */
  get_word(addr: number) {
    return this.view.getInt32(addr * 4)
  }

  /**
   * Print out Heap
   */
  print() {
    let heap_str = ''
    const idx_max_len = this.view.byteLength / 4
    for (let i = 0; i < this.view.byteLength; i += 4) {
      let str = (this.view.getUint32(i) >>> 0).toString(2)
      if (str.length < bits_in_byte * bytes_in_int) {
        str = '0'.repeat(bits_in_byte * bytes_in_int - str.length) + str
      }
      let idx_str = (i / 4).toString()
      if (idx_str.length < idx_max_len) {
        idx_str = ' '.repeat(idx_max_len - idx_str.length) + idx_str
      }

      heap_str += idx_str + ': ' + str + '\n'
    }
    console.log(heap_str)
  }

  get_number(addr: number) {
    return this.view.getInt32(addr * this.word_size)
  }

  set_number(val: number, addr: number) {
    return this.view.setInt32(addr * this.word_size, val)
  }

  get_float(addr: number) {
    return this.view.getFloat32(addr * this.word_size)
  }

  set_float(val: number, addr: number) {
    return this.view.setFloat32(addr * this.word_size, val)
  }
}
