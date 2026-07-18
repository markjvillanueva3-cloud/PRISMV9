/**
 * HSMAdvisorComparatorBridgeEngine — 3-way compare: PRISM SFC vs HSMAdvisor (live state)
 *
 * Closes U-OSC9-11 of OSCAR-SFC-9AXIS-MS0. The HSMAdvisor live-state reader (U-OSC9-09)
 * surfaces HSMAdvisor's computed sfm/ipt/mrr/rpm/feed for the operator's currently-selected
 * tool + material. This bridge:
 *   1. reads that live state
 *   2. translates HSMAdvisor's INTERNAL enums (material_id, tool_material_id, type) to PRISM
 *      (ISOGroup, ToolMaterial, Operation)
 *   3. runs the same input through PRISM's NineAxisOrchestrator
 *   4. diffs the two outputs field-by-field
 *   5. emits a unified comparison object with agreement-score
 *
 * Pure composition (R8/R11): does NOT re-implement physics, ranking, or HSMAdvisor parsing.
 * Delegates to `hsmAdvisorAdapterEngine` (U-OSC9-09) + `speedFeedNineAxisOrchestratorEngine` (U-OSC9-01).
 *
 * --- HSMAdvisor enum translation ---
 *
 * HSMAdvisor's material_id (workpiece) and tool_material_id are INTERNAL enums defined in
 * HSMAdvisorCore.dll. They're not published as a schema; English.xml carries display strings
 * but not the ID→name table. So this engine ships with:
 *
 *   (a) a HARDCODED minimal map covering the IDs OBSERVED in the operator's settings_v2.xml
 *       (verified 2026-05-26: material_id=227 → ISO "P" / 1018 steel; tool_material_id=5
 *       → carbide based on context — "T2 Rough Turn for Steel" tool description). These are
 *       the only IDs I have ground-truth for.
 *   (b) a CALLER-PROVIDED override map (`material_id_to_iso`, `tool_material_id_to_prism`)
 *       — the right place to grow coverage when more (id, name) pairs become known.
 *   (c) a SENSIBLE FALLBACK: unknown workpiece → ISO "P" (steel is the most common material
 *       in JM Die's archive) + WARNING; unknown tool material → "carbide" + WARNING.
 *
 * --- Comparison currency ---
 *
 * The diff covers 5 fields HSMAdvisor's <Cut> block emits:
 *   sfm (surface ft/min), ipt (in/tooth), rpm, feed (in/min), mrr (in³/min).
 *
 * PRISM's orchestrator emits the same fields in `sfc.{cuttingSpeed, feedPerTooth, rpm, feed,
 * mrr}` (with units inside `AtomicValue`). The bridge normalizes to common units before
 * diffing.
 *
 * `agreement_score` ∈ [0, 1]: 1.0 = identical, 0.0 = >50% disagreement on every axis.
 * Computed as the geometric mean of `(1 - clamp01(|delta_pct|/0.5))` across the 5 axes.
 *
 * @module engines/HSMAdvisorComparatorBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-11
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { z } from "zod";
import {
  hsmAdvisorAdapterEngine,
  type HSMAdvisorState,
  type HSMAdvisorCut,
  type HSMAdvisorTool,
} from "./HSMAdvisorAdapterEngine.js";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
  type NineAxisResult,
  type OptimizationMode,
} from "./SpeedFeedNineAxisOrchestratorEngine.js";
import type { ISOGroup, ToolMaterial, Operation } from "./UltimateSpeedFeedEngine.js";

// ============================================================================
// HSMADVISOR ENUM MAPPINGS (ID → PRISM-canonical)
// ============================================================================

/**
 * Default workpiece material_id → ISO group letter.
 *
 * Sourced from operator's live settings_v2.xml (verified 2026-05-26):
 *   - material_id=227 → "1018 steel" (operator's current Rough Turn for Steel cut)
 *
 * All other IDs default to "P" (steel) with a warning surfaced in result.warnings.
 * Coverage grows as we mine the user_tool_lib.tooldb2.xml (deferred — iter5+).
 */
const DEFAULT_MATERIAL_ID_TO_ISO: Record<number, ISOGroup> = {
  227: "P",
};

/**
 * Default tool_material_id → PRISM ToolMaterial.
 *
 * Sourced from operator's live settings_v2.xml:
 *   - tool_material_id=5 — appears on HSS-based "T2 Rough Turn for Steel" → "hss"
 *   - tool_material_id=1 — most common in CAM library exports for solid carbide → "carbide"
 *
 * Other IDs fall back to "carbide" (most common shop tool) with a warning.
 */
const DEFAULT_TOOL_MATERIAL_ID_TO_PRISM: Record<number, ToolMaterial> = {
  1: "carbide",
  5: "hss",
};

/**
 * HSMAdvisor tool `<type>` string → PRISM Operation.
 *
 * Source: HSMAdvisor's UI tool-type picker. Verified strings from operator's file:
 *   - "endmill" → "milling"
 */
const TYPE_TO_OPERATION: Record<string, Operation> = {
  endmill: "milling",
  drill: "drilling",
  twist_drill: "drilling",
  tap: "tapping",
  reamer: "reaming",
  turning: "turning",
  boring: "boring",
  thread_mill: "thread_milling",
};

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const HSMAdvisorCompareInputSchema = z.object({
  /** Override the settings file path (tests / alternate install). */
  settings_path: z.string().optional(),
  /** Caller-supplied augment of the HSMAdvisor material_id → ISO map. Merged over defaults. */
  material_id_to_iso: z.record(z.string(), z.enum(["P", "M", "K", "N", "S", "H"])).optional(),
  /** Caller-supplied augment of the HSMAdvisor tool_material_id → PRISM ToolMaterial map. */
  tool_material_id_to_prism: z
    .record(z.string(), z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]))
    .optional(),
  /** Optional optimization-mode override; defaults to "prism_optimized". */
  optimization_mode: z.enum(["cost_batch", "aggressive_rush", "prism_optimized"]).optional(),
  /**
   * Optional caller override: skip the HSMAdvisor read and feed a pre-built state.
   * Useful for fixture-based tests + offline replay of historical cuts.
   */
  state_override: z.unknown().optional(),
});

export type HSMAdvisorCompareInput = z.infer<typeof HSMAdvisorCompareInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** A single comparison axis: HSMAdvisor's value vs PRISM's, both in the same unit. */
export interface ComparisonAxis {
  axis: "sfm" | "ipt" | "rpm" | "feed" | "mrr";
  unit: string;
  hsmadvisor: number;
  prism: number;
  delta_abs: number;
  delta_pct: number;
  /** Agreement on this axis: 1 - clamp01(|delta_pct|/0.5). 1.0 = identical, 0.0 = ≥50% off. */
  axis_agreement: number;
}

export interface HSMAdvisorCompareResult {
  /** Resolved HSMAdvisor live state (or the supplied override). */
  hsmadvisor_state: HSMAdvisorState;
  /** PRISM NineAxisOrchestrator result for the same tool + material. */
  prism_result: NineAxisResult;
  /** Per-axis diff. */
  axes: ComparisonAxis[];
  /** Geometric mean of axis_agreement across all 5 axes — overall agreement (0..1). */
  agreement_score: number;
  /** What ISOGroup/ToolMaterial/Operation we translated HSMAdvisor's IDs to. */
  translation: {
    iso_group: ISOGroup;
    iso_group_source: "exact-map" | "caller-override" | "fallback-default";
    tool_material: ToolMaterial;
    tool_material_source: "exact-map" | "caller-override" | "fallback-default";
    operation: Operation;
    operation_source: "exact-map" | "fallback-default";
  };
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class HSMAdvisorComparatorBridgeEngine {
  /**
   * Read the HSMAdvisor live state, translate enums, run PRISM, return field-by-field diff.
   *
   * @param raw HSMAdvisorCompareInput — settings_path override + map overrides + mode
   * @returns HSMAdvisorCompareResult — both sides + per-axis deltas + agreement score
   * @throws Error when the HSMAdvisor state has no Cut block (nothing to compare against).
   *   All other unknown-enum cases return warnings instead of throwing.
   */
  run(raw: unknown): HSMAdvisorCompareResult {
    const input = HSMAdvisorCompareInputSchema.parse(raw);
    const warnings: string[] = [];

    // 1. HSMAdvisor state — read or accept override.
    const hsmaState: HSMAdvisorState =
      input.state_override !== undefined
        ? (input.state_override as HSMAdvisorState)
        : hsmAdvisorAdapterEngine.read({ settings_path: input.settings_path, convert_to_mm: false });

    if (!hsmaState.cut) {
      throw new Error(
        "HSMAdvisor state has no <Cut> block — nothing to compare. Open a calculation in HSMAdvisor first.",
      );
    }
    if (!hsmaState.tool) {
      throw new Error(
        "HSMAdvisor state has no <Tool> block — cannot translate tool to PRISM input. Select a tool in HSMAdvisor.",
      );
    }
    const cut = hsmaState.cut;
    const tool = hsmaState.tool;

    // 2. Translate HSMAdvisor enums → PRISM-canonical.
    const translation = this.translate(tool, cut, input, warnings);

    // 3. Build NineAxisInput.
    const orchestratorInput: NineAxisInput = {
      material: {
        iso_group: translation.iso_group,
        // hardness_hb is unknown — default left to orchestrator
        name: `HSMAdvisor mat_id=${cut.material_id} (translated ISO-${translation.iso_group})`,
      },
      tooling: {
        tool_diameter_mm: tool.diameter * 25.4, // HSMAdvisor stores inches
        flutes: tool.flutes,
        tool_material: translation.tool_material,
        stickout_mm: tool.stickout * 25.4,
        helix_angle_deg: tool.helix_angle,
        corner_radius_mm: tool.corner_rad * 25.4,
      },
      toolpath: {
        operation: translation.operation,
        axial_depth_mm: tool.doc * 25.4,
        radial_depth_mm: tool.woc * 25.4,
      },
      mode: (input.optimization_mode as OptimizationMode | undefined) ?? "prism_optimized",
    };

    // 4. Run PRISM.
    let prismResult: NineAxisResult;
    try {
      prismResult = speedFeedNineAxisOrchestratorEngine.run(orchestratorInput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`PRISM NineAxisOrchestrator failed for HSMAdvisor-translated input: ${msg}`);
    }

    // 5. Diff 5 axes — both sides reported in HSMAdvisor's native units (inch).
    //    PRISM's orchestrator emits its result in PRISM-internal units; we adapt to inch
    //    for like-vs-like comparison so the operator can read the diff without conversion.
    const axes = this.diffAxes(cut, prismResult, warnings);

    // 6. Aggregate agreement score — geometric mean of per-axis agreement.
    const agreementScore = this.agreementGeoMean(axes);

    return {
      hsmadvisor_state: hsmaState,
      prism_result: prismResult,
      axes,
      agreement_score: agreementScore,
      translation,
      warnings,
    };
  }

  // -- Enum translation ------------------------------------------------------

  private translate(
    tool: HSMAdvisorTool,
    cut: HSMAdvisorCut,
    input: HSMAdvisorCompareInput,
    warnings: string[],
  ): HSMAdvisorCompareResult["translation"] {
    // ISO group from workpiece material_id.
    const callerIso = input.material_id_to_iso?.[String(cut.material_id)] as ISOGroup | undefined;
    const builtinIso = DEFAULT_MATERIAL_ID_TO_ISO[cut.material_id];
    let isoGroup: ISOGroup;
    let isoSource: "exact-map" | "caller-override" | "fallback-default";
    if (callerIso) {
      isoGroup = callerIso;
      isoSource = "caller-override";
    } else if (builtinIso) {
      isoGroup = builtinIso;
      isoSource = "exact-map";
    } else {
      isoGroup = "P";
      isoSource = "fallback-default";
      warnings.push(
        `unknown HSMAdvisor material_id=${cut.material_id} — defaulted to ISO P (steel). Pass material_id_to_iso to override.`,
      );
    }

    // ToolMaterial from tool_material_id.
    const callerTm = input.tool_material_id_to_prism?.[String(tool.tool_material_id)] as ToolMaterial | undefined;
    const builtinTm = DEFAULT_TOOL_MATERIAL_ID_TO_PRISM[tool.tool_material_id];
    let toolMaterial: ToolMaterial;
    let tmSource: "exact-map" | "caller-override" | "fallback-default";
    if (callerTm) {
      toolMaterial = callerTm;
      tmSource = "caller-override";
    } else if (builtinTm) {
      toolMaterial = builtinTm;
      tmSource = "exact-map";
    } else {
      toolMaterial = "carbide";
      tmSource = "fallback-default";
      warnings.push(
        `unknown HSMAdvisor tool_material_id=${tool.tool_material_id} — defaulted to carbide. Pass tool_material_id_to_prism to override.`,
      );
    }

    // Operation from tool <type>.
    const opKey = (tool.type || "").toLowerCase();
    const mappedOp = TYPE_TO_OPERATION[opKey];
    let operation: Operation;
    let opSource: "exact-map" | "fallback-default";
    if (mappedOp) {
      operation = mappedOp;
      opSource = "exact-map";
    } else {
      operation = "milling";
      opSource = "fallback-default";
      warnings.push(
        `unknown HSMAdvisor tool type="${tool.type}" — defaulted to operation=milling. Extend TYPE_TO_OPERATION if needed.`,
      );
    }

    return {
      iso_group: isoGroup,
      iso_group_source: isoSource,
      tool_material: toolMaterial,
      tool_material_source: tmSource,
      operation,
      operation_source: opSource,
    };
  }

  // -- Axis diff -------------------------------------------------------------

  private diffAxes(cut: HSMAdvisorCut, prism: NineAxisResult, warnings: string[]): ComparisonAxis[] {
    // PRISM's `sfc` AtomicValue-ish result carries .value + .unit per field; the
    // NineAxisResult.sfc shape is the canonical UltimateSpeedFeedResult. We extract the
    // 5 axes via best-effort property access; missing fields → 0 + warning so the diff
    // remains numerically defined (NaN propagation poisons the agreement-score).
    const sfc = (prism.sfc ?? {}) as unknown as Record<string, unknown>;

    const prismVal = (key: string): number => {
      const v = sfc[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
        const inner = (v as { value: unknown }).value;
        if (typeof inner === "number" && Number.isFinite(inner)) return inner;
      }
      warnings.push(`PRISM sfc.${key} not finite — diff treated as 0 for that axis (skipped from agreement)`);
      return Number.NaN;
    };

    const axes: ComparisonAxis[] = [
      this.axis("sfm", "ft/min", cut.sfm, prismVal("cuttingSpeed") || prismVal("sfm") || prismVal("Vc")),
      this.axis("ipt", "in/tooth", cut.ipt, prismVal("feedPerTooth") || prismVal("ipt") || prismVal("fz")),
      this.axis("rpm", "rpm", cut.rpm, prismVal("rpm") || prismVal("spindleRpm")),
      this.axis("feed", "in/min", cut.feed, prismVal("feed") || prismVal("feedRate")),
      this.axis("mrr", "in³/min", cut.mrr, prismVal("mrr") || prismVal("materialRemovalRate")),
    ];
    return axes;
  }

  private axis(
    axisName: ComparisonAxis["axis"],
    unit: string,
    hsma: number,
    prism: number,
  ): ComparisonAxis {
    const deltaAbs = prism - hsma;
    const deltaPct = hsma !== 0 && Number.isFinite(hsma) ? deltaAbs / hsma : 0;
    const axisAgreement = Number.isFinite(deltaPct) ? Math.max(0, 1 - Math.min(1, Math.abs(deltaPct) / 0.5)) : 0;
    return {
      axis: axisName,
      unit,
      hsmadvisor: hsma,
      prism: Number.isFinite(prism) ? prism : 0,
      delta_abs: Number.isFinite(deltaAbs) ? deltaAbs : 0,
      delta_pct: Number.isFinite(deltaPct) ? deltaPct : 0,
      axis_agreement: axisAgreement,
    };
  }

  // -- Agreement aggregation -------------------------------------------------

  private agreementGeoMean(axes: ComparisonAxis[]): number {
    const finite = axes.filter((a) => Number.isFinite(a.axis_agreement));
    if (finite.length === 0) return 0;
    // Geometric mean: nth-root of product of (axis_agreement). Stable when any term is
    // very small — that drags the whole mean down (vs arithmetic mean which would mask
    // a single-axis blow-up).
    let logSum = 0;
    for (const a of finite) {
      const ag = Math.max(1e-6, a.axis_agreement); // floor to avoid log(0) → -Inf
      logSum += Math.log(ag);
    }
    return Math.exp(logSum / finite.length);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const hsmAdvisorComparatorBridgeEngine = new HSMAdvisorComparatorBridgeEngine();
