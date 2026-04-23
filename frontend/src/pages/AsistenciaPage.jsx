import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Camera, Eye, CheckCircle, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { asistenciaAPI, materiasAPI, periodosAPI } from '../services/api'
import { SectionHeader, StatusBadge, Modal, FormField, Spinner, EmptyState } from '../components/ui'
import useAuthStore from '../store/authStore'

export default function AsistenciaPage() {
  const [sesiones, setSesiones] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ asignacion_id: '', periodo_id: '' })
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const cargar = async () => {
    setLoading(true)
    try {
      const [sRes, mRes, pRes] = await Promise.all([
        asistenciaAPI.listarSesiones(),
        materiasAPI.asignaciones(),
        periodosAPI.listar(),
      ])
      setSesiones(sRes.data.data)
      setAsignaciones(mRes.data.data)
      setPeriodos(pRes.data.data)
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await asistenciaAPI.crearSesion({
        asignacion_id: +form.asignacion_id,
        periodo_id: +form.periodo_id,
      })
      toast.success(`Sesión creada · PIN: ${res.data.pin_sesion}`)
      setModal(false)
      navigate(`/asistencia/tomar/${res.data.asignacion_id}?sesion=${res.data.id}`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear sesión') }
    finally { setSaving(false) }
  }

  const handleAutorizar = async (id) => {
    try {
      await asistenciaAPI.autorizarSesion(id, {})
      toast.success('Sesión autorizada')
      cargar()
    } catch { toast.error('Error al autorizar') }
  }

  const estadoColor = { activa: 'text-emerald-400', cerrada: 'text-slate-400', pendiente: 'text-amber-400' }

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title="Control de Asistencia"
        subtitle="Sesiones de clase y registro facial"
        actions={
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Nueva Sesión
          </button>
        }
      />

      {/* Cards de resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total sesiones', val: sesiones.length, color: 'blue' },
          { label: 'Activas ahora', val: sesiones.filter(s => s.estado === 'activa').length, color: 'emerald' },
          { label: 'Pendientes de autorización', val: sesiones.filter(s => s.tomada_por_encargado && !s.autorizada_por_docente).length, color: 'amber' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-3xl font-bold text-${color}-400 mb-1`}>{val}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Lista de sesiones */}
      {loading
        ? <div className="flex justify-center py-16"><Spinner size={28} /></div>
        : sesiones.length === 0
          ? <EmptyState icon={Camera} title="No hay sesiones" description="Crea una nueva sesión para iniciar el control de asistencia"
              action={<button onClick={() => setModal(true)} className="btn-primary">Nueva Sesión</button>} />
          : <div className="space-y-3">
              {sesiones.map(s => (
                <div key={s.id} className="card p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Camera size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-200 text-sm">{s.materia_nombre || 'Materia'}</span>
                        <StatusBadge status={s.estado} />
                        {s.tomada_por_encargado && !s.autorizada_por_docente && (
                          <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full">⚠ Pendiente autorización</span>
                        )}
                        {s.autorizada_por_docente && (
                          <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10}/>Autorizada</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span><Clock size={11} className="inline mr-1" />{s.fecha} · {s.hora_inicio?.slice(11,16)}</span>
                        <span>{s.docente_nombre}</span>
                        {s.pin_sesion && <span className="font-mono text-blue-400">PIN: {s.pin_sesion}</span>}
                        <span className="text-emerald-400">{s.presentes} presentes</span>
                        <span className="text-red-400">{s.ausentes} ausentes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.tomada_por_encargado && !s.autorizada_por_docente && (user?.rol === 'docente' || user?.rol === 'admin' || user?.rol === 'superadmin') && (
                        <button onClick={() => handleAutorizar(s.id)} className="btn-success flex items-center gap-1 text-xs px-3 py-1.5">
                          <CheckCircle size={13} /> Autorizar
                        </button>
                      )}
                      {s.estado === 'activa' && (
                        <Link to={`/asistencia/tomar/${s.asignacion_id}?sesion=${s.id}`} className="btn-primary flex items-center gap-1 text-xs px-3 py-1.5">
                          <Camera size={13} /> Continuar
                        </Link>
                      )}
                      <Link to={`/asistencia/sesion/${s.id}`} className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5">
                        <Eye size={13} /> Ver
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* Modal nueva sesión */}
      <Modal open={modal} onClose={() => setModal(false)} title="Iniciar Nueva Sesión de Asistencia">
        <form onSubmit={handleCrear} className="space-y-4">
          <FormField label="Materia / Asignación" required>
            <select value={form.asignacion_id} onChange={e => setForm(p=>({...p,asignacion_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar materia --</option>
              {asignaciones.map(a => (
                <option key={a.id} value={a.id}>{a.materia_nombre} — {a.docente_nombre}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Periodo Académico" required>
            <select value={form.periodo_id} onChange={e => setForm(p=>({...p,periodo_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar periodo --</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size={15}/> : <Camera size={15}/>} Iniciar Sesión
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
