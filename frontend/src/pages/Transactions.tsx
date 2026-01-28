import { useState, useEffect } from 'react'
import { getTransactions } from '../api'

function fmtBrl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(s: string) {
  try {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return s
  }
}

export default function Transactions() {
  const [txs, setTxs] = useState<Awaited<ReturnType<typeof getTransactions>>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [year, setYear] = useState<number | ''>('')
  const [month, setMonth] = useState<number | ''>('')

  useEffect(() => {
    setLoading(true)
    setErr(null)
    const params: { limit?: number; year?: number; month?: number } = { limit: 100 }
    if (typeof year === 'number') params.year = year
    if (typeof month === 'number') params.month = month
    getTransactions(params)
      .then(setTxs)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }, [year, month])

  const now = new Date()
  const years = [now.getFullYear(), now.getFullYear() - 1]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Transações</h1>
      <p className="text-diane-mute mt-1">Histórico de gastos e receitas</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
          className="rounded-lg bg-diane-surface border border-diane-border px-3 py-2 text-gray-100"
        >
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
          className="rounded-lg bg-diane-surface border border-diane-border px-3 py-2 text-gray-100"
        >
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
          ))}
        </select>
      </div>

      {err && <p className="mt-4 text-diane-danger">Erro: {err}</p>}
      {loading && <p className="mt-4 text-diane-mute">Carregando…</p>}

      {!loading && !err && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-diane-mute border-b border-diane-border">
                <th className="pb-2 pr-4">Data</th>
                <th className="pb-2 pr-4">Descrição</th>
                <th className="pb-2 pr-4">Categoria</th>
                <th className="pb-2 pr-4">Conta</th>
                <th className="pb-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-b border-diane-border/50">
                  <td className="py-3 pr-4 font-mono">{fmtDate(t.tx_date)}</td>
                  <td className="py-3 pr-4">{t.description}</td>
                  <td className="py-3 pr-4">{t.category_name ?? '—'}</td>
                  <td className="py-3 pr-4">{t.account_name ?? '—'}</td>
                  <td className="py-3 text-right font-mono">{fmtBrl(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && (
            <p className="py-8 text-center text-diane-mute">Nenhuma transação. Registre pelo chat.</p>
          )}
        </div>
      )}
    </div>
  )
}
