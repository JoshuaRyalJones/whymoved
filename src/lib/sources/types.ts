export type Currency = 'USD' | 'CAD'

export interface Holding {
  ticker: string
  quantity: number
  currency: Currency
  costBasis?: number
}

export interface PortfolioSource {
  getHoldings(userId: string): Promise<Holding[]>
}
