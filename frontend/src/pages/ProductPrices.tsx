import { useState, useEffect } from 'react'
import {
  getProductPricesGrouped,
  createProductPrice,
  updateProductPrice,
  deleteProductPrice,
  type ProductPricesGroup,
  type ProductPriceItem,
} from '../api'

function fmtBrl(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtDate(s: string) {
  try {
    const d = new Date(s)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

function ItemRow({
  item,
  onRefresh,
  onErr,
}: {
  item: ProductPriceItem
  onRefresh: () => void
  onErr: (s: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.product_name)
  const [editPrice, setEditPrice] = useState(String(item.price))
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function handleSave() {
    const name = editName.trim()
    const p = parseFloat(editPrice.replace(',', '.'))
    if (!name) {
      onErr('Nome do produto é obrigatório')
      return
    }
    if (Number.isNaN(p) || p <= 0) {
      onErr('Preço deve ser um número positivo')
      return
    }
    if (name === item.product_name && Math.abs(p - item.price) < 1e-6) {
      setEditing(false)
      return
    }
    setLoading(true)
    onErr('')
    try {
      await updateProductPrice(item.id, { product_name: name, price: p })
      setEditing(false)
      onRefresh()
    } catch (e) {
      onErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    onErr('')
    try {
      await deleteProductPrice(item.id)
      setDeleteConfirm(false)
      onRefresh()
    } catch (e) {
      onErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-diane-bg/50">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Produto"
          className="flex-1 rounded-lg bg-diane-surface border border-diane-border px-3 py-1.5 text-sm text-gray-100"
        />
        <input
          type="text"
          inputMode="decimal"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Preço"
          className="w-24 rounded-lg bg-diane-surface border border-diane-border px-3 py-1.5 text-sm text-gray-100"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg px-2 py-1 text-sm bg-diane-accent text-diane-bg"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false)
            setEditName(item.product_name)
            setEditPrice(String(item.price))
          }}
          className="rounded-lg px-2 py-1 text-sm text-diane-mute hover:bg-diane-border/50"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-diane-border/30 group">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-gray-200 truncate">{item.product_name}</span>
        {item.is_best_price && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            Melhor preço
          </span>
        )}
      </div>
      <span className="font-mono text-diane-accent shrink-0">{fmtBrl(item.price)}</span>
      <span className="text-xs text-diane-mute shrink-0 hidden sm:inline">{fmtDate(item.recorded_at)}</span>
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => {
            setEditName(item.product_name)
            setEditPrice(String(item.price))
            setEditing(true)
            onErr('')
          }}
          className="rounded px-2 py-1 text-xs text-diane-mute hover:bg-diane-border hover:text-gray-200"
        >
          Editar
        </button>
        {deleteConfirm ? (
          <>
            <span className="text-xs text-diane-mute">Excluir?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded px-2 py-1 text-xs text-diane-danger hover:bg-diane-danger/20"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="rounded px-2 py-1 text-xs text-diane-mute hover:bg-diane-border"
            >
              Não
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="rounded px-2 py-1 text-xs text-diane-mute hover:bg-diane-danger/20 hover:text-diane-danger"
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProductPrices() {
  const [groups, setGroups] = useState<ProductPricesGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newProduct, setNewProduct] = useState('')
  const [newMarket, setNewMarket] = useState('')
  const [newPrice, setNewPrice] = useState('')

  function load(showLoading = true) {
    if (showLoading) setLoading(true)
    setErr(null)
    getProductPricesGrouped()
      .then(setGroups)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (creating) return
    const product = newProduct.trim()
    const market = newMarket.trim()
    const p = parseFloat(newPrice.replace(',', '.'))
    if (!product || !market) {
      setErr('Produto e estabelecimento são obrigatórios')
      return
    }
    if (Number.isNaN(p) || p <= 0) {
      setErr('Preço deve ser um número positivo')
      return
    }
    setCreating(true)
    setErr(null)
    try {
      await createProductPrice({ product_name: product, market_name: market, price: p })
      setNewProduct('')
      setNewMarket('')
      setNewPrice('')
      load(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const allMarkets = groups.map((g) => g.market_name)

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-diane-mute">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Preços por estabelecimento</h1>
      <p className="text-diane-mute mt-1">
        Consulte e edite preços cadastrados no chat ou aqui. Itens com melhor preço entre os mercados ganham badge.
      </p>

      {err && <p className="mt-4 text-diane-danger">Erro: {err}</p>}

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap gap-2">
        <input
          type="text"
          value={newProduct}
          onChange={(e) => setNewProduct(e.target.value)}
          placeholder="Produto"
          className="rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-gray-100 placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent min-w-[140px]"
          disabled={creating}
        />
        <input
          type="text"
          value={newMarket}
          onChange={(e) => setNewMarket(e.target.value)}
          placeholder="Estabelecimento"
          list="markets-list"
          className="rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-gray-100 placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent min-w-[140px]"
          disabled={creating}
        />
        <datalist id="markets-list">
          {allMarkets.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <input
          type="text"
          inputMode="decimal"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="Preço"
          className="rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-gray-100 placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent w-28"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-diane-accent text-diane-bg px-4 py-2 font-medium hover:bg-diane-accentDim disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section
            key={g.market_name}
            className="rounded-2xl bg-diane-surface border border-diane-border overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-diane-border">
              <h2 className="font-semibold">{g.market_name}</h2>
              <p className="text-sm text-diane-mute">{g.items.length} itens</p>
            </div>
            <div className="divide-y divide-diane-border/50">
              {g.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onRefresh={() => load(false)}
                  onErr={(s) => setErr(s)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {groups.length === 0 && !err && (
        <p className="mt-8 text-diane-mute">
          Nenhum preço cadastrado. Adicione pelo chat (&quot;leite piracanjuba no guanabara 5,90&quot;) ou use o formulário acima.
        </p>
      )}
    </div>
  )
}
