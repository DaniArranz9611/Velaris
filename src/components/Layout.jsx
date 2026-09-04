import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, BookOpen, CalendarDays, Wallet2, BarChart3, ShieldCheck, LogOut, UserCircle2 } from 'lucide-react'
import { usePerfil } from '../lib/PerfilContext'
import { supabase } from '../lib/supabaseClient'
import EditarNombre from './EditarNombre'

const LINKS = [
  { to: '/dashboard', label: 'Inicio', Icono: LayoutGrid },
  { to: '/libros', label: 'Libros', Icono: BookOpen },
  { to: '/eventos', label: 'Eventos', Icono: CalendarDays },
  { to: '/contabilidad', label: 'Contabilidad', Icono: Wallet2 },
  { to: '/encuestas', label: 'Encuestas', Icono: BarChart3 }
]

export default function Layout({ children }) {
  const { perfil } = usePerfil()
  const location = useLocation()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <span className="app-logo">
            <img src="/pwa-192x192.png" alt="" className="app-logo-icon" />
            <span>
              Velaris
              <span className="app-eslogan">A las estrellas que escuchan y los sueños que se hacen realidad</span>
            </span>
          </span>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} /> Salir
          </button>
        </div>
        {perfil && (
          <div className="usuario-actual">
            <Link to="/perfil" className="link-mi-perfil">
              <UserCircle2 size={15} />
            </Link>
            <EditarNombre />
          </div>
        )}
        <nav className="app-nav">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'nav-link activo' : 'nav-link'}
            >
              <link.Icono size={16} />
              {link.label}
            </Link>
          ))}
          {perfil?.es_admin_global && (
            <Link
              to="/admin"
              className={location.pathname === '/admin' ? 'nav-link activo' : 'nav-link'}
            >
              <ShieldCheck size={16} />
              Administración
            </Link>
          )}
        </nav>
      </header>

      <main className="app-content">{children}</main>
    </div>
  )
}
