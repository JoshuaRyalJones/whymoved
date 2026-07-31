import { describe, expect, it } from 'vitest'
import { DEMO_HOLDINGS, DemoSource } from '~/lib/sources/demo'

describe('DemoSource', () => {
  it('returns a non-trivial seeded portfolio', async () => {
    const result = await new DemoSource().getHoldings('anonymous')
    expect(result.length).toBeGreaterThanOrEqual(5)
    expect(result).toEqual(DEMO_HOLDINGS)
  })

  it('contains both US and Canadian listings', async () => {
    const result = await new DemoSource().getHoldings('anonymous')
    expect(result.some((h) => h.currency === 'USD')).toBe(true)
    expect(result.some((h) => h.currency === 'CAD')).toBe(true)
  })
})
