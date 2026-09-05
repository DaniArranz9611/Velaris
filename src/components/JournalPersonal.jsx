import { useEffect, useState } from 'react'
import { PlusCircle, Trash2, Pencil, Check, X, Lock, Globe2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import { comprimirImagen } from '../lib/imageUtils'
import { StarRatingInput, StarRatingDisplay } from './StarRating'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function JournalPersonal() {
  const { perfil } = usePerfil()
  const [libros, setLibros] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [esPublico, setEsPublico] = useState(false)
  const [foto, setFoto] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    const { data, error } = await supabase
      .from('libro_journal_personal')
      .select('*')
      .eq('integrante_id', perfil.id)
      .order('fecha_publicacion', { ascending: false })

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
    setSubiendo(true)

    let foto_url = null
    if (foto) {
      const comprimida = await comprimirImagen(foto)
      const nombreArchivo = `${perfil.id}/journal-${Date.now()}.jpg`
      const { error: errorSubida } = await supabase.storage.from('resenas').upload(nombreArchivo, comprimida)
      if (!errorSubida) {
        const { data: publicUrlData } = supabase.storage.from('resenas').getPublicUrl(nombreArchivo)
        foto_url = publicUrlData.publicUrl
      }
    }

    const { error } = await supabase.from('libro_journal_personal').insert({
      integrante_id: perfil.id,
      titulo,
      autor,
      calificacion,
      comentario,
      fecha_publicacion: fecha,
      es_publico: esPublico,
      foto_url
    })

    setSubiendo(false)

    if (error) {
      setError(error.message)
      return
    }

    setTitulo('')
    setAutor('')
    setCalificacion(5)
    setComentario('')
    setFecha(hoyISO())
    setEsPublico(false)
    setFoto(null)
    cargar()
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este libro de tu journal personal?')) return
    await supabase.from('libro_journal_personal').delete().eq('id', id)
    cargar()
  }

  async function editar(id, cambios) {
    await supabase.from('libro_journal_personal').update(cambios).eq('id', id)
    cargar()
  }

  if (loading) return <p>Cargando tu journal...</p>

  return (
    <div className="card">
      <h2 className="mes-titulo">Mi book journal personal (fuera del club)</h2>
      <p className="vacio">
        Libros que leíste por tu cuenta, sin que formen parte del catálogo compartido del club.
        Podés dejarlos privados o hacerlos públicos para que el resto del club los vea.
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
        <label>
          Fecha:
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="check-publico">
          <input type="checkbox" checked={esPublico} onChange={(e) => setEsPublico(e.target.checked)} />
          {esPublico ? <Globe2 size={14} /> : <Lock size={14} />} {esPublico ? 'Pública (el club la puede ver)' : 'Privada (solo vos la ves)'}
        </label>
        <label>
          Agregar foto (opcional):
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
        </label>
        <button type="submit" disabled={subiendo}>
          <PlusCircle size={16} /> {subiendo ? 'Guardando...' : 'Agregar a mi journal'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {libros.length === 0 ? (
        <p className="vacio">Todavía no agregaste libros a tu journal personal.</p>
      ) : (
        <ul className="lista">
          {libros.map((l) => (
            <EntradaJournal key={l.id} l={l} onBorrar={borrar} onEditar={editar} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EntradaJournal({ l, onBorrar, onEditar }) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(l.titulo)
  const [autor, setAutor] = useState(l.autor ?? '')
  const [calificacion, setCalificacion] = useState(Number(l.calificacion) || 5)
  const [comentario, setComentario] = useState(l.comentario ?? '')
  const [esPublico, setEsPublico] = useState(l.es_publico ?? false)

  function guardar() {
    onEditar(l.id, { titulo, autor, calificacion, comentario, es_publico: esPublico })
    setEditando(false)
  }

  if (editando) {
    return (
      <li className="card">
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input type="text" value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Autor" />
        <StarRatingInput valor={calificacion} onChange={setCalificacion} />
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} />
        <label className="check-publico">
          <input type="checkbox" checked={esPublico} onChange={(e) => setEsPublico(e.target.checked)} />
          {esPublico ? <Globe2 size={14} /> : <Lock size={14} />} {esPublico ? 'Pública' : 'Privada'}
        </label>
        <div className="teoria-acciones-editar">
          <button onClick={guardar}>
            <Check size={14} /> Guardar
          </button>
          <button className="boton-secundario" onClick={() => setEditando(false)}>
            <X size={14} /> Cancelar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="card">
      <div className="lista-header">
        <strong>{l.titulo}</strong>
        {l.autor && <span className="libro-autor"> — {l.autor}</span>}
        <span className="fecha-movimiento">{new Date(l.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-AR')}</span>
        {l.es_publico ? <span className="badge"><Globe2 size={11} /> Pública</span> : <span className="badge"><Lock size={11} /> Privada</span>}
        <button className="btn-link" onClick={() => setEditando(true)}>
          <Pencil size={13} />
        </button>
        <button className="btn-link rojo" onClick={() => onBorrar(l.id)}>
          <Trash2 size={13} />
        </button>
      </div>
      {l.calificacion && <StarRatingDisplay valor={Number(l.calificacion)} />}
      {l.comentario && <p>{l.comentario}</p>}
      {l.foto_url && <img src={l.foto_url} alt="" className="resena-foto" />}
    </li>
  )
}
