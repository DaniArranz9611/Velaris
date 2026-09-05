import { useEffect, useState } from 'react'
import { PlusCircle, Pencil, Trash2, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

function mesActualISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

const MONTO_ESPERADO_DEFECTO = 0

export default function CuotasMensuales() {
  const { perfil, puede } = usePerfil()
  const [integrantes, setIntegrantes] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [abiertoId, setAbiertoId] = useState(null)

  const [formIntegranteId, setFormIntegranteId] = useState(null)
  const [formMonto, setFormMonto] = useState('')
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10))
  const [formNota, setFormNota] = useState('')
  const [editandoPagoId, setEditandoPagoId] = useState(null)

  const [editandoEsperadoId, setEditandoEsperadoId] = useState(null)
  const [esperadoTemp, setEsperadoTemp] = useState('')

  const puedeEditar = puede('contabilidad', 'editar')
  const mes = mesActualISO()

  async function cargar() {
    setLoading(true)
    const [{ data: perfilesData }, { data: cuotasData }, { data: pagosData }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre').order('nombre'),
      supabase.from('cuotas_mensuales').select('*').eq('mes', mes),
      supabase.from('pagos_integrante').select('*').eq('mes', mes).order('fecha', { ascending: false })
    ])
    setIntegrantes(perfilesData ?? [])
    setCuotas(cuotasData ?? [])
    setPagos(pagosData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('cuotas-y-pagos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas_mensuales' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_integrante' }, () => cargar())
      .subscribe()

    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cuotaDe(integranteId) {
    return cuotas.find((c) => c.integrante_id === integranteId)
  }

  function montoEsperadoDe(integranteId) {
    return Number(cuotaDe(integranteId)?.monto_esperado ?? MONTO_ESPERADO_DEFECTO)
  }

  function pagosDe(integranteId) {
    return pagos.filter((p) => p.integrante_id === integranteId)
  }

  function acumuladoDe(integranteId) {
    return pagosDe(integranteId).reduce((acc, p) => acc + Number(p.monto), 0)
  }

  function abrirFormPago(integranteId) {
    setAbiertoId(abiertoId === integranteId ? null : integranteId)
    setFormIntegranteId(integranteId)
    setFormMonto('')
    setFormFecha(new Date().toISOString().slice(0, 10))
    setFormNota('')
    setEditandoPagoId(null)
  }

  async function guardarEsperado(integranteId) {
    setError('')
    const valor = Number(esperadoTemp || 0)
    const { error } = await supabase
      .from('cuotas_mensuales')
      .upsert(
        { mes, integrante_id: integranteId, monto_esperado: valor },
        { onConflict: 'mes,integrante_id' }
      )
    if (error) setError(error.message)
    setEditandoEsperadoId(null)
    cargar()
  }

  async function guardarPago(event) {
    event.preventDefault()
    setError('')
    if (!formMonto || Number(formMonto) <= 0) {
      setError('El monto del pago debe ser mayor a 0.')
      return
    }

    if (editandoPagoId) {
      const { error } = await supabase
        .from('pagos_integrante')
        .update({ monto: Number(formMonto), fecha: formFecha, nota: formNota || null })
        .eq('id', editandoPagoId)
      if (error) {
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('pagos_integrante').insert({
        mes,
        integrante_id: formIntegranteId,
        monto: Number(formMonto),
        fecha: formFecha,
        nota: formNota || null,
        creado_por: perfil?.id
      })
      if (error) {
        setError(error.message)
        return
      }
    }

    setFormMonto('')
    setFormFecha(new Date().toISOString().slice(0, 10))
    setFormNota('')
    setEditandoPagoId(null)
    cargar()
  }

  function editarPago(p) {
    setAbiertoId(p.integrante_id)
    setFormIntegranteId(p.integrante_id)
    setEditandoPagoId(p.id)
    setFormMonto(String(p.monto))
    setFormFecha(p.fecha)
    setFormNota(p.nota ?? '')
  }

  async function eliminarPago(id) {
    if (!confirm('¿Eliminar este pago?')) return
    const { error } = await supabase.from('pagos_integrante').delete().eq('id', id)
    if (error) setError(error.message)
    cargar()
  }

  if (loading) return <p>Cargando cuotas...</p>

  const totalEsperado = integrantes.reduce((acc, i) => acc + montoEsperadoDe(i.id), 0)
  const totalAcumulado = integrantes.reduce((acc, i) => acc + acumuladoDe(i.id), 0)

  const completos = integrantes.filter((i) => montoEsperadoDe(i.id) > 0 && acumuladoDe(i.id) >= montoEsperadoDe(i.id))
  const faltan = integrantes.filter((i) => montoEsperadoDe(i.id) === 0 || acumuladoDe(i.id) < montoEsperadoDe(i.id))

  return (
    <div className="card cuotas-card">
      <h2 className="mes-titulo">Cuota del mes — pagos acumulados</h2>
      <div className="cuotas-resumen">
        <span className="verde">Al día ({completos.length}): {completos.map((i) => i.nombre).join(', ') || '—'}</span>
        <span className="rojo">Faltan ({faltan.length}): {faltan.map((i) => i.nombre).join(', ') || '—'}</span>
        <span>Total recaudado por cuotas este mes: <strong>${totalAcumulado.toFixed(2)}</strong> de ${totalEsperado.toFixed(2)} esperado</span>
      </div>

      {error && <p className="error">{error}</p>}

      <ul className="lista-cuotas">
        {integrantes.map((i) => {
          const esperado = montoEsperadoDe(i.id)
          const acumulado = acumuladoDe(i.id)
          const diferencia = esperado - acumulado
          const alDia = esperado > 0 && acumulado >= esperado
          const misPagos = pagosDe(i.id)

          return (
            <li key={i.id} className="cuota-item cuota-item-col">
              <div className="cuota-item-header">
                <span>{i.nombre}</span>
                {editandoEsperadoId === i.id ? (
                  <span className="cuota-esperado-edit">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={esperadoTemp}
                      onChange={(e) => setEsperadoTemp(e.target.value)}
                    />
                    <button type="button" onClick={() => guardarEsperado(i.id)}><Check size={14} /></button>
                    <button type="button" onClick={() => setEditandoEsperadoId(null)}><X size={14} /></button>
                  </span>
                ) : (
                  <span className="cuota-esperado">
                    Esperado: ${esperado.toFixed(2)}
                    {puedeEditar && (
                      <button
                        type="button"
                        className="btn-icono"
                        onClick={() => {
                          setEditandoEsperadoId(i.id)
                          setEsperadoTemp(String(esperado))
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </span>
                )}
                <span className={alDia ? 'badge-estado badge-verde' : 'badge-estado badge-rojo'}>
                  {alDia ? 'Al día' : diferencia > 0 ? `Falta $${diferencia.toFixed(2)}` : 'Sin pagos'}
                </span>
                <span className="cuota-acumulado">Pagó: ${acumulado.toFixed(2)}</span>
                {puedeEditar && (
                  <button type="button" className="btn-link" onClick={() => abrirFormPago(i.id)}>
                    <PlusCircle size={14} /> Agregar pago
                  </button>
                )}
              </div>

              {misPagos.length > 0 && (
                <ul className="pagos-lista">
                  {misPagos.map((p) => (
                    <li key={p.id} className="pago-item">
                      <span className="verde">${Number(p.monto).toFixed(2)}</span>
                      <span className="fecha-movimiento">{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                      {p.nota && <span className="badge">{p.nota}</span>}
                      {puedeEditar && (
                        <span className="pago-acciones">
                          <button type="button" className="btn-icono" onClick={() => editarPago(p)}><Pencil size={12} /></button>
                          <button type="button" className="btn-icono" onClick={() => eliminarPago(p.id)}><Trash2 size={12} /></button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {puedeEditar && abiertoId === i.id && (
                <form onSubmit={guardarPago} className="form-pago-inline">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Monto pagado"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                    required
                  />
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nota (opcional)"
                    value={formNota}
                    onChange={(e) => setFormNota(e.target.value)}
                  />
                  <button type="submit">{editandoPagoId ? 'Guardar cambios' : 'Registrar pago'}</button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
