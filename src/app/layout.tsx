import type { Metadata } from 'next'
import Link from 'next/link'
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import './globals.css'

// Newsreader carries the editorial voice; Plex Sans and Plex Mono come from a
// data-tooling lineage and give the tabular figures a ledger needs.
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'whymoved — why your portfolio moved, and when nothing did',
  description:
    'Per-holding dollar attribution computed arithmetically. A language model is consulted only when a holding moves more than two standard deviations beyond its market exposure.',
}

const NAV = [
  { href: '/demo', label: 'Demo' },
  { href: '/methodology', label: 'Methodology' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 py-5">
            <Link href="/" className="font-display text-lg tracking-tight text-ink">
              whymoved
            </Link>
            <nav className="flex gap-6">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="eyebrow transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-3xl px-6 py-8">
            <p className="text-sm leading-relaxed text-ink-muted">
              Not investment advice. No recommendations, no signals, no trading — read-only and
              explanatory throughout.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
