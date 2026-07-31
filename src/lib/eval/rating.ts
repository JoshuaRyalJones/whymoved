export type Rating = 'correct' | 'plausible_unverified' | 'wrong'

export const VALID_RATINGS: Rating[] = ['correct', 'plausible_unverified', 'wrong']

export function parseRatingPayload(body: unknown): { explanationId: string; rating: Rating } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('body must be an object')
  }

  const { explanationId, rating } = body as Record<string, unknown>

  if (typeof explanationId !== 'string' || explanationId.length === 0) {
    throw new Error('explanationId is required')
  }
  if (typeof rating !== 'string' || !VALID_RATINGS.includes(rating as Rating)) {
    throw new Error(`rating must be one of: ${VALID_RATINGS.join(', ')}`)
  }

  return { explanationId, rating: rating as Rating }
}
