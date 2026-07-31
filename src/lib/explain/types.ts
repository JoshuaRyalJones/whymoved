export interface Article {
  id: string
  ticker: string
  publishedAt: string
  source: string
  headline: string
  summary: string
  url: string
}

export type Verdict = 'explained' | 'partial' | 'no_driver'

export interface Explanation {
  verdict: Verdict
  summary: string
  citedArticleIds: string[]
  confidence: 'high' | 'medium' | 'low'
}
