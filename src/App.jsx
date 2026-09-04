import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { PerfilProvider } from './lib/PerfilContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LibrosPage from './pages/LibrosPage'
import EventosPage from './pages/EventosPage'
import ContabilidadPage from './pages/ContabilidadPage'
import EncuestasPage from './pages/EncuestasPage'
import MiPerfilPage from './pages/MiPerfilPage'
import MiembrosPage from './pages/MiembrosPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/libros"
              element={
                <ProtectedRoute>
                  <LibrosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/eventos"
              element={
                <ProtectedRoute>
                  <EventosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contabilidad"
              element={
                <ProtectedRoute>
                  <ContabilidadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/encuestas"
              element={
                <ProtectedRoute>
                  <EncuestasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <MiPerfilPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/miembros"
              element={
                <ProtectedRoute>
                  <MiembrosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/miembros/:id"
              element={
                <ProtectedRoute>
                  <MiembrosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  )
}
