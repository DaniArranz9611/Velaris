import { useEffect, useState } from 'react'
import { Gift, PlusCircle, Pencil, Trash2, X, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import { comprimirImagen } from '../lib/imageUtils'
import Layout from '../components/Layout'

export default function DeseadosPage() {
  const { perfil } = usePerfil()
  const [integrantes, setIntegrantes] = useState([])
  const [deseados, setDeseados] = useState([])
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [nota, setNota] = useState('')
  const [portada, setPortada] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [editandoId, setEditandoId] = useState(null)

  async function cargar() {
    setLoading(true)
    const [{ data: perfilesData }, { data: deseadosData, error: errorDeseados }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre').order('nombre'),
      supabase.from('libros_deseados').select('*').order('created_at', { ascending: false })
    ])
    if (errorDeseados) setError(errorDeseados.message)
    setIntegrantes(perfilesData ?? [])
    setDeseados(deseadosData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('libros-deseados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'libros_deseados' }, () => cargar())
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  useEffect(() => {
    if (!seleccionadoId && perfil?.id) setSeleccionadoId(perfil.id)
  }, [perfil?.id, seleccionadoId])

  function limpiarForm() {
    setTitulo('')
    setAutor('')
    setNota('')
    setPortada(null)
    setEditandoId(null)
  }

  async function guardar(event) {
    event.preventDefault()
    setError('')
    setSubiendo(true)

    let portada_url = editandoId ? deseados.find((d) => d.id === editandoId)?.portada_url ?? null : null

    if (portada) {
      const comprimida = await comprimirImagen(portada)
      const nombreArchivo = `${perfil.id}/${Date.now()}.jpg`
      const { error: errorSubida } = await supabase.storage.from('deseados').upload(nombreArchivo, comprimida)
      if (errorSubida) {
        setError(errorSubida.message)
        setSubiendo(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('deseados').getPublicUrl(nombreArchivo)
      portada_url = publicUrlData.publicUrl
    }

    if (editandoId) {
      const { error } = await supabase
        .from('libros_deseados')
        .update({ titulo, autor, nota, portada_url })
        .eq('id', editandoId)
      if (error) {
        setError(error.message)
        setSubiendo(false)
        return
      }
    } else {
      const { error } = await supabase.from('libros_deseados').insert({
        integrante_id: perfil.id,
        titulo,
        autor,
        nota,
        portada_url
      })
      if (error) {
        setError(error.message)
        setSubiendo(false)
        return
      }
    }

    setSubiendo(false)
    limpiarForm()
    cargar()
  }

  function empezarEdicion(d) {
    setEditandoId(d.id)
    setTitulo(d.titulo)
    setAutor(d.autor ?? '')
    setNota(d.nota ?? '')
    setPortada(null)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este libro deseado?')) return
    const { error } = await supabase.from('libros_deseados').delete().eq('id', id)
    if (error) setError(error.message)
    cargar()
  }

  if (loading) return null

  const deseadosDeSeleccionado = deseados.filter((d) => d.integrante_id === seleccionadoId)
  const esPropia = seleccionadoId === perfil?.id

  return (
    <Layout>
      <div className="page">
        <h1><Gift size={22} /> Lista de deseados</h1>
        <p className="vacio">
          Elegí a alguien de la lista y descubrí qué libros le gustaría recibir de regalo. Cada persona arma y edita solo la suya.
        </p>

        <div className="card deseados-selector">
          {integrantes.map((i) => (
            <button
              key={i.id}
              type="button"
              className={i.id === seleccionadoId ? 'chip-persona activo' : 'chip-persona'}
              onClick={() => setSeleccionadoId(i.id)}
            >
              {i.nombre} {i.id === perfil?.id && '(vos)'}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {esPropia && (
          <form onSubmit={guardar} className="card form-inline">
            <h2 className="mes-titulo">{editandoId ? 'Editar deseado' : 'Agregar un libro deseado'}</h2>
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
            <textarea
              placeholder="Nota (edición, dónde conseguirlo, etc. — opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
            />
            <label>
              Portada (opcional):
              <input type="file" accept="image/*" onChange={(e) => setPortada(e.target.files[0])} />
            </label>
            <div className="teoria-acciones-editar">
              <button type="submit" disabled={subiendo}>
                <PlusCircle size={16} /> {subiendo ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar a mis deseados'}
              </button>
              {editandoId && (
                <button type="button" className="boton-secundario" onClick={limpiarForm}>
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {deseadosDeSeleccionado.length === 0 ? (
          <p className="vacio">
            {esPropia ? 'Todavía no agregaste libros a tu lista de deseados.' : 'Esta persona todavía no tiene libros deseados.'}
          </p>
        ) : (
          <div className="deseados-grid">
            {deseadosDeSeleccionado.map((d) => (
              <div key={d.id} className="card deseado-card">
                {d.portada_url ? (
                  <img src={d.portada_url} alt="" className="deseado-portada" />
                ) : (
                  <div className="deseado-portada deseado-portada-vacia"><Sparkles size={20} /></div>
                )}
                <strong>{d.titulo}</strong>
                {d.autor && <span className="libro-autor">{d.autor}</span>}
                {d.nota && <p>{d.nota}</p>}
                {esPropia && (
                  <div className="teoria-acciones-editar">
                    <button className="boton-secundario" onClick={() => empezarEdicion(d)}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button className="boton-secundario peligro" onClick={() => eliminar(d.id)}>
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
