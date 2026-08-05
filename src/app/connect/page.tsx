'use client'

import { useState } from 'react'

export default function ConnectPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function connect() {
    setPending(true)
    setStatus('Opening SnapTrade…')
    try {
      const response = await fetch('/api/snaptrade/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      })
      const body = (await response.json()) as { redirectUri?: string; error?: string }
      if (body.redirectUri) {
        window.location.href = body.redirectUri
        return
      }
      setStatus(body.error ?? 'Could not start the connection.')
    } catch {
      setStatus('Could not reach the connection service.')
    }
    setPending(false)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Connect a portfolio</p>

      <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(2.25rem,6vw,3.25rem)] leading-[1.05] tracking-[-0.02em]">
        Your credentials never touch this app.
      </h1>

      <p className="mt-8 max-w-[54ch] text-[1.0625rem] leading-relaxed text-ink-muted">
        Connecting happens on SnapTrade&rsquo;s hosted portal. This app receives a read-only handle
        to your positions and nothing else — no password, no session, and no ability to place a
        trade.
      </p>

      <div className="mt-12 border-t border-rule-strong pt-8">
        <button
          onClick={connect}
          disabled={pending}
          className="rounded-sm bg-ink px-5 py-2.5 font-display text-lg text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Connect with SnapTrade
        </button>
        {status && <p className="mt-5 text-sm leading-relaxed text-ink-muted">{status}</p>}
      </div>
    </main>
  )
}
