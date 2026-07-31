import type { MoveLabel } from './attribution/types'

export function formatPercent(value: number): string {
  const sign = value < 0 ? '-' : '+'
  return `${sign}${(Math.abs(value) * 100).toFixed(2)}%`
}

export function formatCurrency(value: number, _currency: string): string {
  const sign = value < 0 ? '-' : '+'
  const amount = Math.abs(value).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}$${amount}`
}

const LABEL_TEXT: Record<MoveLabel, string> = {
  idiosyncratic: 'Unusual move',
  moved_with_market: 'Moved with market',
  normal_noise: 'Normal noise',
}

export function labelText(label: MoveLabel): string {
  return LABEL_TEXT[label]
}

export function formatLongDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatSigma(zScore: number): string {
  const sign = zScore < 0 ? '-' : '+'
  return `${sign}${Math.abs(zScore).toFixed(1)}σ`
}
