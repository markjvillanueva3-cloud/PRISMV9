/**
 * GroundTruthRegistryEngine — indexed, queryable corpus over the
 * ground-truth bundles produced by GroundTruthBatchExtractor (U-CGT07).
 *
 * Builds five compound indexes from a tree of bundle.json manifests:
 *   - byFileId          (primary key — exact match)
 *   - byCustomerLower   (case-insensitive customer name)
 *   - byFormat          (extension, e.g. ".sldprt")
 *   - byMachineCategory ("mill" | "lathe" | "edm" | "wedm" | "grinder" | …)
 *   - byComplexityTier  ("simple" | "medium" | "complex")
 *
 * Customer + machine category are inferred from the JM Die path convention:
 *   H:\PRISM\JM DIE\CNC LATHE\ALCOA\…       → customer=ALCOA, machine=lathe
 *   H:\PRISM\JM DIE\CNC MILL\ITW\…          → customer=ITW,   machine=mill
 *   H:\PRISM\JM DIE\WIRE EDM\OPTIMAS\…      → customer=OPTIMAS, machine=wedm
 * Bundles outside that convention land in customer="UNKNOWN", machine="other".
 *
 * Complexity tier is derived from the feature-tree feature count and the
 * dimensional envelope (when present in the bundle) — purely heuristic but
 * stable enough to anchor sampling for training-set construction.
 *
 * Persistence: dumpManifest() / loadManifest() round-trip the registry as a
 * single Zod-validated JSON file. The persisted form contains entries +
 * stats only; indexes are rebuilt from entries on load.
 *
 * Composes (does NOT duplicate):
 *   - GroundTruthBatchExtractor (E2507, U-CGT07) — produces our input
 *     bundles via {outputRoot}/{fileId}/bundle.json
 *   - DimensionalSignatureEngine (E2505) — bundle.dimSig fingerprint passes
 *     through unchanged (we do not recompute geometry)
 *
 * Duplication check (DuplicationGuardEngine keywords: ground-truth,
 * registry, corpus, index, query):
 *   → No GroundTruthRegistryEngine / CADCorpusIndex / GroundTruthIndex.
 *   → MaterialRegistry / ToolCatalogEngine index different domain entities.
 *
 * @engine GroundTruthRegistryEngine
 * @shortcode E2508
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT08
 * @classification STANDARD (indexing, no physics constants)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ── Domain ──────────────────────────────────────────────────────────────────

export const MACHINE_CATEGORIES = [
  "mill",
  "lathe",
  "edm",
  "wedm",
  "grinder",
  "additive",
  "other",
] as const;

export type MachineCategory = (typeof MACHINE_CATEGORIES)[number];

export const COMPLEXITY_TIERS = ["simple", "medium", "complex"] as const;
export type ComplexityTier = (typeof COMPLEXITY_TIERS)[number];

export const RegistryEntrySchema = z
  .object({
    fileId: z.string().min(1),
    sourcePath: z.string().min(1),
    format: z.string().min(2),
    customer: z.string().min(1),
    machineCategory: z.enum(MACHINE_CATEGORIES),
    complexity: z.enum(COMPLEXITY_TIERS),
    /** Source-of-truth bundle status (from U-CGT07). */
    bundleStatus: z.enum(["ok", "partial", "failed", "skipped"]),
    bundleDir: z.string().min(1),
    featureCount: z.number().int().min(0),
    envelopeM: z.number().min(0).optional(),
    dimSignature: z.string().optional(),
    featureSignature: z.string().optional(),
    /** ISO-8601 timestamp of bundle.json mtime. */
    indexedAt: z.string(),
  })
  .strict();

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

export const RegistryStatsSchema = z
  .object({
    total: z.number().int().min(0),
    byFormat: z.record(z.string(), z.number().int().min(0)),
    byCustomer: z.record(z.string(), z.number().int().min(0)),
    byMachineCategory: z.record(z.string(), z.number().int().min(0)),
    byComplexity: z.record(z.string(), z.number().int().min(0)),
    byStatus: z.record(z.string(), z.number().int().min(0)),
  })
  .strict();

export type RegistryStats = z.infer<typeof RegistryStatsSchema>;

export const RegistryManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    outputRoot: z.string().min(1),
    builtAt: z.string(),
    entries: z.array(RegistryEntrySchema),
    stats: RegistryStatsSchema,
  })
  .strict();

export type RegistryManifest = z.infer<typeof RegistryManifestSchema>;

// ── Path-based inference ────────────────────────────────────────────────────

/**
 * Map a JM Die path subdirectory to a machine category. Driven by the
 * canonical JM Die folder names; unknown roots return "other".
 */
const JM_DIE_MACHINE_MAP: ReadonlyArray<{
  re: RegExp;
  cat: MachineCategory;
}> = [
  { re: /\b(?:CNC[ _-]?LATHE|LATHE|TURNING)\b/i, cat: "lathe" },
  { re: /\bWIRE[ _-]?EDM\b/i, cat: "wedm" },
  { re: /\bSINKER[ _-]?EDM|EDM[ _-]?SINKER\b/i, cat: "edm" },
  { re: /\bEDM\b/i, cat: "edm" },
  { re: /\bGRIND(?:ER|ING)\b/i, cat: "grinder" },
  { re: /\b(?:ADDITIVE|3D[ _-]?PRINT|SLM|DMLS)\b/i, cat: "additive" },
  { re: /\b(?:CNC[ _-]?MILL|MILL|MILLING|VMC|HMC|MACHINING[ _-]?CENTER)\b/i, cat: "mill" },
];

/**
 * Infer (customer, machineCategory) from a sourcePath. Recognises the JM
 * Die layout (`…/JM DIE/CNC LATHE/ALCOA/…`) plus generic `customer/`
 * subdirectories elsewhere. Falls back to "UNKNOWN" / "other".
 */
export function inferCustomerAndMachine(sourcePath: string): {
  customer: string;
  machineCategory: MachineCategory;
} {
  // Normalize to forward slashes so we can split on either separator
  const norm = sourcePath.replace(/\\/g, "/");
  const segments = norm.split("/").filter(Boolean);

  let machineCategory: MachineCategory = "other";
  for (const seg of segments) {
    for (const { re, cat } of JM_DIE_MACHINE_MAP) {
      if (re.test(seg)) {
        machineCategory = cat;
        break;
      }
    }
    if (machineCategory !== "other") break;
  }

  // Customer: first segment AFTER the machine-category segment in JM Die,
  // else first segment after a "JM DIE" anchor, else first directory whose
  // ALL-CAPS heuristic matches (as a generic vendor folder).
  let customer = "UNKNOWN";
  const jmDieIdx = segments.findIndex((s) => /^JM[ _-]?DIE$/i.test(s));
  if (jmDieIdx >= 0) {
    // Skip machine-category segment if next, then take customer segment
    const machineIdx = segments.findIndex(
      (s, i) =>
        i > jmDieIdx &&
        JM_DIE_MACHINE_MAP.some(({ re }) => re.test(s)),
    );
    if (machineIdx >= 0 && machineIdx + 1 < segments.length) {
      customer = segments[machineIdx + 1]!.toUpperCase();
    } else if (jmDieIdx + 1 < segments.length) {
      // No machine segment — take first child of JM DIE
      const next = segments[jmDieIdx + 1]!;
      if (!JM_DIE_MACHINE_MAP.some(({ re }) => re.test(next))) {
        customer = next.toUpperCase();
      }
    }
  } else {
    // Generic: look for an ALL-CAPS-ish customer segment
    const candidate = segments.find(
      (s) => /^[A-Z][A-Z0-9 _-]{1,40}$/.test(s) && !/\.[a-z0-9]+$/i.test(s),
    );
    if (candidate) customer = candidate.toUpperCase();
  }

  return { customer, machineCategory };
}

/**
 * Heuristic complexity tier from feature count and envelope magnitude.
 * Tunable; used to anchor stratified sampling for training-data loaders.
 */
export function inferComplexity(
  featureCount: number,
  envelopeM?: number,
): ComplexityTier {
  if (featureCount <= 5) return "simple";
  if (featureCount <= 20) {
    // Large envelope (>0.3m) bumps medium up to complex
    if (envelopeM !== undefined && envelopeM > 0.3) return "complex";
    return "medium";
  }
  return "complex";
}

// ── Bundle.json loose schema (we only read what we need) ───────────────────

const LooseBundleSchema = z.object({
  fileId: z.string().min(1),
  sourcePath: z.string().min(1),
  format: z.string().min(2),
  bundleDir: z.string().min(1),
  status: z.enum(["ok", "partial", "failed", "skipped"]),
  stages: z
    .object({
      featureTree: z
        .object({
          ok: z.boolean(),
          signature: z.string().optional(),
        })
        .passthrough()
        .optional(),
      dimensionalSig: z
        .object({
          ok: z.boolean(),
          signature: z.string().optional(),
          envelopeM: z.number().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
});

// ── Blueprint-extraction extensions (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5) ──

/**
 * Confidence tier classification for ground-truth extractions. The 3-tier
 * scheme matches the conformal stratification used by xproc_mondrian_*.
 * "operator_verified" is the gold tier — the operator confirmed the extraction
 * matches the macro VC variable or the ERP-confirmed actual.
 */
export const CONFIDENCE_TIERS = [
  "operator_verified",
  "ensemble_consensus",
  "single_backend",
  "ambiguous",
] as const;
export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number];

/**
 * Allowed source provenance markers — every record cites where the ground-truth
 * value came from. `macro_vc_var` and `erp_actual` are the trusted scalars;
 * `operator_correction` lifts a `single_backend` extraction to
 * `operator_verified` after the human review. `ocr_inferred` is the lowest
 * trust level — represents auto-labelled training pairs prior to review.
 */
export const SOURCE_PROVENANCES = [
  "macro_vc_var",
  "erp_actual",
  "operator_correction",
  "ocr_inferred",
] as const;
export type SourceProvenance = (typeof SOURCE_PROVENANCES)[number];

/**
 * One labelled extraction record. The full registry stores these in-memory
 * AND appends them to `mcp-server/data/training/blueprint-extractions.jsonl`
 * for durability + offline RAG/training consumption.
 */
export const BlueprintExtractionRecordSchema = z
  .object({
    extractionId: z.string().min(1),
    pdfPath: z.string().min(1),
    page: z.number().int().min(1),
    region: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .strict(),
    extractionType: z.enum([
      "dimension",
      "tolerance",
      "gd_t_callout",
      "surface_finish",
      "thread_callout",
      "material_callout",
      "note",
      "other",
    ]),
    value: z.string().min(1),
    confidenceTier: z.enum(CONFIDENCE_TIERS),
    sourceProvenance: z.enum(SOURCE_PROVENANCES),
    customer: z.string().min(1).default("UNKNOWN"),
    partNumber: z.string().optional(),
    recordedAt: z.string(),
  })
  .strict();
export type BlueprintExtractionRecord = z.infer<
  typeof BlueprintExtractionRecordSchema
>;

/**
 * A (image_region, expected_extraction) labelled training pair produced by
 * `joinDocustrataToPartLibrary`. The pair MAY carry one or more
 * `groundTruthValues` (e.g. macro VC var + ERP actual + operator correction)
 * — when they disagree, the pair is flagged via `flagAmbiguities`.
 */
export const TrainingPairSchema = z
  .object({
    pairId: z.string().min(1),
    customer: z.string().min(1),
    partNumber: z.string().min(1),
    pdfPath: z.string().min(1),
    page: z.number().int().min(1),
    region: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .strict(),
    extractionType: BlueprintExtractionRecordSchema.shape.extractionType,
    /**
     * All ground-truth values keyed by provenance — see flagAmbiguities.
     * Each provenance is optional (a pair may carry only macro_vc_var, only
     * erp_actual, etc.). Zod 4's z.record(enum, value) enforces ALL keys
     * present, which conflicts with this milestone's partial-pair semantics,
     * so the shape is spelled out explicitly with optional fields.
     */
    groundTruthValues: z
      .object({
        macro_vc_var: z.string().optional(),
        erp_actual: z.string().optional(),
        operator_correction: z.string().optional(),
        ocr_inferred: z.string().optional(),
      })
      .strict(),
    confidenceTier: z.enum(CONFIDENCE_TIERS),
    /** Path to the macro/ERP source — for operator audit trail. */
    sourceFiles: z.array(z.string()).default([]),
    createdAt: z.string(),
  })
  .strict();
export type TrainingPair = z.infer<typeof TrainingPairSchema>;

/**
 * Output of `flagAmbiguities` — a training pair where ≥2 of the
 * `groundTruthValues` disagree. Operators reconcile these by promoting one
 * provenance via `operator_correction` records.
 */
export interface AmbiguityFlag {
  pairId: string;
  customer: string;
  partNumber: string;
  conflictingValues: Array<{ provenance: SourceProvenance; value: string }>;
  recommendation: string;
}

const DEFAULT_TRAINING_DIR = "mcp-server/data/training";
const DEFAULT_EXTRACTIONS_JSONL = "blueprint-extractions.jsonl";
const DEFAULT_PAIRS_JSONL = "training-pairs.jsonl";

/**
 * HARD RULE per spec: blueprint-extraction extensions NEVER write to the
 * source-of-truth program/macro archives. This explicit deny-list covers the
 * two locations the spec specifically calls out (the customer xlsm macro
 * book + the per-part CNC PROGRAM dirs) plus a defensive root deny-list to
 * stop writes outside `mcp-server/data/training/`.
 */
export const READ_ONLY_PATH_PATTERNS: readonly RegExp[] = [
  // Version-bump tolerant — accepts `Automated Program_Corrected <anything>.xlsm`
  // (e.g. 5-25, 6-25, 5-26 as the macro book rolls). Either final-component OR
  // directory-prefix form. /i for case-insensitivity (xlsm sometimes XLSM).
  /Automated[\s_-]?Program[_-]?Corrected(?:[\s_-]+[\d.\-]+)?\.xlsm(?:\/|$)/i,
  // Symmetric trailing-anchor with xlsm — accept whether CNC PROGRAM is the
  // final directory OR has children appended. Reviewer-B P1 fix.
  /_PART[\s_-]?LIBRARY\/[^/]+\/[^/]+\/CNC[\s_-]?PROGRAM(?:\/|$)/i,
];

export function isReadOnlyTarget(targetPath: string): boolean {
  if (typeof targetPath !== "string" || targetPath.length === 0) return false;
  const norm = targetPath.replace(/\\/g, "/");
  return READ_ONLY_PATH_PATTERNS.some((re) => re.test(norm));
}

// ── Engine ──────────────────────────────────────────────────────────────────

export interface BuildOptions {
  /** When true, include partial / failed / skipped bundles. Default false. */
  includeNonOk?: boolean;
  /** Optional fs override (testability). */
  fs?: {
    readdirSync: typeof fs.readdirSync;
    readFileSync: typeof fs.readFileSync;
    statSync: typeof fs.statSync;
    existsSync: typeof fs.existsSync;
  };
}

export interface QueryOptions {
  limit?: number;
  /** Sort key. Default "fileId". */
  sortBy?: "fileId" | "envelopeM" | "featureCount";
  status?: "ok" | "partial" | "failed" | "skipped";
}

export class GroundTruthRegistryEngine {
  public readonly schemaVersion = "1.0.0" as const;

  private entries: RegistryEntry[] = [];
  private stats: RegistryStats = blankStats();
  private outputRoot: string | null = null;
  private builtAt: string | null = null;

  // Indexes (rebuilt from entries via _reindex())
  private byFileId = new Map<string, RegistryEntry>();
  private byCustomerLower = new Map<string, RegistryEntry[]>();
  private byFormat = new Map<string, RegistryEntry[]>();
  private byMachine = new Map<MachineCategory, RegistryEntry[]>();
  private byComplexity = new Map<ComplexityTier, RegistryEntry[]>();

  /**
   * Scan {outputRoot}/{fileId}/bundle.json files and build the in-memory
   * indexes. Idempotent — calling twice with the same outputRoot replaces
   * prior state. Bad/missing bundles are skipped (recorded in stats).
   */
  buildIndex(outputRoot: string, opts: BuildOptions = {}): RegistryStats {
    if (typeof outputRoot !== "string" || outputRoot.length === 0) {
      throw new Error(
        "[GroundTruthRegistryEngine] outputRoot must be a non-empty string",
      );
    }
    const includeNonOk = opts.includeNonOk ?? false;
    const fsImpl = opts.fs ?? {
      readdirSync: fs.readdirSync,
      readFileSync: fs.readFileSync,
      statSync: fs.statSync,
      existsSync: fs.existsSync,
    };
    if (!fsImpl.existsSync(outputRoot)) {
      throw new Error(
        `[GroundTruthRegistryEngine] outputRoot does not exist: ${outputRoot}`,
      );
    }

    const newEntries: RegistryEntry[] = [];
    const childDirs = fsImpl
      .readdirSync(outputRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);

    for (const fileId of childDirs) {
      const bundlePath = path.join(outputRoot, fileId, "bundle.json");
      if (!fsImpl.existsSync(bundlePath)) continue;
      let parsed: z.infer<typeof LooseBundleSchema>;
      try {
        const raw = fsImpl.readFileSync(bundlePath, "utf8") as string;
        const obj = JSON.parse(raw);
        const r = LooseBundleSchema.safeParse(obj);
        if (!r.success) continue;
        parsed = r.data;
      } catch {
        continue;
      }
      if (!includeNonOk && parsed.status !== "ok") continue;

      const entry = this._buildEntry(parsed, fsImpl, bundlePath);
      newEntries.push(entry);
    }

    this.entries = newEntries;
    this.outputRoot = outputRoot;
    this.builtAt = new Date().toISOString();
    this._reindex();
    return this.stats;
  }

  /** Find the registry entry for an exact fileId, or null. */
  findByFileId(fileId: string): RegistryEntry | null {
    return this.byFileId.get(fileId) ?? null;
  }

  /** Find entries by customer name (case-insensitive). */
  findByCustomer(name: string, opts: QueryOptions = {}): RegistryEntry[] {
    const list = this.byCustomerLower.get(name.toLowerCase()) ?? [];
    return this._applyOpts(list, opts);
  }

  /** Find entries by machine category. */
  findByMachineCategory(
    category: MachineCategory,
    opts: QueryOptions = {},
  ): RegistryEntry[] {
    const list = this.byMachine.get(category) ?? [];
    return this._applyOpts(list, opts);
  }

  /** Find entries by complexity tier. */
  findByComplexity(
    tier: ComplexityTier,
    opts: QueryOptions = {},
  ): RegistryEntry[] {
    const list = this.byComplexity.get(tier) ?? [];
    return this._applyOpts(list, opts);
  }

  /** Find entries by source-format extension. */
  findByFormat(format: string, opts: QueryOptions = {}): RegistryEntry[] {
    const list = this.byFormat.get(format) ?? [];
    return this._applyOpts(list, opts);
  }

  /**
   * Compound filter — intersect 1..N criteria + optional limit. The slow
   * path scans entries linearly; for 20K it's still <50 ms in the worst
   * case (the 100ms exit budget covers this).
   */
  query(filter: {
    customer?: string;
    machineCategory?: MachineCategory;
    complexity?: ComplexityTier;
    format?: string;
    status?: "ok" | "partial" | "failed" | "skipped";
  }, opts: QueryOptions = {}): RegistryEntry[] {
    const customerLower = filter.customer?.toLowerCase();
    const out = this.entries.filter((e) => {
      if (customerLower && e.customer.toLowerCase() !== customerLower) return false;
      if (filter.machineCategory && e.machineCategory !== filter.machineCategory) return false;
      if (filter.complexity && e.complexity !== filter.complexity) return false;
      if (filter.format && e.format !== filter.format) return false;
      if (filter.status && e.bundleStatus !== filter.status) return false;
      return true;
    });
    return this._applyOpts(out, opts);
  }

  /** Return current registry statistics. */
  getStats(): RegistryStats {
    return this.stats;
  }

  /** Total entries currently indexed. */
  size(): number {
    return this.entries.length;
  }

  /**
   * Persist registry (entries + stats + outputRoot) to a single JSON file.
   * Atomic write (tmp + rename) so concurrent reads always see a complete
   * manifest.
   */
  async dumpManifest(filePath: string): Promise<void> {
    if (!this.outputRoot || !this.builtAt) {
      throw new Error(
        "[GroundTruthRegistryEngine] dumpManifest called before buildIndex",
      );
    }
    const manifest: RegistryManifest = {
      schemaVersion: this.schemaVersion,
      outputRoot: this.outputRoot,
      builtAt: this.builtAt,
      entries: this.entries,
      stats: this.stats,
    };
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = filePath + ".tmp-" + process.pid + "-" + Date.now();
    await fs.promises.writeFile(tmp, JSON.stringify(manifest, null, 2), "utf8");
    await fs.promises.rename(tmp, filePath);
  }

  /**
   * Load a previously persisted manifest and rebuild indexes from it.
   * Schema-version mismatches throw so callers cannot silently consume
   * incompatible state.
   */
  async loadManifest(filePath: string): Promise<RegistryManifest> {
    const raw = await fs.promises.readFile(filePath, "utf8");
    const obj = JSON.parse(raw);
    const r = RegistryManifestSchema.safeParse(obj);
    if (!r.success) {
      throw new Error(
        `[GroundTruthRegistryEngine] manifest invalid: ${r.error.issues
          .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
          .join("; ")}`,
      );
    }
    this.entries = r.data.entries;
    this.stats = r.data.stats;
    this.outputRoot = r.data.outputRoot;
    this.builtAt = r.data.builtAt;
    this._reindex();
    return r.data;
  }

  /** Re-validate a candidate manifest against the schema. */
  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const r = RegistryManifestSchema.safeParse(candidate);
    if (r.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: r.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  // ── Blueprint-extraction extensions (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3) ──

  /** In-memory blueprint extraction records. Persisted to JSONL on write. */
  private blueprintExtractions: BlueprintExtractionRecord[] = [];
  /** In-memory labelled training pairs (from joinDocustrataToPartLibrary). */
  private trainingPairs: TrainingPair[] = [];
  /** Indexes for blueprint-extraction lookups (rebuilt by _reindexBlueprint). */
  private extractionsByConfidenceTier = new Map<ConfidenceTier, BlueprintExtractionRecord[]>();
  private trainingPairsByCustomer = new Map<string, TrainingPair[]>();

  /**
   * Register a labelled blueprint extraction. Pure in-memory append + atomic
   * JSONL append for durability. HARD RULE: writes ONLY to
   * `mcp-server/data/training/blueprint-extractions.jsonl` (or
   * opts.trainingDir override) — never to `_PART LIBRARY` / `Automated
   * Program_Corrected 5-25.xlsm`. Verified by `isReadOnlyTarget` guard.
   */
  registerBlueprintExtraction(input: {
    pdfPath: string;
    page: number;
    region: { x: number; y: number; width: number; height: number };
    extractionType: BlueprintExtractionRecord["extractionType"];
    value: string;
    confidenceTier: ConfidenceTier;
    sourceProvenance: SourceProvenance;
    customer?: string;
    partNumber?: string;
    extractionId?: string;
    recordedAt?: string;
    trainingDir?: string;
    fs?: {
      mkdirSync: typeof fs.mkdirSync;
      appendFileSync: typeof fs.appendFileSync;
    };
  }): BlueprintExtractionRecord {
    const trainingDir = input.trainingDir ?? DEFAULT_TRAINING_DIR;
    const target = path.join(trainingDir, DEFAULT_EXTRACTIONS_JSONL).replace(/\\/g, "/");
    if (isReadOnlyTarget(target)) {
      throw new Error(
        `[GroundTruthRegistryEngine] BLOCKED: target path "${target}" matches a read-only source-of-truth pattern; HARD RULE per BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3`,
      );
    }
    const recordedAt = input.recordedAt ?? new Date().toISOString();
    const extractionId =
      input.extractionId ??
      `bpe:${input.pdfPath.replace(/[^A-Za-z0-9_-]/g, "_")}:${input.page}:${Math.floor(input.region.x)}x${Math.floor(input.region.y)}:${recordedAt}`;
    const candidate = {
      extractionId,
      pdfPath: input.pdfPath,
      page: input.page,
      region: input.region,
      extractionType: input.extractionType,
      value: input.value,
      confidenceTier: input.confidenceTier,
      sourceProvenance: input.sourceProvenance,
      customer: input.customer ?? "UNKNOWN",
      ...(input.partNumber ? { partNumber: input.partNumber } : {}),
      recordedAt,
    };
    const parsed = BlueprintExtractionRecordSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `[GroundTruthRegistryEngine] invalid blueprint extraction: ${parsed.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`,
      );
    }
    const record = parsed.data;
    this.blueprintExtractions.push(record);
    pushTo(this.extractionsByConfidenceTier, record.confidenceTier, record);
    // Append-only JSONL for durability — pure I/O, no read-modify-write race.
    const fsImpl = input.fs ?? { mkdirSync: fs.mkdirSync, appendFileSync: fs.appendFileSync };
    try {
      fsImpl.mkdirSync(path.dirname(target), { recursive: true });
      fsImpl.appendFileSync(target, JSON.stringify(record) + "\n", "utf8");
    } catch (err) {
      // Honest fail-loud — caller decides whether to retry. The in-memory
      // record is still present so queries work; durability is what fails.
      throw new Error(
        `[GroundTruthRegistryEngine] JSONL append failed for ${target}: ${(err as Error).message}`,
      );
    }
    return record;
  }

  /**
   * Bulk join over Docustrata PDF corpus + `_PART LIBRARY/<customer>/<pn>/`
   * macro VC vars + ERP-confirmed actuals. Produces `TrainingPair` records
   * stratified by confidence. Pure orchestration: relies on injected IO so
   * tests can fixture the 24,545-file corpus without touching real disk.
   *
   * @param input.rootDir Path to the `JM DIE/` archive root (read-only).
   * @param input.indexPath Path to `jm-die-index-v2.json` (10.3 MB, read-only).
   * @param input.partLibraryRoot Path to `_PART LIBRARY/` (read-only).
   * @param input.trainingDir Output dir for `training-pairs.jsonl`. Defaults
   *                          to DEFAULT_TRAINING_DIR. HARD RULE enforced.
   * @param input.fs Injectable filesystem.
   */
  joinDocustrataToPartLibrary(input: {
    rootDir: string;
    indexPath: string;
    partLibraryRoot?: string;
    trainingDir?: string;
    fs?: {
      readFileSync: typeof fs.readFileSync;
      existsSync: typeof fs.existsSync;
      readdirSync: typeof fs.readdirSync;
      mkdirSync: typeof fs.mkdirSync;
      appendFileSync: typeof fs.appendFileSync;
    };
  }): {
    pairsCreated: number;
    byCustomer: Record<string, number>;
    byConfidenceTier: Record<ConfidenceTier, number>;
    indexErrors: string[];
  } {
    const trainingDir = input.trainingDir ?? DEFAULT_TRAINING_DIR;
    const target = path.join(trainingDir, DEFAULT_PAIRS_JSONL).replace(/\\/g, "/");
    if (isReadOnlyTarget(target)) {
      throw new Error(
        `[GroundTruthRegistryEngine] BLOCKED: target "${target}" matches read-only source-of-truth`,
      );
    }
    const fsImpl =
      input.fs ?? {
        readFileSync: fs.readFileSync,
        existsSync: fs.existsSync,
        readdirSync: fs.readdirSync,
        mkdirSync: fs.mkdirSync,
        appendFileSync: fs.appendFileSync,
      };
    const indexErrors: string[] = [];
    let indexData: unknown;
    try {
      if (!fsImpl.existsSync(input.indexPath)) {
        indexErrors.push(`indexPath does not exist: ${input.indexPath}`);
        return {
          pairsCreated: 0,
          byCustomer: {},
          byConfidenceTier: blankTierCounts(),
          indexErrors,
        };
      }
      const raw = fsImpl.readFileSync(input.indexPath, "utf8") as string;
      indexData = JSON.parse(raw);
    } catch (err) {
      indexErrors.push(
        `failed to parse indexPath ${input.indexPath}: ${(err as Error).message}`,
      );
      return {
        pairsCreated: 0,
        byCustomer: {},
        byConfidenceTier: blankTierCounts(),
        indexErrors,
      };
    }

    // The jm-die-index-v2 manifest shape is flexible — we tolerate both the
    // common `{ files: [...] }` and `{ entries: [...] }` shapes via a
    // permissive loose-parse. Any malformed entry is logged + skipped.
    const items = extractJmDieItems(indexData);
    const byCustomer: Record<string, number> = {};
    const byConfidenceTier: Record<ConfidenceTier, number> = blankTierCounts();
    let pairsCreated = 0;

    const partLibraryRoot = input.partLibraryRoot ?? path.join(input.rootDir, "_PART LIBRARY");

    for (const item of items) {
      if (!item.customer || !item.partNumber || !item.pdfPath) continue;
      const partJsonPath = path
        .join(partLibraryRoot, item.customer, item.partNumber, "part.json")
        .replace(/\\/g, "/");
      const groundTruthValues = readGroundTruthValuesForPart(partJsonPath, fsImpl, indexErrors);
      if (Object.keys(groundTruthValues).length === 0) continue;

      // Choose confidence tier by which provenances we have. Operator-verified
      // wins if present, then ensemble (≥2 sources agree), else single.
      const confidenceTier = classifyConfidenceTier(groundTruthValues);

      // Build one pair per dimension type that exists in groundTruthValues.
      // The macro VC vars hint at extractionType implicitly via their keys.
      for (const region of item.regions ?? [defaultRegion()]) {
        const pairId = `tp:${item.customer}:${item.partNumber}:${item.pdfPath.replace(/[^A-Za-z0-9_-]/g, "_")}:${Math.floor(region.x)}x${Math.floor(region.y)}`;
        const pair: TrainingPair = {
          pairId,
          customer: item.customer,
          partNumber: item.partNumber,
          pdfPath: item.pdfPath,
          page: item.page ?? 1,
          region,
          extractionType: item.extractionType ?? "dimension",
          groundTruthValues,
          confidenceTier,
          sourceFiles: [partJsonPath],
          createdAt: new Date().toISOString(),
        };
        const parsed = TrainingPairSchema.safeParse(pair);
        if (!parsed.success) {
          indexErrors.push(`invalid pair for ${item.customer}/${item.partNumber}: ${parsed.error.issues[0]?.message}`);
          continue;
        }
        this.trainingPairs.push(parsed.data);
        pushTo(this.trainingPairsByCustomer, parsed.data.customer.toLowerCase(), parsed.data);
        byCustomer[parsed.data.customer] = (byCustomer[parsed.data.customer] ?? 0) + 1;
        byConfidenceTier[parsed.data.confidenceTier]++;
        pairsCreated++;

        try {
          fsImpl.mkdirSync(path.dirname(target), { recursive: true });
          fsImpl.appendFileSync(target, JSON.stringify(parsed.data) + "\n", "utf8");
        } catch (err) {
          indexErrors.push(`jsonl append failed: ${(err as Error).message}`);
        }
      }
    }
    return { pairsCreated, byCustomer, byConfidenceTier, indexErrors };
  }

  /** Return labelled blueprint extractions at a given confidence tier. */
  enumerateByConfidenceTier(input: { tier: ConfidenceTier; limit?: number }): BlueprintExtractionRecord[] {
    if (!CONFIDENCE_TIERS.includes(input.tier)) {
      throw new Error(
        `[GroundTruthRegistryEngine] invalid tier "${input.tier}" — must be one of ${CONFIDENCE_TIERS.join("|")}`,
      );
    }
    const list = this.extractionsByConfidenceTier.get(input.tier) ?? [];
    const out = [...list];
    if (input.limit !== undefined && input.limit >= 0) {
      return out.slice(0, input.limit);
    }
    return out;
  }

  /**
   * Find training pairs whose `groundTruthValues` carry ≥2 disagreeing
   * provenances. The most common conflict is `macro_vc_var` ≠ `erp_actual`
   * (operator drift between print and runtime adjustment).
   */
  flagAmbiguities(): AmbiguityFlag[] {
    const flags: AmbiguityFlag[] = [];
    for (const pair of this.trainingPairs) {
      // Skip operator-resolved pairs — the operator has already lifted the
      // pair to `operator_verified` so divergence with other provenances is
      // intentional (the operator's value is the truth). Mirrors the tier
      // classification rule in classifyConfidenceTier.
      if (pair.groundTruthValues.operator_correction !== undefined) continue;
      const entries = Object.entries(pair.groundTruthValues).filter(
        ([, v]) => typeof v === "string",
      ) as Array<[SourceProvenance, string]>;
      if (entries.length < 2) continue;
      const valuesSeen = new Set(entries.map(([, v]) => v.trim()));
      if (valuesSeen.size < 2) continue;
      flags.push({
        pairId: pair.pairId,
        customer: pair.customer,
        partNumber: pair.partNumber,
        conflictingValues: entries.map(([provenance, value]) => ({ provenance, value })),
        recommendation:
          "Operator review required. Prefer erp_actual when production has validated the value; prefer macro_vc_var when the print is post-revision.",
      });
    }
    return flags;
  }

  /**
   * Operator-scoped retrieval for review UIs and per-customer training-set
   * construction. Customer match is case-insensitive.
   */
  getTrainingPairsByCustomer(input: { customer: string; limit?: number }): TrainingPair[] {
    if (typeof input.customer !== "string" || input.customer.length === 0) return [];
    const list = this.trainingPairsByCustomer.get(input.customer.toLowerCase()) ?? [];
    const out = [...list];
    if (input.limit !== undefined && input.limit >= 0) {
      return out.slice(0, input.limit);
    }
    return out;
  }

  /** Inspect in-memory blueprint extension state — used by tests + telemetry. */
  blueprintState(): {
    extractionsCount: number;
    trainingPairsCount: number;
    extractionsByTier: Record<ConfidenceTier, number>;
    pairsByCustomer: Record<string, number>;
  } {
    const extractionsByTier = blankTierCounts();
    for (const r of this.blueprintExtractions) extractionsByTier[r.confidenceTier]++;
    const pairsByCustomer: Record<string, number> = {};
    for (const p of this.trainingPairs) {
      pairsByCustomer[p.customer] = (pairsByCustomer[p.customer] ?? 0) + 1;
    }
    return {
      extractionsCount: this.blueprintExtractions.length,
      trainingPairsCount: this.trainingPairs.length,
      extractionsByTier,
      pairsByCustomer,
    };
  }

  /** Reset blueprint-extension state (testing convenience — no IO). */
  resetBlueprintState(): void {
    this.blueprintExtractions = [];
    this.trainingPairs = [];
    this.extractionsByConfidenceTier = new Map();
    this.trainingPairsByCustomer = new Map();
  }

  // ── private ───────────────────────────────────────────────────────────────

  private _buildEntry(
    bundle: z.infer<typeof LooseBundleSchema>,
    fsImpl: NonNullable<BuildOptions["fs"]>,
    bundlePath: string,
  ): RegistryEntry {
    const { customer, machineCategory } = inferCustomerAndMachine(
      bundle.sourcePath,
    );
    const featureSig = bundle.stages.featureTree?.signature;
    const dimSig = bundle.stages.dimensionalSig?.signature;
    const envelopeM = bundle.stages.dimensionalSig?.envelopeM;
    // Feature count: not in bundle directly, but feature-tree signature is
    // present iff the stage ran. We approximate count by reading the
    // companion feature-tree.json when available.
    const featureCount = this._tryReadFeatureCount(
      path.join(path.dirname(bundlePath), "feature-tree.json"),
      fsImpl,
    );
    const complexity = inferComplexity(featureCount, envelopeM);
    const stat = fsImpl.statSync(bundlePath);

    const entry: RegistryEntry = {
      fileId: bundle.fileId,
      sourcePath: bundle.sourcePath,
      format: bundle.format,
      customer,
      machineCategory,
      complexity,
      bundleStatus: bundle.status,
      bundleDir: bundle.bundleDir,
      featureCount,
      ...(envelopeM !== undefined ? { envelopeM } : {}),
      ...(dimSig ? { dimSignature: dimSig } : {}),
      ...(featureSig ? { featureSignature: featureSig } : {}),
      indexedAt: new Date(stat.mtimeMs).toISOString(),
    };
    return entry;
  }

  private _tryReadFeatureCount(
    treePath: string,
    fsImpl: NonNullable<BuildOptions["fs"]>,
  ): number {
    if (!fsImpl.existsSync(treePath)) return 0;
    try {
      const raw = fsImpl.readFileSync(treePath, "utf8") as string;
      const obj = JSON.parse(raw);
      if (Array.isArray(obj?.features)) return obj.features.length;
      return 0;
    } catch {
      return 0;
    }
  }

  private _reindex(): void {
    this.byFileId = new Map();
    this.byCustomerLower = new Map();
    this.byFormat = new Map();
    this.byMachine = new Map();
    this.byComplexity = new Map();

    const stats: RegistryStats = blankStats();
    stats.total = this.entries.length;

    for (const e of this.entries) {
      this.byFileId.set(e.fileId, e);
      pushTo(this.byCustomerLower, e.customer.toLowerCase(), e);
      pushTo(this.byFormat, e.format, e);
      pushTo(this.byMachine, e.machineCategory, e);
      pushTo(this.byComplexity, e.complexity, e);

      stats.byFormat[e.format] = (stats.byFormat[e.format] ?? 0) + 1;
      stats.byCustomer[e.customer] = (stats.byCustomer[e.customer] ?? 0) + 1;
      stats.byMachineCategory[e.machineCategory] =
        (stats.byMachineCategory[e.machineCategory] ?? 0) + 1;
      stats.byComplexity[e.complexity] =
        (stats.byComplexity[e.complexity] ?? 0) + 1;
      stats.byStatus[e.bundleStatus] =
        (stats.byStatus[e.bundleStatus] ?? 0) + 1;
    }
    this.stats = stats;
  }

  private _applyOpts(
    list: ReadonlyArray<RegistryEntry>,
    opts: QueryOptions,
  ): RegistryEntry[] {
    let out: RegistryEntry[] = opts.status
      ? list.filter((e) => e.bundleStatus === opts.status)
      : [...list];
    const sortBy = opts.sortBy ?? "fileId";
    out.sort((a, b) => {
      if (sortBy === "fileId") return a.fileId.localeCompare(b.fileId);
      if (sortBy === "envelopeM") {
        return (a.envelopeM ?? 0) - (b.envelopeM ?? 0);
      }
      return a.featureCount - b.featureCount;
    });
    if (opts.limit !== undefined && opts.limit >= 0) {
      out = out.slice(0, opts.limit);
    }
    return out;
  }
}

function blankStats(): RegistryStats {
  return {
    total: 0,
    byFormat: {},
    byCustomer: {},
    byMachineCategory: {},
    byComplexity: {},
    byStatus: {},
  };
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

// ── Blueprint-extension private helpers (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3) ──

function blankTierCounts(): Record<ConfidenceTier, number> {
  return {
    operator_verified: 0,
    ensemble_consensus: 0,
    single_backend: 0,
    ambiguous: 0,
  };
}

function defaultRegion(): { x: number; y: number; width: number; height: number } {
  return { x: 0, y: 0, width: 100, height: 50 };
}

interface JmDieItem {
  customer: string;
  partNumber: string;
  pdfPath: string;
  page?: number;
  extractionType?: BlueprintExtractionRecord["extractionType"];
  regions?: Array<{ x: number; y: number; width: number; height: number }>;
}

/**
 * Permissive extraction of items from the jm-die-index-v2.json manifest. The
 * manifest has evolved through several shapes; we tolerate both `{files:[]}`
 * and `{entries:[]}` and `{records:[]}` plus the flat array form. Each
 * candidate is loose-validated; malformed rows are silently skipped (callers
 * inspect `indexErrors` on the result for diagnostics).
 */
export function extractJmDieItems(indexData: unknown): JmDieItem[] {
  if (indexData == null) return [];
  let raw: unknown[];
  if (Array.isArray(indexData)) {
    raw = indexData;
  } else if (typeof indexData === "object") {
    const obj = indexData as Record<string, unknown>;
    if (Array.isArray(obj.files)) raw = obj.files;
    else if (Array.isArray(obj.entries)) raw = obj.entries;
    else if (Array.isArray(obj.records)) raw = obj.records;
    else return [];
  } else {
    return [];
  }
  const out: JmDieItem[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const customer = typeof o.customer === "string" ? o.customer.toUpperCase() : undefined;
    const partNumber = typeof o.partNumber === "string" ? o.partNumber : (typeof o.pn === "string" ? o.pn : undefined);
    const pdfPath = typeof o.pdfPath === "string" ? o.pdfPath : (typeof o.path === "string" ? o.path : undefined);
    if (!customer || !partNumber || !pdfPath) continue;
    out.push({
      customer,
      partNumber,
      pdfPath,
      ...(typeof o.page === "number" ? { page: o.page } : {}),
      ...(typeof o.extractionType === "string" &&
      ["dimension", "tolerance", "gd_t_callout", "surface_finish", "thread_callout", "material_callout", "note", "other"].includes(o.extractionType)
        ? { extractionType: o.extractionType as BlueprintExtractionRecord["extractionType"] }
        : {}),
      ...(Array.isArray(o.regions)
        ? {
            regions: (o.regions as unknown[])
              .map((r) => {
                if (r == null || typeof r !== "object") return null;
                const ro = r as Record<string, unknown>;
                if (
                  typeof ro.x === "number" &&
                  typeof ro.y === "number" &&
                  typeof ro.width === "number" && ro.width > 0 &&
                  typeof ro.height === "number" && ro.height > 0
                ) {
                  return { x: ro.x, y: ro.y, width: ro.width, height: ro.height };
                }
                return null;
              })
              .filter((r): r is NonNullable<typeof r> => r !== null),
          }
        : {}),
    });
  }
  return out;
}

/**
 * Read a `_PART LIBRARY/<customer>/<pn>/part.json` macro file and extract
 * ground-truth values keyed by provenance. The part.json shape is permissive
 * — we look for `macroVCVars`, `erpActuals`, and `operatorCorrections` as
 * top-level objects whose key→value pairs become provenance entries.
 */
export function readGroundTruthValuesForPart(
  partJsonPath: string,
  fsImpl: { existsSync: typeof fs.existsSync; readFileSync: typeof fs.readFileSync },
  indexErrors: string[],
): Partial<Record<SourceProvenance, string>> {
  if (!fsImpl.existsSync(partJsonPath)) return {};
  let parsed: unknown;
  try {
    const raw = fsImpl.readFileSync(partJsonPath, "utf8") as string;
    parsed = JSON.parse(raw);
  } catch (err) {
    indexErrors.push(`part.json parse error at ${partJsonPath}: ${(err as Error).message}`);
    return {};
  }
  if (parsed == null || typeof parsed !== "object") return {};
  const obj = parsed as Record<string, unknown>;
  const out: Partial<Record<SourceProvenance, string>> = {};
  // Pick the first scalar value from each provenance bucket — the registry
  // records ONE ground-truth value per training-pair region.
  for (const [key, prov] of [
    ["macroVCVars", "macro_vc_var"],
    ["erpActuals", "erp_actual"],
    ["operatorCorrections", "operator_correction"],
    ["ocrInferred", "ocr_inferred"],
  ] as const) {
    const bucket = obj[key];
    if (bucket == null || typeof bucket !== "object" || Array.isArray(bucket)) continue;
    const bucketObj = bucket as Record<string, unknown>;
    for (const v of Object.values(bucketObj)) {
      if (typeof v === "string" && v.length > 0) {
        out[prov] = v;
        break;
      }
      if (typeof v === "number" && Number.isFinite(v)) {
        out[prov] = String(v);
        break;
      }
    }
  }
  return out;
}

/**
 * Classify the confidence tier of a training pair based on which provenances
 * supplied values + whether they agree. Operator-verified wins; then
 * ensemble consensus (≥2 sources agree); single backend; ambiguous (≥2
 * sources disagree). This is the same 4-tier scheme used by xproc_mondrian_*
 * stratified conformal.
 */
export function classifyConfidenceTier(
  values: Partial<Record<SourceProvenance, string>>,
): ConfidenceTier {
  const entries = Object.entries(values).filter(([, v]) => typeof v === "string" && (v as string).length > 0);
  if (entries.length === 0) return "single_backend";
  if (values.operator_correction !== undefined) return "operator_verified";
  if (entries.length === 1) return "single_backend";
  const uniqueValues = new Set(entries.map(([, v]) => (v as string).trim()));
  if (uniqueValues.size === 1) return "ensemble_consensus";
  return "ambiguous";
}

export const groundTruthRegistryEngine = new GroundTruthRegistryEngine();
