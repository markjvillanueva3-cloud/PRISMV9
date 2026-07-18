/**
 * CADOperationDecoderEngine — CAD-DRAW-MAX-MS0/P1-U06
 *
 * Generative head for the CAD closed-loop NN cluster. Today the LP04
 * MasterBrainBackpropPropagatorEngine only *scores* op sequences via a
 * value head v=θ·φ — it can rank but cannot *emit* a next op. This
 * decoder closes that gap: given an op-stream context plus a
 * natural-language `intent` string, it proposes the next
 * {@link CADOperation} (or top-K candidates) for the AI to execute via
 * {@link HyperCADSLiveBridgeEngine}.
 *
 * **Phase 1 — rule-based decoder.** Deterministic templates over
 * `CAD_OPERATION_KINDS` driven by a small priority table:
 *   1. **Intent override** — substrings (`fillet`, `extrude`, `revolve`,
 *      `hole`, `chamfer`, `shell`, `pattern`, `export`) → matching op.
 *   2. **Sequence templates** — empty context → sketch_create;
 *      after sketch → feature_extrude; after extrude → feature_fillet;
 *      after multiple features → export_step.
 *   3. **Fallback** — feature_extrude (safe default for "do something").
 *
 * The decoder is intentionally NOT a real NN today. Phase 2 will
 * back-replace `proposeNextOpInternal` with an autoregressive head
 * conditioned on NN01.encodeFull output + LP04 per-head value scores
 * — but the *interface* stays stable so callers (hypercads_live_*
 * orchestration, cad_design_plan downstream) bind once.
 *
 * **R12 fail-loud.** Empty intent + empty context AND fallback disabled
 * → returns null (caller must handle); never throws on empty input.
 *
 * Refs: CADFoundationEncoderEngine (NN01, U-CADC-NN01); CADArgEncoderEngine
 * (P1-U04); MasterBrainBackpropPropagatorEngine (LP04).
 */

import type { CADOperation, CADOperationKind, CADOperationArgs } from "../interfaces/ICADCodeGenerator.js";
import { CAD_OPERATION_KINDS } from "../interfaces/ICADCodeGenerator.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DecoderContext {
  /** Recent op stream (most-recent last). May be empty for a new part. */
  history?: ReadonlyArray<CADOperation>;
}

export interface DecoderOptions {
  /** Natural-language hint ("extrude 10mm boss", "fillet 1mm"). Lower-cased internally. */
  intent?: string;
  /** When true (default), fall back to feature_extrude on uncertain proposals. */
  useFallback?: boolean;
}

export interface ProposedOp {
  op: CADOperation;
  /** Heuristic score in (0,1]; higher = more confident. */
  score: number;
  /** Where this proposal came from — useful for debugging + tribal-tip extraction. */
  source: "intent" | "sequence-template" | "fallback";
}

export interface DecoderStats {
  totalProposals: number;
  totalIntentMatches: number;
  totalTemplateMatches: number;
  totalFallbacks: number;
  totalNullProposals: number;
}

// ── Intent → CADOperationKind table ──────────────────────────────────────────

const INTENT_RULES: ReadonlyArray<{ pattern: RegExp; kind: CADOperationKind; defaultArgs: (intent: string) => CADOperationArgs }> = [
  { pattern: /\bfillet\b/i, kind: "feature_fillet", defaultArgs: (i) => ({ radius: parseFirstNumber(i, 1) }) },
  { pattern: /\bchamfer\b/i, kind: "feature_chamfer", defaultArgs: (i) => ({ distance: parseFirstNumber(i, 1) }) },
  { pattern: /\brevolve\b/i, kind: "feature_revolve", defaultArgs: (i) => ({ angle: parseFirstNumber(i, 360) }) },
  { pattern: /\bhole\b|\bdrill\b/i, kind: "feature_hole", defaultArgs: (i) => ({ diameter: parseFirstNumber(i, 5), depth: 10 }) },
  { pattern: /\bshell\b|\bhollow\b/i, kind: "feature_shell", defaultArgs: (i) => ({ thickness: parseFirstNumber(i, 1) }) },
  { pattern: /\bpattern\b|\barray\b/i, kind: "feature_pattern_linear", defaultArgs: (i) => ({ count: Math.max(2, Math.floor(parseFirstNumber(i, 4))) }) },
  { pattern: /\bexport\b|\bsave\b|\bstep\b/i, kind: "export_step", defaultArgs: () => ({}) },
  { pattern: /\bsketch\b/i, kind: "sketch_create", defaultArgs: () => ({ plane: "XY" }) },
  { pattern: /\bextrude\b|\bboss\b|\bprotrusion\b/i, kind: "feature_extrude", defaultArgs: (i) => ({ distance: parseFirstNumber(i, 10), operation: "new_body" }) },
  { pattern: /\bcut\b|\bpocket\b/i, kind: "feature_extrude", defaultArgs: (i) => ({ distance: parseFirstNumber(i, 5), operation: "cut" }) },
];

function parseFirstNumber(s: string, fallback: number): number {
  if (typeof s !== "string") return fallback;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return fallback;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : fallback;
}

// ── Sequence templates ──────────────────────────────────────────────────────

interface SequenceTemplate {
  matches: (history: ReadonlyArray<CADOperation>) => boolean;
  kind: CADOperationKind;
  args: CADOperationArgs;
  score: number;
}

const SEQUENCE_TEMPLATES: ReadonlyArray<SequenceTemplate> = [
  // Empty history → begin with a sketch
  {
    matches: (h) => h.length === 0,
    kind: "sketch_create",
    args: { plane: "XY" },
    score: 0.85,
  },
  // After a sketch → extrude
  {
    matches: (h) => h[h.length - 1]?.kind === "sketch_create",
    kind: "feature_extrude",
    args: { distance: 10, operation: "new_body" },
    score: 0.80,
  },
  // After a fresh extrude → fillet
  {
    matches: (h) => h[h.length - 1]?.kind === "feature_extrude",
    kind: "feature_fillet",
    args: { radius: 1 },
    score: 0.60,
  },
  // After 5+ features → export
  {
    matches: (h) => h.filter(o => o.kind.startsWith("feature_")).length >= 5,
    kind: "export_step",
    args: {},
    score: 0.55,
  },
];

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADOperationDecoderEngine {
  private totalProposals = 0;
  private totalIntentMatches = 0;
  private totalTemplateMatches = 0;
  private totalFallbacks = 0;
  private totalNullProposals = 0;

  /** Propose the single best next op. Returns null only when intent+template both miss and fallback is off. */
  proposeNextOp(ctx: DecoderContext = {}, opts: DecoderOptions = {}): ProposedOp | null {
    this.totalProposals++;
    const history = ctx.history ?? [];
    if (!Array.isArray(history)) {
      throw new TypeError("proposeNextOp: ctx.history must be an array");
    }

    // 1. Intent override
    if (typeof opts.intent === "string" && opts.intent.length > 0) {
      for (const rule of INTENT_RULES) {
        if (rule.pattern.test(opts.intent)) {
          this.totalIntentMatches++;
          return {
            op: { kind: rule.kind, args: rule.defaultArgs(opts.intent) },
            score: 0.95,
            source: "intent",
          };
        }
      }
    }

    // 2. Sequence template
    for (const t of SEQUENCE_TEMPLATES) {
      if (t.matches(history)) {
        this.totalTemplateMatches++;
        return {
          op: { kind: t.kind, args: { ...t.args } },
          score: t.score,
          source: "sequence-template",
        };
      }
    }

    // 3. Fallback (opt-out)
    if (opts.useFallback !== false) {
      this.totalFallbacks++;
      return {
        op: { kind: "feature_extrude", args: { distance: 10, operation: "new_body" } },
        score: 0.30,
        source: "fallback",
      };
    }

    this.totalNullProposals++;
    return null;
  }

  /**
   * Top-K candidates. Phase 1 returns up to K proposals ordered by score:
   * intent (if matched) → all matching templates → fallback. Deduplicates
   * by op.kind so callers don't see two "feature_extrude" entries.
   */
  proposeNextOpsTopK(ctx: DecoderContext = {}, opts: DecoderOptions = {}, k = 3): ProposedOp[] {
    if (typeof k !== "number" || !Number.isFinite(k) || k < 1) {
      throw new TypeError("proposeNextOpsTopK: k must be a positive number");
    }
    const history = ctx.history ?? [];
    const out: ProposedOp[] = [];
    const seen = new Set<CADOperationKind>();

    // Intent (if any)
    if (typeof opts.intent === "string" && opts.intent.length > 0) {
      for (const rule of INTENT_RULES) {
        if (rule.pattern.test(opts.intent) && !seen.has(rule.kind)) {
          out.push({
            op: { kind: rule.kind, args: rule.defaultArgs(opts.intent) },
            score: 0.95,
            source: "intent",
          });
          seen.add(rule.kind);
          if (out.length >= k) return out;
        }
      }
    }

    // Sequence templates
    for (const t of SEQUENCE_TEMPLATES) {
      if (t.matches(history) && !seen.has(t.kind)) {
        out.push({
          op: { kind: t.kind, args: { ...t.args } },
          score: t.score,
          source: "sequence-template",
        });
        seen.add(t.kind);
        if (out.length >= k) return out;
      }
    }

    // Fallback (opt-out)
    if (opts.useFallback !== false && !seen.has("feature_extrude")) {
      out.push({
        op: { kind: "feature_extrude", args: { distance: 10, operation: "new_body" } },
        score: 0.30,
        source: "fallback",
      });
    }
    return out.slice(0, k);
  }

  /** Returns the supported vocabulary (forwarded from CAD_OPERATION_KINDS for symmetry with NN01). */
  getVocabulary(): ReadonlyArray<string> {
    return CAD_OPERATION_KINDS;
  }

  getStats(): DecoderStats {
    return {
      totalProposals: this.totalProposals,
      totalIntentMatches: this.totalIntentMatches,
      totalTemplateMatches: this.totalTemplateMatches,
      totalFallbacks: this.totalFallbacks,
      totalNullProposals: this.totalNullProposals,
    };
  }

  _resetForTests(): void {
    this.totalProposals = 0;
    this.totalIntentMatches = 0;
    this.totalTemplateMatches = 0;
    this.totalFallbacks = 0;
    this.totalNullProposals = 0;
  }
}

export const cadOperationDecoderEngine = new CADOperationDecoderEngine();
