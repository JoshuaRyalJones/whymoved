import type { Classification } from './types'

export const DEFAULT_Z_THRESHOLD = 2.0

export interface ClassifyParams {
  holdingReturn: number
  marketReturn: number
  beta: number
  residualSigma: number
  lowConfidence: boolean
  threshold?: number
}

export function classifyMove(params: ClassifyParams): Classification {
  const threshold = params.threshold ?? DEFAULT_Z_THRESHOLD
  const marketComponent = params.beta * params.marketReturn
  const residual = params.holdingReturn - marketComponent
  const zScore = params.residualSigma > 0 ? residual / params.residualSigma : 0

  const isIdiosyncratic = !params.lowConfidence && Math.abs(zScore) >= threshold
  if (isIdiosyncratic) {
    return { label: 'idiosyncratic', zScore, marketComponent, residual }
  }

  const label =
    Math.abs(marketComponent) >= Math.abs(residual) ? 'moved_with_market' : 'normal_noise'

  return { label, zScore, marketComponent, residual }
}
