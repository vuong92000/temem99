import React, { useMemo, useState } from 'react'
import { Icon, StatusPill, Tooltip, EmptyState, SectionTitle } from './ui.jsx'
import FieldRenderer from './fields/FieldRenderer.jsx'
import { ACCENTS, getDef } from '../lib/nodeLibrary.js'
import { STATUS } from '../lib/workflowEngine.js'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { copyText } from '../lib/exporters.js'

const renderValue = (v) => {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return v
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export default function PropertiesPanel() {
  const rightOpen = useWorkflowStore((s) => s.rightOpen)
  const setRightOpen = useWorkflowStore((s) => s.setRightOpen)
  const selectedIds = useWorkflowStore((s) => s.selectedNodeIds)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const results = useWorkflowStore((s) => s.results)
  const [tab, setTab] = useState('config')

  const node = useMemo(() => nodes.find((n) => n.id === selectedIds[selectedIds.length - 1]) || null, [nodes, selectedIds])

  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig)
  const resetNodeConfig = useWorkflowStore((s) => s.resetNodeConfig)
  const deleteNodes = useWorkflowStore((s) => s.deleteNodes)
  const duplicateNodes = useWorkflowStore((s) => s.duplicateNodes)
  const runNode = useWorkflowStore((s) => s.runNode)
  const toast = useWorkflowStore((s) => s.toast)
  const toggleDisabled = useWorkflowStore((s) => s.toggleDisabled)

  if (!rightOpen)
    return (
      <div className="flex h-full w-12 flex-col items-center gap-2 border-l border-white/[0.06] bg-ink-900/60 py-3">
        <Tooltip label="Mở bảng thuộc tính" side="left">
          <button onClick={() => setRightOpen(true)} className="btn-ghost px-2 py-2">
            <Icon name="PanelRightOpen" size={17} />
          </button>
        </Tooltip>
      </div>
    )

  const def = node ? getDef(node.data.type) : null
  const accent = def ? ACCENTS[def.accent] : ACCENTS.violet
  const result = node ? results[node.id] || node.data.result : null
  const incoming = node ? edges.filter((e) => e.target === node.id) : []
  const outgoing = node ? edges.filter((e) => e.source === node.id) : []

  return (
    <aside className="flex h-full w-[330px] shrink-0 flex-col border-l border-white/[0.06] bg-gradient-to-b from-ink-900/90 to-ink-950/95 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Icon name="SlidersHorizontal" size={15} className="text-brand-300" />
          <h2 className="text-[13px] font-semibold text-slate-100">Thuộc tính node</h2>
        </div>
        <div className="flex items-center gap-1">
          {selectedIds.length > 1 && (
            <span className="chip border-brand-400/40 bg-brand-500/15 text-brand-200">{selectedIds.length} đã chọn</span>
          )}
          <button onClick={() => setRightOpen(false)} className="btn-ghost px-1.5 py-1.5">
            <Icon name="PanelRightClose" size={16} />
          </button>
        </div>
      </div>

      {!node ? (
        <EmptyState
          icon="MousePointerClick"
          title="Chưa chọn node nào"
          description="Click vào một node trên canvas để xem và chỉnh sửa thuộc tính, input/output cũng như kết quả xử lý của node đó."
        />
      ) : (
        <>
          {/* node header */}
          <div className="border-b border-white/[0.06] px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
              >
                <Icon name={def.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={node.data.label}
                  onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
                  className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[14px] font-semibold text-white outline-none hover:border-white/10 focus:border-brand-500/60 focus:bg-black/40"
                />
                <p className="mt-0.5 px-1 text-[11px] text-slate-500">{def.label}</p>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">{def.description}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StatusPill status={node.data.status} statusMeta={STATUS} />
              <span className="chip border-white/[0.07] bg-white/[0.03] text-slate-400">
                <Icon name="ArrowDownToLine" size={10} /> {incoming.length} input
              </span>
              <span className="chip border-white/[0.07] bg-white/[0.03] text-slate-400">
                <Icon name="ArrowUpFromLine" size={10} /> {outgoing.length} output
              </span>
              <span className="mono chip border-white/[0.07] bg-white/[0.03] text-[9.5px] text-slate-500">{node.id}</span>
            </div>
          </div>

          {/* tabs */}
          <div className="flex gap-1 border-b border-white/[0.06] px-2.5 pt-2">
            {[
              { id: 'config', label: 'Cấu hình', icon: 'Settings2' },
              { id: 'io', label: 'Input / Output', icon: 'ArrowLeftRight' },
              { id: 'result', label: 'Kết quả', icon: 'Sparkles' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-t-lg px-2.5 py-2 text-[12px] font-medium transition-colors ${
                  tab === t.id ? 'border-b-2 border-brand-400 text-white' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon name={t.icon} size={13} /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3.5">
            {tab === 'config' && (
              <>
                {def.fields?.length ? (
                  def.fields.map((f) => (
                    <FieldRenderer
                      key={f.key}
                      field={f}
                      nodeId={node.id}
                      value={node.data.config?.[f.key]}
                      onChange={(v) => updateNodeConfig(node.id, f.key, v)}
                    />
                  ))
                ) : (
                  <p className="text-[12.5px] text-slate-500">Node này không có tham số cấu hình.</p>
                )}

                <div className="mb-3">
                  <label className="field-label">Ghi chú node</label>
                  <textarea
                    className="input mt-1.5"
                    rows={2}
                    placeholder="Ghi chú nội bộ cho node này..."
                    value={node.data.note || ''}
                    onChange={(e) => updateNodeData(node.id, { note: e.target.value })}
                  />
                </div>

                {/* actions từ definition */}
                {def.actions?.length > 0 && (
                  <div className="mb-3">
                    <SectionTitle>Hành động của node</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {def.actions.map((a) => (
                        <button
                          key={a.id}
                          className={a.kind === 'run' ? 'btn-primary py-1.5 text-[12px]' : 'btn-soft py-1.5 text-[12px]'}
                          onClick={async () => {
                            if (a.kind === 'run') runNode(node.id)
                            else if (a.kind === 'clear') updateNodeConfig(node.id, a.field, '')
                            else if (a.kind === 'copy') {
                              const val = result?.[a.field]
                              const text = Array.isArray(val) ? val.join('\n') : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '')
                              if (!val) return toast('Chưa có kết quả để copy — hãy chạy node trước', 'warning')
                              await copyText(text)
                              toast('Đã copy vào clipboard', 'success')
                            }
                          }}
                        >
                          <Icon name={a.icon} size={13} /> {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'io' && (
              <>
                <SectionTitle>Cổng Input</SectionTitle>
                <div className="mb-4 space-y-1.5">
                  {def.inputs.length ? (
                    def.inputs.map((i) => {
                      const conns = incoming.filter((e) => (e.targetHandle || 'in') === i.id)
                      return (
                        <div key={i.id} className="card flex items-center gap-2 px-2.5 py-2">
                          <Icon name="ArrowDownToLine" size={13} className={i.required ? 'text-amber-400' : 'text-slate-500'} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] text-slate-200">
                              {i.label} {i.required && <span className="text-amber-400">*</span>}
                            </p>
                            <p className="mono text-[10px] text-slate-500">id: {i.id}</p>
                          </div>
                          <span className={`chip ${conns.length ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
                            {conns.length ? `${conns.length} kết nối` : 'chưa nối'}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-[12px] text-slate-500">Node đầu vào — không có cổng input.</p>
                  )}
                </div>

                <SectionTitle>Cổng Output</SectionTitle>
                <div className="mb-4 space-y-1.5">
                  {def.outputs.length ? (
                    def.outputs.map((o) => {
                      const conns = outgoing.filter((e) => (e.sourceHandle || 'out') === o.id)
                      return (
                        <div key={o.id} className="card flex items-center gap-2 px-2.5 py-2">
                          <Icon name="ArrowUpFromLine" size={13} style={{ color: accent.from }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] text-slate-200">{o.label}</p>
                            <p className="mono text-[10px] text-slate-500">id: {o.id}</p>
                          </div>
                          <span className={`chip ${conns.length ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                            {conns.length ? `${conns.length} kết nối` : 'chưa nối'}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-[12px] text-slate-500">Node đầu ra — không có cổng output.</p>
                  )}
                </div>

                <SectionTitle>Node kết nối tới</SectionTitle>
                <div className="space-y-1">
                  {outgoing.length ? (
                    outgoing.map((e) => {
                      const t = nodes.find((n) => n.id === e.target)
                      return (
                        <button
                          key={e.id}
                          onClick={() => useWorkflowStore.getState().selectNode(e.target)}
                          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-left text-[12px] text-slate-300 hover:border-brand-500/40 hover:bg-brand-500/[0.07]"
                        >
                          <Icon name="ArrowRight" size={12} className="text-brand-300" />
                          {t?.data.label || e.target}
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-[12px] text-slate-500">Chưa nối tới node nào.</p>
                  )}
                </div>
              </>
            )}

            {tab === 'result' && (
              <>
                {!result ? (
                  <EmptyState
                    icon="Sparkles"
                    title="Chưa có kết quả"
                    description="Bấm Test Node hoặc Run Workflow để node này xử lý và tạo dữ liệu đầu ra."
                    action={
                      <button className="btn-primary mt-1" onClick={() => runNode(node.id)}>
                        <Icon name="Play" size={14} /> Test Node
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(result)
                      .filter(([k]) => !k.startsWith('__'))
                      .map(([k, v]) => {
                        const val = renderValue(v)
                        return (
                          <div key={k} className="card overflow-hidden">
                            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</span>
                              <button
                                onClick={async () => {
                                  await copyText(Array.isArray(val) ? val.join('\n') : val)
                                  toast('Đã copy', 'success')
                                }}
                                className="text-slate-500 hover:text-white"
                              >
                                <Icon name="Copy" size={12} />
                              </button>
                            </div>
                            <div className="max-h-56 overflow-y-auto px-2.5 py-2">
                              {Array.isArray(val) ? (
                                <ul className="space-y-1">
                                  {val.map((line, i) => (
                                    <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-slate-300">
                                      <span className="mono shrink-0 text-slate-600">{String(i + 1).padStart(2, '0')}</span>
                                      <span className="whitespace-pre-wrap">{String(line)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-slate-300">{val}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* footer actions */}
          <div className="grid grid-cols-2 gap-1.5 border-t border-white/[0.06] p-2.5">
            <button className="btn-primary justify-center py-2 text-[12.5px]" onClick={() => runNode(node.id)}>
              <Icon name="Play" size={14} /> Test Node
            </button>
            <button
              className="btn-soft justify-center py-2 text-[12.5px]"
              onClick={() => {
                useWorkflowStore.getState().persistAuto()
                toast('Đã lưu cấu hình node', 'success')
              }}
            >
              <Icon name="Save" size={14} /> Save Config
            </button>
            <button className="btn-soft justify-center py-2 text-[12.5px]" onClick={() => resetNodeConfig(node.id)}>
              <Icon name="RotateCcw" size={14} /> Reset Node
            </button>
            <button className="btn-soft justify-center py-2 text-[12.5px]" onClick={() => duplicateNodes([node.id])}>
              <Icon name="Copy" size={14} /> Duplicate
            </button>
            <button className="btn-soft justify-center py-2 text-[12.5px]" onClick={() => toggleDisabled(node.id)}>
              <Icon name="Power" size={14} /> {node.data.disabled ? 'Enable' : 'Disable'}
            </button>
            <button className="btn-danger justify-center py-2 text-[12.5px]" onClick={() => deleteNodes([node.id])}>
              <Icon name="Trash2" size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
