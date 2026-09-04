import { Star } from 'lucide-react'

// Muestra 5 estrellas con relleno parcial (soporta decimales tipo 4.1, 4.5, etc).
export function StarRatingDisplay({ valor, size = 16 }) {
  return (
    <span className="star-rating-display" style={{ fontSize: 0 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const porcentaje = Math.max(0, Math.min(100, (valor - i) * 100))
        return (
          <span key={i} className="star-slot" style={{ width: size, height: size }}>
            <Star size={size} className="star-base" />
            <span className="star-fill" style={{ width: `${porcentaje}%` }}>
              <Star size={size} fill="currentColor" />
            </span>
          </span>
        )
      })}
      <span className="star-numero">{valor.toFixed(1)}</span>
    </span>
  )
}

// Input para elegir una calificación con un decimal (0.5 en 0.5, de 0.5 a 5).
export function StarRatingInput({ valor, onChange }) {
  return (
    <div className="star-rating-input">
      <input
        type="range"
        min={0.5}
        max={5}
        step={0.1}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <StarRatingDisplay valor={valor} size={20} />
    </div>
  )
}
