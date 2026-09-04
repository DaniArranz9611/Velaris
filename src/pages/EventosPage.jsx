import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, PlusCircle, Check, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

export default function EventosPage() {
  const { perfil, puede } = usePerfil()
  const [eventos, setEventos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [integrantes, setIntegrantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [misRespuestas, setMisRespuestas] = useState({})

  const puedeEditar = puede('eventos', 'editar')
  const puedeAdministrar = puede('eventos', 'administrar')

  async function cargarEventos() {
    setLoading(true)
    const [{ data, error }, { data: todasAsistencias }, { data: perfilesData }] = await Promise.all([
      supabase.from('eventos').select('*').order('fecha', { ascending: true }),
      supabase.from('evento_asistencia').select('evento_id, integrante_id, asistira, perfiles(nombre)'),
      supabase.from('perfiles').select('id, nombre')
    ])

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setEventos(data)
    setAsistencias(todasAsistencias ?? [])
    setIntegrantes(perfilesData ?? [])

    if (perfil?.id) {
      const mapa = {}
      for (const a of todasAsistencias ?? []) {
        if (a.integrante_id === perfil.id) mapa[a.evento_id] = a.asistira
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

    cargarEventos()
  }

  async function eliminarEvento(eventoId) {
    if (!confirm('¿Eliminar este evento y todas sus respuestas de asistencia?')) return
    await supabase.from('eventos').delete().eq('id', eventoId)
    cargarEventos()
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
          {eventos.map((evento) => {
            const respuestas = asistencias.filter((a) => a.evento_id === evento.id)
            const van = respuestas.filter((a) => a.asistira === true)
            const noVan = respuestas.filter((a) => a.asistira === false)
            const sinResponder = integrantes.filter(
              (i) => !respuestas.some((r) => r.integrante_id === i.id)
            )

            return (
              <li key={evento.id} className="card evento-card">
                <div className="evento-header">
                  <strong>{evento.titulo}</strong>
                  {(puedeAdministrar || evento.creado_por === perfil?.id) && (
                    <button className="btn-link rojo" onClick={() => eliminarEvento(evento.id)}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )}
                </div>
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
                <div className="resumen-asistencia">
                  <span className="resumen-asistencia-grupo verde">
                    Van ({van.length}): {van.map((a) => a.perfiles?.nombre).join(', ') || '—'}
                  </span>
                  <span className="resumen-asistencia-grupo rojo">
                    No van ({noVan.length}): {noVan.map((a) => a.perfiles?.nombre).join(', ') || '—'}
                  </span>
                  {sinResponder.length > 0 && (
                    <span className="resumen-asistencia-grupo">
                      Sin responder ({sinResponder.length}): {sinResponder.map((i) => i.nombre).join(', ')}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </Layout>
  )
}
