import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, Star, MessagesSquare, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'
import EditarNombre from '../components/EditarNombre'

export default function MiPerfilPage() {
  const { perfil } = usePerfil()
  const [resenas, setResenas] = useState([])
  const [teorias, setTeorias] = useState([])
  const [avances, setAvances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!perfil?.id) return

    async function cargar() {
      setLoading(true)
      const [{ data: resenasData }, { data: teoriasData }, { data: avancesData }] = await Promise.all([
        supabase
          .from('resenas')
          .select('*, libros(id, titulo, autor)')
          .eq('integrante_id', perfil.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('teorias')
          .select('*, libros(id, titulo)')
          .eq('integrante_id', perfil.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('avance_lectura')
          .select('*, libros(id, titulo)')
          .eq('integrante_id', perfil.id)
      ])

      setResenas(resenasData ?? [])
      setTeorias(teoriasData ?? [])
      setAvances(avancesData ?? [])
      setLoading(false)
    }

    cargar()

    const canal = supabase
      .channel(`mi-perfil-datos-${perfil.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resenas', filter: `integrante_id=eq.${perfil.id}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teorias', filter: `integrante_id=eq.${perfil.id}` },
        () => cargar()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [perfil?.id])

  const librosLeidos = resenas.filter((r) => r.libros)
  const promedioPropio =
    resenas.length > 0
      ? (resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length).toFixed(1)
      : '—'

  return (
    <Layout>
      <div className="page">
        <div className="bienvenida-card">
          <h1>
            <BookMarked size={20} /> Mi perfil
          </h1>
          <p className="eslogan-dashboard">
            <EditarNombre />
          </p>
        </div>

        <div className="resumen-grid">
          <div className="card resumen-item">
            <BookMarked size={20} className="resumen-icono" />
            <span className="resumen-label">Libros leídos</span>
            <span className="resumen-valor">{librosLeidos.length}</span>
          </div>
          <div className="card resumen-item">
            <Star size={20} className="resumen-icono" />
            <span className="resumen-label">Mi calificación promedio</span>
            <span className="resumen-valor">{promedioPropio}</span>
          </div>
          <div className="card resumen-item">
            <MessagesSquare size={20} className="resumen-icono" />
            <span className="resumen-label">Teorías publicadas</span>
            <span className="resumen-valor">{teorias.length}</span>
          </div>
        </div>

        {loading ? (
          <p>Cargando tu book journal...</p>
        ) : (
          <>
            <div className="card">
              <h2 className="mes-titulo">
                <TrendingUp size={16} /> Mi progreso en libros activos
              </h2>
              {avances.filter((a) => a.porcentaje < 100).length === 0 ? (
                <p className="vacio">No estás con ningún libro en curso.</p>
              ) : (
                <div className="mini-avances">
                  {avances
                    .filter((a) => a.porcentaje < 100)
                    .map((a) => (
                      <Link key={a.id} to={`/libros?abrir=${a.libros?.id}`} className="mini-avance-chip">
                        {a.libros?.titulo}: {a.porcentaje}%
                      </Link>
                    ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="mes-titulo">
                <BookMarked size={16} /> Mi book journal
              </h2>
              {librosLeidos.length === 0 ? (
                <p className="vacio">Todavía no escribiste ninguna reseña. ¡Empezá en la sección Libros!</p>
              ) : (
                <ul className="lista">
                  {librosLeidos.map((r) => (
                    <li key={r.id} className="card">
                      <Link to={`/libros?abrir=${r.libros?.id}`} className="teoria-dashboard-link">
                        <strong>{r.libros?.titulo}</strong>
                        {r.libros?.autor && <span className="libro-autor"> — {r.libros.autor}</span>}
                      </Link>
                      <div className="estrellas">
                        {'★'.repeat(r.calificacion)}
                        {'☆'.repeat(5 - r.calificacion)}
                      </div>
                      {r.comentario && <p>{r.comentario}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
