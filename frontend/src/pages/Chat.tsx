import { useState, useRef, useEffect } from 'react'
import { sendChatMessage, type ChatResponse } from '../api'

export default function Chat() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant'
      content: string
      tx?: ChatResponse['extracted_transaction']
      errorType?: string | null
    }>
  >([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await sendChatMessage(msg)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.reply,
          tx: res.extracted_transaction ?? undefined,
          errorType: res.error_type ?? undefined,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Erro ao enviar mensagem: ${(err as Error).message}`,
          errorType: 'network',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="shrink-0 border-b border-diane-border px-6 py-4">
        <h1 className="text-xl font-semibold">Chat com a DIANE</h1>
        <p className="text-sm text-diane-mute mt-0.5">
          Gastos, saldo, categorias, listas de compras ou preços por mercado: &quot;cria lista&quot;, &quot;adiciona leite&quot;, &quot;peguei o leite&quot;, &quot;leite piracanjuba no guanabara 5,90&quot;.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center text-diane-mute py-12">
            <p className="text-lg">Olá! Sou a DIANE.</p>
            <p className="mt-2">
              Ex.: &ldquo;Gastei 50 no mercado&rdquo;, &ldquo;Quanto gastei este mês?&rdquo;, &ldquo;Cria uma lista&rdquo;, &ldquo;Adiciona café&rdquo;, &ldquo;Peguei o leite&rdquo;, &ldquo;Preço do leite Piracanjuba no Guanabara tá 5,90&rdquo;.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-2xl flex ${m.role === 'user' ? 'justify-end' : ''}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-diane-accent/20 text-diane-accent'
                  : m.errorType === 'quota'
                    ? 'bg-diane-surface border-2 border-amber-500/80 text-amber-200'
                    : m.errorType
                      ? 'bg-diane-surface border border-diane-danger/60 text-diane-danger/90'
                      : 'bg-diane-surface border border-diane-border'
              }`}
            >
              {m.role === 'assistant' && m.errorType === 'quota' && (
                <p className="text-xs font-medium text-amber-400 mb-2">Aviso — Cota excedida</p>
              )}
              {m.role === 'assistant' && m.errorType === 'llm' && (
                <p className="text-xs font-medium text-diane-danger mb-2">Erro na IA</p>
              )}
              {m.role === 'assistant' && m.errorType === 'network' && (
                <p className="text-xs font-medium text-diane-danger mb-2">Erro de conexão</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              {m.tx && (
                <div className="mt-2 pt-2 border-t border-diane-border text-xs text-diane-mute">
                  ✓ Registrado: {m.tx.description} — R$ {m.tx.amount.toFixed(2)} ({m.tx.category_name})
                  {m.tx.tx_date && ` · ${m.tx.tx_date}`}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="max-w-2xl">
            <div className="rounded-2xl px-4 py-3 bg-diane-surface border border-diane-border">
              <span className="text-diane-mute animate-pulse">…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-diane-border p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mensagem para a DIANE…"
            className="flex-1 rounded-xl bg-diane-surface border border-diane-border px-4 py-3 text-gray-100 placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-diane-accent text-diane-bg px-5 py-3 font-medium hover:bg-diane-accentDim disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
