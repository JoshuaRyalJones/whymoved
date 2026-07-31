import { describe, expect, it } from 'vitest'
import { computeContributions, holdingReturn, portfolioReturn } from '~/lib/attribution/returns'
import type { Position } from '~/lib/attribution/types'

const positions: Position[] = [
  { ticker: 'AAA', quantity: 10, priorPrice: 100, currentPrice: 110 }, // +10%, $1000 prior
  { ticker: 'BBB', quantity: 20, priorPrice: 50, currentPrice: 45 },   // -10%, $1000 prior
]

describe('holdingReturn', () => {
  it('computes a simple return', () => {
    expect(holdingReturn(100, 110)).toBeCloseTo(0.1, 10)
  })

  it('throws when the prior price is not positive', () => {
    expect(() => holdingReturn(0, 110)).toThrow('priorPrice must be positive')
  })
})

describe('computeContributions', () => {
  it('uses prior-day weights', () => {
    const [a, b] = computeContributions(positions)
    expect(a.priorWeight).toBeCloseTo(0.5, 10)
    expect(b.priorWeight).toBeCloseTo(0.5, 10)
  })

  it('computes dollar contributions from prior value', () => {
    const [a, b] = computeContributions(positions)
    expect(a.contributionDollars).toBeCloseTo(100, 10)
    expect(b.contributionDollars).toBeCloseTo(-100, 10)
  })

  it('returns an empty array for no positions', () => {
    expect(computeContributions([])).toEqual([])
  })

  it('throws when total prior value is zero', () => {
    const zero: Position[] = [{ ticker: 'ZZZ', quantity: 0, priorPrice: 10, currentPrice: 11 }]
    expect(() => computeContributions(zero)).toThrow('total prior value must be positive')
  })
})

describe('portfolioReturn', () => {
  it('sums contributions exactly to the portfolio return', () => {
    const contributions = computeContributions(positions)
    expect(portfolioReturn(contributions)).toBeCloseTo(0, 10)
  })

  it('matches a directly computed portfolio return', () => {
    const uneven: Position[] = [
      { ticker: 'AAA', quantity: 10, priorPrice: 100, currentPrice: 130 },
      { ticker: 'BBB', quantity: 5, priorPrice: 40, currentPrice: 38 },
    ]
    const priorTotal = 10 * 100 + 5 * 40
    const currentTotal = 10 * 130 + 5 * 38
    const expected = currentTotal / priorTotal - 1
    expect(portfolioReturn(computeContributions(uneven))).toBeCloseTo(expected, 10)
  })
})
