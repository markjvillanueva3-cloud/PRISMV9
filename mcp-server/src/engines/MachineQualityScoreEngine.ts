/**
 * MachineQualityScoreEngine — JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-SCORE
 * ===========================================================================
 *
 * Composite 0-100 machine-quality score (manufacturer reputation + accuracy +
 * kinematics + motion control + build mass + smoothing + controller class)
 * that downstream consumers (SF / wizards / post / quote / My-Shop / ROI)
 * multiply into their calculations as an accuracyCompensationFactor.
 *
 * High-ROI fields the schema needs but most rows don't have yet (this engine
 * surfaces the gaps via audit() — see MISSING_FIELDS):
 *   - positioning_accuracy_um   (e.g. 5 μm = high-precision; 25 μm = standard)
 *   - repeatability_um          (typically ≤ accuracy)
 *   - way_type                  linear-rail | box-way | hydrostatic | hybrid
 *   - max_rapid_mm_min          rapid traverse rate
 *   - max_accel_g               max axis g-load (motion dynamics)
 *   - look_ahead_blocks         motion-smoothing window (1000+ = high)
 *   - machine_mass_kg           rigidity proxy
 *   - manufacturer_tier         (computed if absent from REPUTATION_TIERS)
 *
 * Reputation tiers — industry-consensus public reputation grade for build
 * quality / accuracy / longevity. NOT subjective — drawn from shop-floor +
 * machine-rebuilder + MTConnect-data community consensus + public ISO/JIS
 * accuracy-class certification history. Edit only with citation in commit.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-SCORE (slot juliett, 2026-05-25)
 */

import { registryManager } from "../registries/manager.js";

export const SCHEMA_VERSION = "1.0.0";

/** Industry-consensus reputation tiers (S=top, then A/B/C/D). */
export const REPUTATION_TIERS: Record<string, "S"|"A"|"B"|"C"|"D"> = {
  // S-tier: ultra-precision / aerospace-grade / die-mold reference
  "DMG MORI": "S", "Mori Seiki": "S", "Makino": "S",
  "Mitsubishi": "S",          // wire EDM + jig grinder S-tier
  "Studer": "S", "Schaudt": "S", "Kellenberger": "S",  // grinder S
  "Yasda": "S", "Kuraki": "S",
  // A-tier: production precision
  "Okuma": "A", "Mazak": "A", "Hyundai WIA": "A",
  "Doosan": "A", "DN Solutions": "A",
  "Matsuura": "A", "Brother": "A", "Kitamura": "A",
  "Sodick": "A", "GF AgieCharmilles": "A", "Charmilles": "A",
  // B-tier: workhorse / shop-floor reliable
  "Haas": "B", "Hurco": "B", "Fadal": "B",
  "Leadwell": "B", "Hardinge": "B", "Bridgeport": "B",
  "Tormach": "B",
  // C-tier: entry / variable QC
  "Centroid": "C", "PCNC": "C", "Syil": "C",
  // D-tier: hobby / non-production
  "Shapeoko": "D", "X-Carve": "D", "Pocket NC": "D",
};

/** Score contribution per tier (0..30 of 100). */
const TIER_POINTS: Record<"S"|"A"|"B"|"C"|"D", number> = { S: 30, A: 25, B: 18, C: 10, D: 5 };

/** Controller-class points (0..15). */
const CONTROLLER_POINTS: Record<string, number> = {
  fanuc: 15, fanuc_30i: 15, fanuc_31i: 15,
  okuma_osp: 15, mitsubishi_meldas: 14, siemens_840d: 14, heidenhain_530: 14,
  hurco_winmax: 12, haas_ngc: 11, mazak_smoothx: 14, mazak_mazatrol: 13,
  brother_cnca00: 12,
  centroid_acorn: 8, linuxcnc: 7, mach3: 6, grbl: 4, marlin: 4,
};

/** Way-type rigidity contribution (0..15). */
const WAY_POINTS: Record<string, number> = {
  box_way: 15, hydrostatic: 15, hybrid: 12, linear_rail: 10, dovetail: 6, v_way: 8,
};

/** Fields the schema SHOULD carry for full quality scoring. Used by audit(). */
export const MISSING_FIELDS = [
  "positioning_accuracy_um",
  "repeatability_um",
  "way_type",
  "max_rapid_mm_min",
  "max_accel_g",
  "look_ahead_blocks",
  "machine_mass_kg",
  "manufacturer_tier",
] as const;
export type MissingField = typeof MISSING_FIELDS[number];

export interface MachineQualityScoreInput {
  /** Either pass the full machine record OR pass machine_id to load via registry */
  machine?: Record<string, unknown>;
  machine_id?: string;
  /** Override the reputation tier (S/A/B/C/D); else derived from manufacturer */
  manufacturer_tier?: "S"|"A"|"B"|"C"|"D";
}

export interface MachineQualityScoreResult {
  ok: boolean;
  machine_id: string | null;
  manufacturer: string | null;
  model: string | null;
  /** Composite score 0..100 */
  score: number;
  tier: "S"|"A"|"B"|"C"|"D"|"UNKNOWN";
  components: {
    reputation: number;
    controller: number;
    way: number;
    accuracy: number;
    motion_dynamics: number;
    smoothing: number;
    mass_rigidity: number;
  };
  /** Multiplier for downstream SF/post/quote calculations.
   * Higher quality = closer to 1.0 (don't derate); lower = derate. */
  accuracy_compensation_factor: number;
  missing_fields: MissingField[];
  warning?: string;
}

export interface MachineAuditResult {
  ok: boolean;
  total_machines: number;
  audited: number;
  by_missing_field: Record<MissingField, number>;
  by_tier: Record<"S"|"A"|"B"|"C"|"D"|"UNKNOWN", number>;
  worst_machines: Array<{ id: string; manufacturer: string; model: string; missing_count: number }>;
}

/** MachineQualityScoreEngine — stateless. */
export class MachineQualityScoreEngine {
  /** Derive reputation tier from manufacturer name (fuzzy starts-with match). */
  reputationTierFor(manufacturer: string | undefined | null): "S"|"A"|"B"|"C"|"D"|"UNKNOWN" {
    if (!manufacturer || typeof manufacturer !== "string") return "UNKNOWN";
    const m = manufacturer.trim();
    // Exact match first
    if (m in REPUTATION_TIERS) return REPUTATION_TIERS[m];
    // Case-insensitive substring match (DMG MORI vs dmg mori)
    const lower = m.toLowerCase();
    for (const [name, tier] of Object.entries(REPUTATION_TIERS)) {
      if (name.toLowerCase() === lower) return tier;
      if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) return tier;
    }
    return "UNKNOWN";
  }

  /** Compute the composite score + components for a single machine record. */
  async score(input: MachineQualityScoreInput): Promise<MachineQualityScoreResult> {
    let machine: any = input.machine;
    let warning: string | undefined;
    if (!machine && input.machine_id) {
      await registryManager.initialize();
      try {
        machine = await registryManager.machines.get(input.machine_id);
      } catch { warning = "machine lookup failed"; }
    }
    if (!machine) {
      return this.errorResult("missing_machine", "must provide either input.machine or input.machine_id");
    }

    const manufacturer = String(machine.manufacturer ?? "").trim() || null;
    const model = String(machine.model ?? "").trim() || null;
    const machine_id = String(machine.id ?? input.machine_id ?? "").trim() || null;

    const tier = input.manufacturer_tier ?? this.reputationTierFor(manufacturer);
    const reputationPts = tier === "UNKNOWN" ? 8 : TIER_POINTS[tier];

    // Controller (15 max)
    const ctrlKey = String(machine.controller?.family ?? machine.controller?.id ?? machine.controller_family ?? "").toLowerCase();
    const controllerPts = CONTROLLER_POINTS[ctrlKey] ?? 6;

    // Way type (15 max)
    const wayKey = String(machine.way_type ?? machine.physical?.way_type ?? "linear_rail").toLowerCase().replace(/[\s-]+/g, "_");
    const wayPts = WAY_POINTS[wayKey] ?? 6;

    // Accuracy (15 max — inverse of μm; 1μm=15, 5μm=12, 25μm=6, 100+μm=2)
    const accuracyUm = Number(machine.positioning_accuracy_um ?? machine.envelope?.positioning_accuracy_um ?? NaN);
    const accuracyPts = isFinite(accuracyUm) ? Math.max(2, Math.min(15, 15 - Math.log2(Math.max(1, accuracyUm)) * 2)) : 6;

    // Motion dynamics (10 max — accel × rapid)
    const maxRapid = Number(machine.max_rapid_mm_min ?? machine.axes?.max_rapid_mm_min ?? NaN);
    const maxAccelG = Number(machine.max_accel_g ?? machine.axes?.max_accel_g ?? NaN);
    let motionPts = 4; // default
    if (isFinite(maxRapid) && isFinite(maxAccelG)) {
      motionPts = Math.max(2, Math.min(10, (maxRapid / 12000) * 4 + maxAccelG * 2));
    } else if (isFinite(maxRapid)) {
      motionPts = Math.max(2, Math.min(8, (maxRapid / 12000) * 6));
    }

    // Motion smoothing (10 max — look-ahead blocks)
    const lookAhead = Number(machine.look_ahead_blocks ?? machine.controller?.look_ahead_blocks ?? NaN);
    const smoothingPts = isFinite(lookAhead) ? Math.max(2, Math.min(10, Math.log2(lookAhead + 1) * 1.2)) : 4;

    // Mass / rigidity (5 max — machine_mass_kg, > 5000kg = high)
    const massKg = Number(machine.machine_mass_kg ?? machine.physical?.weight_kg ?? machine.physical?.machine_mass_kg ?? NaN);
    const massPts = isFinite(massKg) ? Math.max(1, Math.min(5, Math.log10(Math.max(100, massKg)) - 1.5)) : 2;

    const components = {
      reputation: reputationPts,
      controller: controllerPts,
      way: wayPts,
      accuracy: accuracyPts,
      motion_dynamics: motionPts,
      smoothing: smoothingPts,
      mass_rigidity: massPts,
    };
    // Round to 1 decimal to avoid floating-point drift
    const totalRaw = Object.values(components).reduce((a, b) => a + b, 0);
    const total = Math.round(totalRaw * 10) / 10;
    const score = Math.max(0, Math.min(100, total));

    // accuracy_compensation_factor: 100-score gives 1.0 (no derate), 0 gives 0.5
    // Linear: factor = 0.5 + (score/100) * 0.5
    const acf = Math.round((0.5 + (score / 100) * 0.5) * 1000) / 1000;

    // Missing-fields audit
    const missing: MissingField[] = [];
    if (!isFinite(accuracyUm)) missing.push("positioning_accuracy_um");
    if (!isFinite(Number(machine.repeatability_um ?? machine.envelope?.repeatability_um))) missing.push("repeatability_um");
    if (!machine.way_type && !machine.physical?.way_type) missing.push("way_type");
    if (!isFinite(maxRapid)) missing.push("max_rapid_mm_min");
    if (!isFinite(maxAccelG)) missing.push("max_accel_g");
    if (!isFinite(lookAhead)) missing.push("look_ahead_blocks");
    if (!isFinite(massKg)) missing.push("machine_mass_kg");
    if (tier === "UNKNOWN") missing.push("manufacturer_tier");

    return {
      ok: true,
      machine_id, manufacturer, model,
      score, tier,
      components,
      accuracy_compensation_factor: acf,
      missing_fields: missing,
      warning,
    };
  }

  /** Audit ALL machines in the registry — surface data-quality gaps. */
  async audit(): Promise<MachineAuditResult> {
    await registryManager.initialize();
    let all: any[] = [];
    try { all = await registryManager.machines.list(); } catch { all = []; }
    const machines = Array.isArray(all) ? all : [];
    const byMissing: Record<MissingField, number> = MISSING_FIELDS.reduce((acc, f) => { acc[f] = 0; return acc; }, {} as Record<MissingField, number>);
    const byTier: Record<"S"|"A"|"B"|"C"|"D"|"UNKNOWN", number> = { S: 0, A: 0, B: 0, C: 0, D: 0, UNKNOWN: 0 };
    const worst: Array<{ id: string; manufacturer: string; model: string; missing_count: number }> = [];
    let audited = 0;
    for (const m of machines) {
      const r = await this.score({ machine: m });
      audited++;
      byTier[r.tier]++;
      for (const f of r.missing_fields) byMissing[f]++;
      if (r.missing_fields.length >= 5) {
        worst.push({
          id: r.machine_id ?? "?", manufacturer: r.manufacturer ?? "?",
          model: r.model ?? "?", missing_count: r.missing_fields.length,
        });
      }
    }
    worst.sort((a, b) => b.missing_count - a.missing_count);
    return {
      ok: true,
      total_machines: machines.length,
      audited,
      by_missing_field: byMissing,
      by_tier: byTier,
      worst_machines: worst.slice(0, 25),
    };
  }

  private errorResult(reason: string, warning: string): MachineQualityScoreResult {
    return {
      ok: false,
      machine_id: null, manufacturer: null, model: null,
      score: 0, tier: "UNKNOWN",
      components: { reputation: 0, controller: 0, way: 0, accuracy: 0, motion_dynamics: 0, smoothing: 0, mass_rigidity: 0 },
      accuracy_compensation_factor: 0.5,
      missing_fields: [...MISSING_FIELDS],
      warning,
    };
  }
}

// ============================================================================
// CONSUMER WIRES — JULIETT-DB-BRIDGE Phase 5
// Per-consumer payload shapes for the 5 named wire targets: wizard / sfc /
// post / my_shop / roi.
// ============================================================================

export const QUALITY_CONSUMERS = ["wizard", "sfc", "post", "my_shop", "roi"] as const;
export type QualityConsumer = typeof QUALITY_CONSUMERS[number];

export interface MachineQualityForConsumerInput {
  consumer: QualityConsumer;
  machine?: Record<string, unknown>;
  machine_id?: string;
  manufacturer_tier?: "S"|"A"|"B"|"C"|"D";
}

export interface MachineQualityForConsumerResult {
  ok: boolean;
  consumer: QualityConsumer;
  score: number;
  tier: "S"|"A"|"B"|"C"|"D"|"UNKNOWN";
  accuracy_compensation_factor: number;
  /** Consumer-specific payload shape — varies by consumer */
  payload: Record<string, unknown>;
  missing_fields: MissingField[];
  warning?: string;
}

export interface MachineUpgradeOutsourceInput {
  current_machine?: Record<string, unknown>;
  current_machine_id?: string;
  candidate_machine?: Record<string, unknown>;
  candidate_machine_id?: string;
  /** Cost of upgrade (USD) for ROI comparison. */
  upgrade_cost_usd?: number;
  /** Annual revenue at current quality (USD). */
  annual_revenue_usd?: number;
}

export interface MachineUpgradeOutsourceResult {
  ok: boolean;
  current: { score: number; tier: string; acf: number };
  candidate: { score: number; tier: string; acf: number };
  /** Quality delta (candidate - current). Positive = upgrade improves. */
  score_delta: number;
  acf_delta: number;
  /** Recommendation enum based on score_delta + cost analysis. */
  recommendation: "upgrade" | "outsource" | "stay" | "investigate";
  /** Expected annual revenue lift IF acf_delta translates to throughput. */
  expected_annual_lift_usd: number | null;
  /** Simple payback period (years). null when upgrade_cost_usd not provided. */
  payback_years: number | null;
  rationale: string;
}

/**
 * Extension: build consumer-specific payload from the score.
 * Phase 5 wire surface for wizard/sfc/post/my_shop/roi.
 */
export async function machineQualityForConsumer(
  input: MachineQualityForConsumerInput,
  engine: MachineQualityScoreEngine = machineQualityScoreEngine,
): Promise<MachineQualityForConsumerResult> {
  if (!input.consumer || !(QUALITY_CONSUMERS as readonly string[]).includes(input.consumer)) {
    return {
      ok: false, consumer: "wizard" as QualityConsumer,
      score: 0, tier: "UNKNOWN", accuracy_compensation_factor: 0.5,
      payload: {}, missing_fields: [...MISSING_FIELDS],
      warning: `consumer must be one of: ${QUALITY_CONSUMERS.join(", ")}`,
    };
  }
  const s = await engine.score({
    machine: input.machine,
    machine_id: input.machine_id,
    manufacturer_tier: input.manufacturer_tier,
  });
  if (!s.ok) {
    return {
      ok: false, consumer: input.consumer,
      score: s.score, tier: s.tier, accuracy_compensation_factor: s.accuracy_compensation_factor,
      payload: {}, missing_fields: s.missing_fields, warning: s.warning,
    };
  }

  let payload: Record<string, unknown> = {};
  switch (input.consumer) {
    case "wizard":
      // Wizard UI card: name + tier badge + score + top capability bullets
      payload = {
        display_name: `${s.manufacturer ?? "?"} ${s.model ?? ""}`.trim(),
        tier_badge: s.tier,
        score_label: `${s.score}/100`,
        capability_bullets: [
          `Reputation: ${s.components.reputation}/30`,
          `Controller: ${s.components.controller}/15`,
          `Way type: ${s.components.way}/15`,
          `Accuracy: ${s.components.accuracy}/15`,
          `Motion: ${s.components.motion_dynamics}/10`,
        ],
      };
      break;
    case "sfc":
      // SF calculator derate factor + iso emphasis (for Kienzle calc)
      payload = {
        derate_factor: s.accuracy_compensation_factor,
        confidence_band: s.tier === "S" || s.tier === "A" ? "tight" : s.tier === "B" ? "standard" : "wide",
        recommend_safety_pad_pct: s.score >= 80 ? 5 : s.score >= 60 ? 10 : 20,
      };
      break;
    case "post":
      // Post processor: controller class + accuracy class hint
      payload = {
        controller_family: s.components.controller >= 14 ? "premium" : s.components.controller >= 10 ? "production" : "basic",
        accuracy_class: s.components.accuracy >= 12 ? "ultra_precision" : s.components.accuracy >= 8 ? "precision" : "standard",
        recommend_look_ahead_blocks_min: s.tier === "S" ? 1000 : s.tier === "A" ? 500 : s.tier === "B" ? 200 : 50,
      };
      break;
    case "my_shop":
      // My-Shop UI: full machine card + missing-field punch list (operator action)
      payload = {
        display_name: `${s.manufacturer ?? "?"} ${s.model ?? ""}`.trim(),
        tier_badge: s.tier,
        score_label: `${s.score}/100`,
        components: s.components,
        missing_fields_count: s.missing_fields.length,
        operator_action_items: s.missing_fields.map((f) => `Add ${f} for this machine`),
        accuracy_compensation_factor: s.accuracy_compensation_factor,
      };
      break;
    case "roi":
      // ROI single-machine snapshot for upgrade evaluation
      payload = {
        score: s.score,
        tier: s.tier,
        acf: s.accuracy_compensation_factor,
        weakest_components: Object.entries(s.components)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([k, v]) => ({ component: k, points: v })),
        upgrade_signal: s.score < 70 ? "consider_upgrade" : s.score < 50 ? "strong_upgrade_signal" : "machine_capable",
      };
      break;
  }

  return {
    ok: true, consumer: input.consumer,
    score: s.score, tier: s.tier, accuracy_compensation_factor: s.accuracy_compensation_factor,
    payload, missing_fields: s.missing_fields,
  };
}

/**
 * Phase 5 / ROI: compare CURRENT machine vs CANDIDATE upgrade. Returns
 * recommendation + payback analysis. Inputs are loose — either machine
 * record or machine_id for each side.
 */
export async function machineCompareUpgradeOutsource(
  input: MachineUpgradeOutsourceInput,
  engine: MachineQualityScoreEngine = machineQualityScoreEngine,
): Promise<MachineUpgradeOutsourceResult> {
  const errorShape: MachineUpgradeOutsourceResult = {
    ok: false,
    current: { score: 0, tier: "UNKNOWN", acf: 0.5 },
    candidate: { score: 0, tier: "UNKNOWN", acf: 0.5 },
    score_delta: 0, acf_delta: 0,
    recommendation: "investigate",
    expected_annual_lift_usd: null, payback_years: null,
    rationale: "",
  };
  if (!input.current_machine && !input.current_machine_id) {
    return { ...errorShape, rationale: "missing current_machine or current_machine_id" };
  }
  if (!input.candidate_machine && !input.candidate_machine_id) {
    return { ...errorShape, rationale: "missing candidate_machine or candidate_machine_id" };
  }
  const cur = await engine.score({ machine: input.current_machine, machine_id: input.current_machine_id });
  const cand = await engine.score({ machine: input.candidate_machine, machine_id: input.candidate_machine_id });
  if (!cur.ok || !cand.ok) {
    return { ...errorShape, rationale: `score failed — current.ok=${cur.ok}, candidate.ok=${cand.ok}` };
  }
  const scoreDelta = Math.round((cand.score - cur.score) * 10) / 10;
  const acfDelta = Math.round((cand.accuracy_compensation_factor - cur.accuracy_compensation_factor) * 1000) / 1000;
  const expectedLift = (typeof input.annual_revenue_usd === "number" && isFinite(input.annual_revenue_usd) && input.annual_revenue_usd > 0)
    ? Math.round(input.annual_revenue_usd * (acfDelta / Math.max(0.5, cur.accuracy_compensation_factor)))
    : null;
  const payback = (expectedLift && typeof input.upgrade_cost_usd === "number" && isFinite(input.upgrade_cost_usd) && input.upgrade_cost_usd > 0 && expectedLift > 0)
    ? Math.round((input.upgrade_cost_usd / expectedLift) * 100) / 100
    : null;

  let recommendation: MachineUpgradeOutsourceResult["recommendation"] = "investigate";
  let rationale = "";
  if (scoreDelta < 5) {
    recommendation = "stay";
    rationale = `Candidate (${cand.score}) only ${scoreDelta} pts above current (${cur.score}). Insufficient lift — outsource if surge capacity needed.`;
    if (cand.tier === "S" || cand.tier === "A") {
      recommendation = "outsource"; // top-tier candidate exists in network — outsource to it instead of buying
      rationale = `Candidate is tier ${cand.tier} (network shop) but only ${scoreDelta} pts above current — outsource jobs requiring its precision rather than purchasing.`;
    }
  } else if (scoreDelta >= 15 && payback !== null && payback <= 3) {
    recommendation = "upgrade";
    rationale = `Strong lift (+${scoreDelta} pts) with ${payback}yr payback — upgrade pays back within 3 years.`;
  } else if (scoreDelta >= 15) {
    recommendation = "upgrade";
    rationale = `Strong lift (+${scoreDelta} pts). Payback analysis needs upgrade_cost_usd + annual_revenue_usd inputs.`;
  } else if (scoreDelta >= 5) {
    recommendation = "investigate";
    rationale = `Moderate lift (+${scoreDelta} pts) — investigate specific job mix to confirm ROI.`;
  }

  return {
    ok: true,
    current:   { score: cur.score,  tier: cur.tier,  acf: cur.accuracy_compensation_factor },
    candidate: { score: cand.score, tier: cand.tier, acf: cand.accuracy_compensation_factor },
    score_delta: scoreDelta, acf_delta: acfDelta,
    recommendation,
    expected_annual_lift_usd: expectedLift, payback_years: payback,
    rationale,
  };
}

/** Singleton — share across dispatcher invocations + consumer engines. */
export const machineQualityScoreEngine = new MachineQualityScoreEngine();
