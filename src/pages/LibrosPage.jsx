import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, PlusCircle, Trash2, Star } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'
import ResenasLibro from '../components/ResenasLibro'
import AvanceLectura from '../components/AvanceLectura'
import TeoriasLibro from '../components/TeoriasLibro'

export default function LibrosPage() {
  const { perfil, puede } = usePerfil()
  const [searchParams] = useSearchParams()
  const [libros, setLibros] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [error, setError] = useState('')
  const [libroAbierto, setLibroAbierto] = useState(searchParams.get('abrir'))

  const puedeEditar = puede('lecturas', 'editar')

  async function cargarLibros() {
    setLoading(true)
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setLibros(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarLibros()
  }, [])

  async function agregarLibro(event) {
    event.preventDefault()
    setError('')

    const { error } = await supabase.from('libros').insert({
      titulo,
      autor,
      creado_por: perfil?.id
    })

    if (error) {
      setError(error.message)
      return
    }

    setTitulo('')
    setAutor('')
    cargarLibros()
  }

  async function cambiarEstado(libroId, estado) {
    const { error } = await supabase.from('libros').update({ estado }).eq('id', libroId)
    if (error) {
      setError(error.message)
      return
    }
    cargarLibros()
  }

  async function marcarLecturaDelMes(libroId) {
    setError('')
    await supabase.from('libros').update({ es_lectura_del_mes: false }).neq('id', libroId)
    const { error } = await supabase
      .from('libros')
      .update({ es_lectura_del_mes: true, estado: 'leyendo' })
      .eq('id', libroId)
    if (error) {
      setError(error.message)
      return
    }
    cargarLibros()
  }

  async function eliminarLibro(libroId, titulo) {
    if (!confirm(`¿Eliminar "${titulo}"? Se van a borrar también sus reseñas, teorías y avances.`)) return
    setError('')
    const { data, error } = await supabase.from('libros').delete().eq('id', libroId).select()
    if (error) {
      setError(error.message)
      return
    }
    if (!data || data.length === 0) {
      setError('No se pudo eliminar (falta permiso). Ejecutá sql/05_lectura_del_mes.sql en Supabase.')
      return
    }
    cargarLibros()
  }

  const ORDEN_ESTADO = { leyendo: 0, por_leer: 1, leido: 2 }
  const librosOrdenados = [...libros].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado])

  const ETIQUETAS_ESTADO = {
    por_leer: 'Por leer',
    leyendo: '📖 Leyendo ahora',
    leido: '✅ Leído'
  }

  return (
    <Layout>
      <div className="page">
        <h1><BookOpen size={22} /> Libros</h1>

        {puedeEditar && (
          <form onSubmit={agregarLibro} className="card form-inline">
            <input
              type="text"
              placeholder="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Autor"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
            />
            <button type="submit"><PlusCircle size={16} /> Agregar libro</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Cargando...</p>
        ) : libros.length === 0 ? (
          <p className="vacio">Todavía no hay libros cargados.</p>
        ) : (
          <ul className="lista">
            {librosOrdenados.map((libro) => (
              <li key={libro.id} className={`card libro-card estado-${libro.estado}`}>
                <div className="libro-encabezado">
                  <div>
                    <strong>{libro.titulo}</strong>
                    {libro.autor && <span className="libro-autor"> — {libro.autor}</span>}
                    {libro.es_lectura_del_mes && (
                      <span className="badge badge-dorado">
                        <Star size={11} /> Lectura oficial del club
                      </span>
                    )}
                  </div>
                  {puedeEditar ? (
                    <select
                      className="estado-select"
                      value={libro.estado}
                      onChange={(e) => cambiarEstado(libro.id, e.target.value)}
                    >
                      <option value="por_leer">Por leer</option>
                      <option value="leyendo">Leyendo ahora</option>
                      <option value="leido">Leído</option>
                    </select>
                  ) : (
                    <span className="badge">{ETIQUETAS_ESTADO[libro.estado]}</span>
                  )}
                </div>
                <div className="libro-acciones">
                  <button
                    className="btn-link"
                    onClick={() => setLibroAbierto(libroAbierto === libro.id ? null : libro.id)}
                  >
                    {libroAbierto === libro.id ? 'Ocultar' : 'Ver más'}
                  </button>
                  {puedeEditar && !libro.es_lectura_del_mes && (
                    <button className="btn-link" onClick={() => marcarLecturaDelMes(libro.id)}>
                      <Star size={14} /> Marcar como lectura del club
                    </button>
                  )}
                  {puedeEditar && (
                    <button className="btn-link rojo" onClick={() => eliminarLibro(libro.id, libro.titulo)}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )}
                </div>
                {libroAbierto === libro.id && (
                  <div className="libro-detalles">
                    <h4>Avance de lectura</h4>
                    <AvanceLectura libroId={libro.id} />
                    <h4>Teorías</h4>
                    <TeoriasLibro libroId={libro.id} />
                    <h4>Reseñas</h4>
                    <ResenasLibro libroId={libro.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
