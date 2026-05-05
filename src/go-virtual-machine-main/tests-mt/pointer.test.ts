import { describe, expect, test } from 'vitest'

import { codeRunnerMT as codeRunner } from './utility'

const HEX_ADDR = /^0x[0-9a-f]{8}\n$/

describe('Pointer Tests', () => {
  test('Pointer to a struct that is declared as a struct works correctly', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        type P struct {
          x int
        }

        func main() {
            p := P{3}
            f := &p
            fmt.Println(*f)
        }
      `).output,
    ).toEqual('{3}\n')
  })

  test('Pointer to an array that is declared as an array works correctly', () => {
    expect(
      codeRunner(`
        package main
        import "fmt"

        func main() {
            p := [3]float64{3.5}
            f := &p
            fmt.Println(*f)
        }
      `).output,
    ).toEqual('[3.5 0 0]\n')
  })

  test('Getting pointer of variable works', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      a := 1
      fmt.Println(&a)
    }
    `
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    expect(codeRunner(code).output).toEqual('10\n20\n')
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
    expect(codeRunner(code).error?.type).toEqual('compile')
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
    expect(codeRunner(code).output).toEqual('1\n')
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
    expect(codeRunner(code).output).toEqual('1\n')
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
    expect(codeRunner(code).output).toEqual('1.5\n')
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
    expect(codeRunner(code).output).toEqual('true\n')
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
    expect(codeRunner(code).output).toEqual('abufe\n')
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
    expect(codeRunner(code).error?.type).toEqual('compile')
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
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    const output = codeRunner(code).output ?? ''
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^0x[0-9a-f]{8}$/)
    expect(lines[1]).toMatch(/^0x[0-9a-f]{8}$/)
    expect(lines[0]).not.toEqual(lines[1])
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
    expect(codeRunner(code).error?.type).toEqual('compile')
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
    const output = codeRunner(code).output ?? ''
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(4)
    for (const line of lines) {
      expect(line).toMatch(/^0x[0-9a-f]{8}$/)
    }
    // Addresses should be contiguous (4 bytes apart for int)
    const addrs = lines.map((l) => parseInt(l, 16))
    expect(addrs[1] - addrs[0]).toEqual(4)
    expect(addrs[2] - addrs[1]).toEqual(4)
    expect(addrs[3] - addrs[2]).toEqual(4)
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
    expect(codeRunner(code).output).toEqual('3\n4\n78\n6\n')
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
    expect(codeRunner(code).output).toEqual('&[3 4 5 6]\n')
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
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    expect(codeRunner(code).output).toEqual('&{E 12}\n')
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
    const output = codeRunner(code).output ?? ''
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^0x[0-9a-f]{8}$/)
    expect(lines[1]).toMatch(/^0x[0-9a-f]{8}$/)
    // Age field comes after Name (string=2 words), so offset = 2
    const addrName = parseInt(lines[0], 16)
    const addrAge = parseInt(lines[1], 16)
    expect(addrAge - addrName).toEqual(2)
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
    const output = codeRunner(code).output ?? ''
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(5)
    expect(lines[0]).toEqual('&{123 {E 23}}')
    expect(lines[1]).toMatch(/^0x[0-9a-f]{8}$/)
    expect(lines[2]).toEqual('&{E 23}')
    expect(lines[3]).toMatch(/^0x[0-9a-f]{8}$/)
    expect(lines[4]).toMatch(/^0x[0-9a-f]{8}$/)
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
    expect(codeRunner(code).output).toEqual('{345 {E 23}}\n')
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
    expect(codeRunner(code).output).toEqual('[4 345]\n')
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
    expect(codeRunner(code).output).toEqual('&{Alice 30}\n')
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
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
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
    expect(codeRunner(code).error?.type).toEqual('compile')
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
    expect(codeRunner(code).output).toEqual('&{Alice 30}\n')
  })

  test('Pointers of arrays are automatically dereferenced', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[2]int{3, 5}
      p[1] = 44
      fmt.Println(p)
      fmt.Println(*p)
    }
    `
    expect(codeRunner(code).output).toEqual('&[3 44]\n[3 44]\n')
  })

  test('Pointers of pointer of arrays work', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3]int{5, 6, 7}
      fmt.Println(&p)
    }
    `
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
  })

  test('Pointers of pointer of arrays are consistent', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3]string{"sv", "vr", "r5gjri"}
      q := &p
      (*q)[1] = "hello"
      fmt.Println(*q)
      r := &q
      fmt.Println(r)
      fmt.Println(*r)
      fmt.Println(**r)
      fmt.Println(***r)
      fmt.Println(q)
      fmt.Println(*q)
      fmt.Println(**q)
      fmt.Println(p)
      fmt.Println(*p)
    }
    `
    const output = codeRunner(code).output ?? ''
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(10)
    expect(lines[0]).toEqual('&[sv hello r5gjri]')
    expect(lines[1]).toMatch(/^0x[0-9a-f]{8}$/) // &r
    expect(lines[2]).toMatch(/^0x[0-9a-f]{8}$/) // *r = q address
    expect(lines[3]).toEqual('&[sv hello r5gjri]') // **r
    expect(lines[4]).toEqual('[sv hello r5gjri]') // ***r
    expect(lines[5]).toMatch(/^0x[0-9a-f]{8}$/) // q address
    expect(lines[6]).toEqual('&[sv hello r5gjri]') // *q
    expect(lines[7]).toEqual('[sv hello r5gjri]') // **q
    expect(lines[8]).toEqual('&[sv hello r5gjri]') // p
    expect(lines[9]).toEqual('[sv hello r5gjri]') // *p
  })

  test('Modifying fields of pointers of pointer of arrays should throw error', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3]string{"e", "h", "l"}
      q := &p
      q[0] = "bwjcbej"
    }
    `
    expect(codeRunner(code).error?.type).toEqual('compile')
  })

  test('Modifying elements of dereferenced pointers of pointer of arrays should work', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3]string{"sv", "vr", "r5gjri"}
      q := &p
      (*q)[1] = "hello"
      fmt.Println(*q)
    }
    `
    expect(codeRunner(code).output).toEqual('&[sv hello r5gjri]\n')
  })

  test('Pointers of 2D arrays are automatically dereferenced', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[2][3]int{{3, 4}, {5}}
      p[1][2] = 44
      fmt.Println(p)
      fmt.Println(*p)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '&[[3 4 0] [5 0 44]]\n[[3 4 0] [5 0 44]]\n',
    )
  })

  test('Pointers of pointer of 2D arrays work', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3][2]int{{5}, {6, 7}, {11, 8}}
      fmt.Println(&p)
    }
    `
    expect(codeRunner(code).output).toMatch(HEX_ADDR)
  })

  test('Modifying elements of dereferenced pointers of pointer of 2D arrays should work', () => {
    const code = `
    package main
    import "fmt"

    func main() {
      p := &[3][3]string{{"sv"}, {"vr", "he", "she"}, {"r5gjri"}}
      q := &p
      (*q)[1][2] = "hello"
      fmt.Println(*q)
    }
    `
    expect(codeRunner(code).output).toEqual(
      '&[[sv  ] [vr he hello] [r5gjri  ]]\n',
    )
  })
})
