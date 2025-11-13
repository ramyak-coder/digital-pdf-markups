import React from 'react'
import PdfCanvas from './components/PdfCanvas'
import SvgOverlay from './components/SvgOverlay'
import Toolbar from './components/Toolbar'
import useStore from './store/annotations'

export default function App(){
  const { pdfUrl, setPdfUrl } = useStore()

  // Example: set a default PDF URL (you can change it to a local file upload later)
  React.useEffect(()=> {
    setPdfUrl('/sample.pdf') // put sample.pdf in public root or change to a remote URL
  }, [])

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column'}}>
      <Toolbar />
      <div style={{flex:1, position:'relative', background:'#333', display:'flex', justifyContent:'center', alignItems:'center'}}>
        <PdfCanvas />
        <SvgOverlay />
      </div>
    </div>
  )
}
