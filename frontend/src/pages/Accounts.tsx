import { useState, useEffect } from 'react'
import { getAccounts, createAccount, updateAccount, deleteAccount, type AccountWithStats } from '../api'

function fmtBrl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('0')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setErr(null)
    getAccounts()
      .then(setAccounts)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setCreating(true)
    setCreateErr(null)
    try {
      await createAccount(n, Number(balance) || 0)
      setName('')
      setBalance('0')
      load()
    } catch (e) {
      setCreateErr((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  function startEdit(a: AccountWithStats) {
    setCreateErr(null)
    setEditingId(a.id)
    setEditName(a.name)
    setEditBalance(String(a.balance))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditBalance('')
  }

  async function submitEdit() {
    if (editingId == null) return
    setCreateErr(null)
    try {
      await updateAccount(editingId, {
        name: editName.trim() || undefined,
        balance: editBalance.trim() ? Number(editBalance) : undefined,
      })
      cancelEdit()
      load()
    } catch (e) {
      setCreateErr((e as Error).message)
    }
  }

  async function confirmDelete(id: number) {
    try {
      await deleteAccount(id)
      setDeleteConfirmId(null)
      load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-diane-mute">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-diane-cream">Contas</h1>
      <p className="text-diane-mute mt-1 font-mono text-sm">
        Saldo efetivo = saldo inicial − gastos da conta
      </p>

      {err && (
        <p className="mt-4 text-diane-danger">Erro: {err}</p>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da conta"
          className="rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-diane-cream placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent"
          disabled={creating}
        />
        <input
          type="text"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Saldo inicial"
          className="w-36 rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-diane-cream placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-xl bg-diane-accent text-diane-cream px-4 py-2 font-medium hover:bg-diane-accentDim disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>
      {createErr && <p className="mt-2 text-sm text-diane-danger">{createErr}</p>}

      <ul className="mt-6 space-y-2">
        {accounts.map((a) => (
          <li
            key={a.id}
            className="rounded-xl bg-diane-surface border border-diane-border overflow-hidden"
          >
            {editingId === a.id ? (
              <div className="flex flex-wrap items-center gap-2 p-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome"
                  className="flex-1 min-w-32 rounded-lg bg-diane-bg border border-diane-border px-3 py-2 text-diane-cream"
                />
                <input
                  type="text"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  placeholder="Saldo inicial"
                  className="w-28 rounded-lg bg-diane-bg border border-diane-border px-3 py-2 text-diane-cream"
                />
                <button
                  type="button"
                  onClick={submitEdit}
                  className="rounded-lg bg-diane-accent text-diane-cream px-3 py-2 text-sm font-medium"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg bg-diane-border text-diane-cream px-3 py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-4 px-4 py-3">
                <div className="min-w-0">
                  <span className="font-medium">{a.name}</span>
                  <p className="text-sm text-diane-mute">
                    Inicial {fmtBrl(a.balance)}
                    {a.spending > 0 && (
                      <> · Gastos −{fmtBrl(a.spending)}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-diane-accent">
                    {fmtBrl(a.effective_balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="rounded-lg px-2 py-1 text-diane-mute hover:bg-diane-border hover:text-diane-cream text-sm"
                    title="Editar"
                  >
                    Editar
                  </button>
                  {deleteConfirmId === a.id ? (
                    <>
                      <span className="text-sm text-diane-mute">Excluir?</span>
                      <button
                        type="button"
                        onClick={() => confirmDelete(a.id)}
                        className="rounded-lg px-2 py-1 text-diane-danger hover:bg-diane-danger/20 text-sm"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded-lg px-2 py-1 text-diane-mute hover:bg-diane-border text-sm"
                      >
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(a.id)}
                      className="rounded-lg px-2 py-1 text-diane-mute hover:bg-diane-danger/20 hover:text-diane-danger text-sm"
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {accounts.length === 0 && !err && (
        <p className="mt-4 text-diane-mute">Nenhuma conta. Adicione acima ou registre pelo chat.</p>
      )}
    </div>
  )
}
