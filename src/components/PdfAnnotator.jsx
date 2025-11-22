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
      <div className="wrapper">
        {/* side panel */}
        <div className="side-panel">
          <div>
            <strong>Page Title:</strong>
            <div className="page-title">{info}</div>
          </div>

          <div className="actions-bar">
              <button
                onClick={() => setMode("scan")}
                style={{ background: mode === "scan" ? "#ac4fd3" : "" }}
              >
                Scan
              </button>
              <button
                onClick={() => setMode("markup")}
                style={{ background: mode === "markup" ? "#ac4fd3" : "" }}
              >
                Markup
              </button>

              {mode === "markup" && (
                <div>
                  <button
                    onClick={() => setTool("pen")}
                    style={{ background: tool === "pen" ? "#ac4fd3" : "" }}
                  >
                    Pen
                  </button>
                  <button
                    onClick={() => setTool("rect")}
                    style={{ background: tool === "rect" ? "#ac4fd3" : "" }}
                  >
                    Rect
                  </button>
                  <button
                    onClick={() => setTool("callout")}
                    style={{ background: tool === "callout" ? "#ac4fd3" : "" }}
                  >
                    Callout
                  </button>
                  <button
                    onClick={() => setTool("eraser")}
                    style={{ background: tool === "eraser" ? "#ac4fd3" : "" }}
                  >
                    Eraser
                  </button>
                </div>
              )}
            </div>
        </div>

        {/* / side panel */}

        {/* pdf container */}
          <div className="pdf-container">
            

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
          </div>
        {/* / pdf container */}

      </div>
      

      
    </div>
  );
}
