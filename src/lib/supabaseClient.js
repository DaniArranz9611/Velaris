import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisá tu archivo .env'
  )
}

// Algunas versiones de iOS borran el localStorage de las apps instaladas ("Agregar a
// inicio") aunque Apple diga que no debería pasar. Este storage guarda la sesión en
// localStorage (rápido) y además en una cookie de un año (respaldo), y si localStorage
// aparece vacío, la recupera automáticamente desde la cookie.
function leerCookie(nombre) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function escribirCookie(nombre, valor) {
  const unAnio = 60 * 60 * 24 * 365
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; max-age=${unAnio}; path=/; SameSite=Lax`
}

function borrarCookie(nombre) {
  document.cookie = `${nombre}=; max-age=0; path=/`
}

const storageConRespaldoEnCookie = {
  getItem(clave) {
    return window.localStorage.getItem(clave) ?? leerCookie(clave)
  },
  setItem(clave, valor) {
    window.localStorage.setItem(clave, valor)
    escribirCookie(clave, valor)
  },
  removeItem(clave) {
    window.localStorage.removeItem(clave)
    borrarCookie(clave)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: storageConRespaldoEnCookie,
    // PKCE es más confiable que el flujo por defecto en Safari/iPhone,
    // sobre todo cuando el enlace mágico se abre en un contexto distinto (Mail -> Safari -> app instalada).
    flowType: 'pkce'
  }
})
