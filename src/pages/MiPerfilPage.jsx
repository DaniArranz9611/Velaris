import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, Star, MessagesSquare, TrendingUp, Pencil, Trash2, Check, X, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'
import EditarNombre from '../components/EditarNombre'
import JournalPersonal from '../components/JournalPersonal'
import { StarRatingDisplay } from '../components/StarRating'

function scrollA(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

  async function editarTeoria(id, cambios) {
    await supabase.from('teorias').update(cambios).eq('id', id)
  }

  async function borrarTeoria(id) {
    if (!confirm('¿Eliminar esta teoría?')) return
    await supabase.from('teorias').delete().eq('id', id)
  }

  const librosLeidos = resenas.filter((r) => r.libros)
  const promedioPropio =
    resenas.length > 0
      ? (resenas.reduce((acc, r) => acc + Number(r.calificacion), 0) / resenas.length).toFixed(1)
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
          <button className="card resumen-item resumen-clickable" onClick={() => scrollA('seccion-libros-leidos')}>
            <BookMarked size={20} className="resumen-icono" />
            <span className="resumen-label">Libros leídos</span>
            <span className="resumen-valor">{librosLeidos.length}</span>
          </button>
          <button className="card resumen-item resumen-clickable" onClick={() => scrollA('seccion-libros-leidos')}>
            <Star size={20} className="resumen-icono" />
            <span className="resumen-label">Mi calificación promedio</span>
            <span className="resumen-valor">{promedioPropio}</span>
          </button>
          <button className="card resumen-item resumen-clickable" onClick={() => scrollA('seccion-mis-teorias')}>
            <MessagesSquare size={20} className="resumen-icono" />
            <span className="resumen-label">Teorías publicadas</span>
            <span className="resumen-valor">{teorias.length}</span>
          </button>
        </div>

        {loading ? (
          <p>Cargando tu book journal...</p>
        ) : (
          <>
            <div className="card">
              <h2 className="mes-titulo">
                <TrendingUp size={16} /> Mis lecturas activas (podés tener varias a la vez)
              </h2>
              {avances.filter((a) => a.estado_personal !== 'leido').length === 0 ? (
                <p className="vacio">No estás con ningún libro en curso. Marcalo desde "Libros".</p>
              ) : (
                <div className="mini-avances">
                  {avances
                    .filter((a) => a.estado_personal !== 'leido')
                    .map((a) => (
                      <Link key={a.id} to={`/libros?abrir=${a.libros?.id}`} className="mini-avance-chip">
                        {!a.es_publico && '🔒 '}
                        {a.libros?.titulo}: {a.porcentaje}%
                      </Link>
                    ))}
                </div>
              )}
            </div>

            <div className="card" id="seccion-libros-leidos">
              <h2 className="mes-titulo">
                <BookMarked size={16} /> Libros del club que leí
              </h2>
              {librosLeidos.length === 0 ? (
                <p className="vacio">Todavía no escribiste ninguna reseña de un libro del club.</p>
              ) : (
                <ul className="lista">
                  {librosLeidos.map((r) => (
                    <li key={r.id} className="card">
                      <Link to={`/libros?abrir=${r.libros?.id}`} className="teoria-dashboard-link">
                        <strong>{r.libros?.titulo}</strong>
                        {r.libros?.autor && <span className="libro-autor"> — {r.libros.autor}</span>}
                      </Link>
                      <div className="estrellas">
                        <StarRatingDisplay valor={Number(r.calificacion)} />
                      </div>
                      {r.comentario && <p>{r.comentario}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card" id="seccion-mis-teorias">
              <h2 className="mes-titulo">
                <MessagesSquare size={16} /> Mis teorías
              </h2>
              {teorias.length === 0 ? (
                <p className="vacio">Todavía no publicaste ninguna teoría.</p>
              ) : (
                <div className="teorias-lista">
                  {teorias.map((t) => (
                    <MiTeoriaCard
                      key={t.id}
                      t={t}
                      onEditar={async (cambios) => {
                        await editarTeoria(t.id, cambios)
                        setTeorias((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...cambios } : x)))
                      }}
                      onBorrar={async () => {
                        await borrarTeoria(t.id)
                        setTeorias((prev) => prev.filter((x) => x.id !== t.id))
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <JournalPersonal />
          </>
        )}
      </div>
    </Layout>
  )
}

function MiTeoriaCard({ t, onEditar, onBorrar }) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(t.titulo)
  const [contenido, setContenido] = useState(t.contenido)
  const [spoiler, setSpoiler] = useState(t.spoiler)

  function guardar() {
    onEditar({ titulo, contenido, spoiler })
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="teoria-card">
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={3} />
        <label>
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          Contiene spoilers
        </label>
        <div className="teoria-acciones-editar">
          <button onClick={guardar}>
            <Check size={14} /> Guardar
          </button>
          <button className="boton-secundario" onClick={() => setEditando(false)}>
            <X size={14} /> Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="teoria-card">
      <div className="teoria-header">
        <Link to={`/libros?abrir=${t.libros?.id}`}>
          <strong>{t.titulo}</strong>
        </Link>
        {t.spoiler && (
          <span className="spoiler-tag">
            <EyeOff size={11} /> Spoiler
          </span>
        )}
        <span className="teoria-autor">— {t.libros?.titulo}</span>
      </div>
      <p>{t.contenido}</p>
      <div className="teoria-acciones-editar">
        <button className="boton-secundario" onClick={() => setEditando(true)}>
          <Pencil size={13} /> Editar
        </button>
        <button className="boton-secundario peligro" onClick={onBorrar}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  )
}
