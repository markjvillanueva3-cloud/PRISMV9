/**
 * LatheLoRASemanticContextEngine — LATHE-LORA-MS0/U-LLR-CONTEXT
 *
 * L1-context (RAG retrieval) of the lathe self-improving-AI loop: given a query
 * (operation + material + targets), retrieve the top-K most-similar PAST lathe
 * outcomes and assemble an augmented context bundle for a LoRA inference prompt.
 *
 * Per the india-substrate finding, this is a THIN facade over the shared store's
 * built-in similarity search (`crossProcessOutcomeStore.retrieveSimilar` — weighted
 * categorical-Hamming + numeric-Euclidean distance). It does NOT re-implement retrieval.
 * It forces `process:"lathe"` into the query context (so lathe rows score closest),
 * filters results to lathe + labeled outcomes (pending rows carry no learnable result
 * by default), and renders a compact RAG context string + optional reference snippets.
 *
 * Deterministic: retrieval is distance-ranked by the store; no Date.now / RNG here.
 */
import { crossProcessOutcomeStore, type SimilarityResult } from "./CrossProcessOutcomeStore.js";

const DEFAULT_K = 5;
const MAX_K = 50;
const RETRIEVE_MULTIPLIER = 4; // over-fetch then filter to lathe+labeled before top-K

/** Query for the RAG context — the inference whose neighbours we want. */
export interface LatheContextQuery {
  operation: string;
  material?: string;
  controller?: string;
  targetRaUm?: number;
  vc?: number;
  feed?: number;
  ap?: number;
}

export interface LatheRetrievedExample {
  operation?: string;
  material?: string;
  vc?: number;
  outcome?: string;
  reward?: number;
  /** Store distance ∈ [0,∞) — lower = more similar (0 = exact categorical+numeric match). */
  distance: number;
}

export interface LatheContextBundle {
  query: LatheContextQuery;
  k: number;
  count: number;
  retrieved: LatheRetrievedExample[];
  /** RAG-augmented context string for the LoRA prompt. */
  contextText: string;
}

export interface LatheContextOptions {
  /** Top-K neighbours to keep (default 5, clamped 0..50). */
  k?: number;
  /** Include still-pending rows in retrieval (default false — labeled outcomes only). */
  includePending?: boolean;
  /** Extra reference snippets (corpus/tribal) to append to the context string. */
  corpusSnippets?: string[];
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export class LatheLoRASemanticContextEngine {
  private renderContext(
    query: LatheContextQuery,
    retrieved: LatheRetrievedExample[],
    snippets: string[],
  ): string {
    const lines: string[] = [];
    const head =
      `Task: ${query.operation}` +
      (query.material ? ` of ${query.material}` : "") +
      (isNum(query.targetRaUm) ? ` (target Ra ${query.targetRaUm} µm)` : "") +
      ".";
    lines.push(head);
    if (retrieved.length) {
      lines.push("Similar past lathe outcomes (closest first):");
      for (const r of retrieved) {
        lines.push(
          `- ${r.operation ?? "?"}` +
            (r.material ? ` ${r.material}` : "") +
            (isNum(r.vc) ? ` vc=${r.vc}` : "") +
            ` → ${r.outcome ?? "unknown"}` +
            (isNum(r.reward) ? ` reward=${round3(r.reward)}` : ""),
        );
      }
    } else {
      lines.push("No similar past lathe outcomes on record — proceed from physics first principles.");
    }
    for (const s of snippets) {
      if (typeof s === "string" && s.length > 0) lines.push(`Reference: ${s}`);
    }
    return lines.join("\n");
  }

  /**
   * Build a RAG context bundle for a lathe inference query.
   * @throws if query.operation is missing/empty
   */
  buildContext(query: LatheContextQuery, opts: LatheContextOptions = {}): LatheContextBundle {
    if (!query || typeof query.operation !== "string" || query.operation.length === 0) {
      throw new Error("LatheLoRASemanticContext.buildContext: query.operation (non-empty string) required");
    }
    const k = Math.max(0, Math.min(MAX_K, Math.floor(opts.k ?? DEFAULT_K) || 0));

    // Build the retrieval context — only finite numerics (the store's validator rejects NaN/Inf).
    const ctx: Parameters<typeof crossProcessOutcomeStore.retrieveSimilar>[0] = {
      process: "lathe",
      operation: query.operation,
    };
    if (query.material) ctx.material = query.material;
    if (query.controller) ctx.controller = query.controller;
    if (isNum(query.targetRaUm)) ctx.target_ra_um = query.targetRaUm;
    if (isNum(query.vc)) ctx.cutting_speed_m_min = query.vc;
    if (isNum(query.feed)) ctx.feed_rate_mm_min = query.feed;
    if (isNum(query.ap)) ctx.depth_of_cut_mm = query.ap;

    let hits: SimilarityResult[] =
      k > 0 ? crossProcessOutcomeStore.retrieveSimilar(ctx, k * RETRIEVE_MULTIPLIER) : [];
    hits = hits.filter((s) => s.record.process === "lathe");
    if (!opts.includePending) {
      hits = hits.filter((s) => s.record.outcome != null && s.record.outcome.kind !== "pending");
    }
    hits = hits.slice(0, k);

    const retrieved: LatheRetrievedExample[] = hits.map((s) => ({
      operation: s.record.request_summary.operation,
      material: s.record.request_summary.material,
      vc: s.record.request_summary.cutting_speed_m_min,
      outcome: s.record.outcome?.kind,
      reward: s.record.outcome?.actual_metrics?.reward,
      distance: round3(s.distance),
    }));

    return {
      query,
      k,
      count: retrieved.length,
      retrieved,
      contextText: this.renderContext(query, retrieved, opts.corpusSnippets ?? []),
    };
  }
}

export const latheLoRASemanticContextEngine = new LatheLoRASemanticContextEngine();
