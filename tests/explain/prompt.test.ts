import { describe, expect, it } from 'vitest'
import { EXPLANATION_TOOL, buildExplanationPrompt } from '~/lib/explain/prompt'
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

describe('buildExplanationPrompt', () => {
  it('states the direction and magnitude of the residual move', () => {
    const prompt = buildExplanationPrompt({
      ticker: 'NVDA',
      date: '2026-07-21',
      residual: 0.052,
      zScore: 3.4,
      articles,
    })
    expect(prompt).toContain('NVDA')
    expect(prompt).toContain('2026-07-21')
    expect(prompt).toContain('+5.20%')
    expect(prompt).toContain('3.40')
  })

  it('lists each article with its citable ID', () => {
    const prompt = buildExplanationPrompt({
      ticker: 'NVDA',
      date: '2026-07-21',
      residual: 0.052,
      zScore: 3.4,
      articles,
    })
    expect(prompt).toContain('[a1]')
    expect(prompt).toContain('Earnings beat')
  })

  it('instructs the model that no_driver is a valid answer', () => {
    const prompt = buildExplanationPrompt({
      ticker: 'NVDA',
      date: '2026-07-21',
      residual: -0.03,
      zScore: -2.1,
      articles: [],
    })
    expect(prompt).toContain('no_driver')
  })
})

describe('EXPLANATION_TOOL', () => {
  it('constrains the verdict to the three allowed values', () => {
    const verdict = EXPLANATION_TOOL.input_schema.properties.verdict
    expect(verdict.enum).toEqual(['explained', 'partial', 'no_driver'])
  })

  it('requires every output field', () => {
    expect(EXPLANATION_TOOL.input_schema.required).toEqual([
      'verdict',
      'summary',
      'cited_article_ids',
      'confidence',
    ])
  })
})
