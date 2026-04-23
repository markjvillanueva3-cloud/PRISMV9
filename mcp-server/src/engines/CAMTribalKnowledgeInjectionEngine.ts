/**
 * CAMTribalKnowledgeInjectionEngine — Context Tooltips for CAM UI (U-CAM101)
 * ===========================================================================
 *
 * PHASE-7: Context-aware tribal-knowledge tooltip injection for the four CAM
 * plugin adapters. Wraps the central TribalKnowledgeEngine (3,700+ tips
 * across 18 CAM systems) with per-host encoders so a CAM operator sees the
 * most relevant operator wisdom for the current operation, material, machine,
 * and workholding context — without leaving the CAM UI.
 *
 * Pipeline:
 *
 *   ┌────────────────┐     buildContext()     ┌──────────────────────┐
 *   │ TooltipContext │ ─────────────────────► │ KnowledgeSearchInput │
 *   └────────────────┘                        └──────────┬───────────┘
 *                                                        │
 *                                            tribalKnowledgeEngine.search()
 *                                                        │
 *                                                        ▼
 *                                          KnowledgeTip[] (raw matches)
 *                                                        │
 *                                          rerankByContext() / pickTopTips()
 *                                                        │
 *                                                        ▼
 *                                  ┌─────────────────────────────────┐
 *                                  │ TooltipFrame { tips, payload }  │
 *                                  └────────────┬────────────────────┘
 *                                               │ encodeForTarget()
 *           ┌───────────────────────────────────┼──────────────────────┐
 *           ▼                                   ▼                      ▼
 *       hyperMILL                            Fusion 360            Mastercam
 *       (XML-RPC)                           (JSON-RPC)           (pipe-delimited)
 *
 * Relevance scoring:
 *   base = tip.confidence / 100
 *   + 0.20 if tip.operation_types includes context.operation
 *   + 0.15 if tip.material_groups includes context.material_iso_group
 *   + 0.10 if tip.machine_ids includes context.machine_id
 *   + 0.05 if tip.workholding_type matches context.workholding
 *   capped at 1.00
 *
 * Tips are sorted by relevance_score desc, then by confidence desc as a
 * deterministic tie-break. Default top-N cap is 5 tips per render.
 *
 * The underlying tribalKnowledgeEngine is injectable for unit-test isolation.
 *
 * @module engines/CAMTribalKnowledgeInjectionEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM101
 */

import { z } from "zod";
import {
  tribalKnowledgeEngine,
  type KnowledgeTip,
  type KnowledgeSearchInput,
} from "./TribalKnowledgeEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const TooltipTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type TooltipTarget = z.infer<typeof TooltipTargetSchema>;

export const TooltipContextSchema = z.object({
  operation_id: z.string().min(1),
  operation: z.string().optional(),
  material_iso_group: z.string().optional(),
  machine_id: z.string().optional(),
  workholding: z.string().optional(),
  tool_diameter_mm: z.number().positive().optional(),
  query: z.string().optional(),
  /** Cap on the number of tips returned per render. Defaults to 5. */
  limit: z.number().int().positive().max(50).optional(),
});
export type TooltipContext = z.infer<typeof TooltipContextSchema>;

/** Per-tip payload surfaced to CAM UIs. */
export const TooltipTipSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  confidence: z.number(),
  relevance_score: z.number(),
});
export type TooltipTip = z.infer<typeof TooltipTipSchema>;

/** A rendered tooltip frame ready for hub dispatch. */
export const TooltipFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  target: TooltipTargetSchema,
  tip_count: z.number().int().nonnegative(),
  tips: z.array(TooltipTipSchema),
  payload: z.string(),
});
export type TooltipFrame = z.infer<typeof TooltipFrameSchema>;

/** Per-session aggregate statistics. */
export const TooltipStatsSchema = z.object({
  renders: z.number().int().nonnegative(),
  tips_served: z.number().int().nonnegative(),
  empty_renders: z.number().int().nonnegative(),
  per_target_renders: z.record(TooltipTargetSchema, z.number()),
  total_relevance_sum: z.number(),
});
export type TooltipStats = z.infer<typeof TooltipStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_TIP_LIMIT = 5;
export const MAX_TIP_LIMIT = 50;
const REL_OPERATION_BONUS = 0.20;
const REL_MATERIAL_BONUS = 0.15;
const REL_MACHINE_BONUS = 0.10;
const REL_WORKHOLDING_BONUS = 0.05;

// ── Internal state ───────────────────────────────────────────────────────────

interface SessionTrack {
  stats: TooltipStats;
}

const tracks = new Map<string, SessionTrack>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEmptyStats(): TooltipStats {
  return {
    renders: 0,
    tips_served: 0,
    empty_renders: 0,
    per_target_renders: {
      hypermill: 0,
      fusion360: 0,
      inventor_hsm: 0,
      mastercam: 0,
      generic: 0,
    },
    total_relevance_sum: 0,
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let track = tracks.get(session_id);
  if (!track) {
    track = { stats: makeEmptyStats() };
    tracks.set(session_id, track);
  }
  return track;
}

/** Translate a TooltipContext into the KnowledgeSearchInput accepted by
 *  TribalKnowledgeEngine.search(). */
export function buildContext(ctx: TooltipContext): KnowledgeSearchInput {
  const parsed = TooltipContextSchema.parse(ctx);
  const input: KnowledgeSearchInput = {
    limit: parsed.limit ?? DEFAULT_TIP_LIMIT,
  };
  if (parsed.query) input.query = parsed.query;
  if (parsed.material_iso_group)
    input.material_iso_group = parsed.material_iso_group;
  if (parsed.operation) input.operation_type = parsed.operation;
  if (parsed.machine_id) input.machine_ids = [parsed.machine_id];
  if (parsed.workholding) input.workholding_type = parsed.workholding;
  return input;
}

/** Compute the per-tip relevance score relative to a context. */
export function relevanceScore(tip: KnowledgeTip, ctx: TooltipContext): number {
  let score = (tip.confidence ?? 0) / 100;
  if (
    ctx.operation &&
    tip.operation_types &&
    tip.operation_types.includes(ctx.operation)
  ) {
    score += REL_OPERATION_BONUS;
  }
  if (
    ctx.material_iso_group &&
    tip.material_groups &&
    tip.material_groups.includes(ctx.material_iso_group)
  ) {
    score += REL_MATERIAL_BONUS;
  }
  if (
    ctx.machine_id &&
    tip.machine_ids &&
    tip.machine_ids.includes(ctx.machine_id)
  ) {
    score += REL_MACHINE_BONUS;
  }
  if (
    ctx.workholding &&
    tip.workholding_type &&
    tip.workholding_type === ctx.workholding
  ) {
    score += REL_WORKHOLDING_BONUS;
  }
  return Math.min(1, score);
}

function rerankByContext(
  tips: KnowledgeTip[],
  ctx: TooltipContext,
  limit: number,
): TooltipTip[] {
  const scored: TooltipTip[] = tips.map(t => ({
    id: t.id,
    title: t.title,
    body: t.body,
    category: String(t.category),
    tags: t.tags ?? [],
    confidence: t.confidence,
    relevance_score: relevanceScore(t, ctx),
  }));
  scored.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return b.confidence - a.confidence;
  });
  return scored.slice(0, limit);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeHyperMill(operation_id: string, tips: TooltipTip[]): string {
  const items = tips
    .map(
      t =>
        `  <tip id="${xmlEscape(t.id)}" rel="${t.relevance_score.toFixed(3)}">` +
        `<title>${xmlEscape(t.title)}</title>` +
        `<body>${xmlEscape(t.body)}</body>` +
        `</tip>`,
    )
    .join("\n");
  return `<tribalTooltips op="${xmlEscape(operation_id)}">\n${items}\n</tribalTooltips>`;
}

function encodeFusion(operation_id: string, tips: TooltipTip[]): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "cam.tribalTooltips",
    params: {
      operationId: operation_id,
      tips: tips.map(t => ({
        id: t.id,
        title: t.title,
        body: t.body,
        category: t.category,
        tags: t.tags,
        relevance: t.relevance_score,
        confidence: t.confidence,
      })),
    },
  });
}

function encodeInventor(operation_id: string, tips: TooltipTip[]): string {
  return JSON.stringify({
    type: "hsm.tribalTooltips",
    operationId: operation_id,
    count: tips.length,
    tips: tips.map(t => ({
      id: t.id,
      title: t.title,
      body: t.body,
      relevance: t.relevance_score,
    })),
  });
}

function encodeMastercam(operation_id: string, tips: TooltipTip[]): string {
  // Replace pipe characters in title/body to keep the format unambiguous.
  const safe = (s: string): string => s.replace(/\|/g, "/").replace(/\n/g, " ");
  const rows = tips
    .map(
      t =>
        `${t.id}|${safe(t.title)}|${t.relevance_score.toFixed(3)}|${safe(t.body)}`,
    )
    .join("\n");
  return `TIPS|${operation_id}|${tips.length}\n${rows}`;
}

function encodeGeneric(operation_id: string, tips: TooltipTip[]): string {
  return JSON.stringify({
    type: "tribal_tooltips",
    operation_id,
    tips,
  });
}

function encodePayload(
  target: TooltipTarget,
  operation_id: string,
  tips: TooltipTip[],
): string {
  switch (target) {
    case "hypermill":
      return encodeHyperMill(operation_id, tips);
    case "fusion360":
      return encodeFusion(operation_id, tips);
    case "inventor_hsm":
      return encodeInventor(operation_id, tips);
    case "mastercam":
      return encodeMastercam(operation_id, tips);
    case "generic":
    default:
      return encodeGeneric(operation_id, tips);
  }
}

/** Signature of the search function consumed by the engine. Defaults to the
 *  real TribalKnowledgeEngine — overridable for unit tests. */
export type TipSearchFn = (input: KnowledgeSearchInput) => KnowledgeTip[];

function defaultSearch(input: KnowledgeSearchInput): KnowledgeTip[] {
  return tribalKnowledgeEngine.search(input);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMTribalKnowledgeInjectionEngine {
  static readonly DEFAULT_TIP_LIMIT = DEFAULT_TIP_LIMIT;
  static readonly MAX_TIP_LIMIT = MAX_TIP_LIMIT;

  /** List the targets this engine can encode for. */
  static supportedTargets(): TooltipTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }

  /** Translate a CAM-UI context object into a tribal search input. */
  static buildSearchInput(ctx: TooltipContext): KnowledgeSearchInput {
    return buildContext(ctx);
  }

  /** Score a tip against a context (pure helper, no state). */
  static scoreTip(tip: KnowledgeTip, ctx: TooltipContext): number {
    return relevanceScore(tip, ctx);
  }

  /**
   * Pick the top-N most relevant tips for a context, calling `searchFn`
   * (defaults to the real TribalKnowledgeEngine.search()).
   */
  static pickTopTips(
    ctx: TooltipContext,
    searchFn: TipSearchFn = defaultSearch,
  ): TooltipTip[] {
    const parsed = TooltipContextSchema.parse(ctx);
    const limit = parsed.limit ?? DEFAULT_TIP_LIMIT;
    const input = buildContext(parsed);
    // Ask the underlying engine for up to limit*4 candidates so reranking
    // has headroom; cap at MAX_TIP_LIMIT to avoid runaway calls.
    const oversample = Math.min(limit * 4, MAX_TIP_LIMIT);
    const candidates = searchFn({ ...input, limit: oversample });
    return rerankByContext(candidates, parsed, limit);
  }

  /**
   * Render a context-aware tooltip frame for a specific CAM target.
   * Updates per-session stats. `searchFn` is injectable for tests.
   */
  static renderTooltip(
    session_id: string,
    context: TooltipContext,
    target: TooltipTarget = "generic",
    searchFn: TipSearchFn = defaultSearch,
  ): TooltipFrame {
    const ctx = TooltipContextSchema.parse(context);
    TooltipTargetSchema.parse(target);
    const tips = this.pickTopTips(ctx, searchFn);
    const payload = encodePayload(target, ctx.operation_id, tips);

    const track = ensureTrack(session_id);
    track.stats.renders += 1;
    track.stats.tips_served += tips.length;
    if (tips.length === 0) track.stats.empty_renders += 1;
    track.stats.per_target_renders[target] += 1;
    track.stats.total_relevance_sum += tips.reduce(
      (s, t) => s + t.relevance_score,
      0,
    );

    return {
      session_id,
      operation_id: ctx.operation_id,
      target,
      tip_count: tips.length,
      tips,
      payload,
    };
  }

  /** Snapshot per-session stats. */
  static getStats(session_id: string): TooltipStats {
    const track = tracks.get(session_id);
    if (!track) return makeEmptyStats();
    return {
      ...track.stats,
      per_target_renders: { ...track.stats.per_target_renders },
    };
  }

  /** Discard per-session state. */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /** Clear all session state (test isolation). */
  static resetAll(): void {
    tracks.clear();
  }
}

export const camTribalKnowledgeInjectionEngine = CAMTribalKnowledgeInjectionEngine;
