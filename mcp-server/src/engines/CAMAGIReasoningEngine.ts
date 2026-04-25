/**
 * CAMAGIReasoningEngine — production CAM AGI reasoning surface
 * =============================================================================
 *
 * Given a target CAM, a free-form decision_context (the user's question), and
 * an optional list of candidate options, produce a ranked decision with a
 * full reasoning chain. The engine is rule-based today and is the surface that
 * Phase-8 LoRA adapters will call into when they land.
 *
 * Reasoning chain (CAM-EXHAUST-MS0 U-CAM76):
 *   1. Tokenize and normalize the decision_context.
 *   2. Score every option against:
 *        a. Direct token overlap with the context (weight 0.45)
 *        b. Per-CAM capability bias for the option (weight 0.30)
 *        c. Domain-knowledge "decision template" match — well-known questions
 *           ("which strategy for thin walls?" etc.) inject a hint (weight 0.25)
 *   3. Highest-scoring option wins. Ties resolve by alphabetical order so the
 *      output is deterministic across calls / processes.
 *   4. Reasoning chain documents every score component for explainability —
 *      never empty unless options=[].
 *   5. Confidence = score / sum(option scores) when score > 0; else 0.
 *
 * Authored 2026-04-25 — CAM-EXHAUST-MS0 U-CAM76 (production reasoning).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface AGIReasonRequest {
  target_cam: string;
  decision_context: string;
  options?: string[];
}

export interface AGIScoreBreakdown {
  option: string;
  total: number;
  parts: {
    context_overlap: number;
    capability_bias: number;
    template_hint: number;
  };
}

export interface AGIReasonResult {
  target_cam: string;
  decision: string | null;
  reasoning_chain: string[];
  confidence: number;
  candidates: AGIScoreBreakdown[];
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

const CAPABILITY_BIAS: Record<string, ReadonlyArray<string>> = {
  hypermill: ["5axis", "5-axis", "maxx", "swarf", "blade", "impeller", "tube", "trochoidal"],
  mastercam: ["dynamic", "wire-edm", "wedm", "lathe", "high-speed", "hsm", "2d"],
  fusion360: ["adaptive", "parametric", "cloud", "browser"],
  "inventor-hsm": ["adaptive", "clearing", "imachining", "peel"],
  solidcam: ["imachining", "swiss", "advanced-mill", "millturn"],
  "nx-cam": ["aerospace", "feature-based", "5-axis", "mold"],
  powermill: ["mold", "die", "vortex", "rest", "5-axis"],
  "catia-machining": ["aerospace", "automotive", "surface", "5-axis"],
};

/**
 * Decision templates — well-known questions trigger a strategy hint that boosts
 * specific options. Match is normalized substring on the question text.
 */
const DECISION_TEMPLATES: ReadonlyArray<{
  match: ReadonlyArray<string>;
  preferred: ReadonlyArray<string>;
}> = [
  { match: ["thin wall", "thinwall", "deflection"],     preferred: ["trochoidal", "low-engagement", "peel", "high-speed"] },
  { match: ["aluminum", "alum"],                          preferred: ["adaptive", "high-feed", "hsm"] },
  { match: ["titanium", "ti-6al", "inconel", "718", "superalloy"], preferred: ["low-rpm", "climb", "ceramic", "trochoidal"] },
  { match: ["pocket", "cavity"],                          preferred: ["adaptive", "dynamic", "imachining", "vortex"] },
  { match: ["surface finish", "fine finish", "polish"],   preferred: ["scallop", "parallel", "constant-z", "finish"] },
  { match: ["impeller", "blade"],                         preferred: ["maxx", "swarf", "5-axis"] },
  { match: ["mold", "die"],                               preferred: ["vortex", "rest", "scallop", "parallel"] },
  { match: ["thread"],                                    preferred: ["thread-mill", "tap", "single-point"] },
  { match: ["drill", "hole"],                             preferred: ["peck", "deep-hole", "spot-drill"] },
];

const STOP_TOKENS = new Set([
  "the", "a", "an", "of", "to", "for", "in", "on", "with", "and", "or", "is", "are", "be",
  "what", "which", "how", "should", "i", "we", "use", "best", "should",
]);

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((t) => t.length > 0 && !STOP_TOKENS.has(t));

const overlap = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): number => {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  let hits = 0;
  for (const t of a) {
    const tl = t.toLowerCase();
    for (const item of setB) if (tl === item || tl.includes(item) || item.includes(tl)) {
      hits++;
      break;
    }
  }
  return hits / Math.max(a.length, b.length);
};

export class CAMAGIReasoningEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  reason(req: AGIReasonRequest): AGIReasonResult {
    const target = req.target_cam;
    const context = req.decision_context ?? "";
    const options = (req.options ?? []).slice();

    const targetValid = isCAMSlug(target);
    const sys = targetValid ? this.loader.loadOne(target) : null;
    const drift = targetValid
      ? this.loader.loadAll().drift_report.find((d) => d.slug === target)
      : null;
    const coverage = drift?.coverage_pct ?? 0;
    const paramCount = sys?.total_param_count ?? 0;

    if (!targetValid) {
      return {
        target_cam: target,
        decision: null,
        reasoning_chain: [`unknown CAM slug "${target}" — no recommendation possible`],
        confidence: 0,
        candidates: [],
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    if (options.length === 0) {
      return {
        target_cam: target,
        decision: null,
        reasoning_chain: ["no options provided — reasoning requires ≥1 candidate"],
        confidence: 0,
        candidates: [],
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    // Build the per-step reasoning trace
    const chain: string[] = [];

    const ctxTokens = tokenize(context);
    chain.push(`step 1: tokenized decision_context → [${ctxTokens.join(", ")}]`);

    const camCaps = CAPABILITY_BIAS[target] ?? [];
    chain.push(`step 2: ${target} capability bias bucket = [${camCaps.join(", ")}]`);

    const templateHits = DECISION_TEMPLATES.filter((t) =>
      t.match.some((m) => context.toLowerCase().includes(m)),
    );
    const templateHints = templateHits.flatMap((t) => t.preferred);
    if (templateHits.length > 0) {
      chain.push(`step 3: matched ${templateHits.length} decision template(s); inject hints [${templateHints.join(", ")}]`);
    } else {
      chain.push(`step 3: no decision template matched; rely on context overlap + capability bias only`);
    }

    // Score each option
    const scored: AGIScoreBreakdown[] = options.map((opt) => {
      const optTokens = tokenize(opt);
      const ctxScore = overlap(optTokens, ctxTokens);
      const capScore = camCaps.some((c) => optTokens.some((t) => t === c.toLowerCase() || t.includes(c.toLowerCase()) || c.toLowerCase().includes(t))) ? 1 : 0;
      const tmplScore = templateHints.some((h) => optTokens.some((t) => t === h.toLowerCase() || t.includes(h.toLowerCase()) || h.toLowerCase().includes(t))) ? 1 : 0;
      const total = 0.45 * ctxScore + 0.30 * capScore + 0.25 * tmplScore;
      return {
        option: opt,
        total,
        parts: {
          context_overlap: 0.45 * ctxScore,
          capability_bias: 0.30 * capScore,
          template_hint: 0.25 * tmplScore,
        },
      };
    });

    // Rank — descending score, alphabetical tie-break for determinism
    scored.sort((a, b) => b.total - a.total || a.option.localeCompare(b.option));
    chain.push(
      `step 4: ranked candidates → ${scored.map((c) => `${c.option}(${c.total.toFixed(3)})`).join(", ")}`,
    );

    const sumScore = scored.reduce((s, c) => s + c.total, 0);
    const winner = scored[0];
    const confidence = sumScore > 0 ? winner.total / sumScore : 0;
    const decision = winner.total > 0 ? winner.option : null;
    chain.push(
      decision
        ? `step 5: pick "${decision}" (score=${winner.total.toFixed(3)}, confidence=${(confidence * 100).toFixed(1)}%)`
        : `step 5: no option scored > 0 — abstaining`,
    );

    return {
      target_cam: target,
      decision,
      reasoning_chain: chain,
      confidence,
      candidates: scored,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camAGIReasoningEngine = new CAMAGIReasoningEngine();
