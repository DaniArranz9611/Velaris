import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const PerfilContext = createContext(undefined)

export function PerfilProvider({ children }) {
  const { session } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [permisos, setPermisos] = useState({})
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!session?.user) {
      setPerfil(null)
      setPermisos({})
      setLoading(false)
      return
    }

    setLoading(true)

    const [{ data: perfilData }, { data: permisosData }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', session.user.id).single(),
      supabase.from('permisos_modulo').select('modulo, nivel').eq('integrante_id', session.user.id)
    ])

    setPerfil(perfilData ?? null)

    const mapa = {}
    for (const p of permisosData ?? []) {
      mapa[p.modulo] = p.nivel
    }
    setPermisos(mapa)
    setLoading(false)
  }, [session])

  useEffect(() => {
    cargar()
  }, [cargar])

  function puede(modulo, nivelMinimo) {
    if (perfil?.es_admin_global) return true
    const orden = { ver: 1, editar: 2, administrar: 3 }
    const nivelActual = permisos[modulo]
    if (!nivelActual) return false
    return orden[nivelActual] >= orden[nivelMinimo]
  }

  return (
    <PerfilContext.Provider value={{ perfil, permisos, loading, puede, recargar: cargar }}>
      {children}
    </PerfilContext.Provider>
  )
}

export function usePerfil() {
  const context = useContext(PerfilContext)
  if (context === undefined) {
    throw new Error('usePerfil debe usarse dentro de un PerfilProvider')
  }
  return context
}
