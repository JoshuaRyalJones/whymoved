import Link from 'next/link'
import { GateStrip } from '~/components/GateStrip'
import { runDemoPipeline } from '~/lib/demo/run'

export default async function HomePage() {
  const result = await runDemoPipeline()
  const marks = result.holdings.map((h) => ({
    ticker: h.ticker,
    zScore: h.classification.zScore,
  }))

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="eyebrow">Portfolio attribution</p>

      <h1 className="mt-5 max-w-[15ch] font-display text-[clamp(2.75rem,8vw,4.25rem)] leading-[1.03] tracking-[-0.02em]">
        Most days, there is no story.
      </h1>

      <p className="mt-8 max-w-[54ch] text-[1.0625rem] leading-relaxed text-ink-muted">
        Ask a language model why a stock dropped two percent and it will always tell you something.
        It will sound reasonable. It will usually be invented, because most daily moves are market
        beta and ordinary variance, not news.
      </p>

      <figure className="mt-16">
        <GateStrip holdings={marks} />
        <figcaption className="mt-5 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
          Every holding in the demo portfolio, plotted by how far it moved beyond what its market
          exposure explains. Five sit inside the threshold and are labelled by arithmetic alone. One
          crossed it, and only that one was sent to a model.
        </figcaption>
      </figure>

      <div className="mt-16 border-t border-rule-strong pt-8">
        <p className="max-w-[54ch] font-display text-xl leading-[1.5]">
          Attribution is computed before any AI is involved. Each holding&rsquo;s return is split
          into a market component and an idiosyncratic residual, and a model is consulted only when
          that residual exceeds two standard deviations of the holding&rsquo;s own typical movement.
        </p>

        <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-relaxed text-ink-muted">
          When a model is consulted, it must ground its answer in retrieved articles and cite them.
          Every citation is verified against the retrieved set in code before it can be displayed —
          not by prompting, but by a membership check. A fabricated citation cannot reach this page.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Link
          href="/demo"
          className="font-display text-lg underline decoration-rule-strong decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
        >
          See the worked example
        </Link>
        <Link href="/methodology" className="eyebrow transition-colors hover:text-ink">
          Read the methodology
        </Link>
      </div>
    </main>
  )
}
