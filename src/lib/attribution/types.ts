export interface Position {
  ticker: string
  quantity: number
  priorPrice: number
  currentPrice: number
}

export interface Contribution {
  ticker: string
  holdingReturn: number
  priorWeight: number
  contributionDollars: number
  contributionReturn: number
}

export interface BetaResult {
  beta: number
  residualSigma: number
  observations: number
  lowConfidence: boolean
}

export type MoveLabel = 'idiosyncratic' | 'moved_with_market' | 'normal_noise'

export interface Classification {
  label: MoveLabel
  zScore: number
  marketComponent: number
  residual: number
}
