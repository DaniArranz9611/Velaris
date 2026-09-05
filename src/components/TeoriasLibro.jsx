import { useEffect, useState } from 'react'
import { Sparkles, EyeOff, Trash2, Pencil, Check, X, Heart, MessageCircle, Lock, Globe2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import { comprimirImagen } from '../lib/imageUtils'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function TeoriasLibro({ libroId }) {
  const { perfil } = usePerfil()
  const esAdmin = perfil?.es_admin_global
  const [teorias, setTeorias] = useState([])
  const [reacciones, setReacciones] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [spoiler, setSpoiler] = useState(true)
  const [fecha, setFecha] = useState(hoyISO())
  const [esPublico, setEsPublico] = useState(true)
  const [foto, setFoto] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [nuevoComentario, setNuevoComentario] = useState({})
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    const { data, error } = await supabase
      .from('teorias')
      .select('*, perfiles(nombre)')
      .eq('libro_id', libroId)
      .order('fecha_publicacion', { ascending: false })

    if (!error) {
      setTeorias(data)
      const ids = data.map((t) => t.id)
      if (ids.length > 0) {
        const [{ data: reaccionesData }, { data: comentariosData }] = await Promise.all([
          supabase.from('teoria_reacciones').select('*').in('teoria_id', ids),
          supabase.from('teoria_comentarios').select('*, perfiles(nombre)').in('teoria_id', ids).order('created_at', { ascending: true })
        ])
        setReacciones(reaccionesData ?? [])
        setComentarios(comentariosData ?? [])
      } else {
        setReacciones([])
        setComentarios([])
      }
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId])

  async function enviar(e) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return
    setSubiendo(true)

    let foto_url = null
    if (foto) {
      const comprimida = await comprimirImagen(foto)
      const nombreArchivo = `${perfil.id}/${libroId}-${Date.now()}.jpg`
      const { error: errorSubida } = await supabase.storage.from('resenas').upload(nombreArchivo, comprimida)
      if (!errorSubida) {
        const { data: publicUrlData } = supabase.storage.from('resenas').getPublicUrl(nombreArchivo)
        foto_url = publicUrlData.publicUrl
      }
    }

    await supabase.from('teorias').insert({
      libro_id: libroId,
      integrante_id: perfil.id,
      titulo,
      contenido,
      spoiler,
      fecha_publicacion: fecha,
      es_publico: esPublico,
      foto_url
    })

    setTitulo('')
    setContenido('')
    setSpoiler(true)
    setFecha(hoyISO())
    setEsPublico(true)
    setFoto(null)
    setSubiendo(false)
    cargar()
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar esta teoría?')) return
    await supabase.from('teorias').delete().eq('id', id)
    cargar()
  }

  async function editar(id, cambios) {
    await supabase.from('teorias').update(cambios).eq('id', id)
    cargar()
  }

  function reaccionesDe(teoriaId) {
    return reacciones.filter((r) => r.teoria_id === teoriaId)
  }

  function comentariosDe(teoriaId) {
    return comentarios.filter((c) => c.teoria_id === teoriaId)
  }

  async function toggleReaccion(teoria) {
    const propia = reaccionesDe(teoria.id).find((r) => r.integrante_id === perfil.id)
    if (propia) {
      await supabase.from('teoria_reacciones').delete().eq('id', propia.id)
    } else {
      await supabase.from('teoria_reacciones').insert({ teoria_id: teoria.id, integrante_id: perfil.id })
    }
    cargar()
  }

  async function enviarComentario(teoriaId) {
    const texto = (nuevoComentario[teoriaId] ?? '').trim()
    if (!texto) return
    await supabase.from('teoria_comentarios').insert({ teoria_id: teoriaId, integrante_id: perfil.id, comentario: texto })
    setNuevoComentario((prev) => ({ ...prev, [teoriaId]: '' }))
    cargar()
  }

  if (cargando) return <p>Cargando teorías...</p>

  const teoriasFiltradas = teorias.filter((t) => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return true
    return t.titulo.toLowerCase().includes(texto) || t.contenido.toLowerCase().includes(texto) || (t.perfiles?.nombre ?? '').toLowerCase().includes(texto)
  })

  return (
    <div className="teorias-libro">
      <form onSubmit={enviar} className="teoria-form">
        <input
          type="text"
          placeholder="Título de la teoría"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <textarea
          placeholder="¿Qué crees que va a pasar?"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          required
        />
        <label>
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          Contiene spoilers
        </label>
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
        <button type="submit" disabled={subiendo}><Sparkles size={16} /> {subiendo ? 'Publicando...' : 'Publicar teoría'}</button>
      </form>

      <div className="teorias-lista">
        {teorias.length > 3 && (
          <input
            type="text"
            className="buscador-input"
            placeholder="Buscar teorías por título, contenido o persona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        )}
        {teorias.length === 0 && <p>Todavía no hay teorías para este libro.</p>}
        {teorias.length > 0 && teoriasFiltradas.length === 0 && <p>No se encontraron teorías con ese criterio.</p>}
        {teoriasFiltradas.map((t) => (
          <TeoriaCard
            key={t.id}
            t={t}
            perfil={perfil}
            esAdmin={esAdmin}
            onBorrar={borrar}
            onEditar={editar}
            reacciones={reaccionesDe(t.id)}
            comentarios={comentariosDe(t.id)}
            onReaccionar={() => toggleReaccion(t)}
            nuevoComentario={nuevoComentario[t.id] ?? ''}
            onCambiarComentario={(valor) => setNuevoComentario((prev) => ({ ...prev, [t.id]: valor }))}
            onEnviarComentario={() => enviarComentario(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TeoriaCard({ t, perfil, esAdmin, onBorrar, onEditar, reacciones, comentarios, onReaccionar, nuevoComentario, onCambiarComentario, onEnviarComentario }) {
  const [mostrar, setMostrar] = useState(!t.spoiler)
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(t.titulo)
  const [contenido, setContenido] = useState(t.contenido)
  const [spoiler, setSpoiler] = useState(t.spoiler)

  function guardar() {
    onEditar(t.id, { titulo, contenido, spoiler })
    setEditando(false)
  }

  const puedeEditar = t.integrante_id === perfil?.id || esAdmin
  const yaReaccione = reacciones.some((r) => r.integrante_id === perfil?.id)

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
        <strong>{t.titulo}</strong>
        {t.spoiler && (
          <span className="spoiler-tag"><EyeOff size={11} /> Spoiler</span>
        )}
        <span className="teoria-autor">— {t.perfiles?.nombre ?? 'Anónimo'}</span>
        <span className="fecha-movimiento">{new Date(t.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-AR')}</span>
        {!t.es_publico && <span className="badge"><Lock size={11} /> Privada</span>}
      </div>

      {t.spoiler && !mostrar ? (
        <button className="spoiler-boton" onClick={() => setMostrar(true)}>
          Mostrar spoiler
        </button>
      ) : (
        <>
          <p>{t.contenido}</p>
          {t.foto_url && <img src={t.foto_url} alt="" className="resena-foto" />}
        </>
      )}

      {t.es_publico && (
        <div className="publicacion-acciones">
          <button type="button" className={yaReaccione ? 'btn-reaccion activo' : 'btn-reaccion'} onClick={onReaccionar}>
            <Heart size={14} /> {reacciones.length}
          </button>
          <span className="btn-reaccion"><MessageCircle size={14} /> {comentarios.length}</span>
        </div>
      )}

      {t.es_publico && (
        <div className="comentarios-bloque">
          {comentarios.map((c) => (
            <p key={c.id} className="comentario-item">
              <strong>{c.perfiles?.nombre ?? 'Alguien'}:</strong> {c.comentario}
            </p>
          ))}
          <form
            className="form-comentario"
            onSubmit={(e) => {
              e.preventDefault()
              onEnviarComentario()
            }}
          >
            <input
              type="text"
              placeholder="Escribí un comentario..."
              value={nuevoComentario}
              onChange={(e) => onCambiarComentario(e.target.value)}
            />
            <button type="submit">Comentar</button>
          </form>
        </div>
      )}

      {puedeEditar && (
        <div className="teoria-acciones-editar">
          <button className="boton-secundario" onClick={() => setEditando(true)}>
            <Pencil size={13} /> Editar
          </button>
          <button className="boton-secundario peligro" onClick={() => onBorrar(t.id)}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
