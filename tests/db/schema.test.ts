import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  fileURLToPath(new URL('../../supabase/migrations/0001_initial.sql', import.meta.url)),
  'utf8',
)

const EXPECTED_TABLES = [
  'securities',
  'portfolio_sources',
  'holdings_snapshots',
  'price_history',
  'betas',
  'daily_attribution',
  'articles',
  'explanations',
  'explanation_citations',
  'explanation_ratings',
]

describe('initial migration', () => {
  it.each(EXPECTED_TABLES)('creates the %s table', (table) => {
    expect(sql).toContain(`create table ${table} (`)
  })

  it('constrains labels to the three classification values', () => {
    expect(sql).toContain("label in ('idiosyncratic', 'moved_with_market', 'normal_noise')")
  })

  it('constrains verdicts to the three explanation values', () => {
    expect(sql).toContain("verdict in ('explained', 'partial', 'no_driver')")
  })

  it('records which benchmark each attribution was computed against', () => {
    expect(sql).toContain('benchmark_ticker text not null')
  })

  it('enables row level security on every user-scoped table', () => {
    for (const table of [
      'portfolio_sources',
      'holdings_snapshots',
      'daily_attribution',
      'explanations',
      'explanation_ratings',
    ]) {
      expect(sql).toContain(`alter table ${table} enable row level security`)
    }
  })
})
