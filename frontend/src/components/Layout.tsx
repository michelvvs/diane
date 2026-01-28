import { Outlet, Link, useLocation } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Chat', icon: '💬' },
  { to: '/dashboard', label: 'Visão geral', icon: '📊' },
  { to: '/contas', label: 'Contas', icon: '🏦' },
  { to: '/transacoes', label: 'Transações', icon: '📋' },
  { to: '/estatisticas', label: 'Por categoria', icon: '📈' },
  { to: '/listas', label: 'Listas de compras', icon: '🛒' },
  { to: '/precos', label: 'Preços', icon: '🏷️' },
  { to: '/logs', label: 'Log de prompts', icon: '📜' },
] as const

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation()
  const content = children ?? <Outlet />

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-diane-surface border-r border-diane-border flex flex-col shrink-0">
        <div className="p-4 border-b border-diane-border">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-diane-accent">
            <span className="w-8 h-8 rounded-lg bg-diane-accent/20 flex items-center justify-center text-diane-accent">D</span>
            DIANE
          </Link>
          <p className="text-xs text-diane-mute mt-1">Assistente de finanças</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === to
                  ? 'bg-diane-accent/15 text-diane-accent'
                  : 'text-gray-300 hover:bg-diane-border/50 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {content}
      </main>
    </div>
  )
}
