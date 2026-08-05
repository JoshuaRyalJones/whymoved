# whymoved

Explains why a stock portfolio moved on a given day and, more importantly, admits when there is no explanation.

> **Status:** in active development. The attribution engine is being built first; the metrics table below stays unpopulated until the pipeline has run for real. No numbers in this README are invented.

## The problem with AI finance tools

Ask a language model why a stock dropped two percent and it will always tell you something. It will sound reasonable. It will usually be invented, because most daily moves are market beta and ordinary variance, not news.

That failure mode is the whole reason this project exists. **The hard problem is knowing when there is no explanation.**

## How this is different

Attribution is computed arithmetically before any AI is involved. Each holding's return is split into a market component and an idiosyncratic residual:

```
r_i(t)   = adjClose_i(t) / adjClose_i(t-1) - 1     holding return
β_i      = Cov(r_i, r_m) / Var(r_m)                over 252 trailing days
ε_i(t)   = r_i(t) - β_i · r_m(t)                   idiosyncratic residual
z_i(t)   = ε_i(t) / σ(ε_i)
```

A language model is consulted **only** when `|z| ≥ 2.0` — when the residual exceeds two standard deviations of that holding's own typical residual movement. Everything else is labelled by arithmetic alone:

| Condition | Label | LLM called? |
|---|---|---|
| `\|z\| ≥ 2.0` | `idiosyncratic` | yes |
| `\|z\| < 2.0`, market component dominates | `moved_with_market` | no |
| `\|z\| < 2.0`, residual dominates | `normal_noise` | no |

On a normal day, most holdings never reach a model at all. The statistical gate is simultaneously the honesty mechanism and the cost control.

### The citation guarantee

When the model *is* consulted, it receives the residual's size and direction plus a capped set of tickertagged news articles, each with a locally assigned ID (`a1`, `a2`, …). It must cite those IDs.

**Every citation is verified against the retrieved set in code before it can be displayed.** Not by prompting — by a setmembership check. A fabricated citation triggers one retry, then falls back to *"no identifiable driver."*

`no_driver` is a success case, not a failure. A tool that manufactures a story every day is worse than no tool.

### Design decisions worth naming

 **Prior day weights.** Contributions use `V_i(t-1) × r_i(t)`, so per holding dollar contributions sum *exactly* to portfolio P&L. No plug figure.
- **Beta excludes the day being classified.** Including it would let an unusual move inflate the baseline it is measured against.
- **Per currency benchmarks.** CAD holdings against XIC (S&P/TSX Composite), USD against SPY. Benchmarking a Canadian bank against the S&P 500 produces a residual that is mostly just Canada.
- **Thin history is not confidence.** Fewer than 60 observations → `β = 1`, flagged low confidence, and *never* eligible for an LLM call.
- **Native currency returns.** Explanations are about the business, not the exchange rate. FX is reported as its own portfolio-level line.
- **Same day trades break the identity.** When quantity changes between snapshots, that day's attribution is marked `approximate` and excluded from eval rather than quietly reported.

## Measured results

Run `npm run eval` to reproduce these from the live database.

| Metric | Value |
|---|---|
| Total holding days analyzed | _not yet measured_ |
| Flagged as idiosyncratic | _not yet measured_ |
| Returned "no driver" | _not yet measured_ |
| Citation validity | _not yet measured_ |
| Human rated accuracy (n ≥ 50) | _not yet measured_ |

Every explanation is stored and rated `correct` / `plausible_unverified` / `wrong`. Publishing measured accuracy rather than claimed accuracy is the point of the project, so this table stays empty until the numbers are real.

## Architecture

```
PortfolioSource ──> Ingest ──> Attribution ──> Explanation ──> Dashboard
 (manual/CSV/       prices     (deterministic)  (LLM, gated)     (Next.js)
  SnapTrade/demo)   + news
```

Holdings arrive through a single `PortfolioSource` interface with four interchangeable implementations — manual entry, Wealthsimple CSV (the only path that reaches managed accounts), SnapTrade auto-sync, and a seeded demo portfolio. The engine never knows which one produced the holdings.

All monetary and return math lives in pure functions under `src/lib/attribution/` — no network, no database, no clock. That is what makes the gate testable.

```
src/lib/
  attribution/   returns, beta, classification, benchmarks   (pure, unit tested)
  sources/       manual, csv, snaptrade, demo
  data/          tiingo (prices), finnhub (news)
  explain/       prompt, citation validation, Claude call
  pipeline/      nightly orchestration
```

## Stack

Next.js 16 (App Router), TypeScript, Tailwind, Vitest, Supabase (Postgres + Auth), Vercel + Vercel Cron, Tiingo (EOD prices), Finnhub (company news), Claude Sonnet 5, SnapTrade (brokerage sync).

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm test                     # attribution engine test suite
npm run dev
```

The attribution core runs with no API keys at all — `npm test` exercises it against fixtures.

## What this is not

Not investment advice. No recommendations, no buy/sell signals, no trade execution. Read-only and explanatory throughout — the app never receives or stores brokerage credentials.

## License

MIT
