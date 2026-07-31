import { describe, expect, it } from 'vitest'
import type { Position } from '~/lib/attribution/types'

describe('toolchain', () => {
  it('resolves the ~ alias and compiles types', () => {
    const p: Position = { ticker: 'SHOP', quantity: 10, priorPrice: 100, currentPrice: 110 }
    expect(p.ticker).toBe('SHOP')
  })
})
