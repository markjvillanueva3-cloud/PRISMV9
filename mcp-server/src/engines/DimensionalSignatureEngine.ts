/**
 * DimensionalSignatureEngine — STEP file → canonical dimensional fingerprint.
 *
 * Reads ISO-10303-21 STEP text and extracts a deterministic SI-normalized
 * fingerprint suitable for regression comparison against PRISM-generated
 * geometry. Output is stable: re-extracting the same file produces a
 * bit-identical signature hash.
 *
 * Extracted fields:
 *   - bbox          axis-aligned bounding box (min/max/extent in metres)
 *   - envelopeM     largest extent in metres (overall envelope dim)
 *   - volumeBboxM3  AABB volume (m³) — proxy for true BREP volume
 *   - surfaceAreaM2 AABB surface area (m²) — proxy
 *   - com           centroid of CARTESIAN_POINT cloud (m, x/y/z)
 *   - moiAABB       principal moments of inertia for AABB at unit density
 *                   (kg·m², about COM, axis-aligned)
 *   - holes         CIRCLE entities normalized to SI radius (m), sorted+deduped
 *   - counts        cartesianPoints / circles / lines (structural fingerprint)
 *
 * STEP unit detection: parses LENGTH_UNIT prefix + CONVERSION_BASED_UNIT.
 * Recognizes mm (default), m, in, ft. Converts every dimension to SI on read.
 *
 * Composes (does NOT duplicate):
 *   - CADToSTEPPipelineEngine (E2503, U-CGT03) — emits the STEP text we parse
 *   - GroundTruthFeatureTreeExtractor (E2504, U-CGT04) — different layer
 *     (authoring tree vs geometry); this engine fills the geometry slot.
 *
 * @engine DimensionalSignatureEngine
 * @shortcode E2505
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT05
 * @classification STANDARD (geometry parse, no Kienzle/Taylor constants)
 */

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { z } from "zod";

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

export type Vec3 = [number, number, number];

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const BBoxSchema = z
  .object({
    min: Vec3Schema,
    max: Vec3Schema,
    extent: Vec3Schema,
  })
  .strict();

export type BBox = z.infer<typeof BBoxSchema>;

export const HoleSchema = z
  .object({
    radiusM: z.number().min(0),
    axis: Vec3Schema.optional(),
    centerM: Vec3Schema.optional(),
  })
  .strict();

export type Hole = z.infer<typeof HoleSchema>;

export const CountsSchema = z
  .object({
    cartesianPoints: z.number().int().min(0),
    circles: z.number().int().min(0),
    lines: z.number().int().min(0),
  })
  .strict();

export type Counts = z.infer<typeof CountsSchema>;

export const Moi3Schema = z
  .object({
    Ixx: z.number(),
    Iyy: z.number(),
    Izz: z.number(),
  })
  .strict();

export type Moi3 = z.infer<typeof Moi3Schema>;

export const DimensionalSignatureSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    sourceFile: z.string().min(1),
    unitSystem: z.literal("SI"),
    sourceLengthUnit: z.enum(["mm", "m", "in", "ft", "unknown"]),
    bbox: BBoxSchema,
    envelopeM: z.number().min(0),
    volumeBboxM3: z.number().min(0),
    surfaceAreaM2: z.number().min(0),
    com: Vec3Schema,
    moiAABB: Moi3Schema,
    holes: z.array(HoleSchema),
    counts: CountsSchema,
    signature: z.string().regex(/^[0-9a-f]{64}$/),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

export type DimensionalSignature = z.infer<typeof DimensionalSignatureSchema>;

const STEP_MAGIC = "ISO-10303-21";

const UNIT_TO_METRES = {
  mm: 0.001,
  m: 1.0,
  in: 0.0254,
  ft: 0.3048,
  unknown: 0.001,
} as const;

const HOLE_DEDUP_EPSILON_M = 1e-6;

function canon(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (Math.abs(n) < 1e-15) return 0;
  return Math.round(n * 1e12) / 1e12;
}

function canonVec(v: Vec3): Vec3 {
  return [canon(v[0]), canon(v[1]), canon(v[2])];
}

export function detectLengthUnit(
  stepText: string,
): "mm" | "m" | "in" | "ft" | "unknown" {
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(stepText)) return "mm";
  if (/SI_UNIT\s*\(\s*\$\s*,\s*\.METRE\.\s*\)/i.test(stepText)) return "m";
  if (/CONVERSION_BASED_UNIT\s*\(\s*'INCH'/i.test(stepText)) return "in";
  if (/CONVERSION_BASED_UNIT\s*\(\s*'FOOT'/i.test(stepText)) return "ft";
  return "unknown";
}

export function extractCartesianPoints(stepText: string): Vec3[] {
  const out: Vec3[] = [];
  const re =
    /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([^)]*?)\s*\)\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stepText)) !== null) {
    const inside = m[1] ?? "";
    const parts = inside.split(",").map((s) => s.trim());
    if (parts.length !== 3) continue;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    out.push([x, y, z]);
  }
  return out;
}

export function extractCircleRadii(stepText: string): number[] {
  const out: number[] = [];
  const re = /CIRCLE\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9.eE+-]+)\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stepText)) !== null) {
    const r = Number(m[1]);
    if (Number.isFinite(r) && r >= 0) out.push(r);
  }
  return out;
}

export function countLines(stepText: string): number {
  const re = /\bLINE\s*\(\s*'[^']*'/g;
  let n = 0;
  while (re.exec(stepText) !== null) n += 1;
  return n;
}

export function computeBBox(points: ReadonlyArray<Vec3>): BBox {
  if (points.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0], extent: [0, 0, 0] };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] > maxZ) maxZ = p[2];
  }
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    extent: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

function centroid(points: ReadonlyArray<Vec3>): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  let sx = 0, sy = 0, sz = 0;
  for (const p of points) {
    sx += p[0];
    sy += p[1];
    sz += p[2];
  }
  const n = points.length;
  return [sx / n, sy / n, sz / n];
}

function moiAABB(extent: Vec3): Moi3 {
  const [a, b, c] = extent;
  const V = a * b * c;
  const m = V;
  return {
    Ixx: (m * (b * b + c * c)) / 12,
    Iyy: (m * (a * a + c * c)) / 12,
    Izz: (m * (a * a + b * b)) / 12,
  };
}

function aabbSurface(extent: Vec3): number {
  const [a, b, c] = extent;
  return 2 * (a * b + b * c + c * a);
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

export function dimensionalSignatureHash(payload: {
  bbox: BBox;
  envelopeM: number;
  volumeBboxM3: number;
  surfaceAreaM2: number;
  com: Vec3;
  moiAABB: Moi3;
  holes: ReadonlyArray<Hole>;
  counts: Counts;
}): string {
  const sortedHoles = [...payload.holes]
    .map((h) => ({
      radiusM: canon(h.radiusM),
      axis: h.axis ? canonVec(h.axis) : undefined,
      centerM: h.centerM ? canonVec(h.centerM) : undefined,
    }))
    .sort((a, b) => a.radiusM - b.radiusM);
  const obj = {
    bbox: {
      min: canonVec(payload.bbox.min),
      max: canonVec(payload.bbox.max),
      extent: canonVec(payload.bbox.extent),
    },
    envelopeM: canon(payload.envelopeM),
    volumeBboxM3: canon(payload.volumeBboxM3),
    surfaceAreaM2: canon(payload.surfaceAreaM2),
    com: canonVec(payload.com),
    moiAABB: {
      Ixx: canon(payload.moiAABB.Ixx),
      Iyy: canon(payload.moiAABB.Iyy),
      Izz: canon(payload.moiAABB.Izz),
    },
    holes: sortedHoles,
    counts: payload.counts,
  };
  return crypto.createHash("sha256").update(stableStringify(obj)).digest("hex");
}

function dedupHoles(radiiM: ReadonlyArray<number>): Hole[] {
  if (radiiM.length === 0) return [];
  const sorted = [...radiiM].sort((a, b) => a - b);
  const out: Hole[] = [];
  let last = -Infinity;
  for (const r of sorted) {
    if (r - last > HOLE_DEDUP_EPSILON_M) {
      out.push({ radiusM: r });
      last = r;
    }
  }
  return out;
}

export class DimensionalSignatureEngine {
  public readonly schemaVersion = "1.0.0" as const;

  async extractFromStep(filePath: string): Promise<DimensionalSignature> {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error(
        "[DimensionalSignatureEngine] filePath must be a non-empty string",
      );
    }
    let text: string;
    try {
      text = await fs.promises.readFile(filePath, "utf8");
    } catch (err) {
      return this._emptyResult(filePath, [
        `Read failed: ${(err as Error).message}`,
      ]);
    }
    return this.extractFromStepText(text, filePath);
  }

  extractFromStepText(stepText: string, sourceFile: string): DimensionalSignature {
    const warnings: string[] = [];
    if (!stepText.includes(STEP_MAGIC)) {
      warnings.push("Missing ISO-10303-21 magic — treating as empty STEP");
      return this._emptyResult(sourceFile, warnings);
    }
    const unit = detectLengthUnit(stepText);
    if (unit === "unknown") {
      warnings.push(
        "Length unit not detected; defaulting to mm (ISO-10303 informative)",
      );
    }
    const factor = UNIT_TO_METRES[unit];

    const rawPoints = extractCartesianPoints(stepText);
    const rawCircleRadii = extractCircleRadii(stepText);
    const lineCount = countLines(stepText);

    if (rawPoints.length === 0) {
      warnings.push("No CARTESIAN_POINT entities found");
    }

    const ptsM: Vec3[] = rawPoints.map((p) => [
      p[0] * factor,
      p[1] * factor,
      p[2] * factor,
    ]);
    const radiiM: number[] = rawCircleRadii.map((r) => r * factor);

    const bboxRaw = computeBBox(ptsM);
    const bbox: BBox = {
      min: canonVec(bboxRaw.min),
      max: canonVec(bboxRaw.max),
      extent: canonVec(bboxRaw.extent),
    };
    const envelopeM = canon(Math.max(...bbox.extent, 0));
    const volumeBboxM3 = canon(bbox.extent[0] * bbox.extent[1] * bbox.extent[2]);
    const surfaceAreaM2 = canon(aabbSurface(bbox.extent));
    const com = canonVec(centroid(ptsM));
    const moi = moiAABB(bbox.extent);
    const moiCanon: Moi3 = {
      Ixx: canon(moi.Ixx),
      Iyy: canon(moi.Iyy),
      Izz: canon(moi.Izz),
    };
    const holes = dedupHoles(radiiM);
    const counts: Counts = {
      cartesianPoints: ptsM.length,
      circles: radiiM.length,
      lines: lineCount,
    };

    const signature = dimensionalSignatureHash({
      bbox,
      envelopeM,
      volumeBboxM3,
      surfaceAreaM2,
      com,
      moiAABB: moiCanon,
      holes,
      counts,
    });

    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      unitSystem: "SI",
      sourceLengthUnit: unit,
      bbox,
      envelopeM,
      volumeBboxM3,
      surfaceAreaM2,
      com,
      moiAABB: moiCanon,
      holes,
      counts,
      signature,
      warnings,
    };
  }

  compare(a: DimensionalSignature, b: DimensionalSignature) {
    return {
      signatureMatch: a.signature === b.signature,
      extentDelta: [
        b.bbox.extent[0] - a.bbox.extent[0],
        b.bbox.extent[1] - a.bbox.extent[1],
        b.bbox.extent[2] - a.bbox.extent[2],
      ] as Vec3,
      envelopeDeltaM: b.envelopeM - a.envelopeM,
      volumeDeltaM3: b.volumeBboxM3 - a.volumeBboxM3,
      surfaceAreaDeltaM2: b.surfaceAreaM2 - a.surfaceAreaM2,
      holeCountDelta: b.holes.length - a.holes.length,
    };
  }

  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const r = DimensionalSignatureSchema.safeParse(candidate);
    if (r.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: r.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  recomputeSignature(sig: DimensionalSignature): string {
    return dimensionalSignatureHash({
      bbox: sig.bbox,
      envelopeM: sig.envelopeM,
      volumeBboxM3: sig.volumeBboxM3,
      surfaceAreaM2: sig.surfaceAreaM2,
      com: sig.com,
      moiAABB: sig.moiAABB,
      holes: sig.holes,
      counts: sig.counts,
    });
  }

  private _emptyResult(sourceFile: string, warnings: string[]): DimensionalSignature {
    const bbox: BBox = { min: [0, 0, 0], max: [0, 0, 0], extent: [0, 0, 0] };
    const moi: Moi3 = { Ixx: 0, Iyy: 0, Izz: 0 };
    const counts: Counts = { cartesianPoints: 0, circles: 0, lines: 0 };
    const signature = dimensionalSignatureHash({
      bbox,
      envelopeM: 0,
      volumeBboxM3: 0,
      surfaceAreaM2: 0,
      com: [0, 0, 0],
      moiAABB: moi,
      holes: [],
      counts,
    });
    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      unitSystem: "SI",
      sourceLengthUnit: "unknown",
      bbox,
      envelopeM: 0,
      volumeBboxM3: 0,
      surfaceAreaM2: 0,
      com: [0, 0, 0],
      moiAABB: moi,
      holes: [],
      counts,
      signature,
      warnings,
    };
  }
}

export const dimensionalSignatureEngine = new DimensionalSignatureEngine();
