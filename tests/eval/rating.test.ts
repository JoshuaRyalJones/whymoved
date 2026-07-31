import { describe, expect, it } from 'vitest'
import { parseRatingPayload } from '~/lib/eval/rating'

describe('parseRatingPayload', () => {
  it('accepts each valid rating', () => {
    for (const rating of ['correct', 'plausible_unverified', 'wrong']) {
      expect(parseRatingPayload({ explanationId: 'e1', rating })).toEqual({
        explanationId: 'e1',
        rating,
      })
    }
  })

  it('rejects an unrecognised rating', () => {
    expect(() => parseRatingPayload({ explanationId: 'e1', rating: 'great' })).toThrow(
      'rating must be one of: correct, plausible_unverified, wrong',
    )
  })

  it('requires an explanation id', () => {
    expect(() => parseRatingPayload({ rating: 'correct' })).toThrow('explanationId is required')
  })

  it('rejects a non-object body', () => {
    expect(() => parseRatingPayload(null)).toThrow('body must be an object')
  })
})
