import { describe, expect, it } from 'vitest'
import { classifyMove } from '~/lib/attribution/classify'

const base = {
  marketReturn: 0.01,
  beta: 1,
  residualSigma: 0.01,
  lowConfidence: false,
}

describe('classifyMove', () => {
  it('labels a large residual as idiosyncratic', () => {
    const result = classifyMove({ ...base, holdingReturn: 0.06 }) // residual 0.05 => z 5
    expect(result.label).toBe('idiosyncratic')
    expect(result.zScore).toBeCloseTo(5, 10)
    expect(result.residual).toBeCloseTo(0.05, 10)
    expect(result.marketComponent).toBeCloseTo(0.01, 10)
  })

  it('labels a market-dominated move as moved_with_market', () => {
    const result = classifyMove({ ...base, holdingReturn: 0.012 }) // residual 0.002, market 0.01
    expect(result.label).toBe('moved_with_market')
  })

  it('labels a small residual-dominated move as normal_noise', () => {
    const result = classifyMove({ ...base, marketReturn: 0.001, holdingReturn: 0.009 })
    // market component 0.001, residual 0.008 => z 0.8, residual dominant
    expect(result.label).toBe('normal_noise')
  })

  it('never flags a low-confidence holding as idiosyncratic', () => {
    const result = classifyMove({ ...base, holdingReturn: 0.5, lowConfidence: true })
    expect(result.label).not.toBe('idiosyncratic')
  })

  it('respects a custom threshold', () => {
    const params = { ...base, holdingReturn: 0.035 } // residual 0.025 => z 2.5
    expect(classifyMove(params).label).toBe('idiosyncratic')
    expect(classifyMove({ ...params, threshold: 3 }).label).not.toBe('idiosyncratic')
  })

  it('treats a zero residual sigma as z of zero rather than dividing by zero', () => {
    const result = classifyMove({ ...base, residualSigma: 0, holdingReturn: 0.06 })
    expect(Number.isFinite(result.zScore)).toBe(true)
    expect(result.zScore).toBe(0)
    expect(result.label).not.toBe('idiosyncratic')
  })

  it('flags large negative residuals too', () => {
    const result = classifyMove({ ...base, holdingReturn: -0.04 }) // residual -0.05 => z -5
    expect(result.label).toBe('idiosyncratic')
    expect(result.zScore).toBeCloseTo(-5, 10)
  })
})
