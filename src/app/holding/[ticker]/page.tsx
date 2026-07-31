import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LabelBadge } from '~/components/LabelBadge'
import { ResidualScale } from '~/components/ResidualScale'
import { runDemoPipeline } from '~/lib/demo/run'
import { formatCurrency, formatLongDate, formatPercent, formatSigma } from '~/lib/format'
import { DEMO_ARTICLES, DEMO_DATE } from '~/lib/sources/demoMarket'

export default async function HoldingPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params
  const symbol = decodeURIComponent(ticker).toUpperCase()

  const result = await runDemoPipeline()
  const holding = result.holdings.find((h) => h.ticker === symbol)
  if (!holding) notFound()

  const { classification, contribution, explanation } = holding
  const flagged = classification.label === 'idiosyncratic'
  const articles = DEMO_ARTICLES[symbol] ?? []
  const cited = new Set(explanation?.citedArticleIds ?? [])

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/demo" className="eyebrow transition-colors hover:text-ink">
        ← Demo portfolio
      </Link>

      <p className="eyebrow mt-10">{formatLongDate(DEMO_DATE)}</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">{symbol}</h1>

      <div className="mt-4 flex items-center gap-4">
        <LabelBadge label={classification.label} />
        <ResidualScale zScore={classification.zScore} />
      </div>

      {/* The decomposition is the whole argument: return splits into the part
          the market explains and the part it does not. */}
      <section className="mt-14" aria-label="Return decomposition">
        <p className="eyebrow border-b border-rule-strong pb-2">Decomposition</p>

        <dl className="mt-1">
          <Line
            term="Holding return"
            value={formatPercent(contribution.holdingReturn)}
            note={`${formatCurrency(contribution.contributionDollars, 'CAD')} of portfolio P&L`}
          />
          <Line
            term="Market component"
            value={formatPercent(classification.marketComponent)}
            note={`Explained by exposure to ${holding.benchmarkTicker}`}
          />
          <Line
            term="Residual"
            value={formatPercent(classification.residual)}
            note={`${formatSigma(classification.zScore)} against this holding's own typical residual`}
            emphasis={flagged}
          />
        </dl>
      </section>

      <section className="mt-14" aria-label="Explanation">
        <p className="eyebrow border-b border-rule-strong pb-2">
          {flagged ? 'Explanation' : 'Why there is no explanation'}
        </p>

        {!flagged && (
          <p className="mt-5 max-w-[54ch] font-display text-xl leading-[1.5]">
            This move stayed inside the ±2σ threshold, so no model was consulted and no news was
            retrieved. A day like this one has no story worth telling, and inventing one would make
            the tool less useful, not more.
          </p>
        )}

        {flagged && explanation && (
          <>
            <p className="eyebrow mt-5 text-flag">
              {explanation.verdict.replace('_', ' ')} · {explanation.confidence} confidence
            </p>
            <p className="mt-3 max-w-[54ch] font-display text-xl leading-[1.5]">
              {explanation.summary}
            </p>

            <p className="eyebrow mt-10">
              Cited sources ({cited.size} of {articles.length} retrieved)
            </p>
            <ul className="mt-3">
              {articles.map((article) => {
                const isCited = cited.has(article.id)
                return (
                  <li
                    key={article.id}
                    className={`border-b border-rule py-4 ${isCited ? '' : 'opacity-55'}`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`eyebrow shrink-0 ${isCited ? 'text-flag' : 'text-ink-faint'}`}
                      >
                        {isCited ? article.id : 'not cited'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] leading-snug text-ink">{article.headline}</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                          {article.summary}
                        </p>
                        <p className="eyebrow mt-2">{article.source}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <p className="mt-6 max-w-[54ch] text-sm leading-relaxed text-ink-muted">
              Every cited identifier above was checked against the retrieved set in code before this
              page rendered. A citation the model invented cannot appear here — it triggers one
              retry, then falls back to &ldquo;no identifiable driver&rdquo;.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

function Line({
  term,
  value,
  note,
  emphasis = false,
}: {
  term: string
  value: string
  note: string
  emphasis?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-6 border-b border-rule py-4 ${
        emphasis ? 'border-l-2 border-l-flag -ml-3 pl-3' : ''
      }`}
    >
      <div className="min-w-0">
        <dt className="text-[0.9375rem] text-ink">{term}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{note}</dd>
      </div>
      <dd
        className={`shrink-0 font-mono text-lg tnum ${emphasis ? 'text-flag' : 'text-ink'}`}
      >
        {value}
      </dd>
    </div>
  )
}
