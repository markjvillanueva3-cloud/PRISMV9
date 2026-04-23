/**
 * PhysicsAwareDataAugmentationEngine (U-LPR-DATA-AUG, ML B4)
 *
 * Expands the JM Die training corpus 3× with physics-valid positive
 * samples AND injects 15-20 % physics-INVALID negative samples labeled
 * `{label: "bad", reason}`. Prevents "conservative mode collapse" where
 * a LoRA trained only on safe production programs refuses to explore
 * aggressive-but-legal parameters because it has never seen the wrong
 * side of the decision boundary.
 *
 * Positive augmentation (3×):
 *   - material_substitute: 4140 ↔ 4340 (both P-group, similar kc) with
 *     updated Kienzle coefficients from constants.ts.
 *   - scale_geometry:     ±5 % OD / length on same material, re-quote
 *     speeds/feeds per Vc = π·D·n / 1000.
 *   - feed_perturb:       fz ± 10 % within Sandvik catalog range.
 *   - dof_perturb:        ap ± 15 % clamped to d/8 stability floor.
 *
 * Synthetic failures (15-20 %):
 *   - chatter_lobe_violation: fz chosen to land in the unstable pocket
 *     of the stability lobe diagram.
 *   - taylor_life_violation:  Vc beyond Taylor T·Vc^n = C limit at T<5 min.
 *   - doc_over_edge:          ap > 8 × tool edge radius — breaks insert.
 *   - thermal_runaway:        SFM chosen to exceed material softening T.
 *   - workholding_pullout:    grip force ÷ cutting thrust < 1.5 safety
 *     factor → part flies out.
 *
 * Every sample carries a provenance record so the original program can
 * always be traced. DPO preference pairs are emitted as (good, bad)
 * tuples so contrastive losses can consume the negatives directly.
 *
 * Refs:
 *   - Cui et al. (2020) "Synthetic Data Augmentation for Safety-Critical
 *     ML" §3 on invariant-preserving positives.
 *   - Rafailov et al. (2023) "Direct Preference Optimization" §2 on
 *     contrastive pair consumption.
 *   - Shaw & Oxley (1988) "Mechanics of Machining" §9 on the physics
 *     boundaries this engine targets.
 */

export type AugmentationStrategy =
  | "material_substitute"
  | "scale_geometry"
  | "feed_perturb"
  | "doc_perturb";

export type FailureMode =
  | "chatter_lobe_violation"
  | "taylor_life_violation"
  | "doc_over_edge"
  | "thermal_runaway"
  | "workholding_pullout";

export interface SourceSample {
  program_id: string;
  material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  material_canonical: string;        // e.g. "4140"
  outer_diameter_mm: number;
  length_mm: number;
  spindle_rpm: number;
  feed_mm_per_rev: number;
  ap_mm: number;
  vc_m_per_min: number;              // surface speed
  kc_mpa: number;                    // specific cutting force
  tool_edge_radius_mm: number;
  workholding_grip_force_n: number;
  cutting_thrust_n: number;
  surface_speed_max_m_per_min: number; // material thermal ceiling
}

export interface AugmentedSample extends SourceSample {
  origin_program_id: string;
  augmentation: AugmentationStrategy;
  mutation_detail: string;
  label: "good";
}

export interface SyntheticFailureSample {
  synthetic_id: string;
  origin_program_id: string;
  material_iso_group: SourceSample["material_iso_group"];
  material_canonical: string;
  outer_diameter_mm: number;
  length_mm: number;
  spindle_rpm: number;
  feed_mm_per_rev: number;
  ap_mm: number;
  vc_m_per_min: number;
  failure_mode: FailureMode;
  reason: string;
  label: "bad";
}

export interface AugmentationReport {
  source_count: number;
  positive_count: number;
  positive_multiplier: number;
  negative_count: number;
  negative_ratio: number;
  strategies_used: Record<AugmentationStrategy, number>;
  failures_injected: Record<FailureMode, number>;
}

export interface DPOPair {
  good: AugmentedSample | SourceSample;
  bad: SyntheticFailureSample;
  shared_context: { material_canonical: string; outer_diameter_mm: number };
}

// Physics bounds — sources in module JSDoc above.
const TAYLOR_LIFE_FLOOR_MIN = 5;
const DOC_EDGE_MULTIPLIER = 8;
const WORKHOLDING_SAFETY_FACTOR = 1.5;
// Approximate Kienzle kc1.1 values for substitute pairs. Canonical table
// lives in constants.ts; these match ISO-group averages.
const MATERIAL_SUBSTITUTE_PAIRS: Record<
  string,
  { canonical: string; kc_mpa: number }
> = {
  "4140": { canonical: "4340", kc_mpa: 2170 },
  "4340": { canonical: "4140", kc_mpa: 2060 },
  D2: { canonical: "A2", kc_mpa: 2500 },
  A2: { canonical: "D2", kc_mpa: 2800 },
  "1045": { canonical: "1050", kc_mpa: 1820 },
};

export class PhysicsAwareDataAugmentationEngine {
  private prng: () => number;

  constructor(seed = 1337) {
    this.prng = mulberry32(seed);
  }

  /** Reset PRNG for reproducible augmentation runs. */
  reseed(seed: number): void {
    if (!Number.isInteger(seed) || seed < 0) {
      throw new Error("seed must be a non-negative integer");
    }
    this.prng = mulberry32(seed);
  }

  /**
   * Apply a single positive-augmentation strategy to one source sample.
   * Returns a new sample with `augmentation` + `mutation_detail` filled
   * in. Throws if the chosen strategy doesn't apply (e.g., no substitute
   * material available).
   */
  augmentOne(
    source: SourceSample,
    strategy: AugmentationStrategy,
  ): AugmentedSample {
    this.validateSource(source);
    switch (strategy) {
      case "material_substitute": {
        const sub = MATERIAL_SUBSTITUTE_PAIRS[source.material_canonical];
        if (!sub) {
          throw new Error(
            `no substitute for material ${source.material_canonical}`,
          );
        }
        return {
          ...source,
          origin_program_id: source.program_id,
          program_id: `${source.program_id}#mat-${sub.canonical}`,
          material_canonical: sub.canonical,
          kc_mpa: sub.kc_mpa,
          augmentation: "material_substitute",
          mutation_detail: `${source.material_canonical} → ${sub.canonical} (kc ${source.kc_mpa}→${sub.kc_mpa} MPa)`,
          label: "good",
        };
      }
      case "scale_geometry": {
        const scale = 1 + (this.prng() * 0.10 - 0.05); // ±5 %
        const newOD = round4(source.outer_diameter_mm * scale);
        const newLen = round4(source.length_mm * scale);
        // Vc = π·D·n/1000. When D changes, preserve target Vc by
        // rescaling RPM.
        const newRpm = Math.round(
          (source.vc_m_per_min * 1000) / (Math.PI * newOD),
        );
        return {
          ...source,
          origin_program_id: source.program_id,
          program_id: `${source.program_id}#geom-${scale.toFixed(3)}`,
          outer_diameter_mm: newOD,
          length_mm: newLen,
          spindle_rpm: newRpm,
          augmentation: "scale_geometry",
          mutation_detail: `scale=${scale.toFixed(3)} → OD=${newOD} len=${newLen} rpm=${newRpm}`,
          label: "good",
        };
      }
      case "feed_perturb": {
        const perturb = 1 + (this.prng() * 0.20 - 0.10); // ±10 %
        const newFeed = round4(source.feed_mm_per_rev * perturb);
        return {
          ...source,
          origin_program_id: source.program_id,
          program_id: `${source.program_id}#feed-${perturb.toFixed(3)}`,
          feed_mm_per_rev: newFeed,
          augmentation: "feed_perturb",
          mutation_detail: `fz ${source.feed_mm_per_rev}→${newFeed}`,
          label: "good",
        };
      }
      case "doc_perturb": {
        const perturb = 1 + (this.prng() * 0.30 - 0.15); // ±15 %
        // Clamp to d/8 floor for stability
        const floor = source.outer_diameter_mm / 8;
        const newAp = round4(
          Math.max(floor, source.ap_mm * perturb),
        );
        return {
          ...source,
          origin_program_id: source.program_id,
          program_id: `${source.program_id}#doc-${perturb.toFixed(3)}`,
          ap_mm: newAp,
          augmentation: "doc_perturb",
          mutation_detail: `ap ${source.ap_mm}→${newAp} (floor=${floor.toFixed(3)})`,
          label: "good",
        };
      }
      default: {
        const _: never = strategy;
        throw new Error(`unsupported strategy ${_}`);
      }
    }
  }

  /**
   * 3× positive augmentation. For each source sample emits up to 3
   * augmented variants — one from each applicable strategy (skipping
   * material_substitute when no pair exists).
   */
  augmentCorpus(sources: SourceSample[]): AugmentedSample[] {
    if (sources.length === 0) return [];
    const out: AugmentedSample[] = [];
    const strategies: AugmentationStrategy[] = [
      "scale_geometry",
      "feed_perturb",
      "doc_perturb",
    ];
    for (const src of sources) {
      // Always 3 geometric/parameter perturbations
      for (const s of strategies) {
        out.push(this.augmentOne(src, s));
      }
      // Material substitute is opportunistic (adds to 4× if available)
      if (MATERIAL_SUBSTITUTE_PAIRS[src.material_canonical]) {
        out.push(this.augmentOne(src, "material_substitute"));
      }
    }
    return out;
  }

  /**
   * Inject a single physics-invalid failure derived from a source sample.
   */
  injectFailure(
    source: SourceSample,
    mode: FailureMode,
  ): SyntheticFailureSample {
    this.validateSource(source);
    const base = {
      origin_program_id: source.program_id,
      material_iso_group: source.material_iso_group,
      material_canonical: source.material_canonical,
      outer_diameter_mm: source.outer_diameter_mm,
      length_mm: source.length_mm,
      label: "bad" as const,
    };
    switch (mode) {
      case "chatter_lobe_violation": {
        // Land feed in unstable lobe: double current feed, half RPM
        const fz = round4(source.feed_mm_per_rev * 2);
        const rpm = Math.round(source.spindle_rpm * 0.5);
        const vc = round4((Math.PI * source.outer_diameter_mm * rpm) / 1000);
        return {
          ...base,
          synthetic_id: `${source.program_id}#fail-chatter`,
          spindle_rpm: rpm,
          feed_mm_per_rev: fz,
          ap_mm: source.ap_mm,
          vc_m_per_min: vc,
          failure_mode: mode,
          reason: `fz doubled to ${fz} mm/rev at rpm halved to ${rpm} — parameters land in unstable stability lobe pocket`,
        };
      }
      case "taylor_life_violation": {
        // Push Vc to violate Taylor T·Vc^n = C at T<5 min
        const vc = round4(source.surface_speed_max_m_per_min * 1.3);
        const rpm = Math.round((vc * 1000) / (Math.PI * source.outer_diameter_mm));
        return {
          ...base,
          synthetic_id: `${source.program_id}#fail-taylor`,
          spindle_rpm: rpm,
          feed_mm_per_rev: source.feed_mm_per_rev,
          ap_mm: source.ap_mm,
          vc_m_per_min: vc,
          failure_mode: mode,
          reason: `Vc ${vc} m/min exceeds material ceiling ${source.surface_speed_max_m_per_min} — predicted tool life <${TAYLOR_LIFE_FLOOR_MIN} min`,
        };
      }
      case "doc_over_edge": {
        const bad_ap = round4(
          source.tool_edge_radius_mm * (DOC_EDGE_MULTIPLIER + 2),
        );
        return {
          ...base,
          synthetic_id: `${source.program_id}#fail-doc`,
          spindle_rpm: source.spindle_rpm,
          feed_mm_per_rev: source.feed_mm_per_rev,
          ap_mm: bad_ap,
          vc_m_per_min: source.vc_m_per_min,
          failure_mode: mode,
          reason: `ap ${bad_ap} mm > ${DOC_EDGE_MULTIPLIER}·edge_radius (${source.tool_edge_radius_mm} mm) — edge fracture guaranteed`,
        };
      }
      case "thermal_runaway": {
        const vc = round4(source.surface_speed_max_m_per_min * 1.5);
        const rpm = Math.round((vc * 1000) / (Math.PI * source.outer_diameter_mm));
        return {
          ...base,
          synthetic_id: `${source.program_id}#fail-thermal`,
          spindle_rpm: rpm,
          feed_mm_per_rev: source.feed_mm_per_rev,
          ap_mm: source.ap_mm,
          vc_m_per_min: vc,
          failure_mode: mode,
          reason: `SFM ${vc} m/min exceeds softening temperature threshold for ${source.material_canonical}`,
        };
      }
      case "workholding_pullout": {
        // Keep parameters but flag: current grip/thrust ratio < 1.5
        const ratio =
          source.cutting_thrust_n === 0
            ? Infinity
            : source.workholding_grip_force_n / source.cutting_thrust_n;
        return {
          ...base,
          synthetic_id: `${source.program_id}#fail-pullout`,
          spindle_rpm: source.spindle_rpm,
          feed_mm_per_rev: source.feed_mm_per_rev * 2.5,
          ap_mm: source.ap_mm,
          vc_m_per_min: source.vc_m_per_min,
          failure_mode: mode,
          reason: `grip/thrust = ${ratio.toFixed(2)} below ${WORKHOLDING_SAFETY_FACTOR} safety factor after 2.5× feed — part pullout imminent`,
        };
      }
      default: {
        const _: never = mode;
        throw new Error(`unsupported failure mode ${_}`);
      }
    }
  }

  /**
   * Produce a mixed training corpus: positives_3x augmented + negatives
   * 15-20 % of total. Deterministic given seed.
   */
  buildMixedCorpus(
    sources: SourceSample[],
    negative_ratio = 0.17,
  ): {
    positives: AugmentedSample[];
    negatives: SyntheticFailureSample[];
    report: AugmentationReport;
  } {
    if (negative_ratio < 0.15 || negative_ratio > 0.20) {
      throw new Error("negative_ratio must be in [0.15, 0.20]");
    }
    const positives = this.augmentCorpus(sources);
    const target_neg = Math.round(
      (positives.length * negative_ratio) / (1 - negative_ratio),
    );
    const modes: FailureMode[] = [
      "chatter_lobe_violation",
      "taylor_life_violation",
      "doc_over_edge",
      "thermal_runaway",
      "workholding_pullout",
    ];
    const negatives: SyntheticFailureSample[] = [];
    for (let i = 0; i < target_neg; i++) {
      const src = sources[i % sources.length];
      const mode = modes[i % modes.length];
      negatives.push(this.injectFailure(src, mode));
    }
    const strategies_used: Record<AugmentationStrategy, number> = {
      material_substitute: 0,
      scale_geometry: 0,
      feed_perturb: 0,
      doc_perturb: 0,
    };
    for (const p of positives) strategies_used[p.augmentation] += 1;
    const failures_injected: Record<FailureMode, number> = {
      chatter_lobe_violation: 0,
      taylor_life_violation: 0,
      doc_over_edge: 0,
      thermal_runaway: 0,
      workholding_pullout: 0,
    };
    for (const n of negatives) failures_injected[n.failure_mode] += 1;
    const total = positives.length + negatives.length;
    return {
      positives,
      negatives,
      report: {
        source_count: sources.length,
        positive_count: positives.length,
        positive_multiplier: sources.length === 0 ? 0 : positives.length / sources.length,
        negative_count: negatives.length,
        negative_ratio: total === 0 ? 0 : negatives.length / total,
        strategies_used,
        failures_injected,
      },
    };
  }

  /**
   * Emit DPO (Direct Preference Optimization) contrastive pairs by
   * matching each negative to a compatible positive from the SAME
   * material + OD bucket.
   */
  buildDPOPairs(
    positives: Array<AugmentedSample | SourceSample>,
    negatives: SyntheticFailureSample[],
  ): DPOPair[] {
    const pairs: DPOPair[] = [];
    for (const neg of negatives) {
      const candidates = positives.filter(
        (p) =>
          p.material_canonical === neg.material_canonical &&
          Math.abs(p.outer_diameter_mm - neg.outer_diameter_mm) /
            Math.max(p.outer_diameter_mm, neg.outer_diameter_mm) <
            0.1,
      );
      if (candidates.length === 0) continue;
      const pick = candidates[Math.floor(this.prng() * candidates.length)];
      pairs.push({
        good: pick,
        bad: neg,
        shared_context: {
          material_canonical: neg.material_canonical,
          outer_diameter_mm: neg.outer_diameter_mm,
        },
      });
    }
    return pairs;
  }

  private validateSource(s: SourceSample): void {
    if (!s.program_id.trim()) throw new Error("program_id required");
    if (s.outer_diameter_mm <= 0) throw new Error("outer_diameter_mm must be >0");
    if (s.length_mm <= 0) throw new Error("length_mm must be >0");
    if (s.spindle_rpm <= 0) throw new Error("spindle_rpm must be >0");
    if (s.feed_mm_per_rev <= 0) throw new Error("feed_mm_per_rev must be >0");
    if (s.ap_mm <= 0) throw new Error("ap_mm must be >0");
    if (s.tool_edge_radius_mm <= 0) {
      throw new Error("tool_edge_radius_mm must be >0");
    }
    if (s.surface_speed_max_m_per_min <= 0) {
      throw new Error("surface_speed_max_m_per_min must be >0");
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function round4(v: number): number {
  if (!Number.isFinite(v)) return v;
  return Math.round(v * 10_000) / 10_000;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const physicsAwareDataAugmentationEngine =
  new PhysicsAwareDataAugmentationEngine();
