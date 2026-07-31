import type { Article } from './types'

export const EXPLANATION_TOOL = {
  name: 'report_explanation',
  description: 'Report whether the retrieved news explains the observed idiosyncratic move.',
  input_schema: {
    type: 'object' as const,
    properties: {
      verdict: {
        type: 'string',
        enum: ['explained', 'partial', 'no_driver'],
        description:
          'explained: articles account for direction and magnitude. partial: articles are relevant but do not account for the magnitude. no_driver: nothing in the set explains the move.',
      },
      summary: {
        type: 'string',
        description: 'One or two sentences, plain language, no speculation beyond the articles.',
      },
      cited_article_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of articles that support the summary. Empty for no_driver.',
      },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['verdict', 'summary', 'cited_article_ids', 'confidence'],
  },
}

export interface PromptParams {
  ticker: string
  date: string
  residual: number
  zScore: number
  articles: Article[]
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${(Math.abs(value) * 100).toFixed(2)}%`
}

export function buildExplanationPrompt(params: PromptParams): string {
  const { ticker, date, residual, zScore, articles } = params

  const articleBlock =
    articles.length === 0
      ? '(no articles were retrieved)'
      : articles
          .map(
            (a) =>
              `[${a.id}] ${a.publishedAt.slice(0, 10)} — ${a.source}: ${a.headline}\n    ${a.summary}`,
          )
          .join('\n')

  return `On ${date}, ${ticker} moved ${formatPercent(residual)} beyond what its market exposure explains. That is ${zScore.toFixed(2)} standard deviations from its typical idiosyncratic movement.

Retrieved news articles:
${articleBlock}

Decide whether these articles explain the move.

Rules:
- Cite only article IDs from the list above. Never invent an ID.
- An article must plausibly explain both the DIRECTION and the MAGNITUDE of the move to justify "explained".
- If the articles are routine coverage, unrelated, or too minor for a move this size, the correct answer is "no_driver". Returning "no_driver" is a correct and valuable outcome, not a failure.
- Do not speculate about causes not present in the articles.
- Do not give investment advice or any view on what the reader should do.`
}
