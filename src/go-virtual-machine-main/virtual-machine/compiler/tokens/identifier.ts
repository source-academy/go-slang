import { Compiler } from '../../executor'
import { LoadVariableInstruction } from '../../executor/instructions'
import { Type } from '../../executor/typing'
import { PackageType } from '../../executor/typing/package_type'

import { Token, TokenLocation } from './base'

export class IdentifierToken extends Token {
  constructor(sourceLocation: TokenLocation, public identifier: string) {
    super('identifier', sourceLocation)
  }

  static isValidIdentifier(identifier: string): boolean {
    const reservedKeywords = [
      'break',
      'case',
      'chan',
      'const',
      'continue',
      'default',
      'defer',
      'else',
      'fallthrough',
      'for',
      'func',
      'go',
      'goto',
      'if',
      'import',
      'interface',
      'map',
      'package',
      'range',
      'return',
      'select',
      'struct',
      'switch',
      'type',
      'var',
    ]
    return !reservedKeywords.includes(identifier)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const [frame_idx, var_idx] = compiler.context.env.find_var(this.identifier)
    this.pushInstruction(
      compiler,
      new LoadVariableInstruction(frame_idx, var_idx, this.identifier),
    )
    return compiler.type_environment.get(this.identifier)
  }
}

/**
 * Note that qualified identifiers in our implementation are only used for types,
 * as our parser cannot distinguish `package.identifier` from `variable.field`,
 * hence all values (not types) of the form `x.y` are handled by selector operator instead.
 */
export class QualifiedIdentifierToken extends Token {
  constructor(
    sourceLocation: TokenLocation,
    public pkg: string,
    public identifier: string,
  ) {
    super('qualified_identifier', sourceLocation)
  }

  override compileUnchecked(compiler: Compiler): Type {
    const pkg = compiler.type_environment.get(this.pkg)
    if (!(pkg instanceof PackageType)) {
      throw new Error(`${this} is not a type`)
    }
    return pkg.select(this.identifier)
  }

  override toString(): string {
    return `${this.pkg}.${this.identifier}`
  }
}
