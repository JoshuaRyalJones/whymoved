import type { BetaResult } from './types'

const MIN_OBSERVATIONS = 60

// A degenerate market series never has *exactly* zero computed variance:
// summing a constant in floating point leaves residue on the order of 1e-38.
// Comparing to zero therefore misses it and beta explodes on the near-zero
// denominator. This floor corresponds to a daily return sigma of 1e-6, which
// is orders of magnitude below any real index (SPY sits near 1e-4 variance).
const MIN_MARKET_VARIANCE = 1e-12

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function sampleStdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const sumSq = values.reduce((sum, v) => sum + (v - m) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

export function computeBeta(assetReturns: number[], marketReturns: number[]): BetaResult {
  if (assetReturns.length !== marketReturns.length) {
    throw new Error('series must be the same length')
  }

  const n = assetReturns.length
  const marketVariance = n >= 2 ? sampleStdev(marketReturns) ** 2 : 0
  const insufficient = n < MIN_OBSERVATIONS || marketVariance < MIN_MARKET_VARIANCE

  let beta = 1
  if (!insufficient) {
    const assetMean = mean(assetReturns)
    const marketMean = mean(marketReturns)
    const covariance =
      assetReturns.reduce(
        (sum, a, i) => sum + (a - assetMean) * (marketReturns[i] - marketMean),
        0,
      ) /
      (n - 1)
    beta = covariance / marketVariance
  }

  const residuals = assetReturns.map((a, i) => a - beta * marketReturns[i])

  return {
    beta,
    residualSigma: sampleStdev(residuals),
    observations: n,
    lowConfidence: insufficient,
  }
}
