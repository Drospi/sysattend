// ─── Componentes UI reutilizables ───────────────────────

import { Loader, Search, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, Info } from 'lucide-react'

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <Loader size={size} className="animate-spin text-blue-400" />
}

// ── PageLoader ────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={28} />
        <span className="text-sm text-slate-400">Cargando...</span>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-slate-800 border border-slate-700 rounded-2xl w-full ${sizeClass} shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="font-semibold text-slate-100 text-base">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, type = 'danger' }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3 mb-5">
        <AlertTriangle size={20} className={type === 'danger' ? 'text-red-400' : 'text-amber-400'} />
        <p className="text-slate-300 text-sm">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={type === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  )
}

// ── SearchInput ───────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-9 text-sm"
      />
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    presente:   { label: 'Presente',    cls: 'badge-present' },
    ausente:    { label: 'Ausente',     cls: 'badge-absent' },
    tardanza:   { label: 'Tardanza',    cls: 'badge-late' },
    justificado:{ label: 'Justificado', cls: 'badge-justified' },
    regular:    { label: 'Regular',     cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50' },
    irregular:  { label: 'Irregular',   cls: 'bg-amber-900/40 text-amber-400 border border-amber-700/50' },
    congelado:  { label: 'Congelado',   cls: 'bg-blue-900/40 text-blue-400 border border-blue-700/50' },
    retirado:   { label: 'Retirado',    cls: 'bg-red-900/40 text-red-400 border border-red-700/50' },
    activa:     { label: 'Activa',      cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50' },
    cerrada:    { label: 'Cerrada',     cls: 'bg-slate-700 text-slate-400 border border-slate-600' },
    pendiente:  { label: 'Pendiente',   cls: 'bg-amber-900/40 text-amber-400 border border-amber-700/50' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-700 text-slate-400' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

// ── Avatar ────────────────────────────────────────────
export function Avatar({ nombre, foto, size = 'md' }) {
  const sizeClass = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size]
  const initials = nombre?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
  if (foto) return <img src={foto} alt={nombre} className={`${sizeClass} rounded-full object-cover border border-slate-600`} />
  return (
    <div className={`${sizeClass} rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-500" />
        </div>
      )}
      <h3 className="font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── FormField ─────────────────────────────────────────
export function FormField({ label, error, required, children }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────
export function Table({ headers, children, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {headers.map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? <tr><td colSpan={headers.length} className="text-center py-12"><Spinner /></td></tr>
            : children
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────
export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
      <span className="text-xs text-slate-400">{total} registros · Página {page} de {pages}</span>
      <div className="flex gap-2">
        <button onClick={() => onChange(page-1)} disabled={page <= 1} className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => onChange(page+1)} disabled={page >= pages} className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info:    { cls: 'bg-blue-900/30 border-blue-700/50 text-blue-300', Icon: Info },
    success: { cls: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300', Icon: CheckCircle },
    warning: { cls: 'bg-amber-900/30 border-amber-700/50 text-amber-300', Icon: AlertTriangle },
    danger:  { cls: 'bg-red-900/30 border-red-700/50 text-red-300', Icon: AlertTriangle },
  }
  const { cls, Icon } = styles[type]
  return (
    <div className={`flex gap-3 p-3 rounded-xl border text-sm ${cls}`}>
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
