import { describe, expect, it, vi } from 'vitest'
import { fetchCompanyNews } from '~/lib/data/finnhub'

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch
}

const payload = [
  {
    datetime: 1784000000,
    source: 'Reuters',
    headline: 'Company beats earnings',
    summary: 'Revenue up 20 percent.',
    url: 'https://example.com/1',
  },
  {
    datetime: 1784100000,
    source: 'Bloomberg',
    headline: 'Analyst upgrade',
    summary: 'Price target raised.',
    url: 'https://example.com/2',
  },
]

describe('fetchCompanyNews', () => {
  it('assigns sequential local article IDs', async () => {
    const result = await fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', {
      apiKey: 'test-key',
      fetchImpl: mockFetch(payload),
    })
    expect(result.map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(result[0].headline).toBe('Company beats earnings')
    expect(result[0].ticker).toBe('NVDA')
  })

  it('converts unix datetimes to ISO strings', async () => {
    const result = await fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', {
      apiKey: 'test-key',
      fetchImpl: mockFetch(payload),
    })
    expect(result[0].publishedAt).toBe(new Date(1784000000 * 1000).toISOString())
  })

  it('caps the number of articles returned', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...payload[0], url: `https://x/${i}` }))
    const result = await fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', {
      apiKey: 'test-key',
      fetchImpl: mockFetch(many),
      maxArticles: 15,
    })
    expect(result).toHaveLength(15)
  })

  it('deduplicates articles sharing a URL', async () => {
    const dupes = [payload[0], payload[0], payload[1]]
    const result = await fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', {
      apiKey: 'test-key',
      fetchImpl: mockFetch(dupes),
    })
    expect(result).toHaveLength(2)
  })

  it('throws a descriptive error on a non-ok response', async () => {
    await expect(
      fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', {
        apiKey: 'test-key',
        fetchImpl: mockFetch([], false, 429),
      }),
    ).rejects.toThrow('Finnhub request failed for NVDA: 429')
  })

  it('throws when no API key is available', async () => {
    await expect(
      fetchCompanyNews('NVDA', '2026-07-20', '2026-07-22', { fetchImpl: mockFetch(payload) }),
    ).rejects.toThrow('FINNHUB_API_KEY is not set')
  })
})
