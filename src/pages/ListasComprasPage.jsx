import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

export default function ListasComprasPage() {
  const { perfil, puede } = usePerfil()
  const [listas, setListas] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tituloLista, setTituloLista] = useState('')
  const [eventoLista, setEventoLista] = useState('')
  const [nuevoItem, setNuevoItem] = useState({})

  const puedeEditar = puede('contabilidad', 'editar')

  async function cargar() {
    setLoading(true)
    const [{ data: listasData, error: e1 }, { data: eventosData, error: e2 }] = await Promise.all([
      supabase
        .from('listas_compras')
        .select('*, eventos(titulo), items_lista_compra(*)')
        .order('created_at', { ascending: false }),
      supabase.from('eventos').select('id, titulo').order('fecha', { ascending: false })
    ])

    if (e1 || e2) {
      setError((e1 || e2).message)
    } else {
      setListas(listasData)
      setEventos(eventosData)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearLista(event) {
    event.preventDefault()
    setError('')

    const { error } = await supabase.from('listas_compras').insert({
      titulo: tituloLista,
      evento_id: eventoLista || null,
      creado_por: perfil?.id
    })

    if (error) {
      setError(error.message)
      return
    }

    setTituloLista('')
    setEventoLista('')
    cargar()
  }

  async function agregarItem(event, listaId) {
    event.preventDefault()
    const descripcion = nuevoItem[listaId]?.descripcion
    const monto_estimado = nuevoItem[listaId]?.monto

    if (!descripcion) return

    const { error } = await supabase.from('items_lista_compra').insert({
      lista_id: listaId,
      descripcion,
      monto_estimado: monto_estimado ? Number(monto_estimado) : null
    })

    if (error) {
      setError(error.message)
      return
    }

    setNuevoItem((prev) => ({ ...prev, [listaId]: { descripcion: '', monto: '' } }))
    cargar()
  }

  async function marcarComprado(item, comprado) {
    await supabase
      .from('items_lista_compra')
      .update({ comprado, comprado_por: comprado ? perfil.id : null })
      .eq('id', item.id)
    cargar()
  }

  return (
    <Layout>
      <div className="page">
        <h1>Listas de compras</h1>

        {puedeEditar && (
          <form onSubmit={crearLista} className="card form-inline">
            <input
              type="text"
              placeholder="Nombre de la lista (ej: Compras juntada de octubre)"
              value={tituloLista}
              onChange={(e) => setTituloLista(e.target.value)}
              required
            />
            <select value={eventoLista} onChange={(e) => setEventoLista(e.target.value)}>
              <option value="">Sin evento asociado</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo}
                </option>
              ))}
            </select>
            <button type="submit">Crear lista</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Cargando...</p>
        ) : listas.length === 0 ? (
          <p className="vacio">Todavía no hay listas de compras.</p>
        ) : (
          listas.map((lista) => {
            const totalEstimado = lista.items_lista_compra.reduce(
              (acc, i) => acc + Number(i.monto_estimado ?? 0),
              0
            )
            const totalReal = lista.items_lista_compra.reduce((acc, i) => acc + Number(i.monto_real ?? 0), 0)

            return (
              <div key={lista.id} className="card">
                <h2 className="mes-titulo">
                  {lista.titulo}
                  {lista.eventos && <span className="badge">{lista.eventos.titulo}</span>}
                </h2>

                <ul className="lista">
                  {lista.items_lista_compra.map((item) => (
                    <li key={item.id} className="movimiento-item">
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={(e) => marcarComprado(item, e.target.checked)}
                        disabled={!puedeEditar}
                      />
                      <span style={{ textDecoration: item.comprado ? 'line-through' : 'none' }}>
                        {item.descripcion}
                      </span>
                      {item.monto_estimado && <span className="fecha-movimiento">est. ${item.monto_estimado}</span>}
                    </li>
                  ))}
                </ul>

                <p className="vacio">
                  Estimado: ${totalEstimado.toFixed(2)} — Real: ${totalReal.toFixed(2)}
                </p>

                {puedeEditar && (
                  <form onSubmit={(e) => agregarItem(e, lista.id)} className="form-inline">
                    <input
                      type="text"
                      placeholder="Nuevo ítem (ej: café, medialunas)"
                      value={nuevoItem[lista.id]?.descripcion ?? ''}
                      onChange={(e) =>
                        setNuevoItem((prev) => ({
                          ...prev,
                          [lista.id]: { ...prev[lista.id], descripcion: e.target.value }
                        }))
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monto estimado"
                      value={nuevoItem[lista.id]?.monto ?? ''}
                      onChange={(e) =>
                        setNuevoItem((prev) => ({
                          ...prev,
                          [lista.id]: { ...prev[lista.id], monto: e.target.value }
                        }))
                      }
                    />
                    <button type="submit">Agregar ítem</button>
                  </form>
                )}
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}
