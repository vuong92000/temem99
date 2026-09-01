import React, { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import { Icon, Tooltip } from '../ui.jsx'
import { ACCENTS, getDef } from '../../lib/nodeLibrary.js'
import { STATUS } from '../../lib/workflowEngine.js'
import { useWorkflowStore } from '../../store/useWorkflowStore.js'

const resultPreview = (result) => {
  if (!result) return null
  const entries = Object.entries(result).filter(([k]) => !k.startsWith('__'))
  if (!entries.length) return null
  const [k, v] = entries[0]
  const text = Array.isArray(v) ? v.slice(0, 2).join(' | ') : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return { key: k, text: text.length > 120 ? text.slice(0, 120) + '…' : text }
}

function WorkflowNode({ id, data, selected }) {
  const def = getDef(data.type)
  const accent = ACCENTS[def?.accent || 'violet']
  const status = STATUS[data.status] || STATUS.idle
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef(null)

  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const duplicateNodes = useWorkflowStore((s) => s.duplicateNodes)
  const deleteNodes = useWorkflowStore((s) => s.deleteNodes)
  const toggleCollapse = useWorkflowStore((s) => s.toggleCollapse)
  const toggleDisabled = useWorkflowStore((s) => s.toggleDisabled)
  const runNode = useWorkflowStore((s) => s.runNode)

  useEffect(() => setDraft(data.label), [data.label])
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!def) return null

  const commitName = () => {
    setEditing(false)
    const name = draft.trim() || def.label
    if (name !== data.label) updateNodeData(id, { label: name }, true)
  }

  const preview = resultPreview(data.result)
  const inputs = def.inputs || []
  const outputs = def.outputs || []
  const rows = Math.max(inputs.length, outputs.length)
  const running = data.status === 'running'

  const summaryChips = (def.fields || [])
    .filter((f) => ['chips', 'select', 'toggle'].includes(f.type))
    .slice(0, 3)
    .map((f) => {
      const v = data.config?.[f.key]
      if (v === undefined || v === '' || v === null) return null
      return { key: f.key, label: f.type === 'toggle' ? `${f.label}: ${v ? 'Bật' : 'Tắt'}` : String(v) }
    })
    .filter(Boolean)

  return (
    <div
      className={`wf-node group relative w-[280px] rounded-2xl border bg-gradient-to-b from-ink-800/95 to-ink-900/95 shadow-node backdrop-blur-sm transition-all duration-200 animate-pop-in ${
        data.disabled ? 'opacity-45 saturate-0' : ''
      }`}
      style={{
        borderColor: selected ? accent.from : 'rgba(255,255,255,0.075)',
      }}
    >
      {/* glow line trên đầu node */}
      <div
        className="absolute inset-x-0 -top-px h-[2px] rounded-t-2xl opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${accent.from}, ${accent.to}, transparent)` }}
      />

      {/* thanh chạy */}
      {running && (
        <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-2xl">
          <div className="h-full w-1/3 animate-[shimmer_1.1s_linear_infinite] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${accent.from}, transparent)` }} />
        </div>
      )}

      {/* quick actions */}
      <div className="absolute -top-3 right-2 z-20 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {[
          { icon: 'Play', label: 'Chạy node này', fn: () => runNode(id) },
          { icon: data.collapsed ? 'ChevronDown' : 'ChevronUp', label: data.collapsed ? 'Mở rộng' : 'Thu gọn', fn: () => toggleCollapse(id) },
          { icon: 'Copy', label: 'Nhân bản', fn: () => duplicateNodes([id]) },
          { icon: 'Power', label: data.disabled ? 'Bật node' : 'Tắt node', fn: () => toggleDisabled(id) },
          { icon: 'Trash2', label: 'Xoá node', fn: () => deleteNodes([id]), danger: true },
        ].map((a) => (
          <Tooltip key={a.icon + a.label} label={a.label} side="top">
            <button
              onClick={(e) => {
                e.stopPropagation()
                a.fn()
              }}
              className={`grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-ink-850/95 text-slate-300 shadow-lg backdrop-blur transition-all hover:scale-110 ${
                a.danger ? 'hover:border-red-400/40 hover:text-red-300' : 'hover:border-brand-400/50 hover:text-white'
              }`}
            >
              <Icon name={a.icon} size={12} />
            </button>
          </Tooltip>
        ))}
      </div>

      {/* header */}
      <div className="flex items-start gap-2.5 px-3 pb-2.5 pt-3">
        <div
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.9)]"
          style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
        >
          <Icon name={def.icon} size={17} />
          {running && <span className="absolute inset-0 animate-pulse-ring rounded-xl" />}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') {
                  setDraft(data.label)
                  setEditing(false)
                }
              }}
              className="w-full rounded border border-brand-500/60 bg-black/60 px-1 py-0.5 text-[13.5px] font-semibold text-white outline-none"
            />
          ) : (
            <p
              onDoubleClick={() => setEditing(true)}
              title="Double click để đổi tên"
              className="truncate text-[13.5px] font-semibold leading-tight text-slate-100"
            >
              {data.label}
            </p>
          )}
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">{def.label}</p>
        </div>

        <span
          className="dot-status mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: status.color, boxShadow: `0 0 10px ${status.color}` }}
          title={`${status.label} — ${status.desc}`}
        />
      </div>

      {!data.collapsed && (
        <>
          {/* description */}
          <p className="px-3 pb-2 text-[11.5px] leading-snug text-slate-400 line-clamp-2">{def.description}</p>

          {/* config chips */}
          {summaryChips.length > 0 && (
            <div className="flex flex-wrap gap-1 px-3 pb-2">
              {summaryChips.map((c) => (
                <span
                  key={c.key}
                  className="chip max-w-[124px] truncate border-white/[0.07] bg-white/[0.04] text-slate-300"
                  title={c.label}
                >
                  {c.label}
                </span>
              ))}
            </div>
          )}

          {/* result preview */}
          {preview && (
            <div className="mx-3 mb-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">{preview.key}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-300">{preview.text}</p>
            </div>
          )}

          {/* ports */}
          <div className="border-t border-white/[0.055] px-3 py-2">
            <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${rows}, minmax(0,1fr))` }}>
              {Array.from({ length: rows }).map((_, i) => {
                const inp = inputs[i]
                const out = outputs[i]
                return (
                  <div key={i} className="relative flex h-[18px] items-center justify-between">
                    {inp ? (
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={inp.id}
                          style={{ left: -19, top: '50%', background: inp.required ? '#f0a955' : '#5b6478' }}
                        />
                        <Icon name="ArrowRight" size={10} className="text-slate-600" />
                        {inp.label}
                        {inp.required && <span className="text-amber-400/80">*</span>}
                      </span>
                    ) : (
                      <span />
                    )}
                    {out ? (
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
                        {out.label}
                        <Icon name="ArrowRight" size={10} className="text-slate-600" />
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={out.id}
                          style={{ right: -19, top: '50%', background: accent.from }}
                        />
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                )
              })}
              {rows === 0 && <div className="h-[6px]" />}
            </div>
          </div>
        </>
      )}

      {data.collapsed && (
        <div className="relative flex items-center justify-between border-t border-white/[0.055] px-3 py-1.5 text-[10.5px] text-slate-500">
          {inputs[0] && <Handle type="target" position={Position.Left} id={inputs[0].id} style={{ left: -7, top: '50%' }} />}
          <span>{inputs.length} input</span>
          <span className="rounded bg-white/[0.05] px-1.5 py-0.5">đã thu gọn</span>
          <span>{outputs.length} output</span>
          {outputs[0] && <Handle type="source" position={Position.Right} id={outputs[0].id} style={{ right: -7, top: '50%', background: accent.from }} />}
        </div>
      )}

      {data.disabled && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-black/35">
          <span className="chip border-slate-500/40 bg-ink-900/90 text-slate-300">
            <Icon name="Ban" size={11} /> Disabled
          </span>
        </div>
      )}
    </div>
  )
}

export default memo(WorkflowNode)
