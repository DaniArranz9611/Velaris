import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Wallet2, Settings, MessagesSquare, Sparkles, ShoppingBasket } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'
import SelectorTema from '../components/SelectorTema'

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const { perfil } = usePerfil()
  const [libroActual, setLibroActual] = useState(null)
  const [avances, setAvances] = useState([])
  const [proximoEvento, setProximoEvento] = useState(null)
  const [saldo, setSaldo] = useState(0)
  const [ultimasTeorias, setUltimasTeorias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      setLoading(true)

      const { data: libros } = await supabase
        .from('libros')
        .select('*')
        .eq('es_lectura_del_mes', true)
        .order('created_at', { ascending: false })
        .limit(1)

      const libro = libros?.[0] ?? null
      setLibroActual(libro)

      if (libro) {
        const { data: avancesData } = await supabase
          .from('avance_lectura')
          .select('*, perfiles(nombre)')
          .eq('libro_id', libro.id)

        setAvances(avancesData ?? [])

        const { data: teorias } = await supabase
          .from('teorias')
          .select('*, perfiles(nombre)')
          .eq('libro_id', libro.id)
          .order('created_at', { ascending: false })
          .limit(3)

        setUltimasTeorias(teorias ?? [])
      }

      const hoy = new Date().toISOString().slice(0, 10)
      const { data: eventos } = await supabase
        .from('eventos')
        .select('*')
        .gte('fecha', hoy)
        .order('fecha', { ascending: true })
        .limit(1)

      setProximoEvento(eventos?.[0] ?? null)

      const { data: movimientos } = await supabase.from('movimientos').select('tipo, monto')
      const total = (movimientos ?? []).reduce(
        (acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)),
        0
      )
      setSaldo(total)

      setLoading(false)
    }

    cargar()
  }, [])

  const activos = avances.filter((a) => a.estado_personal !== 'abandonada')
  const abandonaron = avances.filter((a) => a.estado_personal === 'abandonada')
  const promedioAvance =
    activos.length > 0
      ? Math.round(activos.reduce((acc, a) => acc + a.porcentaje, 0) / activos.length)
      : 0

  return (
    <Layout>
      <div className="page dashboard">
        <div className="bienvenida-card">
          <h1>
            {saludo()}, {perfil?.nombre ?? ''} <Sparkles size={20} />
          </h1>
          <p className="eslogan-dashboard">
            A las estrellas que escuchan y los sueños que se hacen realidad
          </p>
          <SelectorTema />
        </div>

        {loading ? (
          <p>Cargando resumen...</p>
        ) : (
          <>
            <div className="card libro-actual-card">
              <h2 className="mes-titulo">
                <BookOpen size={18} /> Leyendo ahora
              </h2>
              {libroActual ? (
                <>
                  <div className="libro-actual-info">
                    <strong>{libroActual.titulo}</strong>
                    {libroActual.autor && <span className="libro-autor"> — {libroActual.autor}</span>}
                  </div>
                  <div className="barra-fondo barra-grande">
                    <div className="barra-llenado" style={{ width: `${promedioAvance}%` }} />
                  </div>
                  <span className="avance-promedio">{promedioAvance}% de avance promedio del club</span>
                  {activos.length > 0 && (
                    <div className="mini-avances">
                      {activos.map((a) => (
                        <span key={a.id} className="mini-avance-chip">
                          {a.perfiles?.nombre ?? 'Alguien'}: {a.porcentaje}%
                        </span>
                      ))}
                    </div>
                  )}
                  {abandonaron.length > 0 && (
                    <div className="mini-avances">
                      {abandonaron.map((a) => (
                        <span key={a.id} className="mini-avance-chip mini-avance-abandonado">
                          {a.perfiles?.nombre ?? 'Alguien'}: abandonó
                        </span>
                      ))}
                    </div>
                  )}
                  <Link to={`/libros?abrir=${libroActual.id}`} className="btn-link">
                    Ver libro y teorías →
                  </Link>
                </>
              ) : (
                <p className="vacio">Todavía no hay un libro marcado como "leyendo ahora".</p>
              )}
            </div>

            <div className="resumen-grid">
              <Link to="/eventos" className="card resumen-item resumen-clickable">
                <CalendarDays size={20} className="resumen-icono" />
                <span className="resumen-label">Próxima juntada</span>
                {proximoEvento ? (
                  <>
                    <span className="resumen-valor" style={{ fontSize: '1.1rem' }}>
                      {proximoEvento.titulo}
                    </span>
                    <span className="resumen-label">
                      {new Date(proximoEvento.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </>
                ) : (
                  <span className="vacio">Sin eventos próximos</span>
                )}
              </Link>

              <Link to="/contabilidad" className="card resumen-item resumen-clickable">
                <Wallet2 size={20} className="resumen-icono" />
                <span className="resumen-label">Saldo del club</span>
                <span className={`resumen-valor ${saldo >= 0 ? 'verde' : 'rojo'}`}>
                  ${saldo.toFixed(2)}
                </span>
              </Link>
            </div>

            {ultimasTeorias.length > 0 && (
              <div className="card">
                <h2 className="mes-titulo">
                  <MessagesSquare size={18} /> Últimas teorías
                </h2>
                <ul className="lista">
                  {ultimasTeorias.map((t) => (
                    <li key={t.id} className="movimiento-item">
                      <Link to={`/libros?abrir=${libroActual?.id}`} className="teoria-dashboard-link">
                        <strong>{t.titulo}</strong>
                        <span> — {t.perfiles?.nombre ?? 'Anónimo'}</span>
                        {t.spoiler && <span className="badge">Spoiler</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={`/libros?abrir=${libroActual?.id}`} className="btn-link">
                  Ver todas →
                </Link>
              </div>
            )}

            <div className="accesos-rapidos">
              <Link to="/libros" className="acceso-rapido">
                <span className="acceso-icono">
                  <BookOpen size={22} />
                </span>
                <span>Libros</span>
              </Link>
              <Link to="/eventos" className="acceso-rapido">
                <span className="acceso-icono">
                  <CalendarDays size={22} />
                </span>
                <span>Eventos</span>
              </Link>
              <Link to="/contabilidad" className="acceso-rapido">
                <span className="acceso-icono">
                  <Wallet2 size={22} />
                </span>
                <span>Contabilidad</span>
              </Link>
              <Link to="/contabilidad" className="acceso-rapido">
                <span className="acceso-icono">
                  <ShoppingBasket size={22} />
                </span>
                <span>Compras</span>
              </Link>
              {perfil?.es_admin_global && (
                <Link to="/admin" className="acceso-rapido">
                  <span className="acceso-icono">
                    <Settings size={22} />
                  </span>
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
