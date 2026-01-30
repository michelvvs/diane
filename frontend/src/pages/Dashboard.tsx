import { useState, useEffect } from 'react'
import { getAccounts, getMonthlyStats } from '../api'

function fmtBrl(n: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n)
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof getAccounts>>>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMonthlyStats>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    setLoading(true)
    setErr(null)
    Promise.all([getAccounts(), getMonthlyStats()])
      .then(([a, s]) => {
        if (!ok) return
        setAccounts(a)
        setStats(s)
      })
      .catch((e) => {
        if (!ok) return
        setErr((e as Error).message)
      })
      .finally(() => {
        if (ok) setLoading(false)
      })
    return () => { ok = false }
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-diane-mute">Carregando…</p>
      </div>
    )
  }
  if (err) {
    return (
      <div className="p-6">
        <p className="text-diane-danger">Erro: {err}</p>
      </div>
    )
  }

  const totalBalance = accounts.reduce((s, a) => s + a.effective_balance, 0)

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-diane-cream">
        The owls
      </h1>
      <p className="text-diane-mute mt-1 font-mono text-sm">
        Saldo total = soma (saldo inicial − gastos) de cada conta
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-diane-surface border border-diane-border p-6 bg-gradient-to-br from-diane-lodge/10 to-transparent">
          <h2 className="text-sm font-medium text-diane-mute uppercase tracking-wider font-mono">
            Saldo total
          </h2>
          <p className="mt-2 font-display text-2xl font-semibold text-diane-accent">
            {fmtBrl(totalBalance)}
          </p>
          <p className="mt-1 text-sm text-diane-mute">
            {accounts.length} conta(s) · saldo efetivo (inicial − gastos)
          </p>
        </div>
        <div className="rounded-2xl bg-diane-surface border border-diane-border p-6 bg-gradient-to-br from-diane-lodge/10 to-transparent">
          <h2 className="text-sm font-medium text-diane-mute uppercase tracking-wider font-mono">
            Gastos no mês {stats ? `${stats.month.toString().padStart(2, '0')}/${stats.year}` : ''}
          </h2>
          <p className="mt-2 font-display text-2xl font-semibold text-diane-cream">
            {stats ? fmtBrl(stats.total) : 'R$ 0,00'}
          </p>
          <p className="mt-1 text-sm text-diane-mute">
            Por categoria na página Estatísticas
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-medium text-diane-cream">Contas</h2>
        {accounts.length === 0 ? (
          <p className="text-diane-mute mt-2 font-mono text-sm">
            Nenhuma conta cadastrada. Crie em Contas ou pelo chat.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center rounded-xl bg-diane-surface border border-diane-border px-4 py-3 text-diane-cream"
              >
                <div>
                  <span>{a.name}</span>
                  {a.spending > 0 && (
                    <span className="ml-2 text-sm text-diane-mute">
                      (inicial {fmtBrl(a.balance)} − gastos {fmtBrl(a.spending)})
                    </span>
                  )}
                </div>
                <span className="font-mono text-diane-accent">
                  {fmtBrl(a.effective_balance)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
