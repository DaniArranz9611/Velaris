import { useEffect, useState } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import { StarRatingInput, StarRatingDisplay } from './StarRating'

export default function JournalPersonal() {
  const { perfil } = usePerfil()
  const [libros, setLibros] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')

  async function cargar() {
    const { data, error } = await supabase
      .from('libro_journal_personal')
      .select('*')
      .eq('integrante_id', perfil.id)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setLibros(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!perfil?.id) return
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id])

  async function agregar(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('libro_journal_personal').insert({
      integrante_id: perfil.id,
      titulo,
      autor,
      calificacion,
      comentario
    })

    if (error) {
      setError(error.message)
      return
    }

    setTitulo('')
    setAutor('')
    setCalificacion(5)
    setComentario('')
    cargar()
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este libro de tu journal personal?')) return
    await supabase.from('libro_journal_personal').delete().eq('id', id)
    cargar()
  }

  if (loading) return <p>Cargando tu journal...</p>

  return (
    <div className="card">
      <h2 className="mes-titulo">Mi book journal personal (fuera del club)</h2>
      <p className="vacio">
        Libros que leíste por tu cuenta, sin que formen parte del catálogo compartido del club.
      </p>

      <form onSubmit={agregar} className="form-inline">
        <input
          type="text"
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Autor (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <label>
          Mi calificación:
          <StarRatingInput valor={calificacion} onChange={setCalificacion} />
        </label>
        <textarea
          placeholder="¿Qué te pareció? (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
        />
        <button type="submit">
          <PlusCircle size={16} /> Agregar a mi journal
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {libros.length === 0 ? (
        <p className="vacio">Todavía no agregaste libros a tu journal personal.</p>
      ) : (
        <ul className="lista">
          {libros.map((l) => (
            <li key={l.id} className="card">
              <div className="lista-header">
                <strong>{l.titulo}</strong>
                {l.autor && <span className="libro-autor"> — {l.autor}</span>}
                <button className="btn-link rojo" onClick={() => borrar(l.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
              {l.calificacion && <StarRatingDisplay valor={Number(l.calificacion)} />}
              {l.comentario && <p>{l.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
