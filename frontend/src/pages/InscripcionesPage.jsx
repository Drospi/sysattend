import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { inscripcionesAPI, estudiantesAPI, materiasAPI, periodosAPI, carrerasAPI } from '../services/api'
import { Modal, SectionHeader, FormField, Spinner, EmptyState, ConfirmDialog, StatusBadge } from '../components/ui'

export default function InscripcionesPage() {
  const [inscripciones, setInscripciones] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [materias, setMaterias] = useState([])
  const [carreras, setCarreras] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalMasivo, setModalMasivo] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filtros, setFiltros] = useState({ materia_id: '', periodo_id: '' })
  const [form, setForm] = useState({ estudiante_id: '', materia_id: '', periodo_id: '', grupo: 'A' })
  const [formMasivo, setFormMasivo] = useState({ materia_id: '', periodo_id: '', grupo: 'A', carrera_id: '' })
  const [saving, setSaving] = useState(false)

const cargar = async () => {
    setLoading(true)
    try {
      // 1. Limpiamos los filtros para no enviar textos vacíos a FastAPI
      const filtrosLimpios = {}
      if (filtros.materia_id) filtrosLimpios.materia_id = filtros.materia_id
      if (filtros.periodo_id) filtrosLimpios.periodo_id = filtros.periodo_id

      const [iRes, eRes, mRes, pRes, cRes] = await Promise.all([
        inscripcionesAPI.listar(filtrosLimpios), // <-- Enviamos el objeto limpio
        estudiantesAPI.listar({ limit: 200 }),
        materiasAPI.listar(),
        periodosAPI.listar(),
        carrerasAPI.listar(),
      ])
      
      setInscripciones(iRes.data.data)
      setEstudiantes(eRes.data.data)
      setMaterias(mRes.data.data)
      setPeriodos(pRes.data.data)
      setCarreras(cRes.data.data)
    } catch { 
      toast.error('Error al cargar datos') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { cargar() }, [filtros.materia_id, filtros.periodo_id])

  const handleInscribir = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await inscripcionesAPI.inscribir({
        estudiante_id: +form.estudiante_id,
        materia_id: +form.materia_id,
        periodo_id: +form.periodo_id,
        grupo: form.grupo,
      })
      toast.success('Estudiante inscrito correctamente')
      setModal(false); cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const handleMasivo = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      // Inscribir todos los estudiantes de la carrera seleccionada
      const estudiantesCarrera = estudiantes.filter(
        est => !formMasivo.carrera_id || est.carrera_id == formMasivo.carrera_id
      )
      const ids = estudiantesCarrera.map(e => e.id)
      if (ids.length === 0) { toast.error('No hay estudiantes en esa carrera'); return }
      await inscripcionesAPI.masiva({
        estudiante_ids: ids,
        materia_id: +formMasivo.materia_id,
        periodo_id: +formMasivo.periodo_id,
        grupo: formMasivo.grupo,
      })
      toast.success(`${ids.length} estudiantes inscritos`)
      setModalMasivo(false); cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await inscripcionesAPI.eliminar(id); toast.success('Inscripción eliminada'); cargar() }
    catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title="Inscripciones"
        subtitle="Asignación de estudiantes a materias por periodo"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setModalMasivo(true)} className="btn-secondary flex items-center gap-2">
              <Users size={15} /> Inscripción Masiva
            </button>
            <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={15} /> Inscribir Estudiante
            </button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <select value={filtros.materia_id} onChange={e => setFiltros(p => ({...p, materia_id: e.target.value}))} className="input-field w-auto min-w-44">
          <option value="">Todas las materias</option>
          {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select value={filtros.periodo_id} onChange={e => setFiltros(p => ({...p, periodo_id: e.target.value}))} className="input-field w-auto min-w-44">
          <option value="">Todos los periodos</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {loading
          ? <div className="flex justify-center py-16"><Spinner size={28} /></div>
          : inscripciones.length === 0
            ? <EmptyState icon={BookOpen} title="No hay inscripciones" description="Inscribe estudiantes a materias del periodo activo" />
            : <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700">
                  {['Estudiante', 'Materia', 'Periodo', 'Grupo', 'Encargado', 'Acciones'].map(h =>
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {inscripciones.map(i => (
                    <tr key={i.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-all">
                      <td className="py-3 px-4 text-slate-200 font-medium text-sm">{i.estudiante_nombre}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{i.materia_nombre}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono">Periodo {i.periodo_id}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{i.grupo}</td>
                      <td className="py-3 px-4">
                        {i.es_encargado
                          ? <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full font-semibold">Encargado</span>
                          : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => setDeleteId(i.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>

      {/* Modal inscripción individual */}
      <Modal open={modal} onClose={() => setModal(false)} title="Inscribir Estudiante" size="md">
        <form onSubmit={handleInscribir} className="space-y-4">
          <FormField label="Estudiante" required>
            <select value={form.estudiante_id} onChange={e => setForm(p=>({...p,estudiante_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar --</option>
              {estudiantes.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno} · {e.ci}</option>)}
            </select>
          </FormField>
          <FormField label="Materia" required>
            <select value={form.materia_id} onChange={e => setForm(p=>({...p,materia_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar --</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} (Sem. {m.semestre_num})</option>)}
            </select>
          </FormField>
          <FormField label="Periodo" required>
            <select value={form.periodo_id} onChange={e => setForm(p=>({...p,periodo_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar --</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Grupo">
            <input className="input-field" value={form.grupo} onChange={e => setForm(p=>({...p,grupo:e.target.value}))} />
          </FormField>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size={15}/> : <Plus size={15}/>} Inscribir
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal masivo */}
      <Modal open={modalMasivo} onClose={() => setModalMasivo(false)} title="Inscripción Masiva por Carrera" size="md">
        <form onSubmit={handleMasivo} className="space-y-4">
          <p className="text-sm text-slate-400">Inscribe a todos los estudiantes de una carrera en una materia.</p>
          <FormField label="Carrera">
            <select value={formMasivo.carrera_id} onChange={e => setFormMasivo(p=>({...p,carrera_id:e.target.value}))} className="input-field">
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Materia" required>
            <select value={formMasivo.materia_id} onChange={e => setFormMasivo(p=>({...p,materia_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar --</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} (Sem. {m.semestre_num})</option>)}
            </select>
          </FormField>
          <FormField label="Periodo" required>
            <select value={formMasivo.periodo_id} onChange={e => setFormMasivo(p=>({...p,periodo_id:e.target.value}))} className="input-field" required>
              <option value="">-- Seleccionar --</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </FormField>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalMasivo(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size={15}/> : <Users size={15}/>} Inscribir todos
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Eliminar inscripción" message="¿Eliminar esta inscripción del estudiante?" />
    </div>
  )
}
