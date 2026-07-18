/**
 * CADTribalDrawInjectionEngine -- per-feature tribal/wiki/memory feed DURING drawing
 * (delta/CAD, U-CADDRAW-TRIBAL-INJECT, 2026-06-19). Stage S2 of the comprehensive CAD-drawing
 * pipeline (state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md).
 *
 * The CAD analog of CAMTribalKnowledgeInjectionEngine: at each feature-authoring decision, surface
 * the relevant operator lessons so the draw step APPLIES them (set inch units, undersize the
 * electrode by the spark gap, never emit a periodic B-spline, match the archetype before scaling,
 * topology before tolerance, lint the STEP). CAM already injects tribal knowledge per-operation
 * (camDispatcher); CAD did not -- knowledge was only injected at session start. This closes that gap.
 *
 * PURE + deterministic: the corpus of tips is passed IN (the dispatcher/runner loads the jsonl);
 * recommend() ranks by relevance to the draw context and returns the applicable tips. No I/O.
 *
 * Relevance (in [0,1], base 0.25):
 *   +0.35 operation token overlaps the tip's `consume` field (or `consume` says "all" = universal)
 *   +0.25 featureType token appears in the tip text / slug / consume
 *   +0.20 a query token appears in the tip text / slug
 *   +0.10 universal applicability ("all" in consume)
 *   +0.15 kind == failure-mode   |   +0.10 kind == convention / doctrine   (rank boost only)
 * A tip is `matched` (eligible to inject) ONLY when a CONTEXT signal fired (operation / featureType /
 * query / universal) -- the kind boost alone never injects an off-context tip. Ties break by id asc.
 *
 * Actions (via cadDispatcher): cad_tribal_draw_query
 */

import { z } from "zod";

const BASE_RELEVANCE = 0.25;
const DEFAULT_LIMIT = 5;

export interface CADTribalTip {
  id: string;
  slug: string;
  kind: string; // failure-mode | doctrine | convention | process | ...
  tip: string;
  consume: string; // free-text "where it applies"
  source?: string;
  domain?: string;
}

export interface DrawContext {
  /** the feature being authored, e.g. "diameter", "bore", "electrode", "chamfer". */
  featureType?: string;
  /** the drawing operation, e.g. "step-emit", "electrode", "replicate", "mutate", "sketch", "verify". */
  operation?: string;
  /** free-text query for keyword matching. */
  query?: string;
  /** cap on returned tips. Default 5. */
  limit?: number;
}

export interface RankedDrawTip extends CADTribalTip {
  relevanceScore: number;
  matched: boolean;
}

export interface DrawInjection {
  context: DrawContext;
  considered: number; // corpus size
  injectedCount: number;
  applied: RankedDrawTip[]; // top-K matched tips, ranked
}

const DrawContextSchema = z.object({
  featureType: z.string().optional(),
  operation: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().min(0).max(50).optional(),
});

const TipSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  kind: z.string().optional(),
  tip: z.string().optional(),
  consume: z.string().optional(),
  source: z.string().optional(),
  domain: z.string().optional(),
});

// Function words that must NEVER drive a tribal-tip match. Without this filter a query like
// "a 2.0 inch BY 1.0 inch ... plate" overlapped the sinker-EDM spark-gap tip solely via the stopword
// "by" -> the electrode tip was injected onto a plain plate, contradicting the buildPrompt "NO
// allowance" doctrine and undersizing ~16% of GEN parts (U-DELTA-CADGEN-SPARKGAP-P2, the root cause
// behind the electrode-gate symptom-fix in loadTribalTips). "all" is DELIBERATELY excluded: the
// universal-tip mechanism relies on consumeTokens.has("all") (see recommend()).
const STOPWORDS = new Set([
  "a", "an", "and", "or", "the", "of", "to", "in", "on", "at", "by", "for", "per", "as", "is", "are",
  "be", "with", "from", "so", "if", "it", "that", "this", "than", "then", "into", "onto", "no", "not",
]);

function toTokens(s: string | undefined): Set<string> {
  return new Set(
    (s ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (b.has(t)) return true;
  return false;
}

export class CADTribalDrawInjectionEngine {
  /**
   * Rank a CAD tribal corpus by relevance to a draw context and return the applicable tips.
   *
   * @param context the feature/operation being authored
   * @param corpus the CAD tribal tips (loaded from cad-draw-tribal-tips.jsonl by the dispatcher)
   * @returns a DrawInjection with the top-K matched tips ranked by relevance
   */
  recommend(context: DrawContext, corpus: CADTribalTip[]): DrawInjection {
    const ctx = DrawContextSchema.parse(context ?? {}) as DrawContext;
    const tips = z.array(TipSchema).parse(corpus ?? []) as CADTribalTip[];

    const opTokens = toTokens(ctx.operation);
    const ftTokens = toTokens(ctx.featureType);
    const qTokens = toTokens(ctx.query);

    const ranked: RankedDrawTip[] = tips.map((t) => {
      const consumeTokens = toTokens(t.consume);
      const textTokens = toTokens(`${t.tip ?? ""} ${t.slug ?? ""}`);
      const universal = consumeTokens.has("all");

      let score = BASE_RELEVANCE;
      let contextSignal = false;

      if (opTokens.size > 0 && (universal || overlaps(opTokens, consumeTokens))) {
        score += 0.35;
        contextSignal = true;
      }
      if (ftTokens.size > 0 && (overlaps(ftTokens, textTokens) || overlaps(ftTokens, consumeTokens))) {
        score += 0.25;
        contextSignal = true;
      }
      if (qTokens.size > 0 && overlaps(qTokens, textTokens)) {
        score += 0.2;
        contextSignal = true;
      }
      if (universal) {
        score += 0.1;
        contextSignal = true; // a universal "all cad mutation" lesson is always in-context
      }

      // Rank boost by lesson kind -- does NOT, on its own, make an off-context tip eligible.
      if (t.kind === "failure-mode") score += 0.15;
      else if (t.kind === "convention" || t.kind === "doctrine") score += 0.1;

      return { ...t, relevanceScore: Math.min(1, score), matched: contextSignal };
    });

    const limit = ctx.limit ?? DEFAULT_LIMIT;
    const applied = ranked
      .filter((t) => t.matched)
      .sort((a, b) => (b.relevanceScore - a.relevanceScore) || a.id.localeCompare(b.id))
      .slice(0, limit);

    return {
      context: ctx,
      considered: tips.length,
      injectedCount: applied.length,
      applied,
    };
  }
}

export const cadTribalDrawInjectionEngine = new CADTribalDrawInjectionEngine();
