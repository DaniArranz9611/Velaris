import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, PlusCircle, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

export default function EventosPage() {
  const { perfil, puede } = usePerfil()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [misRespuestas, setMisRespuestas] = useState({})

  const puedeEditar = puede('eventos', 'editar')

  async function cargarEventos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setEventos(data)

    if (perfil?.id && data.length > 0) {
      const { data: asistencias } = await supabase
        .from('evento_asistencia')
        .select('evento_id, asistira')
        .eq('integrante_id', perfil.id)

      const mapa = {}
      for (const a of asistencias ?? []) {
        mapa[a.evento_id] = a.asistira
      }
      setMisRespuestas(mapa)
    }

    setLoading(false)
  }

  useEffect(() => {
    cargarEventos()
  }, [perfil])

  async function agregarEvento(event) {
    event.preventDefault()
    setError('')

    const { error } = await supabase.from('eventos').insert({
      titulo,
      fecha,
      lugar,
      descripcion,
      creado_por: perfil?.id
    })

    if (error) {
      setError(error.message)
      return
    }

    setTitulo('')
    setFecha('')
    setLugar('')
    setDescripcion('')
    cargarEventos()
  }

  async function responderAsistencia(eventoId, asistira) {
    await supabase
      .from('evento_asistencia')
      .upsert({ evento_id: eventoId, integrante_id: perfil.id, asistira }, { onConflict: 'evento_id,integrante_id' })

    setMisRespuestas((prev) => ({ ...prev, [eventoId]: asistira }))
  }

  return (
    <Layout>
    <div className="page">
      <h1><CalendarDays size={22} /> Eventos</h1>

      {puedeEditar && (
        <form onSubmit={agregarEvento} className="card form-inline">
          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Lugar (dirección o nombre del lugar)"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
          />
          <textarea
            placeholder="¿Qué se va a hacer y cómo? (agenda, qué llevar, etc.)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
          <button type="submit"><PlusCircle size={16} /> Agregar evento</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : eventos.length === 0 ? (
        <p className="vacio">Todavía no hay eventos cargados.</p>
      ) : (
        <ul className="lista">
          {eventos.map((evento) => (
            <li key={evento.id} className="card evento-card">
              <strong>{evento.titulo}</strong>
              <div className="evento-fecha">
                <CalendarDays size={15} />
                {new Date(evento.fecha).toLocaleString('es-AR', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </div>
              {evento.lugar && (
                <a
                  className="evento-lugar"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.lugar)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={15} /> {evento.lugar}
                </a>
              )}
              {evento.descripcion && <p className="evento-descripcion">{evento.descripcion}</p>}
              <div className="rsvp">
                <button
                  className={misRespuestas[evento.id] === true ? 'activo' : ''}
                  onClick={() => responderAsistencia(evento.id, true)}
                >
                  <Check size={15} /> Voy
                </button>
                <button
                  className={misRespuestas[evento.id] === false ? 'activo' : ''}
                  onClick={() => responderAsistencia(evento.id, false)}
                >
                  <X size={15} /> No voy
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    </Layout>
  )
}
