import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronRight, BookOpen, Save, X, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { carrerasAPI, materiasAPI } from '../services/api'
import { Modal, ConfirmDialog, SectionHeader, FormField, EmptyState, Spinner, Alert } from '../components/ui'

// ── FORM CARRERA ──────────────────────────────────────────
function CarreraForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { nombre:'', codigo:'', descripcion:'', duracion_semestres:10 })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await onSave(form); onClose() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" required><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} required /></FormField>
        <FormField label="Código" required><input className="input-field" value={form.codigo} onChange={e=>set('codigo',e.target.value)} required /></FormField>
      </div>
      <FormField label="Descripción"><textarea className="input-field resize-none" rows={2} value={form.descripcion||''} onChange={e=>set('descripcion',e.target.value)} /></FormField>
      <FormField label="Duración (semestres)"><input type="number" className="input-field" value={form.duracion_semestres} onChange={e=>set('duracion_semestres',+e.target.value)} /></FormField>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Spinner size={15}/> : <Save size={15}/>} Guardar
        </button>
      </div>
    </form>
  )
}

// ── FORM MATERIA ──────────────────────────────────────────
function MateriaForm({ carreraId, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { nombre:'', codigo:'', semestre_num:1, creditos:3, horas_semana:4, descripcion:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await onSave({...form, carrera_id: carreraId}); onClose() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" required><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} required /></FormField>
        <FormField label="Código" required><input className="input-field" value={form.codigo} onChange={e=>set('codigo',e.target.value)} required /></FormField>
        <FormField label="Semestre"><input type="number" min={1} max={12} className="input-field" value={form.semestre_num} onChange={e=>set('semestre_num',+e.target.value)} /></FormField>
        <FormField label="Créditos"><input type="number" className="input-field" value={form.creditos} onChange={e=>set('creditos',+e.target.value)} /></FormField>
        <FormField label="Horas/semana"><input type="number" className="input-field" value={form.horas_semana} onChange={e=>set('horas_semana',+e.target.value)} /></FormField>
      </div>
      <FormField label="Descripción"><textarea className="input-field resize-none" rows={2} value={form.descripcion||''} onChange={e=>set('descripcion',e.target.value)} /></FormField>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Spinner size={15}/> : <Save size={15}/>} Guardar
        </button>
      </div>
    </form>
  )
}

// ── CARRERAS LIST ─────────────────────────────────────────
export default function CarrerasPage() {
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | carrera
  const [deleteId, setDeleteId] = useState(null)

  const cargar = () => {
    setLoading(true)
    carrerasAPI.listar().then(r => setCarreras(r.data.data)).catch(() => toast.error('Error'))
    .finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  const handleSaveCarrera = async (data) => {
    if (modal?.id) { await carrerasAPI.actualizar(modal.id, data); toast.success('Carrera actualizada') }
    else { await carrerasAPI.crear(data); toast.success('Carrera creada') }
    cargar()
  }

  const handleSeed = async () => {
    try {
      await materiasAPI.seed({ force: true })
      toast.success('Datos iniciales creados. Materias de ejemplo añadidas')
      cargar()
    } catch (error) {
    console.error('Error en seed:', error)
    toast.error('Error al crear datos iniciales')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title="Carreras y Materias"
        subtitle={`${carreras.length} carreras registradas`}
        actions={
          <>
            <button onClick={handleSeed} className="btn-secondary flex items-center gap-2">
              <Plus size={15} /> Sembrar Datos
            </button>
            <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2"><Plus size={15}/> Nueva Carrera</button>
          </>
        }
      />

      {carreras.length === 0
        ? <EmptyState icon={Building2} title="No hay carreras" description="Registra la primera carrera de la universidad"
            action={<button onClick={() => setModal('new')} className="btn-primary">Nueva Carrera</button>} />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {carreras.map(c => (
              <div key={c.id} className="card p-5 hover:border-slate-600 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
                    <Building2 size={18} className="text-violet-400" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"><Pencil size={13}/></button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={13}/></button>
                  </div>
                </div>
                <div className="font-semibold text-slate-100 mb-1">{c.nombre}</div>
                <div className="text-xs text-slate-500 font-mono mb-3">{c.codigo} · {c.duracion_semestres} semestres</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{c.total_materias} materias</span>
                  <Link to={`/carreras/${c.id}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    Ver materias <ChevronRight size={13}/>
                  </Link>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Editar Carrera' : 'Nueva Carrera'}>
        <CarreraForm initial={modal?.id ? modal : null} onSave={handleSaveCarrera} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await carrerasAPI.eliminar(deleteId); toast.success('Carrera eliminada'); cargar() }}
        title="Eliminar carrera" message="¿Eliminar esta carrera y todas sus materias?" />
    </div>
  )
}

// ── CARRERA DETAIL (materias) ─────────────────────────────
export function CarreraDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [carrera, setCarrera] = useState(null)
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [semFiltro, setSemFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  const cargar = () => {
    setLoading(true)
    carrerasAPI.obtener(id).then(r => setCarrera(r.data)).catch(() => toast.error('Error'))
    .finally(() => setLoading(false))
  }
  useEffect(cargar, [id])

  const handleSaveMateria = async (data) => {
    if (modal?.materia?.id) { await carrerasAPI.actualizarMateria(modal.materia.id, data); toast.success('Materia actualizada') }
    else { await carrerasAPI.crearMateria(id, data); toast.success('Materia creada') }
    cargar()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!carrera) return null

  const materias = (carrera.materias || []).filter(m => semFiltro ? m.semestre_num == semFiltro : true)
  const semestres = [...new Set((carrera.materias || []).map(m => m.semestre_num))].sort((a,b) => a-b)

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title={carrera.nombre}
        subtitle={`${carrera.codigo} · ${carrera.duracion_semestres} semestres · ${carrera.total_materias} materias`}
        actions={
          <>
            <button onClick={() => navigate('/carreras')} className="btn-secondary flex items-center gap-2"><ChevronRight size={15} className="rotate-180"/>Volver</button>
            <button onClick={() => setModal({ type:'new' })} className="btn-primary flex items-center gap-2"><Plus size={15}/>Nueva Materia</button>
          </>
        }
      />

      {/* Filtro semestre */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setSemFiltro('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!semFiltro ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Todos</button>
        {semestres.map(s => (
          <button key={s} onClick={() => setSemFiltro(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${semFiltro==s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
            Sem. {s}
          </button>
        ))}
      </div>

      {materias.length === 0
        ? <EmptyState icon={BookOpen} title="No hay materias" description="Agrega la primera materia a esta carrera"
            action={<button onClick={() => setModal({type:'new'})} className="btn-primary">Nueva Materia</button>} />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {materias.map(m => (
              <div key={m.id} className="card p-4 hover:border-slate-600 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-blue-400 mb-1">{m.codigo}</div>
                    <div className="font-semibold text-slate-200 text-sm mb-2 leading-tight">{m.nombre}</div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span>Sem. {m.semestre_num}</span>
                      <span>{m.creditos} créditos</span>
                      <span>{m.horas_semana}h/sem</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => setModal({type:'edit', materia:m})} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"><Pencil size={13}/></button>
                    <button onClick={() => setDeleteId(m.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Editar Materia' : 'Nueva Materia'}>
        <MateriaForm carreraId={id} initial={modal?.materia} onSave={handleSaveMateria} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await carrerasAPI.eliminarMateria(deleteId); toast.success('Materia eliminada'); cargar() }}
        title="Eliminar materia" message="¿Eliminar esta materia? Se perderán los horarios y asignaciones asociados." />
    </div>
  )
}
