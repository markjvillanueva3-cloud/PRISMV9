/**
 * MultiSetupPlannerEngine — Multi-Setup Part Orientation & Fixturing Optimization
 *
 * Algorithms: visibility (dot-product cone), stability (force equilibrium, 2.5x ISO 10218),
 * datum chain (Monte Carlo RSS), greedy set cover (O(n*m), <= H(n)*OPT), novel algorithm assignment.
 *
 * References: Boerma & Kals (1989), Rong & Zhu (1999) Ch.4-6, Whitney (2004) Ch.7
 * Actions: setup_plan
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface Feature {
  id: string;
  type: "pocket" | "hole" | "slot" | "surface" | "chamfer" | "fillet" | "thread" | "bore" | "profile";
  access_direction: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  dimensions: { width?: number; length?: number; depth?: number; diameter?: number };
  tolerance_mm?: number;
  surface_finish_ra?: number;
  is_datum?: boolean;
}

export interface Orientation {
  name: string;
  direction: { x: number; y: number; z: number };
}

export interface SetupPlannerInput {
  features: Feature[];
  part_bounds: { min_x: number; min_y: number; min_z: number; max_x: number; max_y: number; max_z: number };
  available_orientations?: Orientation[];
  clamping_force_N?: number;       // default 5000
  max_cutting_force_N?: number;    // default 1000
  datum_tolerance_mm?: number;     // default 0.01
  monte_carlo_samples?: number;    // default 1000
}

export interface Setup {
  id: string;
  orientation: Orientation;
  features: string[];
  datum_face: string | null;
  clamping_stable: boolean;
  stability_margin: number;
  tolerance_stack_mm: number;
  recommended_algorithms: string[];
}

export interface DatumChainLink {
  from_setup: string;
  to_setup: string;
  tolerance_contribution_mm: number;
}

export interface SetupPlannerResult {
  setups: Setup[];
  setup_count: number;
  total_features: number;
  covered_features: number;
  uncovered_features: string[];
  datum_chain: DatumChainLink[];
  total_tolerance_stack_mm: number;
  tolerance_stack_within_spec: boolean;
  optimization_method: string;
  warnings: string[];
  formula: string;
}

interface StabilityResult { stable: boolean; margin: number }

// ── Constants ────────────────────────────────────────────────────────────────

const SAFETY_FACTOR = 2.5;
const VIS_COS_THRESH = 0.5; // cos(60deg)

const DEFAULT_ORIENTATIONS: Orientation[] = [
  { name: "+Z (top)",    direction: { x: 0, y: 0, z: 1 } },
  { name: "-Z (bottom)", direction: { x: 0, y: 0, z: -1 } },
  { name: "+X (right)",  direction: { x: 1, y: 0, z: 0 } },
  { name: "-X (left)",   direction: { x: -1, y: 0, z: 0 } },
  { name: "+Y (front)",  direction: { x: 0, y: 1, z: 0 } },
  { name: "-Y (back)",   direction: { x: 0, y: -1, z: 0 } },
];

const ALGO_FEATURES: Record<string, ReadonlyArray<Feature["type"]>> = {
  TGAR:  ["pocket", "slot", "profile"],
  HRAF:  ["surface", "fillet", "chamfer"],
  CFSF:  ["surface", "bore", "fillet"],
  PTDC:  ["bore", "hole", "thread"],
  VCER:  ["pocket", "slot"],
  MTHZD: ["pocket", "profile", "surface"],
};

// ── Engine ────────────────────────────────────────────────────────────────────

export class MultiSetupPlannerEngine {
  /** Main entry — compute optimized multi-setup plan. */
  plan(input: SetupPlannerInput): SetupPlannerResult {
    const warnings: string[] = [];
    const { features } = input;
    if (features.length === 0) return this.emptyResult(warnings);

    const orientations = input.available_orientations ?? DEFAULT_ORIENTATIONS;
    const clampF = input.clamping_force_N ?? 5000;
    const cutF = input.max_cutting_force_N ?? 1000;
    const datumTol = input.datum_tolerance_mm ?? 0.01;
    const mcN = input.monte_carlo_samples ?? 1000;

    // 1. Visibility — which features each orientation can reach
    const visMap = this.visibilityAnalysis(features, orientations);

    // 2. Greedy set cover — minimum orientations
    const allIds = features.map((f) => f.id);
    const selectedNames = this.greedySetCover(allIds, visMap);

    const coveredSet = new Set<string>();
    for (const n of selectedNames) {
      (visMap.get(n) ?? []).forEach((id) => coveredSet.add(id));
    }
    const uncovered = allIds.filter((id) => !coveredSet.has(id));
    if (uncovered.length > 0) {
      warnings.push(`${uncovered.length} feature(s) not reachable from any available orientation`);
    }

    // 3. Build setups with dedup (each feature in earliest setup only)
    const fMap = new Map(features.map((f) => [f.id, f]));
    const claimed = new Set<string>();
    const setups: Setup[] = [];

    for (let i = 0; i < selectedNames.length; i++) {
      const name = selectedNames[i];
      const orient = orientations.find((o) => o.name === name)!;
      const assigned = (visMap.get(name) ?? []).filter((id) => coveredSet.has(id) && !claimed.has(id));
      assigned.forEach((id) => claimed.add(id));
      if (assigned.length === 0) continue;

      const stab = this.stabilityCheck(orient, cutF, clampF);
      if (!stab.stable) {
        warnings.push(`Setup ${i + 1} (${name}): clamping insufficient — margin ${stab.margin.toFixed(2)}`);
      }

      const sf = assigned.map((id) => fMap.get(id)!);
      const datum = sf.find((f) => f.is_datum)
        ?? sf.filter((f) => f.tolerance_mm !== undefined)
             .sort((a, b) => (a.tolerance_mm ?? Infinity) - (b.tolerance_mm ?? Infinity))[0]
        ?? null;

      setups.push({
        id: `SETUP-${String(setups.length + 1).padStart(2, "0")}`,
        orientation: orient,
        features: assigned,
        datum_face: datum?.id ?? null,
        clamping_stable: stab.stable,
        stability_margin: stab.margin,
        tolerance_stack_mm: 0,
        recommended_algorithms: this.recommendAlgorithms(sf),
      });
    }

    // 4. Datum chain tolerance analysis
    const dc = this.datumChainAnalysis(setups, datumTol, mcN);
    let stack = 0;
    for (let i = 0; i < setups.length; i++) {
      const c = i < dc.chain.length
        ? dc.chain[i].tolerance_contribution_mm
        : (i === 0 ? 0 : datumTol);
      stack = Math.sqrt(stack ** 2 + c ** 2);
      setups[i].tolerance_stack_mm = parseFloat(stack.toFixed(6));
    }

    // Warn on tight-tolerance features in late setups
    for (let i = 1; i < setups.length; i++) {
      const tight = setups[i].features
        .map((id) => fMap.get(id)!)
        .filter((f) => f.tolerance_mm !== undefined && f.tolerance_mm < setups[i].tolerance_stack_mm);
      if (tight.length > 0) {
        warnings.push(
          `${setups[i].id}: ${tight.length} feature(s) tolerance tighter than stack (${setups[i].tolerance_stack_mm.toFixed(4)} mm)`,
        );
      }
    }

    return {
      setups, setup_count: setups.length,
      total_features: features.length, covered_features: claimed.size, uncovered_features: uncovered,
      datum_chain: dc.chain, total_tolerance_stack_mm: dc.stack_mm,
      tolerance_stack_within_spec: dc.within_spec,
      optimization_method:
        "greedy-set-cover with visibility-cone dot >= cos(60deg), Monte Carlo datum chain (RSS)",
      warnings,
      formula: "totalStack = sqrt(sum(sigma_i^2)); visibility = dot(access,orient) >= cos(60deg); " +
        "stability = F_clamp/(F_cut*2.5) >= 1",
    };
  }

  /** Which features are visible per orientation. Accessible if dot >= cos(60deg). */
  visibilityAnalysis(features: Feature[], orientations: Orientation[]): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const orient of orientations) {
      const od = orient.direction;
      const oMag = Math.sqrt(od.x ** 2 + od.y ** 2 + od.z ** 2);
      if (oMag === 0) continue;
      const accessible: string[] = [];
      for (const f of features) {
        const ad = f.access_direction;
        const aMag = Math.sqrt(ad.x ** 2 + ad.y ** 2 + ad.z ** 2);
        if (aMag === 0) continue;
        if ((ad.x * od.x + ad.y * od.y + ad.z * od.z) / (aMag * oMag) >= VIS_COS_THRESH) {
          accessible.push(f.id);
        }
      }
      result.set(orient.name, accessible);
    }
    return result;
  }

  /** Force equilibrium: effective_clamp / (cut * SF). Non-top gets 15% gravity penalty. */
  stabilityCheck(
    orientation: Orientation, cutting_force_N: number, clamping_force_N: number,
  ): StabilityResult {
    const d = orientation.direction;
    const isTop = d.x === 0 && d.y === 0 && d.z === 1;
    const effective = clamping_force_N * (isTop ? 1.0 : 0.85);
    const margin = parseFloat((effective / (cutting_force_N * SAFETY_FACTOR)).toFixed(4));
    return { stable: margin >= 1.0, margin };
  }

  /** Monte Carlo datum chain RSS. Analytical + MC verification with Mulberry32 PRNG. */
  datumChainAnalysis(
    setups: Setup[], tolerance: number, samples: number,
  ): { stack_mm: number; within_spec: boolean; chain: DatumChainLink[] } {
    if (setups.length <= 1) return { stack_mm: 0, within_spec: true, chain: [] };
    const n = setups.length - 1;

    const chain: DatumChainLink[] = [];
    for (let i = 0; i < n; i++) {
      chain.push({
        from_setup: setups[i].id, to_setup: setups[i + 1].id,
        tolerance_contribution_mm: parseFloat(tolerance.toFixed(6)),
      });
    }

    // Analytical RSS
    const rss = tolerance * Math.sqrt(n);

    // MC verification — uniform errors in [-tol, +tol]
    let maxObs = 0;
    for (let s = 0; s < samples; s++) {
      let cum = 0;
      for (let t = 0; t < n; t++) {
        cum += (this.prng(s * n + t) * 2 - 1) * tolerance;
      }
      const a = Math.abs(cum);
      if (a > maxObs) maxObs = a;
    }

    const stack_mm = parseFloat(Math.max(rss, maxObs * 0.95).toFixed(6));
    return { stack_mm, within_spec: stack_mm <= tolerance * 3, chain };
  }

  /** Greedy set cover — minimum orientations to cover all features. H(n) approximation. */
  greedySetCover(allFeatures: string[], orientationFeatures: Map<string, string[]>): string[] {
    const uncovered = new Set(allFeatures);
    const selected: string[] = [];
    while (uncovered.size > 0) {
      let bestName: string | null = null;
      let bestCount = 0;
      for (const [name, fids] of orientationFeatures) {
        if (selected.includes(name)) continue;
        const c = fids.filter((id) => uncovered.has(id)).length;
        if (c > bestCount) { bestCount = c; bestName = name; }
      }
      if (!bestName || bestCount === 0) break;
      selected.push(bestName);
      orientationFeatures.get(bestName)!.forEach((id) => uncovered.delete(id));
    }
    return selected;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Top-2 novel algorithms by feature-type overlap score. */
  private recommendAlgorithms(features: Feature[]): string[] {
    const types = new Set(features.map((f) => f.type));
    const scores: Array<{ algo: string; score: number }> = [];
    for (const [algo, ts] of Object.entries(ALGO_FEATURES)) {
      const overlap = ts.filter((t) => types.has(t)).length;
      if (overlap > 0) scores.push({ algo, score: overlap / ts.length });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, 2).map((s) => s.algo);
  }

  /** Mulberry32 deterministic PRNG in [0,1). */
  private prng(seed: number): number {
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private emptyResult(warnings: string[]): SetupPlannerResult {
    warnings.push("No features provided");
    return {
      setups: [], setup_count: 0, total_features: 0, covered_features: 0,
      uncovered_features: [], datum_chain: [], total_tolerance_stack_mm: 0,
      tolerance_stack_within_spec: true, optimization_method: "none",
      warnings, formula: "N/A — no features",
    };
  }
}

export const multiSetupPlannerEngine = new MultiSetupPlannerEngine();
