/**
 * GroundTruthFeatureTreeExtractor — canonical JSON feature-tree normalizer.
 *
 * Converts heterogeneous CAD parser output into ONE canonical, Zod-validated
 * feature-tree schema so the 20,006-file ground-truth corpus speaks a single
 * vocabulary. Composes (does NOT duplicate):
 *   - FCStdNativeParserEngine — FreeCAD .FCStd object trees
 *   - F3DSQLiteParserEngine   — Fusion 360 timeline entries
 *   - CADToSTEPPipelineEngine — for STEP-only fallback (single Body feature)
 *
 * Canonical feature taxonomy (per milestone CAD-GROUND-TRUTH-MS0/U-CGT04):
 *   Sketch · Extrude · Revolve · Sweep · Loft · Fillet · Chamfer · Hole ·
 *   Pattern · Mirror · Shell · Body · Component · Spreadsheet · Other
 *
 * Mock mode (PRISM_CAD_MOCK=1): bridge-required formats (.sldprt, .ipt, .mcx*,
 * .hmc) emit deterministic synthetic trees keyed off file-path hash so CI runs
 * exercise identical normalization paths without a CAD installation.
 *
 * Duplication check (DuplicationGuardEngine keywords: cad, feature, tree,
 * ground-truth, canonical, normalize):
 *   → No GroundTruthFeatureTreeExtractor / FeatureTreeNormalizer found.
 *   → CADFeatureRecognitionEngine recognizes machining features on geometry,
 *     not native CAD authoring trees — different layer.
 *   → FeatureRegistryEngine indexes machining features only.
 *   → CADFeatureMemoryEngine persists features across sessions; this engine
 *     EMITS the canonical form that registry would later index.
 *
 * @engine GroundTruthFeatureTreeExtractor
 * @shortcode E2504
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT04
 * @classification STANDARD (schema normalization, no physics constants)
 */

import * as path from "node:path";
import * as crypto from "node:crypto";
import { z } from "zod";
import { fcStdNativeParserEngine } from "./FCStdNativeParserEngine.js";
import { f3dSqliteParserEngine } from "./F3DSQLiteParserEngine.js";
import type { FCStdParseResult } from "./FCStdNativeParserEngine.js";
import type { F3DParseResult } from "./F3DSQLiteParserEngine.js";

// ── AtomicValue (project pattern) ───────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

// ── Canonical schema ────────────────────────────────────────────────────────

export const CANONICAL_FEATURE_TYPES = [
  "Sketch",
  "Extrude",
  "Revolve",
  "Sweep",
  "Loft",
  "Fillet",
  "Chamfer",
  "Hole",
  "Pattern",
  "Mirror",
  "Shell",
  "Body",
  "Component",
  "Spreadsheet",
  "Other",
] as const;

export type CanonicalFeatureType = (typeof CANONICAL_FEATURE_TYPES)[number];

export const SOURCE_FORMATS = [
  "FCStd",
  "f3d",
  "f3z",
  "step",
  "sldprt",
  "sldasm",
  "ipt",
  "iam",
  "mcam",
  "mcx",
  "mcx-8",
  "hmc",
  "unknown",
] as const;

export type SourceFormat = (typeof SOURCE_FORMATS)[number];

export const FeatureParameterSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

export const CanonicalFeatureSchema = z
  .object({
    /** Stable id within this tree (string for cross-format compatibility). */
    id: z.string().min(1),
    type: z.enum(CANONICAL_FEATURE_TYPES),
    name: z.string(),
    /** Free-form parameters keyed by canonical names (e.g. "length", "angle"). */
    parameters: z.record(z.string(), FeatureParameterSchema).optional(),
    /** When the feature consumes a sketch, references that sketch id. */
    sketchRef: z.string().optional(),
    /** Parent feature id when nested (component or pattern child). */
    parentId: z.string().optional(),
    /** Suppressed/hidden in source CAD — preserved for fidelity. */
    suppressed: z.boolean().optional(),
    /** Original source-format type string for round-trip diagnostics. */
    sourceType: z.string().optional(),
  })
  .strict();

export const CanonicalAssemblySchema = z
  .object({
    componentId: z.string().min(1),
    name: z.string(),
    childComponentIds: z.array(z.string()).default([]),
    /** Path or identifier to the part file this component references. */
    partRef: z.string().optional(),
  })
  .strict();

export const CanonicalFeatureTreeSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    sourceFile: z.string().min(1),
    sourceFormat: z.enum(SOURCE_FORMATS),
    sourceVersion: z.string().optional(),
    features: z.array(CanonicalFeatureSchema),
    assemblies: z.array(CanonicalAssemblySchema).optional(),
    /** 0–1 — fraction of source objects successfully normalized. */
    coverage: z.number().min(0).max(1),
    /** Deterministic SHA-256 hex over structurally significant fields. */
    signature: z.string().regex(/^[0-9a-f]{64}$/),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

export type CanonicalFeature = z.infer<typeof CanonicalFeatureSchema>;
export type CanonicalAssembly = z.infer<typeof CanonicalAssemblySchema>;
export type CanonicalFeatureTree = z.infer<typeof CanonicalFeatureTreeSchema>;

// ── Format → canonical type mapping ─────────────────────────────────────────

/**
 * FreeCAD object type → canonical feature type.
 * Handles "PartDesign::*", "Part::*", "Sketcher::*", "Spreadsheet::*",
 * "App::Part" / "App::DocumentObjectGroup" component containers.
 */
function freecadTypeToCanonical(t: string): CanonicalFeatureType {
  const s = t.toLowerCase();
  if (s.includes("sketcher::sketchobject") || s.endsWith("::sketch")) return "Sketch";
  if (s.includes("spreadsheet::sheet")) return "Spreadsheet";
  if (s.includes("partdesign::pad") || s.includes("partdesign::pocket"))
    return "Extrude";
  if (s.includes("partdesign::revolution") || s.includes("partdesign::groove"))
    return "Revolve";
  if (s.includes("partdesign::additivepipe") || s.includes("partdesign::subtractivepipe"))
    return "Sweep";
  if (s.includes("partdesign::additiveloft") || s.includes("partdesign::subtractiveloft"))
    return "Loft";
  if (s.includes("partdesign::fillet")) return "Fillet";
  if (s.includes("partdesign::chamfer")) return "Chamfer";
  if (s.includes("partdesign::hole")) return "Hole";
  if (
    s.includes("partdesign::linearpattern") ||
    s.includes("partdesign::polarpattern") ||
    s.includes("partdesign::multitransform")
  )
    return "Pattern";
  if (s.includes("partdesign::mirrored")) return "Mirror";
  if (s.includes("partdesign::thickness")) return "Shell";
  if (
    s.startsWith("part::box") ||
    s.startsWith("part::cylinder") ||
    s.startsWith("part::sphere") ||
    s.startsWith("part::cone") ||
    s.startsWith("part::torus") ||
    s.includes("partdesign::body")
  )
    return "Body";
  if (
    s === "app::part" ||
    s === "app::documentobjectgroup" ||
    s.startsWith("app::link")
  )
    return "Component";
  return "Other";
}

/**
 * Fusion 360 timeline featureType → canonical feature type.
 * Fusion uses human-readable feature names already; map case-insensitively.
 */
function fusionTypeToCanonical(t: string): CanonicalFeatureType {
  const s = t.toLowerCase();
  if (s === "sketch" || s.includes("sketchfeature")) return "Sketch";
  if (s.includes("extrude")) return "Extrude";
  if (s.includes("revolve")) return "Revolve";
  if (s === "sweep" || s.includes("sweepfeature")) return "Sweep";
  if (s === "loft" || s.includes("loftfeature")) return "Loft";
  if (s.includes("fillet")) return "Fillet";
  if (s.includes("chamfer")) return "Chamfer";
  if (s.includes("hole")) return "Hole";
  if (s.includes("pattern")) return "Pattern";
  if (s.includes("mirror")) return "Mirror";
  if (s === "shell" || s.includes("shellfeature")) return "Shell";
  if (s === "body" || s === "component") return s === "body" ? "Body" : "Component";
  return "Other";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const ALLOWED_PARAM = (v: unknown): boolean =>
  v === null ||
  typeof v === "number" ||
  typeof v === "string" ||
  typeof v === "boolean";

/**
 * Canonicalize a raw property bag into the schema-allowed parameter shape.
 * Drops undefined and complex objects (records a warning via the caller).
 */
function flattenParams(
  raw: Record<string, unknown>,
): Record<string, number | string | boolean | null> {
  const out: Record<string, number | string | boolean | null> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (ALLOWED_PARAM(v)) {
      out[k] = v as number | string | boolean | null;
      continue;
    }
    // Unwrap FreeCAD-style { type, value, unit? } / Fusion { value, unit, expression? }
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const inner = obj["value"];
      if (ALLOWED_PARAM(inner)) {
        out[k] = inner as number | string | boolean | null;
        continue;
      }
      const expr = obj["expression"];
      if (typeof expr === "string") {
        out[k] = expr;
        continue;
      }
    }
    // Fallback: stringify so signature stays deterministic and lossless-ish.
    try {
      out[k] = JSON.stringify(v);
    } catch {
      out[k] = String(v);
    }
  }
  return out;
}

/**
 * Stable JSON stringify with recursively sorted keys.
 * Required so signature is byte-identical across runs regardless of key order.
 */
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

/**
 * Compute the canonical SHA-256 signature over structurally significant fields.
 * Excludes: timestamps, sourceVersion, warnings, signature itself.
 */
export function canonicalSignature(
  features: ReadonlyArray<CanonicalFeature>,
  assemblies: ReadonlyArray<CanonicalAssembly> | undefined,
  sourceFormat: SourceFormat,
): string {
  const payload = {
    sourceFormat,
    features: features.map((f) => ({
      id: f.id,
      type: f.type,
      name: f.name,
      parameters: f.parameters ?? {},
      sketchRef: f.sketchRef ?? null,
      parentId: f.parentId ?? null,
      suppressed: f.suppressed ?? false,
    })),
    assemblies: (assemblies ?? []).map((a) => ({
      componentId: a.componentId,
      name: a.name,
      childComponentIds: [...a.childComponentIds].sort(),
      partRef: a.partRef ?? null,
    })),
  };
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function detectFormat(filePath: string): SourceFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".fcstd" || ext === ".fcstd1") return "FCStd";
  if (ext === ".f3d") return "f3d";
  if (ext === ".f3z") return "f3z";
  if (ext === ".step" || ext === ".stp") return "step";
  if (ext === ".sldprt") return "sldprt";
  if (ext === ".sldasm") return "sldasm";
  if (ext === ".ipt") return "ipt";
  if (ext === ".iam") return "iam";
  if (ext === ".mcam") return "mcam";
  if (ext === ".mcx") return "mcx";
  if (ext === ".mcx-8") return "mcx-8";
  if (ext === ".hmc") return "hmc";
  return "unknown";
}

// ── Engine ──────────────────────────────────────────────────────────────────

/**
 * GroundTruthFeatureTreeExtractor — produces canonical, Zod-validated feature
 * trees from any supported CAD format. Mock-aware for CI.
 */
export class GroundTruthFeatureTreeExtractor {
  private get isMock(): boolean {
    return process.env["PRISM_CAD_MOCK"] === "1";
  }

  /** Public schema version pin — bump on breaking changes. */
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Normalize a FreeCAD .FCStd parse result into the canonical tree.
   * Spreadsheet objects become Spreadsheet features; their cells move into
   * `parameters` so signature includes the parametric driver values.
   */
  normalizeFromFCStd(
    parse: FCStdParseResult,
    sourceFile: string,
  ): CanonicalFeatureTree {
    const features: CanonicalFeature[] = [];
    const warnings = [...parse.warnings];

    for (const obj of parse.objects) {
      const type = freecadTypeToCanonical(obj.type);
      // Parent inference: properties may carry "BaseFeature" or "Support"
      const baseRaw = obj.properties["BaseFeature"]?.value;
      const supportRaw = obj.properties["Support"]?.value;
      const parentName =
        typeof baseRaw === "string"
          ? baseRaw
          : typeof supportRaw === "string"
            ? supportRaw
            : undefined;
      const sketchRaw = obj.properties["Sketch"]?.value;
      const sketchRef =
        typeof sketchRaw === "string" ? sketchRaw : undefined;

      const flatProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj.properties)) {
        flatProps[k] = v.value;
      }
      if (obj.expression) flatProps["expression"] = obj.expression;
      if (obj.label && obj.label !== obj.name) flatProps["label"] = obj.label;

      const params = flattenParams(flatProps);
      const feature: CanonicalFeature = {
        id: obj.name,
        type,
        name: obj.label || obj.name,
        sourceType: obj.type,
        ...(Object.keys(params).length > 0 ? { parameters: params } : {}),
        ...(sketchRef ? { sketchRef } : {}),
        ...(parentName ? { parentId: parentName } : {}),
      };
      features.push(feature);
    }

    // Spreadsheets — emit a single Spreadsheet feature per sheet, cells → params
    for (const sheet of parse.spreadsheets) {
      const params: Record<string, number | string | boolean | null> = {};
      for (const cell of sheet.cells) {
        const numericTry = Number(cell.value);
        const v: number | string =
          cell.value !== "" && Number.isFinite(numericTry)
            ? numericTry
            : cell.value;
        params[cell.address] = v;
        if (cell.expression) params[cell.address + ":expr"] = cell.expression;
      }
      features.push({
        id: `spreadsheet:${sheet.name}`,
        type: "Spreadsheet",
        name: sheet.name,
        sourceType: "Spreadsheet::Sheet",
        ...(Object.keys(params).length > 0 ? { parameters: params } : {}),
      });
    }

    const signature = canonicalSignature(features, undefined, "FCStd");
    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      sourceFormat: "FCStd",
      ...(parse.freecadVersion ? { sourceVersion: parse.freecadVersion } : {}),
      features,
      coverage: clamp01(parse.coverage),
      signature,
      warnings,
    };
  }

  /**
   * Normalize a Fusion 360 .f3d/.f3z parse result into the canonical tree.
   * Bodies become explicit Body features; sketches in the timeline are kept
   * with their entity counts so downstream regression can compare richness.
   */
  normalizeFromF3D(
    parse: F3DParseResult,
    sourceFile: string,
  ): CanonicalFeatureTree {
    const features: CanonicalFeature[] = [];
    const warnings = [...parse.warnings];

    // Sketches first so any timeline feature referring to one resolves.
    for (const sk of parse.sketches) {
      features.push({
        id: `sketch:${sk.name}`,
        type: "Sketch",
        name: sk.name,
        sourceType: "Sketch",
        parameters: {
          planeId: sk.planeId,
          entities: sk.entities,
        },
      });
    }

    for (const t of parse.timeline) {
      const type = fusionTypeToCanonical(t.featureType);
      const params = flattenParams(t.parameters as Record<string, unknown>);
      features.push({
        id: `tl:${t.index}:${t.name}`,
        type,
        name: t.name,
        sourceType: t.featureType,
        ...(Object.keys(params).length > 0 ? { parameters: params } : {}),
        ...(t.parentId ? { parentId: t.parentId } : {}),
        suppressed: t.suppressed,
      });
    }

    for (const b of parse.bodies) {
      features.push({
        id: `body:${b.name}`,
        type: "Body",
        name: b.name,
        sourceType: b.type,
        parameters: { kind: b.type, visible: b.visibility },
      });
    }

    // Document-level parameters become a synthetic Spreadsheet so they are
    // captured in the signature without losing their expressions.
    if (parse.parameters.length > 0) {
      const params: Record<string, number | string | boolean | null> = {};
      for (const p of parse.parameters) {
        params[p.name] = p.value;
        if (p.expression) params[p.name + ":expr"] = p.expression;
        if (p.unit) params[p.name + ":unit"] = p.unit;
      }
      features.push({
        id: "spreadsheet:fusion-parameters",
        type: "Spreadsheet",
        name: "Fusion Parameters",
        sourceType: "FusionParameterTable",
        parameters: params,
      });
    }

    const sourceFormat: SourceFormat = parse.format === "f3z" ? "f3z" : "f3d";
    const signature = canonicalSignature(features, undefined, sourceFormat);
    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      sourceFormat,
      ...(parse.fusionVersion ? { sourceVersion: parse.fusionVersion } : {}),
      features,
      coverage: clamp01(parse.coverage),
      signature,
      warnings,
    };
  }

  /**
   * Build a minimal canonical tree for STEP-only files (no native authoring
   * tree available). Emits one Body feature so downstream comparators have a
   * stable record.
   */
  buildStepFallback(sourceFile: string, warning?: string): CanonicalFeatureTree {
    const warnings: string[] = warning ? [warning] : [];
    const feature: CanonicalFeature = {
      id: "step:body:0",
      type: "Body",
      name: path.basename(sourceFile, path.extname(sourceFile)),
      sourceType: "STEP_BREP",
      parameters: { source: "step-fallback" },
    };
    const features = [feature];
    const signature = canonicalSignature(features, undefined, "step");
    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      sourceFormat: "step",
      features,
      coverage: 0.1,
      signature,
      warnings,
    };
  }

  /**
   * Mock-mode synthetic tree — deterministic from file path.
   * Used by CI/regression tests so unsupported native formats do not fail
   * extract() when no CAD application is installed.
   */
  buildMockTree(
    sourceFile: string,
    sourceFormat: SourceFormat,
  ): CanonicalFeatureTree {
    const seed = crypto
      .createHash("sha256")
      .update(sourceFile + "::" + sourceFormat)
      .digest();
    const featureCount = (seed[0]! % 4) + 2; // 2..5
    const features: CanonicalFeature[] = [];
    for (let i = 0; i < featureCount; i++) {
      const t =
        CANONICAL_FEATURE_TYPES[
          seed[(i + 1) % seed.length]! % CANONICAL_FEATURE_TYPES.length
        ]!;
      features.push({
        id: `mock:${i}`,
        type: t,
        name: `${t}${i}`,
        sourceType: `mock:${sourceFormat}`,
        parameters: { mockIndex: i },
      });
    }
    const signature = canonicalSignature(features, undefined, sourceFormat);
    return {
      schemaVersion: this.schemaVersion,
      sourceFile,
      sourceFormat,
      features,
      coverage: 1,
      signature,
      warnings: ["mock-mode synthetic tree (PRISM_CAD_MOCK=1)"],
    };
  }

  /**
   * Extract a canonical feature tree from any supported file path.
   * Routes:
   *   .FCStd / .FCStd1 → FCStdNativeParserEngine
   *   .f3d / .f3z      → F3DSQLiteParserEngine
   *   .step / .stp     → buildStepFallback (single Body)
   *   bridge formats   → mock tree (mock mode) OR error (live mode w/o bridge)
   *   unknown ext      → error
   */
  async extract(
    filePath: string,
    formatHint?: SourceFormat,
  ): Promise<CanonicalFeatureTree> {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error(
        "[GroundTruthFeatureTreeExtractor] filePath must be a non-empty string",
      );
    }
    const fmt = formatHint ?? detectFormat(filePath);
    if (fmt === "unknown") {
      throw new Error(
        `[GroundTruthFeatureTreeExtractor] Unsupported file extension: ${filePath}`,
      );
    }

    if (this.isMock) {
      // Even mock mode honors native parsers if the file actually exists, so
      // tests for normalize* paths stay live; otherwise emit synth.
      try {
        if (fmt === "FCStd") {
          const r = await fcStdNativeParserEngine.parse(filePath);
          if (r.confidence > 0)
            return this.normalizeFromFCStd(r.value, filePath);
        } else if (fmt === "f3d" || fmt === "f3z") {
          const r = await f3dSqliteParserEngine.parse(filePath);
          if (r.confidence > 0)
            return this.normalizeFromF3D(r.value, filePath);
        } else if (fmt === "step") {
          return this.buildStepFallback(
            filePath,
            "mock-mode STEP fallback",
          );
        }
      } catch {
        // fall through to mock tree
      }
      return this.buildMockTree(filePath, fmt);
    }

    if (fmt === "FCStd") {
      const r = await fcStdNativeParserEngine.parse(filePath);
      return this.normalizeFromFCStd(r.value, filePath);
    }
    if (fmt === "f3d" || fmt === "f3z") {
      const r = await f3dSqliteParserEngine.parse(filePath);
      return this.normalizeFromF3D(r.value, filePath);
    }
    if (fmt === "step") {
      return this.buildStepFallback(filePath);
    }
    throw new Error(
      `[GroundTruthFeatureTreeExtractor] Live extraction for ${fmt} requires a bridge — set PRISM_CAD_MOCK=1 for synthetic mode or run via CADToSTEPPipelineEngine first`,
    );
  }

  /**
   * Re-validate a candidate tree against the canonical Zod schema.
   * Returns { ok, errors[] } so callers can surface diagnostics without throw.
   */
  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const parsed = CanonicalFeatureTreeSchema.safeParse(candidate);
    if (parsed.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  /** Public helper so callers can recompute a signature post-edit. */
  recomputeSignature(tree: CanonicalFeatureTree): string {
    return canonicalSignature(
      tree.features,
      tree.assemblies,
      tree.sourceFormat,
    );
  }

  /** Returns the canonical feature-type vocabulary (read-only). */
  listCanonicalTypes(): readonly CanonicalFeatureType[] {
    return CANONICAL_FEATURE_TYPES;
  }
}

export const groundTruthFeatureTreeExtractor =
  new GroundTruthFeatureTreeExtractor();
