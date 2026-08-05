import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  fileURLToPath(new URL('../../supabase/migrations/0001_initial.sql', import.meta.url)),
  'utf8',
)

const rlsSql = readFileSync(
  fileURLToPath(new URL('../../supabase/migrations/0002_rls_lockdown.sql', import.meta.url)),
  'utf8',
)

const allSql = `${sql}\n${rlsSql}`

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

describe('rls lockdown migration', () => {
  // Every table in `public` is reachable through PostgREST with the anon key, so
  // a table without RLS is world-writable. Leaving explanation_citations open
  // would let rows be inserted around validateCitations(), which is the one
  // guarantee this project cannot afford to lose.
  it.each(EXPECTED_TABLES)('leaves no table in public without RLS: %s', (table) => {
    expect(allSql).toContain(`alter table ${table} enable row level security`)
  })

  it('grants no write policy to the reference tables', () => {
    for (const table of ['securities', 'price_history', 'betas', 'articles']) {
      expect(rlsSql).not.toContain(`create policy ${table}`)
    }
  })
})
