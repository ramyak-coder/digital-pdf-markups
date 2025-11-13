import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import Tesseract from "tesseract.js";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export default function PdfTextScanner({ pdfUrl, onCanvasRendered, mode }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [textResult, setTextResult] = useState("");

  // 📄 Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      const loadingTask = getDocument(pdfUrl);
      const loadedPdf = await loadingTask.promise;
      setPdf(loadedPdf);
      const firstPage = await loadedPdf.getPage(1);
      setPage(firstPage);
    };
    loadPdf();
  }, [pdfUrl]);

  // 🖼️ Render PDF Page to Canvas
  useEffect(() => {
    if (!page || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const renderPdf = async () => {
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = viewport.width * outputScale;
      canvas.height = viewport.height * outputScale;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const transform = [outputScale, 0, 0, outputScale, 0, 0];
      const renderContext = { canvasContext: context, transform, viewport };

      await page.render(renderContext).promise;
      console.log("✅ PDF rendered at correct scale");

      if (onCanvasRendered) {
        onCanvasRendered({ width: viewport.width, height: viewport.height });
      }
    };

    renderPdf();
  }, [page]);

  // 🖱️ Mouse event handlers
  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    setIsDragging(true);
    setSelection({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: 0,
      height: 0,
    });
    console.log("text scan MoveDown", textResult);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selection) return;
    const rect = e.target.getBoundingClientRect();
    const width = e.clientX - rect.left - selection.x;
    const height = e.clientY - rect.top - selection.y;
    setSelection({ ...selection, width, height });
    console.log("text scan Move", textResult);
  };

  const handleMouseUp = async () => {
    setIsDragging(false);
    if (
      selection &&
      Math.abs(selection.width) > 5 &&
      Math.abs(selection.height) > 5
    ) {
      setTextResult("Extracting text...");
      const text = await extractTextFromSelection(selection);
      setTextResult(text || "(no text found)");
      console.log("text move up", textResult);
    }
  };

  // 🔍 Extract text from region
  const extractTextFromSelection = async (selectionCss) => {
    if (!page || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    // Convert CSS pixels → PDF coordinate space
    const x1 = selectionCss.x;
    const y1 = selectionCss.y;
    const x2 = selectionCss.x + selectionCss.width;
    const y2 = selectionCss.y + selectionCss.height;

    const pdfY1 = viewport.height - y1;
    const pdfY2 = viewport.height - y2;

    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    const yMin = Math.min(pdfY1, pdfY2);
    const yMax = Math.max(pdfY1, pdfY2);

    // 1️⃣ Try extracting from PDF text layer
    const itemsInBox = textContent.items.filter((item) => {
      const [tx, ty] = item.transform.slice(4, 6);
      const fontHeight = Math.abs(item.transform[5]);
      const itemY = ty - fontHeight;
      return tx >= xMin && tx <= xMax && itemY >= yMin && itemY <= yMax;
    });

    if (itemsInBox.length > 0) {
      return itemsInBox.map((i) => i.str).join(" ");
    }

    // 2️⃣ OCR fallback (Tesseract v5)
    try {
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.round(selectionCss.x * dpr);
      const sy = Math.round(selectionCss.y * dpr);
      const sw = Math.round(selectionCss.width * dpr);
      const sh = Math.round(selectionCss.height * dpr);

      const imageData = context.getImageData(sx, sy, sw, sh);
      const off = document.createElement("canvas");
      off.width = sw;
      off.height = sh;
      off.getContext("2d").putImageData(imageData, 0, 0);

      const dataUrl = off.toDataURL("image/png");
      const { data } = await Tesseract.recognize(dataUrl, "eng");
      return data.text.trim();
    } catch (err) {
      console.error("OCR failed:", err);
      return "(OCR error)";
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          cursor: "crosshair",
          display: "block",
        }}
        onMouseDown={mode === "scan" ? handleMouseDown : undefined}
        onMouseMove={mode === "scan" ? handleMouseMove : undefined}
        onMouseUp={mode === "scan" ? handleMouseUp : undefined}
      />
      {selection && (
        <div
          style={{
            position: "absolute",
            border: "2px dashed red",
            left: `${Math.min(selection.x, selection.x + selection.width)}px`,
            top: `${Math.min(selection.y, selection.y + selection.height)}px`,
            width: `${Math.abs(selection.width)}px`,
            height: `${Math.abs(selection.height)}px`,
            pointerEvents: "none",
          }}
        />
      )}
      {textResult && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: "#f8f8f8",
            borderRadius: 6,
            fontFamily: "monospace",
            width: "100%",
            wordWrap: "break-word",
          }}
        >
          <strong>Extracted Text:</strong>
          <br />
          {textResult}
        </div>
      )}
    </div>
  );
}
