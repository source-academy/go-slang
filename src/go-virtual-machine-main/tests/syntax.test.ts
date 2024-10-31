import { describe, expect, test } from "vitest"

import { mainRunner } from "./utility"

describe('Slice Type Checking', () => {
    test('Slice literal must have the same type as the declared type.', () => {
      expect(
        mainRunner('var a []int = []int{1, "wrong type", 3}').error?.message,
      ).toEqual('Cannot use string as int64 value in slice literal.')
    })
})