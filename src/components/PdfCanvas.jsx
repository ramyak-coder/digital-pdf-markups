import React, { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import useStore from "../store/annotations";

// configure worker (if using CDN you can point to worker)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs`;
// (version may vary — if offline, bundle the worker locally)

export default function PdfCanvas() {
  const canvasRef = useRef(null);
  const { pdfUrl, page, scale, translate } = useStore();
  const pdfRef = useRef(null);

  useEffect(() => {
    if (!pdfUrl) return;
    let canceled = false;
    (async () => {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      pdfRef.current = await loadingTask.promise;
      if (canceled) return;
      const pdf = pdfRef.current;
      const p = await pdf.getPage(page);
      const viewport = p.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // set canvas size to viewport
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // clear and render
      context.clearRect(0, 0, canvas.width, canvas.height);
      const renderContext = {
        canvasContext: context,
        viewport,
      };
      await p.render(renderContext).promise;
    })();

    return () => {
      canceled = true;
    };
  }, [pdfUrl, page, scale]);

  // The canvas is absolutely positioned; transforms (translate & scale) applied by overlay sync.
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        transformOrigin: "0 0",
        touchAction: "none",
        userSelect: "none",
        willChange: "transform",
      }}
    />
  );
}
