import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, ArrowRight, Type, Square, Undo, Save, X, Minus, Plus } from "lucide-react";

type Point = { x: number; y: number };

type PenStroke = { type: "pen"; points: Point[]; color: string; width: number };
type ArrowAnnot = { type: "arrow"; from: Point; to: Point; color: string; width: number };
type TextAnnot = { type: "text"; x: number; y: number; text: string; color: string; fontSize: number };
type RectAnnot = { type: "rect"; x: number; y: number; w: number; h: number; color: string; width: number };
type Annotation = PenStroke | ArrowAnnot | TextAnnot | RectAnnot;

type Tool = "pen" | "arrow" | "text" | "rect";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ffffff",
  "#111827",
];

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  width: number
) {
  const headLen = Math.max(width * 4, 14);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  ctx.save();
  if (ann.type === "pen") {
    if (ann.points.length < 2) { ctx.restore(); return; }
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y);
    }
    ctx.stroke();
  } else if (ann.type === "arrow") {
    drawArrow(ctx, ann.from, ann.to, ann.color, ann.width);
  } else if (ann.type === "text") {
    ctx.font = `bold ${ann.fontSize}px sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = ann.color;
    ctx.fillText(ann.text, ann.x, ann.y);
  } else if (ann.type === "rect") {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.width;
    ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = ann.color;
    ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
  }
  ctx.restore();
}

export interface PhotoAnnotationEditorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (annotatedUrl: string) => void;
}

export function PhotoAnnotationEditor({
  imageUrl,
  open,
  onClose,
  onSave,
}: PhotoAnnotationEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentAnnotRef = useRef<Annotation | null>(null);
  const startPointRef = useRef<Point | null>(null);

  const [textMode, setTextMode] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  const redrawCanvas = useCallback(
    (annots: Annotation[], liveAnn?: Annotation | null) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const a of annots) drawAnnotation(ctx, a);
      if (liveAnn) drawAnnotation(ctx, liveAnn);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    setAnnotations([]);
    setTextMode(null);
    setTextInput("");
    setImageLoaded(false);

    const tryLoad = (withCors: boolean) => {
      const img = new Image();
      if (withCors) img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
        const maxW = Math.min(window.innerWidth * 0.88, 1200);
        const maxH = Math.min(window.innerHeight * 0.72, 900);
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const w = Math.floor(img.naturalWidth * scale);
        const h = Math.floor(img.naturalHeight * scale);
        setCanvasSize({ w, h });
        setImageLoaded(true);
      };
      img.onerror = () => {
        if (withCors) tryLoad(false);
      };
      img.src = imageUrl;
    };

    tryLoad(true);
  }, [imageUrl, open]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas(annotations);
    }
  }, [imageLoaded, annotations, redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "text") {
      const pt = getCanvasPoint(e);
      setTextMode(pt);
      setTextInput("");
      setTimeout(() => textInputRef.current?.focus(), 30);
      return;
    }
    const pt = getCanvasPoint(e);
    setIsDrawing(true);
    startPointRef.current = pt;

    if (tool === "pen") {
      currentAnnotRef.current = { type: "pen", points: [pt], color, width: strokeWidth };
    } else if (tool === "arrow") {
      currentAnnotRef.current = { type: "arrow", from: pt, to: pt, color, width: strokeWidth };
    } else if (tool === "rect") {
      currentAnnotRef.current = { type: "rect", x: pt.x, y: pt.y, w: 0, h: 0, color, width: strokeWidth };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotRef.current) return;
    const pt = getCanvasPoint(e);
    const ann = currentAnnotRef.current;

    if (ann.type === "pen") {
      ann.points.push(pt);
    } else if (ann.type === "arrow") {
      ann.to = pt;
    } else if (ann.type === "rect") {
      const s = startPointRef.current!;
      ann.x = Math.min(s.x, pt.x);
      ann.y = Math.min(s.y, pt.y);
      ann.w = Math.abs(pt.x - s.x);
      ann.h = Math.abs(pt.y - s.y);
    }

    redrawCanvas(annotations, currentAnnotRef.current);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotRef.current) return;
    setIsDrawing(false);
    const ann = currentAnnotRef.current;

    const isSignificant =
      (ann.type === "pen" && ann.points.length > 2) ||
      (ann.type === "arrow" &&
        (Math.abs(ann.to.x - ann.from.x) > 5 || Math.abs(ann.to.y - ann.from.y) > 5)) ||
      (ann.type === "rect" && Math.abs(ann.w) > 5 && Math.abs(ann.h) > 5);

    if (isSignificant) {
      setAnnotations((prev) => [...prev, { ...ann } as Annotation]);
    }

    currentAnnotRef.current = null;
    startPointRef.current = null;
  };

  const handleTextSubmit = () => {
    if (!textMode || !textInput.trim()) {
      setTextMode(null);
      return;
    }
    const fontSize = Math.max(strokeWidth * 6, 18);
    const ann: TextAnnot = {
      type: "text",
      x: textMode.x,
      y: textMode.y,
      text: textInput.trim(),
      color,
      fontSize,
    };
    setAnnotations((prev) => [...prev, ann]);
    setTextMode(null);
    setTextInput("");
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    setIsSaving(true);
    try {
      const exportCanvas = document.createElement("canvas");
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      exportCanvas.width = nw;
      exportCanvas.height = nh;
      const ctx = exportCanvas.getContext("2d")!;

      ctx.drawImage(img, 0, 0, nw, nh);

      const scaleX = nw / canvas.width;
      const scaleY = nh / canvas.height;
      ctx.scale(scaleX, scaleY);

      for (const ann of annotations) {
        drawAnnotation(ctx, ann);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
          "image/jpeg",
          0.92
        );
      });

      const formData = new FormData();
      formData.append("files", blob, "annotated.jpg");
      formData.append("directory", ".private/task-attachments");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const annotatedUrl = uploadData.urls?.[0];
      if (!annotatedUrl) throw new Error("No URL returned from server");

      onSave(annotatedUrl);
      onClose();
      toast({ title: "Annotated photo saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "pen", label: "Freehand draw", icon: <Pencil className="w-4 h-4" /> },
    { id: "arrow", label: "Arrow", icon: <ArrowRight className="w-4 h-4" /> },
    { id: "text", label: "Text label", icon: <Type className="w-4 h-4" /> },
    { id: "rect", label: "Rectangle highlight", icon: <Square className="w-4 h-4" /> },
  ];

  const hintText: Record<Tool, string> = {
    pen: "Freehand — click and drag to draw",
    arrow: "Arrow — drag to set direction and length",
    text: "Text — click where you want to place text, then type and press Enter",
    rect: "Rectangle — drag to highlight an area",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[96vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Annotate Photo</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50 flex-wrap flex-shrink-0">
          <div className="flex gap-1">
            {tools.map(({ id, label, icon }) => (
              <Button
                key={id}
                variant={tool === id ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                title={label}
                onClick={() => setTool(id)}
              >
                {icon}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-300" />

          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  background: c,
                  border: color === c ? "3px solid #3b82f6" : "2px solid #cbd5e1",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-slate-300" />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setStrokeWidth((w) => Math.max(1, w - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs w-5 text-center font-mono">{strokeWidth}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setStrokeWidth((w) => Math.min(20, w + 1))}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-300" />

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleUndo}
            disabled={annotations.length === 0}
          >
            <Undo className="w-4 h-4 mr-1" /> Undo
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm" className="h-8" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleSave}
            disabled={isSaving || annotations.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Saving…" : "Save Annotation"}
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-800 flex items-center justify-center p-4 min-h-0">
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="block max-w-full max-h-full"
              style={{ cursor: tool === "text" ? "text" : "crosshair" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {textMode && (
              <input
                ref={textInputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextSubmit();
                  if (e.key === "Escape") setTextMode(null);
                }}
                onBlur={handleTextSubmit}
                placeholder="Type and press Enter…"
                style={{
                  position: "absolute",
                  left: `${(textMode.x / canvasSize.w) * 100}%`,
                  top: `${(textMode.y / canvasSize.h) * 100}%`,
                  transform: "translate(0, -100%)",
                  background: "rgba(0,0,0,0.75)",
                  color,
                  border: `2px solid ${color}`,
                  padding: "3px 8px",
                  fontSize: "14px",
                  outline: "none",
                  borderRadius: "4px",
                  minWidth: "120px",
                  fontWeight: "bold",
                }}
              />
            )}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-700 text-slate-400 text-sm rounded">
                Loading image…
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500 flex-shrink-0">
          {hintText[tool]}
          {annotations.length > 0 && (
            <span className="ml-3 text-slate-400">
              {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
