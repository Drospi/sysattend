import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EstudiantesPage from './pages/EstudiantesPage'
import EstudianteFormPage from './pages/EstudianteFormPage'
import DocentesPage from './pages/DocentesPage'
import DocenteFormPage from './pages/DocenteFormPage'
import CarrerasPage from './pages/CarrerasPage'
import CarreraDetailPage from './pages/CarreraDetailPage'
import InscripcionesPage from './pages/InscripcionesPage'
import AsistenciaPage from './pages/AsistenciaPage'
import TomarAsistenciaPage from './pages/TomarAsistenciaPage'
import SesionDetailPage from './pages/SesionDetailPage'
import ReportesPage from './pages/ReportesPage'
import BiometriaPage from './pages/BiometriaPage'
import ConfigPage from './pages/ConfigPage'

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="estudiantes" element={<EstudiantesPage />} />
        <Route path="estudiantes/nuevo" element={<EstudianteFormPage />} />
        <Route path="estudiantes/:id/editar" element={<EstudianteFormPage />} />
        <Route path="estudiantes/:id/biometria" element={<BiometriaPage />} />
        <Route path="docentes" element={<DocentesPage />} />
        <Route path="docentes/nuevo" element={<DocenteFormPage />} />
        <Route path="docentes/:id/editar" element={<DocenteFormPage />} />
        <Route path="carreras" element={<CarrerasPage />} />
        <Route path="carreras/:id" element={<CarreraDetailPage />} />
        <Route path="inscripciones" element={<InscripcionesPage />} />
        <Route path="asistencia" element={<AsistenciaPage />} />
        <Route path="asistencia/tomar/:asignacion_id" element={<TomarAsistenciaPage />} />
        <Route path="asistencia/sesion/:id" element={<SesionDetailPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="configuracion" element={<ConfigPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
