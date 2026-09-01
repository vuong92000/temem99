import React from 'react'
import { Icon, Modal, Toggle } from './ui.jsx'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { TEMPLATES } from '../lib/templates.js'

export function SettingsModal() {
  const open = useWorkflowStore((s) => s.settingsOpen)
  const setOpen = useWorkflowStore((s) => s.setSettingsOpen)
  const settings = useWorkflowStore((s) => s.settings)
  const update = useWorkflowStore((s) => s.updateSettings)

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Cài đặt ứng dụng"
      subtitle="Tuỳ chỉnh canvas, tốc độ chạy và cách lưu workflow."
      icon="Settings2"
      width="max-w-lg"
      footer={
        <button className="btn-primary" onClick={() => setOpen(false)}>
          <Icon name="Check" size={15} /> Xong
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label">Tốc độ mô phỏng xử lý mỗi node</label>
            <span className="mono text-[11px] text-brand-300">{settings.runSpeed}ms</span>
          </div>
          <input
            type="range"
            min={80}
            max={1200}
            step={20}
            value={settings.runSpeed}
            onChange={(e) => update({ runSpeed: Number(e.target.value) })}
            className="mt-2 w-full accent-brand-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Thời gian giả lập cho mỗi node khi chạy workflow (mô phỏng gọi API AI).</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="field-label">Kích thước lưới canvas</label>
            <span className="mono text-[11px] text-brand-300">{settings.gridSize}px</span>
          </div>
          <input
            type="range"
            min={8}
            max={40}
            step={4}
            value={settings.gridSize}
            onChange={(e) => update({ gridSize: Number(e.target.value) })}
            className="mt-2 w-full accent-brand-500"
          />
        </div>

        <Toggle checked={settings.snapToGrid} onChange={(v) => update({ snapToGrid: v })} label="Snap node vào lưới" />
        <Toggle checked={settings.showMinimap} onChange={(v) => update({ showMinimap: v })} label="Hiển thị mini map" />
        <Toggle checked={settings.animatedEdges} onChange={(v) => update({ animatedEdges: v })} label="Hiệu ứng dây nối khi chạy" />
        <Toggle checked={settings.autoSave} onChange={(v) => update({ autoSave: v })} label="Tự động lưu vào localStorage" />

        <div className="card p-3">
          <h4 className="field-label mb-2">Phím tắt</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] text-slate-400">
            {[
              ['Ctrl + Enter', 'Chạy workflow'],
              ['Ctrl + S', 'Lưu workflow'],
              ['Ctrl + Z / Shift+Z', 'Undo / Redo'],
              ['Ctrl + C / V', 'Copy / Paste node'],
              ['Ctrl + D', 'Nhân bản node'],
              ['Ctrl + A', 'Chọn tất cả'],
              ['Ctrl + G', 'Nhóm node'],
              ['Delete', 'Xoá node / dây'],
              ['F', 'Căn giữa workflow'],
              ['Shift + kéo', 'Chọn nhiều node'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span className="mono rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">{k}</span>
                <span className="flex-1 text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function TemplatesModal() {
  const open = useWorkflowStore((s) => s.templatesOpen)
  const setOpen = useWorkflowStore((s) => s.setTemplatesOpen)
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate)

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Workflow mẫu"
      subtitle="Chọn một quy trình dựng sẵn — đã nối dây đầy đủ, có thể chỉnh sửa thoải mái."
      icon="LayoutTemplate"
      width="max-w-2xl"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => loadTemplate(t.id)}
            className="group card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:bg-brand-500/[0.06]"
          >
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-lg">
                <Icon name="Workflow" size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-slate-100 group-hover:text-white">{t.name}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{t.description}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="chip border-white/[0.07] bg-white/[0.04] text-slate-400">{t.badge}</span>
              <span className="chip border-brand-400/30 bg-brand-500/10 text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">
                <Icon name="Play" size={10} /> Nạp workflow
              </span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
