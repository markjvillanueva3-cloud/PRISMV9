/**
 * SpeedFeedToQuoteBridgeEngine — physics-backed cycle times for quote-time
 *
 * Operator directive (iter11 follow-up): "synergize the quoting feature
 * to the 3 machine domain wizards, speed and feed calculator and full
 * print to cnc program pipelines to get more accurate run times".
 *
 * iter11 (U-WIZARD-TO-QUOTE) accepts cycle_min directly from the wizard.
 * This engine UPGRADES that contract: for each operation that ships
 * enough physics context (material + machine + tool + engagement), call
 * SpeedFeedOrchestratorEngine to compute a real physics-backed cycle
 * from MRR (material removal rate) or feed rate.
 *
 * Pure compositional + graceful fallback:
 *   1. Op has physics context → SpeedFeedOrchestratorEngine.compute() →
 *      cycle = volume_cm3 / mrr_cm3min OR path_mm / feed_rate_mmmin
 *   2. Op lacks context → pass through wizard-supplied cycle_min with
 *      a warning + source="wizard_passthrough"
 *
 * Output drops into the existing WizardToQuoteBridgeEngine contract
 * unchanged — enriched WizardOperation[] is fed back into wizard.operations.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-SPEED-FEED-TO-QUOTE (charlie /goal-20 iter12)
 */

import type { OrchestratorInput, OrchestratorResult } from "./SpeedFeedOrchestratorEngine.js";

/** Per-op physics context — caller-supplied when known; missing → wizard passthrough. */
export interface PhysicsContext {
  /** Cubic centimeters of material the op removes — primary cycle driver for vol-bound work. */
  volume_to_remove_cm3?: number;
  /** Path length in mm — used for path-bound work (finishing, contouring) when volume isn't meaningful. */
  path_length_mm?: number;
  /** Material name (free-text, fuzzy matched by SpeedFeedOrchestrator). */
  material?: string;
  /** Machine name (catalog key) — should match shop profile's machine_family for rate alignment. */
  machine_name?: string;
  /** Tool diameter mm. */
  tool_diameter_mm?: number;
  /** Tool flute count. */
  flutes?: number;
  /** Axial depth of cut mm. */
  axial_depth_mm?: number;
  /** Radial depth of cut mm. */
  radial_depth_mm?: number;
  /** Operation kind — drives orchestrator routing. */
  operation?: "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
  /** Cut classification — roughing pulls aggressive MRR, finishing slows for finish. */
  cut_type?: "roughing" | "semi_finishing" | "finishing";
}

export interface InputOperation {
  name: string;
  /** Operator-supplied cycle (used as fallback). */
  cycle_min: number;
  tool_ids?: string[];
  passes?: number;
  /** Optional physics context — when present, drives cycle re-computation. */
  physics?: PhysicsContext;
}

export interface EnrichedOperation {
  name: string;
  /** Final cycle_min after enrichment — physics-backed when context present, wizard-supplied otherwise. */
  cycle_min: number;
  tool_ids?: string[];
  passes?: number;
  /** Provenance — caller can audit which ops were physics-backed vs passed through. */
  source: "physics_mrr" | "physics_feed_rate" | "wizard_passthrough";
  /** Confidence inherited from the orchestrator result, or 0.50 for wizard passthrough. */
  confidence: number;
  /** When physics-backed, the cycle that was overridden (for diff visibility). */
  original_wizard_cycle_min?: number;
  /** Operator-meaningful note on the source decision. */
  note?: string;
}

export interface EnrichResult {
  ok: boolean;
  reason?: string;
  operations: EnrichedOperation[];
  /** Aggregate physics-backed count for quick op-level audit. */
  physics_backed_count: number;
  passthrough_count: number;
  /** Sum of cycle_min after enrichment — drops straight into WizardOutput.operations[].cycle_min. */
  total_cycle_min: number;
  warnings: string[];
}

export class SpeedFeedToQuoteBridgeEngine {
  /**
   * Enrich a wizard's operations[] with physics-backed cycle times.
   * Operations without enough physics context fall through with their
   * original cycle_min preserved + source="wizard_passthrough".
   */
  async enrich(operations: InputOperation[]): Promise<EnrichResult> {
    if (!Array.isArray(operations) || operations.length === 0) {
      return {
        ok: false, reason: "operations must be non-empty array",
        operations: [], physics_backed_count: 0, passthrough_count: 0,
        total_cycle_min: 0, warnings: [],
      };
    }

    const warnings: string[] = [];
    const enriched: EnrichedOperation[] = [];
    let physicsBacked = 0;
    let passthrough = 0;

    // Lazy-import the orchestrator only when at least one op has physics context.
    type OrchestratorHandle = {
      compute: (input: OrchestratorInput) => { value: OrchestratorResult; confidence: number; source: string };
    };
    let orchestrator: OrchestratorHandle | null = null;
    const needsOrchestrator = operations.some(op => op.physics && (op.physics.volume_to_remove_cm3 || op.physics.path_length_mm));

    if (needsOrchestrator) {
      try {
        const mod = await import("./SpeedFeedOrchestratorEngine.js");
        orchestrator = mod.speedFeedOrchestratorEngine as OrchestratorHandle;
      } catch (e) {
        warnings.push(`SpeedFeedOrchestratorEngine unavailable — all ops fall through (${e instanceof Error ? e.message : String(e)})`);
      }
    }

    for (const op of operations) {
      const wizardCycle = Math.max(0, Number(op.cycle_min) || 0);
      const ctx = op.physics;
      const hasVol = ctx?.volume_to_remove_cm3 !== undefined && Number.isFinite(ctx.volume_to_remove_cm3) && (ctx.volume_to_remove_cm3 as number) > 0;
      const hasPath = ctx?.path_length_mm !== undefined && Number.isFinite(ctx.path_length_mm) && (ctx.path_length_mm as number) > 0;

      // No physics context, or orchestrator unavailable → passthrough.
      if (!ctx || (!hasVol && !hasPath) || !orchestrator) {
        enriched.push({
          name: op.name, cycle_min: wizardCycle, tool_ids: op.tool_ids, passes: op.passes,
          source: "wizard_passthrough", confidence: 0.5,
          note: !ctx ? "no physics context supplied" : !orchestrator ? "orchestrator unavailable" : "physics context missing volume/path",
        });
        passthrough++;
        continue;
      }

      // Build orchestrator input from physics context.
      const oInput: OrchestratorInput = {
        material: ctx.material,
        machine_name: ctx.machine_name,
        tool_diameter_mm: ctx.tool_diameter_mm,
        flutes: ctx.flutes,
        axial_depth_mm: ctx.axial_depth_mm,
        radial_depth_mm: ctx.radial_depth_mm,
        operation: ctx.operation ?? "milling",
        cut_type: ctx.cut_type ?? "roughing",
        output_detail: "minimal",
      };

      let computed: { value: OrchestratorResult; confidence: number } | null = null;
      try {
        computed = orchestrator.compute(oInput);
      } catch (e) {
        warnings.push(`op "${op.name}" orchestrator.compute() threw — fell back to wizard cycle: ${e instanceof Error ? e.message : String(e)}`);
      }

      if (!computed || !computed.value) {
        enriched.push({
          name: op.name, cycle_min: wizardCycle, tool_ids: op.tool_ids, passes: op.passes,
          source: "wizard_passthrough", confidence: 0.5,
          note: "orchestrator returned no result",
        });
        passthrough++;
        continue;
      }

      const result = computed.value;
      const passes = Math.max(1, op.passes ?? 1);

      // Prefer volume-bound cycle when MRR is meaningful (roughing).
      // Fall back to path-bound cycle when finishing or MRR ≈ 0.
      let physicsCycle = 0;
      let source: EnrichedOperation["source"] = "physics_mrr";

      if (hasVol && Number.isFinite(result.mrr_cm3min) && result.mrr_cm3min > 0) {
        physicsCycle = ((ctx.volume_to_remove_cm3 as number) / result.mrr_cm3min) * passes;
        source = "physics_mrr";
      } else if (hasPath && Number.isFinite(result.feed_rate_mmmin) && result.feed_rate_mmmin > 0) {
        physicsCycle = ((ctx.path_length_mm as number) / result.feed_rate_mmmin) * passes;
        source = "physics_feed_rate";
      } else {
        enriched.push({
          name: op.name, cycle_min: wizardCycle, tool_ids: op.tool_ids, passes: op.passes,
          source: "wizard_passthrough", confidence: 0.5,
          note: "orchestrator returned non-positive mrr/feed_rate",
        });
        passthrough++;
        continue;
      }

      const physicsCycleRounded = round2(physicsCycle);
      enriched.push({
        name: op.name,
        cycle_min: physicsCycleRounded,
        tool_ids: op.tool_ids,
        passes: op.passes,
        source,
        confidence: Math.max(0, Math.min(1, result.overall_confidence ?? computed.confidence ?? 0.7)),
        original_wizard_cycle_min: wizardCycle > 0 ? wizardCycle : undefined,
        note: `MRR=${round2(result.mrr_cm3min)} cm³/min, feed=${round2(result.feed_rate_mmmin)} mm/min, passes=${passes}`,
      });
      physicsBacked++;
    }

    const totalCycle = round2(enriched.reduce((s, o) => s + o.cycle_min, 0));

    return {
      ok: true,
      operations: enriched,
      physics_backed_count: physicsBacked,
      passthrough_count: passthrough,
      total_cycle_min: totalCycle,
      warnings,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const speedFeedToQuoteBridgeEngine = new SpeedFeedToQuoteBridgeEngine();
export default speedFeedToQuoteBridgeEngine;
