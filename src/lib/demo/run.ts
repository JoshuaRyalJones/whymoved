import { cache } from 'react'
import { runDailyPipeline, type DailyResult } from '~/lib/pipeline/daily'
import { DEMO_HOLDINGS } from '~/lib/sources/demo'
import { DEMO_DATE, demoExplain, demoFetchNews, demoFetchPrices } from '~/lib/sources/demoMarket'

/** Cached per request so the demo and drill-down pages agree on every figure. */
export const runDemoPipeline = cache(
  async (): Promise<DailyResult> =>
    runDailyPipeline({
      date: DEMO_DATE,
      holdings: DEMO_HOLDINGS,
      fetchPrices: demoFetchPrices,
      fetchNews: demoFetchNews,
      explain: demoExplain,
    }),
)

/** Largest absolute dollar impact first — the order the ledger is ranked by. */
export function byImpact<T extends { contribution: { contributionDollars: number } }>(
  holdings: T[],
): T[] {
  return [...holdings].sort(
    (a, b) =>
      Math.abs(b.contribution.contributionDollars) - Math.abs(a.contribution.contributionDollars),
  )
}
