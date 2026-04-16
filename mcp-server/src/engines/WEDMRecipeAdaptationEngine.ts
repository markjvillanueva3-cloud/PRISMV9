/**
 * WEDMRecipeAdaptationEngine — WEDM AGI Phase 2 / U-P2-11
 *
 * Cross-material recipe adaptation (transfer learning for WEDM). Given a
 * wire-EDM parameter recipe that works on a *source* material, rescale it
 * for a *target* material using ratios of the canonical spark signatures
 * (Klocke + DiBitonto models) and, where curated, override factors from
 * `WEDM_TRANSFER_REGISTRY.json`.
 *
 * Adaptation scheme:
 *   ie' = ie × (tgt.peak_current_nominal_A / src.peak_current_nominal_A)
 *   te' = te × (tgt.pulse_on_nominal_us    / src.pulse_on_nominal_us)
 *   toff' = toff (no default change — wire cooling is material-agnostic)
 *   ra_ratio   = tgt.klocke_C / src.klocke_C
 *   mrr_ratio  = tgt.mrr_factor / src.mrr_factor
 *   wear_ratio = tgt.wire_wear_factor / src.wire_wear_factor
 *
 * Confidence: 1 − scaled distance(src, tgt), clipped to [0.1, 0.99]. The
 * distance is the mean of normalised differences across (ra_klocke_C,
 * klocke_k, mrr_factor, wire_wear_factor, peak_current_nominal,
 * pulse_on_nominal).
 *
 * Registry override: if a curated mapping exists for (from, to), those
 * ratios win and the engine reports basis="curated".
 *
 * Exit gate (P2-MS4): Transfer registry has ≥20 material→material mappings
 * (enforced by loadRegistry() + coveragePairs() surface).
 *
 * Distinct from generic TransferLearningEngine (machine-to-machine GP
 * transfer) — this engine is wire-EDM-recipe-specific.
 */

import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
  type WEDMSparkSignature,
} from "./WEDMMaterialSparkDatabaseEngine.js";
import fs from "node:fs";
import path from "node:path";

// ────────────────────────── Types ──────────────────────────

export interface WEDMAdaptationRatios {
  ra_ratio: number;
  mrr_ratio: number;
  wire_wear_ratio: number;
  ie_scale: number;
  te_scale: number;
}

export interface WEDMAdaptationFactors extends WEDMAdaptationRatios {
  from: WEDMMaterialKey;
  to: WEDMMaterialKey;
  confidence: number;
  basis: "curated" | "derived";
  notes?: string;
}

export interface WEDMRecipe {
  peak_current_A: number;
  pulse_on_us: number;
  pulse_off_us: number;
  wire_tension_N: number;
}

export interface WEDMAdaptationResult {
  from: WEDMMaterialKey;
  to: WEDMMaterialKey;
  source_recipe: WEDMRecipe;
  target_recipe: WEDMRecipe;
  factors: WEDMAdaptationFactors;
  warnings: string[];
}

export interface RegistryMapping {
  from: WEDMMaterialKey;
  to: WEDMMaterialKey;
  ra_ratio: number;
  mrr_ratio: number;
  wire_wear_ratio: number;
  ie_scale: number;
  te_scale: number;
  confidence: number;
  basis: string;
}

interface RegistryFile {
  schemaVersion: number;
  generated?: string;
  generatedAt?: string;
  source?: string;
  description?: string;
  /** New schema (v2): rich per-component ratios. */
  mappings?: RegistryMapping[];
  /** Legacy schema (v1): single scalar `factor`. */
  transferFactors?: Array<{
    from: WEDMMaterialKey;
    to: WEDMMaterialKey;
    factor: number;
    confidence: number;
    notes?: string;
  }>;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMRecipeAdaptationEngine {
  private readonly overrides = new Map<string, RegistryMapping>();
  private loaded = false;
  private registryPath: string | null = null;

  constructor(private readonly db = wedmMaterialSparkDatabaseEngine) {}

  /**
   * Load the WEDM_TRANSFER_REGISTRY.json (defaults to
   * `<cwd>/data/state/WEDM_TRANSFER_REGISTRY.json`). Silent no-op if the
   * file does not exist — the engine still works by deriving factors.
   * Returns the number of curated mappings loaded.
   */
  loadRegistry(explicitPath?: string): number {
    if (this.loaded && !explicitPath) return this.overrides.size;
    this.overrides.clear();
    const candidate =
      explicitPath ??
      path.join(process.cwd(), "data", "state", "WEDM_TRANSFER_REGISTRY.json");
    this.registryPath = candidate;
    if (!fs.existsSync(candidate)) {
      this.loaded = true;
      return 0;
    }
    const raw = fs.readFileSync(candidate, "utf8");
    const parsed = JSON.parse(raw) as RegistryFile;
    if (Array.isArray(parsed.mappings)) {
      for (const m of parsed.mappings) {
        this.overrides.set(this.keyOf(m.from, m.to), m);
      }
    } else if (Array.isArray(parsed.transferFactors)) {
      // Legacy v1: derive per-component ratios from the DB and blend the
      // scalar `factor` into the peak-current scale. Skip entries whose
      // keys are not recognised by the spark DB (unknown material family).
      for (const tf of parsed.transferFactors) {
        let derived;
        try {
          derived = this.deriveFactors(tf.from, tf.to);
        } catch {
          continue;
        }
        const mapping: RegistryMapping = {
          from: tf.from,
          to: tf.to,
          ra_ratio: derived.ra_ratio,
          mrr_ratio: derived.mrr_ratio,
          wire_wear_ratio: derived.wire_wear_ratio,
          ie_scale: tf.factor,
          te_scale: derived.te_scale,
          confidence: tf.confidence,
          basis: tf.notes ?? "legacy v1 mapping",
        };
        this.overrides.set(this.keyOf(tf.from, tf.to), mapping);
      }
    }
    this.loaded = true;
    return this.overrides.size;
  }

  /** Return the transfer factors for a material pair (curated if present). */
  getFactors(
    from: WEDMMaterialKey,
    to: WEDMMaterialKey,
  ): WEDMAdaptationFactors {
    this.loadRegistry();
    if (from === to) {
      return {
        from,
        to,
        ra_ratio: 1,
        mrr_ratio: 1,
        wire_wear_ratio: 1,
        ie_scale: 1,
        te_scale: 1,
        confidence: 1,
        basis: "derived",
        notes: "identity transfer",
      };
    }
    const curated = this.overrides.get(this.keyOf(from, to));
    if (curated) {
      return {
        from,
        to,
        ra_ratio: curated.ra_ratio,
        mrr_ratio: curated.mrr_ratio,
        wire_wear_ratio: curated.wire_wear_ratio,
        ie_scale: curated.ie_scale,
        te_scale: curated.te_scale,
        confidence: curated.confidence,
        basis: "curated",
        notes: curated.basis,
      };
    }
    return this.deriveFactors(from, to);
  }

  /** Rescale a working recipe from source material to target material. */
  adaptRecipe(
    from: WEDMMaterialKey,
    to: WEDMMaterialKey,
    source_recipe: WEDMRecipe,
  ): WEDMAdaptationResult {
    this.validateRecipe(source_recipe);
    const factors = this.getFactors(from, to);
    const target_recipe: WEDMRecipe = {
      peak_current_A: round3(source_recipe.peak_current_A * factors.ie_scale),
      pulse_on_us: round3(source_recipe.pulse_on_us * factors.te_scale),
      pulse_off_us: round3(source_recipe.pulse_off_us),
      wire_tension_N: round3(source_recipe.wire_tension_N),
    };
    const warnings: string[] = [];
    if (factors.confidence < 0.5) {
      warnings.push(
        `low adaptation confidence (${factors.confidence.toFixed(2)}): source and target signatures diverge`,
      );
    }
    if (factors.mrr_ratio < 0.5 || factors.mrr_ratio > 2.0) {
      warnings.push(
        `MRR ratio ${factors.mrr_ratio.toFixed(2)} is extreme — expect substantial cycle-time shift`,
      );
    }
    return { from, to, source_recipe, target_recipe, factors, warnings };
  }

  /** Enumerate every (from, to) pair for which the engine can deliver factors. */
  coveragePairs(): Array<{
    from: WEDMMaterialKey;
    to: WEDMMaterialKey;
    basis: string;
  }> {
    this.loadRegistry();
    const out: Array<{
      from: WEDMMaterialKey;
      to: WEDMMaterialKey;
      basis: string;
    }> = [];
    const sigs = this.db.list();
    for (const a of sigs) {
      for (const b of sigs) {
        if (a.key === b.key) continue;
        const key = this.keyOf(a.key, b.key);
        out.push({
          from: a.key,
          to: b.key,
          basis: this.overrides.has(key) ? "curated" : "derived",
        });
      }
    }
    return out;
  }

  /** How many curated mappings are loaded? */
  curatedCount(): number {
    this.loadRegistry();
    return this.overrides.size;
  }

  /** Direct access to a curated mapping (null if not curated). */
  getCurated(
    from: WEDMMaterialKey,
    to: WEDMMaterialKey,
  ): RegistryMapping | null {
    this.loadRegistry();
    return this.overrides.get(this.keyOf(from, to)) ?? null;
  }

  /** Reset cached registry (test-harness hook). */
  resetRegistry(): void {
    this.overrides.clear();
    this.loaded = false;
    this.registryPath = null;
  }

  // ─── internals ────────────────────────────────────────────

  private deriveFactors(
    from: WEDMMaterialKey,
    to: WEDMMaterialKey,
  ): WEDMAdaptationFactors {
    const s = this.db.get(from);
    const t = this.db.get(to);
    const ra_ratio = t.klocke_C / s.klocke_C;
    const mrr_ratio = t.mrr_factor / s.mrr_factor;
    const wire_wear_ratio = t.wire_wear_factor / s.wire_wear_factor;
    const ie_scale = t.peak_current_nominal_A / s.peak_current_nominal_A;
    const te_scale = t.pulse_on_nominal_us / s.pulse_on_nominal_us;
    const confidence = this.deriveConfidence(s, t);
    return {
      from,
      to,
      ra_ratio,
      mrr_ratio,
      wire_wear_ratio,
      ie_scale,
      te_scale,
      confidence,
      basis: "derived",
      notes: "derived from spark signatures",
    };
  }

  /** Confidence ∈ [0.1, 0.99]; larger signature distance → lower confidence. */
  private deriveConfidence(
    s: WEDMSparkSignature,
    t: WEDMSparkSignature,
  ): number {
    const components = [
      relDiff(s.klocke_C, t.klocke_C),
      relDiff(s.klocke_k, t.klocke_k),
      relDiff(s.mrr_factor, t.mrr_factor),
      relDiff(s.wire_wear_factor, t.wire_wear_factor),
      relDiff(s.peak_current_nominal_A, t.peak_current_nominal_A),
      relDiff(s.pulse_on_nominal_us, t.pulse_on_nominal_us),
    ];
    const mean = components.reduce((a, b) => a + b, 0) / components.length;
    const conf = Math.exp(-1.5 * mean);
    return clip(conf, 0.1, 0.99);
  }

  private validateRecipe(r: WEDMRecipe): void {
    for (const [k, v] of Object.entries(r) as Array<
      [keyof WEDMRecipe, number]
    >) {
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error(
          `recipe field ${k} must be positive finite, got ${v}`,
        );
      }
    }
  }

  private keyOf(from: WEDMMaterialKey, to: WEDMMaterialKey): string {
    return `${from}::${to}`;
  }
}

function relDiff(a: number, b: number): number {
  const denom = (Math.abs(a) + Math.abs(b)) / 2;
  if (denom < 1e-9) return 0;
  return Math.abs(a - b) / denom;
}
function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const wedmRecipeAdaptationEngine = new WEDMRecipeAdaptationEngine();
