/**
 * ManufacturingIntegrationEngine — CPL-MS1 Pipeline Integration
 *
 * Bundles 4 cross-cutting manufacturing pipeline features:
 *
 * 1. **Distortion-Compensated Multi-Setup** (P1-U05)
 *    Merwin-Johnson residual stress model: distortion = α × σ_residual / E × L
 *    Ref: Merwin & Johnson (1963), Ratchev et al. (2004)
 *
 * 2. **Generative Fixture Planning** (P1-U06)
 *    Grid-search clamp optimization — minimize deflection, maximize grip, avoid collision.
 *    Ref: Kaya (2006) fixture layout optimization
 *
 * 3. **Trochoidal + Depth Variation** (P1-U03)
 *    Variable-depth Z with trochoidal XY for volumetric constant-MRR.
 *    Ref: Pleta et al. (2014), Rauch et al. (2009)
 *
 * 4. **Stochastic Geometry from CAD** (P1-U12)
 *    Monte Carlo GD&T tolerance zone propagation (N=500).
 *    Ref: ISO 1101:2017, ASME Y14.5-2018, Montgomery (2019)
 *
 * Dispatcher actions: predict_distortion, apply_distortion_comp, plan_fixture,
 *   check_fixture_collision, variable_depth_trochoidal, propagate_gdt_uncertainty
 *
 * @module CPL-MS1/ManufacturingIntegration
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }

export interface PartDimensions {
  length: number;
  width: number;
  height: number;
  wall_thickness_min?: number;
}

export interface OperationSpec {
  type: "roughing" | "semi_finish" | "finishing" | "drilling";
  cutting_force_N: number;
  axial_depth_mm: number;
  radial_depth_mm?: number;
  feed_mm_min?: number;
}

export interface MaterialSpec {
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  youngs_modulus_gpa?: number;
  yield_strength_mpa?: number;
}

export interface ClampPosition {
  x: number;
  y: number;
  type: string;
  force_N: number;
}

export interface TrochoidalLayer {
  z_mm: number;
  ap_mm: number;
  ae_mm: number;
  feed_mm_min: number;
  mrr_mm3_min: number;
}

export interface GDTFeature {
  id: string;
  type: string;
  nominal: Point3D;
  zone_diameter_mm: number;
  datum_ref: string;
}

export interface DistortionResult {
  predicted_distortion_um: number;
  distortion_direction: "bow" | "twist" | "cup";
  compensation_offsets: Point3D[];
  stress_relief_pct: number;
  thin_wall_amplification: number;
  recommendation: string;
}

export interface CompensatedCoordinates {
  original: Point3D[];
  compensated: Point3D[];
  max_compensation_um: number;
  applied_profile: string;
}

export interface FixtureLayoutResult {
  clamp_positions: ClampPosition[];
  clamp_forces_N: number[];
  estimated_deflection_um: number;
  grip_safety_factor: number;
  fixture_type: string;
  score: number;
  recommendations: string[];
}

export interface CollisionCheckResult {
  collisions: number;
  min_clearance_mm: number;
  collision_points: Point3D[];
  recommendations: string[];
}

export interface VariableDepthTrochoidalResult {
  layers: TrochoidalLayer[];
  total_time_s: number;
  mrr_cv_pct: number;
  mrr_target_mm3_min: number;
  total_volume_mm3: number;
}

export interface GDTFeatureResult {
  feature_id: string;
  zone_diameter_mm: number;
  predicted_cpk: number;
  probability_in_zone: number;
  mean_deviation_mm: number;
  sigma_mm: number;
}

export interface GDTUncertaintyResult {
  per_feature: GDTFeatureResult[];
  overall_cpk: number;
  monte_carlo_samples: number;
  worst_feature_id: string;
  recommendations: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Young's modulus by ISO material group (GPa) */
const E_GPA: Record<string, number> = { P: 210, M: 200, K: 120, N: 70, S: 114, H: 210 };
/** Yield strength by ISO material group (MPa) */
const YIELD: Record<string, number> = { P: 500, M: 400, K: 300, N: 280, S: 900, H: 1200 };
/** Merwin-Johnson residual stress fraction by operation type */
const RES_FRAC: Record<string, number> = {
  roughing: 0.35, semi_finish: 0.15, finishing: 0.05, drilling: 0.10,
};

const rnd = (v: number, d = 2) => parseFloat(v.toFixed(d));

/** LCG-based seeded PRNG for reproducible Monte Carlo */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Box-Muller transform for normal variates */
function boxMuller(rng: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-10, rng()))) * Math.cos(2 * Math.PI * rng());
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class ManufacturingIntegrationEngine {

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Distortion-Compensated Multi-Setup (P1-U05)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Predict setup distortion from residual stress relief after machining.
   * Merwin-Johnson beam model: δ = α × σ_residual / E × L
   * Thin walls (< 3mm) amplified by (3/t)² per Ratchev flexibility model.
   */
  predictSetupDistortion(
    operations: OperationSpec[],
    material: MaterialSpec,
    stockDims: PartDimensions,
  ): DistortionResult {
    const E = (material.youngs_modulus_gpa ?? E_GPA[material.iso_group] ?? 210) * 1000; // MPa
    const sigmaY = material.yield_strength_mpa ?? YIELD[material.iso_group] ?? 500;
    const L = stockDims.length;

    // Cumulative residual stress from all operations (force-scaled)
    let cumFrac = 0;
    for (const op of operations) {
      cumFrac += (RES_FRAC[op.type] ?? 0.15) * Math.min(2, op.cutting_force_N / 1000);
    }
    cumFrac = Math.min(0.8, cumFrac);

    // Merwin-Johnson: δ = α × σ_r / E × L, α = 0.6 distribution factor
    let dist_mm = 0.6 * (sigmaY * cumFrac / E) * L;

    // Thin-wall amplification: stiffness ∝ t²
    const wall = stockDims.wall_thickness_min ?? stockDims.width;
    const amp = wall < 3 ? Math.pow(3 / wall, 2) : 1;
    dist_mm *= amp;

    // Direction from geometry aspect ratios
    const ar = L / stockDims.width;
    const hr = stockDims.height / stockDims.width;
    const dir: "bow" | "twist" | "cup" =
      ar > 4 ? "bow" : (hr > 3 && ar > 2) ? "twist" : "cup";

    // Parabolic compensation offsets (5 points along length, peak at center)
    const offsets: Point3D[] = Array.from({ length: 5 }, (_, i) => {
      const f = i / 4, p = 4 * f * (1 - f);
      return {
        x: rnd(dir === "twist" ? -dist_mm * p * 0.3 : 0, 4),
        y: rnd(dir === "twist" ? -dist_mm * p * 0.5 : 0, 4),
        z: rnd(-dist_mm * p, 4),
      };
    });

    const um = rnd(dist_mm * 1000);
    const rec = um < 10
      ? "Distortion negligible — no compensation required."
      : um < 50
        ? "Moderate distortion — apply compensation offsets in finishing setup."
        : um < 200
          ? "Significant distortion — stress-relief anneal recommended between setups."
          : "Severe distortion — redesign clamping, add stress-relief cycles, reduce roughing.";

    return {
      predicted_distortion_um: um, distortion_direction: dir,
      compensation_offsets: offsets, stress_relief_pct: rnd(cumFrac * 100, 1),
      thin_wall_amplification: rnd(amp), recommendation: rec,
    };
  }

  /**
   * Apply distortion compensation to coordinate set.
   * Interpolates parabolic profile across X range and applies negative offsets.
   */
  applyDistortionCompensation(
    coordinates: Point3D[],
    profile: DistortionResult,
  ): CompensatedCoordinates {
    if (!coordinates.length) {
      return { original: [], compensated: [], max_compensation_um: 0, applied_profile: "none" };
    }
    const off = profile.compensation_offsets;
    const n = off.length;
    let minX = Infinity, maxX = -Infinity;
    for (const c of coordinates) {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
    }
    const range = maxX - minX || 1;
    let maxComp = 0;

    const comp = coordinates.map(c => {
      const idx = ((c.x - minX) / range) * (n - 1);
      const lo = Math.floor(idx), hi = Math.min(lo + 1, n - 1), t = idx - lo;
      const ox = off[lo].x * (1 - t) + off[hi].x * t;
      const oy = off[lo].y * (1 - t) + off[hi].y * t;
      const oz = off[lo].z * (1 - t) + off[hi].z * t;
      const mag = Math.sqrt(ox * ox + oy * oy + oz * oz) * 1000;
      if (mag > maxComp) maxComp = mag;
      return { x: rnd(c.x + ox, 4), y: rnd(c.y + oy, 4), z: rnd(c.z + oz, 4) };
    });

    return {
      original: coordinates, compensated: comp,
      max_compensation_um: rnd(maxComp), applied_profile: profile.distortion_direction,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Generative Fixture Planning (P1-U06)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Plan optimal fixture layout via grid search over clamp positions.
   * Supports vise, fixture_plate, vacuum, and chuck fixture types.
   * Scoring: spread × 0.4 + quadrant coverage × 0.6
   */
  planFixtureLayout(
    partDims: PartDimensions,
    operations: OperationSpec[],
    fixtureType: "vise" | "fixture_plate" | "vacuum" | "chuck",
  ): FixtureLayoutResult {
    const mu = 0.35; // steel-on-steel friction
    const maxF = Math.max(...operations.map(o => o.cutting_force_N), 500);
    const recs: string[] = [];

    if (fixtureType === "vise") {
      const jf = maxF / mu * 2, oh = partDims.length / 2;
      const I = (partDims.width * Math.pow(partDims.height, 3)) / 12;
      const def_um = ((maxF * Math.pow(oh, 3)) / (3 * 210000 * Math.max(I, 1))) * 1000;
      if (def_um > 50) recs.push("Part overhang >50μm deflection — consider fixture plate.");
      const sf = rnd((jf * mu * 2) / maxF);
      return {
        clamp_positions: [
          { x: partDims.length / 2, y: 0, type: "vise_jaw_fixed", force_N: jf },
          { x: partDims.length / 2, y: partDims.width, type: "vise_jaw_movable", force_N: jf },
        ],
        clamp_forces_N: [jf, jf], estimated_deflection_um: rnd(def_um),
        grip_safety_factor: sf, fixture_type: "vise",
        score: sf > 2 && def_um < 50 ? 0.9 : 0.6, recommendations: recs,
      };
    }

    if (fixtureType === "vacuum") {
      const hf = 0.085 * partDims.length * partDims.width; // F = P × A
      const sf = rnd(hf / maxF);
      if (sf < 2) recs.push(`Vacuum grip SF=${sf} — below 2.0. Add supplemental clamps.`);
      return {
        clamp_positions: [{ x: partDims.length / 2, y: partDims.width / 2, type: "vacuum_zone", force_N: hf }],
        clamp_forces_N: [hf], estimated_deflection_um: 0,
        grip_safety_factor: sf, fixture_type: "vacuum",
        score: sf >= 2 ? 0.85 : 0.4, recommendations: recs,
      };
    }

    if (fixtureType === "chuck") {
      const rad = Math.min(partDims.length, partDims.width) / 2;
      const jf = maxF / (mu * 3) * 2.5;
      const clamps = Array.from({ length: 3 }, (_, i) => {
        const angle = (i * 2 * Math.PI) / 3;
        return { x: rnd(rad * Math.cos(angle)), y: rnd(rad * Math.sin(angle)), type: "chuck_jaw", force_N: jf };
      });
      const sf = rnd((jf * 3 * mu) / maxF);
      return {
        clamp_positions: clamps, clamp_forces_N: clamps.map(() => jf),
        estimated_deflection_um: 0, grip_safety_factor: sf, fixture_type: "chuck",
        score: sf > 2.5 ? 0.9 : 0.65, recommendations: recs,
      };
    }

    // fixture_plate: greedy grid search for 3-4 clamp positions along edges
    const nC = partDims.length * partDims.width > 10000 ? 4 : 3;
    const mg = 10;
    const cands: Point2D[] = [];
    for (let x = mg; x <= partDims.length - mg; x += 10) {
      cands.push({ x, y: mg });
      cands.push({ x, y: partDims.width - mg });
    }
    for (let y = mg + 10; y < partDims.width - mg; y += 10) {
      cands.push({ x: mg, y });
      cands.push({ x: partDims.length - mg, y });
    }

    const best: Point2D[] = [];
    const used = new Set<number>();
    let bestScore = 0;
    for (let c = 0; c < nC && cands.length > 0; c++) {
      let bi = 0, bs = -Infinity;
      for (let i = 0; i < cands.length; i++) {
        if (used.has(i)) continue;
        const s = this._scoreLayout([...best, cands[i]], partDims);
        if (s > bs) { bs = s; bi = i; }
      }
      used.add(bi);
      best.push(cands[bi]);
      bestScore = bs;
    }

    const cf = rnd((maxF / (mu * nC)) * 2.5, 1);
    const clamps = best.map(p => ({ x: p.x, y: p.y, type: "toe_clamp", force_N: cf }));
    const D_plate = (210000 * Math.pow(partDims.height, 3)) / (12 * 0.91);
    const def_um = ((maxF * partDims.length ** 2) /
      (64 * D_plate * Math.max(partDims.width / partDims.length, 1))) * 1000;
    if (def_um > 25) recs.push("Predicted deflection >25μm — add support under cutting zone.");

    return {
      clamp_positions: clamps, clamp_forces_N: clamps.map(() => cf),
      estimated_deflection_um: rnd(def_um),
      grip_safety_factor: rnd((cf * nC * mu) / maxF),
      fixture_type: "fixture_plate",
      score: rnd(Math.min(1, bestScore), 3),
      recommendations: recs,
    };
  }

  /** Score layout by inter-clamp spread (0.4) + quadrant coverage (0.6). */
  private _scoreLayout(pts: Point2D[], d: PartDimensions): number {
    if (pts.length < 2) return 0;
    let minD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dd = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (dd < minD) minD = dd;
      }
    }
    const spread = minD / Math.hypot(d.length, d.width);
    const cx = d.length / 2, cy = d.width / 2;
    const quads = [false, false, false, false];
    for (const p of pts) { quads[(p.x >= cx ? 0 : 2) + (p.y >= cy ? 0 : 1)] = true; }
    return spread * 0.4 + (quads.filter(Boolean).length / 4) * 0.6;
  }

  /**
   * Check fixture-tool collisions along a toolpath.
   * Collision flagged when clearance < toolDiameter/2 + 5mm safety margin.
   */
  checkFixtureCollision(
    clampPositions: ClampPosition[],
    toolpath: Point3D[],
    toolDiameter: number,
  ): CollisionCheckResult {
    const margin = 5;
    let collisions = 0, minCl = Infinity;
    const pts: Point3D[] = [];

    for (const tp of toolpath) {
      for (const cl of clampPositions) {
        const d2d = Math.hypot(tp.x - cl.x, tp.y - cl.y);
        const clampR = cl.type.includes("vise") ? 50 : 30;
        const clearance = d2d - clampR - toolDiameter / 2;
        if (clearance < minCl) minCl = clearance;
        if (clearance < margin) { collisions++; pts.push(tp); }
      }
    }

    const recs: string[] = [];
    if (collisions > 0) recs.push(`${collisions} collision zone(s) — relocate clamps or retract toolpath.`);
    else if (minCl < 10) recs.push(`Min clearance ${minCl.toFixed(1)}mm is tight.`);
    return {
      collisions, min_clearance_mm: rnd(Math.max(0, minCl)),
      collision_points: pts.slice(0, 20), recommendations: recs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Trochoidal + Depth Variation (P1-U03)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Compute variable-depth trochoidal layer plan for constant MRR.
   * MRR = ae × ap × feed. Adjusts ap per layer with ae compensation
   * to maintain target MRR. Avoids sliver layers via split logic.
   * Chip-thinning feed compensation: f_adj = f × sqrt(ae_base / ae).
   */
  variableDepthTrochoidal(
    pocket: { depth_mm: number; length_mm: number; width_mm: number },
    tool: { diameter_mm: number; flutes: number; feed_per_tooth_mm: number; max_ap_mm: number; rpm: number },
    _material: MaterialSpec,
  ): VariableDepthTrochoidalResult {
    const D = tool.diameter_mm;
    const aeBase = D * 0.08; // 8% of diameter — trochoidal engagement
    const maxAp = tool.max_ap_mm;
    const feed = tool.feed_per_tooth_mm * tool.flutes * tool.rpm; // mm/min
    const targetMRR = aeBase * maxAp * feed;
    const area = pocket.length_mm * pocket.width_mm;
    const layers: TrochoidalLayer[] = [];
    let z = 0;

    while (z < pocket.depth_mm - 0.01) {
      const left = pocket.depth_mm - z;
      // Avoid sliver: if 1-2× maxAp left, split evenly
      const ap = left <= maxAp
        ? Math.max(0.5, left)
        : (left < maxAp * 2 ? left / 2 : maxAp);
      // ae = MRR_target / (ap × feed), clamped to physical limits
      const ae = Math.max(aeBase * 0.5, Math.min(targetMRR / (ap * feed), D * 0.25));
      // Chip-thinning feed compensation
      const adjFeed = feed * Math.min(Math.sqrt(aeBase / ae), 1.5);
      const mrr = ae * ap * adjFeed;

      layers.push({
        z_mm: rnd(z + ap, 3), ap_mm: rnd(ap, 3), ae_mm: rnd(ae, 3),
        feed_mm_min: rnd(adjFeed, 1), mrr_mm3_min: rnd(mrr, 1),
      });
      z += ap;
    }

    // Total time: trochoidal path ≈ (area / ae) × π per layer
    let totalTime = 0;
    const mrrVals = layers.map(l => l.mrr_mm3_min);
    for (const l of layers) {
      totalTime += ((area / l.ae_mm) * Math.PI) / l.feed_mm_min * 60; // seconds
    }
    const mean = mrrVals.reduce((a, b) => a + b, 0) / mrrVals.length;
    const cv = mean > 0
      ? Math.sqrt(mrrVals.reduce((a, b) => a + (b - mean) ** 2, 0) / mrrVals.length) / mean * 100
      : 0;

    return {
      layers, total_time_s: rnd(totalTime, 1), mrr_cv_pct: rnd(cv),
      mrr_target_mm3_min: rnd(targetMRR, 1),
      total_volume_mm3: rnd(area * pocket.depth_mm, 1),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Stochastic Geometry from CAD (P1-U12)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Propagate manufacturing uncertainty through GD&T tolerance zones.
   * Monte Carlo (N=500) with 4 uncertainty sources:
   *   - Machine positioning (Gaussian, σ = accuracy/3)
   *   - Tool deflection bias (δ = F×L³/(3EI), I = π×d⁴/64)
   *   - Thermal drift (uniform ±drift)
   *   - Spindle runout (uniform radial)
   * Cpk = (zone_radius - mean_offset) / (3σ)
   */
  propagateGDTUncertainty(
    features: GDTFeature[],
    cap: {
      positioning_accuracy_um?: number;
      tool_diameter_mm?: number;
      tool_overhang_mm?: number;
      tool_E_GPa?: number;
      cutting_force_N?: number;
      thermal_drift_um?: number;
      spindle_runout_um?: number;
    },
  ): GDTUncertaintyResult {
    const N = 500;
    const rng = seededRng(42);
    const posA = (cap.positioning_accuracy_um ?? 5) / 1000; // mm
    const toolD = cap.tool_diameter_mm ?? 10;
    const toolL = cap.tool_overhang_mm ?? 50;
    const toolE = (cap.tool_E_GPa ?? 600) * 1000; // MPa
    const F = cap.cutting_force_N ?? 200;
    const therm = (cap.thermal_drift_um ?? 3) / 1000; // mm
    const runout = (cap.spindle_runout_um ?? 2) / 1000; // mm

    // Tool deflection: δ = F×L³/(3EI), I = π×d⁴/64
    const I = Math.PI * Math.pow(toolD, 4) / 64;
    const defl = (F * Math.pow(toolL, 3)) / (3 * toolE * I);

    let worstCpk = Infinity, worstId = "";
    const perFeature: GDTFeatureResult[] = features.map(feat => {
      const zr = feat.zone_diameter_mm / 2;
      let inZone = 0;
      const devs: number[] = [];

      for (let i = 0; i < N; i++) {
        // Positioning: bivariate normal
        const px = boxMuller(rng) * posA / 3;
        const py = boxMuller(rng) * posA / 3;
        // Deflection: directional bias with 10% scatter
        const dx = defl * (1 + 0.1 * boxMuller(rng));
        const dy = defl * 0.3 * boxMuller(rng);
        // Thermal: uniform
        const tx = (rng() * 2 - 1) * therm;
        const ty = (rng() * 2 - 1) * therm;
        // Runout: random radial
        const ra = rng() * 2 * Math.PI, rr = rng() * runout;

        const totX = px + dx + tx + rr * Math.cos(ra);
        const totY = py + dy + ty + rr * Math.sin(ra);
        const d = Math.sqrt(totX * totX + totY * totY);
        devs.push(d);
        if (d <= zr) inZone++;
      }

      const mean = devs.reduce((a, b) => a + b, 0) / N;
      const sig = Math.sqrt(devs.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
      const cpk = sig > 0 ? Math.max(0, (zr - mean) / (3 * sig)) : 99;
      if (cpk < worstCpk) { worstCpk = cpk; worstId = feat.id; }

      return {
        feature_id: feat.id, zone_diameter_mm: feat.zone_diameter_mm,
        predicted_cpk: rnd(cpk, 3), probability_in_zone: rnd(inZone / N, 4),
        mean_deviation_mm: rnd(mean, 4), sigma_mm: rnd(sig, 4),
      };
    });

    const recs: string[] = [];
    if (worstCpk < 1.0) recs.push("Cpk < 1.0 — tighten machine calibration or loosen tolerance zones.");
    if (worstCpk < 1.33) recs.push("Cpk < 1.33 — reduce tool deflection (shorter overhang or larger diameter).");
    if (defl * 1000 > 10) {
      recs.push(`Tool deflection ${rnd(defl * 1000, 1)}μm significant — use shorter tool or stiffer material.`);
    }
    const low = perFeature.filter(f => f.probability_in_zone < 0.95);
    if (low.length) {
      recs.push(`${low.length} feature(s) below 95% — review: ${low.map(f => f.feature_id).join(", ")}.`);
    }

    return {
      per_feature: perFeature,
      overall_cpk: rnd(features.length ? worstCpk : 0, 3),
      monte_carlo_samples: N,
      worst_feature_id: worstId || "none",
      recommendations: recs,
    };
  }
}

/** Singleton instance */
export const manufacturingIntegrationEngine = new ManufacturingIntegrationEngine();
export default manufacturingIntegrationEngine;
