import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
})

// Interceptor: añadir token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: manejar 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (username, password) => api.post('/auth/login', new URLSearchParams({ username, password })),
  me: () => api.get('/auth/me'),
  cambiarPassword: (data) => api.post('/auth/cambiar-password', data),
  seed: () => api.post('/admin/seed'),
}

// ── Dashboard ─────────────────────────────────────────
export const dashboardAPI = {
  resumen: () => api.get('/asistencia/dashboard/resumen'),
}

// ── Estudiantes ───────────────────────────────────────
export const estudiantesAPI = {
  listar: (params) => api.get('/estudiantes/', { params }),
  obtener: (id) => api.get(`/estudiantes/${id}`),
  crear: (data) => api.post('/estudiantes/', data),
  actualizar: (id, data) => api.put(`/estudiantes/${id}`, data),
  eliminar: (id) => api.delete(`/estudiantes/${id}`),
  subirFoto: (id, formData) => api.post(`/estudiantes/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  marcarEncargado: (id, materia_id, periodo_id) =>
    api.put(`/estudiantes/${id}/encargado`, null, { params: { materia_id, periodo_id } }),
  capturarBiometria: (id, formData) => api.post(`/biometria/estudiante/${id}/capturar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  estadoBiometria: (id) => api.get(`/biometria/estudiante/${id}/estado`),
  eliminarBiometria: (id) => api.delete(`/biometria/estudiante/${id}/biometria`),
}

// ── Docentes ──────────────────────────────────────────
export const docentesAPI = {
  listar: (params) => api.get('/docentes/', { params }),
  obtener: (id) => api.get(`/docentes/${id}`),
  crear: (data) => api.post('/docentes/', data),
  actualizar: (id, data) => api.put(`/docentes/${id}`, data),
  eliminar: (id) => api.delete(`/docentes/${id}`),
  subirFoto: (id, formData) => api.post(`/docentes/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

// ── Carreras ──────────────────────────────────────────
export const carrerasAPI = {
  listar: () => api.get('/carreras/'),
  obtener: (id) => api.get(`/carreras/${id}`),
  crear: (data) => api.post('/carreras/', data),
  actualizar: (id, data) => api.put(`/carreras/${id}`, data),
  eliminar: (id) => api.delete(`/carreras/${id}`),
  materias: (id, params) => api.get(`/carreras/${id}/materias`, { params }),
  crearMateria: (carrera_id, data) => api.post(`/carreras/${carrera_id}/materias`, data),
  actualizarMateria: (id, data) => api.put(`/carreras/materias/${id}`, data),
  eliminarMateria: (id) => api.delete(`/carreras/materias/${id}`),
}

// ── Materias ──────────────────────────────────────────
export const materiasAPI = {
  listar: (params) => api.get('/materias/', { params }),
  asignaciones: (params) => api.get('/materias/asignaciones', { params }),
  asignarDocente: (data) => api.post('/materias/asignaciones', data),
}

// ── Semestres / Periodos ──────────────────────────────
export const periodosAPI = {
  listar: () => api.get('/semestres/'),
  activo: () => api.get('/semestres/activo'),
  crear: (data) => api.post('/semestres/', data),
  activar: (id) => api.put(`/semestres/${id}/activar`),
}

// ── Inscripciones ─────────────────────────────────────
export const inscripcionesAPI = {
  listar: (params) => api.get('/inscripciones/', { params }),
  inscribir: (data) => api.post('/inscripciones/', data),
  masiva: (data) => api.post('/inscripciones/masiva', data),
  eliminar: (id) => api.delete(`/inscripciones/${id}`),
}

// ── Asistencia ────────────────────────────────────────
export const asistenciaAPI = {
  crearSesion: (data) => api.post('/asistencia/sesiones', data),
  listarSesiones: (params) => api.get('/asistencia/sesiones', { params }),
  obtenerSesion: (id) => api.get(`/asistencia/sesiones/${id}`),
  cerrarSesion: (id) => api.post(`/asistencia/sesiones/${id}/cerrar`),
  autorizarSesion: (id, data) => api.post(`/asistencia/sesiones/${id}/autorizar`, data),
  reconocerRostro: (sesion_id, formData) =>
    api.post(`/asistencia/sesiones/${sesion_id}/reconocer`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  registroManual: (sesion_id, data) =>
    api.put(`/asistencia/sesiones/${sesion_id}/registro-manual`, data),
  estadisticasEstudiante: (id, params) =>
    api.get(`/asistencia/estadisticas/estudiante/${id}`, { params }),
}

// ── Reportes ──────────────────────────────────────────
export const reportesAPI = {
  materia: (id, params) => api.get(`/reportes/asistencia/materia/${id}`, { params }),
  estudiante: (id, params) => api.get(`/reportes/asistencia/estudiante/${id}`, { params }),
  sesionPDF: (id) => api.get(`/reportes/asistencia/sesion/${id}/pdf`),
}

export default api
