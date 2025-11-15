// PdfCanvas.jsx
import React, {
  useRef,
  useImperativeHandle,
  useEffect,
  useState,
  forwardRef,
} from "react";
import * as pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";

// Correct worker for pdfjs v5.x
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const PdfCanvas = forwardRef(
  ({ pdfUrl, mode, onScanRegionSelected, onViewport }, ref) => {
    const canvasRef = useRef(null);
    const [page, setPage] = useState(null);
    const [viewport, setViewport] = useState(null);

    const [dragging, setDragging] = useState(false);
    const [start, setStart] = useState(null);
    const [rect, setRect] = useState(null);

    // Load PDF once per URL
    useEffect(() => {
      let mounted = true;

      (async () => {
        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        const pg = await pdf.getPage(1);

        if (!mounted) return;

        const vp = pg.getViewport({ scale: 1 });
        setPage(pg);
        setViewport(vp);

        if (onViewport) onViewport(vp); // notify wrapper once
      })();

      return () => {
        mounted = false;
      };
    }, [pdfUrl]);

    // Render PDF page only when page + viewport ready
    useEffect(() => {
      if (!page || !viewport) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      let aborted = false;

      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        if (aborted) return;
      });

      return () => {
        aborted = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    }, [page, viewport]);

    // Expose scan API to wrapper
    useImperativeHandle(ref, () => ({
      scanRegion: async (region) => {
        if (!canvasRef.current) return null;
        const text = await extractOcr(
          canvasRef.current,
          normalizeRegion(region)
        );
        return text;
      },
    }));

    // Correct OCR cropping
    const extractOcr = async (canvas, region) => {
      const temp = document.createElement("canvas");
      temp.width = region.w;
      temp.height = region.h;

      const tctx = temp.getContext("2d");

      tctx.drawImage(
        canvas,
        region.x,
        region.y,
        region.w,
        region.h,
        0,
        0,
        region.w,
        region.h
      );

      const result = await Tesseract.recognize(temp, "eng");
      return result.data.text;
    };

    // Normalize negative drag direction
    const normalizeRegion = (r) => ({
      x: r.w < 0 ? r.x + r.w : r.x,
      y: r.h < 0 ? r.y + r.h : r.y,
      w: Math.abs(r.w),
      h: Math.abs(r.h),
    });

    // Canvas mouse handlers
    const onDown = (e) => {
      if (mode !== "scan") return;

      const bounds = canvasRef.current.getBoundingClientRect();
      setStart({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      setDragging(true);
    };

    const onMove = (e) => {
      if (!dragging || mode !== "scan") return;

      const bounds = canvasRef.current.getBoundingClientRect();
      setRect({
        x: start.x,
        y: start.y,
        w: e.clientX - bounds.left - start.x,
        h: e.clientY - bounds.top - start.y,
      });
    };

    const onUp = async () => {
      if (!dragging) return;
      setDragging(false);

      if (rect) {
        const r = normalizeRegion(rect);
        const text = await extractOcr(canvasRef.current, r);
        onScanRegionSelected?.({ rect: r, text });
      }
    };

    return (
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{
            pointerEvents: mode === "scan" ? "auto" : "none",
            cursor: mode === "scan" ? "crosshair" : "default",
          }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
        />

        {rect && mode === "scan" && (
          <div
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              border: "2px dashed red",
              background: "rgba(255,0,0,0.15)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    );
  }
);

export default PdfCanvas;
