import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import {
  LayoutDashboard, Users, UserCheck, BookOpen, GraduationCap,
  ClipboardList, BarChart3, Camera, Settings, LogOut,
  Menu, X, Building2, ChevronDown, Bell
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/estudiantes', icon: Users, label: 'Estudiantes' },
  { to: '/docentes', icon: UserCheck, label: 'Docentes' },
  { to: '/carreras', icon: Building2, label: 'Carreras y Materias' },
  { to: '/inscripciones', icon: BookOpen, label: 'Inscripciones' },
  { to: '/asistencia', icon: Camera, label: 'Asistencia' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Camera size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm leading-tight">SysAttend AI</div>
            <div className="text-xs text-slate-500 font-mono">v1.0 • Visión Artificial</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.nombre?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.nombre || 'Admin'}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.rol}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-all"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 bg-slate-800 border-r border-slate-700 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-800 border-r border-slate-700 flex flex-col z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <button className="relative text-slate-400 hover:text-white">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">3</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Sistema activo
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
