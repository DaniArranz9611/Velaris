import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const PerfilContext = createContext(undefined)
const MODULOS = ['contabilidad', 'lecturas', 'eventos', 'notificaciones', 'encuestas']

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

    let { data: perfilData } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    // Auto-reparación: si el usuario ya inició sesión pero no tiene perfil
    // (por ejemplo, porque fue eliminado y volvió a entrar), se lo creamos acá mismo.
    if (!perfilData) {
      const nombreSugerido = session.user.email?.split('@')[0] ?? 'Sin nombre'
      const { data: creado } = await supabase
        .from('perfiles')
        .upsert({ id: session.user.id, nombre: nombreSugerido, es_admin_global: false }, { onConflict: 'id' })
        .select()
        .maybeSingle()
      perfilData = creado

      await supabase
        .from('permisos_modulo')
        .upsert(
          MODULOS.map((modulo) => ({ integrante_id: session.user.id, modulo, nivel: 'ver' })),
          { onConflict: 'integrante_id,modulo', ignoreDuplicates: true }
        )
    }

    const { data: permisosData } = await supabase
      .from('permisos_modulo')
      .select('modulo, nivel')
      .eq('integrante_id', session.user.id)

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

  // Tiempo real: si un admin cambia mis permisos o mi nombre desde otro dispositivo,
  // esta pestaña se entera al instante sin necesidad de recargar.
  useEffect(() => {
    if (!session?.user) return

    const canal = supabase
      .channel(`mi-perfil-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'perfiles', filter: `id=eq.${session.user.id}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permisos_modulo', filter: `integrante_id=eq.${session.user.id}` },
        () => cargar()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [session, cargar])

  function puede(modulo, nivelMinimo) {
    if (perfil?.es_admin_global) return true
    const orden = { ninguno: 0, ver: 1, editar: 2, administrar: 3 }
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

