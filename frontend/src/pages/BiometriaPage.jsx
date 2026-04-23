import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle, Trash2, Loader, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { estudiantesAPI } from '../services/api'
import { Alert, SectionHeader } from '../components/ui'

const MIN_MUESTRAS = 15
const MAX_MUESTRAS = 30

export default function BiometriaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [estudiante, setEstudiante] = useState(null)
  const [estado, setEstado] = useState(null) // { tiene_biometria, muestras_capturadas }
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [autoCaptura, setAutoCaptura] = useState(false)
  const [muestrasHoy, setMuestrasHoy] = useState(0)
  const [loading, setLoading] = useState(true)
  const autoRef = useRef(null)

  useEffect(() => {
    Promise.all([
      estudiantesAPI.obtener(id),
      estudiantesAPI.estadoBiometria(id),
    ]).then(([r1, r2]) => {
      setEstudiante(r1.data)
      setEstado(r2.data)
    }).catch(() => toast.error('Error al cargar datos'))
    .finally(() => setLoading(false))
    return () => detenerCamara()
  }, [id])

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamaraActiva(true)
    } catch (err) {
      toast.error('No se pudo acceder a la cámara. Verifique los permisos.')
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCamaraActiva(false)
    detenerAutoCaptura()
  }

  const capturarMuestra = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || capturando) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)

    return new Promise(resolve => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return }
        setCapturando(true)
        try {
          const fd = new FormData()
          fd.append('foto', blob, 'captura.jpg')
          const res = await estudiantesAPI.capturarBiometria(id, fd)
          if (res.data.exito) {
            setMuestrasHoy(p => p + 1)
            setEstado(prev => ({ ...prev, muestras_capturadas: res.data.muestras_capturadas, listo_para_reconocimiento: res.data.muestras_capturadas >= 5 }))
          }
          resolve(true)
        } catch { resolve(false) }
        finally { setCapturando(false) }
      }, 'image/jpeg', 0.9)
    })
  }, [id, capturando])

  const iniciarAutoCaptura = () => {
    setAutoCaptura(true)
    autoRef.current = setInterval(async () => {
      if (muestrasHoy >= MAX_MUESTRAS) { detenerAutoCaptura(); return }
      await capturarMuestra()
    }, 1200)
  }

  const detenerAutoCaptura = () => {
    setAutoCaptura(false)
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
  }

  const eliminarBiometria = async () => {
    if (!confirm('¿Eliminar todos los datos biométricos del estudiante?')) return
    try {
      await estudiantesAPI.eliminarBiometria(id)
      setEstado({ tiene_biometria: false, muestras_capturadas: 0, listo_para_reconocimiento: false })
      setMuestrasHoy(0)
      toast.success('Biometría eliminada')
    } catch { toast.error('Error al eliminar biometría') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader size={28} className="animate-spin text-blue-400" /></div>

  const totalMuestras = (estado?.muestras_capturadas || 0)
  const progreso = Math.min((muestrasHoy / MIN_MUESTRAS) * 100, 100)
  const listo = totalMuestras >= 5

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <SectionHeader
        title="Registro Biométrico Facial"
        subtitle={estudiante ? `${estudiante.nombres} ${estudiante.apellido_paterno} · CI: ${estudiante.ci}` : ''}
        actions={
          <button onClick={() => navigate('/estudiantes')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={15} /> Volver
          </button>
        }
      />

      {/* Estado actual */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${listo ? 'bg-emerald-600/20' : 'bg-amber-600/20'}`}>
          {listo
            ? <CheckCircle size={22} className="text-emerald-400" />
            : <AlertTriangle size={22} className="text-amber-400" />
          }
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-200">
            {listo ? 'Biometría registrada — listo para reconocimiento' : 'Biometría insuficiente — necesita más muestras'}
          </div>
          <div className="text-sm text-slate-400 mt-0.5">
            {totalMuestras} muestras totales almacenadas en la base de datos
          </div>
        </div>
        {estado?.tiene_biometria && (
          <button onClick={eliminarBiometria} className="btn-danger flex items-center gap-1 text-sm">
            <Trash2 size={14} /> Eliminar
          </button>
        )}
      </div>

      {/* Instrucciones */}
      <Alert type="info">
        Capture <strong>mínimo {MIN_MUESTRAS} muestras</strong> del estudiante: pose frontal, leve giro izquierda, leve giro derecha, con y sin lentes si aplica. Buena iluminación mejora la precisión.
      </Alert>

      {/* Vista de cámara */}
      <div className="card overflow-hidden mt-4">
        <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center">
          <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${camaraActiva ? '' : 'hidden'}`} />
          <canvas ref={canvasRef} className="hidden" />

          {!camaraActiva && (
            <div className="text-center">
              <Camera size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Cámara no iniciada</p>
            </div>
          )}

          {/* Overlay de guía facial */}
          {camaraActiva && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-blue-400/60 rounded-full relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
              </div>
              {autoCaptura && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/60 animate-scan" />}
            </div>
          )}

          {/* Contador en vivo */}
          {camaraActiva && (
            <div className="absolute top-3 right-3 bg-black/70 rounded-lg px-3 py-1.5 text-xs font-mono text-white">
              {muestrasHoy}/{MIN_MUESTRAS} capturas
            </div>
          )}

          {autoCaptura && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600/90 rounded-full px-4 py-1.5 text-xs text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Capturando automáticamente...
            </div>
          )}
        </div>

        {/* Progreso */}
        {muestrasHoy > 0 && (
          <div className="px-4 pt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso de captura</span>
              <span>{muestrasHoy}/{MIN_MUESTRAS}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progreso}%` }}
              />
            </div>
            {muestrasHoy >= MIN_MUESTRAS && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle size={12} /> ¡Mínimo alcanzado! Puede detener la captura.
              </p>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="p-4 flex flex-wrap gap-3">
          {!camaraActiva ? (
            <button onClick={iniciarCamara} className="btn-primary flex items-center gap-2 flex-1">
              <Camera size={16} /> Iniciar Cámara
            </button>
          ) : (
            <>
              <button
                onClick={capturarMuestra}
                disabled={capturando || autoCaptura}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
                {capturando ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
                Capturar
              </button>
              <button
                onClick={autoCaptura ? detenerAutoCaptura : iniciarAutoCaptura}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  autoCaptura ? 'bg-red-600 hover:bg-red-500 text-white' : 'btn-success'
                }`}
              >
                {autoCaptura ? 'Detener Auto' : 'Auto-captura'}
              </button>
              <button onClick={detenerCamara} className="btn-secondary">
                Apagar cámara
              </button>
            </>
          )}
        </div>
      </div>

      {muestrasHoy >= MIN_MUESTRAS && (
        <div className="mt-4">
          <Alert type="success">
            <strong>{muestrasHoy} muestras</strong> capturadas correctamente. El estudiante ya puede ser reconocido automáticamente en la toma de asistencia.
          </Alert>
          <button onClick={() => navigate('/estudiantes')} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
            <CheckCircle size={16} /> Finalizar y volver a Estudiantes
          </button>
        </div>
      )}
    </div>
  )
}
