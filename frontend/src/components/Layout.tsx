import { Outlet, Link, useLocation } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Chat', icon: '☕', title: 'Damn fine cup of chat' },
  { to: '/dashboard', label: 'Visão geral', icon: '🦉', title: 'The owls' },
  { to: '/contas', label: 'Contas', icon: '📼', title: 'Diane...' },
  { to: '/transacoes', label: 'Transações', icon: '📋', title: '' },
  { to: '/estatisticas', label: 'Por categoria', icon: '🥧', title: 'Cherry pie' },
  { to: '/listas', label: 'Listas de compras', icon: '🛒', title: '' },
  { to: '/precos', label: 'Preços', icon: '🏷️', title: '' },
  { to: '/logs', label: 'Log de prompts', icon: '📜', title: 'Tape log' },
] as const

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation()
  const content = children ?? <Outlet />

  return (
    <div className="min-h-screen flex bg-diane-bg">
      <aside className="w-60 bg-diane-surface border-r border-diane-border flex flex-col shrink-0 bg-gradient-to-b from-diane-lodge/10 via-diane-surface to-diane-bg">
        <div className="p-4 border-b border-diane-border bg-gradient-to-b from-diane-lodge/20 to-transparent">
          <Link
            to="/"
            className="block font-display text-xl font-semibold tracking-wide text-diane-accent hover:text-diane-cream transition-colors"
          >
            WELCOME TO
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 mt-1 font-display text-2xl font-semibold text-diane-cream hover:text-diane-accent transition-colors"
          >
            <span className="w-9 h-9 rounded bg-diane-lodge/80 border border-diane-accent/50 flex items-center justify-center text-diane-cream font-mono text-sm">
              D
            </span>
            DIANE
          </Link>
          <p className="text-xs text-diane-mute mt-2 font-mono">
            &ldquo;Every day, once a day…&rdquo;
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(({ to, label, icon, title }) => (
            <Link
              key={to}
              to={to}
              title={title || undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border border-transparent ${
                location.pathname === to
                  ? 'bg-diane-accent/20 text-diane-cream border-diane-accent/40'
                  : 'text-diane-mute hover:bg-diane-surfaceLight hover:text-diane-cream hover:border-diane-border'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-diane-border">
          <p className="text-[10px] text-diane-mute/70 font-mono italic text-center">
            The owls are not what they seem.
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-diane-bg">
        {content}
      </main>
    </div>
  )
}
