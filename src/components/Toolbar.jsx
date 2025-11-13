import React from 'react'
import useStore from '../store/annotations'
import { exportPdfWithAnnotations } from '../utils/exporter' // shown below

export default function Toolbar(){
  const { annotations, pdfUrl } = useStore()

  const onExport = async () => {
    if (!pdfUrl) return alert('No PDF loaded')
    try {
      await exportPdfWithAnnotations(pdfUrl, annotations)
      alert('Exported (download should start).')
    } catch (err) {
      console.error(err)
      alert('Export failed: ' + err.message)
    }
  }

  return (
    <div style={{display:'flex', gap:8, padding:8, background:'#111', color:'#fff'}}>
      <button onClick={() => useStore.setState({ tool: 'select' })}>Select</button>
      <button onClick={() => useStore.setState({ tool: 'rect' })}>Rect</button>
      <button onClick={() => useStore.setState({ tool: 'pen' })}>Pen</button>
      <div style={{flex:1}} />
      <button onClick={onExport}>Export PDF with Annotations</button>
    </div>
  )
}
