import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { cargarTemaGuardado } from './components/SelectorTema.jsx'
import './index.css'

cargarTemaGuardado()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
