import React, { useMemo, useState } from 'react'
import { Icon, Tooltip } from './ui.jsx'
import { ACCENTS, GROUPS, groupNodes } from '../lib/nodeLibrary.js'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { TEMPLATES } from '../lib/templates.js'

export default function Sidebar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => Object.fromEntries(GROUPS.map((g) => [g.id, true])))
  const leftOpen = useWorkflowStore((s) => s.leftOpen)
  const setLeftOpen = useWorkflowStore((s) => s.setLeftOpen)
  const addNode = useWorkflowStore((s) => s.addNode)
  const setTemplatesOpen = useWorkflowStore((s) => s.setTemplatesOpen)
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate)

  const groups = useMemo(() => groupNodes(query), [query])
  const total = groups.reduce((a, g) => a + g.nodes.length, 0)

  if (!leftOpen)
    return (
      <div className="flex h-full w-12 flex-col items-center gap-2 border-r border-white/[0.06] bg-ink-900/60 py-3">
        <Tooltip label="Mở thư viện node" side="right">
          <button onClick={() => setLeftOpen(true)} className="btn-ghost px-2 py-2">
            <Icon name="PanelLeftOpen" size={17} />
          </button>
        </Tooltip>
        <div className="mt-2 flex flex-col items-center gap-2">
          {GROUPS.map((g) => (
            <Tooltip key={g.id} label={g.label} side="right">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.06]" style={{ color: g.color }}>
                <Icon name={g.icon} size={15} />
              </span>
            </Tooltip>
          ))}
        </div>
      </div>
    )

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-ink-900/90 to-ink-950/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-100">Thư viện Node</h2>
          <p className="text-[11px] text-slate-500">{total} node • kéo thả vào canvas</p>
        </div>
        <Tooltip label="Thu gọn sidebar" side="right">
          <button onClick={() => setLeftOpen(false)} className="btn-ghost px-1.5 py-1.5">
            <Icon name="PanelLeftClose" size={16} />
          </button>
        </Tooltip>
      </div>

      <div className="px-3.5 pb-2.5">
        <div className="relative">
          <Icon name="Search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm node..."
            className="input pl-8 pr-7 text-[12.5px]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((g) => (
          <div key={g.id} className="mb-1.5">
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${g.color}1f`, color: g.color }}>
                <Icon name={g.icon} size={13} />
              </span>
              <span className="flex-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate-300">{g.label}</span>
              <span className="mono text-[10px] text-slate-600">{g.nodes.length}</span>
              <Icon name="ChevronDown" size={13} className={`text-slate-500 transition-transform ${open[g.id] ? '' : '-rotate-90'}`} />
            </button>

            {open[g.id] && (
              <div className="mt-0.5 space-y-1">
                {g.nodes.map((n) => (
                  <NodeCard key={n.type} def={n} onAdd={() => addNode(n.type, { x: 200 + Math.random() * 240, y: 160 + Math.random() * 200 })} />
                ))}
              </div>
            )}
          </div>
        ))}
        {!groups.length && (
          <p className="px-3 py-8 text-center text-[12.5px] text-slate-500">Không tìm thấy node nào khớp "{query}".</p>
        )}
      </div>

      <div className="border-t border-white/[0.06] p-2.5">
        <p className="field-label mb-1.5 px-1">Workflow mẫu</p>
        <div className="space-y-1">
          {TEMPLATES.slice(0, 3).map((t) => (
            <button
              key={t.id}
              onClick={() => loadTemplate(t.id)}
              className="group flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left transition-all hover:border-brand-500/40 hover:bg-brand-500/[0.08]"
            >
              <Icon name="Sparkles" size={13} className="shrink-0 text-brand-300" />
              <span className="flex-1 truncate text-[12px] font-medium text-slate-300 group-hover:text-white">{t.name}</span>
              <span className="mono text-[9.5px] text-slate-600">{t.badge}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setTemplatesOpen(true)} className="btn-soft mt-2 w-full justify-center text-[12px]">
          <Icon name="LayoutTemplate" size={14} /> Xem tất cả mẫu
        </button>
      </div>
    </aside>
  )
}

function NodeCard({ def, onAdd }) {
  const accent = ACCENTS[def.accent] || ACCENTS.violet
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/aivwb-node', def.type)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDoubleClick={onAdd}
      title={`${def.label} — kéo vào canvas hoặc double click để thêm`}
      className="group flex cursor-grab items-start gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.018] px-2.5 py-2 transition-all duration-150 hover:-translate-y-px hover:border-white/12 hover:bg-white/[0.055] hover:shadow-lg active:cursor-grabbing"
    >
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white transition-transform group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
      >
        <Icon name={def.icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-slate-200">{def.label}</span>
        <span className="mt-0.5 block line-clamp-2 text-[10.5px] leading-snug text-slate-500">{def.description}</span>
      </span>
      <button
        onClick={onAdd}
        className="mt-0.5 hidden h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400 hover:border-brand-400/50 hover:text-white group-hover:grid"
        title="Thêm vào canvas"
      >
        <Icon name="Plus" size={12} />
      </button>
    </div>
  )
}
