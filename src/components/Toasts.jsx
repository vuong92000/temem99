import React from 'react'
import { Icon } from './ui.jsx'
import { useWorkflowStore } from '../store/useWorkflowStore.js'

const STYLES = {
  success: { icon: 'CircleCheckBig', border: 'border-emerald-400/35', bg: 'from-emerald-500/18', text: 'text-emerald-300' },
  error: { icon: 'CircleX', border: 'border-red-400/35', bg: 'from-red-500/18', text: 'text-red-300' },
  warning: { icon: 'TriangleAlert', border: 'border-amber-400/35', bg: 'from-amber-500/18', text: 'text-amber-300' },
  info: { icon: 'Info', border: 'border-brand-400/35', bg: 'from-brand-500/18', text: 'text-brand-300' },
}

export default function Toasts() {
  const toasts = useWorkflowStore((s) => s.toasts)
  const dismiss = useWorkflowStore((s) => s.dismissToast)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[500] flex w-[330px] flex-col gap-2">
      {toasts.map((t) => {
        const st = STYLES[t.type] || STYLES.info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-slide-left items-start gap-2.5 rounded-xl border ${st.border} bg-gradient-to-r ${st.bg} to-ink-900/95 px-3.5 py-2.5 shadow-panel backdrop-blur-xl`}
          >
            <Icon name={st.icon} size={16} className={`mt-0.5 shrink-0 ${st.text}`} />
            <p className="flex-1 text-[12.5px] leading-snug text-slate-100">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="mt-0.5 text-slate-500 transition-colors hover:text-white">
              <Icon name="X" size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
