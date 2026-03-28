export class Freelist {
    array: SharedArrayBuffer
    word_size: number
    length: number
    i32: Int32Array

    constructor(sab: SharedArrayBuffer, word_size = 4) {
        if (!Number.isInteger(Math.log(word_size) / Math.log(2)))
            throw Error('Word Size must be power of 2')
        this.word_size = word_size
        this.length = sab.byteLength / word_size
        this.array = sab
        this.i32 = new Int32Array(this.array)
    }

    static create(max_level: number, word_size = 4) {
        const sab = new SharedArrayBuffer(max_level * word_size)
        const freelist = new Freelist(sab, word_size)
        for (let i = 0; i < max_level; i++) freelist.set_value(i, -1)
        return freelist
    }

    static load(sab: SharedArrayBuffer, word_size = 4) {
        return new Freelist(sab, word_size)
    }

    get_value(lvl: number) {
        return Atomics.load(this.i32, lvl)
    }

    set_value(lvl: number, val: number) {
        Atomics.store(this.i32, lvl, val | 0)
    }
}