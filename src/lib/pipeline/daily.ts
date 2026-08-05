import { computeBeta, MIN_OBSERVATIONS } from '~/lib/attribution/beta'
import { benchmarkFor } from '~/lib/attribution/benchmark'
import { classifyMove, DEFAULT_Z_THRESHOLD } from '~/lib/attribution/classify'
import { computeContributions, portfolioReturn } from '~/lib/attribution/returns'
import type { Classification, Contribution, Position } from '~/lib/attribution/types'
import { toDatedReturns, type DailyPrice } from '~/lib/data/tiingo'
import type { Article, Explanation } from '~/lib/explain/types'
import type { Holding } from '~/lib/sources/types'

export interface HoldingResult {
  ticker: string
  benchmarkTicker: string
  contribution: Contribution
  classification: Classification
  explanation: Explanation | null
  /**
   * The benchmark data behind this holding was not good enough to trust: either
   * it carried no return for the day being classified, or too few sessions
   * overlapped to estimate beta. The attribution is still reported, but the
   * holding is never sent to the LLM and should be excluded from eval.
   */
  approximate: boolean
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

  // Fetch each distinct benchmark once, not once per holding. Returns are keyed
  // by date so holdings pair against the same session, not the same array index.
  const benchmarkReturns = new Map<string, Map<string, number>>()
  for (const ticker of new Set(params.holdings.map(benchmarkFor))) {
    const prices = await params.fetchPrices(ticker)
    if (prices.length < 2) throw new Error(`no price history for benchmark ${ticker}`)
    benchmarkReturns.set(
      ticker,
      new Map(toDatedReturns(prices).map((r) => [r.date, r.value])),
    )
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

    const assetReturns = toDatedReturns(prices)
    const classifiedDate = assetReturns[assetReturns.length - 1].date
    const marketReturnToday = marketReturns.get(classifiedDate)

    // Pair each historical session with the benchmark's move on that SAME date,
    // and EXCLUDE the day being classified. Including today would let an unusual
    // move inflate the very baseline it is measured against, suppressing its own
    // z-score; pairing by index would compare unrelated sessions outright.
    const paired = assetReturns.slice(0, -1).flatMap((r) => {
      const market = marketReturns.get(r.date)
      return market === undefined ? [] : [{ asset: r.value, market }]
    })

    // A benchmark that is stale or barely overlaps cannot support a claim about
    // today. Report the arithmetic, but refuse to call it significant.
    const approximate = marketReturnToday === undefined || paired.length < MIN_OBSERVATIONS

    const { beta, residualSigma, lowConfidence } = computeBeta(
      paired.map((p) => p.asset),
      paired.map((p) => p.market),
    )

    const classification = classifyMove({
      holdingReturn: contribution.holdingReturn,
      marketReturn: marketReturnToday ?? 0,
      beta,
      residualSigma,
      lowConfidence: lowConfidence || approximate,
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
      approximate,
    })
  }

  return {
    date: params.date,
    portfolioReturn: portfolioReturn(contributions),
    holdings: results,
    llmCalls,
  }
}
