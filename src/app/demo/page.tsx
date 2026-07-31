import { HoldingRow } from '~/components/HoldingRow'
import { byImpact, runDemoPipeline } from '~/lib/demo/run'
import { formatCurrency, formatLongDate, formatPercent } from '~/lib/format'
import { DEMO_DATE } from '~/lib/sources/demoMarket'

export const metadata = {
  title: 'Demo portfolio — whymoved',
  description:
    'A worked example: six holdings, one unusual move, five explained by arithmetic alone.',
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']

function spell(n: number): string {
  return COUNT_WORDS[n] ?? String(n)
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default async function DemoPage() {
  const result = await runDemoPipeline()
  const ranked = byImpact(result.holdings)
  const totalDollars = ranked.reduce((sum, h) => sum + h.contribution.contributionDollars, 0)
  const quiet = result.holdings.length - result.llmCalls

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Demo portfolio · {formatLongDate(DEMO_DATE)}</p>

      <h1 className="mt-4 font-display text-[clamp(3.25rem,11vw,5rem)] leading-[0.95] tracking-[-0.02em] tnum">
        {formatPercent(result.portfolioReturn)}
      </h1>

      <p className="mt-3 font-mono text-sm tnum text-ink-muted">
        {formatCurrency(totalDollars, 'CAD')} across {spell(result.holdings.length)} holdings
      </p>

      <p className="mt-8 max-w-[46ch] font-display text-xl leading-[1.5] text-ink">
        {sentenceCase(spell(result.llmCalls))}{' '}
        {result.llmCalls === 1 ? 'holding' : 'holdings'} crossed the significance threshold today.{' '}
        {quiet === 1 ? 'The other was' : `The other ${spell(quiet)} were`} accounted for by market
        movement and ordinary variance — no model was asked about {quiet === 1 ? 'it' : 'them'}.
      </p>

      <p className="mt-6 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
        Each row carries a mark showing how far that holding moved beyond what its market exposure
        explains, on a scale of ±4σ. The two ticks are the ±2σ threshold. Only a holding past them
        is sent to a language model.
      </p>

      <section className="mt-14" aria-label="Holdings ranked by dollar contribution">
        <div className="flex items-center gap-4 border-b border-rule-strong pb-2">
          <span className="eyebrow w-5 shrink-0">#</span>
          <span className="eyebrow flex-1">Holding</span>
          <span className="eyebrow hidden w-[78px] shrink-0 text-center sm:block">Residual</span>
          <span className="eyebrow w-28 shrink-0 text-right">Contribution</span>
        </div>

        {ranked.map((holding, i) => (
          <HoldingRow key={holding.ticker} holding={holding} date={DEMO_DATE} rank={i + 1} />
        ))}
      </section>

      <div className="mt-12 border-l-2 border-rule-strong pl-4">
        <p className="eyebrow">About this page</p>
        <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-ink-muted">
          Prices and headlines here are generated from a fixed seed, not sourced from a market data
          provider, and describe no actual event. The attribution, the beta estimates, the
          thresholds and the citation check are the real production code paths — only the inputs are
          synthetic. Amounts are shown in each holding&rsquo;s native currency and are not converted
          to a common currency.
        </p>
      </div>
    </main>
  )
}
