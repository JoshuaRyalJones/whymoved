import { describe, expect, it } from 'vitest'
import { computeMetrics, type EvalRecord } from '~/lib/eval/metrics'

const records: EvalRecord[] = [
  { label: 'moved_with_market', verdict: null, citationsValid: null, rating: null },
  { label: 'normal_noise', verdict: null, citationsValid: null, rating: null },
  { label: 'idiosyncratic', verdict: 'explained', citationsValid: true, rating: 'correct' },
  { label: 'idiosyncratic', verdict: 'no_driver', citationsValid: true, rating: null },
  { label: 'idiosyncratic', verdict: 'explained', citationsValid: true, rating: 'wrong' },
]

describe('computeMetrics', () => {
  it('counts total holding-days', () => {
    expect(computeMetrics(records).totalHoldingDays).toBe(5)
  })

  it('computes the flag rate against all holding-days', () => {
    expect(computeMetrics(records).flagRate).toBeCloseTo(3 / 5, 10)
  })

  it('computes the no_driver rate among flagged holdings only', () => {
    expect(computeMetrics(records).noDriverRate).toBeCloseTo(1 / 3, 10)
  })

  it('computes citation validity across explanations that cited anything', () => {
    expect(computeMetrics(records).citationValidityRate).toBe(1)
  })

  it('computes rated accuracy over rated explanations only', () => {
    const metrics = computeMetrics(records)
    expect(metrics.ratedSample).toBe(2)
    expect(metrics.ratedAccuracy).toBeCloseTo(0.5, 10)
  })

  it('reports zero rates rather than NaN for an empty input', () => {
    const metrics = computeMetrics([])
    expect(metrics.flagRate).toBe(0)
    expect(metrics.noDriverRate).toBe(0)
    expect(metrics.ratedAccuracy).toBe(0)
  })
})
