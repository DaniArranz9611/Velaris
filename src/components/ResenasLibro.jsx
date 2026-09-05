import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Lock, Globe2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import { comprimirImagen } from '../lib/imageUtils'
import { StarRatingInput, StarRatingDisplay } from './StarRating'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ResenasLibro({ libroId }) {
  const { perfil } = usePerfil()
  const [resenas, setResenas] = useState([])
  const [reacciones, setReacciones] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [esPublico, setEsPublico] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [nuevoComentario, setNuevoComentario] = useState({})
  const [busqueda, setBusqueda] = useState('')

  const miResena = resenas.find((r) => r.integrante_id === perfil?.id)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('resenas')
      .select('*, perfiles(nombre)')
      .eq('libro_id', libroId)
      .order('fecha_publicacion', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setResenas(data)
      const propia = data.find((r) => r.integrante_id === perfil?.id)
      if (propia) {
        setCalificacion(propia.calificacion)
        setComentario(propia.comentario ?? '')
        setFecha(propia.fecha_publicacion ?? hoyISO())
        setEsPublico(propia.es_publico ?? true)
      }

      const ids = data.map((r) => r.id)
      if (ids.length > 0) {
        const [{ data: reaccionesData }, { data: comentariosData }] = await Promise.all([
          supabase.from('resena_reacciones').select('*').in('resena_id', ids),
          supabase.from('resena_comentarios').select('*, perfiles(nombre)').in('resena_id', ids).order('created_at', { ascending: true })
        ])
        setReacciones(reaccionesData ?? [])
        setComentarios(comentariosData ?? [])
      } else {
        setReacciones([])
        setComentarios([])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId])

  async function guardarResena(event) {
    event.preventDefault()
    setError('')
    setSubiendo(true)

    let foto_url = miResena?.foto_url ?? null

    if (foto) {
      const comprimida = await comprimirImagen(foto)
      const nombreArchivo = `${perfil.id}/${libroId}-${Date.now()}.jpg`
      const { error: errorSubida } = await supabase.storage.from('resenas').upload(nombreArchivo, comprimida)

      if (errorSubida) {
        setError(errorSubida.message)
        setSubiendo(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('resenas').getPublicUrl(nombreArchivo)
      foto_url = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('resenas').upsert(
      {
        libro_id: libroId,
        integrante_id: perfil.id,
        calificacion,
        comentario,
        foto_url,
        fecha_publicacion: fecha,
        es_publico: esPublico
      },
      { onConflict: 'libro_id,integrante_id' }
    )

    setSubiendo(false)

    if (error) {
      setError(error.message)
      return
    }

    setFoto(null)
    cargar()
  }

  function reaccionesDe(resenaId) {
    return reacciones.filter((r) => r.resena_id === resenaId)
  }

  function comentariosDe(resenaId) {
    return comentarios.filter((c) => c.resena_id === resenaId)
  }

  async function toggleReaccion(resena) {
    const propia = reaccionesDe(resena.id).find((r) => r.integrante_id === perfil.id)
    if (propia) {
      await supabase.from('resena_reacciones').delete().eq('id', propia.id)
    } else {
      await supabase.from('resena_reacciones').insert({ resena_id: resena.id, integrante_id: perfil.id })
    }
    cargar()
  }

  async function enviarComentario(resenaId) {
    const texto = (nuevoComentario[resenaId] ?? '').trim()
    if (!texto) return
    await supabase.from('resena_comentarios').insert({ resena_id: resenaId, integrante_id: perfil.id, comentario: texto })
    setNuevoComentario((prev) => ({ ...prev, [resenaId]: '' }))
    cargar()
  }

  if (loading) return <p>Cargando reseñas...</p>

  const resenasFiltradas = resenas.filter((r) => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return true
    return (r.comentario ?? '').toLowerCase().includes(texto) || (r.perfiles?.nombre ?? '').toLowerCase().includes(texto)
  })

  return (
    <div className="resenas">
      {error && <p className="error">{error}</p>}

      <form onSubmit={guardarResena} className="form-inline resena-form">
        <label>
          Tu calificación:
          <StarRatingInput valor={calificacion} onChange={setCalificacion} />
        </label>
        <textarea
          placeholder="¿Qué te pareció el libro?"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
        />
        <label>
          Fecha:
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="check-publico">
          <input type="checkbox" checked={esPublico} onChange={(e) => setEsPublico(e.target.checked)} />
          {esPublico ? <Globe2 size={14} /> : <Lock size={14} />} {esPublico ? 'Pública (todas la ven, pueden reaccionar y comentar)' : 'Privada (solo vos la ves)'}
        </label>
        <label>
          Agregar foto (opcional):
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
        </label>
        <button type="submit" disabled={subiendo}>
          {subiendo ? 'Guardando...' : miResena ? 'Actualizar mi reseña' : 'Publicar reseña'}
        </button>
      </form>

      {resenas.length > 3 && (
        <input
          type="text"
          className="buscador-input"
          placeholder="Buscar por texto o persona..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {resenasFiltradas.length === 0 ? (
        <p className="vacio">{resenas.length === 0 ? 'Todavía no hay reseñas de este libro.' : 'No se encontraron reseñas con ese criterio.'}</p>
      ) : (
        <ul className="lista">
          {resenasFiltradas.map((r) => {
            const misReacciones = reaccionesDe(r.id)
            const yaReaccione = misReacciones.some((x) => x.integrante_id === perfil?.id)
            const susComentarios = comentariosDe(r.id)
            return (
              <li key={r.id} className="resena-item">
                <div className="publicacion-header">
                  <strong>{r.perfiles?.nombre ?? 'Sin nombre'}</strong>
                  <span className="fecha-movimiento">{new Date(r.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                  {!r.es_publico && <span className="badge"><Lock size={11} /> Privada</span>}
                </div>
                <StarRatingDisplay valor={Number(r.calificacion)} />
                {r.comentario && <p>{r.comentario}</p>}
                {r.foto_url && <img src={r.foto_url} alt="" className="resena-foto" />}

                {r.es_publico && (
                  <div className="publicacion-acciones">
                    <button type="button" className={yaReaccione ? 'btn-reaccion activo' : 'btn-reaccion'} onClick={() => toggleReaccion(r)}>
                      <Heart size={14} /> {misReacciones.length}
                    </button>
                    <span className="btn-reaccion"><MessageCircle size={14} /> {susComentarios.length}</span>
                  </div>
                )}

                {r.es_publico && (
                  <div className="comentarios-bloque">
                    {susComentarios.map((c) => (
                      <p key={c.id} className="comentario-item">
                        <strong>{c.perfiles?.nombre ?? 'Alguien'}:</strong> {c.comentario}
                      </p>
                    ))}
                    <form
                      className="form-comentario"
                      onSubmit={(e) => {
                        e.preventDefault()
                        enviarComentario(r.id)
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Escribí un comentario..."
                        value={nuevoComentario[r.id] ?? ''}
                        onChange={(e) => setNuevoComentario((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button type="submit">Comentar</button>
                    </form>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
