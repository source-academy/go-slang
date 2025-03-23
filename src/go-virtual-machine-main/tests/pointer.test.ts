import { describe, expect, test } from 'vitest'

import { codeRunner } from './utility'

describe('Pointer Tests', () => {
  test('Getting pointer of variable works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000074\n',
    )
  })

  test('Shorthand declaration for pointer works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      x := 42
      p := &x
      fmt.Println(p)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000074\n',
    )
  })

  test('Modifying value of dereferenced pointer works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      x := 10
      p := &x  
      fmt.Println(*p)
      *p = 20
      fmt.Println(x)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '10\n20\n',
    )
  })

  test('Dereferencing a variable should throw error', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(*a)
    }
    `
    expect(codeRunner(code).error?.type).toEqual(
      'compile',
    )
  })

  test('Dereferencing of a pointer works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(*(&a))
    }
    `
    expect(codeRunner(code).output).toEqual(
      '1\n',
    )
  })

  test('Dereferencing of a pointer works together without brackets', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(*&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '1\n',
    )
  })

  test('Dereferencing of a pointer works together without brackets on float', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1.5
      fmt.Println(*&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '1.5\n',
    )
  })

  test('Dereferencing of a pointer works together without brackets on bool', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := true
      fmt.Println(*&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      'true\n',
    )
  })

  test('Dereferencing of a pointer works together without brackets on string', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := "abufe"
      fmt.Println(*&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      'abufe\n',
    )
  })

  test('Getting a pointer of a pointer should throw error', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(&(&a))
    }
    `
    expect(codeRunner(code).error?.type).toEqual(
      'compile',
    )
  })

  test('Getting a pointer of a pointer stored as a variable should work', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      b := &a
      fmt.Println(&b)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000078\n',
    )
  })

  test('Pointer Type works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A *int
      b := 1
      var a A = &b
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000074\n',
    )
  })

  test('Reassignment of pointers of declared pointer type works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      type A *B
      var b B = 1
      var c B = 2
      var a A = &b
      fmt.Println(a)
      a = &c
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000074\n0x00000078\n',
    )
  })

  test(`Reassignment of pointers of declared pointer type should
    throw error if the base types are different`, () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type B int
      type A *B
      var b B = 1
      var c int = 2
      var a A = &b
      a = &c
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).error?.type).toEqual(
      'compile',
    )
  })

  test('Obtaining pointer of array elements works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := [4]int{3, 4, 5, 6}
      a[2] = 78
      fmt.Println(&a[0])
      fmt.Println(&a[1])
      fmt.Println(&a[2])
      fmt.Println(&a[3])
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000080\n0x00000084\n0x00000088\n0x0000008c\n',
    )
  })

  test('Obtaining values from pointer of array elements works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := [4]int{3, 4, 5, 6}
      a[2] = 78
      fmt.Println(*&a[0])
      fmt.Println(*&a[1])
      fmt.Println(*&a[2])
      fmt.Println(*&a[3])
    }
    `
    expect(codeRunner(code).output).toEqual(
      '3\n4\n78\n6\n',
    )
  })

  test('Obtaining pointer of array works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := [4]int{3, 4, 5, 6}
      fmt.Println(&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '&[3 4 5 6]\n',
    )
  })

  test('Obtaining pointer of declared type primitive works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A int
      var a A = 3
      fmt.Println(&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000074\n',
    )
  })

  test('Obtaining pointer of declared struct works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A struct {
        Name string
        Age int
      }
      a := A{"E", 12}
      fmt.Println(&a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '&{E 12}\n',
    )
  })

  test('Obtaining pointer of declared struct fields works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A struct {
        Name string
        Age int
      }
      a := A{"E", 12}
      fmt.Println(&a.Name)
      fmt.Println(&a.Age)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '0x00000078\n0x0000007a\n',
    )
  })

  test('Obtaining pointer of declared struct fields of nested structs works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A struct {
        Name string
        Age int
      }

      type B struct {
        Code int
        Person A
      }
      a := B{123, A{"E", 23}}
      fmt.Println(&a)
      fmt.Println(&a.Code)
      fmt.Println(&a.Person)
      fmt.Println(&a.Person.Name)
      fmt.Println(&a.Person.Age)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '&{123 {E 23}}\n0x00000080\n&{E 23}\n0x00000084\n0x00000086\n',
    )
  })

  test('Obtaining values of pointers of declared struct fields of nested structs works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      type A struct {
        Name string
        Age int
      }

      type B struct {
        Code int
        Person A
      }
      a := B{123, A{"E", 23}}
      fmt.Println(*&a)
      fmt.Println(*&a.Code)
      fmt.Println(*&a.Person)
      fmt.Println(*&a.Person.Name)
      fmt.Println(*&a.Person.Age)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '{123 {E 23}}\n123\n{E 23}\nE\n23\n',
    )
  })

  test('Passing pointers into functions should mutate structs', () => {
    const code = `
    package main
    import "fmt"

    type A struct {
      Name string
      Age int
    }

    type B struct {
      Code int
      Person A
    }

    func help(b *B) {
      b.Code = 345
    }

    func main() {
      a := B{123, A{"E", 23}}
      help(&a)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '{345 {E 23}}\n',
    )
  })

  test('Passing pointers into functions should mutate arrays', () => {
    const code = `
    package main
    import "fmt"

    func help(b *[2]int) {
      b[1] = 345
    }

    func main() {
      a := [2]int{4, 5}
      help(&a)
      fmt.Println(a)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '[4 345]\n',
    )
  })

  test('Pointers of structs are automatically dereferenced', () => {
    const code = `
    package main
    import "fmt"

    type Person struct {
      Name string
      Age int
    }

    func main() {
      p := &Person{Name: "Alice", Age: 25}
      p.Age = 30
      fmt.Println(p)
    }
    ` 
    expect(codeRunner(code).output).toEqual(
      '&{Alice 30}\n',
    )
  })

  test('Pointers of pointer of structs work', () => {
    const code = `
    package main
    import "fmt"

    type Person struct {
      Name string
      Age int
    }

    func main() {
      p := &Person{Name: "Alice", Age: 25}
      p.Age = 30
      fmt.Println(&p)
    }
    ` 
    expect(codeRunner(code).output).toEqual(
      '0x00000072\n',
    )
  })

  test('Modifying fields of pointers of pointer of structs should throw error', () => {
    const code = `
    package main
    import "fmt"

    type Person struct {
      Name string
      Age int
    }

    func main() {
      p := &Person{Name: "Alice", Age: 25}
      q := &p
      q.Age = 30
    }
    ` 
    expect(codeRunner(code).error?.type).toEqual(
      'compile',
    )
  })

  test('Modifying fields of dereferenced pointers of pointer of structs should work', () => {
    const code = `
    package main
    import "fmt"

    type Person struct {
      Name string
      Age int
    }

    func main() {
      p := &Person{Name: "Alice", Age: 25}
      q := &p
      (*q).Age = 30
      fmt.Println(*q)
    }
    ` 
    expect(codeRunner(code).output).toEqual(
      '&{Alice 30}\n',
    )
  })
})
