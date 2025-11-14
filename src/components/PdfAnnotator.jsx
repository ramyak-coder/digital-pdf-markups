// PdfAnnotator.jsx
import React, { useRef, useState } from "react";
import PdfCanvas from "./PdfCanvas";
import SvgOverlay from "./SvgOverlay";

export default function PdfAnnotator({ pdfUrl }) {
  const [mode, setMode] = useState("scan");
  const [tool, setTool] = useState("rect");
  const [objects, setObjects] = useState([]);
  const [viewport, setViewport] = useState(null);
  const [info, setInfo] = useState("");
  const canvasApiRef = useRef(null);

  const handleScanRegionSelected = ({ rect, text }) => {
    setInfo(text || "(no text)");
  };

  const scanRegionProgrammatic = async (regionCss) => {
    if (!canvasApiRef.current?.scanRegion) {
      setInfo("(scan API not ready)");
      return null;
    }
    setInfo("Scanning...");
    const text = await canvasApiRef.current.scanRegion(regionCss);
    setInfo(text || "(no text)");
    return text;
  };

  const handleRequestScanCallout = async (calloutObj) => {
    const region = {
      x: calloutObj.point.x - 40,
      y: calloutObj.point.y - 18,
      width: 140,
      height: 36,
    };
    const text = await scanRegionProgrammatic(region);
    if (text != null) {
      setObjects((prev) =>
        prev.map((o) => (o.id === calloutObj.id ? { ...o, text } : o))
      );
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setMode("scan")}
          style={{ background: mode === "scan" ? "#ddd" : "" }}
        >
          Scan
        </button>
        <button
          onClick={() => setMode("markup")}
          style={{ background: mode === "markup" ? "#ddd" : "" }}
        >
          Markup
        </button>

        {mode === "markup" && (
          <div>
            <button
              onClick={() => setTool("pen")}
              style={{ background: tool === "pen" ? "#ddd" : "" }}
            >
              Pen
            </button>
            <button
              onClick={() => setTool("rect")}
              style={{ background: tool === "rect" ? "#ddd" : "" }}
            >
              Rect
            </button>
            <button
              onClick={() => setTool("text")}
              style={{ background: tool === "text" ? "#ddd" : "" }}
            >
              Text
            </button>
            <button
              onClick={() => setTool("callout")}
              style={{ background: tool === "callout" ? "#ddd" : "" }}
            >
              Callout
            </button>
            <button
              onClick={() => setTool("eraser")}
              style={{ background: tool === "eraser" ? "#ddd" : "" }}
            >
              Eraser
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          width: "fit-content",
          display: "inline-block",
          border: "1px solid #ccc",
        }}
      >
        <PdfCanvas
          ref={canvasApiRef}
          pdfUrl={pdfUrl}
          mode={mode}
          onScanRegionSelected={handleScanRegionSelected}
          onViewport={(vp) => setViewport(vp)} // <-- REQUIRED
        />

        {viewport && mode === "markup" && (
          <SvgOverlay
            width={viewport.width}
            height={viewport.height}
            mode={mode}
            tool={tool}
            objects={objects}
            onChangeObjects={setObjects}
            onRequestScanCallout={handleRequestScanCallout}
          />
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Scan / Info:</strong>
        <pre style={{ background: "#fafafa", padding: 8 }}>{info}</pre>
      </div>
    </div>
  );
}
