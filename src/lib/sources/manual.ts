import type { Holding, PortfolioSource } from './types'

export function normalizeHolding(holding: Holding): Holding {
  const ticker = holding.ticker.trim().toUpperCase()
  if (ticker.length === 0) throw new Error('ticker must not be empty')
  if (!(holding.quantity > 0)) throw new Error('quantity must be positive')
  return { ...holding, ticker }
}

export class ManualSource implements PortfolioSource {
  private readonly holdings: Holding[]

  constructor(holdings: Holding[]) {
    this.holdings = holdings.map(normalizeHolding)
  }

  async getHoldings(_userId: string): Promise<Holding[]> {
    return this.holdings
  }
}
