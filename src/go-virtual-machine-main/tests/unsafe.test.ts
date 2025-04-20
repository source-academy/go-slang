import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Unsafe Package Checking', () => {
  test('Unsafe package method should fail if unsafe package is not imported', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := 1
      fmt.Println(unsafe.Alignof(p))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Alignof works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 1
      fmt.Println(unsafe.Alignof(p))
    }
    `
    expect(codeRunner(code).output).toEqual('4\n')
  })

  test('Alignof throws error if not 1 argument is supplied', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 1
      fmt.Println(unsafe.Alignof(p, p))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Offsetof works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    type A struct {
      Name string
      Age int
    }

    func main() {
      p := A{"E", 21}
      fmt.Println(unsafe.Offsetof(p.Age))
    }
    `
    expect(codeRunner(code).output).toEqual('2\n')
  })

  test('Offsetof works correctly on nested structs', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    type A struct {
      Name string
      Age int
    }

    type B struct {
      Phone int
      Person A
      Male bool
    }

    func main() {
      p := B{123, A{"HE", 32}, true}
      fmt.Println(unsafe.Offsetof(p.Person.Age))
    }
    `
    expect(codeRunner(code).output).toEqual('2\n')
  })

  test('Offsetof throws error if not 1 argument is supplied', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 1
      fmt.Println(unsafe.Offsetof(p, p))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Offsetof throws error if argument supplied is not a struct field', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 10
      fmt.Println(unsafe.Offsetof(p))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Sizeof works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    type A struct {
      Name string
      Age int
    }

    func main() {
      p := A{"E", 21}
      fmt.Println(unsafe.Sizeof(p.Age))
    }
    `
    expect(codeRunner(code).output).toEqual('4\n')
  })

  test('Sizeof works correctly on nested structs', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    type A struct {
      Name string
      Age int
    }

    type B struct {
      Phone int
      Person A
      Male bool
    }

    func main() {
      p := B{123, A{"HE", 32}, true}
      fmt.Println(unsafe.Sizeof(p.Person.Age))
      fmt.Println(unsafe.Sizeof(p.Person))
      fmt.Println(unsafe.Sizeof(p))
    }
    `
    expect(codeRunner(code).output).toEqual('4\n6\n11\n')
  })

  test('Sizeof throws error if not 1 argument is supplied', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 1
      fmt.Println(unsafe.Sizeof(p, p))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Add works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    type A struct {
      Name string
      Age int
    }

    func main() {
      p := A{"E", 21}
      q := &p
      fmt.Println(&q)
      fmt.Println(unsafe.Add(&q, 2))
    }
    `
    expect(codeRunner(code).output).toEqual('0x0000008c\n0x0000008e\n')
  })

  test('Add throws error if arguments are of the wrong types', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 1
      fmt.Println(unsafe.Add(p, 3)) // p is not a pointer
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('StringData works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := "abc" // StringNode tied to variable p
      q := unsafe.StringData(p) // Pointer to StringListNode tied to the bytes itself
      fmt.Println(&p) // Pointer to StringNode / variable p
      fmt.Println(q) // Pointer to StringListNode tied to the bytes itself
    }
    `
    expect(codeRunner(code).output).toEqual('0x00000072\n0x0000008a\n')
  })

  test('StringData throws error if not string', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := 3
      q := unsafe.StringData(p)
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('String works correctly', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := "abcevrfbvr" // StringNode tied to variable p
      q := unsafe.StringData(p) // Pointer to StringListNode tied to the bytes itself
      fmt.Println(unsafe.String(q, 4))
    }
    `
    expect(codeRunner(code).output).toEqual('abce\n')
  })

  test('String throws error if wrong arguments are supplied', () => {
    const code = `
    package main
    import "fmt"
    import "unsafe"

    func main() {
      p := "abcevrfbvr" // StringNode tied to variable p
      q := unsafe.StringData(p) // Pointer to StringListNode tied to the bytes itself
      fmt.Println(unsafe.String(p, 4))
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })
})
