import { useEffect, useState } from 'react'
import { ShoppingBasket, PlusCircle, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

export default function ListasCompras({ eventos }) {
  const { perfil, puede } = usePerfil()
  const [listas, setListas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [titulo, setTitulo] = useState('')
  const [eventoId, setEventoId] = useState('')
  const [nuevoItem, setNuevoItem] = useState({})

  const puedeEditar = puede('contabilidad', 'editar')

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('listas_compras')
      .select('*, eventos(titulo), items_lista_compra(*)')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setListas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearLista(e) {
    e.preventDefault()
    const { error } = await supabase.from('listas_compras').insert({
      titulo,
      evento_id: eventoId || null,
      creado_por: perfil?.id,
    })
    if (error) {
      setError(error.message)
    } else {
      setTitulo('')
      setEventoId('')
      cargar()
    }
  }

  async function agregarItem(listaId) {
    const texto = nuevoItem[listaId]
    if (!texto?.trim()) return
    await supabase.from('items_lista_compra').insert({
      lista_id: listaId,
      descripcion: texto,
    })
    setNuevoItem({ ...nuevoItem, [listaId]: '' })
    cargar()
  }

  async function toggleItem(item) {
    await supabase
      .from('items_lista_compra')
      .update({ comprado: !item.comprado, comprado_por: !item.comprado ? perfil?.id : null })
      .eq('id', item.id)
    cargar()
  }

  async function borrarItem(id) {
    await supabase.from('items_lista_compra').delete().eq('id', id)
    cargar()
  }

  async function borrarLista(id) {
    if (!confirm('¿Eliminar toda la lista y sus items?')) return
    await supabase.from('listas_compras').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="listas-compras">
      <h2><ShoppingBasket size={20} /> Listas de compras</h2>

      {puedeEditar && (
        <form onSubmit={crearLista} className="card form-inline">
          <input
            type="text"
            placeholder="Título de la lista"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Sin evento asociado</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.titulo}
              </option>
            ))}
          </select>
          <button type="submit"><PlusCircle size={16} /> Crear lista</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : listas.length === 0 ? (
        <p className="vacio">Todavía no hay listas de compras.</p>
      ) : (
        <div className="listas-grid">
          {listas.map((lista) => (
            <div key={lista.id} className="card lista-compra">
              <div className="lista-header">
                <h3>{lista.titulo}</h3>
                {lista.eventos && <span className="badge">{lista.eventos.titulo}</span>}
                {puedeEditar && (
                  <button className="btn-link rojo" onClick={() => borrarLista(lista.id)}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
              </div>

              <ul className="items-lista">
                {lista.items_lista_compra?.length === 0 && <li className="vacio">Sin items.</li>}
                {lista.items_lista_compra?.map((item) => (
                  <li key={item.id} className={item.comprado ? 'item-comprado' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={() => toggleItem(item)}
                      />
                      {item.descripcion}
                    </label>
                    {puedeEditar && (
                      <button className="btn-link rojo" onClick={() => borrarItem(item.id)}>
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {puedeEditar && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    agregarItem(lista.id)
                  }}
                  className="form-inline"
                >
                  <input
                    type="text"
                    placeholder="Nuevo item"
                    value={nuevoItem[lista.id] || ''}
                    onChange={(e) =>
                      setNuevoItem({ ...nuevoItem, [lista.id]: e.target.value })
                    }
                  />
                  <button type="submit">Agregar</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
