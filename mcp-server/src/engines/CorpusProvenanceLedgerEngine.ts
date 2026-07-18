/**
 * CorpusProvenanceLedgerEngine — CAM-AI-TRAINING-MS0/U-CAMT-A09
 *
 * Single source of truth for CAD corpus provenance. Every entry in the
 * unified CAM-training corpus MUST have an entry here BEFORE downstream
 * trainers (LoRA, GNN, RAG) are allowed to consume it. The ledger is
 * the gate that enforces the operator's 2026-05-25 hard constraint:
 *
 *   "no synthetic parts, must be real parts taken from real reputable
 *    sources"
 *
 * Architecture — pure-logic core, file I/O lives in the runner script:
 *   - register(entry)        → ProvenanceRecord (rejects synthetic, dedup by hash)
 *   - lookup(hash)           → ProvenanceRecord | null
 *   - validate(entry)        → ProvenanceCheck (rejects missing fields)
 *   - reconcile(catalog, ledger) → ReconciliationResult
 *   - aggregate(records)     → ProvenanceAggregate (by license / archive / source)
 *   - exportLedger()         → ProvenanceRecord[] (deterministic-order)
 *
 * Why pure-logic core? Same R8 / R12 reasoning that drives the rest of
 * the corpus stack: tests must run without 100k JSONL files in CI; the
 * runner script wires real disk I/O on top.
 *
 * Reject conditions (every one is a HARD reject, not a warning):
 *   - record.synthetic === true                        (operator constraint)
 *   - record.sourceUrl missing                          (R12 — fail loud)
 *   - record.license missing OR === "UNKNOWN"           (legal audit gate)
 *   - record.sha256 missing OR length !== 64            (hash integrity)
 *   - record.hash duplicate with different sourceUrl    (corpus integrity)
 *
 * Trusted archives (allowlist — extend via REPUTABLE_ARCHIVES):
 *   - JM_DIE              — internal, NDA-bound, real customer parts
 *   - ABC_DATASET         — NYU/Skoltech, CC BY 4.0, 1M+ real Onshape CAD
 *   - FUSION_360_GALLERY  — Autodesk Research, real designs (research-use)
 *   - MFCAD_PLUS_PLUS     — paper-cite, real machined parts w/ annotations
 *   - MCB                 — Mechanical Components Benchmark
 *   - NIST_STEP_TEST      — NIST public STEP test parts
 *   - GRABCAD_PUBLIC      — public-CC subset of GrabCAD
 *   - TRACEPARTS_PUBLIC   — public catalog (vendor-supplied real parts)
 *
 * References:
 *   - ABC Dataset:        https://deep-geometry.github.io/abc-dataset/
 *   - Fusion 360 Gallery: https://github.com/AutodeskAILab/Fusion360GalleryDataset
 *   - MFCAD++:            https://github.com/hducg/MFCAD-plus-plus
 *   - MCB:                https://mcb.cs.purdue.edu/
 *   - NIST STEP:          https://www.nist.gov/services-resources/software/step-file-analyzer-and-viewer
 */
import { z } from "zod";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export const REPUTABLE_ARCHIVES = [
  "JM_DIE",
  "ABC_DATASET",
  "FUSION_360_GALLERY",
  "MFCAD_PLUS_PLUS",
  "MCB",
  "NIST_STEP_TEST",
  "GRABCAD_PUBLIC",
  "TRACEPARTS_PUBLIC",
] as const;

export type ReputableArchive = (typeof REPUTABLE_ARCHIVES)[number];

export const KNOWN_LICENSES = [
  "JM_DIE_INTERNAL_USE_ONLY",  // NDA-bound internal-only — no public publish
  "CC_BY_4_0",                  // Creative Commons Attribution 4.0
  "CC_BY_SA_4_0",               // Creative Commons Attribution-ShareAlike 4.0
  "CC_BY_NC_4_0",               // Creative Commons Attribution-NonCommercial 4.0
  "AUTODESK_RESEARCH",          // Autodesk Research dataset terms
  "PAPER_CITATION_REQUIRED",    // dataset accompanies a paper, cite required
  "NIST_PUBLIC",                // US Govt public-domain
  "VENDOR_CATALOG_PUBLIC",      // vendor part-catalog public download terms
] as const;

export type KnownLicense = (typeof KNOWN_LICENSES)[number];

export interface ProvenanceRecord {
  /** Hash of the CAD file content — primary key, MUST be SHA-256 hex (64 chars). */
  sha256: string;
  /** Where the file came from (URL, archive path, or canonical mount point). */
  sourceUrl: string;
  /** Archive bucket — must be on the REPUTABLE_ARCHIVES allowlist. */
  archive: ReputableArchive;
  /** License under which the file may be used for AI training. */
  license: KnownLicense;
  /** Original file extension (".step", ".stp", ".sldprt", …). */
  ext: string;
  /** File size in bytes at acquisition. */
  bytes: number;
  /** ISO-8601 timestamp when this record was registered. */
  acquiredAt: string;
  /** MUST be false — the operator's 2026-05-25 hard constraint. */
  synthetic: false;
  /** Optional: paper-citation string if license requires it. */
  citation?: string;
  /** Optional: customer or contributor attribution. */
  attribution?: string;
  /** Optional: NDA / ITAR / customer-confidentiality flag. */
  restricted?: boolean;
}

export interface ProvenanceCheck {
  valid: boolean;
  issues: string[];
}

export interface ReconciliationResult {
  ledgered: number;
  unledgered: string[];           // catalog entries (by sha256) with no ledger record
  orphanedLedgered: string[];     // ledger records with no catalog entry
  syntheticRejected: number;
  fullyTraced: boolean;
}

export interface ProvenanceAggregate {
  total: number;
  byArchive: Record<ReputableArchive, number>;
  byLicense: Record<KnownLicense, number>;
  byExtension: Record<string, number>;
  restrictedCount: number;
  totalBytes: number;
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const Sha256Hex = z.string().regex(/^[0-9a-f]{64}$/i, "sha256 must be 64-hex");

const ProvenanceRecordSchema = z.object({
  sha256: Sha256Hex,
  sourceUrl: z.string().min(1, "sourceUrl required"),
  archive: z.enum(REPUTABLE_ARCHIVES),
  license: z.enum(KNOWN_LICENSES),
  ext: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  acquiredAt: z.string().min(1),
  synthetic: z.literal(false),
  citation: z.string().optional(),
  attribution: z.string().optional(),
  restricted: z.boolean().optional(),
});

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CorpusProvenanceLedgerEngine — every corpus entry's provenance audit.
 *
 * @remarks
 * Pure logic. The runner script (`scripts/build-corpus-provenance-ledger.mjs`)
 * loads/persists the ledger to disk; tests pass records inline.
 */
export class CorpusProvenanceLedgerEngine extends BaseEngine {
  private readonly records = new Map<string, ProvenanceRecord>();

  constructor() {
    const info: EngineInfo = {
      name: "CorpusProvenanceLedgerEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description:
        "Audit ledger for CAM-training corpus provenance. Rejects synthetic " +
        "entries; enforces SHA-256 + sourceUrl + license + reputable-archive.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "validate", description: "Check a ProvenanceRecord for required fields", actions: ["corpus_provenance_validate"] },
      { name: "register", description: "Register a record (rejects synthetic + duplicate-hash)", actions: ["corpus_provenance_register"] },
      { name: "lookup", description: "Lookup a record by sha256", actions: ["corpus_provenance_lookup"] },
      { name: "reconcile", description: "Reconcile a catalog file list against the ledger", actions: ["corpus_provenance_reconcile"] },
      { name: "aggregate", description: "Aggregate by archive / license / extension", actions: ["corpus_provenance_aggregate"] },
      { name: "export", description: "Export ledger snapshot (deterministic order)", actions: ["corpus_provenance_export"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    // No-op execute path. Engine consumers call the typed methods directly
    // (register/lookup/aggregate); dispatcher actions provide the wiring.
    return { engine: "CorpusProvenanceLedgerEngine", note: "use typed methods, not executeImpl" };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Validate a record shape WITHOUT registering it. Returns issue list. */
  checkRecord(record: unknown): ProvenanceCheck {
    const parsed = ProvenanceRecordSchema.safeParse(record);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`);
      return { valid: false, issues };
    }
    const r = parsed.data;
    const issues: string[] = [];
    if (r.synthetic !== false) {
      issues.push("synthetic must be literally false (operator constraint 2026-05-25)");
    }
    if (r.sha256.length !== 64) {
      issues.push(`sha256 length ${r.sha256.length} != 64`);
    }
    return { valid: issues.length === 0, issues };
  }

  /**
   * Register a record. Rejects:
   *   - synthetic === true
   *   - schema-invalid records
   *   - duplicate hash with different sourceUrl (corpus integrity)
   *
   * Idempotent for exact-same record (same hash + sourceUrl).
   */
  register(record: ProvenanceRecord): { ok: true; record: ProvenanceRecord } | { ok: false; reason: string } {
    const check = this.checkRecord(record);
    if (!check.valid) {
      return { ok: false, reason: `validation: ${check.issues.join("; ")}` };
    }
    const existing = this.records.get(record.sha256);
    if (existing) {
      if (existing.sourceUrl !== record.sourceUrl) {
        return { ok: false, reason: `hash collision: ${record.sha256} already registered with sourceUrl=${existing.sourceUrl}, refusing to overwrite with ${record.sourceUrl}` };
      }
      // Same hash + same url — idempotent, return the existing record.
      return { ok: true, record: existing };
    }
    this.records.set(record.sha256, record);
    return { ok: true, record };
  }

  /** Lookup a record by sha256. Returns null on miss. */
  lookup(sha256: string): ProvenanceRecord | null {
    return this.records.get(sha256) ?? null;
  }

  /**
   * Reconcile a catalog (list of sha256s) against the ledger.
   * Returns counts + lists of missing-from-ledger and orphaned-in-ledger.
   * The training pipeline gates on `fullyTraced === true`.
   */
  reconcile(catalog: string[]): ReconciliationResult {
    const catalogSet = new Set(catalog);
    const ledgerSet = new Set(this.records.keys());
    const unledgered: string[] = [];
    let syntheticRejected = 0;
    for (const sha of catalog) {
      if (!ledgerSet.has(sha)) {
        unledgered.push(sha);
      }
    }
    const orphanedLedgered: string[] = [];
    for (const sha of ledgerSet) {
      if (!catalogSet.has(sha)) orphanedLedgered.push(sha);
    }
    // syntheticRejected is always 0 here because register() rejects them;
    // surfaced in the return shape so downstream gates can audit the path.
    return {
      ledgered: this.records.size,
      unledgered,
      orphanedLedgered,
      syntheticRejected,
      fullyTraced: unledgered.length === 0,
    };
  }

  /** Aggregate stats — used by the training dashboard. */
  aggregate(): ProvenanceAggregate {
    const byArchive: Record<string, number> = {};
    const byLicense: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    let restrictedCount = 0;
    let totalBytes = 0;
    for (const r of this.records.values()) {
      byArchive[r.archive] = (byArchive[r.archive] ?? 0) + 1;
      byLicense[r.license] = (byLicense[r.license] ?? 0) + 1;
      byExtension[r.ext] = (byExtension[r.ext] ?? 0) + 1;
      if (r.restricted) restrictedCount += 1;
      totalBytes += r.bytes;
    }
    // Backfill zero entries for known archives/licenses so dashboards
    // render a stable column set even when a source is empty.
    for (const a of REPUTABLE_ARCHIVES) if (!(a in byArchive)) byArchive[a] = 0;
    for (const l of KNOWN_LICENSES) if (!(l in byLicense)) byLicense[l] = 0;
    return {
      total: this.records.size,
      byArchive: byArchive as Record<ReputableArchive, number>,
      byLicense: byLicense as Record<KnownLicense, number>,
      byExtension,
      restrictedCount,
      totalBytes,
    };
  }

  /** Export the ledger in deterministic (sha256-sorted) order. */
  exportLedger(): ProvenanceRecord[] {
    return Array.from(this.records.values()).sort((a, b) => a.sha256.localeCompare(b.sha256));
  }

  /** Reset — used in tests only. */
  reset(): void {
    this.records.clear();
  }

  /** Bulk-load records (for runner script restart-from-disk). */
  bulkLoad(records: ProvenanceRecord[]): { loaded: number; rejected: Array<{ index: number; reason: string }> } {
    let loaded = 0;
    const rejected: Array<{ index: number; reason: string }> = [];
    for (let i = 0; i < records.length; i++) {
      const r = this.register(records[i]);
      if (r.ok) loaded++;
      else rejected.push({ index: i, reason: r.reason });
    }
    return { loaded, rejected };
  }
}

export const corpusProvenanceLedgerEngine = new CorpusProvenanceLedgerEngine();
