import React from 'react'
import * as Lucide from 'lucide-react'

/** Icon động theo tên lucide, fallback về Circle. */
export function Icon({ name, size = 16, className = '', strokeWidth = 1.9, style }) {
  const Cmp = Lucide[name] || Lucide.Circle
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} style={style} />
}

export function Tooltip({ label, children, side = 'bottom' }) {
  const pos =
    side === 'bottom'
      ? 'top-full mt-2 left-1/2 -translate-x-1/2'
      : side === 'top'
        ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
        : side === 'right'
          ? 'left-full ml-2 top-1/2 -translate-y-1/2'
          : 'right-full mr-2 top-1/2 -translate-y-1/2'
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span
        className={`pointer-events-none absolute ${pos} z-[999] whitespace-nowrap rounded-md border border-white/10 bg-ink-900/95 px-2 py-1 text-[11px] font-medium text-slate-200 opacity-0 shadow-xl backdrop-blur transition-opacity duration-150 group-hover/tt:opacity-100`}
      >
        {label}
      </span>
    </span>
  )
}

export function Segmented({ options, value, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.07] bg-black/25 p-0.5">
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const active = val === value
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`rounded-[6px] px-2.5 ${size === 'sm' ? 'py-1 text-[11.5px]' : 'py-1.5 text-[13px]'} font-medium transition-all ${
              active ? 'bg-brand-500/25 text-white shadow-[inset_0_0_0_1px_rgba(124,92,255,0.5)]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-left transition-colors hover:border-white/12"
    >
      <span className="text-[13px] text-slate-200">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-slate-600/70'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

export function Modal({ open, onClose, title, subtitle, icon, children, width = 'max-w-2xl', footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_150ms_ease]" onClick={onClose} />
      <div className={`panel relative z-10 w-full ${width} animate-pop-in overflow-hidden rounded-2xl border shadow-panel`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgba(124,92,255,0.9)]">
                <Icon name={icon} size={18} />
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-semibold text-white">{title}</h3>
              {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost -mr-1 px-2 py-1.5">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] bg-black/20 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon = 'Sparkles', title, description, action }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.06] to-transparent">
        <div className="absolute inset-0 rounded-2xl bg-brand-500/10 blur-xl" />
        <Icon name={icon} size={26} className="relative text-brand-300" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-slate-200">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ status, statusMeta }) {
  const meta = statusMeta[status] || statusMeta.idle
  return (
    <span
      className="chip"
      style={{ borderColor: `${meta.color}44`, background: `${meta.color}14`, color: meta.color }}
    >
      <Icon name={meta.icon} size={11} className={status === 'running' ? 'animate-spin' : ''} />
      {meta.label}
    </span>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="field-label">{children}</h4>
      {right}
    </div>
  )
}
