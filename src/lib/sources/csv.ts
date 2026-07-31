import { normalizeHolding } from './manual'
import type { Currency, Holding, PortfolioSource } from './types'

const REQUIRED_COLUMNS = ['symbol', 'quantity', 'currency'] as const

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

export function parseWealthsimpleHoldings(csv: string): Holding[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) throw new Error('csv is empty')

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) throw new Error(`missing required column: ${column}`)
  }

  const indexOf = (column: string) => header.indexOf(column)
  const totals = new Map<string, Holding>()

  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line)
    const quantity = Number(fields[indexOf('quantity')])
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const holding = normalizeHolding({
      ticker: fields[indexOf('symbol')],
      quantity,
      currency: fields[indexOf('currency')].toUpperCase() as Currency,
    })

    const existing = totals.get(holding.ticker)
    totals.set(
      holding.ticker,
      existing ? { ...existing, quantity: existing.quantity + holding.quantity } : holding,
    )
  }

  return [...totals.values()]
}

export class CsvSource implements PortfolioSource {
  private readonly holdings: Holding[]

  constructor(csv: string) {
    this.holdings = parseWealthsimpleHoldings(csv)
  }

  async getHoldings(_userId: string): Promise<Holding[]> {
    return this.holdings
  }
}
