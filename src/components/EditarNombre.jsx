import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

export default function EditarNombre({ className = '' }) {
  const { perfil, recargar } = usePerfil()
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const limpio = nombre.trim()
    if (!limpio || limpio === perfil.nombre) {
      setEditando(false)
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('perfiles').update({ nombre: limpio }).eq('id', perfil.id)
    setGuardando(false)
    if (!error) {
      await recargar()
      setEditando(false)
    }
  }

  if (!editando) {
    return (
      <span className={`editar-nombre ${className}`}>
        {perfil?.nombre}
        <button
          type="button"
          className="icono-boton"
          onClick={() => {
            setNombre(perfil?.nombre ?? '')
            setEditando(true)
          }}
          aria-label="Cambiar nombre"
        >
          <Pencil size={14} />
        </button>
      </span>
    )
  }

  return (
    <span className={`editar-nombre ${className}`}>
      <input
        type="text"
        value={nombre}
        autoFocus
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && guardar()}
        className="editar-nombre-input"
        maxLength={40}
      />
      <button type="button" className="icono-boton" onClick={guardar} disabled={guardando} aria-label="Guardar">
        <Check size={16} />
      </button>
      <button type="button" className="icono-boton" onClick={() => setEditando(false)} aria-label="Cancelar">
        <X size={16} />
      </button>
    </span>
  )
}
