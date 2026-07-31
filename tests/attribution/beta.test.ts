import { describe, expect, it } from 'vitest'
import { computeBeta } from '~/lib/attribution/beta'

function seriesOfLength(n: number, fn: (i: number) => number): number[] {
  return Array.from({ length: n }, (_, i) => fn(i))
}

describe('computeBeta', () => {
  it('recovers a known beta from noiseless data', () => {
    const market = seriesOfLength(100, (i) => (i % 7) * 0.001 - 0.003)
    const asset = market.map((m) => 1.5 * m)
    const result = computeBeta(asset, market)
    expect(result.beta).toBeCloseTo(1.5, 8)
    expect(result.residualSigma).toBeCloseTo(0, 8)
    expect(result.lowConfidence).toBe(false)
    expect(result.observations).toBe(100)
  })

  it('reports a positive residual sigma when the asset deviates', () => {
    const market = seriesOfLength(100, (i) => (i % 5) * 0.002 - 0.004)
    const asset = market.map((m, i) => 1.0 * m + (i % 2 === 0 ? 0.01 : -0.01))
    const result = computeBeta(asset, market)
    expect(result.residualSigma).toBeGreaterThan(0)
  })

  it('falls back to beta 1 and low confidence below 60 observations', () => {
    const market = seriesOfLength(30, (i) => i * 0.0001)
    const asset = market.map((m) => 2 * m)
    const result = computeBeta(asset, market)
    expect(result.beta).toBe(1)
    expect(result.lowConfidence).toBe(true)
    expect(result.observations).toBe(30)
  })

  it('falls back to beta 1 when the market has zero variance', () => {
    const market = seriesOfLength(100, () => 0.001)
    const asset = seriesOfLength(100, (i) => i * 0.0001)
    const result = computeBeta(asset, market)
    expect(result.beta).toBe(1)
    expect(result.lowConfidence).toBe(true)
  })

  it('throws when the series lengths differ', () => {
    expect(() => computeBeta([0.1, 0.2], [0.1])).toThrow('series must be the same length')
  })
})
