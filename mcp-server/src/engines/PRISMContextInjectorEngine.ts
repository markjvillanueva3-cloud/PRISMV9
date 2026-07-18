// WIRE-EXEMPT: consumed exclusively by MultiModelConsensusEngine (the
//   wrapper engine, line 199) — runs inside that engine's prompt-building
//   stage. No user-facing dispatcher action; surfacing it as one would let
//   callers bypass the consensus governance layer that owns its lifecycle.
//   GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-C6 ships the real implementation.
/**
 * PRISMContextInjectorEngine — composes relevant graph context for a
 * consensus prompt.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C6 (2026-05-22, slot echo).
 *
 * Replaces the CLEANUP-MS0/U-ENGINE-FOSSIL-2 stub. The stub threw to fail-
 * fast; MultiModelConsensusEngine wrapped that throw in try/catch and
 * fell back to the raw prompt — so consensus ran "degraded" (no graph
 * context). This real implementation:
 *
 *   1. Tokenizes the consensus prompt via the shared
 *      scripts/lib/master-index-search-lib.mjs (lazy-imported so a missing
 *      lib never breaks the build).
 *   2. Runs a master-index BM25 search for the top-K hits in PRISM's
 *      258K-node graph.
 *   3. Assembles a compact "Relevant PRISM context" blob from the hits'
 *      layer / status / label / info, capped at modelBudget characters.
 *   4. Returns { text, facts, budget, prompt } where `text` is the blob
 *      consumed at MultiModelConsensusEngine.ts:200 as the prompt prefix.
 *
 * Karpathy discipline:
 *   CLASSIFY: side-effect-tolerant service engine (reads the master graph)
 *   TECHNIQUE: tokenize → BM25 → compose → byte-cap truncation
 *   EDGE CASES: empty prompt, lib import fails, no hits, oversize hits,
 *     non-finite/0/negative modelBudget, NaN budget
 *   FAILURE MODES: every path fail-open — returns a minimal context blob
 *     ({ text: "", facts: [], budget, prompt }) on any error; never throws
 *
 * @module engines/PRISMContextInjectorEngine
 */

export interface ContextInjectorOpts {
  modelBudget?: number;
  topK?: number;
}

export interface InjectedContext {
  /** Assembled context blob — prefixed onto the consensus prompt. */
  text: string;
  /** The hit labels surfaced into the context blob (one entry per hit). */
  facts: string[];
  /** Effective character budget after clamping. */
  budget: number;
  /** Echo of the original prompt for traceability. */
  prompt: string;
}

const DEFAULT_BUDGET = 2000;
const MIN_BUDGET = 200;
const MAX_BUDGET = 8000;
const DEFAULT_TOPK = 5;
const MAX_TOPK = 10;

class PRISMContextInjectorEngineImpl {
  /**
   * Compose a context blob from master-index hits for the given prompt.
   * Fail-open on every error path.
   *
   * @param prompt - the consensus prompt (will be tokenized for retrieval)
   * @param opts.modelBudget - char budget for the assembled context (default 2000, clamped [200,8000])
   * @param opts.topK - max hits to surface (default 5, clamped [1,10])
   * @returns { text, facts, budget, prompt }
   */
  async buildContext(prompt: string, opts?: ContextInjectorOpts): Promise<InjectedContext> {
    const budget = clampBudget(opts?.modelBudget);
    const safePrompt = typeof prompt === "string" ? prompt : "";

    if (safePrompt.length === 0) {
      return { text: "", facts: [], budget, prompt: safePrompt };
    }

    const topK = clampTopK(opts?.topK);

    type SearchFn = (q: string, o?: { topK?: number }) => { hits?: unknown[] } | null;
    let searchFn: SearchFn | null = null;
    try {
      // Lazy-imported from the scripts/lib so a missing lib (mid-refactor,
      // missing graph) never breaks the build or the consensus path.
      const lib = await import("../../../scripts/lib/master-index-search-lib.mjs" as string);
      const fn = (lib as { runMasterIndexSearch?: unknown }).runMasterIndexSearch;
      if (typeof fn === "function") {
        searchFn = fn as unknown as SearchFn;
      }
    } catch {
      /* fail-open — no lib, no context */
    }

    if (searchFn === null) {
      return { text: "", facts: [], budget, prompt: safePrompt };
    }

    let hits: unknown[] = [];
    try {
      const result = searchFn(safePrompt, { topK });
      if (result !== null && Array.isArray((result as { hits?: unknown[] }).hits)) {
        hits = (result as { hits: unknown[] }).hits;
      }
    } catch {
      return { text: "", facts: [], budget, prompt: safePrompt };
    }

    return composeContext(hits, budget, safePrompt);
  }
}

function clampBudget(raw: unknown): number {
  const n = typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BUDGET;
  if (n < MIN_BUDGET) return MIN_BUDGET;
  if (n > MAX_BUDGET) return MAX_BUDGET;
  return Math.floor(n);
}

function clampTopK(raw: unknown): number {
  const n = typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TOPK;
  if (n > MAX_TOPK) return MAX_TOPK;
  return Math.floor(n);
}

interface RawHit {
  layer?: unknown;
  status?: unknown;
  label?: unknown;
  id?: unknown;
  info?: unknown;
}

/**
 * Assemble a compact markdown-ish context blob from master-index hits.
 * Pure function — testable without the graph.
 *
 * @internal exported for unit tests
 */
export function composeContext(hits: unknown[], budget: number, prompt: string): InjectedContext {
  if (!Array.isArray(hits) || hits.length === 0) {
    return { text: "", facts: [], budget, prompt };
  }
  const lines: string[] = ["### Relevant PRISM context"];
  const facts: string[] = [];
  for (const h of hits) {
    if (h === null || typeof h !== "object") continue;
    const raw = h as RawHit;
    const layer = typeof raw.layer === "string" ? raw.layer : "?";
    const status = typeof raw.status === "string" ? raw.status : "?";
    const label = typeof raw.label === "string"
      ? raw.label
      : (typeof raw.id === "string" ? raw.id : "?");
    const info = typeof raw.info === "string" ? raw.info.slice(0, 180) : "";
    lines.push(`- [${layer}/${status}] ${label}${info ? " — " + info : ""}`);
    facts.push(label);
  }
  let text = lines.join("\n");
  if (text.length > budget) {
    text = text.slice(0, budget - 1) + "…";
  }
  return { text, facts, budget, prompt };
}

export const prismContextInjectorEngine = new PRISMContextInjectorEngineImpl();
export const PRISMContextInjectorEngine = PRISMContextInjectorEngineImpl;
