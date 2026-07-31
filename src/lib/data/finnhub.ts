import type { Article } from '~/lib/explain/types'

const BASE_URL = 'https://finnhub.io/api/v1/company-news'
const DEFAULT_MAX_ARTICLES = 15

interface FinnhubRow {
  datetime: number
  source: string
  headline: string
  summary: string
  url: string
}

export interface NewsOptions {
  apiKey?: string
  fetchImpl?: typeof fetch
  maxArticles?: number
}

export async function fetchCompanyNews(
  ticker: string,
  from: string,
  to: string,
  options: NewsOptions = {},
): Promise<Article[]> {
  const apiKey = options.apiKey ?? process.env.FINNHUB_API_KEY
  if (!apiKey) throw new Error('FINNHUB_API_KEY is not set')

  const doFetch = options.fetchImpl ?? fetch
  const maxArticles = options.maxArticles ?? DEFAULT_MAX_ARTICLES
  const url = `${BASE_URL}?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`

  const response = await doFetch(url)
  if (!response.ok) {
    throw new Error(`Finnhub request failed for ${ticker}: ${response.status}`)
  }

  const rows = (await response.json()) as FinnhubRow[]
  const seenUrls = new Set<string>()
  const articles: Article[] = []

  for (const row of rows) {
    if (seenUrls.has(row.url)) continue
    seenUrls.add(row.url)
    articles.push({
      id: `a${articles.length + 1}`,
      ticker,
      publishedAt: new Date(row.datetime * 1000).toISOString(),
      source: row.source,
      headline: row.headline,
      summary: row.summary,
      url: row.url,
    })
    if (articles.length >= maxArticles) break
  }

  return articles
}
