import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

export default function AvanceLectura({ libroId }) {
  const { perfil } = usePerfil()
  const [avances, setAvances] = useState([])
  const [miAvance, setMiAvance] = useState(0)
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    const { data, error } = await supabase
      .from('avance_lectura')
      .select('*, perfiles(nombre)')
      .eq('libro_id', libroId)
      .order('created_at', { ascending: false })

    if (!error) {
      setAvances(data)
      const propio = data.find((a) => a.integrante_id === perfil?.id)
      if (propio) setMiAvance(propio.porcentaje)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId])

  async function guardar(porcentaje) {
    setMiAvance(porcentaje)
    await supabase.from('avance_lectura').upsert(
      { libro_id: libroId, integrante_id: perfil.id, porcentaje },
      { onConflict: 'libro_id,integrante_id' }
    )
    cargar()
  }

  if (cargando) return <p>Cargando avances...</p>

  return (
    <div className="avance-lectura">
      <label>
        Mi progreso:
        <input
          type="range"
          min={0}
          max={100}
          value={miAvance}
          onChange={(e) => guardar(Number(e.target.value))}
        />
        <span>{miAvance}%</span>
      </label>

      <div className="avance-barras">
        {avances.map((a) => (
          <div key={a.id} className="avance-barra">
            <span>{a.perfiles?.nombre ?? 'Sin nombre'}</span>
            <div className="barra-fondo">
              <div className="barra-llenado" style={{ width: `${a.porcentaje}%` }} />
            </div>
            <span>{a.porcentaje}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
