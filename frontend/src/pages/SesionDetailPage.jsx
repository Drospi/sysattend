import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { asistenciaAPI, reportesAPI } from '../services/api'
import { StatusBadge, SectionHeader, Spinner, Alert } from '../components/ui'

export default function SesionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sesion, setSesion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    asistenciaAPI.obtenerSesion(id)
      .then(r => setSesion(r.data))
      .catch(() => toast.error('Error al cargar sesión'))
      .finally(() => setLoading(false))
  }, [id])

  const exportarPDF = async () => {
    try {
      const res = await reportesAPI.sesionPDF(id)
      const data = res.data
      const win = window.open('', '_blank')
      win.document.write(`
        <html><head><title>Asistencia - ${data.sesion.materia}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:30px;color:#111}
          h2{margin-bottom:4px}
          .info{margin-bottom:16px;font-size:14px}
          .info span{display:inline-block;margin-right:24px}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{background:#1e3a5f;color:white;padding:8px 10px;text-align:left}
          td{border:1px solid #ddd;padding:7px 10px}
          tr:nth-child(even){background:#f5f7fa}
          .presente{color:#16a34a;font-weight:bold}
          .ausente{color:#dc2626;font-weight:bold}
          .tardanza{color:#d97706;font-weight:bold}
          .justificado{color:#2563eb;font-weight:bold}
          .footer{margin-top:32px;font-size:12px;color:#888;text-align:center}
          @media print{.noprint{display:none}}
        </style></head>
        <body>
        <button class="noprint" onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir / Guardar PDF</button>
        <h2>Lista de Asistencia — ${data.sesion.materia}</h2>
        <div class="info">
          <span><b>Docente:</b> ${data.sesion.docente || '—'}</span>
          <span><b>Fecha:</b> ${data.sesion.fecha}</span>
          <span><b>Hora:</b> ${data.sesion.hora_inicio}</span>
          <span><b>Estado:</b> ${data.sesion.estado.toUpperCase()}</span>
        </div>
        <div class="info">
          <span><b>Presentes:</b> <span style="color:#16a34a">${data.resumen.presentes}</span></span>
          <span><b>Ausentes:</b> <span style="color:#dc2626">${data.resumen.total - data.resumen.presentes}</span></span>
          <span><b>Total:</b> ${data.resumen.total}</span>
          <span><b>Asistencia:</b> ${Math.round(data.resumen.presentes/data.resumen.total*100)||0}%</span>
        </div>
        <table>
          <tr><th>#</th><th>Apellidos y Nombres</th><th>C.I.</th><th>Cód. SAGA</th><th>Estado</th><th>Hora</th><th>Confianza IA</th><th>Método</th></tr>
          ${data.registros.map(r => `<tr>
            <td>${r.nro}</td><td>${r.nombre}</td><td>${r.ci}</td><td>${r.codigo_saga||'—'}</td>
            <td class="${r.estado}">${r.estado.toUpperCase()}</td>
            <td>${r.hora}</td><td>${r.confianza}</td><td>${r.metodo}</td>
          </tr>`).join('')}
        </table>
        <div class="footer">SysAttend AI v1.0 — Generado el ${new Date().toLocaleString()}</div>
        </body></html>
      `)
      win.document.close()
    } catch { toast.error('Error al generar PDF') }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!sesion) return <Alert type="danger">Sesión no encontrada</Alert>

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <SectionHeader
        title="Detalle de Sesión"
        subtitle={`${sesion.materia_nombre || ''} · ${sesion.fecha || ''}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/asistencia')} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={15} /> Volver
            </button>
            <button onClick={exportarPDF} className="btn-primary flex items-center gap-2">
              <Download size={15} /> Exportar / Imprimir
            </button>
          </div>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Total', v: sesion.total_registros, c: 'text-slate-200' },
          { l: 'Presentes', v: sesion.presentes, c: 'text-emerald-400' },
          { l: 'Tardanzas', v: sesion.tardanzas, c: 'text-amber-400' },
          { l: 'Ausentes', v: sesion.ausentes, c: 'text-red-400' },
        ].map(({ l, v, c }) => (
          <div key={l} className="card p-3 text-center">
            <div className={`text-2xl font-bold ${c}`}>{v || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Info docente / pin */}
      <div className="card p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-slate-500">Docente:</span> <span className="text-slate-200 font-medium">{sesion.docente_nombre || '—'}</span></div>
          <div><span className="text-slate-500">Hora inicio:</span> <span className="text-slate-200 font-mono">{sesion.hora_inicio?.slice(11,16) || '—'}</span></div>
          <div><span className="text-slate-500">PIN sesión:</span> <span className="text-blue-400 font-mono font-bold">{sesion.pin_sesion || '—'}</span></div>
        </div>
      </div>

      {sesion.tomada_por_encargado && !sesion.autorizada_por_docente && (
        <div className="mb-4"><Alert type="warning"><Lock size={14} className="inline mr-1" />Esta asistencia fue tomada por el encargado y <strong>requiere autorización del docente</strong> para ser oficial.</Alert></div>
      )}
      {sesion.autorizada_por_docente && (
        <div className="mb-4"><Alert type="success"><CheckCircle size={14} className="inline mr-1" />Sesión autorizada por el docente.</Alert></div>
      )}

      {/* Tabla de registros */}
      <div className="card overflow-hidden">
        <div className="p-3 border-b border-slate-700 text-sm font-semibold text-slate-200">
          Registros de asistencia ({sesion.total_registros || 0} estudiantes)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['#', 'Nombre', 'CI', 'Estado', 'Hora', 'Confianza IA', 'Método'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sesion.registros || []).map((r, i) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-all">
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-200 text-sm">{r.estudiante_nombre}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-400">{r.estudiante_ci}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.estado} /></td>
                  <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{r.hora_registro?.slice(11, 16) || '—'}</td>
                  <td className="py-2.5 px-3 text-xs text-blue-400">
                    {r.confianza_ia ? `${(r.confianza_ia * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500 capitalize">{r.metodo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
