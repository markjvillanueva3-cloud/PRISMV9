/**
 * CADFileClassifierEngine — U-CINF02 (CAD-INFRA-MS0)
 *
 * Classifies every indexed CAD file by category and test strategy:
 *   part      → .sldprt, .ipt, .FCStd, .f3d, .f3z
 *   assembly  → .sldasm, .iam
 *   drawing   → .slddrw, .idw
 *   cam       → .mcx-8, .MCX, .mcam, .hmc
 *   neutral   → .step, .stp, .iges, .igs, .stl
 *   kernel    → .x_t, .x_b
 *
 * Each classification carries a `testStrategy` tag that downstream
 * regression runners consume to select the right extraction path
 * (native bridge, OCCT import, skip, etc.).
 *
 * Design mirrors CADFileIndexerEngine:
 *   - Extends BaseEngine; pure data transform (no disk I/O on classify()).
 *   - Accepts either MasterIndex or CADFileEntry[] directly for testability.
 *   - Deterministic: same input → bit-identical summary (modulo generatedAt).
 *
 * Complexity: O(F) where F = file count. No per-file disk reads.
 *
 * Duplication check performed: no existing classifier maps CAD formats to
 * part/assembly/drawing/CAM. Existing classifiers target lathe parts,
 * materials, bash commands, and neural chatter — different domains.
 *
 * @module engines/CADFileClassifierEngine
 */

import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import type {
  CADFileEntry,
  MasterIndex,
  CADFormat,
} from "../schemas/cadFileIndexSchema.js";
import {
  CADFileClassificationSchema,
  ClassificationSummarySchema,
  type CADFileClassification,
  type ClassificationCategory,
  type ClassificationSummary,
  type ClassifyOptions,
  type TestStrategy,
} from "../schemas/cadFileClassificationSchema.js";

// ── Format → (category, strategy, handler) lookup ────────────────────────────

interface FormatProfile {
  category: ClassificationCategory;
  testStrategy: TestStrategy;
  handler?: string;
}

/**
 * Canonical format → classification table.
 * `handler` names the bridge or parser that downstream tests invoke.
 * Reference: CAD-AUTOMATION-MS0 unit deliverables (U-CAUT02..07).
 */
const FORMAT_PROFILES: Record<CADFormat, FormatProfile> = {
  ".sldprt": { category: "part",     testStrategy: "open_part",       handler: "SolidWorksAutomationBridge" },
  ".sldasm": { category: "assembly", testStrategy: "open_assembly",   handler: "SolidWorksAutomationBridge" },
  ".slddrw": { category: "drawing",  testStrategy: "open_drawing",    handler: "SolidWorksAutomationBridge" },
  ".ipt":    { category: "part",     testStrategy: "open_part",       handler: "InventorAutomationBridge" },
  ".iam":    { category: "assembly", testStrategy: "open_assembly",   handler: "InventorAutomationBridge" },
  ".idw":    { category: "drawing",  testStrategy: "open_drawing",    handler: "InventorAutomationBridge" },
  ".FCStd":  { category: "part",     testStrategy: "open_part",       handler: "FCStdNativeParserEngine" },
  ".f3d":    { category: "part",     testStrategy: "open_part",       handler: "F3DSQLiteParserEngine" },
  ".f3z":    { category: "part",     testStrategy: "open_part",       handler: "F3DSQLiteParserEngine" },
  ".mcx-8":  { category: "cam",      testStrategy: "open_cam",        handler: "MastercamAutomationBridge" },
  ".MCX":    { category: "cam",      testStrategy: "open_cam",        handler: "MastercamAutomationBridge" },
  ".mcam":   { category: "cam",      testStrategy: "open_cam",        handler: "MastercamAutomationBridge" },
  ".hmc":    { category: "cam",      testStrategy: "open_cam",        handler: "HyperMILLAutomationBridge" },
  ".step":   { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTStepReader" },
  ".stp":    { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTStepReader" },
  ".iges":   { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTIgesReader" },
  ".igs":    { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTIgesReader" },
  ".stl":    { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTMeshReader" },
  ".x_t":    { category: "kernel",   testStrategy: "import_kernel",   handler: "ParasolidKernelReader" },
  ".x_b":    { category: "kernel",   testStrategy: "import_kernel",   handler: "ParasolidKernelReader" },
  // U-CADC01 R13-TE-02 additions
  ".prt":    { category: "neutral",  testStrategy: "import_neutral",  handler: "OCCTStepReader" },
  ".dwg":    { category: "drawing",  testStrategy: "open_drawing" },
  ".dxf":    { category: "drawing",  testStrategy: "open_drawing" },
  ".sat":    { category: "kernel",   testStrategy: "import_kernel" },
  ".3dm":    { category: "neutral",  testStrategy: "import_neutral" },
};

// ── Pure classifier ───────────────────────────────────────────────────────────

/**
 * Map a single CAD format to its classification profile.
 * Exported for direct use by downstream engines without instantiating the class.
 *
 * @param format - Extension as recorded in master-index (case-sensitive match
 *                 against `CAD_FORMATS`; fallback lowercases when unknown).
 * @returns Category, test strategy, and preferred handler.
 */
export function classifyFormat(format: CADFormat | string): FormatProfile {
  const profile = FORMAT_PROFILES[format as CADFormat];
  if (profile) return profile;
  // Fallback: try case-insensitive lookup for defensive use
  const lower = String(format).toLowerCase();
  for (const [key, p] of Object.entries(FORMAT_PROFILES)) {
    if (key.toLowerCase() === lower) return p;
  }
  return { category: "unknown", testStrategy: "skip" };
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * CADFileClassifierEngine — tags every indexed CAD file with category and
 * downstream test strategy.
 */
export class CADFileClassifierEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADFileClassifierEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Per-file CAD classifier: part/assembly/drawing/CAM/neutral/kernel. " +
        "Emits test strategy tag consumed by CADRegressionTestOrchestrator.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "classify",
        description: "Classify every file in a MasterIndex or entry list",
        actions: ["cad_classify_run"],
      },
      {
        name: "classify_one",
        description: "Classify a single format string",
        actions: ["cad_classify_one"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") {
      return "input must be an object with `files` or `index`";
    }
    const o = input as Record<string, unknown>;
    if (!o.files && !o.index) {
      return "input must contain `files: CADFileEntry[]` or `index: MasterIndex`";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const o = input as { files?: CADFileEntry[]; index?: MasterIndex; options?: ClassifyOptions };
    const files: CADFileEntry[] = o.index?.files ?? o.files ?? [];
    return this.classify(files, o.options);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Classify every file in `files` and return a schema-validated summary.
   *
   * @param files - CADFileEntry[] (typically MasterIndex.files).
   * @param opts  - Classification options (defaults: includeClassifications=true).
   * @returns ClassificationSummary (histograms + per-file list).
   */
  classify(files: CADFileEntry[], opts: ClassifyOptions = {}): ClassificationSummary {
    const includeClassifications = opts.includeClassifications ?? true;

    const classifications: CADFileClassification[] = [];
    const byCategory: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    for (const f of files) {
      const profile = classifyFormat(f.format);
      byCategory[profile.category] = (byCategory[profile.category] ?? 0) + 1;
      byStrategy[profile.testStrategy] = (byStrategy[profile.testStrategy] ?? 0) + 1;
      const entry: CADFileClassification = {
        fileId: f.fileId,
        format: f.format,
        category: profile.category,
        testStrategy: profile.testStrategy,
        ...(profile.handler ? { handler: profile.handler } : {}),
      };
      if (includeClassifications) classifications.push(entry);
    }

    const summary: ClassificationSummary = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      totalFiles: files.length,
      byCategory,
      byStrategy,
      classifications,
    };

    // Defensive: assert conformance before returning
    ClassificationSummarySchema.parse(summary);
    return summary;
  }

  /**
   * Classify a single format string. Thin wrapper around classifyFormat()
   * for callers that prefer the engine surface.
   */
  classifyOne(format: CADFormat | string): CADFileClassification {
    const profile = classifyFormat(format);
    const entry = {
      fileId: "0".repeat(64), // placeholder — caller supplies real fileId downstream
      format: format as CADFormat,
      category: profile.category,
      testStrategy: profile.testStrategy,
      ...(profile.handler ? { handler: profile.handler } : {}),
    };
    return CADFileClassificationSchema.parse(entry);
  }
}

/** Singleton for dispatcher use. */
export const cadFileClassifierEngine = new CADFileClassifierEngine();
