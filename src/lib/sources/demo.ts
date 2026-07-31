import type { Holding, PortfolioSource } from './types'

export const DEMO_HOLDINGS: Holding[] = [
  { ticker: 'SHOP', quantity: 40, currency: 'CAD', costBasis: 92.4 },
  { ticker: 'RY', quantity: 25, currency: 'CAD', costBasis: 131.05 },
  { ticker: 'ENB', quantity: 60, currency: 'CAD', costBasis: 48.7 },
  { ticker: 'NVDA', quantity: 12, currency: 'USD', costBasis: 118.2 },
  { ticker: 'MSFT', quantity: 8, currency: 'USD', costBasis: 402.15 },
  { ticker: 'COST', quantity: 3, currency: 'USD', costBasis: 845.0 },
]

export class DemoSource implements PortfolioSource {
  async getHoldings(_userId: string): Promise<Holding[]> {
    return DEMO_HOLDINGS
  }
}
