import { ReturnType } from './return_type'
import { Type } from '.'

export class TypeEnvironment {
  parent?: TypeEnvironment
  typings: Record<string, Type>
  expectedReturn: ReturnType

  constructor(parent?: TypeEnvironment) {
    this.parent = parent
    this.typings = {}
    this.expectedReturn = parent?.expectedReturn ?? new ReturnType([])
  }

  addType(name: string, type: Type) {
    this.typings[name] = type
  }

  /** Returns an extended type environment. */
  extend(): TypeEnvironment {
    const newTypeEnvironment = new TypeEnvironment(this)
    return newTypeEnvironment
  }

  pop(): TypeEnvironment {
    if (!this.parent) {
      throw Error('Type environment stack is empty when popped.')
    }
    return this.parent
  }

  /** Returns the type of the variable with the given name. */
  get(name: string): Type {
    if (name in this.typings) {
      return this.typings[name]
    }
    if (this.parent === undefined) {
      throw Error(`Variable ${name} not found`)
    }
    return this.parent.get(name)
  }

  updateReturnType(newType: ReturnType) {
    this.expectedReturn = newType
  }
}
