# go-slang

This is an implementation of the language Go, which uses a Virtual Machine architecture and is written in TypeScript.

The virtual machine is used to run programs written in Go. The basic implementation was written by Teow Hua Jun and Lim An Jun and the source code can be found [here](https://github.com/huajun07/go-virtual-machine).

After which, this project is further enhanced by bringing in more features.

## Usage

To begin, we need to install the package manager `yarn`, which can be installed using another package manager `npm`.

```sh
npm install yarn
```

After which, we use `yarn install` to install the dependencies used by this repository.

```sh
yarn install
```

For testing, we can use `yarn test` to run all the test cases.

```sh
yarn test
```

To run a specific test file, we use `yarn test <fileName>`, where the test file must be named as: `<fileName>.test.ts`. For example, to run `unsafe.test.ts`, we use `yarn test unsafe`. This will also work for new test files, so long as the test file is named correctly.

```sh
yarn test unsafe
```

To run tests with coverage, we use `yarn coverage`. This will display the test coverage (statement coverage, line coverage, branch coverage and function coverage) after running all tests.

For visualisation, we can use `yarn local` to run the program locally. This lets us visualise the program that is to be written in Go to let us see how the program is executed. However, this only works when the program does not run into any errors.

```sh
yarn local
```

Lastly, to build the project, we use `yarn build`.

```sh
yarn build
```

## Major architectures

This virtual machine is based on the [Go Language Specification](https://go.dev/ref/spec). It ensures that the implementation can support the notations stated in the specification, which is used by the actual language.

To parse the user program written in Go into the virtual machine, [PeggyJS](https://peggyjs.org/) is used. The user program is first parsed into an Abstract Syntax Tree (AST) using PeggyJS, then it is compiled into virtual machine instructions, which are then executed by the runtime system of the virtual machine.

The runtime system primarily operates on Nodes (not to be confused with NodeJS), which are the objects recognised by the runtime system to load data stored on the heap. The base class is called BaseNode instead of Node as a result (Node class actually refers to NodeJS, which is not what it is supposed to be). These objects are basically pointers by themselves.

## Newly added features

Compared to the previous version, new features of the language are added. This includes:

- Functions being able to return multiple values at once without needing to wrap them into a data structure
- Structs
- Pointers (including the `unsafe` package)

There are also fundamental changes implemented, such as:

- Ensuring contiguous memory for arrays and structs
- Deepcopy for arrays and structs being passed by value into other functions
- Deepcopy for variables being passed into goroutines

More features will be implemented as time passes.

## Additional Resources on Go

We recommend the [Tour of Go](https://go.dev/tour/welcome/1), which is written by the developers of the language themselves. It introduces the various elements of the programming language as well as their syntaxes, as the syntaxes may differ quite greatly from other programming languages.

For further exploration, we can download the language Go itself [here](https://go.dev/doc/install).

## Notes to self

### Heap

Heap class stores the following
- Memory: Array of 8 byte words
- Size: Total number of words in memory
- Unassigned: Unassigned memory
- Freelist: List of linked lists storing free blocks at that size
- Max Level: Largest block size power of 2 supported
- Temp roots: Temporary stack of root references
- Contexts: Queue to schedule execution contexts
- Blocked Contexts: Linked list of blocked execution contexts
- Mem Left: Tracks remaining memory
- Temp: Temp register to hold an address
- Debugger: Determine if debugger is activated

Addr stores the following
- Free Node: [1 bit free bit] [5 bits Level data] [29 bits Prev Node] [29 bits Next Node]
- Not-Free Node: [1 bit free bit] [5 bits Level data] [1 bit Mark & Sweep] [1 Byte Type Tag] [2 Bytes Payload - Depends on type]