# whymoved — Design Spec

**Date:** 2026-07-27
**Status:** Approved for planning
**Working name:** `whymoved` (placeholder)

## Problem

When a portfolio moves, retail investors have no good way to find out *why*. Brokerages show the number and nothing else. Finance media explains the market, not your holdings. The gap is personal attribution: which of *my* positions drove *my* P&L today, and was there a real reason or was it noise?

Existing AI finance tools answer this badly, because an LLM asked "why did this stock drop 2%?" will always produce a confident answer. Most daily moves have no story — they are market beta and normal variance. A tool that invents a narrative every day is worse than no tool.

## Core insight

**The hard problem is knowing when there is no explanation.**

This drives the whole architecture. Attribution is computed deterministically first; the LLM is only invoked for moves that are statistically unusual after removing market effects. Everything else gets a factual label with no AI involvement. The gate is simultaneously the honesty mechanism and the cost control.

## Users

- **Primary:** the author, tracking a self-directed Wealthsimple Trade portfolio.
- **Secondary:** up to ~5 invited users (SnapTrade free tier ceiling), providing real feedback and eval ratings.
- **Tertiary:** recruiters and hiring managers, who reach a public demo portfolio with no account.

## Goals

1. Answer "why did my portfolio move today?" with per-holding dollar attribution that sums exactly to the total.
2. Distinguish market-driven moves from idiosyncratic ones, statistically rather than by vibes.
3. For idiosyncratic moves only, produce an explanation grounded in cited news articles — or state honestly that no driver was found.
4. Publish measured accuracy, not claimed accuracy.

## Non-goals

Explicitly out of scope, and documented as decisions rather than omissions:

- **Stock recommendations or buy/sell signals.** Regulated as investment advice in Canada; also the weakest possible use of an LLM.
- **Trade execution.** Read-only throughout.
- Email digests and push alerts (v2 — the pipeline supports it, the UI doesn't need it).
- Forward-looking "pre-brief" of upcoming catalysts (v2).
- Sector/factor decomposition beyond a single market beta.
- Tax reporting, performance benchmarking, goal tracking.
- Mobile app.

## Architecture

Four stages, run by one nightly job, plus a read-only web UI.

```
PortfolioSource ──> Ingest ──> Attribution ──> Explanation ──> Dashboard
 (manual/CSV/       prices     (deterministic)  (LLM, gated)     (Next.js)
  SnapTrade/demo)   + news
```

### Stage 1 — Portfolio sources

A single interface with four implementations. The engine never knows which one produced the holdings.

```ts
interface PortfolioSource {
  getHoldings(userId: string): Promise<Holding[]>; // { ticker, quantity, costBasis?, currency }
}
```

| Implementation | Purpose |
|---|---|
| `ManualSource` | Typed holdings. Built first — unblocks the engine while API keys are pending. |
| `CsvSource` | Wealthsimple holdings report CSV. Covers **managed accounts**, which SnapTrade cannot reach. |
| `SnapTradeSource` | Auto-sync for self-directed accounts. |
| `DemoSource` | Seeded realistic portfolio for the public demo. |

Holdings are near-static — they change only on trades. Prices refresh daily regardless of source, so manual entry is a one-time cost, not a chore.

**SnapTrade flow** (hosted portal — the app never sees brokerage credentials):

```ts
registerSnapTradeUser({ userId })                   // → userSecret (stored encrypted)
loginSnapTradeUser({ userId, userSecret, broker })  // → portal URL, redirect user
listUserAccounts({ userId, userSecret })            // → accountIds
getUserAccountPositions({ accountId, userId, userSecret })
```

### Stage 2 — Attribution engine (deterministic)

For each holding `i` on date `t`:

```
r_i(t)  = adjClose_i(t) / adjClose_i(t-1) - 1        holding return
w_i(t-1)= V_i(t-1) / V(t-1)                          prior-day weight
D_i(t)  = V_i(t-1) × r_i(t)                          dollar contribution
r_p(t)  = Σ w_i(t-1) × r_i(t)                        portfolio return
```

Prior-day weights are used deliberately so contributions sum *exactly* to the portfolio return. No plug figure.

Decompose each holding's move against a benchmark:

```
β_i     = Cov(r_i, r_m) / Var(r_m)     over trailing 252 trading days
ε_i(t)  = r_i(t) - β_i × r_m(t)        idiosyncratic residual
σ_i     = stdev(ε_i) over same window
z_i(t)  = ε_i(t) / σ_i
```

- **Benchmark selection:** US-listed → S&P 500 (SPY); Canada-listed → S&P/TSX Composite (XIC). Chosen by exchange.
- **Insufficient history:** fewer than 60 observations → set `β = 1`, mark the holding low-confidence, and never gate an LLM call on it.

**Deterministic labels** (assigned with no AI):

| Condition | Label |
|---|---|
| `\|z\| ≥ 2.0` | `idiosyncratic` — eligible for explanation |
| `\|z\| < 2.0`, market component dominant | `moved_with_market` |
| `\|z\| < 2.0`, small move | `normal_noise` |

The 2.0 threshold is configurable and its effect on flag rate is a tracked metric.

**Currency:** returns are computed in each security's native currency, so explanations are about the business, not the exchange rate. Portfolio-level P&L reports FX as its own separate contribution line. FX is not decomposed further in v1.

**Known limitation (documented, not hidden):** same-day buys or sells break the contribution identity. When quantity changes between snapshots, that day's attribution for that holding is marked `approximate` and excluded from eval.

### Stage 3 — Explanation (LLM, gated)

Runs *only* for holdings labeled `idiosyncratic`. On a typical day this is zero or one holding.

1. Retrieve ticker-tagged news over `[t-2, t]`. Dedupe, cap at 15 articles, assign each a local ID.
2. Call Claude Sonnet 5 with the residual's size and direction plus the article set. Structured output:

```json
{
  "verdict": "explained" | "partial" | "no_driver",
  "summary": "string",
  "cited_article_ids": ["a3", "a7"],
  "confidence": "high" | "medium" | "low"
}
```

3. The prompt requires that cited articles plausibly explain **both direction and magnitude**. Absent that, `no_driver` is the correct answer and is treated as a success, not a failure.
4. **Citation validation is programmatic and hard.** Every cited ID must exist in the retrieved set. A violation triggers one retry, then falls back to `no_driver` with the failure logged. A hallucinated citation can never reach the UI.

### Stage 4 — Dashboard

| Route | Contents |
|---|---|
| `/` | Landing, links to demo |
| `/demo` | Seeded portfolio, fully public, no auth |
| `/dashboard` | Today's P&L, holdings ranked by dollar contribution, labels |
| `/holding/[ticker]?date=` | Attribution breakdown, explanation, cited articles, rating widget |
| `/connect` | Portfolio source setup |
| `/methodology` | Public explanation of the math and the honesty guarantee |

## Evaluation

Every explanation is stored and rated — by the author and invited users — as `correct` / `plausible_unverified` / `wrong`.

Automated metrics, computed continuously:

- Flag rate (share of holding-days reaching the LLM)
- `no_driver` rate among flagged
- Citation validity rate
- LLM calls per portfolio-day (cost proxy)

Human metric: rated accuracy over a sample of ≥50 explanations.

These are published in the README as real numbers with the sample size stated. Measuring the system's own honesty is the project's main differentiator.

## Data model (Postgres / Supabase)

```
users, portfolio_sources
securities            (ticker, exchange, name, benchmark_ticker, currency)
holdings_snapshots    (user_id, date, ticker, quantity, price, value)
price_history         (ticker, date, close, adj_close)
betas                 (ticker, as_of, beta, resid_sigma, n_obs)
daily_attribution     (user_id, date, ticker, weight, return, contribution,
                       market_component, residual, z_score, label, approximate)
articles              (id, ticker, published_at, source, title, url, snippet)
explanations          (user_id, date, ticker, verdict, summary, confidence,
                       model, prompt_version)
explanation_citations (explanation_id, article_id)
explanation_ratings   (explanation_id, user_id, rating, note)
```

`prompt_version` is stored so eval results remain attributable after prompt changes.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind, deployed on Vercel
- Supabase — Postgres + Auth (email allowlist for invited users)
- Vercel Cron — weekdays ~17:15 ET
- Tiingo — EOD price history (1,000 req/day)
- Finnhub or Marketaux — ticker-tagged news (**decided day 1 after a spike**)
- Anthropic API — `claude-sonnet-5`
- `snaptrade-typescript-sdk`

## Risks

| Risk | Mitigation |
|---|---|
| SnapTrade production approval takes days | Apply day 1; build against free sandbox; CSV import covers the gap |
| Free-tier rate limits | Store price history locally; betas computed once per security per week |
| LLM confabulates causality | Statistical gating + hard citation validation + `no_driver` as a valid answer |
| Cash flows break attribution identity | Detect quantity changes, mark `approximate`, exclude from eval |
| Splits and dividends distort returns | Use adjusted closes throughout |
| Two-week budget slips | Sources are pluggable; SnapTrade and CSV are the last features, and dropping them still leaves a complete product |

## Two-week plan

| Days | Work |
|---|---|
| 1 | Apply for SnapTrade + data keys. Manual holdings entry. Spike Tiingo/Finnhub free tiers; pick news provider. |
| 2–4 | Attribution engine: contributions, betas, residual z-scores, deterministic labels |
| 5–7 | News retrieval, Claude explanation, citation validation |
| 8–10 | Dashboard: today view, holding drill-down, seeded demo portfolio |
| 11–12 | SnapTrade connect + CSV import |
| 13–14 | Eval run, published metrics, README, decision log, deploy |

## Success criteria

1. Per-holding dollar contributions sum to total portfolio P&L within rounding, verified by test.
2. A holding that moved purely with the market is labeled as such and consumes no LLM call.
3. A holding with a genuine news catalyst receives an explanation citing only retrieved articles.
4. A holding with an unusual move and no relevant news returns `no_driver` rather than a fabricated story.
5. The public demo is reachable and legible without an account.
6. The README publishes real measured metrics with sample sizes.
