import React, { useRef } from 'react'
import { Icon, Toggle } from '../ui.jsx'

/** Bộ render field động theo định nghĩa node. */
export default function FieldRenderer({ field, value, onChange, nodeId }) {
  const common = 'mb-3.5'

  switch (field.type) {
    /* --------------------------------------------------------------- text */
    case 'text':
      return (
        <div className={common}>
          <label className="field-label">{field.label}</label>
          <input className="input mt-1.5" value={value || ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {field.help && <p className="mt-1 text-[11px] text-slate-500">{field.help}</p>}
        </div>
      )

    case 'textarea':
      return (
        <div className={common}>
          <label className="field-label">{field.label}</label>
          <textarea
            className="input mt-1.5 resize-y leading-relaxed"
            rows={field.rows || 3}
            value={value || ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'number':
      return (
        <div className={common}>
          <label className="field-label">{field.label}</label>
          <input
            type="number"
            className="input mt-1.5 tabular"
            min={field.min}
            max={field.max}
            step={field.step || 1}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )

    /* ------------------------------------------------------------- select */
    case 'select':
      return (
        <div className={common}>
          <label className="field-label">{field.label}</label>
          <div className="relative mt-1.5">
            <select
              className="input appearance-none pr-8"
              value={value || field.default || ''}
              onChange={(e) => onChange(e.target.value)}
            >
              {field.options.map((o) => (
                <option key={o} value={o} className="bg-ink-850">
                  {o}
                </option>
              ))}
            </select>
            <Icon name="ChevronDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      )

    /* -------------------------------------------------------------- chips */
    case 'chips':
      return (
        <div className={common}>
          <label className="field-label">{field.label}</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {field.options.map((o) => {
              const active = (value || field.default) === o
              return (
                <button
                  key={o}
                  onClick={() => onChange(o)}
                  className={`chip transition-all ${
                    active
                      ? 'border-brand-400/60 bg-brand-500/22 text-white shadow-[0_0_0_1px_rgba(124,92,255,0.35)]'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {active && <Icon name="Check" size={10} />}
                  {o}
                </button>
              )
            })}
          </div>
        </div>
      )

    /* -------------------------------------------------------- multiselect */
    case 'multiselect': {
      const arr = Array.isArray(value) ? value : []
      const all = arr.length === field.options.length
      return (
        <div className={common}>
          <div className="flex items-center justify-between">
            <label className="field-label">{field.label}</label>
            <button
              className="text-[10.5px] font-medium text-brand-300 hover:text-brand-200"
              onClick={() => onChange(all ? [] : [...field.options])}
            >
              {all ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {field.options.map((o) => {
              const active = arr.includes(o)
              return (
                <button
                  key={o}
                  onClick={() => onChange(active ? arr.filter((x) => x !== o) : [...arr, o])}
                  className={`chip transition-all ${
                    active
                      ? 'border-aqua-400/50 bg-aqua-400/15 text-aqua-400'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {active ? <Icon name="Check" size={10} /> : <Icon name="Plus" size={10} />}
                  {o}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    /* ------------------------------------------------------------- toggle */
    case 'toggle':
      return (
        <div className={common}>
          <Toggle checked={!!value} onChange={onChange} label={field.label} />
        </div>
      )

    /* ------------------------------------------------------------- slider */
    case 'slider':
      return (
        <div className={common}>
          <div className="flex items-center justify-between">
            <label className="field-label">{field.label}</label>
            <span className="tabular mono text-[11px] text-brand-300">
              {value ?? field.default}
              {field.suffix || ''}
            </span>
          </div>
          <input
            type="range"
            className="mt-2 w-full accent-brand-500"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={value ?? field.default ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      )

    /* -------------------------------------------------------------- image */
    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} nodeId={nodeId} />

    default:
      return null
  }
}

function ImageField({ field, value, onChange }) {
  const ref = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="mb-3.5">
      <label className="field-label">{field.label}</label>
      {value ? (
        <div className="group relative mt-1.5 overflow-hidden rounded-xl border border-white/[0.08]">
          <img src={value} alt="preview" className="max-h-52 w-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/85 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button className="btn-soft py-1.5 text-[12px]" onClick={() => ref.current?.click()}>
              <Icon name="RefreshCw" size={13} /> Replace
            </button>
            <button className="btn-danger py-1.5 text-[12px]" onClick={() => onChange('')}>
              <Icon name="Trash2" size={13} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFile(e.dataTransfer.files?.[0])
          }}
          className="mt-1.5 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-6 transition-all hover:border-brand-500/50 hover:bg-brand-500/[0.05]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-brand-300">
            <Icon name="ImagePlus" size={18} />
          </span>
          <span className="text-[12.5px] font-medium text-slate-300">Tải ảnh lên</span>
          <span className="text-[11px] text-slate-500">Kéo thả hoặc click để chọn (PNG, JPG, WebP)</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
