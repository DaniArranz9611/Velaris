import { useEffect, useState } from 'react'
import { Sparkles, EyeOff, Trash2, Pencil, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

export default function TeoriasLibro({ libroId }) {
  const { perfil } = usePerfil()
  const esAdmin = perfil?.es_admin_global
  const [teorias, setTeorias] = useState([])
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [spoiler, setSpoiler] = useState(true)
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    const { data, error } = await supabase
      .from('teorias')
      .select('*, perfiles(nombre)')
      .eq('libro_id', libroId)
      .order('created_at', { ascending: false })

    if (!error) setTeorias(data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [libroId])

  async function enviar(e) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return

    await supabase.from('teorias').insert({
      libro_id: libroId,
      integrante_id: perfil.id,
      titulo,
      contenido,
      spoiler,
    })

    setTitulo('')
    setContenido('')
    setSpoiler(true)
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

  if (cargando) return <p>Cargando teorías...</p>

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
        <button type="submit"><Sparkles size={16} /> Publicar teoría</button>
      </form>

      <div className="teorias-lista">
        {teorias.length === 0 && <p>Todavía no hay teorías para este libro.</p>}
        {teorias.map((t) => (
          <TeoriaCard key={t.id} t={t} perfil={perfil} esAdmin={esAdmin} onBorrar={borrar} onEditar={editar} />
        ))}
      </div>
    </div>
  )
}

function TeoriaCard({ t, perfil, esAdmin, onBorrar, onEditar }) {
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
      </div>

      {t.spoiler && !mostrar ? (
        <button className="spoiler-boton" onClick={() => setMostrar(true)}>
          Mostrar spoiler
        </button>
      ) : (
        <p>{t.contenido}</p>
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
