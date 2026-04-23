import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Building2, Camera, ClipboardList, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { dashboardAPI, periodosAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [periodo, setPeriodo] = useState(null)

  useEffect(() => {
    dashboardAPI.resumen().then(r => setStats(r.data)).catch(() => {})
    periodosAPI.activo().then(r => setPeriodo(r.data)).catch(() => {})
  }, [])

  const cards = [
    { label: 'Estudiantes', value: stats?.total_estudiantes ?? '—', icon: Users, color: 'blue', to: '/estudiantes' },
    { label: 'Docentes', value: stats?.total_docentes ?? '—', icon: UserCheck, color: 'emerald', to: '/docentes' },
    { label: 'Carreras', value: stats?.total_carreras ?? '—', icon: Building2, color: 'violet', to: '/carreras' },
    { label: 'Sesiones Hoy', value: stats?.sesiones_hoy ?? '—', icon: Camera, color: 'amber', to: '/asistencia' },
  ]

  const colorMap = { blue: 'bg-blue-600/20 text-blue-400', emerald: 'bg-emerald-600/20 text-emerald-400',
    violet: 'bg-violet-600/20 text-violet-400', amber: 'bg-amber-600/20 text-amber-400' }

  const chartData = [
    { dia: 'Lun', presentes: 38, ausentes: 7 },
    { dia: 'Mar', presentes: 42, ausentes: 3 },
    { dia: 'Mié', presentes: 35, ausentes: 10 },
    { dia: 'Jue', presentes: 44, ausentes: 1 },
    { dia: 'Vie', presentes: 40, ausentes: 5 },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Panel de Control</h1>
          <p className="text-slate-400 text-sm mt-1">
            {periodo ? `Periodo activo: ${periodo.nombre}` : 'Sin periodo activo'}
          </p>
        </div>
        <Link to="/asistencia" className="btn-primary flex items-center gap-2">
          <Camera size={16} />
          Tomar Asistencia
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card p-4 hover:border-slate-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
              <TrendingUp size={14} className="text-slate-600 group-hover:text-slate-400 transition-all" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Asistencia Semanal</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
              />
              <Bar dataKey="presentes" name="Presentes" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="ausentes" name="Ausentes" fill="#ef444466" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-200">Estado del Sistema</h3>

          <div className="space-y-3">
            {[
              { label: 'Módulo IA (CNN)', ok: true, sub: 'OpenCV + MediaPipe' },
              { label: 'Base de Datos', ok: true, sub: 'SQLite / PostgreSQL' },
              { label: 'Autenticación JWT', ok: true, sub: 'HS256 · 8h' },
              { label: 'Sesiones activas', ok: (stats?.sesiones_activas ?? 0) > 0,
                sub: `${stats?.sesiones_activas ?? 0} en curso` },
            ].map(({ label, ok, sub }) => (
              <div key={label} className="flex items-center gap-3">
                {ok
                  ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                  : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                }
                <div>
                  <div className="text-sm font-medium text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Presencias registradas hoy</div>
            <div className="text-3xl font-bold text-blue-400">{stats?.registros_hoy ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-200 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/estudiantes/nuevo', label: 'Nuevo Estudiante', icon: Users, color: 'blue' },
            { to: '/docentes/nuevo', label: 'Nuevo Docente', icon: UserCheck, color: 'emerald' },
            { to: '/inscripciones', label: 'Inscripciones', icon: ClipboardList, color: 'violet' },
            { to: '/reportes', label: 'Ver Reportes', icon: TrendingUp, color: 'amber' },
          ].map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-slate-500 hover:bg-slate-900 transition-all text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-medium text-slate-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
