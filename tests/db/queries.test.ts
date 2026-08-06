import { describe, expect, it } from 'vitest'
import { toAttributionRows } from '~/lib/db/queries'
import type { DailyResult } from '~/lib/pipeline/daily'

const result: DailyResult = {
  date: '2026-07-21',
  portfolioReturn: 0.012,
  llmCalls: 1,
  skipped: [],
  explanationFailures: [],
  holdings: [
    {
      ticker: 'BBB',
      benchmarkTicker: 'SPY',
      contribution: {
        ticker: 'BBB',
        holdingReturn: 0.06,
        priorWeight: 0.5,
        contributionDollars: 300,
        contributionReturn: 0.03,
      },
      classification: {
        label: 'idiosyncratic',
        zScore: 5,
        marketComponent: 0.01,
        residual: 0.05,
      },
      explanation: null,
      approximate: false,
    },
  ],
}

describe('toAttributionRows', () => {
  it('maps a pipeline result onto database column names', () => {
    const [row] = toAttributionRows('user-1', result)
    expect(row).toEqual({
      user_id: 'user-1',
      date: '2026-07-21',
      ticker: 'BBB',
      benchmark_ticker: 'SPY',
      weight: 0.5,
      return: 0.06,
      contribution: 300,
      market_component: 0.01,
      residual: 0.05,
      z_score: 5,
      label: 'idiosyncratic',
      approximate: false,
    })
  })

  it('persists the approximate flag rather than hardcoding it', () => {
    // The column exists so a degraded attribution is visible downstream and can
    // be excluded from eval. Always writing false would hide exactly that.
    const degraded: DailyResult = {
      ...result,
      holdings: [{ ...result.holdings[0], approximate: true }],
    }
    expect(toAttributionRows('user-1', degraded)[0].approximate).toBe(true)
  })

  it('produces one row per holding', () => {
    const twoHoldings: DailyResult = {
      ...result,
      holdings: [result.holdings[0], { ...result.holdings[0], ticker: 'CCC' }],
    }
    expect(toAttributionRows('user-1', twoHoldings)).toHaveLength(2)
  })
})
