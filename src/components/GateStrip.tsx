import { formatSigma } from '~/lib/format'

const W = 560
const H = 104
const AXIS_Y = 62
const MID = W / 2
const HALF = 236
const DOMAIN = 4

function xFor(z: number): number {
  const clamped = Math.max(-DOMAIN, Math.min(DOMAIN, z))
  return MID + (clamped / DOMAIN) * HALF
}

/**
 * The landing hero: every holding in the demo portfolio plotted against the
 * significance gate. The cluster inside the ticks is the product's argument —
 * on a normal day almost nothing has a story, and the tool says so.
 */
export function GateStrip({
  holdings,
  threshold = 2,
}: {
  holdings: { ticker: string; zScore: number }[]
  threshold?: number
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Residual z-scores for ${holdings.length} holdings against a ${threshold} sigma threshold. ${holdings
        .map((h) => `${h.ticker} ${formatSigma(h.zScore)}`)
        .join(', ')}.`}
    >
      <line
        x1={MID - HALF}
        y1={AXIS_Y}
        x2={MID + HALF}
        y2={AXIS_Y}
        stroke="var(--rule-strong)"
        strokeWidth="1"
      />

      {[-threshold, threshold].map((t) => (
        <g key={t}>
          <line
            x1={xFor(t)}
            y1={AXIS_Y - 13}
            x2={xFor(t)}
            y2={AXIS_Y + 13}
            stroke="var(--rule-strong)"
            strokeWidth="1"
          />
          <text
            x={xFor(t)}
            y={AXIS_Y + 30}
            textAnchor="middle"
            className="fill-[var(--ink-faint)] font-mono text-[11px]"
          >
            {t > 0 ? '+' : '−'}
            {threshold}σ
          </text>
        </g>
      ))}

      {holdings.map((h) => {
        const flagged = Math.abs(h.zScore) >= threshold
        const x = xFor(h.zScore)
        return (
          <g key={h.ticker}>
            {flagged && (
              <>
                <text
                  x={x}
                  y={AXIS_Y - 26}
                  textAnchor="middle"
                  className="fill-[var(--flag)] font-mono text-[12px] font-medium"
                >
                  {h.ticker}
                </text>
                <line
                  x1={x}
                  y1={AXIS_Y - 20}
                  x2={x}
                  y2={AXIS_Y - 7}
                  stroke="var(--flag)"
                  strokeWidth="1"
                />
              </>
            )}
            <circle
              cx={x}
              cy={AXIS_Y}
              r={flagged ? 5 : 3.5}
              fill={flagged ? 'var(--flag)' : 'var(--ink-faint)'}
            />
          </g>
        )
      })}
    </svg>
  )
}
