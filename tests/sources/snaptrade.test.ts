import { describe, expect, it, vi } from 'vitest'
import { SnapTradeSource, toHoldings } from '~/lib/sources/snaptrade'

const positions = [
  { symbol: { symbol: { symbol: 'NVDA', currency: { code: 'USD' } } }, units: 12 },
  { symbol: { symbol: { symbol: 'SHOP', currency: { code: 'CAD' } } }, units: 40 },
  { symbol: { symbol: { symbol: 'ZERO', currency: { code: 'CAD' } } }, units: 0 },
]

describe('toHoldings', () => {
  it('maps SnapTrade positions onto holdings', () => {
    expect(toHoldings(positions)).toEqual([
      { ticker: 'NVDA', quantity: 12, currency: 'USD' },
      { ticker: 'SHOP', quantity: 40, currency: 'CAD' },
    ])
  })

  it('drops zero-unit positions', () => {
    expect(toHoldings(positions).some((h) => h.ticker === 'ZERO')).toBe(false)
  })

  it('returns an empty array for no positions', () => {
    expect(toHoldings([])).toEqual([])
  })
})

describe('SnapTradeSource', () => {
  it('aggregates positions across every account', async () => {
    const client = {
      accountInformation: {
        listUserAccounts: vi.fn().mockResolvedValue({ data: [{ id: 'acc-1' }, { id: 'acc-2' }] }),
        getUserAccountPositions: vi
          .fn()
          .mockResolvedValueOnce({ data: [positions[0]] })
          .mockResolvedValueOnce({ data: [positions[1]] }),
      },
    }
    const result = await new SnapTradeSource(client, 'secret-1').getHoldings('user-1')
    expect(result).toHaveLength(2)
    expect(client.accountInformation.getUserAccountPositions).toHaveBeenCalledTimes(2)
  })

  it('sums the same ticker held in two accounts', async () => {
    const client = {
      accountInformation: {
        listUserAccounts: vi.fn().mockResolvedValue({ data: [{ id: 'acc-1' }, { id: 'acc-2' }] }),
        getUserAccountPositions: vi
          .fn()
          .mockResolvedValueOnce({ data: [positions[0]] })
          .mockResolvedValueOnce({ data: [positions[0]] }),
      },
    }
    const result = await new SnapTradeSource(client, 'secret-1').getHoldings('user-1')
    expect(result).toEqual([{ ticker: 'NVDA', quantity: 24, currency: 'USD' }])
  })
})
