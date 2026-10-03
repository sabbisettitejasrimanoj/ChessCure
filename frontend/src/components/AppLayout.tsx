import { House, Settings, UserRound } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

const navigation = [
  { to: '/home', label: 'Home', Icon: House },
  { to: '/settings', label: 'Settings', Icon: Settings },
  { to: '/profile', label: 'Profile', Icon: UserRound },
]

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand${compact ? ' brand--compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">♞</span>
      <span className="brand-copy">
        <span className="brand-name">Chess <b>Cure</b></span>
        {!compact && <span className="brand-tagline">Thoughtful chess, every day.</span>}
      </span>
    </span>
  )
}

export function AppLayout({
  children,
  width = 'standard',
}: {
  children: ReactNode
  width?: 'standard' | 'wide'
}) {
  const navigate = useNavigate()

  return (
    <div className="app-layout">
      <header className="topbar">
        <button className="brand-button" onClick={() => navigate('/home')} aria-label="Chess Cure home">
          <Brand />
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-status"><span className="status-dot" /> Board ready</div>
      </header>
      <main className={`page-content page-content--${width}`}>{children}</main>
      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}