/**
 * CAMFunctionRouterEngine — production CAM intent router
 * =============================================================================
 *
 * Phase-5 consumer engine. Loads catalogs via CAMCatalogLoaderEngine and resolves
 * "give me the adaptive-clearing operation in Mastercam" → concrete function ID.
 *
 * Production scoring (U-CAM71):
 *   1. Intent normalization — lowercase, strip punctuation, drop stop-words
 *   2. Synonym expansion — domain map for common CAM terms ("rough" → adaptive,
 *      roughing, hem, clearing; "pocket" → 2d-pocket, contour, area)
 *   3. Multi-feature scoring per (cam, function) candidate:
 *        weighted_jaccard(0.55) + substring_boost(0.20) + ngram(0.10)
 *        + capability_bias(0.15)
 *   4. Confidence labels — high ≥ 0.70, medium ≥ 0.40, low > 0
 *
 * The router never throws on unknown slug — it filters via isCAMSlug() and
 * returns fallback_used=true with empty candidates. The CAMCatalogLoaderEngine
 * itself is the throw site for downstream consumers.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F5 (stub).
 * Upgraded  2026-04-25 — CAM-EXHAUST-MS0 U-CAM71 (production scoring).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug, PRIORITY_5_SLUGS } from "../registries/CAMSystemRegistry.js";

export interface CAMRouteRequest {
  /** Natural-language intent — "adaptive roughing", "thread milling" */
  intent: string;
  /** Target CAM system slug (canonical). Undefined = any Priority-5 CAM */
  target_cam?: string;
}

export interface CAMRouteCandidate {
  cam: string;
  function: string;
  score: number;
  /** Capability bias contribution included in score (0..0.15) */
  capability_bonus: number;
}

export type CAMConfidenceLabel = "high" | "medium" | "low" | "none";

export interface CAMRouteResult {
  target_cam: string;
  matched_function: string | null;
  confidence: number;
  confidence_label: CAMConfidenceLabel;
  candidates: CAMRouteCandidate[];
  fallback_used: boolean;
  /** Normalized intent tokens used for scoring */
  intent_normalized: string[];
  /** Synonym-expanded token set (superset of intent_normalized) */
  expanded_terms: string[];
  /** False since U-CAM71 — engine is in production mode */
  stub: false;
  mode: "production";
}

/**
 * Per-CAM capability matrix — which CAMs are strongest at which operation
 * families. Score boost applied when an intent term matches a known strength.
 * Values are domain knowledge from PRISM CAM-EXHAUST-MS0 research (≥48 PDFs).
 */
const CAM_CAPABILITY_MATRIX: Record<string, ReadonlyArray<string>> = {
  hypermill: ["5-axis", "5axis", "maxx", "millturn", "swarf", "tube", "blade", "impeller"],
  mastercam: ["2d", "lathe", "wire-edm", "wire", "edm", "high-speed", "hs", "dynamic"],
  fusion360: ["adaptive", "parametric", "cloud", "general", "browser"],
  "inventor-hsm": ["adaptive", "clearing", "hsm", "imachining"],
  solidcam: ["imachining", "swiss", "advanced-mill", "turning", "millturn"],
  "nx-cam": ["aerospace", "5-axis", "feature-based", "mold"],
  powermill: ["mold", "die", "5-axis", "vortex"],
  "catia-machining": ["aerospace", "automotive", "surface", "5-axis"],
};

/**
 * Synonym/alias map — canonical CAM terms mapped to their common variations.
 * Used to expand the intent before scoring so "rough" matches "adaptive",
 * "clearing", "hem", and "high-efficiency-milling" candidates.
 */
const CAM_SYNONYMS: Record<string, ReadonlyArray<string>> = {
  rough: ["roughing", "adaptive", "clearing", "hem", "high-efficiency", "vortex"],
  roughing: ["rough", "adaptive", "clearing", "hem", "vortex"],
  finish: ["finishing", "scallop", "contour", "parallel"],
  finishing: ["finish", "scallop", "contour", "parallel"],
  pocket: ["2d-pocket", "area", "pocketing"],
  contour: ["profile", "outline", "external", "side"],
  drill: ["drilling", "peck", "boring", "hole"],
  drilling: ["drill", "peck", "boring"],
  thread: ["threading", "thread-mill", "tap"],
  threading: ["thread", "thread-mill"],
  turn: ["turning", "lathe"],
  turning: ["turn", "lathe", "od"],
  mill: ["milling", "endmill"],
  milling: ["mill"],
  "5-axis": ["5axis", "five-axis", "multi-axis", "multiaxis", "simultaneous"],
  "5axis": ["5-axis", "five-axis", "multi-axis", "multiaxis"],
  swarf: ["sidewall", "flank"],
  edm: ["wire-edm", "wedm", "sinker"],
  "wire-edm": ["wedm", "wire", "edm"],
  trochoidal: ["adaptive", "vortex", "imachining"],
  parting: ["cut-off", "groove", "grooving"],
  bore: ["boring", "hole"],
  ramp: ["plunge", "helix"],
};

/** English stop-words stripped during intent normalization */
const STOP_WORDS = new Set([
  "a", "an", "and", "the", "for", "with", "in", "on", "of", "to", "or",
  "is", "be", "by", "at", "from", "as", "this", "that", "into",
]);

/** Confidence threshold table — single source of truth for label mapping */
const CONFIDENCE_THRESHOLDS = { high: 0.7, medium: 0.4, low: 0 } as const;

/** Score weights — must sum to 1.0 for components excluding capability_bonus */
const WEIGHTS = {
  jaccard: 0.55,
  substring: 0.2,
  ngram: 0.1,
  capability: 0.15, // bias on top
} as const;

export class CAMFunctionRouterEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  route(req: CAMRouteRequest): CAMRouteResult {
    const intent_normalized = this.normalize(req.intent);
    const expanded_terms = this.expand(intent_normalized);

    const targets =
      req.target_cam !== undefined
        ? isCAMSlug(req.target_cam)
          ? [req.target_cam]
          : []
        : [...PRIORITY_5_SLUGS];

    const candidates: CAMRouteCandidate[] = [];
    for (const slug of targets) {
      const sys = this.loader.loadOne(slug);
      const capability = CAM_CAPABILITY_MATRIX[slug] ?? [];
      for (const file of [...sys.functions_files, ...sys.ui_files]) {
        for (const key of file.top_keys) {
          const score = this.scoreFunction(expanded_terms, key, capability);
          if (score.total > 0.2) {
            candidates.push({
              cam: slug,
              function: key,
              score: score.total,
              capability_bonus: score.capability,
            });
          }
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);

    const top = candidates.slice(0, 5);
    const best = top[0];
    const confidence = best?.score ?? 0;

    return {
      target_cam: best?.cam ?? req.target_cam ?? "none",
      matched_function: best?.function ?? null,
      confidence,
      confidence_label: this.labelOf(confidence),
      candidates: top,
      fallback_used: !best,
      intent_normalized,
      expanded_terms,
      stub: false,
      mode: "production",
    };
  }

  /** Lowercase, strip punctuation, split, drop stop-words. */
  private normalize(intent: string): string[] {
    return intent
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/[\s_]+/)
      .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  }

  /** Expand normalized tokens with domain synonyms (deduped). */
  private expand(tokens: string[]): string[] {
    const out = new Set(tokens);
    for (const t of tokens) {
      const syns = CAM_SYNONYMS[t];
      if (syns) for (const s of syns) out.add(s);
    }
    return [...out];
  }

  /** Compute weighted score for a candidate function name. */
  private scoreFunction(
    expanded: string[],
    candidate: string,
    capability: ReadonlyArray<string>,
  ): { total: number; capability: number } {
    const candTokens = candidate.toLowerCase().split(/[\s_-]+/).filter(Boolean);
    if (expanded.length === 0 || candTokens.length === 0) {
      return { total: 0, capability: 0 };
    }

    // 1. Weighted Jaccard — overlap normalized by token-set union
    const candSet = new Set(candTokens);
    const expSet = new Set(expanded);
    let intersection = 0;
    for (const t of expSet) if (candSet.has(t)) intersection += 1;
    const union = new Set([...expSet, ...candSet]).size;
    const jaccard = union === 0 ? 0 : intersection / union;

    // 2. Substring boost — credit partial matches like "rough" in "roughing"
    let substringHits = 0;
    for (const e of expanded) {
      if (e.length < 3) continue;
      for (const c of candTokens) {
        if (c.includes(e) || e.includes(c)) {
          substringHits += 1;
          break;
        }
      }
    }
    const substring = Math.min(substringHits / expanded.length, 1);

    // 3. Character n-gram (bigram) for fuzzy partial matches
    const ngram = this.bigramSimilarity(expanded.join(" "), candTokens.join(" "));

    // 4. Capability bias — bonus when candidate aligns with CAM strength
    let capabilityHits = 0;
    for (const cap of capability) {
      if (candidate.toLowerCase().includes(cap)) capabilityHits += 1;
    }
    const capabilityFrac = capability.length === 0
      ? 0
      : Math.min(capabilityHits / capability.length, 1);
    const capabilityBoost = capabilityFrac * WEIGHTS.capability;

    const base =
      jaccard * WEIGHTS.jaccard +
      substring * WEIGHTS.substring +
      ngram * WEIGHTS.ngram;

    return {
      total: Math.min(base + capabilityBoost, 1),
      capability: capabilityBoost,
    };
  }

  /** Dice-coefficient similarity over character bigrams (range [0,1]). */
  private bigramSimilarity(a: string, b: string): number {
    const ba = this.bigrams(a);
    const bb = this.bigrams(b);
    if (ba.size === 0 || bb.size === 0) return 0;
    let shared = 0;
    for (const g of ba) if (bb.has(g)) shared += 1;
    return (2 * shared) / (ba.size + bb.size);
  }

  private bigrams(s: string): Set<string> {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  }

  private labelOf(score: number): CAMConfidenceLabel {
    if (score === 0) return "none";
    if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
    if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
    return "low";
  }
}

export const camFunctionRouterEngine = new CAMFunctionRouterEngine();
