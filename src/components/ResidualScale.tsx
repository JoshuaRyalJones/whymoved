import { formatSigma } from '~/lib/format'

const WIDTH = 78
const HEIGHT = 18
const MID_X = WIDTH / 2
const MID_Y = HEIGHT / 2
const DOMAIN = 4 // the track spans -4 sigma to +4 sigma
const HALF_TRACK = 36

function xFor(z: number): number {
  const clamped = Math.max(-DOMAIN, Math.min(DOMAIN, z))
  return MID_X + (clamped / DOMAIN) * HALF_TRACK
}

/**
 * The significance gate, drawn.
 *
 * A hairline track from -4 to +4 sigma with ticks marking the +/-2 gate, and a
 * dot at this holding's residual z-score. Read down a column of these and the
 * product's central claim is visible without reading a single number: almost
 * nothing crosses the line.
 */
export function ResidualScale({ zScore, threshold = 2 }: { zScore: number; threshold?: number }) {
  const flagged = Math.abs(zScore) >= threshold
  const beyondDomain = Math.abs(zScore) > DOMAIN

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Residual ${formatSigma(zScore)}, ${
        flagged ? 'beyond' : 'within'
      } the ${threshold} sigma threshold`}
      className="overflow-visible"
    >
      <line
        x1={MID_X - HALF_TRACK}
        y1={MID_Y}
        x2={MID_X + HALF_TRACK}
        y2={MID_Y}
        stroke="var(--rule-strong)"
        strokeWidth="1"
      />

      {[-threshold, threshold].map((t) => (
        <line
          key={t}
          x1={xFor(t)}
          y1={MID_Y - 5}
          x2={xFor(t)}
          y2={MID_Y + 5}
          stroke="var(--rule-strong)"
          strokeWidth="1"
        />
      ))}

      {/* A holding pinned to the edge of the track is off the scale, not at 4 sigma.
          The caret says so rather than quietly lying about the magnitude. */}
      {beyondDomain && (
        <path
          d={
            zScore > 0
              ? `M ${MID_X + HALF_TRACK + 4} ${MID_Y} l -4 -3.5 l 0 7 z`
              : `M ${MID_X - HALF_TRACK - 4} ${MID_Y} l 4 -3.5 l 0 7 z`
          }
          fill="var(--flag)"
        />
      )}

      <circle
        cx={xFor(zScore)}
        cy={MID_Y}
        r={flagged ? 3.5 : 2.5}
        fill={flagged ? 'var(--flag)' : 'var(--ink-faint)'}
      />
    </svg>
  )
}
