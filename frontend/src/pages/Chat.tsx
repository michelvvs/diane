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
      <header className="shrink-0 border-b border-diane-border px-6 py-4 bg-gradient-to-r from-diane-lodge/10 to-transparent">
        <h1 className="font-display text-xl font-semibold text-diane-cream">
          Damn fine chat
        </h1>
        <p className="text-sm text-diane-mute mt-0.5 font-mono">
          Diane… gastos, saldo, categorias, listas, preços. &quot;Cria lista&quot;, &quot;adiciona leite&quot;, &quot;peguei o leite&quot;, &quot;leite piracanjuba no guanabara 5,90&quot;.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center text-diane-mute py-12">
            <p className="font-display text-lg text-diane-cream">Olá. Sou a DIANE.</p>
            <p className="mt-2 font-mono text-sm">
              Ex.: &ldquo;Gastei 50 no mercado&rdquo;, &ldquo;Quanto gastei este mês?&rdquo;, &ldquo;Cria lista com leite e pão&rdquo;, &ldquo;Adiciona café&rdquo;, &ldquo;Peguei o leite&rdquo;, &ldquo;Preço do leite no Guanabara 5,90&rdquo;.
            </p>
            <p className="mt-4 text-xs text-diane-mute/80">☕ Every day, once a day…</p>
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
                  ? 'bg-diane-accent/20 text-diane-cream border border-diane-accent/50'
                  : m.errorType === 'quota'
                    ? 'bg-diane-surface border-2 border-diane-warn/60 text-diane-warn'
                    : m.errorType
                      ? 'bg-diane-surface border border-diane-danger/60 text-diane-danger'
                      : 'bg-diane-surface border border-diane-border text-diane-cream'
              }`}
            >
              {m.role === 'assistant' && m.errorType === 'quota' && (
                <p className="text-xs font-medium text-diane-warn mb-2">Aviso — Cota excedida</p>
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
              <span className="text-diane-mute animate-pulse font-mono">…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-diane-border p-4 bg-diane-surface/30">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Diane…"
            className="flex-1 rounded-xl bg-diane-surface border border-diane-border px-4 py-3 text-diane-cream placeholder-diane-mute focus:outline-none focus:ring-2 focus:ring-diane-accent focus:border-transparent font-mono text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-diane-accent text-diane-cream px-5 py-3 font-medium hover:bg-diane-accentDim disabled:opacity-50 disabled:cursor-not-allowed transition-opacity border border-diane-accentDim/50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
