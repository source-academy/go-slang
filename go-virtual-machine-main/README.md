# Go-Virtual-Machine

Concurrent Virtual Machine for Go

## Introduction

This repository contains the following systems and services:

- [frontend](https://github.com/huajun07/go-virtual-machine/tree/main/src/frontend) - web interface for user to enter their code and observe the output and return values
- [virtual-machine](https://github.com/huajun07/go-virtual-machine/tree/main/src/virtual-machine) - Implementation of concurrrent virtual machine for Go

## Setting Up

### Dependencies (macOS)

You will need `npm` and `node` to install the dependencies.

```sh
brew install nvm
```

At the point of writing, `go-virtual-machine` uses `node v16.18.0`. We can run `nvm install` and `.nvmrc` will inform `nvm` with the appropriate version to install.

```sh
$ nvm install
$ node --version
# v16.18.0
```

We can now install the necessary dependencies.

```sh
# Install dependencies
$ npm install
```

# Local Development

## Run

```sh
$ npm run dev
```

## Testing

```sh
$ npm run test
```

# Deployment

Deploy by running

```sh
$ npm run deploy
```

## Code Tools

```sh
# Linting
$ npm run lint
```
