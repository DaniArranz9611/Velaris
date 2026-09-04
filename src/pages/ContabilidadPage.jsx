import { useEffect, useState } from 'react'
import { Wallet2, PlusCircle, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'
import ListasCompras from '../components/ListasCompras'
import CuotasMensuales from '../components/CuotasMensuales'

function mesActualISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

function formatoMes(mesISO) {
  const [anio, mes] = mesISO.split('-')
  const nombres = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  return `${nombres[Number(mes) - 1]} ${anio}`
}

export default function ContabilidadPage() {
  const { perfil, puede } = usePerfil()
  const [movimientos, setMovimientos] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const [tipo, setTipo] = useState('ingreso')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [eventoId, setEventoId] = useState('')
  const [ticket, setTicket] = useState(null)

  const puedeEditar = puede('contabilidad', 'editar')

  async function cargar() {
    setLoading(true)
    const [{ data: movimientosData, error: e1 }, { data: eventosData, error: e2 }] = await Promise.all([
      supabase.from('movimientos').select('*, eventos(titulo)').order('fecha', { ascending: false }),
      supabase.from('eventos').select('id, titulo').order('fecha', { ascending: false })
    ])

    if (e1 || e2) {
      setError((e1 || e2).message)
    } else {
      setMovimientos(movimientosData)
      setEventos(eventosData)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function agregarMovimiento(event) {
    event.preventDefault()
    setError('')
    setSubiendo(true)

    let ticket_url = null

    if (ticket) {
      const nombreArchivo = `${perfil.id}/${Date.now()}.${ticket.name.split('.').pop()}`
      const { error: errorSubida } = await supabase.storage.from('tickets').upload(nombreArchivo, ticket)

      if (errorSubida) {
        setError(errorSubida.message)
        setSubiendo(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('tickets').getPublicUrl(nombreArchivo)
      ticket_url = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('movimientos').insert({
      tipo,
      descripcion,
      categoria,
      monto: Number(monto),
      fecha,
      evento_id: eventoId || null,
      ticket_url,
      creado_por: perfil?.id
    })

    setSubiendo(false)

    if (error) {
      setError(error.message)
      return
    }

    setDescripcion('')
    setCategoria('')
    setMonto('')
    setEventoId('')
    setTicket(null)
    cargar()
  }

  const mesActual = mesActualISO()
  const movimientosDelMes = movimientos.filter((m) => m.fecha.slice(0, 7) === mesActual.slice(0, 7))

  const recaudadoMes = movimientosDelMes
    .filter((m) => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + Number(m.monto), 0)
  const gastadoMes = movimientosDelMes
    .filter((m) => m.tipo === 'egreso')
    .reduce((acc, m) => acc + Number(m.monto), 0)

  const saldoTotal = movimientos.reduce(
    (acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)),
    0
  )

  const movimientosPorMes = movimientos.reduce((acc, m) => {
    const clave = m.fecha.slice(0, 7)
    if (!acc[clave]) acc[clave] = []
    acc[clave].push(m)
    return acc
  }, {})

  const gastoPorEvento = movimientos
    .filter((m) => m.tipo === 'egreso' && m.evento_id)
    .reduce((acc, m) => {
      const clave = m.eventos?.titulo ?? 'Evento eliminado'
      acc[clave] = (acc[clave] ?? 0) + Number(m.monto)
      return acc
    }, {})

  return (
    <Layout>
      <div className="page">
        <h1><Wallet2 size={22} /> Contabilidad</h1>

        <div className="resumen-grid">
          <div className="card resumen-item">
            <span className="resumen-label">Recaudado este mes</span>
            <span className="resumen-valor verde">${recaudadoMes.toFixed(2)}</span>
          </div>
          <div className="card resumen-item">
            <span className="resumen-label">Gastado este mes</span>
            <span className="resumen-valor rojo">${gastadoMes.toFixed(2)}</span>
          </div>
          <div className="card resumen-item">
            <span className="resumen-label">Saldo actual</span>
            <span className={`resumen-valor ${saldoTotal >= 0 ? 'verde' : 'rojo'}`}>
              ${saldoTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <CuotasMensuales />

        {puedeEditar && (
          <form onSubmit={agregarMovimiento} className="card form-inline">
            <label>
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="ingreso">Ingreso (ej: cuota)</option>
                <option value="egreso">Egreso (ej: gasto de evento)</option>
              </select>
            </label>
            <input
              type="text"
              placeholder="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Categoría (ej: libro, comida, alquiler)"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
            <label>
              Foto del ticket/recibo (opcional):
              <input type="file" accept="image/*" onChange={(e) => setTicket(e.target.files[0])} />
            </label>
            <button type="submit" disabled={subiendo}>
              <PlusCircle size={16} /> {subiendo ? 'Guardando...' : 'Registrar movimiento'}
            </button>
          </form>
        )}

        {Object.keys(gastoPorEvento).length > 0 && (
          <div className="card">
            <h2 className="mes-titulo"><Receipt size={16} /> Gasto por juntada/evento</h2>
            <ul className="lista">
              {Object.entries(gastoPorEvento).map(([titulo, total]) => (
                <li key={titulo} className="movimiento-item">
                  <strong>{titulo}</strong>
                  <span className="rojo">${total.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p className="vacio">Todavía no hay movimientos cargados.</p>
        ) : (
          Object.entries(movimientosPorMes)
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([mesClave, lista]) => (
              <div key={mesClave} className="card">
                <h2 className="mes-titulo">{formatoMes(mesClave + '-01')}</h2>
                <ul className="lista">
                  {lista.map((m) => (
                    <li key={m.id} className="movimiento-item">
                      <span className={m.tipo === 'ingreso' ? 'verde' : 'rojo'}>
                        {m.tipo === 'ingreso' ? '+' : '−'}${Number(m.monto).toFixed(2)}
                      </span>
                      <span> — {m.descripcion}</span>
                      {m.categoria && <span className="badge">{m.categoria}</span>}
                      {m.eventos && <span className="badge">{m.eventos.titulo}</span>}
                      {m.ticket_url && (
                        <a href={m.ticket_url} target="_blank" rel="noreferrer" className="btn-link">
                          Ver ticket
                        </a>
                      )}
                      <span className="fecha-movimiento">
                        {new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
        )}

        <ListasCompras eventos={eventos} />
      </div>
    </Layout>
  )
}
