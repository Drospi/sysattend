import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const res = await authAPI.login(username, password)
      const { access_token, rol, nombre, id } = res.data
      const user = { id, username, rol, nombre }
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      return { ok: true }
    } catch (err) {
      set({ loading: false })
      return { ok: false, error: err.response?.data?.detail || 'Error al iniciar sesión' }
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  isAdmin: () => ['admin', 'superadmin'].includes(get().user?.rol),
  isDocente: () => get().user?.rol === 'docente',
  isEncargado: () => get().user?.rol === 'encargado',
}))

export default useAuthStore
