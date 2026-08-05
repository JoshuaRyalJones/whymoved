import type { DailyResult } from '~/lib/pipeline/daily'
import { getServiceClient } from './client'

export interface AttributionRow {
  user_id: string
  date: string
  ticker: string
  benchmark_ticker: string
  weight: number
  return: number
  contribution: number
  market_component: number
  residual: number
  z_score: number
  label: string
  approximate: boolean
}

export function toAttributionRows(userId: string, result: DailyResult): AttributionRow[] {
  return result.holdings.map((h) => ({
    user_id: userId,
    date: result.date,
    ticker: h.ticker,
    benchmark_ticker: h.benchmarkTicker,
    weight: h.contribution.priorWeight,
    return: h.contribution.holdingReturn,
    contribution: h.contribution.contributionDollars,
    market_component: h.classification.marketComponent,
    residual: h.classification.residual,
    z_score: h.classification.zScore,
    label: h.classification.label,
    approximate: false,
  }))
}

export async function saveDailyResult(userId: string, result: DailyResult): Promise<void> {
  const db = getServiceClient()

  const { error } = await db.from('daily_attribution').upsert(toAttributionRows(userId, result))
  if (error) throw new Error(`failed to save attribution: ${error.message}`)

  for (const holding of result.holdings) {
    if (!holding.explanation) continue
    const { error: explanationError } = await db.from('explanations').upsert(
      {
        user_id: userId,
        date: result.date,
        ticker: holding.ticker,
        verdict: holding.explanation.verdict,
        summary: holding.explanation.summary,
        confidence: holding.explanation.confidence,
        model: 'claude-sonnet-5',
        prompt_version: 'v1',
      },
      { onConflict: 'user_id,date,ticker' },
    )
    if (explanationError) {
      throw new Error(`failed to save explanation: ${explanationError.message}`)
    }
  }
}
