import { useEffect, useState } from 'react'
import { BarChart3, PlusCircle, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

export default function EncuestasPage() {
  const { perfil, puede } = usePerfil()
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pregunta, setPregunta] = useState('')
  const [opciones, setOpciones] = useState(['', ''])

  const puedeCrear = puede('lecturas', 'editar')

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('encuestas')
      .select('*, opciones_encuesta(*, votos_encuesta(*))')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEncuestas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('encuestas-publicas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuestas' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opciones_encuesta' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votos_encuesta' }, () => cargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function actualizarOpcion(i, valor) {
    setOpciones((prev) => prev.map((o, idx) => (idx === i ? valor : o)))
  }

  function agregarCampoOpcion() {
    setOpciones((prev) => [...prev, ''])
  }

  async function crearEncuesta(e) {
    e.preventDefault()
    setError('')

    const opcionesValidas = opciones.map((o) => o.trim()).filter(Boolean)
    if (opcionesValidas.length < 2) {
      setError('Agregá al menos dos opciones.')
      return
    }

    const { data: encuesta, error: e1 } = await supabase
      .from('encuestas')
      .insert({ pregunta, creado_por: perfil.id })
      .select()
      .single()

    if (e1) {
      setError(e1.message)
      return
    }

    const { error: e2 } = await supabase
      .from('opciones_encuesta')
      .insert(opcionesValidas.map((texto) => ({ encuesta_id: encuesta.id, texto })))

    if (e2) {
      setError(e2.message)
      return
    }

    setPregunta('')
    setOpciones(['', ''])
    cargar()
  }

  async function votar(encuestaId, opcionId) {
    await supabase
      .from('votos_encuesta')
      .upsert(
        { encuesta_id: encuestaId, opcion_id: opcionId, integrante_id: perfil.id },
        { onConflict: 'encuesta_id,integrante_id' }
      )
    cargar()
  }

  async function borrarEncuesta(id) {
    if (!confirm('¿Eliminar esta encuesta?')) return
    await supabase.from('encuestas').delete().eq('id', id)
    cargar()
  }

  return (
    <Layout>
      <div className="page">
        <h1>
          <BarChart3 size={22} /> Encuestas
        </h1>

        {puedeCrear && (
          <form onSubmit={crearEncuesta} className="card form-inline">
            <input
              type="text"
              placeholder="¿Qué querés preguntarle al club?"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              required
            />
            {opciones.map((opcion, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Opción ${i + 1}`}
                value={opcion}
                onChange={(e) => actualizarOpcion(i, e.target.value)}
              />
            ))}
            <button type="button" className="btn-link" onClick={agregarCampoOpcion}>
              + Agregar otra opción
            </button>
            <button type="submit">
              <PlusCircle size={16} /> Crear encuesta
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Cargando...</p>
        ) : encuestas.length === 0 ? (
          <p className="vacio">Todavía no hay encuestas.</p>
        ) : (
          encuestas.map((encuesta) => {
            const totalVotos = encuesta.opciones_encuesta.reduce(
              (acc, o) => acc + o.votos_encuesta.length,
              0
            )
            const miVoto = encuesta.opciones_encuesta.find((o) =>
              o.votos_encuesta.some((v) => v.integrante_id === perfil?.id)
            )?.id

            return (
              <div key={encuesta.id} className="card encuesta-card">
                <div className="lista-header">
                  <h3>{encuesta.pregunta}</h3>
                  {(encuesta.creado_por === perfil?.id || perfil?.es_admin_global) && (
                    <button className="btn-link rojo" onClick={() => borrarEncuesta(encuesta.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="opciones-encuesta">
                  {encuesta.opciones_encuesta.map((opcion) => {
                    const votos = opcion.votos_encuesta.length
                    const porcentaje = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0
                    return (
                      <button
                        key={opcion.id}
                        className={`opcion-encuesta ${miVoto === opcion.id ? 'opcion-votada' : ''}`}
                        onClick={() => votar(encuesta.id, opcion.id)}
                      >
                        <div className="opcion-fondo" style={{ width: `${porcentaje}%` }} />
                        <span className="opcion-texto">{opcion.texto}</span>
                        <span className="opcion-porcentaje">
                          {porcentaje}% ({votos})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}
