import React, { memo, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { useWorkflowStore } from '../../store/useWorkflowStore.js'

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, markerEnd, data, source, target }) {
  const [hover, setHover] = useState(false)
  const running = useWorkflowStore((s) => s.running)
  const animatedEdges = useWorkflowStore((s) => s.settings.animatedEdges)
  const status = useWorkflowStore((s) => s.nodes.find((n) => n.id === source)?.data?.status)
  const targetStatus = useWorkflowStore((s) => s.nodes.find((n) => n.id === target)?.data?.status)
  const deleteEdges = useWorkflowStore((s) => s.deleteEdges)

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.42,
  })

  const active = animatedEdges && running && (status === 'success' || status === 'running') && ['running', 'idle', 'ready'].includes(targetStatus)
  const done = status === 'success' && targetStatus === 'success'
  const stroke = selected ? '#a98fff' : done ? 'url(#edge-gradient-done)' : hover ? '#7c5cff' : 'url(#edge-gradient)'

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={26}
        style={{
          stroke,
          strokeWidth: selected || hover ? 3 : 2,
          opacity: selected || hover || done ? 1 : 0.75,
          filter: selected ? 'drop-shadow(0 0 6px rgba(169,143,255,0.85))' : done ? 'drop-shadow(0 0 4px rgba(74,222,128,0.4))' : 'none',
          transition: 'stroke-width 120ms ease, opacity 120ms ease',
        }}
        className={active ? 'flow-edge-animated' : ''}
      />
      {/* vùng bắt chuột rộng hơn để dễ hover/xoá */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: 'pointer' }}
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          className={`nodrag nopan absolute transition-opacity duration-150 ${hover || selected ? 'opacity-100' : 'opacity-0'}`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <button
            onClick={() => deleteEdges([id])}
            title="Xoá dây nối"
            className="grid h-5 w-5 place-items-center rounded-full border border-red-400/40 bg-ink-900 text-red-300 shadow-lg transition-transform hover:scale-125 hover:bg-red-500/25"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(FlowEdge)
