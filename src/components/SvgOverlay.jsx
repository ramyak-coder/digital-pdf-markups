import React, { useState } from "react";

export default function SvgOverlay({ width, height, mode }) {
  const [shapes, setShapes] = useState([]);
  const [current, setCurrent] = useState(null);

  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrent({ x, y, width: 0, height: 0 });
    console.log("mouseDown");
  };

  const handleMouseMove = (e) => {
    if (!current) return;
    const rect = e.target.getBoundingClientRect();
    const width = e.clientX - rect.left - current.x;
    const height = e.clientY - rect.top - current.y;
    setCurrent({ ...current, width, height });
    console.log("mouseMove");
  };

  const handleMouseUp = () => {
    if (
      current &&
      Math.abs(current.width) > 5 &&
      Math.abs(current.height) > 5
    ) {
      setShapes([...shapes, current]);
    }
    setCurrent(null);
    console.log("mouseUp");
  };

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: mode === "markup" ? "auto" : "none",
        cursor: "crosshair",
      }}
      onMouseDown={mode === "markup" ? handleMouseDown : undefined}
      onMouseMove={mode === "markup" ? handleMouseMove : undefined}
      onMouseUp={mode === "markup" ? handleMouseUp : undefined}
    >
      {shapes.map((r, i) => (
        <rect
          key={i}
          x={Math.min(r.x, r.x + r.width)}
          y={Math.min(r.y, r.y + r.height)}
          width={Math.abs(r.width)}
          height={Math.abs(r.height)}
          fill="rgba(255, 0, 0, 0.2)"
          stroke="red"
          strokeWidth="2"
        />
      ))}
      {current && (
        <rect
          x={Math.min(current.x, current.x + current.width)}
          y={Math.min(current.y, current.y + current.height)}
          width={Math.abs(current.width)}
          height={Math.abs(current.height)}
          fill="rgba(0, 0, 255, 0.15)"
          stroke="blue"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
