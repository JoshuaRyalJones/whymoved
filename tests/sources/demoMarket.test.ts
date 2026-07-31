import { describe, expect, it } from 'vitest'
import {
  DEMO_DATE,
  DEMO_PRICES,
  demoExplain,
  demoFetchNews,
  demoFetchPrices,
} from '~/lib/sources/demoMarket'
import { DEMO_HOLDINGS } from '~/lib/sources/demo'
import { runDailyPipeline } from '~/lib/pipeline/daily'

async function runDemo() {
  return runDailyPipeline({
    date: DEMO_DATE,
    holdings: DEMO_HOLDINGS,
    fetchPrices: demoFetchPrices,
    fetchNews: demoFetchNews,
    explain: demoExplain,
  })
}

describe('demo dataset', () => {
  it('provides history for every holding and both benchmarks', () => {
    for (const ticker of ['SPY', 'XIC', ...DEMO_HOLDINGS.map((h) => h.ticker)]) {
      expect(DEMO_PRICES[ticker]?.length ?? 0).toBeGreaterThan(200)
    }
  })

  it('flags exactly one holding, so the demo shows the gate actually gating', async () => {
    const result = await runDemo()
    const flagged = result.holdings.filter((h) => h.classification.label === 'idiosyncratic')
    expect(flagged.map((h) => h.ticker)).toEqual(['NVDA'])
    expect(result.llmCalls).toBe(1)
  })

  it('keeps every unflagged holding comfortably inside the gate', async () => {
    const result = await runDemo()
    const quiet = result.holdings.filter((h) => h.ticker !== 'NVDA')
    expect(quiet).toHaveLength(5)
    for (const holding of quiet) {
      expect(Math.abs(holding.classification.zScore)).toBeLessThan(2)
      expect(holding.explanation).toBeNull()
    }
  })

  it('explains the flagged holding with citations that exist in the retrieved set', async () => {
    const result = await runDemo()
    const nvda = result.holdings.find((h) => h.ticker === 'NVDA')!
    const articleIds = (await demoFetchNews('NVDA')).map((a) => a.id)

    expect(nvda.explanation?.verdict).toBe('explained')
    expect(nvda.explanation!.citedArticleIds.length).toBeGreaterThan(0)
    for (const id of nvda.explanation!.citedArticleIds) {
      expect(articleIds).toContain(id)
    }
  })

  it('is deterministic across runs', async () => {
    const [first, second] = [await runDemo(), await runDemo()]
    expect(first.portfolioReturn).toBe(second.portfolioReturn)
    expect(first.holdings.map((h) => h.classification.zScore)).toEqual(
      second.holdings.map((h) => h.classification.zScore),
    )
  })
})
