import { create } from 'zustand'

const useStore = create((set) => ({
  pdfUrl: null,
  setPdfUrl: (url) => set({ pdfUrl: "./pdf/sample.pdf" }),
  page: 1,
  scale: 1,
  translate: { x: 0, y: 0 },
  setTransform: (t) => set({ translate: t }),
  setScale: (s) => set({ scale: s }),
  annotations: [], // array of {id,type,props}
  addAnnotation: (a) => set((s) => ({ annotations: [...s.annotations, a] })),
  updateAnnotation: (id, props) => set((s)=> ({ annotations: s.annotations.map(a=> a.id===id ? {...a, props: {...a.props, ...props}} : a) })),
  clearAnnotations: () => set({ annotations: [] })
}))
export default useStore
