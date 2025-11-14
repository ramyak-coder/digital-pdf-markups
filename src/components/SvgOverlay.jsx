// SvgOverlay.jsx
import React from "react";

export default function SvgOverlay({
  width,
  height,
  mode,
  tool,
  objects = [],
  onChangeObjects,
  onRequestScanCallout,
}) {
  const svgRef = React.useRef(null);
  const drawingRef = React.useRef(null);

  //--------------------------------------
  // Utility: convert mouse to SVG coords
  //--------------------------------------
  const getSvgPoint = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  //--------------------------------------
  // Safe state updates
  //--------------------------------------
  const appendObject = (obj) => {
    onChangeObjects((prev) => {
      if (prev.some((o) => o.id === obj.id)) return prev; // avoid duplicates
      return [...prev, obj];
    });
  };

  const updateObject = (updated) => {
    onChangeObjects((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
  };

  //--------------------------------------
  // Mouse Handlers
  //--------------------------------------
  const handleMouseDown = (e) => {
    if (mode !== "markup") return;

    const p = getSvgPoint(e);

    // Clear stale
    drawingRef.current = null;

    if (tool === "pen") {
      const id = crypto.randomUUID();
      const obj = { id, type: "pen", points: [{ x: p.x, y: p.y }] };
      drawingRef.current = obj;
      appendObject(obj);
      return;
    }

    if (tool === "rect") {
      const id = crypto.randomUUID();
      const obj = { id, type: "rect", x: p.x, y: p.y, w: 0, h: 0 };
      drawingRef.current = obj;
      appendObject(obj);
      return;
    }

    if (tool === "callout") {
      // Prevent duplicate callouts on clicking inside an existing one
      const clickedInside = objects.some((o) => {
        if (o.type !== "callout") return false;

        // Bubble (foreignObject) hit test
        const bx = o.boxX;
        const by = o.boxY;
        const bw = 180;
        const bh = 60;
        const insideBox =
          p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh;

        // Dot / anchor hit test
        const dx = p.x - o.point.x;
        const dy = p.y - o.point.y;
        const insideDot = Math.sqrt(dx * dx + dy * dy) < 12;

        return insideBox || insideDot;
      });

      if (clickedInside) {
        return; // <-- prevents duplication
      }

      // Create a new callout only when clicking on empty space
      appendObject({
        id: crypto.randomUUID(),
        type: "callout",
        point: { x: p.x, y: p.y },
        boxX: p.x + 40,
        boxY: p.y - 30,
        text: "",
      });
      return;
    }

    if (tool === "eraser") {
      onChangeObjects((prev) =>
        prev.filter((o) => {
          if (o.type === "rect") {
            const rx = Math.min(o.x, o.x + o.w);
            const ry = Math.min(o.y, o.y + o.h);
            const rw = Math.abs(o.w);
            const rh = Math.abs(o.h);
            return !(
              p.x >= rx &&
              p.x <= rx + rw &&
              p.y >= ry &&
              p.y <= ry + rh
            );
          }
          if (o.type === "callout") {
            const dx = p.x - o.point.x;
            const dy = p.y - o.point.y;
            return Math.sqrt(dx * dx + dy * dy) > 10;
          }
          return true;
        })
      );
    }
  };

  const handleMouseMove = (e) => {
    if (mode !== "markup") return;

    const obj = drawingRef.current;
    if (!obj) return;

    const p = getSvgPoint(e);

    if (obj.type === "pen") {
      const updated = {
        ...obj,
        points: [...obj.points, { x: p.x, y: p.y }],
      };
      drawingRef.current = updated;
      updateObject(updated);
      return;
    }

    if (obj.type === "rect") {
      const updated = {
        ...obj,
        w: p.x - obj.x,
        h: p.y - obj.y,
      };
      drawingRef.current = updated;
      updateObject(updated);
      return;
    }
  };

  const handleMouseUp = () => {
    drawingRef.current = null;
  };

  //--------------------------------------
  // Render helpers
  //--------------------------------------
  const renderObject = (o) => {
    if (o.type === "pen") {
      const pts = o.points.map((p) => `${p.x},${p.y}`).join(" ");
      return (
        <polyline
          key={o.id}
          points={pts}
          stroke="red"
          strokeWidth={2}
          fill="none"
        />
      );
    }

    if (o.type === "rect") {
      const x = Math.min(o.x, o.x + o.w);
      const y = Math.min(o.y, o.y + o.h);
      return (
        <rect
          key={o.id}
          x={x}
          y={y}
          width={Math.abs(o.w)}
          height={Math.abs(o.h)}
          stroke="blue"
          strokeWidth={2}
          fill="rgba(0,0,255,0.1)"
        />
      );
    }

    if (o.type === "callout") {
      return (
        <g key={o.id}>
          <line
            x1={o.point.x}
            y1={o.point.y}
            x2={o.boxX}
            y2={o.boxY}
            stroke="red"
            strokeWidth={2}
          />
          <foreignObject x={o.boxX} y={o.boxY} width={180} height={60}>
            <div style={{ display: "flex", gap: 6 }}>
              <textarea
                value={o.text}
                onChange={(ev) => {
                  const val = ev.target.value;
                  onChangeObjects((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, text: val } : p))
                  );
                }}
                style={{
                  width: "130px",
                  height: "56px",
                  fontSize: 14,
                  background: "rgba(255,255,255,0.95)",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRequestScanCallout?.(o);
                  }}
                >
                  🔎
                </button> */}
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onChangeObjects((prev) =>
                      prev.filter((p) => p.id !== o.id)
                    );
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          </foreignObject>
        </g>
      );
    }

    return null;
  };

  //--------------------------------------
  // FINAL SVG
  //--------------------------------------
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: mode === "markup" ? "auto" : "none",
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {objects.map((o) => renderObject(o))}
    </svg>
  );
}
