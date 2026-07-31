import type { MoveLabel } from '~/lib/attribution/types'
import { labelText } from '~/lib/format'

// A letterspaced caption rather than a coloured pill. Pills read as product
// chrome; this reads as an annotation, which is what it is.
const TONE: Record<MoveLabel, string> = {
  idiosyncratic: 'text-flag',
  moved_with_market: 'text-ink-muted',
  normal_noise: 'text-ink-faint',
}

export function LabelBadge({ label }: { label: MoveLabel }) {
  return <span className={`eyebrow ${TONE[label]}`}>{labelText(label)}</span>
}
