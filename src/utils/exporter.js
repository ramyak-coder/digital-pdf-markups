import { PDFDocument, rgb } from 'pdf-lib'

/**
 * Convert an SVG string to a PNG data URL by drawing it on a canvas.
 * Returns { dataUrl, width, height }
 */
export async function svgToPngDataUrl(svgString, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height })
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG to image failed'))
    }
    img.src = url
  })
}

/**
 * exports a new PDF with the flattened annotations (single-page example).
 * - pdfUrl: source PDF URL (CORS must allow fetching)
 * - annotationsSvg: an SVG string containing the annotations (coordinate system must match page)
 */
export async function exportPdfWithAnnotations(pdfUrl, annotations) {
  // For this starter: find the SVG on the page (the overlay element)
  const svg = document.querySelector('svg')
  if (!svg) throw new Error('SVG overlay not found')

  // Serialize SVG
  const svgString = new XMLSerializer().serializeToString(svg)
  const bbox = svg.getBBox()
  const width = Math.ceil(svg.clientWidth || bbox.width || 1000)
  const height = Math.ceil(svg.clientHeight || bbox.height || 1000)

  // Convert to PNG
  const { dataUrl } = await svgToPngDataUrl(svgString, width, height)
  const pngBytes = await (await fetch(dataUrl)).arrayBuffer()

  // Fetch original PDF
  const existingPdfBytes = await (await fetch(pdfUrl)).arrayBuffer()

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pngImage = await pdfDoc.embedPng(pngBytes)
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width: pdfW, height: pdfH } = firstPage.getSize()

  // resize image to page size (you may want to preserve aspect / DPI mapping)
  firstPage.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pdfW,
    height: pdfH,
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'annotated.pdf'
  link.click()
  URL.revokeObjectURL(link.href)
}
