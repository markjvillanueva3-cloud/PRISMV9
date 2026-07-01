/**
 * StepIgesRoundTripDiff — CAD #1.7
 * Detects geometry/topology loss across CAD↔CAM file round-trips. Compares
 * pre-export and post-import vertex counts, face counts, volume, bounding box,
 * and named-feature integrity. Output severity scales with what was lost.
 *
 * Pure logic — no actual STEP/IGES parsing here (that lives in a separate
 * binary tool). Operates on already-extracted vertex/face/volume summaries.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface GeometrySummary {
  vertex_count: number;
  face_count: number;
  edge_count: number;
  volume_mm3: number;
  bbox_x_mm: number;
  bbox_y_mm: number;
  bbox_z_mm: number;
  /** Named features (holes/slots/pockets) preserved across round-trip. */
  named_features: string[];
}

export interface RoundTripDiffInput {
  before: GeometrySummary;
  after: GeometrySummary;
  /** Tolerance for volume/bbox drift, as fraction. Default 0.001 (0.1%). */
  geometry_tolerance_frac?: number;
}

export type Severity = "clean" | "warning" | "critical";

export interface RoundTripDiffResult {
  severity: Severity;
  vertex_delta: number;
  face_delta: number;
  edge_delta: number;
  volume_drift_frac: AtomicValue;
  bbox_drift_frac: AtomicValue;
  features_lost: string[];
  features_added: string[];
  notes: string[];
  source: string;
}

const TOLERANCE_DEFAULT_FRAC = 0.001;          // 0.1% drift = clean
const TOLERANCE_WARNING_FRAC = 0.01;            // 0.1-1% = warning
const TOLERANCE_MAX_FRAC = 0.50;
const COUNT_MAX = 10_000_000;

function av(value: number, unit: string, source: string, conf: number): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * 0.05, source, confidence: conf };
}
function emit(reason: string): RoundTripDiffResult {
  const z = av(0, "fraction", "invalid-input", 0);
  return {
    severity: "critical", vertex_delta: 0, face_delta: 0, edge_delta: 0,
    volume_drift_frac: z, bbox_drift_frac: z,
    features_lost: [], features_added: [], notes: [reason], source: "StepIgesRoundTripDiff v1.0.0",
  };
}

function validateSummary(s: GeometrySummary, name: string): string | null {
  if (!s) return `${name} summary missing`;
  for (const k of ["vertex_count", "face_count", "edge_count", "volume_mm3", "bbox_x_mm", "bbox_y_mm", "bbox_z_mm"] as const) {
    if (!Number.isFinite(s[k])) return `${name}.${k} not finite`;
    if (s[k] < 0) return `${name}.${k} cannot be negative`;
  }
  for (const k of ["vertex_count", "face_count", "edge_count"] as const) {
    if (s[k] > COUNT_MAX) return `${name}.${k} exceeds ${COUNT_MAX}`;
  }
  if (!Array.isArray(s.named_features)) return `${name}.named_features must be array`;
  return null;
}

export function diff(input: RoundTripDiffInput): RoundTripDiffResult {
  if (!input) return emit("missing input");
  const beforeErr = validateSummary(input.before, "before");
  if (beforeErr) return emit(beforeErr);
  const afterErr = validateSummary(input.after, "after");
  if (afterErr) return emit(afterErr);

  const tol = Number.isFinite(input.geometry_tolerance_frac)
    ? Math.max(0, Math.min(TOLERANCE_MAX_FRAC, input.geometry_tolerance_frac!))
    : TOLERANCE_DEFAULT_FRAC;

  const vertexDelta = input.after.vertex_count - input.before.vertex_count;
  const faceDelta = input.after.face_count - input.before.face_count;
  const edgeDelta = input.after.edge_count - input.before.edge_count;

  const volBase = Math.max(1e-9, Math.abs(input.before.volume_mm3));
  const volDriftFrac = Math.abs(input.after.volume_mm3 - input.before.volume_mm3) / volBase;

  // Bbox drift: max coordinate-wise relative drift
  const bboxBefore = Math.max(input.before.bbox_x_mm, input.before.bbox_y_mm, input.before.bbox_z_mm, 1e-9);
  const bboxDrifts = [
    Math.abs(input.after.bbox_x_mm - input.before.bbox_x_mm) / Math.max(1e-9, input.before.bbox_x_mm),
    Math.abs(input.after.bbox_y_mm - input.before.bbox_y_mm) / Math.max(1e-9, input.before.bbox_y_mm),
    Math.abs(input.after.bbox_z_mm - input.before.bbox_z_mm) / Math.max(1e-9, input.before.bbox_z_mm),
  ];
  const bboxDriftFrac = Math.max(...bboxDrifts);

  // Feature comparison
  const beforeSet = new Set(input.before.named_features);
  const afterSet = new Set(input.after.named_features);
  const featuresLost = [...beforeSet].filter(f => !afterSet.has(f));
  const featuresAdded = [...afterSet].filter(f => !beforeSet.has(f));

  // Severity rules
  let severity: Severity = "clean";
  const notes: string[] = [];
  if (featuresLost.length > 0) {
    severity = "critical";
    notes.push(`${featuresLost.length} named feature(s) LOST: ${featuresLost.slice(0, 5).join(", ")}${featuresLost.length > 5 ? ", ..." : ""}`);
  }
  if (volDriftFrac > TOLERANCE_WARNING_FRAC) {
    severity = "critical";
    notes.push(`volume drift ${(volDriftFrac * 100).toFixed(3)}% exceeds 1% — likely face/shell loss`);
  } else if (volDriftFrac > tol) {
    if (severity === "clean") severity = "warning";
    notes.push(`volume drift ${(volDriftFrac * 100).toFixed(3)}% within warning band`);
  }
  if (bboxDriftFrac > TOLERANCE_WARNING_FRAC) {
    severity = "critical";
    notes.push(`bbox drift ${(bboxDriftFrac * 100).toFixed(3)}% exceeds 1% — likely scale/unit mismatch`);
  } else if (bboxDriftFrac > tol) {
    if (severity === "clean") severity = "warning";
    notes.push(`bbox drift ${(bboxDriftFrac * 100).toFixed(3)}% within warning band`);
  }
  if (severity === "clean") notes.push(`clean round-trip — drifts within ${(tol * 100).toFixed(3)}% tolerance`);
  if (featuresAdded.length > 0) notes.push(`${featuresAdded.length} feature(s) added in round-trip (likely conversion artifact): ${featuresAdded.slice(0, 3).join(", ")}`);

  // Acknowledge bboxBefore as documentation hook (used inside loop above; kept here to silence unused-var lint).
  void bboxBefore;

  return {
    severity, vertex_delta: vertexDelta, face_delta: faceDelta, edge_delta: edgeDelta,
    volume_drift_frac: av(volDriftFrac, "fraction", "volume comparison", severity === "clean" ? 0.95 : 0.85),
    bbox_drift_frac: av(bboxDriftFrac, "fraction", "max-axis bbox comparison", severity === "clean" ? 0.95 : 0.85),
    features_lost: featuresLost, features_added: featuresAdded,
    notes, source: "StepIgesRoundTripDiff v1.0.0",
  };
}

export const StepIgesRoundTripDiff = { version: "1.0.0" as const, diff };
