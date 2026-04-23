import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Upload, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { estudiantesAPI, carrerasAPI } from '../services/api'
import { FormField, SectionHeader, Alert, Spinner } from '../components/ui'

const GRADOS = ['', 'Bach.', 'Lic.', 'Ing.', 'Arq.', 'Dr.', 'MSc.']
const GRUPOS_SANG = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ESTADOS = ['regular', 'irregular', 'congelado', 'retirado', 'egresado']
const RELACIONES = ['', 'Padre', 'Madre', 'Hermano/a', 'Tío/a', 'Tutor legal', 'Otro']

const EMPTY = {
  grado: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  ci: '', fecha_nacimiento: '', lugar_nacimiento: '', genero: '',
  grupo_sanguineo: '', celular: '', email: '', direccion: '',
  codigo_saga: '', matricula: '', anio_ingreso: new Date().getFullYear(),
  estado: 'regular', carrera_id: '',
  tutor_nombre: '', tutor_relacion: '', tutor_ci: '', tutor_celular: '',
}

export default function EstudianteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(EMPTY)
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const fotoRef = useRef()

  useEffect(() => {
    carrerasAPI.listar().then(r => setCarreras(r.data.data)).catch(() => {})
    if (isEdit) {
      setLoading(true)
      estudiantesAPI.obtener(id).then(r => {
        const d = r.data
        setForm({ ...EMPTY, ...d, carrera_id: d.carrera_id || '', fecha_nacimiento: d.fecha_nacimiento || '' })
        if (d.foto_url) setFotoPreview(d.foto_url)
      }).catch(() => toast.error('Error al cargar estudiante'))
      .finally(() => setLoading(false))
    }
  }, [id])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.nombres.trim()) e.nombres = 'Requerido'
    if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Requerido'
    if (!form.ci.trim()) e.ci = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFoto = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('La foto no debe superar 5MB'); return }
    setFoto(f)
    setFotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form, carrera_id: form.carrera_id ? Number(form.carrera_id) : null,
        anio_ingreso: form.anio_ingreso ? Number(form.anio_ingreso) : null }
      // Limpiar vacíos
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

      let estudianteId = id
      if (isEdit) {
        await estudiantesAPI.actualizar(id, payload)
        toast.success('Estudiante actualizado')
      } else {
        const res = await estudiantesAPI.crear(payload)
        estudianteId = res.data.id
        toast.success('Estudiante registrado')
      }
      // Subir foto si hay
      if (foto && estudianteId) {
        const fd = new FormData(); fd.append('foto', foto)
        await estudiantesAPI.subirFoto(estudianteId, fd)
      }
      navigate('/estudiantes')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>

  const Input = ({ field, label, type = 'text', required, placeholder, options }) => (
    <FormField label={label} error={errors[field]} required={required}>
      {options
        ? <select value={form[field] || ''} onChange={e => set(field, e.target.value)} className="input-field">
            {options.map(o => typeof o === 'string'
              ? <option key={o} value={o}>{o || `-- ${label} --`}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>
        : <input type={type} value={form[field] || ''} onChange={e => set(field, e.target.value)}
            placeholder={placeholder} className={`input-field ${errors[field] ? 'border-red-500' : ''}`} />
      }
    </FormField>
  )

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <SectionHeader
        title={isEdit ? 'Editar Estudiante' : 'Nuevo Estudiante'}
        subtitle="Complete todos los datos del estudiante"
        actions={
          <button onClick={() => navigate('/estudiantes')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={15} /> Volver
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Foto */}
        <div className="card p-5 flex items-center gap-5">
          <div
            onClick={() => fotoRef.current.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500 flex items-center justify-center cursor-pointer overflow-hidden transition-all flex-shrink-0"
          >
            {fotoPreview
              ? <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
              : <User size={28} className="text-slate-500" />
            }
          </div>
          <div>
            <div className="font-medium text-slate-200 mb-1">Fotografía del estudiante</div>
            <div className="text-xs text-slate-500 mb-3">JPG, PNG o WebP · Máximo 5MB</div>
            <button type="button" onClick={() => fotoRef.current.click()} className="btn-secondary flex items-center gap-2 text-sm">
              <Upload size={14} /> Seleccionar foto
            </button>
            <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
          </div>
        </div>

        {/* Datos personales */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center text-xs text-blue-400 font-bold">1</div>
            Datos Personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input field="grado" label="Grado Académico" options={GRADOS} />
            <Input field="nombres" label="Nombres" required placeholder="Juan Carlos" />
            <Input field="apellido_paterno" label="Apellido Paterno" required placeholder="Mamani" />
            <Input field="apellido_materno" label="Apellido Materno" placeholder="Quispe" />
            <Input field="ci" label="Cédula de Identidad" required placeholder="1234567 LP" />
            <Input field="fecha_nacimiento" label="Fecha de Nacimiento" type="date" />
            <Input field="lugar_nacimiento" label="Lugar de Nacimiento" placeholder="La Paz" />
            <Input field="genero" label="Género" options={['', 'Masculino', 'Femenino', 'Otro']} />
            <Input field="grupo_sanguineo" label="Grupo Sanguíneo" options={GRUPOS_SANG} />
            <Input field="celular" label="Celular" placeholder="+591 71234567" />
            <Input field="email" label="Correo Electrónico" type="email" placeholder="juan@gmail.com" />
            <FormField label="Dirección">
              <textarea value={form.direccion || ''} onChange={e => set('direccion', e.target.value)}
                placeholder="Zona, calle, número..." rows={2}
                className="input-field resize-none" />
            </FormField>
          </div>
        </div>

        {/* Datos académicos */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600/20 flex items-center justify-center text-xs text-emerald-400 font-bold">2</div>
            Datos Académicos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input field="codigo_saga" label="Código SAGA" placeholder="SAGA-2025-001" />
            <Input field="matricula" label="N° de Matrícula" placeholder="MAT-2025-001" />
            <Input field="anio_ingreso" label="Año de Ingreso" type="number" placeholder="2025" />
            <FormField label="Carrera">
              <select value={form.carrera_id || ''} onChange={e => set('carrera_id', e.target.value)} className="input-field">
                <option value="">-- Seleccionar Carrera --</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FormField>
            <Input field="estado" label="Estado" options={ESTADOS} />
          </div>
        </div>

        {/* Datos del tutor */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-600/20 flex items-center justify-center text-xs text-amber-400 font-bold">3</div>
            Datos del Tutor / Apoderado
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input field="tutor_nombre" label="Nombre Completo del Tutor" placeholder="Juan Mamani Quispe" />
            <Input field="tutor_relacion" label="Relación con el Estudiante" options={RELACIONES} />
            <Input field="tutor_ci" label="CI del Tutor" placeholder="9876543 LP" />
            <Input field="tutor_celular" label="Celular del Tutor" placeholder="+591 71234567" />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end pb-4">
          <button type="button" onClick={() => navigate('/estudiantes')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6">
            {saving ? <Spinner size={16} /> : <Save size={16} />}
            {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar Estudiante')}
          </button>
        </div>
      </form>
    </div>
  )
}
