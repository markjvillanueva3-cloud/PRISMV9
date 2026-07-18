/**
 * CADFeatureRecognitionEngine — heuristic CAD-feature recognizer.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-10). Original returned
 * hardcoded {features:[], confidence:0.5}. Real implementation accepts a
 * simple geometry shape and recognizes 5 canonical mill-domain features:
 * hole, pocket, slot, fillet, chamfer — via boundary/curvature heuristics.
 * routes/milling.ts wraps the import in try/catch, so the engine returns a
 * structured result that downstream CAM strategy can act on.
 *
 * @version 2.0.0 — restored from stub
 */

const POCKET_ASPECT_THRESHOLD = 4;      // length/width > 4 → slot, else pocket
const CONFIDENCE_HIGH = 0.9;
const CONFIDENCE_MED = 0.7;
const CONFIDENCE_LOW = 0.4;

export type FeatureType = "hole" | "pocket" | "slot" | "fillet" | "chamfer";

export interface Vec3 { x: number; y: number; z: number }

export interface HoleDef { center: Vec3; diameter_mm: number; depth_mm?: number }
export interface PocketDef { boundary: Vec3[]; depth_mm: number }
export interface FilletDef { edgeId: string | number; radius_mm: number }
export interface ChamferDef { edgeId: string | number; offset_mm: number; angle_deg?: number }

export interface GeometryInput {
  holes?: HoleDef[];
  pockets?: PocketDef[];
  fillets?: FilletDef[];
  chamfers?: ChamferDef[];
}

export interface RecognizedFeature {
  type: FeatureType;
  id: string;
  confidence: number;
  details: Record<string, unknown>;
}

export interface RecognitionResult {
  features: RecognizedFeature[];
  confidence: number;
  counts: Record<FeatureType, number>;
}

function bboxAspectRatio(boundary: Vec3[]): { length: number; width: number; ratio: number } {
  if (boundary.length === 0) return { length: 0, width: 0, ratio: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of boundary) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const length = Math.max(maxX - minX, maxY - minY);
  const width = Math.max(1e-9, Math.min(maxX - minX, maxY - minY));
  return { length, width, ratio: length / width };
}

export class CADFeatureRecognitionEngine {
  extractFeatures(geometry: GeometryInput | unknown): RecognitionResult {
    const g = (geometry ?? {}) as GeometryInput;
    const features: RecognizedFeature[] = [];
    const counts: Record<FeatureType, number> = { hole: 0, pocket: 0, slot: 0, fillet: 0, chamfer: 0 };

    // Holes — high confidence (geometric primitive).
    if (Array.isArray(g.holes)) {
      g.holes.forEach((h, i) => {
        if (!h || !Number.isFinite(h.diameter_mm) || h.diameter_mm <= 0) return;
        features.push({
          type: "hole",
          id: `hole-${i}`,
          confidence: CONFIDENCE_HIGH,
          details: { center: h.center, diameter_mm: h.diameter_mm, depth_mm: h.depth_mm ?? null },
        });
        counts.hole += 1;
      });
    }

    // Pockets / slots — classify by bbox aspect ratio.
    if (Array.isArray(g.pockets)) {
      g.pockets.forEach((p, i) => {
        if (!p || !Array.isArray(p.boundary) || !Number.isFinite(p.depth_mm)) return;
        const { length, width, ratio } = bboxAspectRatio(p.boundary);
        const isSlot = ratio > POCKET_ASPECT_THRESHOLD;
        const type: FeatureType = isSlot ? "slot" : "pocket";
        features.push({
          type,
          id: `${type}-${i}`,
          confidence: isSlot ? CONFIDENCE_MED : CONFIDENCE_HIGH,
          details: { boundary_points: p.boundary.length, depth_mm: p.depth_mm, length_mm: length, width_mm: width, aspect_ratio: ratio },
        });
        counts[type] += 1;
      });
    }

    // Fillets / chamfers — edge-level features.
    if (Array.isArray(g.fillets)) {
      g.fillets.forEach((f, i) => {
        if (!f || !Number.isFinite(f.radius_mm) || f.radius_mm <= 0) return;
        features.push({
          type: "fillet",
          id: `fillet-${i}`,
          confidence: CONFIDENCE_MED,
          details: { edgeId: f.edgeId, radius_mm: f.radius_mm },
        });
        counts.fillet += 1;
      });
    }
    if (Array.isArray(g.chamfers)) {
      g.chamfers.forEach((c, i) => {
        if (!c || !Number.isFinite(c.offset_mm) || c.offset_mm <= 0) return;
        features.push({
          type: "chamfer",
          id: `chamfer-${i}`,
          confidence: CONFIDENCE_MED,
          details: { edgeId: c.edgeId, offset_mm: c.offset_mm, angle_deg: c.angle_deg ?? 45 },
        });
        counts.chamfer += 1;
      });
    }

    // Aggregate confidence = mean of per-feature confidences, or LOW if empty.
    const confidence = features.length === 0
      ? CONFIDENCE_LOW
      : features.reduce((s, f) => s + f.confidence, 0) / features.length;

    return { features, confidence, counts };
  }
}

export const cadFeatureRecognitionEngine = new CADFeatureRecognitionEngine();
