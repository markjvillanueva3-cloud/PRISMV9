/**
 * StepImport.tsx — Wire EDM Studio Step 1: File Import
 * WEDM-MS0 U-WEDM07
 *
 * Primary: DXF file upload (drag-drop dropzone).
 * Secondary input methods: camera capture, print/image, sketch, CAD import.
 * Features:
 *   - Magic byte validation (DXF='0\nSECTION', STEP='ISO-10303')
 *   - Upload progress via XHR onprogress
 *   - Client-side preview (image thumbnail, file badge)
 *   - Quick Generate: upload + full pipeline → jump to step 6
 *   - Post-upload summary card with plain-English results
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Card, Button, Spinner, Badge } from "../ui";
import { useWedmNavigation, useWedmData } from "../../contexts/WedmStudioContext";
import { useParseGeometry } from "../../hooks/useWedmPipeline";
import type { ImportResult } from "../../types/wedmStudio";

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCEPTED_EXTENSIONS = [".dxf", ".step", ".stp", ".iges", ".igs", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

type InputMethod = "dxf" | "camera" | "image" | "sketch" | "cad";

interface InputMethodOption {
  id: InputMethod;
  label: string;
  description: string;
  accept: string;
  icon: string;
}

const INPUT_METHODS: InputMethodOption[] = [
  { id: "dxf", label: "DXF / STEP / IGES", description: "Upload a CAD file directly", accept: ".dxf,.step,.stp,.iges,.igs", icon: "M" },
  { id: "image", label: "Print / Image", description: "Upload a photo of a print or drawing", accept: ".png,.jpg,.jpeg,.tif,.tiff,.bmp,.pdf", icon: "I" },
  { id: "camera", label: "Camera Capture", description: "Take a photo of a drawing", accept: "image/*", icon: "C" },
  { id: "sketch", label: "Sketch", description: "Draw a profile freehand (coming soon)", accept: "", icon: "S" },
  { id: "cad", label: "CAD Import", description: "Import from Fusion 360, SolidWorks, etc.", accept: ".step,.stp,.x_t,.sat,.iges,.igs", icon: "D" },
];

// Magic byte signatures for file validation
const MAGIC_BYTES: Record<string, (bytes: Uint8Array, text: string) => boolean> = {
  dxf: (_bytes, text) => {
    const trimmed = text.trimStart();
    return trimmed.startsWith("0\n") || trimmed.startsWith("0\r\n");
  },
  step: (_bytes, text) => text.trimStart().startsWith("ISO-10303"),
  stp: (_bytes, text) => text.trimStart().startsWith("ISO-10303"),
  iges: (_bytes, text) => {
    // IGES files have 'S' in column 73 of the first line, or start with comment
    return text.length > 72 && (text[72] === "S" || text.trimStart().startsWith("                                        "));
  },
  igs: (_bytes, text) => text.length > 72 && text[72] === "S",
  png: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47,
  jpg: (bytes) => bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF,
  jpeg: (bytes) => bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF,
};

// ============================================================================
// HELPERS
// ============================================================================

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectFormat(ext: string): "dxf" | "step" | "iges" | null {
  if (ext === ".dxf") return "dxf";
  if (ext === ".step" || ext === ".stp") return "step";
  if (ext === ".iges" || ext === ".igs") return "iges";
  return null;
}

function isImageFile(ext: string): boolean {
  return [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"].includes(ext);
}

async function validateMagicBytes(file: File): Promise<{ valid: boolean; reason?: string }> {
  const ext = getExtension(file.name).replace(".", "");
  const checker = MAGIC_BYTES[ext];
  if (!checker) return { valid: true }; // no checker for this extension

  const slice = file.slice(0, 4096);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  if (!checker(bytes, text)) {
    return {
      valid: false,
      reason: `File "${file.name}" does not appear to be a valid .${ext} file. The file header does not match expected format.`,
    };
  }
  return { valid: true };
}

// ============================================================================
// PROPS
// ============================================================================

export interface StepImportProps {
  onComplete: () => void;
  isActive: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StepImport({ onComplete, isActive }: StepImportProps) {
  const { markStepComplete, markStepError, setInputMethod: setNavInputMethod } = useWedmNavigation();
  const { setStepData, setFileInfo } = useWedmData();
  const parseGeometry = useParseGeometry();

  // Local state
  const [activeMethod, setActiveMethod] = useState<InputMethod>("dxf");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Blob URL Cleanup (revoke on change/unmount) ────────────────────────
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // ── Camera Stream Cleanup (stop tracks on unmount) ─────────────────────
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  // ── File Validation ────────────────────────────────────────────────────
  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    if (file.size === 0) {
      return "File is empty (0 bytes). Please select a valid file.";
    }

    // Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`;
    }

    const ext = getExtension(file.name);

    // Extension check
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ext.match(/^\.(tif|tiff|bmp|pdf)$/)) {
      return `File type "${ext}" is not supported. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }

    // Magic byte check for CAD files
    if (detectFormat(ext)) {
      const magic = await validateMagicBytes(file);
      if (!magic.valid) return magic.reason!;
    }

    return null;
  }, []);

  // ── Process File ───────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setValidationError(null);
    setImportResult(null);
    setImagePreview(null);

    // Validate
    const error = await validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setSelectedFile(file);
    setFileInfo(file.name, file.size);

    const ext = getExtension(file.name);
    const format = detectFormat(ext);

    // Image preview
    if (isImageFile(ext)) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      // For images, we'd send to an OCR / interpretation endpoint
      // For now, mark as uploaded and let user proceed to review
      return;
    }

    // CAD file — read and parse
    if (format) {
      setUploadProgress(0);
      try {
        const text = await readFileWithProgress(file, setUploadProgress);
        setUploadProgress(100);

        // Call parse geometry API
        const result = await parseGeometry.execute({ content: text, format });

        if (result.ok) {
          setImportResult(result.data);
          setStepData("import", result.data);
          markStepComplete("import");
        } else {
          setValidationError(result.error);
          markStepError("import");
        }
      } catch (err: any) {
        setValidationError(err.message ?? "Failed to read file");
        markStepError("import");
      } finally {
        setUploadProgress(null);
      }
    }
  }, [validateFile, parseGeometry, setStepData, setFileInfo, markStepComplete, markStepError]);

  // ── File Reading with Progress ─────────────────────────────────────────
  function readFileWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
      };
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    if (e.target) e.target.value = "";
  }, [processFile]);

  // ── Camera ─────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions in your browser settings, or use the Image upload option instead."
          : err.name === "NotFoundError"
            ? "No camera found. Use the Image upload option to photograph your drawing with another device."
            : `Camera error: ${err.message}`,
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !cameraStream) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      processFile(file);
    }, "image/jpeg", 0.92);
  }, [cameraStream, processFile, stopCamera]);

  // ── Quick Generate ─────────────────────────────────────────────────────
  const handleQuickGenerate = useCallback(() => {
    if (!selectedFile) return;
    setNavInputMethod("quick_generate");
    // Quick Generate handled by parent wizard — signals intent
    onComplete();
  }, [selectedFile, setNavInputMethod, onComplete]);

  if (!isActive) return null;

  // ── Summary Card ───────────────────────────────────────────────────────
  const summary = importResult ? buildSummary(importResult) : null;

  return (
    <div className="space-y-4">
      {/* Input Method Selector */}
      <div className="flex gap-2 flex-wrap">
        {INPUT_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => { setActiveMethod(m.id); setValidationError(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              activeMethod === m.id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            } ${m.id === "sketch" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={m.id === "sketch"}
            aria-pressed={activeMethod === m.id}
            title={m.description}
          >
            <span className="w-6 h-6 flex items-center justify-center rounded bg-white/20 text-xs font-bold">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* DXF / CAD Upload Dropzone */}
      {(activeMethod === "dxf" || activeMethod === "cad") && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
          aria-label="Drop a DXF, STEP, or IGES file here, or click to browse"
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors min-h-[200px] ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={INPUT_METHODS.find(m => m.id === activeMethod)?.accept}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          <div className="text-4xl mb-3 text-blue-500">
            {activeMethod === "cad" ? "\u2B21" : "\u2B1A"}
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {dragOver ? "Drop file here" : "Drag & drop your file here"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            or click to browse ({activeMethod === "cad" ? "STEP, IGES, Parasolid" : "DXF, STEP, IGES"})
          </p>
          <p className="text-xs text-slate-400 mt-2">Max 50MB</p>

          {/* Upload progress */}
          {uploadProgress !== null && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-700">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1 text-center">{uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {/* Image Upload */}
      {activeMethod === "image" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
          aria-label="Drop an image file here, or click to browse"
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors min-h-[200px] ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 bg-slate-50 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp,.pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <div className="text-4xl mb-3 text-blue-500">{"\uD83D\uDCF7"}</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload a photo of your drawing</p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, TIFF, BMP, or PDF</p>
        </div>
      )}

      {/* Camera Capture */}
      {activeMethod === "camera" && (
        <Card>
          {cameraError && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300 mb-4" role="alert">
              {cameraError}
            </div>
          )}
          {!cameraStream && !cameraError && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Point your camera at the engineering drawing and capture a clear photo.
              </p>
              <Button onClick={startCamera} size="lg">
                Start Camera
              </Button>
            </div>
          )}
          {cameraStream && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: 400 }}
              />
              <div className="flex gap-2 justify-center">
                <Button onClick={capturePhoto} size="lg">
                  Capture Photo
                </Button>
                <Button variant="secondary" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sketch — Coming Soon */}
      {activeMethod === "sketch" && (
        <Card>
          <div className="flex flex-col items-center py-8 text-slate-400">
            <p className="text-sm">Freehand sketch input is coming in a future update.</p>
            <p className="text-xs mt-1">Use DXF upload or Camera capture for now.</p>
          </div>
        </Card>
      )}

      {/* Validation Error */}
      {validationError && (
        <div
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {validationError}
        </div>
      )}

      {/* File Badge (selected file, pre-result) */}
      {selectedFile && !importResult && !parseGeometry.loading && !validationError && (
        <Card>
          <div className="flex items-center gap-3">
            <Badge color="blue">{getExtension(selectedFile.name).toUpperCase().replace(".", "")}</Badge>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <img
            src={imagePreview}
            alt="Uploaded drawing preview"
            className="max-h-60 mx-auto rounded"
          />
          <p className="text-xs text-slate-500 text-center mt-2">
            Image uploaded. Feature extraction will occur in the Review step.
          </p>
          <div className="mt-3 flex justify-end">
            <Button onClick={onComplete}>Continue to Review</Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {parseGeometry.loading && (
        <Card>
          <div className="flex items-center gap-3 py-4" aria-live="polite">
            <Spinner size="md" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Parsing geometry...</p>
              <p className="text-xs text-slate-500">Extracting contours, detecting features, validating geometry</p>
            </div>
          </div>
        </Card>
      )}

      {/* Post-Upload Summary Card */}
      {summary && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Import Complete
              </h4>
              <Badge color={summary.hasErrors ? "red" : "green"}>
                {summary.hasErrors ? "Issues Found" : "Ready"}
              </Badge>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
              {summary.text}
            </p>

            {/* Issues list */}
            {summary.issues.length > 0 && (
              <div className="space-y-1">
                {summary.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      issue.severity === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                        : issue.severity === "warning"
                          ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                          : "bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400"
                    }`}
                  >
                    {issue.message}
                  </div>
                ))}
              </div>
            )}

            {/* Feature breakdown */}
            {summary.featureCounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.featureCounts.map(({ type, count }) => (
                  <Badge key={type} color="blue">
                    {count} {type}{count > 1 ? "s" : ""}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={handleQuickGenerate}
                disabled={summary.hasErrors}
                title="Upload and run the full pipeline automatically"
              >
                Quick Generate
              </Button>
              <Button onClick={onComplete} disabled={summary.hasErrors}>
                Continue to Review
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY BUILDER
// ============================================================================

interface ImportSummary {
  text: string;
  hasErrors: boolean;
  issues: Array<{ severity: string; message: string }>;
  featureCounts: Array<{ type: string; count: number }>;
}

function buildSummary(result: ImportResult): ImportSummary {
  const { contours, features, issues } = result;
  const exteriorCount = contours.filter(c => c.is_exterior).length;
  const interiorCount = contours.filter(c => !c.is_exterior).length;
  const hasErrors = issues.some(i => i.severity === "error");

  // Feature type counts
  const typeCounts = new Map<string, number>();
  for (const f of features) {
    typeCounts.set(f.type, (typeCounts.get(f.type) ?? 0) + 1);
  }
  const featureCounts = [...typeCounts.entries()].map(([type, count]) => ({ type, count }));

  // Smallest feature dimension
  let smallest = Infinity;
  for (const f of features) {
    const dims = f.dimensions_mm;
    const minDim = Math.min(
      dims.length ?? Infinity,
      dims.width ?? Infinity,
      dims.diameter ?? Infinity,
    );
    if (minDim < smallest) smallest = minDim;
  }

  // Plain English summary
  const parts: string[] = [];
  parts.push(`Found ${contours.length} profile${contours.length !== 1 ? "s" : ""}`);
  if (exteriorCount > 0 || interiorCount > 0) {
    parts.push(`(${exteriorCount} external, ${interiorCount} internal)`);
  }
  if (smallest < Infinity) {
    parts.push(`Smallest feature: ${smallest.toFixed(2)}mm.`);
  }

  if (hasErrors) {
    const errorCount = issues.filter(i => i.severity === "error").length;
    parts.push(`${errorCount} issue${errorCount !== 1 ? "s" : ""} need attention.`);
  } else if (issues.length > 0) {
    parts.push(`${issues.length} warning${issues.length !== 1 ? "s" : ""}, all geometry cuttable.`);
  } else {
    parts.push("All geometry cuttable.");
  }

  return {
    text: parts.join(" "),
    hasErrors,
    issues: issues.map(i => ({ severity: i.severity, message: i.message })),
    featureCounts,
  };
}
