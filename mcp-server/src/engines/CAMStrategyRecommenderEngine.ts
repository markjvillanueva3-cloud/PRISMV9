/**
 * CAMStrategyRecommenderEngine — production CAM strategy recommender
 * =============================================================================
 *
 * Returns ranked CAM strategy recommendations for a (target_cam, part_hint,
 * material) triple. Strategies are curated from PRISM CAM-EXHAUST-MS0 research
 * (≥48 manufacturer PDFs + tribal-knowledge harvest) and scored against the
 * caller's intent.
 *
 * Scoring (CAM-EXHAUST-MS0 U-CAM73):
 *   1. Part-hint tag overlap        — tokenized hint vs. strategy.tags     (0..1)
 *   2. Material applicability       — material match in strategy.materials (0..1)
 *   3. CAM-applicability bonus      — +0.10 if strategy lists target_cam,
 *                                     +0.05 if strategy is "*" cross-CAM
 * Final score = 0.55*hint + 0.40*material + bonus, clamped to [0, 1.05].
 *
 * Engine never throws — unknown CAM slug returns null recommendation with
 * rationale; empty hint returns the highest-prior cross-CAM default.
 *
 * Lifted from CAMPhase5Stubs.ts under U-CAM73 to satisfy U-CAM79's deliverable
 * that every CAM-function engine ship as its own file with a 1:1 test surface.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F5 (stub in CAMPhase5Stubs.ts).
 * Upgraded  2026-05-06 — CAM-EXHAUST-MS0 U-CAM73/U-CAM79 (production).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface StrategyRecRequest {
  target_cam: string;
  /** Free-form part description, e.g. "thin-wall titanium pocket". */
  part_hint?: string;
  /** Optional material — "ti-6al-4v", "p20", "aluminum 6061", etc. */
  material?: string;
  /** Cap returned alternatives. Defaults to 5. */
  max_alternatives?: number;
  /** Optional learned empirical rankings (win-rate per strategy), injected by the
   *  dispatcher so the recommender stays pure. Re-ranks catalog candidates by
   *  proven shop-floor effectiveness -- the closed-loop "consume" of learning. */
  empirical_ranking?: ReadonlyArray<EmpiricalStrategySignal>;
}

/** Learned empirical signal for one strategy, derived from
 *  SelfLearningCAMEngine.strategyRanking().rankings and injected by the dispatcher
 *  (keeps this engine free of any I/O-bearing import). */
export interface EmpiricalStrategySignal {
  strategy: string;
  /** Fraction of times this strategy was the best (0..1; 0.5 = neutral). */
  winRate: number;
  /** Observation-count confidence band from the learner. */
  confidence: "low" | "medium" | "high";
  /** Number of real observations behind this signal. */
  observations: number;
}

export interface StrategyCandidate {
  strategy: string;
  score: number;
  rationale: string;
  cams: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
  materials: ReadonlyArray<string>;
  /** Set when a learned empirical win-rate moved this candidate's catalog score. */
  empirical_adjusted?: boolean;
  /** The learned win-rate applied (0..1), present when empirical_adjusted. */
  empirical_win_rate?: number;
  /** The learned confidence band applied, present when empirical_adjusted. */
  empirical_confidence?: "low" | "medium" | "high";
}

export interface StrategyRecResult {
  target_cam: string;
  part_hint: string;
  material: string;
  recommended_strategy: string | null;
  /** Winner's score. Catalog scores are bounded [0, 1.05]; a learned empirical
   *  boost can push an adjusted winner ABOVE 1.05 (proven shop-floor wins may
   *  outrank pure catalog relevance). Treat as a ranking signal, not a normalized
   *  confidence. */
  recommended_score: number;
  rationale: string;
  alternatives: StrategyCandidate[];
  total_corpus_size: number;
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

interface CorpusEntry {
  strategy: string;
  /** CAM systems where this strategy is canonical. "*" = applicable everywhere. */
  cams: ReadonlyArray<string>;
  /** Topic / feature tags — match against tokenized part_hint. */
  tags: ReadonlyArray<string>;
  /** Material families this strategy is preferred for. "*" = material-agnostic. */
  materials: ReadonlyArray<string>;
  /** One-line justification surfaced when the strategy wins. */
  rationale: string;
}

/**
 * Curated CAM strategy corpus. Pulled from CAM-EXHAUST-MS0 research:
 *   - hyperMILL MAXX / 5-axis docs
 *   - Mastercam 2024 strategy reference
 *   - Fusion 360 Adaptive Clearing whitepaper
 *   - SolidCAM iMachining technical brief
 *   - Inventor HSM cycle reference
 *   - PowerMill Vortex strategy guide
 *   - NX CAM aerospace strategy collection
 *   - CATIA Manufacturing surface-machining catalog
 *
 * Compact by design (high signal-per-byte). Per-CAM strategy databases live in
 * the per-CAM bridges (HyperMillStrategyEngine, MastercamStrategyEngine, ...).
 */
const STRATEGY_CORPUS: ReadonlyArray<CorpusEntry> = [
  {
    strategy: "Adaptive Clearing",
    cams: ["fusion360", "inventor-hsm", "mastercam"],
    tags: ["rough", "roughing", "pocket", "aggressive", "high-efficiency", "trochoidal", "hem"],
    materials: ["*"],
    rationale: "constant tool engagement, full flute depth, dramatically extends tool life on rough cuts",
  },
  {
    strategy: "iMachining",
    cams: ["solidcam"],
    tags: ["rough", "roughing", "high-speed", "aggressive", "hem"],
    materials: ["steel", "stainless", "titanium", "p20", "h13", "inconel"],
    rationale: "morphing toolpath + technology wizard auto-tunes load — best-in-class for hardened materials",
  },
  {
    strategy: "Vortex",
    cams: ["powermill"],
    tags: ["rough", "roughing", "trochoidal", "high-speed", "die", "mold"],
    materials: ["*"],
    rationale: "controlled engagement angle, ideal for mold/die cavities and steep walls",
  },
  {
    strategy: "MAXX 5-Axis Roughing",
    cams: ["hypermill"],
    tags: ["rough", "5-axis", "5axis", "impeller", "blade", "blisk", "swarf"],
    materials: ["titanium", "inconel", "aluminum"],
    rationale: "MAXX cycle is hyperMILL flagship for 5-axis aerospace structural work",
  },
  {
    strategy: "Dynamic Mill",
    cams: ["mastercam"],
    tags: ["rough", "roughing", "pocket", "dynamic", "high-speed"],
    materials: ["*"],
    rationale: "Mastercam dynamic motion handles open/closed pockets with constant chip load",
  },
  {
    strategy: "Scallop",
    cams: ["*"],
    tags: ["finish", "finishing", "3d", "surface", "scallop", "shallow"],
    materials: ["*"],
    rationale: "constant cusp height across surfaces — go-to 3D finishing strategy",
  },
  {
    strategy: "Parallel Finish",
    cams: ["*"],
    tags: ["finish", "finishing", "shallow", "flat", "bottom"],
    materials: ["*"],
    rationale: "parallel passes excel on shallow / near-horizontal regions where scallop wastes air time",
  },
  {
    strategy: "Steep & Shallow",
    cams: ["powermill", "hypermill", "mastercam"],
    tags: ["finish", "finishing", "steep", "shallow", "3d"],
    materials: ["*"],
    rationale: "auto-splits geometry by angle; steep regions get Z-level, shallow get scallop",
  },
  {
    strategy: "Pencil",
    cams: ["powermill", "fusion360", "mastercam"],
    tags: ["finish", "rest-machining", "corner", "pencil"],
    materials: ["*"],
    rationale: "follows internal corners + concave fillets — required after primary 3D finish",
  },
  {
    strategy: "Z-Level Finish",
    cams: ["*"],
    tags: ["finish", "steep", "wall", "vertical", "z-level"],
    materials: ["*"],
    rationale: "constant Z passes ideal for steep walls and side surfaces",
  },
  {
    strategy: "Swarf Milling",
    cams: ["hypermill", "nx-cam", "powermill"],
    tags: ["5-axis", "5axis", "swarf", "side", "tilt", "ruled"],
    materials: ["aluminum", "titanium"],
    rationale: "side of tool against ruled surface — single-pass finish on ports and impeller blades",
  },
  {
    strategy: "Tube Machining",
    cams: ["hypermill"],
    tags: ["5-axis", "tube", "port", "internal"],
    materials: ["*"],
    rationale: "hyperMILL tube cycle generates collision-free toolpath in cylindrical channels",
  },
  {
    strategy: "Profile (2D Contour)",
    cams: ["*"],
    tags: ["2d", "contour", "profile", "outline", "external"],
    materials: ["*"],
    rationale: "single-Z perimeter cut — baseline 2D operation; lead-in/out and tabs configurable",
  },
  {
    strategy: "Pocket (2D)",
    cams: ["*"],
    tags: ["2d", "pocket", "slot"],
    materials: ["*"],
    rationale: "interior area clearing with islands — use Adaptive variant for production rates",
  },
  {
    strategy: "Drilling Cycle",
    cams: ["*"],
    tags: ["drill", "drilling", "hole", "peck"],
    materials: ["*"],
    rationale: "G81/G83 canned cycles cover spot/peck/deep-hole — peck depth tunes by L/D ratio",
  },
  {
    strategy: "Thread Mill",
    cams: ["*"],
    tags: ["thread", "threading", "thread-mill"],
    materials: ["*"],
    rationale: "single tool covers many sizes; preferred over taps in hardened or thin-wall material",
  },
  {
    strategy: "Trochoidal Slot",
    cams: ["*"],
    tags: ["slot", "trochoidal", "narrow", "deep"],
    materials: ["*"],
    rationale: "tight slots beyond tool diameter — circular trochoid keeps engagement bounded",
  },
];

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "in", "on", "for", "with", "and", "or",
  "is", "to", "by", "from", "at", "as",
]);

const tokenize = (s: string): string[] =>
  (s ?? "")
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

const tokenOverlap = (
  qTokens: ReadonlyArray<string>,
  pool: ReadonlyArray<string>,
): number => {
  if (qTokens.length === 0 || pool.length === 0) return 0;
  const poolSet = new Set(pool.map((p) => p.toLowerCase()));
  let hits = 0;
  for (const t of qTokens) {
    for (const item of poolSet) {
      if (t === item || item.includes(t)) { hits++; break; }
    }
  }
  return hits / qTokens.length;
};

const materialMatch = (
  material: string,
  poolMaterials: ReadonlyArray<string>,
): number => {
  const m = (material ?? "").toLowerCase().trim();
  if (!m) return poolMaterials.includes("*") ? 0.4 : 0;
  if (poolMaterials.includes("*")) return 0.6;
  for (const pm of poolMaterials) {
    if (m.includes(pm) || pm.includes(m)) return 1;
  }
  return 0;
};

/** Empirical re-rank coefficient: the max amount a proven win-rate can move a
 *  catalog score. Bounded so catalog relevance stays primary and learning only
 *  reorders near-ties / nudges. Max |delta| = ALPHA * 1.0(high) * 0.5 = 0.15. */
const EMPIRICAL_RERANK_ALPHA = 0.3;
const EMPIRICAL_CONFIDENCE_WEIGHT: Record<"low" | "medium" | "high", number> = {
  low: 0.3,
  medium: 0.65,
  high: 1.0,
};

/** Bounded catalog-score delta from a learned win-rate (centered at 0.5): a
 *  strategy that empirically wins > 50% of the time is boosted, < 50% dampened,
 *  scaled by observation confidence. Zero when the signal is missing/empty. */
export function empiricalScoreDelta(sig: EmpiricalStrategySignal | undefined): number {
  // Defensive on the injected (external) signal: reject a non-finite win-rate so a
  // malformed input can never propagate NaN into a candidate score (and poison the sort).
  if (!sig || !Number.isFinite(sig.winRate) || !(sig.observations > 0)) return 0;
  const w = EMPIRICAL_CONFIDENCE_WEIGHT[sig.confidence] ?? EMPIRICAL_CONFIDENCE_WEIGHT.low;
  const centered = Math.max(0, Math.min(1, sig.winRate)) - 0.5;
  return EMPIRICAL_RERANK_ALPHA * w * centered;
}

export class CAMStrategyRecommenderEngine {
  constructor(
    private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine,
    private corpus: ReadonlyArray<CorpusEntry> = STRATEGY_CORPUS,
  ) {}

  recommend(req: StrategyRecRequest): StrategyRecResult {
    const target = req.target_cam ?? "";
    const partHint = req.part_hint ?? "";
    const material = req.material ?? "";
    const maxAlt = Math.max(1, req.max_alternatives ?? 5);

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
        part_hint: partHint,
        material,
        recommended_strategy: null,
        recommended_score: 0,
        rationale: `unknown CAM slug "${target}"`,
        alternatives: [],
        total_corpus_size: this.corpus.length,
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const hintTokens = tokenize(partHint);

    const scored: StrategyCandidate[] = this.corpus.map((entry) => {
      const hintScore = hintTokens.length === 0 ? 0 : tokenOverlap(hintTokens, entry.tags);
      const matScore = materialMatch(material, entry.materials);
      const baseRelevance = 0.55 * hintScore + 0.40 * matScore;
      const camBonus = baseRelevance > 0
        ? (entry.cams.includes(target) ? 0.10 : entry.cams.includes("*") ? 0.05 : 0)
        : 0;
      const score = Math.min(1.05, baseRelevance + camBonus);
      return {
        strategy: entry.strategy,
        score,
        rationale: entry.rationale,
        cams: entry.cams,
        tags: entry.tags,
        materials: entry.materials,
      };
    });

    // Empirical re-rank (closed-loop consume): nudge catalog scores by the learned
    // shop-floor win-rate per strategy. Injected + bounded; graceful no-op when no
    // learning data is supplied, so cold callers behave exactly as before.
    if (req.empirical_ranking && req.empirical_ranking.length > 0) {
      const empIndex = new Map<string, EmpiricalStrategySignal>();
      for (const sig of req.empirical_ranking) {
        if (sig && typeof sig.strategy === "string") {
          empIndex.set(sig.strategy.toLowerCase().trim(), sig);
        }
      }
      for (const cand of scored) {
        const sig = empIndex.get(cand.strategy.toLowerCase().trim());
        const delta = empiricalScoreDelta(sig);
        if (delta !== 0 && sig) {
          cand.score = Math.max(0, cand.score + delta);
          cand.empirical_adjusted = true;
          cand.empirical_win_rate = sig.winRate;
          cand.empirical_confidence = sig.confidence;
        }
      }
    }
    scored.sort((a, b) => b.score - a.score || a.strategy.localeCompare(b.strategy));
    const positives = scored.filter((c) => c.score > 0);

    if (positives.length === 0) {
      return {
        target_cam: target,
        part_hint: partHint,
        material,
        recommended_strategy: null,
        recommended_score: 0,
        rationale: hintTokens.length === 0 && !material
          ? "neither part_hint nor material supplied — cannot rank corpus"
          : `no corpus entry scored > 0 for hint=[${hintTokens.join(", ") || "(none)"}], material="${material || "(none)"}", target_cam="${target}"`,
        alternatives: [],
        total_corpus_size: this.corpus.length,
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const winner = positives[0];
    const alternatives = positives.slice(1, 1 + maxAlt);

    return {
      target_cam: target,
      part_hint: partHint,
      material,
      recommended_strategy: winner.strategy,
      recommended_score: winner.score,
      rationale: `${winner.strategy} won with score ${winner.score.toFixed(3)}${winner.empirical_adjusted ? ` (learned win-rate ${(winner.empirical_win_rate ?? 0).toFixed(2)}, ${winner.empirical_confidence} confidence)` : ""} -- ${winner.rationale}`,
      alternatives,
      total_corpus_size: this.corpus.length,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camStrategyRecommenderEngine = new CAMStrategyRecommenderEngine();
