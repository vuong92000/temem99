import React, { useRef, useState } from 'react'
import { Icon, Modal, Tooltip } from './ui.jsx'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { download } from '../lib/exporters.js'

export default function Header({ onSwitchUI }) {
  const fileRef = useRef(null)
  const [loadOpen, setLoadOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const workflowName = useWorkflowStore((s) => s.workflowName)
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName)
  const running = useWorkflowStore((s) => s.running)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const issues = useWorkflowStore((s) => s.issues)
  const s = useWorkflowStore

  const nodeCount = nodes.filter((n) => n.type !== 'groupBox').length
  const errorCount = issues.filter((i) => i.level === 'error').length

  const exportJson = () => {
    const data = s.getState().exportWorkflowJson()
    download(`${(workflowName || 'workflow').replace(/\s+/g, '-').toLowerCase()}.json`, JSON.stringify(data, null, 2), 'application/json')
    s.getState().toast('Đã export workflow JSON', 'success')
  }

  const importJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => s.getState().importWorkflowJson(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  const HBtn = ({ icon, label, onClick, tooltip, variant = 'ghost', badge }) => (
    <Tooltip label={tooltip || label} side="bottom">
      <button onClick={onClick} className={variant === 'soft' ? 'btn-soft' : 'btn-ghost'}>
        <Icon name={icon} size={15} />
        <span className="hidden xl:inline">{label}</span>
        {badge > 0 && <span className="ml-0.5 rounded bg-red-500/25 px-1 text-[10px] font-bold text-red-300">{badge}</span>}
      </button>
    </Tooltip>
  )

  return (
    <>
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-ink-900/85 px-3 backdrop-blur-xl">
        {/* logo */}
        <div className="flex items-center gap-2.5 pr-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-aqua-500 shadow-[0_8px_24px_-10px_rgba(124,92,255,1)]">
            <Icon name="Workflow" size={19} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[14.5px] font-bold leading-tight tracking-tight grad-text">AI Video Workflow Builder</h1>
            <p className="text-[10.5px] leading-tight text-slate-500">Node-based video script studio</p>
          </div>
        </div>

        <span className="mx-1 h-7 w-px bg-white/[0.08]" />

        {/* tên workflow */}
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-[150px] rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] font-medium text-slate-200 outline-none transition-all hover:border-white/10 hover:bg-white/[0.04] focus:border-brand-500/60 focus:bg-black/40 lg:w-[190px]"
          />
          <span className="hidden items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10.5px] text-slate-400 lg:flex">
            <Icon name="Boxes" size={11} /> {nodeCount} node
            <span className="text-slate-600">·</span>
            <Icon name="Spline" size={11} /> {edges.length} dây
          </span>
        </div>

        <div className="mx-auto" />

        {/* actions */}
        <div className="flex items-center gap-0.5">
          <HBtn icon="FilePlus" label="New" tooltip="Tạo workflow mới" onClick={() => s.getState().newWorkflow()} />
          <HBtn
            icon="Save"
            label="Save"
            tooltip="Lưu workflow (Ctrl+S)"
            onClick={() => {
              setNameDraft(workflowName)
              setSaveOpen(true)
            }}
          />
          <HBtn
            icon="FolderOpen"
            label="Load"
            tooltip="Tải workflow đã lưu"
            onClick={() => {
              s.getState().refreshSaved()
              setLoadOpen(true)
            }}
          />
          <HBtn icon="LayoutGrid" label="Auto Layout" tooltip="Tự động sắp xếp node" onClick={() => s.getState().autoLayout('LR')} />
          <HBtn icon="ShieldCheck" label="Validate" tooltip="Kiểm tra lỗi workflow" onClick={() => s.getState().validate()} badge={errorCount} />

          <span className="mx-1 h-7 w-px bg-white/[0.08]" />

          <HBtn icon="Upload" label="Import" tooltip="Import workflow JSON" onClick={() => fileRef.current?.click()} />
          <HBtn icon="Braces" label="Export" tooltip="Export workflow JSON" onClick={exportJson} />
          <HBtn icon="RotateCcw" label="Reset" tooltip="Reset trạng thái node" onClick={() => s.getState().resetWorkflow()} />
          <HBtn icon="Settings2" label="Settings" tooltip="Cài đặt" onClick={() => s.getState().setSettingsOpen(true)} />
          {onSwitchUI && (
            <Tooltip label="Xem giao diện Classic (bản single-file)" side="bottom">
              <button onClick={onSwitchUI} className="btn-soft ml-1 border-brand-500/30 bg-brand-500/10 text-brand-200">
                <Icon name="Layers" size={15} />
                <span className="hidden xl:inline">Classic UI</span>
              </button>
            </Tooltip>
          )}

          <button
            onClick={() => s.getState().runAll()}
            disabled={running}
            className="btn-primary ml-2 min-w-[124px] justify-center disabled:cursor-not-allowed disabled:opacity-70"
          >
            {running ? (
              <>
                <Icon name="Loader" size={15} className="animate-spin" /> Đang chạy...
              </>
            ) : (
              <>
                <Icon name="Play" size={15} /> Run Workflow
              </>
            )}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
      </header>

      <SaveModal open={saveOpen} onClose={() => setSaveOpen(false)} name={nameDraft} setName={setNameDraft} />
      <LoadModal open={loadOpen} onClose={() => setLoadOpen(false)} />
    </>
  )
}

function SaveModal({ open, onClose, name, setName }) {
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lưu workflow"
      subtitle="Workflow được lưu vào localStorage của trình duyệt."
      icon="Save"
      width="max-w-md"
      footer={
        <>
          <button className="btn-soft" onClick={onClose}>
            Huỷ
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              saveWorkflow(name.trim() || 'Untitled Workflow')
              onClose()
            }}
          >
            <Icon name="Save" size={15} /> Lưu workflow
          </button>
        </>
      }
    >
      <label className="field-label">Tên workflow</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="input mt-1.5" placeholder="VD: TVC nước hoa mùa thu" />
    </Modal>
  )
}

function LoadModal({ open, onClose }) {
  const savedList = useWorkflowStore((s) => s.savedList)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const deleteSaved = useWorkflowStore((s) => s.deleteSaved)
  const items = Object.values(savedList || {}).sort((a, b) => b.savedAt - a.savedAt)

  return (
    <Modal open={open} onClose={onClose} title="Workflow đã lưu" subtitle={`${items.length} workflow trong bộ nhớ trình duyệt`} icon="FolderOpen" width="max-w-lg">
      {!items.length && <p className="py-8 text-center text-[13px] text-slate-500">Chưa có workflow nào được lưu.</p>}
      <div className="space-y-2">
        {items.map((w) => (
          <div key={w.name} className="card flex items-center gap-3 px-3 py-2.5 transition-colors hover:border-brand-500/35">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
              <Icon name="Workflow" size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-200">{w.name}</p>
              <p className="text-[11px] text-slate-500">
                {w.nodes?.length || 0} node · {w.edges?.length || 0} dây · {new Date(w.savedAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <button
              className="btn-soft py-1.5"
              onClick={() => {
                loadWorkflow(w.name)
                onClose()
              }}
            >
              <Icon name="FolderOpen" size={14} /> Tải
            </button>
            <button className="btn-danger px-2 py-1.5" onClick={() => deleteSaved(w.name)}>
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
