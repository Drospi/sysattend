import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Camera, Fingerprint, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { estudiantesAPI, carrerasAPI } from '../services/api'
import { SearchInput, Table, Pagination, StatusBadge, Avatar,
         EmptyState, ConfirmDialog, SectionHeader, Spinner } from '../components/ui'

export default function EstudiantesPage() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const [carreras, setCarreras] = useState([])
  const [deleteId, setDeleteId] = useState(null)
  const LIMIT = 20
  const navigate = useNavigate()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await estudiantesAPI.listar({
        q: q || undefined,
        carrera_id: carreraId || undefined,
        estado: estado || undefined,
        skip: (page - 1) * LIMIT,
        limit: LIMIT,
      })
      setData(res.data.data)
      setTotal(res.data.total)
    } catch { toast.error('Error al cargar estudiantes') }
    finally { setLoading(false) }
  }, [q, carreraId, estado, page])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    carrerasAPI.listar().then(r => setCarreras(r.data.data)).catch(() => {})
  }, [])

  const handleDelete = async (id) => {
    try {
      await estudiantesAPI.eliminar(id)
      toast.success('Estudiante desactivado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const exportCSV = () => {
    const headers = ['CI','Nombres','Apellido P.','Apellido M.','Carrera','Estado','Código SAGA','Celular','Email']
    const rows = data.map(e => [e.ci, e.nombres, e.apellido_paterno, e.apellido_materno||'',
      e.carrera_nombre||'', e.estado, e.codigo_saga||'', e.celular||'', e.email||''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'estudiantes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fadeIn">
      <SectionHeader
        title="Estudiantes"
        subtitle={`${total} estudiantes registrados`}
        actions={
          <>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Exportar
            </button>
            <Link to="/estudiantes/nuevo" className="btn-primary flex items-center gap-2">
              <Plus size={15} /> Nuevo Estudiante
            </Link>
          </>
        }
      />

      {/* Filtros */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={q}
          onChange={v => { setQ(v); setPage(1) }}
          placeholder="Buscar por nombre, CI, código SAGA..."
          className="flex-1 min-w-48"
        />
        <select
          value={carreraId}
          onChange={e => { setCarreraId(e.target.value); setPage(1) }}
          className="input-field w-auto min-w-40"
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select
          value={estado}
          onChange={e => { setEstado(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="regular">Regular</option>
          <option value="irregular">Irregular</option>
          <option value="congelado">Congelado</option>
          <option value="retirado">Retirado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <Table
          headers={['Estudiante', 'CI', 'Carrera', 'SAGA', 'Estado', 'Biometría', 'Acciones']}
          loading={loading}
        >
          {data.length === 0 && !loading ? (
            <tr><td colSpan={7}>
              <EmptyState
                icon={Plus}
                title="No hay estudiantes"
                description="Registra el primer estudiante haciendo clic en 'Nuevo Estudiante'"
                action={<Link to="/estudiantes/nuevo" className="btn-primary">Nuevo Estudiante</Link>}
              />
            </td></tr>
          ) : data.map(e => (
            <tr key={e.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-all">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Avatar nombre={`${e.nombres} ${e.apellido_paterno}`} foto={e.foto_url} />
                  <div>
                    <div className="font-medium text-slate-200 text-sm">
                      {e.grado && <span className="text-slate-500">{e.grado} </span>}
                      {e.nombres} {e.apellido_paterno} {e.apellido_materno || ''}
                    </div>
                    <div className="text-xs text-slate-500">{e.celular || 'Sin celular'}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-slate-300 font-mono text-xs">{e.ci}</td>
              <td className="py-3 px-4 text-slate-400 text-xs max-w-32 truncate">{e.carrera_nombre || '—'}</td>
              <td className="py-3 px-4 text-slate-400 font-mono text-xs">{e.codigo_saga || '—'}</td>
              <td className="py-3 px-4"><StatusBadge status={e.estado} /></td>
              <td className="py-3 px-4">
                {e.tiene_biometria
                  ? <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Fingerprint size={13} /> {e.muestras_capturadas} muestras
                    </span>
                  : <span className="text-xs text-slate-500">Sin biometría</span>
                }
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <Link
                    to={`/estudiantes/${e.id}/biometria`}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-all"
                    title="Capturar biometría"
                  >
                    <Camera size={14} />
                  </Link>
                  <Link
                    to={`/estudiantes/${e.id}/editar`}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Eliminar estudiante"
        message="¿Estás seguro de que deseas desactivar este estudiante? Su historial de asistencia se conservará."
      />
    </div>
  )
}
