import { useEffect, useState } from 'react'
import { Sparkles, EyeOff, Trash2 } from 'lucide-react'
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
          <TeoriaCard key={t.id} t={t} perfil={perfil} esAdmin={esAdmin} onBorrar={borrar} />
        ))}
      </div>
    </div>
  )
}

function TeoriaCard({ t, perfil, esAdmin, onBorrar }) {
  const [mostrar, setMostrar] = useState(!t.spoiler)

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

      {(t.integrante_id === perfil?.id || esAdmin) && (
        <button className="boton-secundario" onClick={() => onBorrar(t.id)}>
          <Trash2 size={13} /> Eliminar
        </button>
      )}
    </div>
  )
}
