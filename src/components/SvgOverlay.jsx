import React, { useRef, useEffect, useState } from 'react'
import useStore from '../store/annotations'
const uuidv4 = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 10);

import { exportPdfWithAnnotations } from '../utils/exporter' // we'll show exporter below

export default function SvgOverlay(){
  const svgRef = useRef(null)
  const { annotations, addAnnotation, scale, translate, setScale, setTransform } = useStore()
  const [tool, setTool] = useState('select') // 'rect', 'pen', 'text'
  const [isDrawing, setIsDrawing] = useState(false)
  const [current, setCurrent] = useState(null)

  // simple pan/zoom handlers (wheel to zoom; middle mouse drag to pan)
  useEffect(()=> {
    const svg = svgRef.current
    if (!svg) return
    let isPanning = false
    let start = null

    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.2, Math.min(5, scale * delta))
      setScale(newScale)
    }

    const onPointerDown = (e) => {
      if (e.button === 1) { // middle button for pan
        isPanning = true
        start = { x: e.clientX, y: e.clientY }
        (e.target).setPointerCapture(e.pointerId)
      }
    }
    const onPointerMove = (e) => {
      if (!isPanning) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      start = { x: e.clientX, y: e.clientY }
      setTransform({ x: translate.x + dx, y: translate.y + dy })
    }
    const onPointerUp = (e) => {
      if (isPanning) {
        isPanning = false
        try { e.target.releasePointerCapture(e.pointerId) } catch {}
      }
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [scale, translate, setScale, setTransform])

  // convert screen coords to document coords (account for scale & translate)
  const screenToDoc = (clientX, clientY) => {
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const x = (clientX - rect.left - translate.x) / scale
    const y = (clientY - rect.top - translate.y) / scale
    return { x, y }
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return // left only
    if (tool === 'rect') {
      const p = screenToDoc(e.clientX, e.clientY)
      const id = uuidv4()
      const annot = { id, type: 'rect', props: { x: p.x, y: p.y, w: 0, h: 0, stroke: '#ff0' } }
      addAnnotation(annot)
      setCurrent({ id, start: p })
      setIsDrawing(true)
    } else if (tool === 'pen') {
      const p = screenToDoc(e.clientX, e.clientY)
      const id = uuidv4()
      const path = `M ${p.x} ${p.y}`
      const annot = { id, type: 'pen', props: { d: path, stroke: '#0f0', strokeWidth: 2, fill: 'none' } }
      addAnnotation(annot)
      setCurrent({ id })
      setIsDrawing(true)
    }
  }

  const onPointerMove = (e) => {
    if (!isDrawing || !current) return
    const p = screenToDoc(e.clientX, e.clientY)
    if (current.start) {
      // rectangle resizing
      const { id, start } = current
      const w = p.x - start.x
      const h = p.y - start.y
      // update annotation
      // (updateAnnotation not included in this file — we will update store via addAnnotation hack above for brevity)
      // For simplicity, mutate last annotation (better to use updateAnnotation in store)
      useStore.setState(state => ({
        annotations: state.annotations.map(a => a.id === id ? { ...a, props: { ...a.props, w, h } } : a)
      }))
    } else {
      // pen: append path
      const { id } = current
      useStore.setState(state => ({
        annotations: state.annotations.map(a => a.id === id ? { ...a, props: { ...a.props, d: a.props.d + ` L ${p.x} ${p.y}` } } : a)
      }))
    }
  }

  const onPointerUp = (e) => {
    if (!isDrawing) return
    setIsDrawing(false)
    setCurrent(null)
  }

  return (
    <svg
      ref={svgRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position:'absolute',
        left:0,
        top:0,
        width:'auto',
        height:'auto',
        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        transformOrigin: '0 0',
        touchAction: 'none',
        pointerEvents:'auto'
      }}
      // set viewBox later if you prefer fixed coordinate system
    >
      <g>
        {annotations.map(a => {
          if (a.type === 'rect') {
            const { x, y, w=0, h=0, stroke='#ff0' } = a.props
            return <rect key={a.id} x={x} y={y} width={w} height={h} stroke={stroke} fill="transparent" strokeWidth={2} />
          } else if (a.type === 'pen') {
            return <path key={a.id} d={a.props.d} stroke={a.props.stroke} fill="none" strokeWidth={a.props.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          } else {
            return null
          }
        })}
      </g>
    </svg>
  )
}
