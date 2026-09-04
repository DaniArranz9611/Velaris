import { useEffect, useState } from 'react'

const TEMAS = [
  { nombre: 'Dorado', noche: '#0d1b3e', acento: '#d4af6a' },
  { nombre: 'Rosa nocturno', noche: '#3b1730', acento: '#e08fb0' },
  { nombre: 'Esmeralda', noche: '#0f2f24', acento: '#4fbf8b' },
  { nombre: 'Violeta', noche: '#251a3d', acento: '#b083e0' },
  { nombre: 'Océano', noche: '#0b2942', acento: '#5eb8d9' }
]

export function aplicarTema(tema) {
  const raiz = document.documentElement
  raiz.style.setProperty('--noche', tema.noche)
  raiz.style.setProperty('--dorado', tema.acento)
  raiz.style.setProperty('--dorado-claro', tema.acento + 'cc')
  raiz.style.setProperty('--noche-claro', tema.noche + 'dd')
}

export function cargarTemaGuardado() {
  const guardado = localStorage.getItem('velaris-tema')
  const tema = TEMAS.find((t) => t.nombre === guardado)
  if (tema) aplicarTema(tema)
}

export default function SelectorTema() {
  const [temaActivo, setTemaActivo] = useState(TEMAS[0].nombre)

  useEffect(() => {
    const guardado = localStorage.getItem('velaris-tema')
    if (guardado) {
      const tema = TEMAS.find((t) => t.nombre === guardado)
      if (tema) {
        aplicarTema(tema)
        setTemaActivo(tema.nombre)
      }
    }
  }, [])

  function elegir(tema) {
    aplicarTema(tema)
    localStorage.setItem('velaris-tema', tema.nombre)
    setTemaActivo(tema.nombre)
  }

  return (
    <div className="selector-tema">
      {TEMAS.map((tema) => (
        <button
          key={tema.nombre}
          type="button"
          className={`tema-chip ${temaActivo === tema.nombre ? 'tema-activo' : ''}`}
          style={{ background: `linear-gradient(135deg, ${tema.noche}, ${tema.acento})` }}
          onClick={() => elegir(tema)}
          title={tema.nombre}
        />
      ))}
    </div>
  )
}
