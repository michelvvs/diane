import { useState, useEffect } from 'react'
import {
  getShoppingLists,
  createShoppingList,
  addShoppingItems,
  toggleShoppingItem,
  updateShoppingList,
  deleteShoppingList,
  updateShoppingItem,
  deleteShoppingItem,
  activateShoppingList,
  type ShoppingList,
  type ShoppingListItem,
} from '../api'

function fmtDate(s: string) {
  try {
    const d = new Date(s)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return s
  }
}

function ItemRow({
  listId,
  item,
  onRefresh,
  onErr,
}: {
  listId: number
  item: ShoppingListItem
  onRefresh: () => void
  onErr: (s: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)

  async function handleToggle() {
    if (loading) return
    setLoading(true)
    try {
      await toggleShoppingItem(listId, item.id)
      onRefresh()
    } catch (e) {
      onErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    const n = editName.trim()
    if (!n || n === item.name) {
      setEditing(false)
      setEditName(item.name)
      return
    }
    setLoading(true)
    try {
      await updateShoppingItem(listId, item.id, n)
      setEditing(false)
      onRefresh()
    } catch (e) {
      onErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (loading) return
    setLoading(true)
    try {
      await deleteShoppingItem(listId, item.id)
      onRefresh()
    } catch (e) {
      onErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
          className="flex-1 rounded-lg bg-diane-bg border border-diane-border px-3 py-1.5 text-sm text-diane-cream"
          autoFocus
        />
        <button
          type="button"
          onClick={handleSaveEdit}
          className="rounded-lg px-2 py-1 text-sm bg-diane-accent text-diane-cream"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setEditName(item.name); }}
          className="rounded-lg px-2 py-1 text-sm text-diane-mute hover:bg-diane-border/50"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-diane-border/30 group">
      <label className="flex items-center gap-2 cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={handleToggle}
          disabled={loading}
          className="rounded border-diane-border bg-diane-surface text-diane-accent focus:ring-diane-accent"
        />
        <span
          className={
            item.checked
              ? 'text-diane-mute line-through'
              : 'text-diane-cream'
          }
        >
          {item.name}
        </span>
      </label>
      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => { setEditName(item.name); setEditing(true); }}
          className="rounded px-2 py-1 text-xs text-diane-mute hover:bg-diane-border hover:text-diane-cream"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded px-2 py-1 text-xs text-diane-mute hover:bg-diane-danger/20 hover:text-diane-danger"
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

export default function ShoppingLists() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [addItemByList, setAddItemByList] = useState<Record<number, string>>({})
  const [lastAddResult, setLastAddResult] = useState<ShoppingList | null>(null)
  const [editingListId, setEditingListId] = useState<number | null>(null)
  const [editListName, setEditListName] = useState('')
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<number | null>(null)

  function load(showLoading = true) {
    if (showLoading) setLoading(true)
    setErr(null)
    getShoppingLists()
      .then(setLists)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (creating) return
    setCreating(true)
    setErr(null)
    try {
      await createShoppingList(newName.trim() || 'Nova lista')
      setNewName('')
      load(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleAddItems(listId: number) {
    const raw = addItemByList[listId]?.trim() || ''
    if (!raw) return
    const items = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    if (!items.length) return
    setErr(null)
    setLastAddResult(null)
    try {
      const { list } = await addShoppingItems(listId, items)
      setAddItemByList((prev) => ({ ...prev, [listId]: '' }))
      setLastAddResult(list)
      load(false)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function handleActivate(listId: number) {
    setErr(null)
    try {
      await activateShoppingList(listId)
      load(false)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  function startEditList(list: ShoppingList) {
    setEditingListId(list.id)
    setEditListName(list.name)
  }

  function cancelEditList() {
    setEditingListId(null)
    setEditListName('')
  }

  async function saveEditList() {
    if (editingListId == null) return
    const n = editListName.trim()
    if (!n) return
    setErr(null)
    try {
      await updateShoppingList(editingListId, n)
      cancelEditList()
      load(false)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function confirmDeleteList(listId: number) {
    setErr(null)
    try {
      await deleteShoppingList(listId)
      setDeleteConfirmListId(null)
      load(false)
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
    <div className="p-6 max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-diane-cream">Listas de compras</h1>
      <p className="text-diane-mute mt-1 font-mono text-sm">
        Crie listas no chat (&quot;cria uma lista&quot;, &quot;cria lista com leite e pão&quot;, &quot;adiciona X&quot;, &quot;peguei o X&quot;) ou edite aqui.
      </p>

      {err && (
        <p className="mt-4 text-diane-danger">Erro: {err}</p>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da lista"
          className="flex-1 rounded-xl bg-diane-surface border border-diane-border px-4 py-2 text-diane-cream placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-diane-accent text-diane-cream px-4 py-2 font-medium hover:bg-diane-accentDim disabled:opacity-50"
        >
          Nova lista
        </button>
      </form>

      {lastAddResult && (
        <div className="mt-4 rounded-xl bg-diane-accent/10 border border-diane-accent/30 px-4 py-3">
          <p className="font-medium text-diane-accent">
            Lista &quot;{lastAddResult.name}&quot;. Estado atual:
          </p>
          <p className="mt-1 text-sm text-diane-cream whitespace-pre-wrap">
            {lastAddResult.items.length
              ? lastAddResult.items.map((it) => `  [${it.checked ? 'x' : ' '}] ${it.name}`).join('\n')
              : '(nenhum item)'}
          </p>
          <button
            type="button"
            onClick={() => setLastAddResult(null)}
            className="mt-2 text-xs text-diane-mute hover:text-diane-cream"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {lists.map((list) => (
          <div
            key={list.id}
            className="rounded-2xl bg-diane-surface border border-diane-border overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-diane-border flex-wrap">
              <div className="min-w-0 flex-1">
                {editingListId === list.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editListName}
                      onChange={(e) => setEditListName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditList()}
                      className="flex-1 rounded-lg bg-diane-bg border border-diane-border px-3 py-1.5 text-diane-cream"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEditList}
                      className="rounded-lg px-2 py-1 text-sm bg-diane-accent text-diane-cream"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditList}
                      className="rounded-lg px-2 py-1 text-sm text-diane-mute hover:bg-diane-border/50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-semibold truncate">{list.name}</h2>
                    <p className="text-sm text-diane-mute">
                      {fmtDate(list.updated_at)}
                      {list.active && (
                        <span className="ml-2 text-diane-accent">· ativa</span>
                      )}
                    </p>
                  </>
                )}
              </div>
              {editingListId !== list.id && (
                <div className="flex items-center gap-2 shrink-0">
                  {!list.active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(list.id)}
                      className="rounded-lg px-3 py-1.5 text-sm bg-diane-accent/20 text-diane-accent hover:bg-diane-accent/30"
                    >
                      Ativar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEditList(list)}
                    className="rounded-lg px-3 py-1.5 text-sm text-diane-mute hover:bg-diane-border hover:text-diane-cream"
                  >
                    Editar nome
                  </button>
                  {deleteConfirmListId === list.id ? (
                    <>
                      <span className="text-sm text-diane-mute">Excluir lista?</span>
                      <button
                        type="button"
                        onClick={() => confirmDeleteList(list.id)}
                        className="rounded-lg px-2 py-1 text-sm text-diane-danger hover:bg-diane-danger/20"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmListId(null)}
                        className="rounded-lg px-2 py-1 text-sm text-diane-mute hover:bg-diane-border"
                      >
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmListId(list.id)}
                      className="rounded-lg px-3 py-1.5 text-sm text-diane-mute hover:bg-diane-danger/20 hover:text-diane-danger"
                    >
                      Excluir lista
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="p-2">
              <div className="flex gap-2 px-2 pb-2">
                <input
                  type="text"
                  value={addItemByList[list.id] ?? ''}
                  onChange={(e) =>
                    setAddItemByList((prev) => ({ ...prev, [list.id]: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddItems(list.id))
                  }
                  placeholder="Adicionar itens (separados por vírgula)"
                  className="flex-1 rounded-lg bg-diane-bg border border-diane-border px-3 py-2 text-sm text-diane-cream placeholder-diane-mute focus:outline-none focus:ring-1 focus:ring-diane-accent"
                />
                <button
                  type="button"
                  onClick={() => handleAddItems(list.id)}
                  className="rounded-lg px-3 py-2 text-sm bg-diane-accent/20 text-diane-accent hover:bg-diane-accent/30 shrink-0"
                >
                  Adicionar
                </button>
              </div>
              {list.items.length === 0 ? (
                <p className="py-4 px-3 text-diane-mute text-sm">
                  Nenhum item. Adicione acima ou pelo chat.
                </p>
              ) : (
                <ul className="divide-y divide-diane-border/50">
                  {list.items.map((item) => (
                    <li key={item.id}>
                      <ItemRow
                        listId={list.id}
                        item={item}
                        onRefresh={() => load(false)}
                        onErr={(s) => setErr(s)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {lists.length === 0 && !err && (
        <p className="mt-8 text-diane-mute">
          Nenhuma lista. Crie pelo chat ou use o formulário acima.
        </p>
      )}
    </div>
  )
}
