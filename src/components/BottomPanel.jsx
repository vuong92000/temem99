import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, EmptyState, Tooltip } from './ui.jsx'
import { useWorkflowStore } from '../store/useWorkflowStore.js'
import { copyText, download, scopedResult, toJson, toMarkdown, toPromptPack, toText } from '../lib/exporters.js'

const TABS = [
  { id: 'result', label: 'Kết quả', icon: 'Sparkles' },
  { id: 'script', label: 'Kịch bản', icon: 'FileText' },
  { id: 'storyboard', label: 'Storyboard', icon: 'LayoutGrid' },
  { id: 'prompts', label: 'Prompts', icon: 'WandSparkles' },
  { id: 'logs', label: 'Log xử lý', icon: 'Terminal' },
  { id: 'issues', label: 'Cảnh báo', icon: 'TriangleAlert' },
  { id: 'json', label: 'JSON', icon: 'Braces' },
]

export default function BottomPanel() {
  const open = useWorkflowStore((s) => s.bottomOpen)
  const setOpen = useWorkflowStore((s) => s.setBottomOpen)
  const tab = useWorkflowStore((s) => s.bottomTab)
  const setTab = useWorkflowStore((s) => s.setBottomTab)
  const result = useWorkflowStore((s) => s.finalResult)
  const logs = useWorkflowStore((s) => s.logs)
  const issues = useWorkflowStore((s) => s.issues)
  const running = useWorkflowStore((s) => s.running)
  const toast = useWorkflowStore((s) => s.toast)

  const [height, setHeight] = useState(288)
  const dragging = useRef(false)

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return
      const h = Math.min(Math.max(window.innerHeight - e.clientY - 8, 140), window.innerHeight - 220)
      setHeight(h)
    }
    const up = () => (dragging.current = false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  const exportAs = async (format) => {
    if (!result) return toast('Chưa có kết quả — hãy chạy workflow trước', 'warning')
    const base = (result.videoName || 'ai-video-script').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase().slice(0, 48)
    if (format === 'TXT') download(`${base}.txt`, toText(result))
    if (format === 'JSON') download(`${base}.json`, toJson(result), 'application/json')
    if (format === 'MD') download(`${base}.md`, toMarkdown(result), 'text/markdown')
    if (format === 'PACK') download(`${base}-prompt-pack.txt`, toPromptPack(result))
    toast(`Đã tải file ${format}`, 'success')
  }

  const copyAll = async () => {
    if (!result) return toast('Chưa có kết quả — hãy chạy workflow trước', 'warning')
    await copyText(toText(result))
    toast('Đã copy toàn bộ kết quả', 'success')
  }

  const errorCount = issues.filter((i) => i.level === 'error').length
  const warnCount = issues.filter((i) => i.level === 'warning').length

  if (!open)
    return (
      <div className="flex h-10 shrink-0 items-center justify-between border-t border-white/[0.06] bg-ink-900/85 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <Icon name="PanelBottomOpen" size={15} className="text-brand-300" />
          Bảng kết quả đang thu gọn
          {result && <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">có kết quả mới</span>}
        </div>
        <button onClick={() => setOpen(true)} className="btn-soft py-1.5 text-[12px]">
          <Icon name="ChevronUp" size={14} /> Mở bảng kết quả
        </button>
      </div>
    )

  return (
    <div className="flex shrink-0 flex-col border-t border-white/[0.06] bg-gradient-to-b from-ink-900/95 to-ink-950" style={{ height }}>
      <div
        className="group h-1.5 w-full cursor-row-resize"
        onMouseDown={() => (dragging.current = true)}
        title="Kéo để thay đổi chiều cao"
      >
        <div className="mx-auto mt-0.5 h-0.5 w-16 rounded-full bg-white/10 transition-colors group-hover:bg-brand-400/60" />
      </div>

      {/* tabs + actions */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] px-2.5 pb-1.5">
        {TABS.map((t) => {
          const badge = t.id === 'issues' ? issues.length : t.id === 'logs' ? logs.length : 0
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all ${
                tab === t.id ? 'bg-brand-500/18 text-white shadow-[inset_0_0_0_1px_rgba(124,92,255,0.35)]' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
              }`}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {badge > 0 && (
                <span className={`tabular rounded px-1 text-[10px] ${t.id === 'issues' && errorCount ? 'bg-red-500/25 text-red-300' : 'bg-white/10 text-slate-300'}`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}

        <div className="mx-auto" />

        <div className="flex items-center gap-1">
          {running && (
            <span className="chip mr-1 border-brand-400/40 bg-brand-500/15 text-brand-200">
              <Icon name="Loader" size={11} className="animate-spin" /> đang xử lý
            </span>
          )}
          <Tooltip label="Copy toàn bộ kết quả" side="top">
            <button className="btn-soft py-1.5 text-[12px]" onClick={copyAll}>
              <Icon name="Copy" size={13} /> Copy
            </button>
          </Tooltip>
          <button className="btn-soft py-1.5 text-[12px]" onClick={() => exportAs('TXT')}>
            <Icon name="FileDown" size={13} /> TXT
          </button>
          <button className="btn-soft py-1.5 text-[12px]" onClick={() => exportAs('JSON')}>
            <Icon name="Braces" size={13} /> JSON
          </button>
          <button className="btn-soft py-1.5 text-[12px]" onClick={() => exportAs('MD')}>
            <Icon name="FileCode" size={13} /> MD
          </button>
          <button className="btn-soft py-1.5 text-[12px]" onClick={() => exportAs('PACK')}>
            <Icon name="Package" size={13} /> Prompt Pack
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button onClick={() => setOpen(false)} className="btn-ghost px-1.5 py-1.5">
            <Icon name="ChevronDown" size={15} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'result' && <ResultTab result={result} />}
        {tab === 'script' && <ScriptTab result={result} />}
        {tab === 'storyboard' && <StoryboardTab result={result} />}
        {tab === 'prompts' && <PromptsTab result={result} />}
        {tab === 'logs' && <LogsTab logs={logs} />}
        {tab === 'issues' && <IssuesTab issues={issues} errorCount={errorCount} warnCount={warnCount} />}
        {tab === 'json' && <JsonTab result={result} />}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- RESULT */

function ResultTab({ result }) {
  const toast = useWorkflowStore((s) => s.toast)
  if (!result)
    return (
      <EmptyState
        icon="Sparkles"
        title="Chưa có kết quả workflow"
        description="Bấm Run Workflow trên header để chạy toàn bộ node theo thứ tự dây nối. Kết quả kịch bản, storyboard, prompt và negative prompt sẽ hiện ở đây."
        action={
          <button className="btn-primary mt-1" onClick={() => useWorkflowStore.getState().runAll()}>
            <Icon name="Play" size={14} /> Run Workflow
          </button>
        }
      />
    )

  const cards = [
    { icon: 'Clapperboard', label: 'Tên video', value: result.videoName, accent: '#7c5cff' },
    { icon: 'Palette', label: 'Phong cách', value: result.style, accent: '#3ddbd9' },
    { icon: 'RectangleHorizontal', label: 'Tỉ lệ', value: result.aspectRatio, accent: '#ff9f45' },
    { icon: 'Clock', label: 'Thời lượng', value: result.duration, accent: '#4ade80' },
    { icon: 'Layers', label: 'Số cảnh', value: `${result.scenes.length} cảnh`, accent: '#f472b6' },
    { icon: 'Languages', label: 'Ngôn ngữ', value: result.language, accent: '#60a5fa' },
  ]

  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
              <Icon name={c.icon} size={12} /> {c.label}
            </div>
            <p className="mt-1 truncate text-[13px] font-medium text-slate-100" title={c.value}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="card p-3 lg:col-span-2">
          <h4 className="field-label mb-1.5">Ý tưởng & Hook</h4>
          <p className="text-[13px] leading-relaxed text-slate-300">{result.idea}</p>
          <div className="mt-2.5 rounded-lg border border-brand-500/25 bg-brand-500/[0.08] px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-300">Hook mở đầu</p>
            <p className="mt-0.5 text-[13px] italic text-slate-200">"{result.hook}"</p>
          </div>
          <div className="mt-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-300">CTA cuối video</p>
            <p className="mt-0.5 text-[13px] text-slate-200">{result.cta}</p>
          </div>
        </div>

        <div className="card p-3">
          <h4 className="field-label mb-1.5">Quy tắc nhất quán</h4>
          <ul className="space-y-1.5">
            {[
              ['UserRound', result.consistency.character],
              ['Package', result.consistency.product],
              ['Mountain', result.consistency.background],
              ['Move3d', result.consistency.motion],
            ].map(([icon, text], i) => (
              <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-slate-400">
                <Icon name={icon} size={12} className="mt-0.5 shrink-0 text-brand-300" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {[
          { title: 'Prompt tạo ảnh (master)', text: result.imagePrompt, icon: 'Image', color: '#7c5cff' },
          { title: 'Prompt video (master)', text: result.videoPrompt, icon: 'Clapperboard', color: '#3ddbd9' },
          { title: 'Negative prompt', text: result.negativePrompt, icon: 'ShieldAlert', color: '#f87171' },
        ].map((p) => (
          <div key={p.title} className="card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: p.color }}>
                <Icon name={p.icon} size={12} /> {p.title}
              </span>
              <button
                className="text-slate-500 hover:text-white"
                onClick={async () => {
                  await copyText(p.text)
                  toast('Đã copy prompt', 'success')
                }}
              >
                <Icon name="Copy" size={12} />
              </button>
            </div>
            <p className="mono max-h-32 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed text-slate-400">{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- SCRIPT */

function ScriptTab({ result }) {
  const toast = useWorkflowStore((s) => s.toast)
  if (!result?.scenes?.length) return <EmptyState icon="FileText" title="Chưa có kịch bản" description="Chạy workflow có Script Generator Node để tạo kịch bản từng cảnh." />
  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">{result.videoName}</h3>
          <p className="text-[12px] text-slate-500">
            {result.scenes.length} cảnh · {result.duration} · {result.aspectRatio} · {result.style}
          </p>
        </div>
        <button
          className="btn-soft py-1.5 text-[12px]"
          onClick={async () => {
            await copyText(toText(result))
            toast('Đã copy kịch bản', 'success')
          }}
        >
          <Icon name="Copy" size={13} /> Copy kịch bản
        </button>
      </div>

      <div className="space-y-2">
        {result.scenes.map((s) => (
          <div key={s.index} className="card overflow-hidden transition-colors hover:border-brand-500/30">
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                {s.index}
              </span>
              <span className="text-[13px] font-semibold text-slate-100">{s.name}</span>
              <span className="mono chip border-white/[0.07] bg-black/30 text-[10px] text-slate-400">{s.timecode}</span>
              <span className="chip border-white/[0.07] bg-white/[0.03] text-[10px] text-slate-400">
                <Icon name="Camera" size={10} /> {s.camera}
              </span>
            </div>
            <div className="grid gap-x-4 gap-y-1.5 px-3 py-2.5 md:grid-cols-2">
              <Row label="Hình ảnh" value={s.visual} />
              <Row label="Hành động" value={s.action} />
              {s.dialogue && <Row label="Lời thoại" value={`"${s.dialogue}"`} highlight />}
              {s.sfx && <Row label="Âm thanh" value={s.sfx} />}
              <Row label="Prompt ảnh" value={s.imagePrompt} mono />
              <Row label="Prompt video" value={s.videoPrompt} mono />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const Row = ({ label, value, mono, highlight }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-0.5 text-[12px] leading-relaxed ${highlight ? 'text-brand-200 italic' : 'text-slate-300'} ${mono ? 'mono text-[10.5px] text-slate-400' : ''}`}>{value}</p>
  </div>
)

/* ------------------------------------------------------------ STORYBOARD */

function StoryboardTab({ result }) {
  if (!result?.storyboard) return <EmptyState icon="LayoutGrid" title="Chưa có storyboard" description="Thêm Storyboard Generator Node vào workflow và chạy lại để tạo storyboard." />
  const { frames, aspectRatio, continuity } = result.storyboard
  const ratio = { '9:16': '9 / 16', '16:9': '16 / 9', '1:1': '1 / 1', '4:5': '4 / 5' }[aspectRatio] || '9 / 16'
  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="chip border-brand-400/40 bg-brand-500/15 text-brand-200">
          <Icon name="LayoutGrid" size={11} /> {frames.length} khung
        </span>
        <span className="chip border-white/[0.07] bg-white/[0.03] text-slate-300">Tỉ lệ {aspectRatio}</span>
        {continuity.slice(0, 2).map((c, i) => (
          <span key={i} className="chip border-white/[0.07] bg-white/[0.03] text-slate-400">
            <Icon name="Lock" size={10} /> {c}
          </span>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {frames.map((f) => (
          <div key={f.index} className="card overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-500/40">
            <div className="relative grid place-items-center border-b border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-transparent" style={{ aspectRatio: ratio, maxHeight: 168 }}>
              <div className="text-center">
                <span className="mono text-[26px] font-bold text-white/12">#{f.index}</span>
                <p className="px-3 text-[10.5px] text-slate-500">{f.shotSize}</p>
              </div>
              <span className="absolute left-2 top-2 chip border-white/10 bg-black/60 text-[9.5px] text-slate-300">{f.duration}</span>
              <span className="absolute right-2 top-2 chip border-white/10 bg-black/60 text-[9.5px] text-slate-300">{f.camera}</span>
            </div>
            <div className="space-y-1 px-2.5 py-2">
              <p className="text-[12px] font-semibold text-slate-200">{f.title}</p>
              <p className="line-clamp-2 text-[11px] leading-snug text-slate-400">{f.description}</p>
              <p className="line-clamp-1 text-[10.5px] text-slate-500">Tư thế: {f.pose}</p>
              <p className="mono line-clamp-2 rounded bg-black/30 px-2 py-1 text-[9.5px] leading-snug text-slate-500">{f.imagePrompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- PROMPTS */

function PromptsTab({ result }) {
  const toast = useWorkflowStore((s) => s.toast)
  const [scope, setScope] = useState('Toàn bộ workflow')
  const text = useMemo(() => (result ? toPromptPack(result) : ''), [result])
  if (!result) return <EmptyState icon="WandSparkles" title="Chưa có prompt" description="Chạy workflow để tạo prompt ảnh, prompt video và negative prompt." />
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2">
        <span className="field-label">Phạm vi</span>
        {['Toàn bộ workflow', 'Chỉ kịch bản', 'Chỉ prompt ảnh', 'Chỉ prompt video', 'Chỉ negative prompt'].map((sc) => (
          <button
            key={sc}
            onClick={() => setScope(sc)}
            className={`chip ${scope === sc ? 'border-brand-400/60 bg-brand-500/20 text-white' : 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-slate-200'}`}
          >
            {sc}
          </button>
        ))}
        <div className="mx-auto" />
        <button
          className="btn-soft py-1.5 text-[12px]"
          onClick={async () => {
            await copyText(scope === 'Toàn bộ workflow' ? text : JSON.stringify(scopedResult(result, scope), null, 2))
            toast('Đã copy prompt pack', 'success')
          }}
        >
          <Icon name="Copy" size={13} /> Copy
        </button>
      </div>
      <pre className="mono min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-[11.5px] leading-relaxed text-slate-300">
        {scope === 'Toàn bộ workflow' ? text : JSON.stringify(scopedResult(result, scope), null, 2)}
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ LOGS */

function LogsTab({ logs }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [logs.length])

  const color = { info: 'text-slate-400', success: 'text-emerald-300', warn: 'text-amber-300', error: 'text-red-300' }
  const icon = { info: 'Info', success: 'CircleCheckBig', warn: 'TriangleAlert', error: 'CircleX' }

  if (!logs.length) return <EmptyState icon="Terminal" title="Chưa có log" description="Log xử lý từng node sẽ hiển thị tại đây khi bạn chạy workflow." />

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-1.5">
        <span className="field-label">{logs.length} dòng log</span>
        <button className="btn-ghost py-1 text-[11.5px]" onClick={() => useWorkflowStore.getState().clearLogs()}>
          <Icon name="Eraser" size={12} /> Xoá log
        </button>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2">
        {logs.map((l, i) => (
          <div key={i} className="mono flex items-start gap-2 py-[3px] text-[11.5px] leading-relaxed">
            <span className="shrink-0 text-slate-600">{new Date(l.time).toLocaleTimeString('vi-VN', { hour12: false })}</span>
            <Icon name={icon[l.level] || 'Info'} size={12} className={`mt-0.5 shrink-0 ${color[l.level] || 'text-slate-400'}`} />
            <span className={color[l.level] || 'text-slate-300'}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- ISSUES */

function IssuesTab({ issues, errorCount, warnCount }) {
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const validate = useWorkflowStore((s) => s.validate)
  if (!issues.length)
    return (
      <EmptyState
        icon="ShieldCheck"
        title="Chưa kiểm tra hoặc workflow hợp lệ"
        description="Bấm Validate để kiểm tra node thiếu input, node chưa nối dây, thiếu cấu hình hoặc vòng lặp."
        action={
          <button className="btn-primary mt-1" onClick={() => validate()}>
            <Icon name="ShieldCheck" size={14} /> Kiểm tra workflow
          </button>
        }
      />
    )
  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="chip border-red-400/30 bg-red-500/10 text-red-300">{errorCount} lỗi</span>
        <span className="chip border-amber-400/30 bg-amber-500/10 text-amber-300">{warnCount} cảnh báo</span>
        <button className="btn-ghost py-1 text-[11.5px]" onClick={() => validate()}>
          <Icon name="RefreshCw" size={12} /> Kiểm tra lại
        </button>
      </div>
      <div className="space-y-1.5">
        {issues.map((i, idx) => (
          <button
            key={idx}
            onClick={() => i.nodeId && selectNode(i.nodeId)}
            className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
              i.level === 'error' ? 'border-red-500/25 bg-red-500/[0.07] hover:bg-red-500/[0.12]' : 'border-amber-500/25 bg-amber-500/[0.06] hover:bg-amber-500/[0.11]'
            }`}
          >
            <Icon name={i.level === 'error' ? 'CircleX' : 'TriangleAlert'} size={14} className={`mt-0.5 ${i.level === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
            <span className="flex-1 text-[12.5px] text-slate-200">{i.message}</span>
            {i.nodeId && <span className="mono text-[10px] text-slate-500">{i.nodeId}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ JSON */

function JsonTab({ result }) {
  const toast = useWorkflowStore((s) => s.toast)
  const workflow = useWorkflowStore((s) => s.exportWorkflowJson)
  const [view, setView] = useState('result')
  const data = view === 'result' ? result : workflow()
  if (view === 'result' && !result) return <EmptyState icon="Braces" title="Chưa có JSON kết quả" description="Chạy workflow để sinh dữ liệu JSON đầy đủ." />
  const text = JSON.stringify(data, null, 2)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2">
        {[
          { id: 'result', label: 'JSON kết quả' },
          { id: 'workflow', label: 'JSON workflow' },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`chip ${view === v.id ? 'border-brand-400/60 bg-brand-500/20 text-white' : 'border-white/[0.07] bg-white/[0.03] text-slate-400'}`}
          >
            {v.label}
          </button>
        ))}
        <div className="mx-auto" />
        <button
          className="btn-soft py-1.5 text-[12px]"
          onClick={async () => {
            await copyText(text)
            toast('Đã copy JSON', 'success')
          }}
        >
          <Icon name="Copy" size={13} /> Copy JSON
        </button>
        <button className="btn-soft py-1.5 text-[12px]" onClick={() => download(view === 'result' ? 'result.json' : 'workflow.json', text, 'application/json')}>
          <Icon name="Download" size={13} /> Tải file
        </button>
      </div>
      <pre className="mono min-h-0 flex-1 overflow-auto px-4 py-3 text-[11px] leading-relaxed text-slate-400">{text}</pre>
    </div>
  )
}
