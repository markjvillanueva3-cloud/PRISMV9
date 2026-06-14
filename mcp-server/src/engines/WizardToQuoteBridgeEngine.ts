/**
 * WizardToQuoteBridgeEngine — bridges 3 machine domain wizards into the quote pipeline
 *
 * Operator directive: "synergize the quoting feature to the 3 machine domain
 * wizards, speed and feed calculator and full print to cnc program pipeline
 * ... get more accurate run times, setup time, tooling required, machine
 * hours, overhead, employee pay rate, electricity used".
 *
 * Takes the output of a mill / lathe / wedm wizard (operations[], cycle
 * minutes, tools[], passes[], material) AND a shop profile id, then emits
 * a QuoteEstimateInput-shaped object with REAL cycle times + tool counts +
 * setup hours + electricity cost + per-tier labor allocation.
 *
 * Pure compositional. No I/O outside ShopProfileTemplateEngine (which
 * lazy-loads from `state/shared/shop-profiles/<id>.json`).
 *
 * Shop-agnostic: profile_id="jm-die" today; same engine drives any future
 * shop profile.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-WIZARD-TO-QUOTE (charlie /goal-20 iter11)
 */

export type WizardDomain = "mill" | "lathe" | "wedm";

export interface WizardOperation {
  /** Op name from the wizard (e.g., "rough_pocket", "thread_milling", "wire_cut_rough"). */
  name: string;
  /** Per-op cycle minutes from wizard output. */
  cycle_min: number;
  /** Tool ids used by this op. */
  tool_ids?: string[];
  /** Number of passes (multi-pass disciplines on WEDM/finishing). */
  passes?: number;
}

export interface WizardOutput {
  domain: WizardDomain;
  /** Machine family id (matches ShopProfile.machines.family). */
  machine_family: string;
  /** Material code (e.g., "aluminum_6061"). */
  material: string;
  operations: WizardOperation[];
  /** Setup minutes from the wizard. */
  setup_min: number;
  /** Operator skill tier for primary run. */
  operator_tier?: "apprentice" | "operator" | "senior" | "master" | "programmer";
  /** Operator-supplied lot quantity. */
  quantity: number;
}

export interface WizardQuoteBridgeResult {
  ok: boolean;
  reason?: string;
  /** Aggregated cycle time across all ops, in minutes. */
  total_cycle_min: number;
  /** Setup time in minutes (passed through from wizard). */
  setup_min: number;
  /** Unique tools required (deduped across ops). */
  tool_count: number;
  /** Number of distinct ops. */
  op_count: number;
  /** Wall-clock machine hours (cycle ÷ utilization). */
  machine_hours_wall_clock: number;
  /** Machine-cost contribution (machine_hours × rate). */
  machine_cost_usd: number;
  /** Setup cost (setup_min × setup_rate). */
  setup_cost_usd: number;
  /** Labor cost for operator-tier running the cycle. */
  labor_cost_usd: number;
  /** Electricity cost across the cycle. */
  electricity_cost_usd: number;
  /** Total direct cost (machine + setup + labor + electricity). */
  total_direct_cost_usd: number;
  /** Overhead loaded on top (per shop profile). */
  overhead_cost_usd: number;
  /** Total cost per part (with overhead, divided by qty). */
  cost_per_part_usd: number;
  /** Shop profile that was used. */
  profile_id: string;
  /** Detailed warnings (e.g., machine fallback used). */
  warnings: string[];
  /** JULIETT-DB-BRIDGE-MS0 Phase 5: machine-quality overlay (when machine_id provided). */
  machine_quality?: {
    tier: string;
    score: number;
    derate_factor: number;
    cycle_time_uplift_pct: number;
    wizard_display: {
      display_name: string;
      tier_badge: string;
      capability_bullets: string[];
    };
    source: string;
  };
}

export class WizardToQuoteBridgeEngine {
  /**
   * Translate wizard output → quote-time cost breakdown.
   */
  async bridge(
    wizard: WizardOutput,
    opts: {
      profile_id?: string;
      /** JULIETT-DB-BRIDGE-MS0 Phase 5: machine_id triggers machine-quality overlay (wizard-trio wire). */
      machine_id?: string;
      /** Pre-fetched machine record (bypasses machine_id lookup). */
      machine?: Record<string, unknown>;
    } = {},
  ): Promise<WizardQuoteBridgeResult> {
    const empty: WizardQuoteBridgeResult = {
      ok: false, total_cycle_min: 0, setup_min: 0, tool_count: 0, op_count: 0,
      machine_hours_wall_clock: 0, machine_cost_usd: 0, setup_cost_usd: 0, labor_cost_usd: 0,
      electricity_cost_usd: 0, total_direct_cost_usd: 0, overhead_cost_usd: 0, cost_per_part_usd: 0,
      profile_id: opts.profile_id ?? "jm-die", warnings: [],
    };
    if (!wizard || typeof wizard.machine_family !== "string") {
      return { ...empty, reason: "wizard.machine_family required" };
    }
    if (!Array.isArray(wizard.operations) || wizard.operations.length === 0) {
      return { ...empty, reason: "wizard.operations must be non-empty array" };
    }
    if (!Number.isFinite(wizard.quantity) || wizard.quantity <= 0) {
      return { ...empty, reason: "wizard.quantity must be positive finite" };
    }

    const warnings: string[] = [];
    const { shopProfileTemplateEngine } = await import("./ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile(opts.profile_id);

    const machine = shopProfileTemplateEngine.getMachineRate(profile, wizard.machine_family);
    if (machine.source === "default") {
      warnings.push(`machine_family "${wizard.machine_family}" not in profile "${profile.profile_id}" — using default rate $${profile.default_machine_rate_usd_per_hr}/hr`);
    }

    // Aggregate cycle + tools
    const totalCycleMin = wizard.operations.reduce((s, o) => s + Math.max(0, Number(o.cycle_min) || 0), 0);
    const uniqueTools = new Set<string>();
    for (const op of wizard.operations) for (const t of (op.tool_ids ?? [])) uniqueTools.add(t);

    const cycleHours = totalCycleMin / 60;
    // Utilization-adjusted wall-clock — when utilization=0.78, 1hr cycle = 1.28hr wall-clock
    const utilization = profile.machines.find(m => m.family.toLowerCase() === wizard.machine_family.toLowerCase())?.utilization_pct ?? 0.75;
    const wallClockHours = utilization > 0 ? cycleHours / utilization : cycleHours;

    // JULIETT-DB-BRIDGE-MS0 Phase 5 — machine-quality overlay (wizard trio wire).
    // When machine_id provided, fetch sfc derate + wizard payload and amplify
    // machine_cost (slower machine = more billable hours for same part).
    let mqOverlay: WizardQuoteBridgeResult["machine_quality"] | undefined = undefined;
    let cycleUpliftFactor = 1.0;
    if (opts.machine_id || opts.machine) {
      const { machineQualityForConsumer } = await import("./MachineQualityScoreEngine.js");
      const [sfcQ, wizardQ] = await Promise.all([
        machineQualityForConsumer({ consumer: "sfc",    machine_id: opts.machine_id, machine: opts.machine }),
        machineQualityForConsumer({ consumer: "wizard", machine_id: opts.machine_id, machine: opts.machine }),
      ]);
      if (sfcQ.ok && wizardQ.ok) {
        const sfcP = sfcQ.payload as { derate_factor: number };
        const wizP = wizardQ.payload as { display_name: string; tier_badge: string; capability_bullets: string[] };
        const derate = Math.max(0.5, Math.min(1.0, sfcP.derate_factor));
        cycleUpliftFactor = derate > 0 ? 1.0 / derate : 1.0;
        const upliftPct = Math.round((cycleUpliftFactor - 1.0) * 1000) / 10;
        mqOverlay = {
          tier: sfcQ.tier, score: sfcQ.score, derate_factor: derate,
          cycle_time_uplift_pct: upliftPct,
          wizard_display: {
            display_name: wizP.display_name,
            tier_badge: wizP.tier_badge,
            capability_bullets: wizP.capability_bullets,
          },
          source: `machine_quality_score[${sfcQ.tier}]`,
        };
      }
    }

    const machineCost = round2(wallClockHours * cycleUpliftFactor * machine.rate_usd_per_hr);

    const setupHours = Math.max(0, wizard.setup_min) / 60;
    const setupCost = round2(setupHours * profile.setup_rate_usd_per_hr);

    const tier = wizard.operator_tier ?? "operator";
    const laborRate = shopProfileTemplateEngine.getLaborRate(profile, tier);
    // Labor runs concurrent with machine — we charge labor at wall-clock hours
    const laborCost = round2(wallClockHours * laborRate);

    const electricity = shopProfileTemplateEngine.electricityCost(profile, {
      machine_family: wizard.machine_family,
      cycle_time_hr: cycleHours, // electricity only consumed during active cycle, not idle wall-clock
    });

    const directCost = round2(machineCost + setupCost + laborCost + electricity.cost_usd);
    const overheadCost = round2(directCost * profile.overhead_pct / 100);
    const totalLotCost = round2(directCost + overheadCost);
    const costPerPart = round2(totalLotCost / wizard.quantity);

    return {
      ok: true,
      total_cycle_min: round2(totalCycleMin),
      setup_min: wizard.setup_min,
      tool_count: uniqueTools.size,
      op_count: wizard.operations.length,
      machine_hours_wall_clock: round2(wallClockHours),
      machine_cost_usd: machineCost,
      setup_cost_usd: setupCost,
      labor_cost_usd: laborCost,
      electricity_cost_usd: electricity.cost_usd,
      total_direct_cost_usd: directCost,
      overhead_cost_usd: overheadCost,
      cost_per_part_usd: costPerPart,
      profile_id: profile.profile_id,
      warnings,
      ...(mqOverlay ? { machine_quality: mqOverlay } : {}),
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const wizardToQuoteBridgeEngine = new WizardToQuoteBridgeEngine();
export default wizardToQuoteBridgeEngine;
