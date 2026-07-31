import type { Article, Explanation } from './types'

export const NO_DRIVER_FALLBACK: Explanation = {
  verdict: 'no_driver',
  summary: 'No identifiable news driver was found for this move.',
  citedArticleIds: [],
  confidence: 'low',
}

export function validateCitations(
  citedIds: string[],
  articles: Article[],
): { valid: boolean; invalidIds: string[] } {
  const known = new Set(articles.map((a) => a.id))
  const invalidIds = citedIds.filter((id) => !known.has(id))
  return { valid: invalidIds.length === 0, invalidIds }
}
