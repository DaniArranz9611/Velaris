import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

function mesActualISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

export default function CuotasMensuales() {
  const { puede } = usePerfil()
  const [integrantes, setIntegrantes] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [loading, setLoading] = useState(true)

  const puedeEditar = puede('contabilidad', 'editar')
  const mes = mesActualISO()

  async function cargar() {
    setLoading(true)
    const [{ data: perfilesData }, { data: cuotasData }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre').order('nombre'),
      supabase.from('cuotas_mensuales').select('*').eq('mes', mes)
    ])
    setIntegrantes(perfilesData ?? [])
    setCuotas(cuotasData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('cuotas-mensuales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas_mensuales' }, () => cargar())
      .subscribe()

    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cuotaDe(integranteId) {
    return cuotas.find((c) => c.integrante_id === integranteId)
  }

  async function marcarPago(integranteId, pago) {
    await supabase
      .from('cuotas_mensuales')
      .upsert(
        { mes, integrante_id: integranteId, pago, fecha_pago: pago ? new Date().toISOString().slice(0, 10) : null },
        { onConflict: 'mes,integrante_id' }
      )
    cargar()
  }

  if (loading) return <p>Cargando cuotas...</p>

  const pagaron = integrantes.filter((i) => cuotaDe(i.id)?.pago)
  const faltan = integrantes.filter((i) => !cuotaDe(i.id)?.pago)

  return (
    <div className="card cuotas-card">
      <h2 className="mes-titulo">Cuota del mes — ¿quién pagó?</h2>
      <div className="cuotas-resumen">
        <span className="verde">Pagaron ({pagaron.length}): {pagaron.map((i) => i.nombre).join(', ') || '—'}</span>
        <span className="rojo">Faltan ({faltan.length}): {faltan.map((i) => i.nombre).join(', ') || '—'}</span>
      </div>

      {puedeEditar && (
        <ul className="lista-cuotas">
          {integrantes.map((i) => {
            const pagado = cuotaDe(i.id)?.pago ?? false
            return (
              <li key={i.id} className="cuota-item">
                <span>{i.nombre}</span>
                <div className="rsvp">
                  <button className={pagado ? 'activo' : ''} onClick={() => marcarPago(i.id, true)}>
                    <Check size={14} /> Pagó
                  </button>
                  <button className={!pagado ? 'activo' : ''} onClick={() => marcarPago(i.id, false)}>
                    <X size={14} /> No pagó
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
