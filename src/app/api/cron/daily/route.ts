import { NextResponse } from 'next/server'
import { fetchCompanyNews } from '~/lib/data/finnhub'
import { fetchDailyPrices } from '~/lib/data/tiingo'
import { getServiceClient } from '~/lib/db/client'
import { saveDailyResult } from '~/lib/db/queries'
import { explainMove } from '~/lib/explain/explain'
import { runDailyPipeline } from '~/lib/pipeline/daily'
import type { Holding } from '~/lib/sources/types'

export const maxDuration = 300

function historyStart(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCFullYear(d.getUTCFullYear() - 2)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const date = new Date().toISOString().slice(0, 10)
  const db = getServiceClient()

  const { data: sources, error } = await db.from('portfolio_sources').select('user_id, config')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const processed: string[] = []
  for (const source of sources ?? []) {
    const holdings = (source.config as { holdings?: Holding[] }).holdings ?? []
    if (holdings.length === 0) continue

    const result = await runDailyPipeline({
      date,
      holdings,
      fetchPrices: (ticker) => fetchDailyPrices(ticker, historyStart(date), date),
      fetchNews: (ticker, from, to) => fetchCompanyNews(ticker, from, to),
      explain: (params) => explainMove(params),
    })

    await saveDailyResult(source.user_id, result)
    processed.push(source.user_id)
  }

  return NextResponse.json({ date, processed: processed.length })
}
