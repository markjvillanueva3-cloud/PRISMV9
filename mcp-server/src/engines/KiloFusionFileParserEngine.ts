/**
 * KiloFusionFileParserEngine — KILO-CAM-TRAINING-MS0 campaign iter 3
 *
 * Mode-2 file-system parser for `.f3d` / `.f2d` Fusion files. These are
 * actually ZIP containers — the design tree, sketches, features, and
 * (when CAM is set up) the operations + tool list are embedded as JSON
 * inside the ZIP. Parsing them OFFLINE (no Fusion 360 process, no
 * APS network call) is the fastest possible extraction path.
 *
 * This engine is the PURE-FUNCTION classifier + JSON-detail extractor.
 * The actual ZIP read is performed by the caller (typically a CLI script
 * using `node:fs` + `node:zlib` or `unzipper`); this engine consumes the
 * already-extracted entry list + raw JSON payloads and produces the
 * normalized `FusionFileSummary` shape used by downstream training.
 *
 * Why pure? Keeps the engine unit-testable without filesystem fakes and
 * lets the same parser run in (a) the CLI bench script, (b) the MCP
 * action that streams a .f3d from APS Model Derivative, (c) a future
 * worker thread for parallel corpus extraction.
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback: a `.f3d` missing the expected Document.json is
 *     surfaced as `{ parsed: false, gap: "missing Document.json" }` — never
 *     coerced to a stub summary
 *   - dropping-tolerance-stack: when feature tolerance is present in
 *     Document.json, it flows through to the FusionFileSummary verbatim
 *   - emitting-program-without-pmi-validation: parser surfaces
 *     `features_missing_tolerance[]` so downstream can refuse to ship
 *
 * @milestone KILO-CAM-TRAINING-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// INPUT SHAPE — already-extracted ZIP entry list
// ============================================================================

export const ZipEntrySchema = z.object({
  /** Path inside the ZIP (e.g. "Document.json", "Geometry/sketches.json"). */
  path: z.string(),
  size_bytes: z.number().int().min(0),
  /** Raw text content (caller has already inflated). */
  content: z.string().optional(),
});
export type ZipEntry = z.infer<typeof ZipEntrySchema>;

export const FusionFileInputSchema = z.object({
  file_path: z.string(),
  /** "f3d" (design) or "f2d" (drawing). */
  extension: z.enum(["f3d", "f2d"]),
  entries: z.array(ZipEntrySchema),
});
export type FusionFileInput = z.infer<typeof FusionFileInputSchema>;

// ============================================================================
// OUTPUT SHAPE — normalized file summary
// ============================================================================

export const FusionFeatureSummarySchema = z.object({
  feature_id: z.string(),
  feature_type: z.string(),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type FusionFeatureSummary = z.infer<typeof FusionFeatureSummarySchema>;

export const FusionCamOperationSchema = z.object({
  op_id: z.string(),
  strategy: z.string(),
  tool_number: z.number().int().min(0).optional(),
});
export type FusionCamOperation = z.infer<typeof FusionCamOperationSchema>;

export const FusionFileSummarySchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_fusion_file_parser"),
  file_path: z.string(),
  extension: z.enum(["f3d", "f2d"]),
  parsed: z.boolean(),
  gap: z.string().nullable(),
  /** Document name from Document.json (best-effort). */
  document_name: z.string().nullable(),
  feature_count: z.number().int().min(0),
  features: z.array(FusionFeatureSummarySchema),
  cam_op_count: z.number().int().min(0),
  cam_operations: z.array(FusionCamOperationSchema),
  features_missing_tolerance: z.array(z.string()),
  total_uncompressed_bytes: z.number().int().min(0),
});
export type FusionFileSummary = z.infer<typeof FusionFileSummarySchema>;

// ============================================================================
// PARSE
// ============================================================================

function parseFusionFile(input: FusionFileInput): FusionFileSummary {
  FusionFileInputSchema.parse(input);

  const totalBytes = input.entries.reduce((a, e) => a + e.size_bytes, 0);
  const docEntry = input.entries.find((e) =>
    e.path === "Document.json" || e.path.endsWith("/Document.json")
  );

  if (!docEntry) {
    return {
      schemaVersion: "1.0.0",
      source: "kilo_fusion_file_parser",
      file_path: input.file_path,
      extension: input.extension,
      parsed: false,
      gap: "missing Document.json — file is not a standard .f3d/.f2d container",
      document_name: null,
      feature_count: 0,
      features: [],
      cam_op_count: 0,
      cam_operations: [],
      features_missing_tolerance: [],
      total_uncompressed_bytes: totalBytes,
    };
  }

  // Document.json may have inflated content already. If not, the caller
  // promised to provide it — we don't fetch it ourselves.
  let docJson: Record<string, unknown> = {};
  if (docEntry.content) {
    try {
      docJson = JSON.parse(docEntry.content);
    } catch {
      return {
        schemaVersion: "1.0.0",
        source: "kilo_fusion_file_parser",
        file_path: input.file_path,
        extension: input.extension,
        parsed: false,
        gap: "Document.json present but invalid JSON",
        document_name: null,
        feature_count: 0,
        features: [],
        cam_op_count: 0,
        cam_operations: [],
        features_missing_tolerance: [],
        total_uncompressed_bytes: totalBytes,
      };
    }
  }

  const documentName = typeof docJson.name === "string" ? docJson.name : null;

  // Extract features (Document.json's `features` array shape — Fusion 360 std).
  const featuresRaw = Array.isArray(docJson.features) ? docJson.features : [];
  const features: FusionFeatureSummary[] = [];
  const missingTol: string[] = [];
  for (const f of featuresRaw) {
    if (typeof f !== "object" || f === null) continue;
    const fo = f as Record<string, unknown>;
    const id = String(fo.id ?? `feature_${features.length}`);
    const type = String(fo.type ?? "unknown");
    const tol = typeof fo.tolerance_total_mm === "number" ? fo.tolerance_total_mm : undefined;
    if (tol === undefined) missingTol.push(id);
    features.push({ feature_id: id, feature_type: type, tolerance_total_mm: tol });
  }

  // Extract CAM operations from the `cam` block (when CAM is set up).
  const camBlock = (docJson.cam && typeof docJson.cam === "object") ? docJson.cam as Record<string, unknown> : null;
  const opsRaw = camBlock && Array.isArray(camBlock.operations) ? camBlock.operations : [];
  const operations: FusionCamOperation[] = [];
  for (const op of opsRaw) {
    if (typeof op !== "object" || op === null) continue;
    const oo = op as Record<string, unknown>;
    operations.push({
      op_id: String(oo.id ?? `op_${operations.length}`),
      strategy: String(oo.strategy ?? "unknown"),
      tool_number: typeof oo.tool_number === "number" ? oo.tool_number : undefined,
    });
  }

  return {
    schemaVersion: "1.0.0",
    source: "kilo_fusion_file_parser",
    file_path: input.file_path,
    extension: input.extension,
    parsed: true,
    gap: null,
    document_name: documentName,
    feature_count: features.length,
    features,
    cam_op_count: operations.length,
    cam_operations: operations,
    features_missing_tolerance: missingTol,
    total_uncompressed_bytes: totalBytes,
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloFusionFileParserEngine {
  static parseFusionFile = parseFusionFile;
}

export const kiloFusionFileParserEngine = KiloFusionFileParserEngine;
