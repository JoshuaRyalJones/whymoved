/**
 * Seeded market data for the public demo.
 *
 * The demo has to render for someone with no account and no API keys, so it
 * cannot call Tiingo or Finnhub. Everything here is generated from a fixed
 * seed: the same prices, the same z-scores, and the same explanation on every
 * request. Nothing in this file is real market data, and the demo page says so.
 *
 * The dataset is constructed so the demo shows the product's actual claim —
 * five holdings sit inside the +/-2 sigma gate and are labelled by arithmetic
 * alone, and exactly one crosses it and earns an explanation.
 */
import type { DailyPrice } from '~/lib/data/tiingo'
import type { Article, Explanation } from '~/lib/explain/types'
import { NO_DRIVER_FALLBACK, validateCitations } from '~/lib/explain/validate'

/** A fixed sample day. The demo is a reproducible snapshot, not a live feed. */
export const DEMO_DATE = '2026-07-29'

const HISTORY_DAYS = 260

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function datesEndingAt(end: string, count: number): string[] {
  const dates: string[] = []
  const cursor = new Date(`${end}T00:00:00.000Z`)
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.unshift(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return dates
}

/** Rescales so the series ends exactly at `endPrice`, keeping every return intact. */
function seriesFromReturns(returns: number[], endPrice: number, dates: string[]): DailyPrice[] {
  const growth = returns.reduce((acc, r) => acc * (1 + r), 1)
  let price = endPrice / growth
  const prices: DailyPrice[] = [{ date: dates[0], close: price, adjClose: price }]
  returns.forEach((r, i) => {
    price = price * (1 + r)
    prices.push({ date: dates[i + 1], close: price, adjClose: price })
  })
  return prices
}

const DATES = datesEndingAt(DEMO_DATE, HISTORY_DAYS)
const STEPS = HISTORY_DAYS - 1

const rand = mulberry32(20260729)

// Both benchmarks drift down slightly on the sample day, so a portfolio that
// finishes up has to have finished up for a reason specific to one holding.
const spyReturns = Array.from({ length: STEPS }, () => (rand() - 0.5) * 0.018)
const xicReturns = Array.from({ length: STEPS }, () => (rand() - 0.5) * 0.014)
spyReturns[STEPS - 1] = -0.0041
xicReturns[STEPS - 1] = -0.0019

interface DemoSecurity {
  ticker: string
  benchmark: 'SPY' | 'XIC'
  beta: number
  /** Half-width of the uniform idiosyncratic term. Bounded noise keeps a
   *  well-behaved holding below 2 sigma by construction, not by luck. */
  noise: number
  endPrice: number
}

const SECURITIES: DemoSecurity[] = [
  { ticker: 'SHOP', benchmark: 'XIC', beta: 1.62, noise: 0.014, endPrice: 149.82 },
  { ticker: 'RY', benchmark: 'XIC', beta: 0.84, noise: 0.006, endPrice: 176.4 },
  { ticker: 'ENB', benchmark: 'XIC', beta: 0.71, noise: 0.007, endPrice: 61.95 },
  { ticker: 'NVDA', benchmark: 'SPY', beta: 1.68, noise: 0.016, endPrice: 184.6 },
  { ticker: 'MSFT', benchmark: 'SPY', beta: 1.08, noise: 0.009, endPrice: 511.3 },
  { ticker: 'COST', benchmark: 'SPY', beta: 0.79, noise: 0.007, endPrice: 977.15 },
]

/** The one genuine idiosyncratic move in the dataset. */
const FLAGGED_TICKER = 'NVDA'
const FLAGGED_RESIDUAL = 0.094

const BENCHMARK_RETURNS: Record<string, number[]> = { SPY: spyReturns, XIC: xicReturns }

function buildPrices(): Record<string, DailyPrice[]> {
  const prices: Record<string, DailyPrice[]> = {
    SPY: seriesFromReturns(spyReturns, 583.4, DATES),
    XIC: seriesFromReturns(xicReturns, 42.18, DATES),
  }

  for (const security of SECURITIES) {
    const market = BENCHMARK_RETURNS[security.benchmark]
    const returns = market.map((m) => m * security.beta + (rand() - 0.5) * 2 * security.noise)
    if (security.ticker === FLAGGED_TICKER) {
      returns[STEPS - 1] = market[STEPS - 1] * security.beta + FLAGGED_RESIDUAL
    }
    prices[security.ticker] = seriesFromReturns(returns, security.endPrice, DATES)
  }

  return prices
}

export const DEMO_PRICES: Record<string, DailyPrice[]> = buildPrices()

// Sources are named as sample copy rather than real newswires. The headlines
// are illustrative and describe no actual event.
export const DEMO_ARTICLES: Record<string, Article[]> = {
  NVDA: [
    {
      id: 'a1',
      ticker: 'NVDA',
      publishedAt: `${DEMO_DATE}T11:20:00.000Z`,
      source: 'Sample newswire',
      headline: 'Multi-year accelerator supply agreement announced with a major cloud provider',
      summary:
        'Sample article. Describes a multi-year supply commitment materially above prior guidance, disclosed before market open.',
      url: 'https://example.com/demo/nvda-supply-agreement',
    },
    {
      id: 'a2',
      ticker: 'NVDA',
      publishedAt: `${DEMO_DATE}T14:05:00.000Z`,
      source: 'Sample newswire',
      headline: 'Analysts raise price targets following the supply announcement',
      summary: 'Sample article. Several desks revise targets upward, citing the disclosed volume.',
      url: 'https://example.com/demo/nvda-targets',
    },
  ],
}

export async function demoFetchPrices(ticker: string): Promise<DailyPrice[]> {
  return DEMO_PRICES[ticker] ?? []
}

export async function demoFetchNews(ticker: string): Promise<Article[]> {
  return DEMO_ARTICLES[ticker] ?? []
}

/**
 * Stands in for the Claude call. It returns a canned verdict, but still routes
 * it through the same citation check the live path uses — so the demo cannot
 * display a citation that is not in the retrieved set either.
 */
export async function demoExplain(params: { articles: Article[] }): Promise<Explanation> {
  if (params.articles.length === 0) return NO_DRIVER_FALLBACK

  const candidate: Explanation = {
    verdict: 'explained',
    summary:
      'A multi-year supply agreement disclosed before the open accounts for both the direction and the size of the move. The second article reports target revisions following it, which is a consequence rather than a separate cause.',
    citedArticleIds: ['a1', 'a2'],
    confidence: 'high',
  }

  const { valid } = validateCitations(candidate.citedArticleIds, params.articles)
  return valid ? candidate : NO_DRIVER_FALLBACK
}
