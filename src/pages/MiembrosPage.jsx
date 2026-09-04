import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, BookMarked, Star, Lock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePerfil } from '../lib/PerfilContext'
import Layout from '../components/Layout'

export default function MiembrosPage() {
  const { id } = useParams()
  return id ? <PerfilDeMiembro id={id} /> : <ListaMiembros />
}

function ListaMiembros() {
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('perfiles')
      .select('id, nombre, es_admin_global')
      .order('nombre')
      .then(({ data }) => {
        setMiembros(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <Layout>
      <div className="page">
        <h1>
          <Users size={22} /> Miembros del club
        </h1>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <ul className="lista">
            {miembros.map((m) => (
              <li key={m.id} className="card">
                <Link to={`/miembros/${m.id}`} className="teoria-dashboard-link">
                  <strong>{m.nombre}</strong>
                  {m.es_admin_global && <span className="badge">Admin</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}

function PerfilDeMiembro({ id }) {
  const { perfil } = usePerfil()
  const [miembro, setMiembro] = useState(null)
  const [resenas, setResenas] = useState([])
  const [avancesPublicos, setAvancesPublicos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const [{ data: perfilData }, { data: resenasData }, { data: avancesData }] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('resenas')
          .select('*, libros(id, titulo, autor)')
          .eq('integrante_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('avance_lectura')
          .select('*, libros(id, titulo)')
          .eq('integrante_id', id)
      ])

      setMiembro(perfilData)
      setResenas(resenasData ?? [])
      // La base de datos ya filtra lo privado de otras personas; esto es solo para
      // distinguir visualmente si sos vos misma viendo tu propio perfil.
      setAvancesPublicos(avancesData ?? [])
      setLoading(false)
    }

    cargar()
  }, [id])

  const esUnoMismo = perfil?.id === id

  if (loading) {
    return (
      <Layout>
        <p>Cargando...</p>
      </Layout>
    )
  }

  if (!miembro) {
    return (
      <Layout>
        <p className="vacio">Esta persona ya no forma parte del club.</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page">
        <div className="bienvenida-card">
          <h1>
            <BookMarked size={20} /> {miembro.nombre}
          </h1>
          {miembro.es_admin_global && <span className="badge">Admin</span>}
        </div>

        <div className="card">
          <h2 className="mes-titulo">
            <BookMarked size={16} /> Lecturas {esUnoMismo ? '' : 'públicas'}
          </h2>
          {avancesPublicos.length === 0 ? (
            <p className="vacio">
              {esUnoMismo
                ? 'No tenés lecturas activas.'
                : 'No comparte su lectura actual, o no tiene ninguna en curso.'}
            </p>
          ) : (
            <div className="mini-avances">
              {avancesPublicos.map((a) => (
                <Link key={a.id} to={`/libros?abrir=${a.libros?.id}`} className="mini-avance-chip">
                  {!a.es_publico && <Lock size={11} />} {a.libros?.titulo}: {a.porcentaje}%
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mes-titulo">
            <Star size={16} /> Reseñas
          </h2>
          {resenas.length === 0 ? (
            <p className="vacio">Todavía no escribió reseñas.</p>
          ) : (
            <ul className="lista">
              {resenas.map((r) => (
                <li key={r.id} className="card">
                  <Link to={`/libros?abrir=${r.libros?.id}`} className="teoria-dashboard-link">
                    <strong>{r.libros?.titulo}</strong>
                  </Link>
                  <div className="estrellas">
                    {'★'.repeat(r.calificacion)}
                    {'☆'.repeat(5 - r.calificacion)}
                  </div>
                  {r.comentario && <p>{r.comentario}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}
