import React, { memo, useState } from 'react'
import { NodeResizer } from 'reactflow'
import { Icon } from '../ui.jsx'
import { useWorkflowStore } from '../../store/useWorkflowStore.js'

function GroupBoxNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const ungroup = useWorkflowStore((s) => s.ungroup)

  return (
    <div
      className={`relative h-full w-full rounded-2xl border-2 border-dashed transition-colors ${
        selected ? 'border-brand-400/70 bg-brand-500/[0.07]' : 'border-white/12 bg-white/[0.022]'
      }`}
    >
      <NodeResizer color="#7c5cff" isVisible={selected} minWidth={240} minHeight={160} />
      <div className="absolute -top-3 left-4 flex items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false)
              updateNodeData(id, { label: draft.trim() || 'Nhóm node' })
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="rounded border border-brand-500/60 bg-ink-900 px-2 py-0.5 text-[12px] font-semibold text-white outline-none"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-850/95 px-2 py-1 text-[11.5px] font-semibold text-slate-200 shadow"
          >
            <Icon name="Boxes" size={12} className="text-brand-300" />
            {data.label}
          </span>
        )}
        <button
          onClick={() => ungroup(id)}
          title="Bỏ nhóm"
          className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-ink-850/95 text-slate-400 hover:text-white"
        >
          <Icon name="Ungroup" size={12} />
        </button>
      </div>
    </div>
  )
}

export default memo(GroupBoxNode)
