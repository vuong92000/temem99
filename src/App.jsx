import React, { useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Canvas from './components/Canvas.jsx'
import PropertiesPanel from './components/PropertiesPanel.jsx'
import BottomPanel from './components/BottomPanel.jsx'
import Toasts from './components/Toasts.jsx'
import { SettingsModal, TemplatesModal } from './components/Modals.jsx'
import { useWorkflowStore } from './store/useWorkflowStore.js'

export default function App() {
  const refreshStatuses = useWorkflowStore((s) => s.refreshStatuses)

  useEffect(() => {
    refreshStatuses()
  }, [refreshStatuses])

  return (
    <ReactFlowProvider>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-ink-950">
        {/* nền gradient trang trí */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/12 blur-[130px]" />
          <div className="absolute -right-40 top-1/3 h-[460px] w-[460px] rounded-full bg-aqua-500/10 blur-[130px]" />
          <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-ember-500/[0.07] blur-[130px]" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <Header />
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <main className="relative min-w-0 flex-1">
              <Canvas />
            </main>
            <PropertiesPanel />
          </div>
          <BottomPanel />
        </div>

        <Toasts />
        <SettingsModal />
        <TemplatesModal />
      </div>
    </ReactFlowProvider>
  )
}
