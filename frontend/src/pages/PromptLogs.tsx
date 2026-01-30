import { useState, useEffect } from 'react'
import { getPromptLogs, type PromptLog } from '../api'

const KINDS: Record<string, string> = {
  extraction_tx: 'Extração (transação)',
  extraction_shopping: 'Extração (lista)',
  extraction_product_price: 'Extração (preço por mercado)',
  chat: 'Chat',
}

function fmtDate(s: string) {
  try {
    const d = new Date(s)
    return d.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  } catch {
    return s
  }
}

function LogRow({ log }: { log: PromptLog }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl bg-diane-surface border border-diane-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-diane-border/30 transition-colors"
      >
        <div className="min-w-0">
          <span className="font-medium text-diane-accent">
            {KINDS[log.kind] ?? log.kind}
          </span>
          <span className="text-diane-mute ml-2">· {log.model}</span>
          <p className="text-sm text-diane-mute mt-0.5 truncate">
            {fmtDate(log.created_at)}
          </p>
        </div>
        <span className="shrink-0 text-diane-mute">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="border-t border-diane-border px-4 py-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-diane-mute uppercase tracking-wider mb-1">
              Prompt
            </p>
            <pre className="text-sm bg-diane-bg text-diane-cream font-mono rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
              {log.prompt_text}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-diane-mute uppercase tracking-wider mb-1">
              Resposta
            </p>
            <pre className="text-sm bg-diane-bg text-diane-cream font-mono rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
              {log.response_text}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PromptLogs() {
  const [logs, setLogs] = useState<PromptLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [kind, setKind] = useState<string>('')

  function load() {
    setLoading(true)
    setErr(null)
    getPromptLogs({ limit: 200, kind: kind || undefined })
      .then(setLogs)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [kind])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-diane-mute">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-diane-cream">Tape log</h1>
      <p className="text-diane-mute mt-1 font-mono text-sm">
        Histórico de prompts enviados ao modelo (extração de transação, lista, chat).
      </p>

      {err && (
        <p className="mt-4 text-diane-danger">Erro: {err}</p>
      )}

      <div className="mt-4 flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg bg-diane-surface border border-diane-border px-3 py-2 text-diane-cream font-mono text-sm"
        >
          <option value="">Todos</option>
          <option value="extraction_tx">Extração (transação)</option>
          <option value="extraction_shopping">Extração (lista)</option>
          <option value="extraction_product_price">Extração (preço por mercado)</option>
          <option value="chat">Chat</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-diane-accent/20 text-diane-accent px-4 py-2 text-sm font-medium hover:bg-diane-accent/30"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </div>

      {logs.length === 0 && !err && (
        <p className="mt-8 text-diane-mute">
          Nenhum log ainda. Use o chat para gerar prompts.
        </p>
      )}
    </div>
  )
}
