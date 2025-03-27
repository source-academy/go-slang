import { describe, expect, test } from 'vitest'

import { codeRunner, mainRunner } from './utility'

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
    expect(codeRunner(code).error?.type).toEqual(
      'compile',
    )
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
    expect(codeRunner(code).output).toEqual(
      '4\n',
    )
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
    expect(codeRunner(code).error?.type).toEqual(
      'runtime',
    )
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
    expect(codeRunner(code).output).toEqual(
      '2\n',
    )
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
    expect(codeRunner(code).output).toEqual(
      '2\n',
    )
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
    expect(codeRunner(code).error?.type).toEqual(
      'runtime',
    )
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
    expect(codeRunner(code).output).toEqual(
      '4\n',
    )
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
    expect(codeRunner(code).output).toEqual(
      '4\n6\n11\n',
    )
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
    expect(codeRunner(code).error?.type).toEqual(
      'runtime',
    )
  })
})
