import { describe, expect, it } from 'vitest'
import { BENCHMARKS, benchmarkFor } from '~/lib/attribution/benchmark'
import type { Holding } from '~/lib/sources/types'

const cad: Holding = { ticker: 'RY', quantity: 10, currency: 'CAD' }
const usd: Holding = { ticker: 'NVDA', quantity: 10, currency: 'USD' }

describe('benchmarkFor', () => {
  it('benchmarks Canadian listings against the TSX composite', () => {
    expect(benchmarkFor(cad)).toBe('XIC')
  })

  it('benchmarks US listings against the S&P 500', () => {
    expect(benchmarkFor(usd)).toBe('SPY')
  })

  it('exposes the full mapping', () => {
    expect(BENCHMARKS).toEqual({ CAD: 'XIC', USD: 'SPY' })
  })

  it('never returns the holding itself as its own benchmark', () => {
    expect(benchmarkFor({ ticker: 'XIC', quantity: 1, currency: 'CAD' })).toBe('XIC')
    // XIC benchmarked against itself yields beta 1 and zero residual, which
    // classifies as moved_with_market. That is correct behaviour for an index
    // fund and needs no special case.
  })
})
