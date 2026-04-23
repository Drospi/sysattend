import { useState, useEffect } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { periodosAPI } from '../services/api'
import { SectionHeader, Spinner } from '../components/ui'

export default function ConfigPage() {
  const [periodos, setPeriodos] = useState([])
  const [form, setForm] = useState({ nombre:'', anio: new Date().getFullYear(), numero:1, fecha_inicio:'', fecha_fin:'' })
  const [saving, setSaving] = useState(false)

  const cargar = () => periodosAPI.listar().then(r=>setPeriodos(r.data.data)).catch(()=>{})
  useEffect(()=>{ cargar() },[])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await periodosAPI.crear({...form, anio:+form.anio, numero:+form.numero})
      toast.success('Periodo creado')
      setForm({ nombre:'', anio: new Date().getFullYear(), numero:1, fecha_inicio:'', fecha_fin:'' })
      cargar()
    } catch(err){ toast.error(err.response?.data?.detail||'Error') }
    finally { setSaving(false) }
  }

  const activar = async (id) => {
    try { await periodosAPI.activar(id); toast.success('Periodo activado'); cargar() }
    catch { toast.error('Error') }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <SectionHeader title="Configuración del Sistema" subtitle="Periodos académicos y parámetros generales" />

      {/* Periodos */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-slate-200 mb-4">Periodos Académicos</h3>
        <div className="space-y-2 mb-6">
          {periodos.length === 0
            ? <p className="text-sm text-slate-500">No hay periodos registrados.</p>
            : periodos.map(p=>(
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${p.activo?'border-emerald-600/40 bg-emerald-900/10':'border-slate-700 hover:border-slate-600'}`}>
                <div className="flex-1">
                  <div className="font-medium text-slate-200 text-sm">{p.nombre}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.fecha_inicio} → {p.fecha_fin}</div>
                </div>
                {p.activo
                  ? <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle size={12}/>Activo</span>
                  : <button onClick={()=>activar(p.id)} className="btn-secondary text-xs px-3 py-1.5">Activar</button>}
              </div>
            ))
          }
        </div>

        <h4 className="font-semibold text-slate-300 text-sm mb-3">Crear nuevo periodo</h4>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre del periodo *</label>
            <input className="input-field" value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="1er Semestre 2025" required/>
          </div>
          <div>
            <label className="label">Año *</label>
            <input type="number" className="input-field" value={form.anio} onChange={e=>setForm(p=>({...p,anio:e.target.value}))} required/>
          </div>
          <div>
            <label className="label">Número (1 o 2) *</label>
            <select className="input-field" value={form.numero} onChange={e=>setForm(p=>({...p,numero:e.target.value}))}>
              <option value={1}>1° Semestre</option>
              <option value={2}>2° Semestre</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha de inicio *</label>
            <input type="date" className="input-field" value={form.fecha_inicio} onChange={e=>setForm(p=>({...p,fecha_inicio:e.target.value}))} required/>
          </div>
          <div>
            <label className="label">Fecha de fin *</label>
            <input type="date" className="input-field" value={form.fecha_fin} onChange={e=>setForm(p=>({...p,fecha_fin:e.target.value}))} required/>
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving?<Spinner size={15}/>:<Plus size={15}/>} Crear Periodo
            </button>
          </div>
        </form>
      </div>

      {/* Info del sistema */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-200 mb-4">Información del Sistema</h3>
        <div className="space-y-0">
          {[
            ['Nombre','SysAttend AI'],
            ['Versión','1.0.0 — EMI Bolivia 2025'],
            ['Backend','Python 3.11 + FastAPI'],
            ['Base de datos','SQLite (dev) / PostgreSQL (prod)'],
            ['Visión Artificial','OpenCV + MediaPipe + TensorFlow/Keras'],
            ['Embeddings','CNN 128-dimensiones (L2-normalizado)'],
            ['Frontend','React 18 + Vite + TailwindCSS'],
            ['PWA','Vite Plugin PWA — instalable en celulares'],
            ['Autenticación','JWT HS256 · 8 horas'],
            ['Documentación API','http://localhost:8000/api/docs'],
          ].map(([k,v])=>(
            <div key={k} className="flex justify-between py-2.5 border-b border-slate-700/60">
              <span className="text-slate-400 text-sm">{k}</span>
              <span className="text-slate-300 font-mono text-xs text-right max-w-48">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
