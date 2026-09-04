import { useEffect, useState } from 'react'
import { Lock, Globe } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'

const ESTADOS = [
  { valor: 'por_leer', etiqueta: 'Por leer' },
  { valor: 'leyendo', etiqueta: 'Leyendo' },
  { valor: 'leido', etiqueta: 'Leído' }
]

export default function AvanceLectura({ libroId }) {
  const { perfil } = usePerfil()
  const [avances, setAvances] = useState([])
  const [miPorcentaje, setMiPorcentaje] = useState(0)
  const [miEstado, setMiEstado] = useState('leyendo')
  const [esPublico, setEsPublico] = useState(true)
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
      if (propio) {
        setMiPorcentaje(propio.porcentaje)
        setMiEstado(propio.estado_personal)
        setEsPublico(propio.es_publico)
      }
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId])

  async function guardar(cambios) {
    const nuevo = {
      porcentaje: miPorcentaje,
      estado_personal: miEstado,
      es_publico: esPublico,
      ...cambios
    }
    setMiPorcentaje(nuevo.porcentaje)
    setMiEstado(nuevo.estado_personal)
    setEsPublico(nuevo.es_publico)

    await supabase.from('avance_lectura').upsert(
      { libro_id: libroId, integrante_id: perfil.id, ...nuevo },
      { onConflict: 'libro_id,integrante_id' }
    )
    cargar()
  }

  if (cargando) return <p>Cargando avances...</p>

  const otros = avances.filter((a) => a.integrante_id !== perfil?.id)

  return (
    <div className="avance-lectura">
      <div className="mi-avance-editor">
        <label className="mi-avance-estado">
          Mi estado con este libro:
          <select value={miEstado} onChange={(e) => guardar({ estado_personal: e.target.value })}>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mi progreso:
          <input
            type="range"
            min={0}
            max={100}
            value={miPorcentaje}
            onChange={(e) => guardar({ porcentaje: Number(e.target.value) })}
          />
          <span>{miPorcentaje}%</span>
        </label>

        <button
          type="button"
          className={`toggle-privacidad ${esPublico ? '' : 'privado'}`}
          onClick={() => guardar({ es_publico: !esPublico })}
        >
          {esPublico ? <Globe size={14} /> : <Lock size={14} />}
          {esPublico ? 'Visible para el club' : 'Solo yo lo veo'}
        </button>
      </div>

      {otros.length > 0 && (
        <div className="avance-barras">
          {otros.map((a) => (
            <div key={a.id} className="avance-barra">
              <span>{a.perfiles?.nombre ?? 'Sin nombre'}</span>
              <div className="barra-fondo">
                <div className="barra-llenado" style={{ width: `${a.porcentaje}%` }} />
              </div>
              <span>{a.porcentaje}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

