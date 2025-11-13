import React, { useRef, useState } from "react";
import PdfTextScanner from "./PdfTextScanner";
import SvgOverlay from "./SvgOverlay";

export default function PdfMarkupTool({ pdfUrl }) {
  const containerRef = useRef(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState("scan");

  // callback from PdfTextScanner to tell us its canvas size
  const handleCanvasRendered = (size) => setViewSize(size);

  return (
    <div>
      <div style={{ marginTop: 10 }}>
        <button onClick={() => setMode("scan")}>Scan Text</button>
        <button onClick={() => setMode("markup")}>Draw Markup</button>
      </div>

      <div
        ref={containerRef}
        style={{ position: "relative", display: "inline-block" }}
      >
        <PdfTextScanner
          pdfUrl={pdfUrl}
          onCanvasRendered={handleCanvasRendered}
          mode={mode}
        />
        <SvgOverlay
          width={viewSize.width}
          height={viewSize.height}
          mode={mode}
        />
      </div>
    </div>
  );
}
