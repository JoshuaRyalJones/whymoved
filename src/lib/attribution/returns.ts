import type { Contribution, Position } from './types'

export function holdingReturn(priorPrice: number, currentPrice: number): number {
  if (!(priorPrice > 0)) throw new Error('priorPrice must be positive')
  return currentPrice / priorPrice - 1
}

export function computeContributions(positions: Position[]): Contribution[] {
  if (positions.length === 0) return []

  const priorValues = positions.map((p) => p.quantity * p.priorPrice)
  const totalPrior = priorValues.reduce((sum, v) => sum + v, 0)
  if (!(totalPrior > 0)) throw new Error('total prior value must be positive')

  return positions.map((position, i) => {
    const r = holdingReturn(position.priorPrice, position.currentPrice)
    const priorWeight = priorValues[i] / totalPrior
    return {
      ticker: position.ticker,
      holdingReturn: r,
      priorWeight,
      contributionDollars: priorValues[i] * r,
      contributionReturn: priorWeight * r,
    }
  })
}

export function portfolioReturn(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.contributionReturn, 0)
}
