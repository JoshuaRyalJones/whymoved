import { computeBeta } from '~/lib/attribution/beta'
import { benchmarkFor } from '~/lib/attribution/benchmark'
import { classifyMove, DEFAULT_Z_THRESHOLD } from '~/lib/attribution/classify'
import { computeContributions, portfolioReturn } from '~/lib/attribution/returns'
import type { Classification, Contribution, Position } from '~/lib/attribution/types'
import { toDailyReturns, type DailyPrice } from '~/lib/data/tiingo'
import type { Article, Explanation } from '~/lib/explain/types'
import type { Holding } from '~/lib/sources/types'

export interface HoldingResult {
  ticker: string
  benchmarkTicker: string
  contribution: Contribution
  classification: Classification
  explanation: Explanation | null
}

export interface DailyResult {
  date: string
  portfolioReturn: number
  holdings: HoldingResult[]
  llmCalls: number
}

export interface DailyPipelineParams {
  date: string
  holdings: Holding[]
  fetchPrices: (ticker: string) => Promise<DailyPrice[]>
  fetchNews: (ticker: string, from: string, to: string) => Promise<Article[]>
  explain: (params: {
    ticker: string
    date: string
    residual: number
    zScore: number
    articles: Article[]
  }) => Promise<Explanation>
  threshold?: number
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export async function runDailyPipeline(params: DailyPipelineParams): Promise<DailyResult> {
  const threshold =
    params.threshold ?? Number(process.env.IDIOSYNCRATIC_Z_THRESHOLD ?? DEFAULT_Z_THRESHOLD)

  // Fetch each distinct benchmark once, not once per holding.
  const benchmarkReturns = new Map<string, number[]>()
  for (const ticker of new Set(params.holdings.map(benchmarkFor))) {
    const prices = await params.fetchPrices(ticker)
    if (prices.length < 2) throw new Error(`no price history for benchmark ${ticker}`)
    benchmarkReturns.set(ticker, toDailyReturns(prices))
  }

  const priced: { holding: Holding; prices: DailyPrice[] }[] = []
  for (const holding of params.holdings) {
    const prices = await params.fetchPrices(holding.ticker)
    if (prices.length >= 2) priced.push({ holding, prices })
  }

  const positions: Position[] = priced.map(({ holding, prices }) => ({
    ticker: holding.ticker,
    quantity: holding.quantity,
    priorPrice: prices[prices.length - 2].adjClose,
    currentPrice: prices[prices.length - 1].adjClose,
  }))

  const contributions = computeContributions(positions)

  const results: HoldingResult[] = []
  let llmCalls = 0

  for (let i = 0; i < priced.length; i++) {
    const { holding, prices } = priced[i]
    const contribution = contributions[i]

    const benchmarkTicker = benchmarkFor(holding)
    const marketReturns = benchmarkReturns.get(benchmarkTicker)!
    const marketReturnToday = marketReturns[marketReturns.length - 1]

    const assetReturns = toDailyReturns(prices)
    const overlap = Math.min(assetReturns.length, marketReturns.length)

    // Estimate beta and residual sigma from history that EXCLUDES the day being
    // classified. Including today would let an unusual move inflate the very
    // baseline it is measured against, suppressing its own z-score.
    const { beta, residualSigma, lowConfidence } = computeBeta(
      assetReturns.slice(-overlap, -1),
      marketReturns.slice(-overlap, -1),
    )

    const classification = classifyMove({
      holdingReturn: contribution.holdingReturn,
      marketReturn: marketReturnToday,
      beta,
      residualSigma,
      lowConfidence,
      threshold,
    })

    let explanation: Explanation | null = null
    if (classification.label === 'idiosyncratic') {
      const articles = await params.fetchNews(
        contribution.ticker,
        daysBefore(params.date, 2),
        params.date,
      )
      explanation = await params.explain({
        ticker: contribution.ticker,
        date: params.date,
        residual: classification.residual,
        zScore: classification.zScore,
        articles,
      })
      llmCalls++
    }

    results.push({
      ticker: contribution.ticker,
      benchmarkTicker,
      contribution,
      classification,
      explanation,
    })
  }

  return {
    date: params.date,
    portfolioReturn: portfolioReturn(contributions),
    holdings: results,
    llmCalls,
  }
}
