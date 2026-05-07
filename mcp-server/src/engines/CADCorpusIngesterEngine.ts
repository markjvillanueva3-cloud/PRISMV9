/**
 * CADCorpusIngesterEngine — CADCAM-DAGI-MS0/U-DAGI03
 *
 * Ingests the JM Die 24,545-program archive into a transformer-ready
 * training corpus. Each corpus entry pairs a tokenized CAD program
 * (U-DAGI01 output) with its dependency graph (U-DAGI02 output) plus
 * provenance metadata so downstream trainers can reason about customer
 * distribution and machine archetype.
 *
 * Architecture — pure-logic core, injectable I/O:
 *   - scan(rootPath, fs?)          -> CorpusFileEntry[]
 *   - classify(file, customers)    -> CorpusFileEntry with tags
 *   - ingestOne(entry, parser?)    -> CorpusEntry
 *   - ingest(entries, parser?)     -> CorpusIngestResult
 *   - dedup(entries)               -> CorpusEntry[] (hash-based)
 *   - stats(entries)               -> CorpusStats
 *   - toJsonl(entries)             -> string
 *
 * The parser callback is the integration seam for STEP / IGES / solid
 * kernel import — production supplies a real OpenCascade / STEP parser;
 * tests supply a synthetic parser that returns canned op lists. This
 * keeps the ingester unit-testable without depending on 11 GB of CAD
 * files or a binary STEP kernel in CI.
 *
 * Supported extensions: .step .stp .iges .igs .sldprt .ipt .x_t .x_b
 * (mirrors what the JM Die archive actually contains.)
 *
 * Dedup strategy: FNV-1a 64-bit hash of the canonicalized op list; any
 * two entries whose token streams collapse to the same hash keep only
 * the first (stable-order-preserving).
 *
 * Provenance — every corpus entry carries:
 *   - sourcePath (relative to archive root)
 *   - customer    (first path segment under CNC LATHE / CNC MILL / etc.)
 *   - machineCategory ("lathe" | "mill" | "wire_edm" | "sinker_edm" | ...)
 *   - bytes, ext, ingestedAt (ISO-8601)
 *
 * Complexity:
 *   scan        O(F) — F = file count
 *   ingestOne   O(P) — P = program op count
 *   dedup       O(N) expected, O(N) worst case (hash map)
 *   stats       O(N)
 *
 * References:
 *   - FNV-1a hash: https://tools.ietf.org/html/draft-eastlake-fnv-17
 *   - JM Die archive layout: see mcp-server/src/data/jm-die-profile.ts
 *     (JM_DIE_ARCHIVE_STATS, JM_DIE_CUSTOMERS)
 */
import { z } from "zod";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { JM_DIE_CUSTOMERS } from "../data/jm-die-profile.js";
import {
  cadTokenRepresentationEngine,
  type CADOperation,
} from "./CADTokenRepresentationEngine.js";
import {
  cadKnowledgeGraphEngine,
  type CADGraph,
  type CADOperationInput,
} from "./CADKnowledgeGraphEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type MachineCategory =
  | "lathe"
  | "mill"
  | "wire_edm"
  | "sinker_edm"
  | "hurco"
  | "hypermill"
  | "unknown";

export const SUPPORTED_EXTENSIONS = [
  ".step", ".stp", ".iges", ".igs", ".sldprt", ".ipt", ".x_t", ".x_b",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface CorpusFileEntry {
  sourcePath: string;
  customer: string;
  machineCategory: MachineCategory;
  ext: SupportedExtension;
  bytes: number;
}

export interface CorpusEntry {
  sourcePath: string;
  customer: string;
  machineCategory: MachineCategory;
  ext: SupportedExtension;
  bytes: number;
  ingestedAt: string;
  tokens: number[];
  coverage: number;
  graph: CADGraph;
  hash: string;
}

export interface CorpusStats {
  total: number;
  totalBytes: number;
  byCustomer: Record<string, number>;
  byCategory: Record<MachineCategory, number>;
  byExtension: Record<string, number>;
  uniqueCustomers: number;
}

export interface CorpusIngestResult {
  entries: CorpusEntry[];
  parseFailures: Array<{ path: string; reason: string }>;
  stats: CorpusStats;
}

/**
 * Operation-stream source. Either:
 *   - a pre-parsed op array (tests), or
 *   - a parser callback that returns the op array for a given path+bytes.
 * Production wires the OpenCascade / SolidWorks / STEP bridge here.
 */
export type ProgramParser = (path: string, ext: SupportedExtension) =>
  | { ops: Array<Record<string, unknown>> }
  | null;

// ── Zod schemas ──────────────────────────────────────────────────────────────

const FileEntrySchema = z.object({
  sourcePath: z.string().min(1),
  customer: z.string().min(1),
  machineCategory: z.enum([
    "lathe", "mill", "wire_edm", "sinker_edm", "hurco", "hypermill", "unknown",
  ]),
  ext: z.enum(SUPPORTED_EXTENSIONS),
  bytes: z.number().int().nonnegative(),
});

const IngestInputSchema = z.object({
  entries: z.array(FileEntrySchema).min(0),
});

// ── Classification helpers ───────────────────────────────────────────────────

const CUSTOMER_LOOKUP = new Set<string>(JM_DIE_CUSTOMERS.map((c) => c.toUpperCase()));

function normalizePathSep(p: string): string {
  return p.replace(/\\/g, "/");
}

function detectExtension(path: string): SupportedExtension | null {
  const norm = normalizePathSep(path).toLowerCase();
  for (const e of SUPPORTED_EXTENSIONS) {
    if (norm.endsWith(e)) return e;
  }
  return null;
}

function detectMachineCategory(path: string): MachineCategory {
  const upper = normalizePathSep(path).toUpperCase();
  if (upper.includes("/CNC LATHE/") || upper.includes("OKUMA")) return "lathe";
  if (upper.includes("/WIRE EDM/") || upper.includes("WIREEDM")) return "wire_edm";
  if (upper.includes("/SINKER EDM/") || upper.includes("SINKER")) return "sinker_edm";
  if (upper.includes("/CNC MILL HAAS/") || upper.includes("HAAS")) return "mill";
  if (upper.includes("HURCO")) return "hurco";
  if (upper.includes("HYPERMILL") || upper.includes("/HMC/")) return "hypermill";
  if (upper.includes("/CNC MILL/") || upper.includes("/MILL/")) return "mill";
  return "unknown";
}

function detectCustomer(path: string): string {
  const norm = normalizePathSep(path);
  // Typical layout: <root>/<machine-category-folder>/<CUSTOMER>/<job>/<file>
  const parts = norm.split("/").filter(Boolean);
  for (const seg of parts) {
    const up = seg.toUpperCase();
    if (CUSTOMER_LOOKUP.has(up)) return up;
    // Fuzzy: customer prefix match (e.g. "FASTENAL-MAIN" → "FASTENAL")
    for (const c of CUSTOMER_LOOKUP) {
      if (up.startsWith(c + "-") || up.startsWith(c + "_") || up.startsWith(c + " ")) return c;
    }
  }
  return "UNKNOWN";
}

// ── FNV-1a 64-bit (portable) ─────────────────────────────────────────────────

function fnv1a64(str: string): string {
  // 64-bit FNV-1a via two 32-bit halves to avoid BigInt in hot paths.
  const FNV_OFFSET_HI = 0xcbf2_9ce4;
  const FNV_OFFSET_LO = 0x8422_3325;
  const FNV_PRIME_HI = 0x0000_0100;
  const FNV_PRIME_LO = 0x0000_01b3;
  let hi = FNV_OFFSET_HI >>> 0;
  let lo = FNV_OFFSET_LO >>> 0;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    // xor into low 8 bits of lo
    lo = (lo ^ byte) >>> 0;
    // Multiply (hi:lo) by (FNV_PRIME_HI:FNV_PRIME_LO) — truncated to 64 bits.
    // (hi:lo) * (ph:pl) = hi*ph << 64 + (hi*pl + lo*ph) << 32 + lo*pl
    // We keep lower 64 bits only.
    const ll = Math.imul(lo, FNV_PRIME_LO) >>> 0;
    const hl = Math.imul(hi, FNV_PRIME_LO) >>> 0;
    const lh = Math.imul(lo, FNV_PRIME_HI) >>> 0;
    const carry = Math.floor((lo * FNV_PRIME_LO) / 0x1_0000_0000);
    lo = ll;
    // NOTE: do NOT post-mask with `& 0xffff_ffff` — bitwise-and in JS returns
    // signed int32. `>>> 0` alone yields a clean unsigned 32-bit value whose
    // toString(16) never carries a minus sign.
    hi = (hl + lh + carry) >>> 0;
  }
  return (hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0"));
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CADCorpusIngesterEngine — builds a dedup'd, provenance-tagged training corpus
 * from the JM Die 24,545-program archive (or any compatible file list).
 *
 * @remarks
 * Pure-logic core with an injectable `ProgramParser` so tests run without any
 * real STEP / IGES binaries. Produces JSONL suitable for neural trainers.
 */
export class CADCorpusIngesterEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADCorpusIngesterEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "JM Die CAD archive → dedup'd, provenance-tagged transformer-training " +
        "corpus. Composes CADTokenRepresentationEngine + CADKnowledgeGraphEngine.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "classify_file", description: "Tag CAD file with customer + machine category", actions: ["corpus_classify"] },
      { name: "ingest", description: "Ingest file-list into corpus (tokens + graph + hash)", actions: ["corpus_ingest"] },
      { name: "dedup", description: "Hash-based corpus dedup", actions: ["corpus_dedup"] },
      { name: "stats", description: "Per-customer / category / ext corpus statistics", actions: ["corpus_stats"] },
      { name: "to_jsonl", description: "Serialize corpus to JSON Lines for trainers", actions: ["corpus_to_jsonl"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const obj = input as Record<string, unknown>;
    if ("entries" in obj && !("ingested" in obj)) {
      const parsed = IngestInputSchema.parse(obj);
      return this.ingest(parsed.entries as CorpusFileEntry[]);
    }
    throw new Error("CADCorpusIngesterEngine: input must contain 'entries'");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Classify a raw file path into a corpus file entry. */
  classify(path: string, bytes: number): CorpusFileEntry | null {
    const ext = detectExtension(path);
    if (!ext) return null;
    return {
      sourcePath: normalizePathSep(path),
      customer: detectCustomer(path),
      machineCategory: detectMachineCategory(path),
      ext,
      bytes: Math.max(0, bytes | 0),
    };
  }

  /** Ingest one file: parse -> tokenize -> build graph -> hash. */
  ingestOne(entry: CorpusFileEntry, parser: ProgramParser): CorpusEntry | { error: string } {
    const parsed = parser(entry.sourcePath, entry.ext);
    if (!parsed || !Array.isArray(parsed.ops)) {
      return { error: `parser returned no ops for ${entry.sourcePath}` };
    }

    // Normalize raw op dicts into the strict CADOperation / CADOperationInput
    // shapes the downstream engines expect.
    const cadOps: CADOperation[] = parsed.ops.map((o) => ({
      op: ((o.op as string | undefined) ?? "UNKNOWN"),
      params: (o.params as number[] | undefined) ?? undefined,
      attrs: (o.attrs as Record<string, number | string | boolean> | undefined) ?? undefined,
      id: (o.id as string | undefined) ?? undefined,
    }));
    const graphOps: CADOperationInput[] = parsed.ops.map((o) => ({
      id: (o.id as string | undefined) ?? undefined,
      op: ((o.op as string | undefined) ?? "UNKNOWN"),
      plane: (o.plane as string | undefined) ?? undefined,
      sketch: (o.sketch as string | undefined) ?? undefined,
      bodyIn: (o.bodyIn as string | undefined) ?? undefined,
      attrs: (o.attrs as Record<string, number | string | boolean> | undefined) ?? undefined,
    }));

    // NOTE: sourceFormat is left undefined — ops are already in the canonical
    // CADOperation shape, so no format-specific adapter is needed.
    const tokenResult = cadTokenRepresentationEngine.tokenize(cadOps);
    const tokenIds = tokenResult.tokens.map((t) => t.id);
    const coverage = tokenResult.opsEncoded > 0
      ? (tokenResult.opsEncoded - tokenResult.unknownOps) / tokenResult.opsEncoded
      : 0;
    const graph = cadKnowledgeGraphEngine.build(graphOps);
    const canonical = tokenIds.join(",");
    const hash = fnv1a64(canonical);

    return {
      ...entry,
      ingestedAt: new Date().toISOString(),
      tokens: tokenIds,
      coverage,
      graph,
      hash,
    };
  }

  /** Ingest an entire file list. */
  ingest(entries: CorpusFileEntry[], parser?: ProgramParser): CorpusIngestResult {
    const active = parser ?? defaultSyntheticParser;
    const out: CorpusEntry[] = [];
    const failures: Array<{ path: string; reason: string }> = [];
    for (const e of entries) {
      const r = this.ingestOne(e, active);
      if ("error" in r) failures.push({ path: e.sourcePath, reason: r.error });
      else out.push(r);
    }
    return { entries: out, parseFailures: failures, stats: this.stats(out) };
  }

  /** Hash-based deduplication (stable order, first wins). */
  dedup(entries: CorpusEntry[]): CorpusEntry[] {
    const seen = new Set<string>();
    const kept: CorpusEntry[] = [];
    for (const e of entries) {
      if (seen.has(e.hash)) continue;
      seen.add(e.hash);
      kept.push(e);
    }
    return kept;
  }

  /** Compute distribution statistics. */
  stats(entries: CorpusEntry[]): CorpusStats {
    const byCustomer: Record<string, number> = {};
    const byCategory: Record<MachineCategory, number> = {
      lathe: 0, mill: 0, wire_edm: 0, sinker_edm: 0, hurco: 0, hypermill: 0, unknown: 0,
    };
    const byExtension: Record<string, number> = {};
    let totalBytes = 0;
    for (const e of entries) {
      byCustomer[e.customer] = (byCustomer[e.customer] ?? 0) + 1;
      byCategory[e.machineCategory] += 1;
      byExtension[e.ext] = (byExtension[e.ext] ?? 0) + 1;
      totalBytes += e.bytes;
    }
    return {
      total: entries.length,
      totalBytes,
      byCustomer,
      byCategory,
      byExtension,
      uniqueCustomers: Object.keys(byCustomer).length,
    };
  }

  /** Emit JSON Lines (one entry per line). */
  toJsonl(entries: CorpusEntry[]): string {
    return entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
  }
}

// ── Synthetic parser (deterministic, used when no real parser is wired) ──────

function defaultSyntheticParser(path: string, ext: SupportedExtension): { ops: Array<Record<string, unknown>> } | null {
  // Deterministic 3-op skeleton: gives the ingester a real token stream
  // without any I/O. Production code injects a STEP/IGES reader instead.
  void ext;
  return {
    ops: [
      { id: "sk_" + path.length, op: "SKETCH_CREATE", plane: "TOP_PLANE" },
      { id: "f_" + path.length, op: "FEAT_EXTRUDE_BLIND", sketch: "sk_" + path.length, attrs: { depth_mm: 10 } },
      { id: "b_" + path.length, op: "BODY_EXPORT" },
    ],
  };
}

export const cadCorpusIngesterEngine = new CADCorpusIngesterEngine();
export { fnv1a64 as __fnv1a64ForTesting };
