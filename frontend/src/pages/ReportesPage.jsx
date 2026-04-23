import { useState, useEffect } from 'react'
import { Download, TrendingUp, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportesAPI, materiasAPI } from '../services/api'
import { SectionHeader, Spinner, Alert } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function ReportesPage() {
  const [materias, setMaterias] = useState([])
  const [materiaId, setMateriaId] = useState('')
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    materiasAPI.listar().then(r => setMaterias(r.data.data)).catch(() => {})
  }, [])

  const cargarReporte = async () => {
    if (!materiaId) { toast.error('Selecciona una materia'); return }
    setLoading(true)
    try {
      const res = await reportesAPI.materia(materiaId)
      setReporte(res.data)
    } catch { toast.error('Error al generar reporte') }
    finally { setLoading(false) }
  }

  const exportCSV = () => {
    if (!reporte) return
    const headers = ['Nombre','CI','SAGA','Total Clases','Presentes','Ausentes','Tardanzas','Porcentaje','En Riesgo']
    const rows = reporte.data.map(r => [
      `"${r.nombre}"`, r.ci, r.codigo_saga||'', r.total_clases,
      r.presentes, r.ausentes, r.tardanzas, `${r.porcentaje}%`, r.en_riesgo ? 'SI':'NO'
    ])
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`reporte_${materiaId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const promedio = reporte?.data.length ? Math.round(reporte.data.reduce((a,b)=>a+b.porcentaje,0)/reporte.data.length) : 0
  const enRiesgo = reporte?.data.filter(r=>r.en_riesgo).length||0

  return (
    <div className="animate-fadeIn">
      <SectionHeader title="Reportes de Asistencia" subtitle="Análisis estadístico por materia con exportación PDF y CSV" />

      <div className="card p-5 mb-5">
        <div className="flex gap-3 flex-wrap">
          <select value={materiaId} onChange={e=>{setMateriaId(e.target.value);setReporte(null)}} className="input-field flex-1 min-w-52">
            <option value="">— Seleccionar materia —</option>
            {materias.map(m=><option key={m.id} value={m.id}>{m.nombre} — Sem. {m.semestre_num}</option>)}
          </select>
          <button onClick={cargarReporte} disabled={!materiaId||loading} className="btn-primary flex items-center gap-2 px-6">
            {loading?<Spinner size={15}/>:<TrendingUp size={15}/>} {loading?'Generando...':'Generar Reporte'}
          </button>
          {reporte && <button onClick={exportCSV} className="btn-secondary flex items-center gap-2"><Download size={15}/>Exportar CSV</button>}
        </div>
      </div>

      {reporte && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              {l:'Estudiantes',v:reporte.total_estudiantes,c:'text-blue-400'},
              {l:'Promedio asistencia',v:`${promedio}%`,c:promedio>=75?'text-emerald-400':'text-red-400'},
              {l:'En riesgo (<75%)',v:enRiesgo,c:'text-red-400'},
              {l:'Sin riesgo',v:reporte.total_estudiantes-enRiesgo,c:'text-emerald-400'},
            ].map(({l,v,c})=>(
              <div key={l} className="card p-4 text-center">
                <div className={`text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {enRiesgo>0 && <div className="mb-4"><Alert type="warning"><AlertTriangle size={14} className="inline mr-1"/><strong>{enRiesgo} estudiante{enRiesgo>1?'s':''}</strong> con menos del 75% de asistencia están en riesgo de reprobar.</Alert></div>}

          {reporte.data.length>0 && (
            <div className="card p-5 mb-5">
              <div className="font-semibold text-slate-200 mb-4 text-sm">Asistencia por estudiante</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reporte.data.slice(0,15)}>
                  <XAxis dataKey="nombre" tick={{fill:'#94a3b8',fontSize:9}} tickFormatter={n=>n.split(' ').slice(-1)[0]} angle={-30} textAnchor="end" interval={0} height={50}/>
                  <YAxis tick={{fill:'#64748b',fontSize:10}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',color:'#f1f5f9'}} formatter={v=>[`${v}%`,'Asistencia']}/>
                  <Bar dataKey="porcentaje" radius={[4,4,0,0]} fill="#2563eb"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-700 font-semibold text-slate-200 text-sm">{reporte.total_estudiantes} estudiantes</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700">
                  {['Nombre','CI','SAGA','Clases','Presentes','Tardanzas','Ausentes','%','Estado'].map(h=>(
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {reporte.data.map((r,i)=>(
                    <tr key={i} className={`border-b border-slate-700/50 hover:bg-slate-800/50 ${r.en_riesgo?'bg-red-950/10':''}`}>
                      <td className="py-2.5 px-3 text-slate-200 font-medium text-sm">{r.nombre}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-400">{r.ci}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{r.codigo_saga||'—'}</td>
                      <td className="py-2.5 px-3 text-slate-300 text-center">{r.total_clases}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold text-center">{r.presentes}</td>
                      <td className="py-2.5 px-3 text-amber-400 text-center">{r.tardanzas}</td>
                      <td className="py-2.5 px-3 text-red-400 text-center">{r.ausentes}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.porcentaje>=75?'bg-emerald-500':'bg-red-500'}`} style={{width:`${r.porcentaje}%`}}/>
                          </div>
                          <span className={`text-xs font-bold ${r.porcentaje>=75?'text-emerald-400':'text-red-400'}`}>{r.porcentaje}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.en_riesgo
                          ? <span className="text-xs text-red-400 font-semibold">⚠ Riesgo</span>
                          : <span className="text-xs text-emerald-400">✓ Regular</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
