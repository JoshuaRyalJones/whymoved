import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CsvSource, parseWealthsimpleHoldings } from '~/lib/sources/csv'

const csv = readFileSync(
  fileURLToPath(new URL('../fixtures/wealthsimple-holdings.csv', import.meta.url)),
  'utf8',
)

describe('parseWealthsimpleHoldings', () => {
  it('parses each equity row into a holding', () => {
    const result = parseWealthsimpleHoldings(csv)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ ticker: 'SHOP', quantity: 40, currency: 'CAD' })
  })

  it('skips zero-quantity rows such as cash', () => {
    const result = parseWealthsimpleHoldings(csv)
    expect(result.some((h) => h.ticker === 'CASH')).toBe(false)
  })

  it('aggregates the same ticker held across multiple accounts', () => {
    const multi = [
      'account,symbol,name,quantity,currency,market_value',
      'TFSA,SHOP,"Shopify Inc.",40,CAD,4210.80',
      'RRSP,SHOP,"Shopify Inc.",10,CAD,1052.70',
    ].join('\n')
    const result = parseWealthsimpleHoldings(multi)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(50)
  })

  it('throws when a required column is missing', () => {
    const bad = 'account,name,quantity\nTFSA,"Shopify Inc.",40'
    expect(() => parseWealthsimpleHoldings(bad)).toThrow('missing required column: symbol')
  })

  it('throws on an empty file', () => {
    expect(() => parseWealthsimpleHoldings('')).toThrow('csv is empty')
  })
})

describe('CsvSource', () => {
  it('exposes parsed holdings through the PortfolioSource interface', async () => {
    const result = await new CsvSource(csv).getHoldings('user-1')
    expect(result).toHaveLength(3)
  })
})
