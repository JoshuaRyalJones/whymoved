import type { Currency, Holding } from '~/lib/sources/types'

export const BENCHMARKS: Record<Currency, string> = {
  CAD: 'XIC',
  USD: 'SPY',
}

export function benchmarkFor(holding: Holding): string {
  return BENCHMARKS[holding.currency]
}
