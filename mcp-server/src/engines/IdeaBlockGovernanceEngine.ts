// WIRE-EXEMPT: downstream-deferred — composed by E3 IdeaBlockRagEngine (charlie queue, prism_knowledge-wired) which gates blocks by governance tag before retrieval. E4 is a leaf classifier; the wiring path is E1 → E4 → E3.
/**
 * IdeaBlockGovernanceEngine — OBSIDIAN-INTELLIGENCE-MS3 / E4
 * ===========================================================
 * Auto-tags IdeaBlocks with four governance axes via Ollama classification:
 *   - clearance     : public | internal | confidential
 *   - version_state : current | deprecated | draft
 *   - product_line  : sfc | master-post | cad-cam-ai | wedm | lathe | mill | other
 *   - export_control: none | EAR | ITAR
 *
 * Pluggable classifier interface for testability. Default impl invokes
 * the configured Ollama coder model (qwen2.5-coder:32b on the Blackwell
 * host; the :7b tag was retired 2026-06-04). Confidence-threshold floor blocks
 * low-confidence guesses from contaminating the corpus.
 *
 * Failure model:
 *   - empty-input         → ok=false, error="empty-input"
 *   - ollama-unreachable  → ok=false, error="ollama-unreachable"
 *   - json-parse-failed   → ok=false, error="json-parse-failed"
 *   - low-confidence      → ok=false, error="low-confidence" (advisory; non-fatal at orchestration layer)
 *   - schema-violation    → ok=false, error="schema-violation"
 *
 * @module engines/IdeaBlockGovernanceEngine
 */

import { z } from "zod";

/* ---- canonical enums ---- */

export const ClearanceEnum = z.enum(["public", "internal", "confidential"]);
export const VersionStateEnum = z.enum(["current", "deprecated", "draft"]);
export const ProductLineEnum = z.enum([
  "sfc", "master-post", "cad-cam-ai", "wedm", "lathe", "mill", "other",
]);
export const ExportControlEnum = z.enum(["none", "EAR", "ITAR"]);

export type Clearance = z.infer<typeof ClearanceEnum>;
export type VersionState = z.infer<typeof VersionStateEnum>;
export type ProductLine = z.infer<typeof ProductLineEnum>;
export type ExportControl = z.infer<typeof ExportControlEnum>;

export const GovernanceTagsSchema = z.object({
  clearance: ClearanceEnum,
  version_state: VersionStateEnum,
  product_line: ProductLineEnum,
  export_control: ExportControlEnum,
  confidence: z.number().min(0).max(1),
}).strict();

export type GovernanceTags = z.infer<typeof GovernanceTagsSchema>;

export const IdeaBlockGovernanceErrorClassSchema = z.enum([
  "ollama-unreachable",
  "json-parse-failed",
  "schema-violation",
  "empty-input",
  "low-confidence",
  "timeout",
]);
export type IdeaBlockGovernanceErrorClass = z.infer<typeof IdeaBlockGovernanceErrorClassSchema>;

/* ---- pluggable classifier interface ---- */

export interface ClassifierResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export interface ClassifierFn {
  (prompt: string): Promise<ClassifierResult>;
}

/* ---- core helpers (pure, exported for tests) ---- */

const DEFAULT_CONFIDENCE_FLOOR = 0.6;
const MAX_INPUT_CHARS = 8_000;
const REPAIR_PROMPT_BAD_RESPONSE_MAX = 2_000;

/**
 * Build the classification prompt — pure, deterministic, returnable to tests.
 */
export function buildClassifyPrompt(question: string, answer: string): string {
  return [
    "You are a manufacturing-software content governance classifier.",
    "Given a Q&A IdeaBlock, return a JSON object with these EXACT keys:",
    "  clearance      ∈ ['public','internal','confidential']",
    "  version_state  ∈ ['current','deprecated','draft']",
    "  product_line   ∈ ['sfc','master-post','cad-cam-ai','wedm','lathe','mill','other']",
    "  export_control ∈ ['none','EAR','ITAR']",
    "  confidence     ∈ [0.0, 1.0]  (your subjective certainty)",
    "Rules:",
    "  - public        = general manufacturing knowledge / open documentation",
    "  - internal      = JM Die operations / tribal knowledge / process notes",
    "  - confidential  = customer-specific or competitive-advantage detail",
    "  - export_control: EAR/ITAR ONLY if content explicitly references controlled tech",
    "Output JSON only — no prose, no markdown fences.",
    "",
    "QUESTION:",
    question.slice(0, MAX_INPUT_CHARS),
    "",
    "ANSWER:",
    answer.slice(0, MAX_INPUT_CHARS),
    "",
    "JSON:",
  ].join("\n");
}

/**
 * Robust JSON extraction — depth-aware brace matcher (mirrors E1 pattern).
 * Returns first parseable object containing a `clearance` key.
 */
export function tryParseGovernanceJson(raw: string): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const s = raw;
  let firstValid: Record<string, unknown> | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s.charAt(i) !== "{") continue;
    const end = findMatchingBrace(s, i);
    if (end === -1) break;
    const candidate = s.slice(i, end + 1);
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if ("clearance" in obj) return obj;
        if (firstValid === null) firstValid = obj;
      }
    } catch {
      /* try next */
    }
    i = end;
  }
  return firstValid;
}

function findMatchingBrace(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s.charAt(i);
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* ---- engine ---- */

export interface ClassifyInput {
  question: string;
  answer: string;
}

export interface ClassifyOk {
  ok: true;
  tags: GovernanceTags;
  raw_response_length: number;
}

export interface ClassifyFail {
  ok: false;
  error: IdeaBlockGovernanceErrorClass;
  detail?: string;
}

export type ClassifyResult = ClassifyOk | ClassifyFail;

export class IdeaBlockGovernanceEngine {
  private classifier: ClassifierFn;
  private confidenceFloor: number;

  constructor(opts: { classifier: ClassifierFn; confidenceFloor?: number }) {
    this.classifier = opts.classifier;
    this.confidenceFloor = opts.confidenceFloor ?? DEFAULT_CONFIDENCE_FLOOR;
  }

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    if (!input || !input.question || !input.answer) {
      return { ok: false, error: "empty-input" };
    }
    const prompt = buildClassifyPrompt(input.question, input.answer);
    let result: ClassifierResult;
    try {
      result = await this.classifier(prompt);
    } catch (err) {
      return {
        ok: false,
        error: "ollama-unreachable",
        detail: String(err instanceof Error ? err.message : err).slice(0, REPAIR_PROMPT_BAD_RESPONSE_MAX),
      };
    }
    if (!result || !result.ok) {
      return {
        ok: false,
        error: "ollama-unreachable",
        detail: result?.error,
      };
    }
    const raw = result.text || "";
    const parsed = tryParseGovernanceJson(raw);
    if (!parsed) {
      return { ok: false, error: "json-parse-failed", detail: raw.slice(0, 200) };
    }
    const validation = GovernanceTagsSchema.safeParse(parsed);
    if (!validation.success) {
      return { ok: false, error: "schema-violation", detail: validation.error.issues.map((i) => i.path.join(".")).join(",") };
    }
    if (validation.data.confidence < this.confidenceFloor) {
      return { ok: false, error: "low-confidence", detail: `${validation.data.confidence.toFixed(3)} < ${this.confidenceFloor}` };
    }
    return { ok: true, tags: validation.data, raw_response_length: raw.length };
  }
}
