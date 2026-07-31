import Anthropic from '@anthropic-ai/sdk'
import { EXPLANATION_TOOL, buildExplanationPrompt } from './prompt'
import type { Article, Explanation } from './types'
import { NO_DRIVER_FALLBACK, validateCitations } from './validate'

const MODEL = 'claude-sonnet-5'

// Sonnet 5 runs adaptive thinking when `thinking` is omitted, and max_tokens
// caps thinking *plus* the tool output. The structured result is tiny, but a
// 1024 ceiling risks truncating mid-turn once thinking is counted.
const MAX_TOKENS = 4096

interface ToolUseBlock {
  type: string
  name?: string
  input?: Record<string, unknown>
}

interface MessageResponse {
  content: ToolUseBlock[]
}

interface MessagesClient {
  messages: { create: (body: Record<string, unknown>) => Promise<MessageResponse> }
}

export interface ExplainParams {
  ticker: string
  date: string
  residual: number
  zScore: number
  articles: Article[]
  client?: MessagesClient
}

function extractToolInput(response: MessageResponse): Record<string, unknown> | null {
  const block = response.content.find(
    (b) => b.type === 'tool_use' && b.name === EXPLANATION_TOOL.name,
  )
  return block?.input ?? null
}

function toExplanation(input: Record<string, unknown>): Explanation {
  return {
    verdict: input.verdict as Explanation['verdict'],
    summary: String(input.summary ?? ''),
    citedArticleIds: (input.cited_article_ids as string[]) ?? [],
    confidence: input.confidence as Explanation['confidence'],
  }
}

export async function explainMove(params: ExplainParams): Promise<Explanation> {
  if (params.articles.length === 0) return NO_DRIVER_FALLBACK

  const client = params.client ?? (new Anthropic() as unknown as MessagesClient)
  const prompt = buildExplanationPrompt(params)

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: [EXPLANATION_TOOL],
    tool_choice: { type: 'tool', name: EXPLANATION_TOOL.name },
    messages: [{ role: 'user', content: prompt }],
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create(body)
    const input = extractToolInput(response)
    if (!input) continue

    const explanation = toExplanation(input)
    const { valid, invalidIds } = validateCitations(explanation.citedArticleIds, params.articles)
    if (valid) return explanation

    console.warn(
      `Rejected explanation for ${params.ticker} on ${params.date}: invented citations ${invalidIds.join(', ')}`,
    )
  }

  return NO_DRIVER_FALLBACK
}
