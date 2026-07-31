import { describe, expect, it, vi } from 'vitest'
import { explainMove } from '~/lib/explain/explain'
import type { Article } from '~/lib/explain/types'

const articles: Article[] = [
  {
    id: 'a1',
    ticker: 'NVDA',
    publishedAt: '2026-07-21T12:00:00.000Z',
    source: 'Reuters',
    headline: 'Earnings beat',
    summary: 'Revenue up 20 percent.',
    url: 'https://example.com/1',
  },
]

function clientReturning(...toolInputs: unknown[]) {
  const create = vi.fn()
  for (const input of toolInputs) {
    create.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'report_explanation', input }],
    })
  }
  return { client: { messages: { create } }, create }
}

const baseParams = {
  ticker: 'NVDA',
  date: '2026-07-21',
  residual: 0.052,
  zScore: 3.4,
  articles,
}

describe('explainMove', () => {
  it('returns a validated explanation', async () => {
    const { client } = clientReturning({
      verdict: 'explained',
      summary: 'Beat earnings.',
      cited_article_ids: ['a1'],
      confidence: 'high',
    })
    const result = await explainMove({ ...baseParams, client })
    expect(result).toEqual({
      verdict: 'explained',
      summary: 'Beat earnings.',
      citedArticleIds: ['a1'],
      confidence: 'high',
    })
  })

  it('uses the claude-sonnet-5 model', async () => {
    const { client, create } = clientReturning({
      verdict: 'no_driver',
      summary: 'Nothing found.',
      cited_article_ids: [],
      confidence: 'low',
    })
    await explainMove({ ...baseParams, client })
    expect(create.mock.calls[0][0].model).toBe('claude-sonnet-5')
  })

  it('forces the report_explanation tool so output is always schema-valid', async () => {
    const { client, create } = clientReturning({
      verdict: 'no_driver',
      summary: 'Nothing found.',
      cited_article_ids: [],
      confidence: 'low',
    })
    await explainMove({ ...baseParams, client })
    expect(create.mock.calls[0][0].tool_choice).toEqual({
      type: 'tool',
      name: 'report_explanation',
    })
  })

  it('retries once when the model invents a citation', async () => {
    const { client, create } = clientReturning(
      { verdict: 'explained', summary: 'Bad.', cited_article_ids: ['a9'], confidence: 'high' },
      { verdict: 'explained', summary: 'Good.', cited_article_ids: ['a1'], confidence: 'high' },
    )
    const result = await explainMove({ ...baseParams, client })
    expect(create).toHaveBeenCalledTimes(2)
    expect(result.summary).toBe('Good.')
  })

  it('falls back to no_driver when the retry also invents a citation', async () => {
    const { client } = clientReturning(
      { verdict: 'explained', summary: 'Bad.', cited_article_ids: ['a9'], confidence: 'high' },
      { verdict: 'explained', summary: 'Still bad.', cited_article_ids: ['a8'], confidence: 'high' },
    )
    const result = await explainMove({ ...baseParams, client })
    expect(result.verdict).toBe('no_driver')
    expect(result.citedArticleIds).toEqual([])
  })

  it('returns no_driver without calling the model when no articles were retrieved', async () => {
    const { client, create } = clientReturning({})
    const result = await explainMove({ ...baseParams, articles: [], client })
    expect(create).not.toHaveBeenCalled()
    expect(result.verdict).toBe('no_driver')
  })
})
