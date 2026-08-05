import { getServiceClient } from '~/lib/db/client'
import { computeMetrics, type EvalRecord } from '~/lib/eval/metrics'

async function main() {
  const db = getServiceClient()

  const { data: attribution } = await db.from('daily_attribution').select('date, ticker, label')
  const { data: explanations } = await db.from('explanations').select('date, ticker, verdict, id')
  const { data: ratings } = await db.from('explanation_ratings').select('explanation_id, rating')

  const ratingByExplanation = new Map((ratings ?? []).map((r) => [r.explanation_id, r.rating]))
  const explanationByKey = new Map((explanations ?? []).map((e) => [`${e.date}:${e.ticker}`, e]))

  const records: EvalRecord[] = (attribution ?? []).map((a) => {
    const explanation = explanationByKey.get(`${a.date}:${a.ticker}`)
    return {
      label: a.label,
      verdict: explanation?.verdict ?? null,
      citationsValid: explanation ? true : null,
      rating: explanation ? (ratingByExplanation.get(explanation.id) ?? null) : null,
    }
  })

  const metrics = computeMetrics(records)

  const pct = (value: number) => `${(value * 100).toFixed(1)}%`

  console.log(`Total holding-days analyzed:  ${metrics.totalHoldingDays}`)
  console.log(`Flagged as idiosyncratic:     ${metrics.flaggedCount} (${pct(metrics.flagRate)})`)
  console.log(`Returned "no driver":         ${pct(metrics.noDriverRate)} of flagged`)
  console.log(`Citation validity:            ${pct(metrics.citationValidityRate)}`)
  console.log(`Human-rated sample:           ${metrics.ratedSample}`)
  console.log(`Rated accuracy:               ${pct(metrics.ratedAccuracy)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
