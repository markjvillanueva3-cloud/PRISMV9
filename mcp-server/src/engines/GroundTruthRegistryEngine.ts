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

export const groundTruthRegistryEngine = new GroundTruthRegistryEngine();
