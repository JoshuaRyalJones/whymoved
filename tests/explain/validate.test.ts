import { describe, expect, it } from 'vitest'
import { NO_DRIVER_FALLBACK, validateCitations } from '~/lib/explain/validate'
import type { Article } from '~/lib/explain/types'

const articles: Article[] = [
  {
    id: 'a1',
    ticker: 'NVDA',
    publishedAt: '2026-07-21T12:00:00.000Z',
    source: 'Reuters',
    headline: 'Beat',
    summary: '',
    url: 'https://example.com/1',
  },
  {
    id: 'a2',
    ticker: 'NVDA',
    publishedAt: '2026-07-21T13:00:00.000Z',
    source: 'Bloomberg',
    headline: 'Upgrade',
    summary: '',
    url: 'https://example.com/2',
  },
]

describe('validateCitations', () => {
  it('accepts citations that all exist in the retrieved set', () => {
    expect(validateCitations(['a1', 'a2'], articles)).toEqual({ valid: true, invalidIds: [] })
  })

  it('accepts an empty citation list', () => {
    expect(validateCitations([], articles)).toEqual({ valid: true, invalidIds: [] })
  })

  it('rejects an invented citation and names it', () => {
    expect(validateCitations(['a1', 'a9'], articles)).toEqual({
      valid: false,
      invalidIds: ['a9'],
    })
  })

  it('rejects every citation when the retrieved set is empty', () => {
    expect(validateCitations(['a1'], [])).toEqual({ valid: false, invalidIds: ['a1'] })
  })
})

describe('NO_DRIVER_FALLBACK', () => {
  it('is a no_driver verdict with no citations', () => {
    expect(NO_DRIVER_FALLBACK.verdict).toBe('no_driver')
    expect(NO_DRIVER_FALLBACK.citedArticleIds).toEqual([])
  })
})
