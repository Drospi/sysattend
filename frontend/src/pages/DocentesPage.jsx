// ── DocentesPage ─────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Save, ArrowLeft, Upload, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { docentesAPI } from '../services/api'
import { SearchInput, Table, Pagination, Avatar, EmptyState,
         ConfirmDialog, SectionHeader, FormField, Spinner } from '../components/ui'

// ── LISTA ─────────────────────────────────────────────────
export function DocentesPage() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)
  const LIMIT = 20

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await docentesAPI.listar({ q: q || undefined, skip: (page-1)*LIMIT, limit: LIMIT })
      setData(res.data.data); setTotal(res.data.total)
    } catch { toast.error('Error al cargar docentes') }
    finally { setLoading(false) }
  }, [q, page])

  useEffect(() => { cargar() }, [cargar])

  const handleDelete = async (id) => {
    try { await docentesAPI.eliminar(id); toast.success('Docente desactivado'); cargar() }
    catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title="Docentes"
        subtitle={`${total} docentes registrados`}
        actions={
          <Link to="/docentes/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Nuevo Docente
          </Link>
        }
      />
      <div className="card p-4 mb-4">
        <SearchInput value={q} onChange={v => { setQ(v); setPage(1) }} placeholder="Buscar por nombre o CI..." className="max-w-sm" />
      </div>
      <div className="card overflow-hidden">
        <Table headers={['Docente', 'CI', 'Especialidad', 'Contrato', 'Celular', 'Biometría', 'Acciones']} loading={loading}>
          {data.length === 0 && !loading
            ? <tr><td colSpan={7}><EmptyState icon={Plus} title="No hay docentes" action={<Link to="/docentes/nuevo" className="btn-primary">Nuevo Docente</Link>} /></td></tr>
            : data.map(d => (
              <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-all">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${d.nombres} ${d.apellido_paterno}`} foto={d.foto_url} />
                    <div>
                      <div className="font-medium text-slate-200 text-sm">
                        {d.grado && <span className="text-slate-500">{d.grado} </span>}
                        {d.nombres} {d.apellido_paterno} {d.apellido_materno || ''}
                      </div>
                      <div className="text-xs text-slate-500">{d.email || 'Sin email'}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-300">{d.ci}</td>
                <td className="py-3 px-4 text-slate-400 text-xs">{d.especialidad || '—'}</td>
                <td className="py-3 px-4 text-slate-400 text-xs capitalize">{d.tipo_contrato || '—'}</td>
                <td className="py-3 px-4 text-slate-400 text-xs">{d.celular || '—'}</td>
                <td className="py-3 px-4">
                  {d.tiene_biometria
                    ? <span className="text-xs text-emerald-400">✓ Registrada</span>
                    : <span className="text-xs text-slate-500">Sin biometría</span>}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link to={`/docentes/${d.id}/editar`} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all">
                      <Pencil size={14} />
                    </Link>
                    <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          }
        </Table>
        <div className="px-4 pb-4"><Pagination page={page} total={total} limit={LIMIT} onChange={setPage} /></div>
      </div>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)}
        title="Eliminar docente" message="¿Deseas desactivar este docente?" />
    </div>
  )
}

// ── FORMULARIO ────────────────────────────────────────────
const GRADOS_DOC = ['', 'Lic.', 'Ing.', 'Arq.', 'Dr.', 'MSc.', 'PhD.']
const CONTRATOS = ['', 'item', 'contrato', 'honorarios']
const EMPTY_DOC = { grado:'', nombres:'', apellido_paterno:'', apellido_materno:'',
  ci:'', celular:'', email:'', especialidad:'', tipo_contrato:'', codigo_docente:'' }

export function DocenteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(EMPTY_DOC)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const fotoRef = useRef ? { current: null } : null

  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      docentesAPI.obtener(id).then(r => {
        setForm({ ...EMPTY_DOC, ...r.data })
        if (r.data.foto_url) setFotoPreview(r.data.foto_url)
      }).catch(() => toast.error('Error al cargar')).finally(() => setLoading(false))
    }
  }, [id])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.nombres.trim()) e.nombres = 'Requerido'
    if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Requerido'
    if (!form.ci.trim()) e.ci = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form }
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
      let docenteId = id
      if (isEdit) {
        await docentesAPI.actualizar(id, payload); toast.success('Docente actualizado')
      } else {
        const res = await docentesAPI.crear(payload)
        docenteId = res.data.id; toast.success('Docente registrado')
      }
      navigate('/docentes')
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <SectionHeader
        title={isEdit ? 'Editar Docente' : 'Nuevo Docente'}
        actions={<button onClick={() => navigate('/docentes')} className="btn-secondary flex items-center gap-2"><ArrowLeft size={15} />Volver</button>}
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Datos del Docente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { k:'grado', l:'Grado', opts: GRADOS_DOC },
              { k:'nombres', l:'Nombres', req: true },
              { k:'apellido_paterno', l:'Apellido Paterno', req: true },
              { k:'apellido_materno', l:'Apellido Materno' },
              { k:'ci', l:'Cédula de Identidad', req: true },
              { k:'celular', l:'Celular' },
              { k:'email', l:'Email', type:'email' },
              { k:'especialidad', l:'Especialidad' },
              { k:'codigo_docente', l:'Código Docente' },
              { k:'tipo_contrato', l:'Tipo de Contrato', opts: CONTRATOS },
            ].map(({ k, l, req, type, opts }) => (
              <FormField key={k} label={l} error={errors[k]} required={req}>
                {opts
                  ? <select value={form[k]||''} onChange={e => set(k,e.target.value)} className="input-field">
                      {opts.map(o => <option key={o} value={o}>{o||`-- ${l} --`}</option>)}
                    </select>
                  : <input type={type||'text'} value={form[k]||''} onChange={e => set(k,e.target.value)}
                      className={`input-field ${errors[k]?'border-red-500':''}`} />
                }
              </FormField>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end pb-4">
          <button type="button" onClick={() => navigate('/docentes')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6">
            {saving ? <Spinner size={16} /> : <Save size={16} />}
            {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar Docente')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DocentesPage
