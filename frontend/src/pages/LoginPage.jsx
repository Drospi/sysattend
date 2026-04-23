import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Eye, EyeOff, Loader } from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await login(form.username, form.password)
    if (res.ok) {
      toast.success('Bienvenido al sistema')
      navigate('/')
    } else {
      toast.error(res.error)
    }
  }

  const handleSeed = async () => {
    try {
      await authAPI.seed()
      toast.success('Datos iniciales creados. Usuario: admin / Contraseña: admin123')
    } catch {
      toast.error('Error al crear datos iniciales')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Camera size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SysAttend AI</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestión de Asistencia</p>
          <p className="text-slate-500 text-xs mt-1 font-mono">Visión Artificial · Redes Neuronales</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <input
                type="text"
                className="input-field"
                placeholder="admin"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  onClick={() => setShowPass(p => !p)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center mb-2">¿Primera vez?</p>
            <button
              onClick={handleSeed}
              className="w-full text-xs text-blue-400 hover:text-blue-300 py-2 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-all"
            >
              Inicializar datos del sistema
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          SysAttend AI v1.0 · EMI Bolivia 2025
        </p>
      </div>
    </div>
  )
}
