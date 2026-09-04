import { useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, Trash2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

const MODULOS = ['contabilidad', 'lecturas', 'eventos', 'notificaciones']
const NIVELES = ['ver', 'editar', 'administrar']

export default function AdminPage() {
  const { perfil } = usePerfil()
  const [integrantes, setIntegrantes] = useState([])
  const [permisos, setPermisos] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [emailInvitar, setEmailInvitar] = useState('')
  const [adminInvitar, setAdminInvitar] = useState(false)
  const [nivelesInvitar, setNivelesInvitar] = useState({
    contabilidad: 'ver',
    lecturas: 'ver',
    eventos: 'ver',
    notificaciones: 'ver'
  })

  async function cargar() {
    setLoading(true)
    const [
      { data: perfilesData, error: e1 },
      { data: permisosData, error: e2 },
      { data: invitacionesData, error: e3 }
    ] = await Promise.all([
      supabase.from('perfiles').select('*').order('nombre'),
      supabase.from('permisos_modulo').select('*'),
      supabase.from('invitaciones').select('*').order('created_at', { ascending: false })
    ])

    if (e1 || e2 || e3) {
      setError((e1 || e2 || e3).message)
    } else {
      setIntegrantes(perfilesData)
      setPermisos(permisosData)
      setInvitaciones(invitacionesData ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()

    const canal = supabase
      .channel('admin-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'permisos_modulo' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitaciones' }, () => cargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function nivelDe(integranteId, modulo) {
    return permisos.find((p) => p.integrante_id === integranteId && p.modulo === modulo)?.nivel ?? 'ver'
  }

  async function cambiarNivel(integranteId, modulo, nivel) {
    setError('')
    const { error } = await supabase
      .from('permisos_modulo')
      .upsert({ integrante_id: integranteId, modulo, nivel }, { onConflict: 'integrante_id,modulo' })

    if (error) {
      setError(error.message)
      return
    }

    cargar()
  }

  async function cambiarAdminGlobal(integranteId, esAdmin) {
    setError('')
    const { error } = await supabase
      .from('perfiles')
      .update({ es_admin_global: esAdmin })
      .eq('id', integranteId)

    if (error) {
      setError(error.message)
      return
    }

    cargar()
  }

  async function invitar(event) {
    event.preventDefault()
    setError('')

    const { data, error } = await supabase
      .from('invitaciones')
      .upsert(
        {
          email: emailInvitar.trim().toLowerCase(),
          es_admin_global: adminInvitar,
          nivel_contabilidad: nivelesInvitar.contabilidad,
          nivel_lecturas: nivelesInvitar.lecturas,
          nivel_eventos: nivelesInvitar.eventos,
          nivel_notificaciones: nivelesInvitar.notificaciones,
          invitado_por: perfil.id
        },
        { onConflict: 'email' }
      )
      .select()

    if (error) {
      setError(error.message)
      return
    }

    if (!data || data.length === 0) {
      setError(
        'No se pudo guardar la invitación (permiso denegado). Ejecutá de nuevo sql/02_reparacion_y_avance.sql en Supabase.'
      )
      return
    }

    setEmailInvitar('')
    setAdminInvitar(false)
    setNivelesInvitar({ contabilidad: 'ver', lecturas: 'ver', eventos: 'ver', notificaciones: 'ver' })
    cargar()
  }

  async function cancelarInvitacion(email) {
    await supabase.from('invitaciones').delete().eq('email', email)
    cargar()
  }

  async function eliminarIntegrante(integranteId, nombre) {
    if (integranteId === perfil.id) {
      setError('No podés eliminarte a vos misma.')
      return
    }
    if (!confirm(`¿Quitar a ${nombre} del club? Va a perder el acceso a la app.`)) return

    setError('')
    const { data, error } = await supabase
      .from('perfiles')
      .delete()
      .eq('id', integranteId)
      .select()

    if (error) {
      setError(error.message)
      return
    }

    if (!data || data.length === 0) {
      setError(
        'No se pudo eliminar (falta permiso en la base de datos). Ejecutá de nuevo sql/02_reparacion_y_avance.sql en Supabase.'
      )
      return
    }

    cargar()
  }

  if (!perfil?.es_admin_global) {
    return (
      <Layout>
        <p>No tenés acceso a esta sección.</p>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <p>Cargando...</p>
      </Layout>
    )
  }

  return (
    <Layout>
    <div className="page">
      <h1><ShieldCheck size={22} /> Administración de permisos</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2 className="mes-titulo"><UserPlus size={16} /> Invitar nueva integrante</h2>
        <p className="vacio">
          Ingresá su email y el rol que va a tener. Cuando esa persona entre por primera vez con el
          enlace mágico, se le va a asignar automáticamente.
        </p>
        <form onSubmit={invitar} className="form-inline">
          <input
            type="email"
            placeholder="email@ejemplo.com"
            value={emailInvitar}
            onChange={(e) => setEmailInvitar(e.target.value)}
            required
          />
          <label className="resena-form label">
            <input
              type="checkbox"
              checked={adminInvitar}
              onChange={(e) => setAdminInvitar(e.target.checked)}
            />
            {' '}Admin global (control total)
          </label>
          {!adminInvitar &&
            MODULOS.map((modulo) => (
              <label key={modulo} className="invitar-modulo">
                {modulo}:{' '}
                <select
                  value={nivelesInvitar[modulo]}
                  onChange={(e) =>
                    setNivelesInvitar((prev) => ({ ...prev, [modulo]: e.target.value }))
                  }
                >
                  {NIVELES.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <button type="submit"><UserPlus size={16} /> Invitar</button>
        </form>

        {invitaciones.length > 0 && (
          <div className="invitaciones-pendientes">
            <h3 className="mes-titulo">Invitaciones pendientes</h3>
            <ul className="lista">
              {invitaciones.map((inv) => (
                <li key={inv.email} className="resena-item">
                  <strong>{inv.email}</strong>
                  <span> — {inv.es_admin_global ? 'Admin global' : 'rol asignado'}</span>
                  <button className="btn-link" onClick={() => cancelarInvitacion(inv.email)}>
                    <XCircle size={14} /> Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="tabla-scroll">
        <table className="tabla-permisos">
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Admin global</th>
              {MODULOS.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {integrantes.map((integrante) => (
              <tr key={integrante.id}>
                <td>{integrante.nombre}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={integrante.es_admin_global}
                    onChange={(e) => cambiarAdminGlobal(integrante.id, e.target.checked)}
                  />
                </td>
                {MODULOS.map((modulo) => (
                  <td key={modulo}>
                    <select
                      value={nivelDe(integrante.id, modulo)}
                      onChange={(e) => cambiarNivel(integrante.id, modulo, e.target.value)}
                      disabled={integrante.es_admin_global}
                    >
                      {NIVELES.map((nivel) => (
                        <option key={nivel} value={nivel}>
                          {nivel}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                <td>
                  <button
                    className="btn-link rojo"
                    onClick={() => eliminarIntegrante(integrante.id, integrante.nombre)}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  )
}
