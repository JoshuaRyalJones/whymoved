import { describe, expect, it, vi } from 'vitest'
import { fetchDailyPrices, toDailyReturns } from '~/lib/data/tiingo'

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch
}

const payload = [
  { date: '2026-07-20T00:00:00.000Z', close: 100, adjClose: 100 },
  { date: '2026-07-21T00:00:00.000Z', close: 110, adjClose: 110 },
]

describe('fetchDailyPrices', () => {
  it('maps the Tiingo payload to DailyPrice records', async () => {
    const result = await fetchDailyPrices('SHOP', '2026-07-20', '2026-07-21', {
      apiKey: 'test-key',
      fetchImpl: mockFetch(payload),
    })
    expect(result).toEqual([
      { date: '2026-07-20', close: 100, adjClose: 100 },
      { date: '2026-07-21', close: 110, adjClose: 110 },
    ])
  })

  it('sends the API key as a Token authorization header', async () => {
    const spy = mockFetch(payload)
    await fetchDailyPrices('SHOP', '2026-07-20', '2026-07-21', {
      apiKey: 'test-key',
      fetchImpl: spy,
    })
    const [url, init] = (spy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain('/tiingo/daily/SHOP/prices')
    expect(String(url)).toContain('startDate=2026-07-20')
    expect((init.headers as Record<string, string>).Authorization).toBe('Token test-key')
  })

  it('throws a descriptive error on a non-ok response', async () => {
    await expect(
      fetchDailyPrices('SHOP', '2026-07-20', '2026-07-21', {
        apiKey: 'test-key',
        fetchImpl: mockFetch({ detail: 'nope' }, false, 429),
      }),
    ).rejects.toThrow('Tiingo request failed for SHOP: 429')
  })

  it('throws when no API key is available', async () => {
    await expect(
      fetchDailyPrices('SHOP', '2026-07-20', '2026-07-21', { fetchImpl: mockFetch(payload) }),
    ).rejects.toThrow('TIINGO_API_KEY is not set')
  })
})

describe('toDailyReturns', () => {
  it('produces one fewer return than prices', () => {
    const returns = toDailyReturns([
      { date: '2026-07-20', close: 100, adjClose: 100 },
      { date: '2026-07-21', close: 110, adjClose: 110 },
      { date: '2026-07-22', close: 99, adjClose: 99 },
    ])
    expect(returns).toHaveLength(2)
    expect(returns[0]).toBeCloseTo(0.1, 10)
    expect(returns[1]).toBeCloseTo(-0.1, 10)
  })

  it('returns an empty array for fewer than two prices', () => {
    expect(toDailyReturns([{ date: '2026-07-20', close: 100, adjClose: 100 }])).toEqual([])
  })
})
