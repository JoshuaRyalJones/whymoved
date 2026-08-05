import type { MoveLabel } from '~/lib/attribution/types'
import type { Verdict } from '~/lib/explain/types'
import type { Rating } from './rating'

export interface EvalRecord {
  label: MoveLabel
  verdict: Verdict | null
  citationsValid: boolean | null
  rating: Rating | null
}

export interface Metrics {
  totalHoldingDays: number
  flaggedCount: number
  flagRate: number
  noDriverRate: number
  citationValidityRate: number
  ratedSample: number
  ratedAccuracy: number
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

export function computeMetrics(records: EvalRecord[]): Metrics {
  const flagged = records.filter((r) => r.label === 'idiosyncratic')
  const noDriver = flagged.filter((r) => r.verdict === 'no_driver')
  const withCitationCheck = records.filter((r) => r.citationsValid !== null)
  const validCitations = withCitationCheck.filter((r) => r.citationsValid === true)
  const rated = records.filter((r) => r.rating !== null)
  const correct = rated.filter((r) => r.rating === 'correct')

  return {
    totalHoldingDays: records.length,
    flaggedCount: flagged.length,
    flagRate: ratio(flagged.length, records.length),
    noDriverRate: ratio(noDriver.length, flagged.length),
    citationValidityRate: ratio(validCitations.length, withCitationCheck.length),
    ratedSample: rated.length,
    ratedAccuracy: ratio(correct.length, rated.length),
  }
}
