import { describe, expect, it } from 'vitest'
import { ManualSource } from '~/lib/sources/manual'
import type { Holding } from '~/lib/sources/types'

const holdings: Holding[] = [
  { ticker: 'SHOP', quantity: 10, currency: 'CAD' },
  { ticker: 'NVDA', quantity: 5, currency: 'USD' },
]

describe('ManualSource', () => {
  it('returns the holdings it was constructed with', async () => {
    const source = new ManualSource(holdings)
    await expect(source.getHoldings('user-1')).resolves.toEqual(holdings)
  })

  it('rejects a non-positive quantity', () => {
    expect(() => new ManualSource([{ ticker: 'AAA', quantity: 0, currency: 'USD' }])).toThrow(
      'quantity must be positive',
    )
  })

  it('rejects an empty ticker', () => {
    expect(() => new ManualSource([{ ticker: '  ', quantity: 1, currency: 'USD' }])).toThrow(
      'ticker must not be empty',
    )
  })

  it('uppercases and trims tickers', async () => {
    const source = new ManualSource([{ ticker: ' shop ', quantity: 1, currency: 'CAD' }])
    const result = await source.getHoldings('user-1')
    expect(result[0].ticker).toBe('SHOP')
  })
})
