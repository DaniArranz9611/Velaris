import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, BookOpen, CalendarDays, Wallet2, BarChart3, Users, ShieldCheck, LogOut, UserCircle2, Gift } from 'lucide-react'
import { usePerfil } from '../lib/PerfilContext'
import { supabase } from '../lib/supabaseClient'
import EditarNombre from './EditarNombre'

const LINKS = [
  { to: '/dashboard', label: 'Inicio', Icono: LayoutGrid, modulo: null },
  { to: '/libros', label: 'Libros', Icono: BookOpen, modulo: 'lecturas' },
  { to: '/eventos', label: 'Eventos', Icono: CalendarDays, modulo: 'eventos' },
  { to: '/contabilidad', label: 'Contabilidad', Icono: Wallet2, modulo: 'contabilidad' },
  { to: '/encuestas', label: 'Encuestas', Icono: BarChart3, modulo: 'encuestas' },
  { to: '/deseados', label: 'Deseados', Icono: Gift, modulo: null },
  { to: '/miembros', label: 'Miembros', Icono: Users, modulo: null }
]

export default function Layout({ children }) {
  const { perfil, puede } = usePerfil()
  const location = useLocation()
  const linksVisibles = LINKS.filter((link) => !link.modulo || puede(link.modulo, 'ver'))

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
            <Link to="/perfil" className="link-mi-perfil" title="Mi espacio personal">
              <UserCircle2 size={15} />
              <span>Mi perfil (personal)</span>
            </Link>
            <EditarNombre />
          </div>
        )}
        <span className="etiqueta-seccion-nav">Club de lectura</span>
        <nav className="app-nav">
          {linksVisibles.map((link) => (
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
