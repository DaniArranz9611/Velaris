import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

export default function ResenasLibro({ libroId }) {
  const { perfil } = usePerfil()
  const [resenas, setResenas] = useState([])
  const [loading, setLoading] = useState(true)
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const miResena = resenas.find((r) => r.integrante_id === perfil?.id)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('resenas')
      .select('*, perfiles(nombre)')
      .eq('libro_id', libroId)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setResenas(data)
      const propia = data.find((r) => r.integrante_id === perfil?.id)
      if (propia) {
        setCalificacion(propia.calificacion)
        setComentario(propia.comentario ?? '')
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
      const nombreArchivo = `${perfil.id}/${libroId}-${Date.now()}.${foto.name.split('.').pop()}`
      const { error: errorSubida } = await supabase.storage.from('resenas').upload(nombreArchivo, foto)

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
        foto_url
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

  if (loading) return <p>Cargando reseñas...</p>

  return (
    <div className="resenas">
      {error && <p className="error">{error}</p>}

      <form onSubmit={guardarResena} className="form-inline resena-form">
        <label>
          Tu calificación:
          <select value={calificacion} onChange={(e) => setCalificacion(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'⭐'.repeat(n)}
              </option>
            ))}
          </select>
        </label>
        <textarea
          placeholder="¿Qué te pareció el libro?"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
        />
        <label>
          Agregar foto (opcional):
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
        </label>
        <button type="submit" disabled={subiendo}>
          {subiendo ? 'Guardando...' : miResena ? 'Actualizar mi reseña' : 'Publicar reseña'}
        </button>
      </form>

      {resenas.length === 0 ? (
        <p className="vacio">Todavía no hay reseñas de este libro.</p>
      ) : (
        <ul className="lista">
          {resenas.map((r) => (
            <li key={r.id} className="resena-item">
              <strong>{r.perfiles?.nombre ?? 'Sin nombre'}</strong>
              <span> {'⭐'.repeat(r.calificacion)}</span>
              {r.comentario && <p>{r.comentario}</p>}
              {r.foto_url && <img src={r.foto_url} alt="" className="resena-foto" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
