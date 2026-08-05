import { describe, expect, it, vi } from 'vitest'
import { runDailyPipeline } from '~/lib/pipeline/daily'
import type { DailyPrice } from '~/lib/data/tiingo'
import type { Holding } from '~/lib/sources/types'
import type { Article, Explanation } from '~/lib/explain/types'

// Deterministic PRNG so fixtures are reproducible across runs.
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateAt(i: number): string {
  const d = new Date(Date.UTC(2026, 0, 1))
  d.setUTCDate(d.getUTCDate() + i)
  return d.toISOString().slice(0, 10)
}

function pricesFromReturns(returns: number[], start = 100): DailyPrice[] {
  const prices: DailyPrice[] = [{ date: dateAt(0), close: start, adjClose: start }]
  returns.forEach((r, i) => {
    const next = prices[i].adjClose * (1 + r)
    prices.push({ date: dateAt(i + 1), close: next, adjClose: next })
  })
  return prices
}

const rand = mulberry32(42)
const N = 120

// Two independent benchmarks. SPY and XIC move differently, so a holding
// benchmarked against the wrong one produces a visibly different residual.
const spyReturns = Array.from({ length: N }, () => (rand() - 0.5) * 0.02)
const xicReturns = Array.from({ length: N }, () => (rand() - 0.5) * 0.02)

// Each holding tracks its own benchmark with idiosyncratic noise bounded at
// +/-0.2%. For a uniform distribution the maximum deviation is sqrt(3) sigma
// (~1.73), which keeps a well-behaved holding below the 2.0 threshold by
// construction rather than by luck.
const aaaReturns = spyReturns.map((m) => m + (rand() - 0.5) * 0.004)
const bbbReturns = spyReturns.map((m) => m + (rand() - 0.5) * 0.004)
const canReturns = xicReturns.map((m) => m + (rand() - 0.5) * 0.004)

// BBB alone takes a large idiosyncratic jump on the final day.
bbbReturns[N - 1] = spyReturns[N - 1] + 0.25

const spyPrices = pricesFromReturns(spyReturns)
const xicPrices = pricesFromReturns(xicReturns, 32)
const aaaPrices = pricesFromReturns(aaaReturns, 50)
const bbbPrices = pricesFromReturns(bbbReturns, 50)
const canPrices = pricesFromReturns(canReturns, 130)

const holdings: Holding[] = [
  { ticker: 'AAA', quantity: 10, currency: 'USD' },
  { ticker: 'BBB', quantity: 10, currency: 'USD' },
  { ticker: 'CAN', quantity: 10, currency: 'CAD' },
]

const article: Article = {
  id: 'a1',
  ticker: 'BBB',
  publishedAt: '2026-07-21T12:00:00.000Z',
  source: 'Reuters',
  headline: 'Acquired at a premium',
  summary: 'Takeover announced.',
  url: 'https://example.com/1',
}

const explanation: Explanation = {
  verdict: 'explained',
  summary: 'Takeover announced.',
  citedArticleIds: ['a1'],
  confidence: 'high',
}

const PRICES: Record<string, DailyPrice[]> = {
  SPY: spyPrices,
  XIC: xicPrices,
  AAA: aaaPrices,
  BBB: bbbPrices,
  CAN: canPrices,
}

type Deps = Parameters<typeof runDailyPipeline>[0]

// The spread of `overrides` widens each mock to its bare call signature, which
// loses `.mock`. Casting back to the base shape keeps the mock surface typed
// while still allowing a plain override.
function makeDeps(overrides: Partial<Deps> = {}) {
  const base = {
    date: '2026-07-21',
    holdings,
    fetchPrices: vi.fn(async (ticker: string) => PRICES[ticker] ?? []),
    fetchNews: vi.fn(async (_ticker: string, _from: string, _to: string) => [article]),
    explain: vi.fn(async (): Promise<Explanation> => explanation),
  }
  return { ...base, ...overrides } as typeof base
}

describe('runDailyPipeline', () => {
  it('classifies a market-tracking holding without calling the LLM', async () => {
    const deps = makeDeps()
    const result = await runDailyPipeline(deps)
    const aaa = result.holdings.find((h) => h.ticker === 'AAA')!
    expect(aaa.classification.label).not.toBe('idiosyncratic')
    expect(aaa.explanation).toBeNull()
  })

  it('explains only the idiosyncratic holding', async () => {
    const deps = makeDeps()
    const result = await runDailyPipeline(deps)
    const bbb = result.holdings.find((h) => h.ticker === 'BBB')!
    expect(bbb.classification.label).toBe('idiosyncratic')
    expect(bbb.explanation).toEqual(explanation)
    expect(deps.explain).toHaveBeenCalledTimes(1)
    expect(result.llmCalls).toBe(1)
  })

  it('estimates the residual baseline excluding the day being classified', async () => {
    const result = await runDailyPipeline(makeDeps())
    const bbb = result.holdings.find((h) => h.ticker === 'BBB')!
    // If today's 25% jump were included in its own sigma estimate, that single
    // outlier would dominate the standard deviation and collapse z toward
    // sqrt(n) ~ 11. Excluding it keeps the score far higher.
    expect(Math.abs(bbb.classification.zScore)).toBeGreaterThan(30)
  })

  it('fetches news only for flagged holdings', async () => {
    const deps = makeDeps()
    await runDailyPipeline(deps)
    expect(deps.fetchNews).toHaveBeenCalledTimes(1)
    expect(deps.fetchNews.mock.calls[0][0]).toBe('BBB')
  })

  it('reports a portfolio return equal to the sum of contributions', async () => {
    const result = await runDailyPipeline(makeDeps())
    const summed = result.holdings.reduce((s, h) => s + h.contribution.contributionReturn, 0)
    expect(result.portfolioReturn).toBeCloseTo(summed, 10)
  })

  it('skips holdings with insufficient price history', async () => {
    const deps = makeDeps({
      fetchPrices: vi.fn(async (ticker: string) => (ticker === 'BBB' ? [] : (PRICES[ticker] ?? []))),
    })
    const result = await runDailyPipeline(deps)
    expect(result.holdings.map((h) => h.ticker)).toEqual(['AAA', 'CAN'])
  })

  it('throws when a benchmark has no price history', async () => {
    const deps = makeDeps({
      fetchPrices: vi.fn(async (ticker: string) => (ticker === 'XIC' ? [] : (PRICES[ticker] ?? []))),
    })
    await expect(runDailyPipeline(deps)).rejects.toThrow('no price history for benchmark XIC')
  })

  it('benchmarks each holding against the index for its currency', async () => {
    const result = await runDailyPipeline(makeDeps())
    const byTicker = Object.fromEntries(result.holdings.map((h) => [h.ticker, h.benchmarkTicker]))
    expect(byTicker).toEqual({ AAA: 'SPY', BBB: 'SPY', CAN: 'XIC' })
  })

  it('does not misclassify a Canadian holding that tracks the TSX', async () => {
    const result = await runDailyPipeline(makeDeps())
    const can = result.holdings.find((h) => h.ticker === 'CAN')!
    // CAN tracks XIC closely. Benchmarked correctly its residual is small; had it
    // been benchmarked against the unrelated SPY series it would look idiosyncratic.
    expect(can.classification.label).not.toBe('idiosyncratic')
  })

  it('fetches each distinct benchmark exactly once', async () => {
    const deps = makeDeps()
    await runDailyPipeline(deps)
    const fetched = deps.fetchPrices.mock.calls.map((c) => c[0])
    expect(fetched.filter((t) => t === 'SPY')).toHaveLength(1)
    expect(fetched.filter((t) => t === 'XIC')).toHaveLength(1)
  })
})

describe('runDailyPipeline data-quality guard', () => {
  // A benchmark that stops updating is the dangerous case: it is non-empty, so
  // it passes the "no price history" check, but its last return predates the day
  // being classified. Left unguarded the pipeline pairs a months-old market move
  // with today's holding move and reports the result as fact.
  const staleXic = xicPrices.slice(0, 6)

  it('marks a holding approximate when its benchmark has no return for the day', async () => {
    const deps = makeDeps({
      fetchPrices: vi.fn(async (t: string) => (t === 'XIC' ? staleXic : (PRICES[t] ?? []))),
    })
    const result = await runDailyPipeline(deps)
    const can = result.holdings.find((h) => h.ticker === 'CAN')!
    expect(can.approximate).toBe(true)
  })

  it('never flags an approximate holding, however large its move', async () => {
    // CAN jumps 40% on the final day. With a healthy benchmark that is plainly
    // idiosyncratic; with an unusable one we must not pretend to know.
    const jumped = [...canReturns]
    jumped[N - 1] = 0.4
    const deps = makeDeps({
      fetchPrices: vi.fn(async (t: string) =>
        t === 'XIC' ? staleXic : t === 'CAN' ? pricesFromReturns(jumped, 130) : (PRICES[t] ?? []),
      ),
    })
    const result = await runDailyPipeline(deps)
    const can = result.holdings.find((h) => h.ticker === 'CAN')!
    expect(can.approximate).toBe(true)
    expect(can.classification.label).not.toBe('idiosyncratic')
    expect(can.explanation).toBeNull()
  })

  it('spends no LLM call on an approximate holding', async () => {
    const jumped = [...canReturns]
    jumped[N - 1] = 0.4
    const deps = makeDeps({
      fetchPrices: vi.fn(async (t: string) =>
        t === 'XIC' ? staleXic : t === 'CAN' ? pricesFromReturns(jumped, 130) : (PRICES[t] ?? []),
      ),
    })
    await runDailyPipeline(deps)
    const explained = deps.explain.mock.calls.length
    expect(explained).toBe(1) // BBB only, never CAN
    expect(deps.fetchNews.mock.calls.map((c) => c[0])).not.toContain('CAN')
  })

  it('leaves healthy holdings unmarked', async () => {
    const result = await runDailyPipeline(makeDeps())
    expect(result.holdings.every((h) => h.approximate === false)).toBe(true)
  })

  it('marks approximate when too few observations overlap the benchmark', async () => {
    // Benchmark covers the classified day but only ~40 sessions of history, short
    // of the 60 the beta estimate requires.
    const shortXic = [...xicPrices.slice(0, 1), ...xicPrices.slice(-40)]
    const deps = makeDeps({
      fetchPrices: vi.fn(async (t: string) => (t === 'XIC' ? shortXic : (PRICES[t] ?? []))),
    })
    const result = await runDailyPipeline(deps)
    expect(result.holdings.find((h) => h.ticker === 'CAN')!.approximate).toBe(true)
  })

  it('pairs returns by date, so a gap in the benchmark does not shift the series', async () => {
    // Drop one interior session from SPY. Under positional pairing every later
    // day would be compared against the wrong market move, manufacturing a large
    // residual for a holding that in fact tracks its benchmark.
    const gapped = [...spyPrices.slice(0, 30), ...spyPrices.slice(31)]
    const deps = makeDeps({
      fetchPrices: vi.fn(async (t: string) => (t === 'SPY' ? gapped : (PRICES[t] ?? []))),
    })
    const result = await runDailyPipeline(deps)
    const aaa = result.holdings.find((h) => h.ticker === 'AAA')!
    expect(aaa.approximate).toBe(false)
    expect(aaa.classification.label).not.toBe('idiosyncratic')
  })
})
