export const metadata = {
  title: 'Methodology — whymoved',
  description:
    'How attribution is computed, what the significance gate does, and what the tool refuses to do.',
}

function Section({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-rule pt-8">
      <p className="eyebrow">{index}</p>
      <h2 className="mt-3 font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-4 max-w-[58ch] space-y-4 text-[1.0625rem] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  )
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Methodology</p>
      <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(2.5rem,7vw,3.5rem)] leading-[1.05] tracking-[-0.02em]">
        What the number means, and when it means nothing.
      </h1>

      <div className="mt-16 space-y-14">
        <Section index="01" title="Contribution">
          <p>
            Each holding&rsquo;s dollar contribution is its prior-day value multiplied by its return
            for the day. Weights come from the prior close, not the current one, which is what makes
            the per-holding figures sum <em className="not-italic text-ink">exactly</em> to the
            portfolio&rsquo;s return. There is no plug figure and no rounding line.
          </p>
          <pre className="overflow-x-auto rounded-sm border border-rule bg-paper-raised p-4 font-mono text-[0.8125rem] leading-relaxed text-ink">
{`r_i(t)   = adjClose_i(t) / adjClose_i(t-1) - 1
D_i(t)   = V_i(t-1) × r_i(t)
r_p(t)   = Σ w_i(t-1) × r_i(t)`}
          </pre>
        </Section>

        <Section index="02" title="Splitting the move">
          <p>
            A return is not evidence of anything on its own. Most of it is usually the market. Beta
            is estimated over the trailing 252 trading days against a benchmark chosen by the
            holding&rsquo;s currency — XIC for Canadian listings, SPY for US ones. Benchmarking a
            Canadian bank against the S&amp;P 500 produces a residual that is mostly just Canada.
          </p>
          <pre className="overflow-x-auto rounded-sm border border-rule bg-paper-raised p-4 font-mono text-[0.8125rem] leading-relaxed text-ink">
{`β_i      = Cov(r_i, r_m) / Var(r_m)
ε_i(t)   = r_i(t) - β_i × r_m(t)
z_i(t)   = ε_i(t) / σ(ε_i)`}
          </pre>
          <p>
            Beta and the residual standard deviation are estimated from history that{' '}
            <em className="not-italic text-ink">excludes the day being classified</em>. Including it
            would let an unusual move inflate the very baseline it is measured against, quietly
            suppressing its own score.
          </p>
        </Section>

        <Section index="03" title="The gate">
          <p>
            A holding is only eligible for an explanation when |z| ≥ 2. Everything else is labelled
            without any AI involvement at all:
          </p>
          <div className="!mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="eyebrow pb-2 font-normal">Condition</th>
                  <th className="eyebrow pb-2 font-normal">Label</th>
                  <th className="eyebrow pb-2 text-right font-normal">Model</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[0.8125rem] tnum">
                <tr className="border-b border-rule">
                  <td className="py-3 text-ink">|z| ≥ 2.0</td>
                  <td className="py-3 text-flag">idiosyncratic</td>
                  <td className="py-3 text-right text-ink">yes</td>
                </tr>
                <tr className="border-b border-rule">
                  <td className="py-3 text-ink">|z| &lt; 2.0, market dominates</td>
                  <td className="py-3 text-ink-muted">moved_with_market</td>
                  <td className="py-3 text-right text-ink-muted">no</td>
                </tr>
                <tr className="border-b border-rule">
                  <td className="py-3 text-ink">|z| &lt; 2.0, residual dominates</td>
                  <td className="py-3 text-ink-muted">normal_noise</td>
                  <td className="py-3 text-right text-ink-muted">no</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            A holding with fewer than 60 observations of history gets β = 1, is marked
            low-confidence, and is <em className="not-italic text-ink">never</em> eligible for an
            explanation. Thin history is not the same thing as a quiet stock, and treating it as
            confidence would be the easiest way to manufacture a false story.
          </p>
        </Section>

        <Section index="04" title="The citation guarantee">
          <p>
            A flagged holding gets ticker-tagged news from the surrounding days, capped and
            deduplicated, with each article assigned a local identifier. The model must cite those
            identifiers, and must find that the articles account for both the direction and the
            magnitude of the move.
          </p>
          <p>
            Every returned citation is then checked against the retrieved set{' '}
            <em className="not-italic text-ink">in code</em> — a membership test, not an
            instruction. A citation that was not in the set triggers one retry and then falls back
            to &ldquo;no identifiable driver&rdquo;. This is why a fabricated source cannot appear
            in the interface: the check does not depend on the model choosing to behave.
          </p>
          <p>
            &ldquo;No driver found&rdquo; is recorded as a success. A tool that produces a narrative
            every single day is worse than no tool, because you cannot tell its real answers from
            its invented ones.
          </p>
        </Section>

        <Section index="05" title="Known limits">
          <p>
            Buying or selling a holding during the day breaks the contribution identity. When
            quantity changes between snapshots that day&rsquo;s attribution is marked approximate
            and excluded from evaluation, rather than reported as though it were exact.
          </p>
          <p>
            Returns are computed in each security&rsquo;s native currency so that explanations are
            about the business rather than the exchange rate. FX is reported as its own
            portfolio-level line and is not decomposed further.
          </p>
          <p>
            The market model is a single beta against one index. There is no sector or multi-factor
            decomposition, so a move driven entirely by a sector rotation will read as idiosyncratic.
          </p>
        </Section>

        <Section index="06" title="What this is not">
          <p>
            Not investment advice. No recommendations, no buy or sell signals, no trade execution,
            no price targets. The system is read-only end to end and never receives or stores
            brokerage credentials.
          </p>
        </Section>
      </div>
    </main>
  )
}
