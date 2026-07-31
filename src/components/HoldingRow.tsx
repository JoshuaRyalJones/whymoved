import Link from 'next/link'
import type { HoldingResult } from '~/lib/pipeline/daily'
import { formatCurrency, formatPercent, formatSigma } from '~/lib/format'
import { LabelBadge } from './LabelBadge'
import { ResidualScale } from './ResidualScale'

export function HoldingRow({
  holding,
  date,
  rank,
}: {
  holding: HoldingResult
  date: string
  rank: number
}) {
  const dollars = holding.contribution.contributionDollars
  const flagged = holding.classification.label === 'idiosyncratic'
  const tone = dollars >= 0 ? 'text-gain' : 'text-loss'

  return (
    <Link
      href={`/holding/${holding.ticker}?date=${date}`}
      className={`group -mx-3 flex items-center gap-4 border-b border-rule px-3 py-4 transition-colors hover:bg-paper-raised ${
        flagged ? 'border-l-2 border-l-flag' : 'border-l-2 border-l-transparent'
      }`}
    >
      {/* The list is ordered by absolute dollar impact, so the ordinal is
          information rather than decoration. */}
      <span className="eyebrow tnum w-5 shrink-0 text-ink-faint">
        {String(rank).padStart(2, '0')}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[0.9375rem] font-medium tracking-tight text-ink group-hover:underline group-hover:underline-offset-4">
          {holding.ticker}
        </span>
        <span className="mt-0.5 flex items-baseline gap-2">
          <LabelBadge label={holding.classification.label} />
          <span className="eyebrow tnum text-ink-faint sm:hidden">
            {formatSigma(holding.classification.zScore)}
          </span>
        </span>
      </span>

      <span className="hidden shrink-0 sm:block">
        <ResidualScale zScore={holding.classification.zScore} />
      </span>

      <span className="w-28 shrink-0 text-right">
        <span className={`block font-mono text-[0.9375rem] tnum ${tone}`}>
          {formatCurrency(dollars, 'CAD')}
        </span>
        <span className="mt-0.5 block font-mono text-xs tnum text-ink-muted">
          {formatPercent(holding.contribution.holdingReturn)}
        </span>
      </span>
    </Link>
  )
}
