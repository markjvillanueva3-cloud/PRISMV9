/**
 * SpeedFeedPDFCorpusBridgeEngine — bridge fleet-extracted PDF corpora → speed-feed prior
 *
 * Closes U-OSC9-10 of OSCAR-SFC-9AXIS-MS0. Operator directive 2026-05-26:
 *   "whiskey, lima, mike, foxtrot and echo are all doing pdf extraction for their domains.
 *    the nodes, wiki and tribal knowledge should directly effect your domain so coordinate
 *    with other chats so you can bridge their nodes to the speed feed calculator."
 *
 * The fleet has shipped 3+ PDF-extraction surfaces, each in a different schema:
 *
 *   Source A — kilo's CAD/CAM tribal seeds
 *     `state/shared/cad-cam-pdf-tribal-seeds.json`
 *     Shape: { tips: [{ id, domain, software, title, text, tags, ... }] }
 *     Coverage: 4 software-keyed pointer tips (solidworks/hypermill/mastercam/+1), 148 nodes total
 *
 *   Source B — fleet JSONL tip ledgers
 *     `state/shared/extracted-pdfs/*.jsonl`
 *     Shape (one JSON per line): { id, domain, topic, tip, source: {book, author, year, ...}, bridge_engines, confidence, audience, ... }
 *     Coverage: lathe / shop-safety / toolpath / workholding / control tips from Autodesk 2014 +
 *               Fundamentals of CNC Machining + Mech Eng Handbook
 *
 *   Source C — mike's WEDM training-corpus pairs (NOT bridged in this iter)
 *     `state/shared/wedm-training-corpus/<part>-phase-a1.json`
 *     Shape: { blueprint_paths[], reference_program_path, reference_metadata } — paired training
 *            records, NOT tribal tips. Different abstraction — bridged in iter4.
 *
 * This bridge READS sources A + B, normalizes to a unified PDFCorpusEvidence shape,
 * filters by SFC-relevant domain, scores by keyword/software match, and returns the
 * top-K evidence list to the caller. It does NOT mutate the corpus files.
 *
 * Pure composition (R8/R11): the existing SpeedFeedPSNDecisionPriorEngine already
 * queries tribal_knowledge as one of 3 PSN surfaces. This engine surfaces a denser,
 * domain-filtered slice for inclusion in the NineAxisInput / PSN-prior compute,
 * without re-implementing keyword search or schema unification at the PSN-prior layer.
 *
 * @module engines/SpeedFeedPDFCorpusBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-10
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

/** SFC-relevant domain values surfaced from the upstream extractors. */
export type SFCDomain = "mill" | "lathe" | "wedm" | "cam" | "cad" | "training" | "mfg" | "machine" | "catalog" | "blueprint";

/** Domains we accept from upstream when no filter is supplied (covers all SFC-touching). */
const DEFAULT_DOMAIN_ALLOWLIST: SFCDomain[] = ["mill", "lathe", "wedm", "cam", "training", "mfg", "machine"];

/** Default workspace root — caller can override via env (mainly for tests). */
function defaultWorkspaceRoot(): string {
  return process.env["PRISM_WORKSPACE_ROOT"] ?? "H:/prism";
}

/** kilo's tribal seeds file (Source A). */
function defaultTribalSeedsPath(): string {
  return join(defaultWorkspaceRoot(), "state", "shared", "cad-cam-pdf-tribal-seeds.json");
}

/** Fleet JSONL ledger dir (Source B). */
function defaultExtractedPdfsDir(): string {
  return join(defaultWorkspaceRoot(), "state", "shared", "extracted-pdfs");
}

// ============================================================================
// SCHEMA — INPUT
// ============================================================================

export const PDFCorpusBridgeInputSchema = z.object({
  /** Domain allowlist — filters to SFC-touching domains. Defaults to {mill,lathe,wedm,cam,training,mfg,machine}. */
  domains: z
    .array(z.enum(["mill", "lathe", "wedm", "cam", "cad", "training", "mfg", "machine", "catalog", "blueprint"]))
    .optional(),
  /** Software allowlist — e.g. ["hypermill","mastercam"]. Empty/omitted → no software filter. */
  software: z.array(z.string()).optional(),
  /** Keyword list — tip.text containing ANY keyword is kept; matches are scored. */
  keywords: z.array(z.string().min(1)).max(20).optional(),
  /** Top-K cap (default 10). */
  top_k: z.number().int().positive().max(100).default(10),
  /** Override Source A path (tests). */
  tribal_seeds_path: z.string().optional(),
  /** Override Source B dir (tests). */
  extracted_pdfs_dir: z.string().optional(),
});

export type PDFCorpusBridgeInput = z.infer<typeof PDFCorpusBridgeInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Unified evidence row from any upstream PDF extractor. */
export interface PDFCorpusEvidence {
  /** Stable id from the upstream extractor (preserved verbatim). */
  id: string;
  /** Source schema (which extractor wrote this). */
  source: "kilo-tribal-seeds" | "fleet-jsonl";
  /** Source file path (for traceability). */
  source_path: string;
  /** SFC-relevant domain bucket. */
  domain: SFCDomain | string;
  /** Optional software family (Source A only). */
  software?: string;
  /** Optional topic (Source B — e.g. "6-stage-lathe-operation-sequence"). */
  topic?: string;
  /** Short title or first line. */
  title: string;
  /** Full tip text. */
  text: string;
  /** Upstream confidence (Source B carries this; Source A pointers default to 0.5). */
  confidence: number;
  /** Tags for cross-reference (Source A: ["cad","solidworks","pdf-corpus",...]). */
  tags: string[];
  /** Optional bridge-engine cross-refs (Source B — e.g. ["LathePostProcessorEngine"]). */
  bridge_engines: string[];
  /** Optional book reference (Source B). */
  book?: { author?: string; title?: string; year?: number; chapter?: number; pages?: string };
  /** Relevance score computed during ranking (keyword hits + confidence-weighted). */
  relevance_score: number;
}

export interface PDFCorpusBridgeSummary {
  total_loaded: number;
  filtered_by_domain: number;
  filtered_by_software: number;
  filtered_by_keywords: number;
  returned: number;
  sources_read: { kilo: boolean; fleet_jsonl_count: number };
  warnings: string[];
}

export interface PDFCorpusBridgeResult {
  evidence: PDFCorpusEvidence[];
  summary: PDFCorpusBridgeSummary;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedPDFCorpusBridgeEngine {
  /**
   * Read + normalize + filter + rank the PDF-corpus evidence streams.
   *
   * @param raw PDFCorpusBridgeInput — domain/software/keyword filters + K cap + path overrides
   * @returns PDFCorpusBridgeResult — ranked evidence + audit summary
   */
  run(raw: unknown): PDFCorpusBridgeResult {
    const input = PDFCorpusBridgeInputSchema.parse(raw);
    const warnings: string[] = [];

    const tribalSeedsPath = input.tribal_seeds_path ?? defaultTribalSeedsPath();
    const extractedPdfsDir = input.extracted_pdfs_dir ?? defaultExtractedPdfsDir();

    // 1. Load both sources (best-effort — missing source is a warning, not an error).
    const sourceA = this.loadKiloTribalSeeds(tribalSeedsPath, warnings);
    const sourceB = this.loadFleetJsonl(extractedPdfsDir, warnings);

    const loaded: PDFCorpusEvidence[] = [...sourceA.evidence, ...sourceB.evidence];
    const totalLoaded = loaded.length;

    // 2. Filter by domain.
    const allowedDomains = new Set<string>(input.domains ?? DEFAULT_DOMAIN_ALLOWLIST);
    const afterDomain = loaded.filter((e) => allowedDomains.has(e.domain));
    const filteredByDomain = totalLoaded - afterDomain.length;

    // 3. Filter by software (Source A only — Source B has no software tag).
    let afterSoftware = afterDomain;
    let filteredBySoftware = 0;
    if (input.software && input.software.length > 0) {
      const wantSoftware = new Set(input.software.map((s) => s.toLowerCase()));
      afterSoftware = afterDomain.filter((e) => {
        if (e.software) return wantSoftware.has(e.software.toLowerCase());
        // Source B has no software field — keep all (operator filter is for source A)
        return e.source !== "kilo-tribal-seeds";
      });
      filteredBySoftware = afterDomain.length - afterSoftware.length;
    }

    // 4. Filter + score by keywords.
    let afterKeywords = afterSoftware;
    let filteredByKeywords = 0;
    if (input.keywords && input.keywords.length > 0) {
      const kws = input.keywords.map((k) => k.toLowerCase());
      afterKeywords = afterSoftware.filter((e) => {
        const haystack = `${e.title}\n${e.text}\n${e.tags.join(" ")}\n${e.topic ?? ""}`.toLowerCase();
        const hits = kws.filter((k) => haystack.includes(k)).length;
        if (hits === 0) return false;
        // Boost relevance by hit count + confidence.
        e.relevance_score = hits + e.confidence;
        return true;
      });
      filteredByKeywords = afterSoftware.length - afterKeywords.length;
    } else {
      // No keywords → relevance is just confidence.
      for (const e of afterKeywords) e.relevance_score = e.confidence;
    }

    // 5. Sort by relevance descending, cap at top_k.
    afterKeywords.sort((a, b) => b.relevance_score - a.relevance_score);
    const returned = afterKeywords.slice(0, input.top_k);

    return {
      evidence: returned,
      summary: {
        total_loaded: totalLoaded,
        filtered_by_domain: filteredByDomain,
        filtered_by_software: filteredBySoftware,
        filtered_by_keywords: filteredByKeywords,
        returned: returned.length,
        sources_read: {
          kilo: sourceA.read_ok,
          fleet_jsonl_count: sourceB.files_read,
        },
        warnings,
      },
    };
  }

  // -- Source A: kilo's tribal seeds JSON ------------------------------------

  private loadKiloTribalSeeds(
    path: string,
    warnings: string[],
  ): { evidence: PDFCorpusEvidence[]; read_ok: boolean } {
    if (!existsSync(path)) {
      warnings.push(`kilo tribal-seeds file not found at ${path} (Source A skipped)`);
      return { evidence: [], read_ok: false };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      warnings.push(`failed to parse kilo tribal-seeds at ${path}: ${err instanceof Error ? err.message : String(err)}`);
      return { evidence: [], read_ok: false };
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Record<string, unknown>)["tips"])) {
      warnings.push(`kilo tribal-seeds at ${path} has no tips array`);
      return { evidence: [], read_ok: false };
    }
    const tips = (parsed as { tips: Array<Record<string, unknown>> }).tips;
    const evidence: PDFCorpusEvidence[] = tips
      .filter((t) => typeof t.id === "string" && typeof t.text === "string")
      .map((t) => ({
        id: String(t.id),
        source: "kilo-tribal-seeds" as const,
        source_path: path,
        domain: typeof t.domain === "string" ? t.domain : "unknown",
        software: typeof t.software === "string" ? t.software : undefined,
        title: typeof t.title === "string" ? t.title : String(t.id),
        text: String(t.text),
        confidence: 0.5, // pointer tips — moderate baseline confidence
        tags: Array.isArray(t.tags) ? t.tags.filter((x): x is string => typeof x === "string") : [],
        bridge_engines: [],
        relevance_score: 0, // populated during ranking
      }));
    return { evidence, read_ok: true };
  }

  // -- Source B: fleet JSONL tip ledgers -------------------------------------

  private loadFleetJsonl(
    dir: string,
    warnings: string[],
  ): { evidence: PDFCorpusEvidence[]; files_read: number } {
    if (!existsSync(dir)) {
      warnings.push(`fleet extracted-pdfs dir not found at ${dir} (Source B skipped)`);
      return { evidence: [], files_read: 0 };
    }
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
    } catch (err) {
      warnings.push(`failed to list fleet extracted-pdfs dir at ${dir}: ${err instanceof Error ? err.message : String(err)}`);
      return { evidence: [], files_read: 0 };
    }
    const evidence: PDFCorpusEvidence[] = [];
    let filesRead = 0;
    for (const f of files) {
      const full = join(dir, f);
      let raw: string;
      try {
        raw = readFileSync(full, "utf8");
      } catch (err) {
        warnings.push(`skipped ${f}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      filesRead++;
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        let row: unknown;
        try {
          row = JSON.parse(line);
        } catch {
          // Skip malformed lines — JSONL is line-oriented, one bad line shouldn't kill the file.
          continue;
        }
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : undefined;
        const tip = typeof r.tip === "string" ? r.tip : undefined;
        if (!id || !tip) continue;
        const sourceMeta = (r.source && typeof r.source === "object" ? r.source : {}) as Record<string, unknown>;
        evidence.push({
          id,
          source: "fleet-jsonl",
          source_path: full,
          domain: typeof r.domain === "string" ? r.domain : "unknown",
          topic: typeof r.topic === "string" ? r.topic : undefined,
          title: typeof r.topic === "string" ? r.topic : id,
          text: tip,
          confidence: typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0.5,
          tags: [],
          bridge_engines: Array.isArray(r.bridge_engines)
            ? r.bridge_engines.filter((x): x is string => typeof x === "string")
            : [],
          book:
            sourceMeta.book || sourceMeta.author
              ? {
                  author: typeof sourceMeta.author === "string" ? sourceMeta.author : undefined,
                  title: typeof sourceMeta.book === "string" ? sourceMeta.book : undefined,
                  year: typeof sourceMeta.year === "number" ? sourceMeta.year : undefined,
                  chapter: typeof sourceMeta.chapter === "number" ? sourceMeta.chapter : undefined,
                  pages: typeof sourceMeta.pages === "string" ? sourceMeta.pages : undefined,
                }
              : undefined,
          relevance_score: 0,
        });
      }
    }
    return { evidence, files_read: filesRead };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedPDFCorpusBridgeEngine = new SpeedFeedPDFCorpusBridgeEngine();
