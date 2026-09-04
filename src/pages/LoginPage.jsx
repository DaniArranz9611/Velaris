import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard'
      }
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <div className="login-page">
      <img src="/pwa-192x192.png" alt="" className="login-icon" />
      <h1>Velaris</h1>
      <p className="eslogan">A las estrellas que escuchan y los sueños que se hacen realidad</p>
      <p>Ingresá tu email y te mandamos un enlace mágico para entrar.</p>

      {status === 'sent' ? (
        <p>Listo, revisá tu correo y tocá el enlace para iniciar sesión.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Enviando...' : 'Enviar enlace mágico'}
          </button>
        </form>
      )}

      {status === 'error' && <p className="error">{errorMessage}</p>}
    </div>
  )
}
