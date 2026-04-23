import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Camera, CheckCircle, X, Loader, User, Fingerprint, AlertTriangle, Lock, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { asistenciaAPI } from '../services/api'
import { StatusBadge, Alert } from '../components/ui'

export default function TomarAsistenciaPage() {
  const { asignacion_id } = useParams()
  const [searchParams] = useSearchParams()
  const sesionId = searchParams.get('sesion')
  const navigate = useNavigate()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [sesion, setSesion] = useState(null)
  const [registros, setRegistros] = useState([])
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [autoScan, setAutoScan] = useState(false)
  const [ultimo, setUltimo] = useState(null) // último reconocimiento
  const [tab, setTab] = useState('camara') // 'camara' | 'lista'
  const [loadingSesion, setLoadingSesion] = useState(true)
  const autoRef = useRef(null)

  const cargarSesion = useCallback(async () => {
    if (!sesionId) return
    try {
      const res = await asistenciaAPI.obtenerSesion(sesionId)
      setSesion(res.data)
      setRegistros(res.data.registros || [])
    } catch { toast.error('No se pudo cargar la sesión') }
    finally { setLoadingSesion(false) }
  }, [sesionId])

  useEffect(() => { cargarSesion() }, [cargarSesion])

  // Recargar lista cada 15 segundos
  useEffect(() => {
    const t = setInterval(cargarSesion, 15000)
    return () => clearInterval(t)
  }, [cargarSesion])

  useEffect(() => {
    return () => { detenerCamara(); detenerAutoScan() }
  }, [])

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // cámara trasera preferida en móvil
          width: { ideal: 1280 }, height: { ideal: 720 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamaraActiva(true)
    } catch {
      // Intentar cámara frontal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamaraActiva(true)
      } catch {
        toast.error('No se pudo acceder a la cámara. Verifique los permisos en su navegador.')
      }
    }
  }

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamaraActiva(false)
  }

  const capturarYReconocer = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || escaneando || !sesionId) return
    if (sesion?.estado !== 'activa') { toast.error('La sesión no está activa'); return }

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)

    return new Promise(resolve => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return }
        setEscaneando(true)
        try {
          const fd = new FormData()
          fd.append('imagen', blob, 'frame.jpg')
          const res = await asistenciaAPI.reconocerRostro(sesionId, fd)
          const data = res.data

          setUltimo(data)
          if (data.reconocido) {
            toast.success(`✓ ${data.nombre} — ${data.estado?.toUpperCase()}`, { duration: 3000 })
            // Actualizar registro en la lista
            setRegistros(prev => prev.map(r =>
              r.estudiante_id === data.estudiante_id
                ? { ...r, estado: data.estado, hora_registro: new Date().toISOString(), confianza_ia: data.confianza / 100 }
                : r
            ))
          } else {
            if (!autoScan) toast(data.mensaje || 'No reconocido', { icon: '⚠️' })
          }
        } catch {
          if (!autoScan) toast.error('Error en reconocimiento')
        }
        finally { setEscaneando(false); resolve() }
      }, 'image/jpeg', 0.85)
    })
  }, [sesionId, sesion, escaneando, autoScan])

  const iniciarAutoScan = () => {
    setAutoScan(true)
    autoRef.current = setInterval(capturarYReconocer, 2500)
  }

  const detenerAutoScan = () => {
    setAutoScan(false)
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
  }

  const registroManual = async (estudianteId, estado) => {
    try {
      await asistenciaAPI.registroManual(sesionId, { estudiante_id: estudianteId, estado })
      toast.success(`${estado.toUpperCase()} registrado`)
      setRegistros(prev => prev.map(r =>
        r.estudiante_id === estudianteId ? { ...r, estado } : r
      ))
    } catch { toast.error('Error al actualizar') }
  }

  const cerrarSesion = async () => {
    if (!confirm('¿Cerrar esta sesión de asistencia? No se podrán tomar más registros.')) return
    try {
      await asistenciaAPI.cerrarSesion(sesionId)
      toast.success('Sesión cerrada correctamente')
      detenerCamara(); detenerAutoScan()
      navigate('/asistencia')
    } catch { toast.error('Error al cerrar') }
  }

  const presentes = registros.filter(r => ['presente','tardanza'].includes(r.estado)).length
  const ausentes = registros.filter(r => r.estado === 'ausente').length

  if (loadingSesion) return <div className="flex justify-center py-20"><Loader size={28} className="animate-spin text-blue-400" /></div>
  if (!sesion) return <Alert type="danger">Sesión no encontrada</Alert>

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* Header de sesión */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-100">{sesion.materia_nombre}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sesion.docente_nombre} · {sesion.fecha} · <span className="font-mono text-blue-400">PIN: {sesion.pin_sesion}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{presentes}</div>
              <div className="text-xs text-slate-500">Presentes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{ausentes}</div>
              <div className="text-xs text-slate-500">Ausentes</div>
            </div>
            <StatusBadge status={sesion.estado} />
          </div>
        </div>
      </div>

      {sesion.estado !== 'activa' && (
        <Alert type="warning">Esta sesión está <strong>{sesion.estado}</strong>. Solo se puede visualizar.</Alert>
      )}
      {sesion.tomada_por_encargado && !sesion.autorizada_por_docente && (
        <Alert type="info"><Lock size={14} className="inline mr-1" />Esta asistencia fue tomada por el encargado y <strong>requiere autorización del docente</strong> para ser oficial.</Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-4 border border-slate-700">
        <button onClick={() => setTab('camara')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${tab==='camara' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Camera size={15} /> Cámara IA
        </button>
        <button onClick={() => setTab('lista')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${tab==='lista' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <ClipboardList size={15} /> Lista ({registros.length})
        </button>
      </div>

      {/* ── TAB CÁMARA ── */}
      {tab === 'camara' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {/* Viewport cámara */}
            <div className="relative bg-slate-950 aspect-[4/3]">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${camaraActiva ? '' : 'hidden'}`} />
              <canvas ref={canvasRef} className="hidden" />

              {!camaraActiva && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Camera size={44} className="text-slate-600" />
                  <p className="text-slate-400 text-sm">Presione "Activar Cámara" para comenzar</p>
                  <p className="text-xs text-slate-600">Compatible con cualquier celular · Chrome / Safari</p>
                </div>
              )}

              {/* Guía de encuadre */}
              {camaraActiva && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-64 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
                  </div>
                  {autoScan && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400/50 animate-scan" />}
                </div>
              )}

              {/* Overlay reconocimiento */}
              {ultimo && camaraActiva && (
                <div className={`absolute bottom-0 left-0 right-0 p-3 ${ultimo.reconocido ? 'bg-emerald-900/90' : 'bg-slate-900/80'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${ultimo.reconocido ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                      {ultimo.reconocido ? <CheckCircle size={20} className="text-white" /> : <User size={20} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-white">{ultimo.reconocido ? ultimo.nombre : 'No reconocido'}</div>
                      <div className="text-xs text-slate-300">
                        {ultimo.reconocido ? `Confianza: ${ultimo.confianza}% · ${ultimo.estado?.toUpperCase()}` : ultimo.mensaje}
                      </div>
                    </div>
                    {ultimo.reconocido && (
                      <div className="text-emerald-300 text-xl font-bold">✓</div>
                    )}
                  </div>
                </div>
              )}

              {/* Status scanning */}
              {escaneando && (
                <div className="absolute top-3 right-3 bg-black/70 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-white">
                  <Loader size={11} className="animate-spin" /> Analizando...
                </div>
              )}

              {autoScan && (
                <div className="absolute top-3 left-3 bg-blue-600/80 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Auto-scan activo
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="p-4 space-y-3">
              {!camaraActiva ? (
                <button onClick={iniciarCamara} disabled={sesion.estado !== 'activa'} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Camera size={16} /> Activar Cámara
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={capturarYReconocer}
                    disabled={escaneando || sesion.estado !== 'activa'}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    {escaneando ? <Loader size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                    Capturar
                  </button>
                  <button
                    onClick={autoScan ? detenerAutoScan : iniciarAutoScan}
                    disabled={sesion.estado !== 'activa'}
                    className={`flex items-center justify-center gap-2 rounded-lg font-semibold py-2 transition-all ${
                      autoScan ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {autoScan ? <><X size={16}/> Detener</> : <><Camera size={16}/> Auto-scan</>}
                  </button>
                  <button onClick={detenerCamara} className="btn-secondary col-span-2">
                    Apagar Cámara
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Acciones de sesión */}
          <div className="flex gap-3">
            <button onClick={() => setTab('lista')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ClipboardList size={15} /> Ver lista ({presentes}/{registros.length})
            </button>
            {sesion.estado === 'activa' && (
              <button onClick={cerrarSesion} className="btn-danger flex items-center gap-2 px-5">
                <Lock size={15} /> Cerrar sesión
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB LISTA ── */}
      {tab === 'lista' && (
        <div className="card overflow-hidden">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-200">Lista de Asistencia</div>
            <div className="text-xs text-slate-400">{presentes} presentes · {ausentes} ausentes</div>
          </div>
          <div className="divide-y divide-slate-700/50 max-h-[60vh] overflow-y-auto">
            {registros.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                  {r.estudiante_nombre?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-200 text-sm truncate">{r.estudiante_nombre}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    {r.hora_registro && <span>{r.hora_registro.slice(11,16)}</span>}
                    {r.confianza_ia && <span className="text-blue-400">{(r.confianza_ia*100).toFixed(0)}%</span>}
                    {r.metodo && <span className="capitalize">{r.metodo}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.estado} />
                  {sesion.estado === 'activa' && (
                    <select
                      value={r.estado}
                      onChange={e => registroManual(r.estudiante_id, e.target.value)}
                      className="text-xs bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-slate-300"
                    >
                      <option value="presente">Presente</option>
                      <option value="ausente">Ausente</option>
                      <option value="tardanza">Tardanza</option>
                      <option value="justificado">Justificado</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
