/**
 * PrintToCADTranslator — Shared blueprint-OCR → CADOperation[] translator.
 *
 * Extracted from PrintToFusion360Bridge so that PrintToMastercamBridge,
 * PrintToInventorBridge, PrintToSolidWorksBridge, PrintToEspritBridge can
 * share one translation surface and only differ in which code generator
 * they hand the op stream to.
 *
 * Every CAD-specific generator (Fusion / Mastercam / Inventor / SolidWorks /
 * hyperCAD-S / Esprit) accepts the canonical CADOperation kinds defined in
 * `interfaces/ICADCodeGenerator.ts` with the same arg schema:
 *   - sketch_create:    { plane: "XY" | "XZ" | "YZ" }
 *   - sketch_circle:    { centerX, centerY, radius }
 *   - sketch_rectangle: { x, y, width, height }
 *   - sketch_line:      { x1, y1, x2, y2 }
 *   - feature_extrude:  { depth, direction: "positive" | "negative", operation: "new_body" | "cut" | ... }
 *
 * @module engines/PrintToCADTranslator
 */

import type { BlueprintAnalysis, ExtractedDimension } from "./BlueprintOCREngine.js";
import type { ExtractedProfile } from "./BlueprintVisionOCREngine.js";
import type { CADOperation, CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

// ── Constants ────────────────────────────────────────────────────────────────

export const TRANSLATOR_VERSION = "1.0.0";

const DEFAULT_DEPTH_MM = 10;
const DEFAULT_PART_NAME = "PRISM_BlueprintPart";
const MAX_PROFILES_WARN_THRESHOLD = 50;
const MAX_REASONABLE_DIM_MM = 10_000;
const MIN_VALID_DIM_MM = 0.001;
const TRIANGLE_MIN_POINTS = 3;
const INCH_TO_MM = 25.4;

// Re-exported so bridges can use the same magic-number constants in their tests.
export const TRANSLATOR_CONSTANTS = {
  DEFAULT_DEPTH_MM,
  DEFAULT_PART_NAME,
  MAX_PROFILES_WARN_THRESHOLD,
  MAX_REASONABLE_DIM_MM,
  MIN_VALID_DIM_MM,
  TRIANGLE_MIN_POINTS,
  INCH_TO_MM,
} as const;

// ── Public types ─────────────────────────────────────────────────────────────

export interface TranslatorInput {
  analysis?: BlueprintAnalysis;
  profiles?: ExtractedProfile[];
  dimensions?: ExtractedDimension[];
  partName?: string;
  units?: "mm" | "in";
  defaultDepth?: number;
}

export interface TranslatorResult {
  ops: CADOperation[];
  warnings: string[];
  unsupported: string[];
  partName: string;
  units: "mm" | "in";
  material: string | null;
  dimensionCount: number;
  profileCount: number;
  validProfileCount: number;
  source: "blueprint_analysis" | "profiles" | "dimensions_only" | "mixed";
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function sanitizePartName(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_PART_NAME;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_PART_NAME;
  return trimmed.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

function resolveUnits(
  inputUnits: "mm" | "in" | undefined,
  analysis: BlueprintAnalysis | undefined,
  warnings: string[],
): "mm" | "in" {
  if (inputUnits === "mm" || inputUnits === "in") return inputUnits;
  const tb = analysis?.title_block?.units;
  if (tb === "mm" || tb === "in") return tb;
  if (tb === "mixed") {
    warnings.push("title_block.units is 'mixed' — defaulting to mm; verify dimensions before machining");
  }
  return "mm";
}

function resolveDepth(
  _profile: ExtractedProfile | undefined,
  dimensions: ExtractedDimension[],
  defaultDepth: number,
  warnings: string[],
): number {
  const depthDim = dimensions.find((d) => d.type === "depth" && isFiniteNumber(d.nominal) && d.nominal > 0);
  if (depthDim) {
    const mm = depthDim.unit === "in" ? depthDim.nominal * INCH_TO_MM : depthDim.nominal;
    if (mm > MAX_REASONABLE_DIM_MM) {
      warnings.push(`depth dimension ${mm}mm exceeds reasonable range — using default ${defaultDepth}mm`);
      return defaultDepth;
    }
    return mm;
  }
  return defaultDepth;
}

function resolveDiameter(dimensions: ExtractedDimension[]): number | null {
  const diaDim = dimensions.find((d) => d.type === "diameter" && isFiniteNumber(d.nominal) && d.nominal > 0);
  if (!diaDim) return null;
  return diaDim.unit === "in" ? diaDim.nominal * INCH_TO_MM : diaDim.nominal;
}

function resolveLinearTriple(dimensions: ExtractedDimension[]): [number, number, number] | null {
  const linears = dimensions.filter(
    (d) => d.type === "linear" && isFiniteNumber(d.nominal) && d.nominal > 0,
  );
  if (linears.length < TRIANGLE_MIN_POINTS) return null;
  const toMm = (d: ExtractedDimension): number => (d.unit === "in" ? d.nominal * INCH_TO_MM : d.nominal);
  const sorted = linears.map(toMm).sort((a, b) => b - a);
  return [sorted[0]!, sorted[1]!, sorted[2]!];
}

function validateProfile(
  profile: ExtractedProfile,
  warnings: string[],
): { valid: boolean; reason?: string } {
  if (!profile || typeof profile !== "object") {
    return { valid: false, reason: "profile is not an object" };
  }
  if (profile.diameter_mm !== undefined) {
    if (!isFiniteNumber(profile.diameter_mm) || profile.diameter_mm <= 0) {
      return { valid: false, reason: `invalid diameter_mm: ${profile.diameter_mm}` };
    }
    if (profile.diameter_mm > MAX_REASONABLE_DIM_MM) {
      warnings.push(`profile ${profile.id} diameter_mm=${profile.diameter_mm} exceeds reasonable range`);
    }
    return { valid: true };
  }
  if (!Array.isArray(profile.points)) {
    return { valid: false, reason: "missing points array" };
  }
  if (profile.points.length < TRIANGLE_MIN_POINTS && !profile.is_closed) {
    return {
      valid: false,
      reason: `insufficient points (${profile.points.length}) for non-closed profile`,
    };
  }
  for (const pt of profile.points) {
    if (!pt || typeof pt !== "object" || !isFiniteNumber(pt.x) || !isFiniteNumber(pt.y)) {
      return { valid: false, reason: `non-finite point in profile ${profile.id}` };
    }
    if (Math.abs(pt.x) > MAX_REASONABLE_DIM_MM || Math.abs(pt.y) > MAX_REASONABLE_DIM_MM) {
      warnings.push(`profile ${profile.id} contains coordinate outside reasonable range`);
    }
  }
  return { valid: true };
}

function profileBoundingBox(profile: ExtractedProfile): { x: number; y: number; w: number; h: number } | null {
  if (!Array.isArray(profile.points) || profile.points.length === 0) {
    if (profile.width_mm && profile.height_mm) {
      return { x: 0, y: 0, w: profile.width_mm, h: profile.height_mm };
    }
    return null;
  }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const pt of profile.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ── Op factory with cross-CAD arg aliases ────────────────────────────────────
// Different CAD code generators use different arg key conventions:
//   - Fusion / Mastercam: centerX, centerY, x, y, width, height, x1, y1, x2, y2
//   - Inventor:           cx, cy (for circles/arcs), x, y, width, height, x1, y1, x2, y2
//   - SolidWorks:         reads from op.params (not op.args), supports both name forms
// We populate both args and params with all alias keys so any CAD codegen works.

function makeOp(
  kind: CADOperationKind,
  baseArgs: Record<string, unknown>,
  meta: { operationId?: string; description?: string } = {},
): CADOperation {
  const args: Record<string, unknown> = { ...baseArgs };
  // Circle/arc center aliases
  if (args.centerX !== undefined && args.cx === undefined) args.cx = args.centerX;
  if (args.centerY !== undefined && args.cy === undefined) args.cy = args.centerY;
  if (args.cx !== undefined && args.centerX === undefined) args.centerX = args.cx;
  if (args.cy !== undefined && args.centerY === undefined) args.centerY = args.cy;
  // Rectangle / line additional aliases for SolidWorks (which reads x1/y1/x2/y2)
  if (kind === "sketch_rectangle") {
    const x = Number(args.x ?? 0);
    const y = Number(args.y ?? 0);
    const w = Number(args.width ?? 0);
    const h = Number(args.height ?? 0);
    if (args.x1 === undefined) args.x1 = x;
    if (args.y1 === undefined) args.y1 = y;
    if (args.x2 === undefined) args.x2 = x + w;
    if (args.y2 === undefined) args.y2 = y + h;
  }
  // Extrude: Inventor expects "length" instead of "depth"
  if (kind === "feature_extrude") {
    if (args.depth !== undefined && args.length === undefined) args.length = args.depth;
    if (args.length !== undefined && args.depth === undefined) args.depth = args.length;
  }
  return { kind, args: args as CADOperation["args"], params: { ...args }, ...meta };
}

// ── Per-profile op generators ────────────────────────────────────────────────

function profileToOps(
  profile: ExtractedProfile,
  depthMm: number,
  warnings: string[],
  unsupported: string[],
): CADOperation[] {
  const ops: CADOperation[] = [];
  const isCut =
    profile.type === "hole" ||
    profile.type === "pocket" ||
    profile.type === "slot" ||
    profile.type === "internal";

  // Branch 1: hole / circle by diameter.
  if (profile.diameter_mm !== undefined) {
    const cx = profile.points?.[0]?.x ?? 0;
    const cy = profile.points?.[0]?.y ?? 0;
    ops.push(
      makeOp("sketch_create", { plane: "XY" }, {
        operationId: `${profile.id}_sketch`,
        description: `Sketch for ${profile.type} ${profile.id}`,
      }),
    );
    ops.push(
      makeOp(
        "sketch_circle",
        { centerX: cx, centerY: cy, radius: profile.diameter_mm / 2 },
        { operationId: `${profile.id}_circle`, description: `Circle Ø${profile.diameter_mm}mm` },
      ),
    );
    ops.push(
      makeOp(
        "feature_extrude",
        {
          depth: depthMm,
          direction: isCut ? "negative" : "positive",
          operation: isCut ? "cut" : "new_body",
        },
        {
          operationId: `${profile.id}_extrude`,
          description: `Extrude ${isCut ? "cut" : "body"} ${depthMm}mm`,
        },
      ),
    );
    return ops;
  }

  // Branch 2: rectangular pocket / slot via bounding box.
  if (profile.type === "pocket" || profile.type === "slot") {
    const bb = profileBoundingBox(profile);
    if (!bb || bb.w <= 0 || bb.h <= 0) {
      warnings.push(`profile ${profile.id} (${profile.type}) has degenerate bounding box — skipped`);
      return [];
    }
    ops.push(
      makeOp("sketch_create", { plane: "XY" }, {
        operationId: `${profile.id}_sketch`,
        description: `Sketch for ${profile.type} ${profile.id}`,
      }),
    );
    ops.push(
      makeOp(
        "sketch_rectangle",
        { x: bb.x, y: bb.y, width: bb.w, height: bb.h },
        {
          operationId: `${profile.id}_rect`,
          description: `${profile.type} ${bb.w}×${bb.h}mm`,
        },
      ),
    );
    ops.push(
      makeOp(
        "feature_extrude",
        { depth: depthMm, direction: "negative", operation: "cut" },
        { operationId: `${profile.id}_extrude`, description: `Cut ${depthMm}mm` },
      ),
    );
    return ops;
  }

  // Branch 3: external profile via line chain.
  if (profile.type === "external") {
    if (!Array.isArray(profile.points) || profile.points.length < TRIANGLE_MIN_POINTS) {
      warnings.push(`profile ${profile.id} (external) has fewer than ${TRIANGLE_MIN_POINTS} points — skipped`);
      return [];
    }
    ops.push(
      makeOp("sketch_create", { plane: "XY" }, {
        operationId: `${profile.id}_sketch`,
        description: `External profile sketch for ${profile.id}`,
      }),
    );
    const pts = profile.points;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      ops.push(
        makeOp(
          "sketch_line",
          { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
          { operationId: `${profile.id}_line_${i}` },
        ),
      );
    }
    ops.push(
      makeOp(
        "feature_extrude",
        { depth: depthMm, direction: "positive", operation: "new_body" },
        { operationId: `${profile.id}_extrude`, description: `Extrude body ${depthMm}mm` },
      ),
    );
    return ops;
  }

  unsupported.push(`${profile.type}:${profile.id}`);
  return [];
}

function dimensionsToPrimitiveOps(
  dimensions: ExtractedDimension[],
  defaultDepth: number,
  warnings: string[],
): CADOperation[] {
  const dia = resolveDiameter(dimensions);
  if (dia !== null) {
    const depth = resolveDepth(undefined, dimensions, defaultDepth, warnings);
    return [
      makeOp("sketch_create", { plane: "XY" }, {
        operationId: "primitive_sketch",
        description: "Cylinder primitive sketch",
      }),
      makeOp("sketch_circle", { centerX: 0, centerY: 0, radius: dia / 2 }, {
        operationId: "primitive_circle",
        description: `Cylinder Ø${dia}mm`,
      }),
      makeOp("feature_extrude", { depth, direction: "positive", operation: "new_body" }, {
        operationId: "primitive_extrude",
        description: `Extrude cylinder ${depth}mm`,
      }),
    ];
  }
  const triple = resolveLinearTriple(dimensions);
  if (triple) {
    const [w, h, d] = triple;
    return [
      makeOp("sketch_create", { plane: "XY" }, {
        operationId: "primitive_sketch",
        description: "Box primitive sketch",
      }),
      makeOp("sketch_rectangle", { x: 0, y: 0, width: w, height: h }, {
        operationId: "primitive_rect",
        description: `Box ${w}×${h}mm base`,
      }),
      makeOp("feature_extrude", { depth: d, direction: "positive", operation: "new_body" }, {
        operationId: "primitive_extrude",
        description: `Extrude box ${d}mm`,
      }),
    ];
  }
  warnings.push("dimensions present but no diameter and fewer than 3 linear dims — cannot derive primitive");
  return [];
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Validate that input is shaped to be translatable. Returns warnings + feasibility. */
export function validateTranslatorInput(input: TranslatorInput): ValidationResult {
  const warnings: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, warnings: ["input is not an object"] };
  }
  const hasAnalysis = !!input.analysis;
  const hasProfiles = Array.isArray(input.profiles) && input.profiles.length > 0;
  const hasDimensions =
    (Array.isArray(input.dimensions) && input.dimensions.length > 0) ||
    (input.analysis &&
      Array.isArray(input.analysis.dimensions) &&
      input.analysis.dimensions.length > 0);
  if (!hasAnalysis && !hasProfiles && !hasDimensions) {
    return {
      valid: false,
      warnings: ["input must include at least one of: analysis, profiles, dimensions"],
    };
  }
  if (input.defaultDepth !== undefined) {
    if (!isFiniteNumber(input.defaultDepth) || input.defaultDepth < MIN_VALID_DIM_MM) {
      warnings.push(`defaultDepth ${input.defaultDepth} invalid — will use ${DEFAULT_DEPTH_MM}mm`);
    }
  }
  return { valid: true, warnings };
}

/**
 * Translate a blueprint analysis (and/or profiles, dimensions) into a stream of
 * canonical CADOperation values. The stream is universal — pass it to any
 * UnifiedCADCodeGeneratorBase subclass.
 *
 * @throws when input is not validatable, or when zero ops can be produced
 */
export function translateBlueprintToOps(input: TranslatorInput, label: string): TranslatorResult {
  const validation = validateTranslatorInput(input);
  if (!validation.valid) {
    throw new Error(`${label}: ${validation.warnings.join("; ") || "invalid input"}`);
  }

  const warnings: string[] = [...validation.warnings];
  const unsupported: string[] = [];

  const dimensions: ExtractedDimension[] =
    input.dimensions ?? input.analysis?.dimensions ?? [];
  const profiles: ExtractedProfile[] = input.profiles ?? [];
  const material = input.analysis?.title_block?.material ?? null;
  const units = resolveUnits(input.units, input.analysis, warnings);
  const partName = sanitizePartName(
    input.partName ?? input.analysis?.title_block?.part_number ?? DEFAULT_PART_NAME,
  );
  const defaultDepth =
    isFiniteNumber(input.defaultDepth) && input.defaultDepth! >= MIN_VALID_DIM_MM
      ? input.defaultDepth!
      : DEFAULT_DEPTH_MM;

  if (profiles.length > MAX_PROFILES_WARN_THRESHOLD) {
    warnings.push(
      `profiles count ${profiles.length} exceeds ${MAX_PROFILES_WARN_THRESHOLD} — script may be large`,
    );
  }

  const ops: CADOperation[] = [];
  let validProfileCount = 0;
  for (const profile of profiles) {
    const v = validateProfile(profile, warnings);
    if (!v.valid) {
      warnings.push(`profile ${profile?.id ?? "<unknown>"} invalid: ${v.reason}`);
      continue;
    }
    const depth = resolveDepth(profile, dimensions, defaultDepth, warnings);
    const profileOps = profileToOps(profile, depth, warnings, unsupported);
    if (profileOps.length > 0) {
      validProfileCount++;
      ops.push(...profileOps);
    }
  }

  if (ops.length === 0 && dimensions.length > 0) {
    ops.push(...dimensionsToPrimitiveOps(dimensions, defaultDepth, warnings));
  }

  if (ops.length === 0) {
    throw new Error(
      `${label}: zero operations produced — no convertible profiles or primitive-shaped dimensions`,
    );
  }

  const source: TranslatorResult["source"] =
    profiles.length > 0 && dimensions.length > 0
      ? "mixed"
      : profiles.length > 0
        ? "profiles"
        : input.analysis
          ? "blueprint_analysis"
          : "dimensions_only";

  return {
    ops,
    warnings,
    unsupported,
    partName,
    units,
    material,
    dimensionCount: dimensions.length,
    profileCount: profiles.length,
    validProfileCount,
    source,
  };
}

export const PRINT_BRIDGE_SUPPORTED_OPS: readonly CADOperationKind[] = [
  "sketch_create",
  "sketch_circle",
  "sketch_rectangle",
  "sketch_line",
  "feature_extrude",
] as const;
