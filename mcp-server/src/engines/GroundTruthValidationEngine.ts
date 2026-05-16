/**
 * GroundTruthValidationEngine — corpus integrity gate for the ground-truth
 * bundles produced by GroundTruthBatchExtractor (U-CGT07).
 *
 * Walks {outputRoot}/{fileId}/ directories, runs eight independent integrity
 * checks per bundle, and emits a ValidationReport whose quarantineList enumerates
 * every fileId that should be re-extracted or excluded from regression
 * comparisons.
 *
 * Per-bundle checks (each maps to a stable issue code so callers can route
 * automated repairs without string-parsing reasons):
 *   bundle-json-missing         — bundle.json absent
 *   bundle-json-parse-error     — bundle.json present but malformed JSON
 *   bundle-schema-invalid       — bundle.json fails the loose schema
 *   bundle-status-failed        — status === "failed" (extractor gave up)
 *   step-missing                — source.step not present on disk
 *   step-not-iso-10303          — source.step lacks the ISO-10303-21 magic
 *   feature-tree-missing        — feature-tree.json not present
 *   feature-tree-parse-error    — feature-tree.json malformed
 *   feature-tree-empty          — feature tree has zero features (degenerate)
 *   dim-signature-missing       — dimensional-signature.json not present
 *   dim-signature-parse-error   — dimensional-signature.json malformed
 *   dim-signature-zero-envelope — envelopeM === 0 with cartesianPoints > 0
 *   dim-signature-nan           — any non-finite numeric in bbox/com/moiAABB
 *   screenshot-missing          — one or more canonical PNG views absent
 *
 * Composes (does NOT duplicate):
 *   - GroundTruthBatchExtractor (E2507, U-CGT07) — produces bundles we audit
 *   - DimensionalSignatureEngine (E2505, U-CGT05) — schema we delegate to via
 *     loose check (we do not re-run STEP parsing here)
 *   - GroundTruthRegistryEngine (E2508, U-CGT08) — different layer (queryable
 *     index over the SAME bundles; this engine GATES which entries that
 *     index should accept).
 *
 * Duplication check (DuplicationGuardEngine keywords: ground-truth, validate,
 * quarantine, corpus, bundle):
 *   → No GroundTruthValidationEngine / BundleValidator / CorpusValidator.
 *   → CADValidationEngine validates CAD geometry, not ground-truth integrity.
 *
 * @engine GroundTruthValidationEngine
 * @shortcode E2509
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT09
 * @classification STANDARD (integrity audit, no physics constants)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { z } from "zod";

// ── Domain ──────────────────────────────────────────────────────────────────

export const ISSUE_CODES = [
  "bundle-json-missing",
  "bundle-json-parse-error",
  "bundle-schema-invalid",
  "bundle-status-failed",
  "step-missing",
  "step-not-iso-10303",
  "feature-tree-missing",
  "feature-tree-parse-error",
  "feature-tree-empty",
  "dim-signature-missing",
  "dim-signature-parse-error",
  "dim-signature-zero-envelope",
  "dim-signature-nan",
  "screenshot-missing",
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number];

export const CANONICAL_SCREENSHOT_VIEWS = [
  "iso",
  "front",
  "top",
  "right",
  "section-xz",
  "section-yz",
] as const;

export const BundleIssueSchema = z
  .object({
    code: z.enum(ISSUE_CODES),
    message: z.string().min(1),
    /** Optional path to the artifact that failed (relative to bundleDir). */
    artifact: z.string().optional(),
  })
  .strict();

export type BundleIssue = z.infer<typeof BundleIssueSchema>;

export const BundleValidationSchema = z
  .object({
    fileId: z.string().min(1),
    bundleDir: z.string().min(1),
    quarantined: z.boolean(),
    issues: z.array(BundleIssueSchema),
    status: z.enum(["ok", "partial", "failed", "skipped", "missing-bundle"]),
  })
  .strict();

export type BundleValidation = z.infer<typeof BundleValidationSchema>;

export const ValidationReportSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    outputRoot: z.string().min(1),
    builtAt: z.string(),
    total: z.number().int().min(0),
    ok: z.number().int().min(0),
    quarantined: z.number().int().min(0),
    byCode: z.record(z.string(), z.number().int().min(0)),
    quarantineList: z.array(BundleValidationSchema),
    durationMs: z.number().min(0),
    /** Stable hash over (fileId, sorted issue codes) tuples. */
    signature: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

// ── Loose bundle / artifact schemas (we accept anything reasonable) ────────

const LooseBundleSchema = z.object({
  fileId: z.string().min(1),
  status: z.enum(["ok", "partial", "failed", "skipped"]),
  bundleDir: z.string().min(1),
  stages: z.unknown().optional(),
});

const LooseFeatureTreeSchema = z.object({
  features: z.array(z.unknown()),
});

// JSON has no NaN/Infinity literal — they round-trip as `null`. Accept null
// in numeric positions and surface them as NaN so the dim-signature-nan
// finite-check downstream catches them as the bug they actually are.
const numOrNan = z
  .union([z.number(), z.null()])
  .transform((v) => (v === null ? Number.NaN : v));

const LooseDimSigSchema = z.object({
  envelopeM: numOrNan,
  bbox: z.object({
    extent: z.array(numOrNan).min(3),
    min: z.array(numOrNan).min(3),
    max: z.array(numOrNan).min(3),
  }),
  com: z.array(numOrNan).min(3).optional(),
  moiAABB: z
    .object({
      Ixx: numOrNan,
      Iyy: numOrNan,
      Izz: numOrNan,
    })
    .optional(),
  counts: z
    .object({ cartesianPoints: z.number().int().min(0) })
    .passthrough()
    .optional(),
});

// ── Constants ───────────────────────────────────────────────────────────────

const STEP_MAGIC = "ISO-10303-21";
const STEP_HEADER_INSPECT_BYTES = 256;

// ── Helpers ─────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
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

function reportSignature(quarantineList: ReadonlyArray<BundleValidation>): string {
  const payload = quarantineList
    .map((b) => ({
      fileId: b.fileId,
      issues: [...b.issues.map((i) => i.code)].sort(),
    }))
    .sort((a, b) => a.fileId.localeCompare(b.fileId));
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function readFirstBytes(filePath: string, n: number): string | null {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(n);
      const read = fs.readSync(fd, buf, 0, n, 0);
      return buf.subarray(0, read).toString("utf8");
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function readJsonOrNull(filePath: string): unknown | null {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function hasNonFinite(arr: ReadonlyArray<number> | undefined | null): boolean {
  if (!arr) return false;
  for (const n of arr) {
    if (!Number.isFinite(n)) return true;
  }
  return false;
}

function jsonExists(filePath: string): "exists" | "missing" {
  return fs.existsSync(filePath) ? "exists" : "missing";
}

// ── Engine ──────────────────────────────────────────────────────────────────

export interface ValidateOptions {
  /** Skip the screenshot check entirely (e.g. when CI does not render them). */
  skipScreenshots?: boolean;
  /** Treat status="failed" bundles as quarantined without checking artifacts.
   * Default true: a failed extraction is by definition unusable. */
  quarantineFailedStatus?: boolean;
  /** Treat status="partial" as quarantined. Default false. */
  quarantinePartialStatus?: boolean;
  /** Limit corpus walk to first N bundles (testing). */
  limit?: number;
  /** Optional fs override (testing). */
  fs?: {
    readdirSync: typeof fs.readdirSync;
    existsSync: typeof fs.existsSync;
  };
}

export class GroundTruthValidationEngine {
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Validate a single bundle by directory. Returns the per-bundle record
   * (with quarantine flag + ordered issue list). Pure function w.r.t. inputs;
   * does no IO beyond reading the bundle artifacts.
   */
  validateBundle(bundleDir: string, fileId: string, opts: ValidateOptions = {}): BundleValidation {
    const issues: BundleIssue[] = [];

    // 1) bundle.json
    const bundlePath = path.join(bundleDir, "bundle.json");
    if (!fs.existsSync(bundlePath)) {
      return {
        fileId,
        bundleDir,
        quarantined: true,
        issues: [
          { code: "bundle-json-missing", message: "bundle.json not found", artifact: "bundle.json" },
        ],
        status: "missing-bundle",
      };
    }
    const bundleRaw = readJsonOrNull(bundlePath);
    if (bundleRaw === null) {
      issues.push({
        code: "bundle-json-parse-error",
        message: "bundle.json failed to parse as JSON",
        artifact: "bundle.json",
      });
      return {
        fileId,
        bundleDir,
        quarantined: true,
        issues,
        status: "missing-bundle",
      };
    }
    const parsed = LooseBundleSchema.safeParse(bundleRaw);
    if (!parsed.success) {
      issues.push({
        code: "bundle-schema-invalid",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
          .join("; "),
        artifact: "bundle.json",
      });
      return {
        fileId,
        bundleDir,
        quarantined: true,
        issues,
        status: "missing-bundle",
      };
    }

    const status = parsed.data.status;

    // Short-circuit: status === "failed" is intrinsically quarantined.
    if (status === "failed" && (opts.quarantineFailedStatus ?? true)) {
      issues.push({
        code: "bundle-status-failed",
        message: "extractor reported status=failed",
        artifact: "bundle.json",
      });
      return { fileId, bundleDir, quarantined: true, issues, status };
    }

    // 2) STEP file
    const stepPath = path.join(bundleDir, "source.step");
    if (jsonExists(stepPath) === "missing") {
      issues.push({
        code: "step-missing",
        message: "source.step not found",
        artifact: "source.step",
      });
    } else {
      const head = readFirstBytes(stepPath, STEP_HEADER_INSPECT_BYTES);
      if (head === null || !head.includes(STEP_MAGIC)) {
        issues.push({
          code: "step-not-iso-10303",
          message: "source.step missing ISO-10303-21 magic in first 256 bytes",
          artifact: "source.step",
        });
      }
    }

    // 3) Feature tree
    const treePath = path.join(bundleDir, "feature-tree.json");
    if (jsonExists(treePath) === "missing") {
      issues.push({
        code: "feature-tree-missing",
        message: "feature-tree.json not found",
        artifact: "feature-tree.json",
      });
    } else {
      const treeRaw = readJsonOrNull(treePath);
      if (treeRaw === null) {
        issues.push({
          code: "feature-tree-parse-error",
          message: "feature-tree.json failed to parse",
          artifact: "feature-tree.json",
        });
      } else {
        const treeParsed = LooseFeatureTreeSchema.safeParse(treeRaw);
        if (!treeParsed.success || treeParsed.data.features.length === 0) {
          issues.push({
            code: "feature-tree-empty",
            message: "feature-tree contains zero features",
            artifact: "feature-tree.json",
          });
        }
      }
    }

    // 4) Dimensional signature
    const sigPath = path.join(bundleDir, "dimensional-signature.json");
    if (jsonExists(sigPath) === "missing") {
      issues.push({
        code: "dim-signature-missing",
        message: "dimensional-signature.json not found",
        artifact: "dimensional-signature.json",
      });
    } else {
      const sigRaw = readJsonOrNull(sigPath);
      if (sigRaw === null) {
        issues.push({
          code: "dim-signature-parse-error",
          message: "dimensional-signature.json failed to parse",
          artifact: "dimensional-signature.json",
        });
      } else {
        const sigParsed = LooseDimSigSchema.safeParse(sigRaw);
        if (!sigParsed.success) {
          issues.push({
            code: "dim-signature-parse-error",
            message: sigParsed.error.issues
              .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
              .join("; "),
            artifact: "dimensional-signature.json",
          });
        } else {
          const s = sigParsed.data;
          const cartesianPoints = s.counts?.cartesianPoints ?? 0;
          if (s.envelopeM === 0 && cartesianPoints > 0) {
            issues.push({
              code: "dim-signature-zero-envelope",
              message:
                "envelopeM is 0 m despite >0 CARTESIAN_POINT entries (degenerate)",
              artifact: "dimensional-signature.json",
            });
          }
          if (
            !Number.isFinite(s.envelopeM) ||
            hasNonFinite(s.bbox.extent) ||
            hasNonFinite(s.bbox.min) ||
            hasNonFinite(s.bbox.max) ||
            hasNonFinite(s.com) ||
            (s.moiAABB &&
              hasNonFinite([s.moiAABB.Ixx, s.moiAABB.Iyy, s.moiAABB.Izz]))
          ) {
            issues.push({
              code: "dim-signature-nan",
              message:
                "non-finite numeric value in dimensional signature (NaN/Infinity)",
              artifact: "dimensional-signature.json",
            });
          }
        }
      }
    }

    // 5) Screenshots — one issue per missing view, suppressed by skipScreenshots
    if (!opts.skipScreenshots) {
      for (const view of CANONICAL_SCREENSHOT_VIEWS) {
        const png = path.join(bundleDir, "screenshots", `${view}.png`);
        if (jsonExists(png) === "missing") {
          issues.push({
            code: "screenshot-missing",
            message: `view ${view} PNG not found`,
            artifact: `screenshots/${view}.png`,
          });
        }
      }
    }

    // status==="partial" + opt-in → quarantine
    if (status === "partial" && (opts.quarantinePartialStatus ?? false)) {
      issues.push({
        code: "bundle-status-failed",
        message: "extractor reported status=partial (quarantinePartialStatus=true)",
        artifact: "bundle.json",
      });
    }

    return {
      fileId,
      bundleDir,
      quarantined: issues.length > 0,
      issues,
      status,
    };
  }

  /**
   * Walk the corpus root and validate every bundle directory. Performs
   * single-threaded synchronous IO — adequate for the milestone's <10min
   * 20K target (≈50 stat calls per bundle, roughly 250 µs each).
   */
  validateCorpus(outputRoot: string, opts: ValidateOptions = {}): ValidationReport {
    if (typeof outputRoot !== "string" || outputRoot.length === 0) {
      throw new Error(
        "[GroundTruthValidationEngine] outputRoot must be a non-empty string",
      );
    }
    const fsImpl = opts.fs ?? {
      readdirSync: fs.readdirSync,
      existsSync: fs.existsSync,
    };
    if (!fsImpl.existsSync(outputRoot)) {
      throw new Error(
        `[GroundTruthValidationEngine] outputRoot does not exist: ${outputRoot}`,
      );
    }
    const start = Date.now();
    const childDirs = fsImpl
      .readdirSync(outputRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);

    const limit =
      opts.limit !== undefined && opts.limit >= 0
        ? Math.min(opts.limit, childDirs.length)
        : childDirs.length;

    const allValidations: BundleValidation[] = [];
    for (let i = 0; i < limit; i++) {
      const fileId = childDirs[i]!;
      const bundleDir = path.join(outputRoot, fileId);
      allValidations.push(this.validateBundle(bundleDir, fileId, opts));
    }

    const ok = allValidations.filter((v) => !v.quarantined).length;
    const quarantineList = allValidations.filter((v) => v.quarantined);
    const byCode: Record<string, number> = {};
    for (const v of quarantineList) {
      for (const i of v.issues) {
        byCode[i.code] = (byCode[i.code] ?? 0) + 1;
      }
    }

    const signature = reportSignature(quarantineList);
    return {
      schemaVersion: this.schemaVersion,
      outputRoot,
      builtAt: nowISO(),
      total: allValidations.length,
      ok,
      quarantined: quarantineList.length,
      byCode,
      quarantineList,
      durationMs: Date.now() - start,
      signature,
    };
  }

  /**
   * Persist a quarantine report (not the full corpus). Atomic write so
   * concurrent re-extractors always read a complete file.
   */
  async exportQuarantine(report: ValidationReport, filePath: string): Promise<void> {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error(
        "[GroundTruthValidationEngine] exportQuarantine: filePath must be non-empty",
      );
    }
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = filePath + ".tmp-" + process.pid + "-" + Date.now();
    await fs.promises.writeFile(tmp, JSON.stringify(report, null, 2), "utf8");
    await fs.promises.rename(tmp, filePath);
  }

  /** Re-validate a candidate report. */
  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const r = ValidationReportSchema.safeParse(candidate);
    if (r.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: r.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  /** Read-only issue-code vocabulary for downstream filtering. */
  listIssueCodes(): readonly IssueCode[] {
    return ISSUE_CODES;
  }

  // ── BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U4 extension ─────────────────────
  // Extraction-confidence cross-validation harness — consumes the labelled
  // training pairs produced by GroundTruthRegistryEngine.joinDocustrataToPartLibrary
  // (U-MS1-U3) and evaluates OCR backends against them.

  /** In-memory baseline snapshots for regression gating (keyed by snapshotId). */
  private extractionBaselines = new Map<string, BackendValidationResult>();

  /**
   * Validate a single OCR backend against a labelled training-pair set.
   * Pure-orchestration — caller injects the backend as a function. Returns
   * accuracy + conformal coverage + per-dim-type breakdown + disagreement
   * regions for operator review.
   */
  validateExtractionBackend(input: {
    backendId: string;
    trainingPairSetId: string;
    pairs: ExtractionTrainingPair[];
    backend: (pair: ExtractionTrainingPair) => ExtractionBackendOutput;
    conformalAlpha?: number;
  }): BackendValidationResult {
    if (typeof input.backendId !== "string" || input.backendId.length === 0) {
      throw new Error("[GroundTruthValidationEngine] backendId required");
    }
    if (!Array.isArray(input.pairs)) {
      throw new Error("[GroundTruthValidationEngine] pairs must be array");
    }
    const conformalAlpha = clampConformalAlpha(input.conformalAlpha);

    const perDimType = new Map<string, { total: number; correct: number; nonconformity: number[] }>();
    const disagreementRegions: BackendValidationResult["disagreementRegions"] = [];
    let totalPairs = 0;
    let totalCorrect = 0;

    for (const pair of input.pairs) {
      totalPairs++;
      const groundTruth = pickGroundTruthScalar(pair.groundTruthValues);
      if (groundTruth === null) continue; // unlabeled — skip
      const out = input.backend(pair);
      const correct = extractionMatches(groundTruth, out.value);
      if (correct) totalCorrect++;

      const dimTypeKey = pair.extractionType;
      const bucket = perDimType.get(dimTypeKey) ?? { total: 0, correct: 0, nonconformity: [] };
      bucket.total++;
      if (correct) bucket.correct++;
      // Nonconformity = 1 - backend confidence (lower = better, 0 = perfect).
      // Used by conformal calibration. Clamp to [0,1].
      const nc = Math.max(0, Math.min(1, 1 - (out.confidence ?? 0.5)));
      bucket.nonconformity.push(nc);
      perDimType.set(dimTypeKey, bucket);

      if (!correct) {
        disagreementRegions.push({
          pairId: pair.pairId,
          extractionType: pair.extractionType,
          expected: groundTruth,
          got: out.value,
          confidence: out.confidence ?? null,
        });
      }
    }

    const accuracy = totalPairs > 0 ? totalCorrect / totalPairs : 0;
    const conformalCoverage = computeConformalCoverage(perDimType, conformalAlpha);
    const perDimTypeBreakdown: Record<string, { accuracy: number; n: number }> = {};
    for (const [k, v] of perDimType.entries()) {
      perDimTypeBreakdown[k] = { accuracy: v.total > 0 ? v.correct / v.total : 0, n: v.total };
    }
    return {
      backendId: input.backendId,
      trainingPairSetId: input.trainingPairSetId,
      accuracy: Number(accuracy.toFixed(6)),
      conformalCoverage,
      conformalAlpha,
      perDimTypeBreakdown,
      disagreementRegions: disagreementRegions.slice(0, 200), // cap for telemetry
      totalPairs,
      totalCorrect,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Compare N backends on the same training-pair set. Returns rank by accuracy
   * + regression flags (any backend below the LEADER by >regressionThreshold
   * absolute accuracy points). Useful for A/B routing decisions.
   */
  compareBackends(input: {
    backends: Array<{
      backendId: string;
      backend: (pair: ExtractionTrainingPair) => ExtractionBackendOutput;
    }>;
    trainingPairSetId: string;
    pairs: ExtractionTrainingPair[];
    regressionThresholdPct?: number;
    conformalAlpha?: number;
  }): BackendComparisonResult {
    if (!Array.isArray(input.backends) || input.backends.length === 0) {
      throw new Error("[GroundTruthValidationEngine] at least one backend required");
    }
    const regressionThresholdPct = clampThresholdPct(input.regressionThresholdPct);
    const results: BackendValidationResult[] = [];
    for (const b of input.backends) {
      results.push(
        this.validateExtractionBackend({
          backendId: b.backendId,
          trainingPairSetId: input.trainingPairSetId,
          pairs: input.pairs,
          backend: b.backend,
          conformalAlpha: input.conformalAlpha,
        }),
      );
    }
    const sorted = [...results].sort((a, b) => b.accuracy - a.accuracy);
    const leader = sorted[0]!;
    const rank = sorted.map((r, i) => ({
      rank: i + 1,
      backendId: r.backendId,
      accuracy: r.accuracy,
    }));
    const regressionFlags: BackendComparisonResult["regressionFlags"] = [];
    for (const r of sorted.slice(1)) {
      const gapPct = (leader.accuracy - r.accuracy) * 100;
      if (gapPct > regressionThresholdPct) {
        regressionFlags.push({
          backendId: r.backendId,
          gapPct: Number(gapPct.toFixed(2)),
          versusLeader: leader.backendId,
          reason: "accuracy_gap_exceeds_threshold",
        });
      }
    }
    return {
      trainingPairSetId: input.trainingPairSetId,
      rank,
      regressionFlags,
      results,
      leaderId: leader.backendId,
      regressionThresholdPct,
    };
  }

  /**
   * Promote a backend's current validation result to baseline (used by
   * regressionGate). Pure in-memory; persistence handled by caller.
   */
  snapshotBaseline(snapshotId: string, result: BackendValidationResult): void {
    if (typeof snapshotId !== "string" || snapshotId.length === 0) {
      throw new Error("[GroundTruthValidationEngine] snapshotId required");
    }
    this.extractionBaselines.set(snapshotId, result);
  }

  /** Inspect or remove baselines. */
  getBaseline(snapshotId: string): BackendValidationResult | null {
    return this.extractionBaselines.get(snapshotId) ?? null;
  }
  clearBaselines(): void {
    this.extractionBaselines.clear();
  }

  /**
   * Gate a current validation result against a prior baseline. Returns
   * `passed:true` when no per-dim-type accuracy regressed below the baseline
   * (within tolerance). Returns regressions array naming the dim-types that
   * regressed + magnitude.
   */
  regressionGate(input: {
    current: BackendValidationResult;
    baselineSnapshotId: string;
    perDimTolerancePct?: number;
  }): RegressionGateResult {
    const baseline = this.extractionBaselines.get(input.baselineSnapshotId);
    if (!baseline) {
      return {
        passed: false,
        reason: "baseline_missing",
        regressions: [],
        baselineSnapshotId: input.baselineSnapshotId,
      };
    }
    const tolerancePct = clampThresholdPct(input.perDimTolerancePct);
    const regressions: RegressionGateResult["regressions"] = [];
    for (const [dimType, baselineBreakdown] of Object.entries(baseline.perDimTypeBreakdown)) {
      const currentBreakdown = input.current.perDimTypeBreakdown[dimType];
      if (!currentBreakdown) {
        regressions.push({
          dimType,
          baselineAccuracy: baselineBreakdown.accuracy,
          currentAccuracy: 0,
          gapPct: baselineBreakdown.accuracy * 100,
          reason: "dim_type_dropped",
        });
        continue;
      }
      const gapPct = (baselineBreakdown.accuracy - currentBreakdown.accuracy) * 100;
      if (gapPct > tolerancePct) {
        regressions.push({
          dimType,
          baselineAccuracy: baselineBreakdown.accuracy,
          currentAccuracy: currentBreakdown.accuracy,
          gapPct: Number(gapPct.toFixed(2)),
          reason: "accuracy_regressed",
        });
      }
    }
    return {
      passed: regressions.length === 0,
      reason: regressions.length === 0 ? "no_regression" : "regressions_detected",
      regressions,
      baselineSnapshotId: input.baselineSnapshotId,
    };
  }
}

// ── U-MS1-U4 supporting types + helpers ─────────────────────────────────

const DEFAULT_CONFORMAL_ALPHA = 0.1;
const MIN_CONFORMAL_ALPHA = 0.01;
const MAX_CONFORMAL_ALPHA = 0.5;
const DEFAULT_REGRESSION_THRESHOLD_PCT = 2.0;
const MIN_THRESHOLD_PCT = 0;
const MAX_THRESHOLD_PCT = 100;

export interface ExtractionTrainingPair {
  pairId: string;
  extractionType: string;
  groundTruthValues: Record<string, string | undefined>;
}

export interface ExtractionBackendOutput {
  value: string;
  confidence?: number;
}

export interface BackendValidationResult {
  backendId: string;
  trainingPairSetId: string;
  accuracy: number;
  conformalCoverage: { observed: number; nominal: number };
  conformalAlpha: number;
  perDimTypeBreakdown: Record<string, { accuracy: number; n: number }>;
  disagreementRegions: Array<{
    pairId: string;
    extractionType: string;
    expected: string;
    got: string;
    confidence: number | null;
  }>;
  totalPairs: number;
  totalCorrect: number;
  evaluatedAt: string;
}

export interface BackendComparisonResult {
  trainingPairSetId: string;
  rank: Array<{ rank: number; backendId: string; accuracy: number }>;
  regressionFlags: Array<{
    backendId: string;
    gapPct: number;
    versusLeader: string;
    reason: string;
  }>;
  results: BackendValidationResult[];
  leaderId: string;
  regressionThresholdPct: number;
}

export interface RegressionGateResult {
  passed: boolean;
  reason: string;
  regressions: Array<{
    dimType: string;
    baselineAccuracy: number;
    currentAccuracy: number;
    gapPct: number;
    reason: string;
  }>;
  baselineSnapshotId: string;
}

function clampConformalAlpha(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_CONFORMAL_ALPHA;
  return Math.max(MIN_CONFORMAL_ALPHA, Math.min(MAX_CONFORMAL_ALPHA, raw));
}

function clampThresholdPct(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_REGRESSION_THRESHOLD_PCT;
  return Math.max(MIN_THRESHOLD_PCT, Math.min(MAX_THRESHOLD_PCT, raw));
}

/**
 * Pick a single ground-truth scalar from the multi-provenance values, in
 * trust order: operator_correction > erp_actual > macro_vc_var > ocr_inferred.
 * Returns null when no provenance has a string value.
 */
export function pickGroundTruthScalar(values: Record<string, string | undefined>): string | null {
  for (const key of ["operator_correction", "erp_actual", "macro_vc_var", "ocr_inferred"]) {
    const v = values[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Loose extraction-vs-ground-truth match. Numeric values match within a
 * relative tolerance to absorb formatting differences (1.000 vs 1.0). String
 * values match on case-insensitive trim. Empty strings never match.
 */
export function extractionMatches(expected: string, got: string): boolean {
  if (typeof expected !== "string" || typeof got !== "string") return false;
  const e = expected.trim();
  const g = got.trim();
  if (e.length === 0 || g.length === 0) return false;
  if (e.toLowerCase() === g.toLowerCase()) return true;
  const en = Number(e);
  const gn = Number(g);
  if (Number.isFinite(en) && Number.isFinite(gn)) {
    if (en === 0 && gn === 0) return true;
    const rel = Math.abs(en - gn) / Math.max(Math.abs(en), Math.abs(gn));
    return rel < 1e-6;
  }
  return false;
}

/**
 * Compute observed conformal coverage = fraction of pairs whose backend
 * nonconformity is below the (1 - alpha) quantile of the calibration set.
 * Nominal coverage = 1 - alpha. Returned as {observed, nominal}.
 */
export function computeConformalCoverage(
  perDimType: Map<string, { total: number; correct: number; nonconformity: number[] }>,
  alpha: number,
): { observed: number; nominal: number } {
  const nominal = 1 - alpha;
  let totalSamples = 0;
  let covered = 0;
  for (const bucket of perDimType.values()) {
    if (bucket.nonconformity.length === 0) continue;
    const sorted = [...bucket.nonconformity].sort((a, b) => a - b);
    const qIdx = Math.max(0, Math.ceil((1 - alpha) * sorted.length) - 1);
    const threshold = sorted[qIdx]!;
    for (const nc of bucket.nonconformity) {
      totalSamples++;
      if (nc <= threshold) covered++;
    }
  }
  const observed = totalSamples > 0 ? covered / totalSamples : 0;
  return { observed: Number(observed.toFixed(6)), nominal: Number(nominal.toFixed(6)) };
}

export const groundTruthValidationEngine = new GroundTruthValidationEngine();
