const BASE_URL = 'https://api.tiingo.com/tiingo/daily'

export interface DailyPrice {
  date: string
  close: number
  adjClose: number
}

interface TiingoRow {
  date: string
  close: number
  adjClose: number
}

export interface FetchOptions {
  apiKey?: string
  fetchImpl?: typeof fetch
}

export async function fetchDailyPrices(
  ticker: string,
  startDate: string,
  endDate: string,
  options: FetchOptions = {},
): Promise<DailyPrice[]> {
  const apiKey = options.apiKey ?? process.env.TIINGO_API_KEY
  if (!apiKey) throw new Error('TIINGO_API_KEY is not set')

  const doFetch = options.fetchImpl ?? fetch
  const url = `${BASE_URL}/${encodeURIComponent(ticker)}/prices?startDate=${startDate}&endDate=${endDate}&format=json`

  const response = await doFetch(url, {
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Tiingo request failed for ${ticker}: ${response.status}`)
  }

  const rows = (await response.json()) as TiingoRow[]
  return rows.map((row) => ({
    date: row.date.slice(0, 10),
    close: row.close,
    adjClose: row.adjClose,
  }))
}

export interface DatedReturn {
  date: string
  value: number
}

/**
 * A return spans two closes and is stamped with the LATER date — the session it
 * was realised on. Callers pair a holding against its benchmark by these dates
 * rather than by array position: two series can differ in length or skip
 * different sessions, and positional pairing would silently compare a holding's
 * move to an unrelated day's market move.
 */
export function toDatedReturns(prices: DailyPrice[]): DatedReturn[] {
  if (prices.length < 2) return []
  const returns: DatedReturn[] = []
  for (let i = 1; i < prices.length; i++) {
    returns.push({
      date: prices[i].date,
      value: prices[i].adjClose / prices[i - 1].adjClose - 1,
    })
  }
  return returns
}

export function toDailyReturns(prices: DailyPrice[]): number[] {
  if (prices.length < 2) return []
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    returns.push(prices[i].adjClose / prices[i - 1].adjClose - 1)
  }
  return returns
}
