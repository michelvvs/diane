const BASE = '/api'

export type Account = { id: number; name: string; balance: number; created_at: string }
export type AccountWithStats = Account & {
  spending: number
  effective_balance: number
}
export type Category = { id: number; name: string; created_at: string }
export type Transaction = {
  id: number
  amount: number
  description: string
  category_id: number
  category_name?: string
  account_id?: number
  account_name?: string
  tx_date: string
  created_at: string
}
export type CategoryTotal = { category_name: string; total: number }
export type MonthlySpending = {
  year: number
  month: number
  total: number
  by_category: CategoryTotal[]
}
export type ChatResponse = {
  reply: string
  extracted_transaction?: Transaction | null
  error_type?: string | null
}

export type ShoppingListItem = {
  id: number
  list_id: number
  name: string
  checked: boolean
  created_at: string
}

export type ShoppingList = {
  id: number
  name: string
  active: boolean
  created_at: string
  updated_at: string
  items: ShoppingListItem[]
}

export async function getAccounts(): Promise<AccountWithStats[]> {
  const r = await fetch(`${BASE}/accounts`)
  if (!r.ok) throw new Error('Erro ao buscar contas')
  return r.json()
}

export async function createAccount(name: string, balance = 0): Promise<Account> {
  const r = await fetch(`${BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, balance }),
  })
  if (!r.ok) throw new Error('Erro ao criar conta')
  return r.json()
}

export async function updateAccount(
  id: number,
  data: { name?: string; balance?: number }
): Promise<Account> {
  const r = await fetch(`${BASE}/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Erro ao atualizar conta')
  return r.json()
}

export async function deleteAccount(id: number): Promise<void> {
  const r = await fetch(`${BASE}/accounts/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Erro ao excluir conta')
}

export async function getCategories(): Promise<Category[]> {
  const r = await fetch(`${BASE}/categories`)
  if (!r.ok) throw new Error('Erro ao buscar categorias')
  return r.json()
}

export async function getTransactions(params?: { limit?: number; year?: number; month?: number }): Promise<Transaction[]> {
  const sp = new URLSearchParams()
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.year != null) sp.set('year', String(params.year))
  if (params?.month != null) sp.set('month', String(params.month))
  const q = sp.toString()
  const r = await fetch(`${BASE}/transactions${q ? `?${q}` : ''}`)
  if (!r.ok) throw new Error('Erro ao buscar transações')
  return r.json()
}

export async function getMonthlyStats(year?: number, month?: number): Promise<MonthlySpending> {
  const sp = new URLSearchParams()
  if (year != null) sp.set('year', String(year))
  if (month != null) sp.set('month', String(month))
  const q = sp.toString()
  const r = await fetch(`${BASE}/stats/monthly${q ? `?${q}` : ''}`)
  if (!r.ok) throw new Error('Erro ao buscar estatísticas')
  return r.json()
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const r = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok) {
    let msg = 'Erro ao enviar mensagem'
    try {
      const j = await r.json()
      const d = (j as { detail?: string | unknown }).detail
      if (typeof d === 'string') msg = d
      else if (d != null) msg = JSON.stringify(d)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return r.json()
}

export async function getShoppingLists(): Promise<ShoppingList[]> {
  const r = await fetch(`${BASE}/shopping-lists`)
  if (!r.ok) throw new Error('Erro ao buscar listas')
  return r.json()
}

export async function createShoppingList(name = 'Nova lista'): Promise<ShoppingList> {
  const r = await fetch(`${BASE}/shopping-lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!r.ok) throw new Error('Erro ao criar lista')
  return r.json()
}

export async function getShoppingList(id: number): Promise<ShoppingList> {
  const r = await fetch(`${BASE}/shopping-lists/${id}`)
  if (!r.ok) throw new Error('Erro ao buscar lista')
  return r.json()
}

export type AddShoppingItemsResult = { added: number; list: ShoppingList }

export async function addShoppingItems(
  listId: number,
  items: string[]
): Promise<AddShoppingItemsResult> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!r.ok) throw new Error('Erro ao adicionar itens')
  return r.json()
}

export async function checkShoppingItems(listId: number, itemNames: string[]): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/items/check`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_names: itemNames }),
  })
  if (!r.ok) throw new Error('Erro ao marcar itens')
}

export async function toggleShoppingItem(listId: number, itemId: number): Promise<boolean> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/items/${itemId}/toggle`, {
    method: 'PATCH',
  })
  if (!r.ok) throw new Error('Erro ao alterar item')
  const data = await r.json()
  return data.checked as boolean
}

export async function activateShoppingList(listId: number): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/activate`, { method: 'POST' })
  if (!r.ok) throw new Error('Erro ao ativar lista')
}

export async function updateShoppingList(listId: number, name: string): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!r.ok) throw new Error('Erro ao atualizar lista')
}

export async function deleteShoppingList(listId: number): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Erro ao excluir lista')
}

export async function updateShoppingItem(
  listId: number,
  itemId: number,
  name: string
): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!r.ok) throw new Error('Erro ao atualizar item')
}

export async function deleteShoppingItem(listId: number, itemId: number): Promise<void> {
  const r = await fetch(`${BASE}/shopping-lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
  })
  if (!r.ok) throw new Error('Erro ao excluir item')
}

export type PromptLog = {
  id: number
  kind: string
  prompt_text: string
  response_text: string
  model: string
  created_at: string
}

export async function getPromptLogs(params?: {
  limit?: number
  offset?: number
  kind?: string
}): Promise<PromptLog[]> {
  const sp = new URLSearchParams()
  if (params?.limit != null) sp.set('limit', String(params.limit))
  if (params?.offset != null) sp.set('offset', String(params.offset))
  if (params?.kind != null) sp.set('kind', params.kind)
  const q = sp.toString()
  const r = await fetch(`${BASE}/prompt-logs${q ? `?${q}` : ''}`)
  if (!r.ok) throw new Error('Erro ao buscar logs de prompts')
  return r.json()
}

export type ProductPriceItem = {
  id: number
  product_name: string
  market_name: string
  price: number
  recorded_at: string
  is_best_price: boolean
}

export type ProductPricesGroup = {
  market_name: string
  items: ProductPriceItem[]
}

export async function getProductPricesGrouped(): Promise<ProductPricesGroup[]> {
  const r = await fetch(`${BASE}/product-prices`)
  if (!r.ok) throw new Error('Erro ao buscar preços')
  return r.json()
}

export async function createProductPrice(data: {
  product_name: string
  market_name: string
  price: number
}): Promise<void> {
  const r = await fetch(`${BASE}/product-prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Erro ao cadastrar preço')
}

export async function updateProductPrice(
  id: number,
  data: { product_name?: string; price?: number }
): Promise<void> {
  const r = await fetch(`${BASE}/product-prices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Erro ao atualizar preço')
}

export async function deleteProductPrice(id: number): Promise<void> {
  const r = await fetch(`${BASE}/product-prices/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Erro ao excluir preço')
}
