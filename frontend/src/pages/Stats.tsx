import { useState, useEffect } from 'react'
import { getMonthlyStats } from '../api'

function fmtBrl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function Stats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMonthlyStats>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    setLoading(true)
    setErr(null)
    getMonthlyStats(year, month)
      .then(setStats)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }, [year, month])

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const total = stats?.total ?? 0
  const byCat = stats?.by_category ?? []

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-diane-cream">Cherry pie</h1>
      <p className="text-diane-mute mt-1 font-mono text-sm">Gastos do mês por categoria</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg bg-diane-surface border border-diane-border px-3 py-2 text-diane-cream"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg bg-diane-surface border border-diane-border px-3 py-2 text-diane-cream"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {err && <p className="mt-4 text-diane-danger">Erro: {err}</p>}
      {loading && <p className="mt-4 text-diane-mute">Carregando…</p>}

      {!loading && !err && (
        <>
          <div className="mt-6 rounded-2xl bg-diane-surface border border-diane-border p-6">
            <h2 className="text-sm font-medium text-diane-mute uppercase tracking-wider">
              Total em {month.toString().padStart(2, '0')}/{year}
            </h2>
            <p className="mt-2 text-2xl font-semibold text-diane-accent">{fmtBrl(total)}</p>
          </div>
          <ul className="mt-6 space-y-2">
            {byCat.map((c) => {
              const pct = total > 0 ? (c.total / total) * 100 : 0
              return (
                <li
                  key={c.category_name}
                  className="flex justify-between items-center rounded-xl bg-diane-surface border border-diane-border px-4 py-3 text-diane-cream"
                >
                  <div className="flex-1 min-w-0">
                    <span>{c.category_name}</span>
                    <span className="ml-2 text-diane-mute text-sm">{pct.toFixed(0)}%</span>
                  </div>
                  <span className="font-mono shrink-0 ml-2 text-diane-accent">{fmtBrl(c.total)}</span>
                </li>
              )
            })}
          </ul>
          {byCat.length === 0 && (
            <p className="mt-6 text-diane-mute">Nenhum gasto neste mês.</p>
          )}
        </>
      )}
    </div>
  )
}
