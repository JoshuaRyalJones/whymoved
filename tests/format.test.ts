import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatLongDate,
  formatPercent,
  formatSigma,
  labelText,
} from '~/lib/format'

describe('formatLongDate', () => {
  it('renders an ISO date in long form, fixed to UTC', () => {
    expect(formatLongDate('2026-07-29')).toBe('29 July 2026')
  })

  it('does not shift the day across timezone boundaries', () => {
    expect(formatLongDate('2026-01-01')).toBe('1 January 2026')
  })
})

describe('formatPercent', () => {
  it('signs positive values', () => {
    expect(formatPercent(0.0523)).toBe('+5.23%')
  })

  it('signs negative values', () => {
    expect(formatPercent(-0.0104)).toBe('-1.04%')
  })

  it('renders zero without a negative sign', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })
})

describe('formatCurrency', () => {
  it('formats a positive amount with a sign', () => {
    expect(formatCurrency(1234.5, 'CAD')).toBe('+$1,234.50')
  })

  it('formats a negative amount with a sign', () => {
    expect(formatCurrency(-89.1, 'USD')).toBe('-$89.10')
  })
})

describe('labelText', () => {
  it('maps each label to human-readable text', () => {
    expect(labelText('idiosyncratic')).toBe('Unusual move')
    expect(labelText('moved_with_market')).toBe('Moved with market')
    expect(labelText('normal_noise')).toBe('Normal noise')
  })
})

describe('formatSigma', () => {
  it('renders a signed sigma figure to one decimal', () => {
    expect(formatSigma(3.42)).toBe('+3.4σ')
    expect(formatSigma(-2.17)).toBe('-2.2σ')
  })
})
