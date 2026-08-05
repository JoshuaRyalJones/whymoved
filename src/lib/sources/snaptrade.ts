import type { Currency, Holding, PortfolioSource } from './types'

export interface SnapTradePosition {
  symbol: { symbol: { symbol: string; currency: { code: string } } }
  units: number
}

export interface SnapTradeClient {
  accountInformation: {
    listUserAccounts: (args: {
      userId: string
      userSecret: string
    }) => Promise<{ data: { id: string }[] }>
    getUserAccountPositions: (args: {
      accountId: string
      userId: string
      userSecret: string
    }) => Promise<{ data: SnapTradePosition[] }>
  }
}

export function toHoldings(positions: SnapTradePosition[]): Holding[] {
  const totals = new Map<string, Holding>()

  for (const position of positions) {
    if (!(position.units > 0)) continue
    const ticker = position.symbol.symbol.symbol.trim().toUpperCase()
    const currency = position.symbol.symbol.currency.code.toUpperCase() as Currency
    const existing = totals.get(ticker)
    totals.set(
      ticker,
      existing
        ? { ...existing, quantity: existing.quantity + position.units }
        : { ticker, quantity: position.units, currency },
    )
  }

  return [...totals.values()]
}

export class SnapTradeSource implements PortfolioSource {
  constructor(
    private readonly client: SnapTradeClient,
    private readonly userSecret: string,
  ) {}

  async getHoldings(userId: string): Promise<Holding[]> {
    const accounts = await this.client.accountInformation.listUserAccounts({
      userId,
      userSecret: this.userSecret,
    })

    const all: SnapTradePosition[] = []
    for (const account of accounts.data) {
      const positions = await this.client.accountInformation.getUserAccountPositions({
        accountId: account.id,
        userId,
        userSecret: this.userSecret,
      })
      all.push(...positions.data)
    }

    return toHoldings(all)
  }
}
