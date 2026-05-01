/**
 * ContextualStrategyOverrideEngine (E1111) — CAMX-MS12 U05
 *
 * Handles edge cases where standard strategy selection must be overridden by
 * physical constraints.  Ten hard-override rules cover the most common failure
 * modes in production machining.
 *
 * Rules (all mandatory unless noted):
 *   1. thin_wall          — wall_thickness < 2 mm → force ae < 3 %D, climb, spring passes
 *   2. deep_bore          — L/D > 10              → force peck / BTA, ban conventional drill
 *   3. fragile_material   — ISO H (>55 HRC) or ceramic/composite → low engagement, CBN/PCD
 *   4. prototype_batch    — qty ≤ 3               → conservative params (SF ×1.5), proven strategies
 *   5. hard_material      — HRC > 45              → HSM, ban conventional, min 4-flute
 *   6. soft_gummy         — ISO M (SS/Ti)         → chip breaker, higher feed, no rubbing
 *   7. micro_feature      — feature_dim < 1 mm    → micro strategies, high RPM, air blast only
 *   8. interrupted_cut    — keyway/cross-hole/bolt → feed −30 %, entry decel
 *   9. very_deep_pocket   — depth > 6 ×D          → z-level + rest machining sequence
 *  10. unsupported_overhang — tool L/D > 7        → ap < 0.5 D, vibration monitoring
 *
 * Methods:
 *   checkOverrides(feature, material, tool, strategy) → OverrideResult[]
 *   applyOverrides(params, overrides)                 → AdjustedParams
 *   listRules()                                       → OverrideRuleDescription[]
 *
 * @module engines/ContextualStrategyOverrideEngine
 * @shortcode E1111
 * @dispatcher camDispatcher
 * @actions strategy_override_check, strategy_override_apply, strategy_override_rules
 * @milestone CAMX-MS12/U05
 */

// ============================================================================
// TYPES
// ============================================================================

/** Describes a machining feature for override evaluation. */
export interface OverrideFeature {
  /** Wall thickness in mm (for thin_wall rule). */
  wall_thickness?: number;
  /** Bore / hole depth in mm (for deep_bore rule). */
  bore_depth?: number;
  /** Tool diameter in mm — used to compute L/D ratios. */
  tool_diameter?: number;
  /** Feature smallest dimension in mm (for micro_feature rule). */
  feature_dim?: number;
  /** Pocket depth in mm (for very_deep_pocket rule). */
  pocket_depth?: number;
  /** True when feature has keyways, cross-holes, or bolt patterns. */
  is_interrupted?: boolean;
  /** Feature type string, e.g. "keyway", "cross_hole", "bolt_pattern". */
  feature_type?: string;
}

/** Describes the workpiece material for override evaluation. */
export interface OverrideMaterial {
  /** ISO material group: P, M, K, N, S, H. */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness in HRC. */
  hrc?: number;
  /** Material sub-type, e.g. "ceramic", "composite", "stainless", "titanium". */
  subtype?: string;
}

/** Describes the cutting tool for override evaluation. */
export interface OverrideTool {
  /** Tool diameter in mm. */
  diameter?: number;
  /** Total tool length in mm (cutting + shank, or just reach). */
  length?: number;
  /** Number of flutes. */
  flutes?: number;
  /** Tool material, e.g. "carbide", "HSS", "CBN", "PCD", "ceramic". */
  material?: string;
}

/** Current strategy selection that may be overridden. */
export interface OverrideStrategy {
  /** Strategy name, e.g. "conventional_milling", "adaptive_clearing". */
  name?: string;
  /** Engagement angle in degrees (for fragile/hard checks). */
  engagement_angle?: number;
  /** Drilling method, e.g. "conventional_drill", "peck_drill", "BTA". */
  drilling_method?: string;
}

/** Single parameter adjustment within an override result. */
export interface OverrideAdjustment {
  /** Parameter name, e.g. "ae_pct_D", "feed_rate_mmpm". */
  param: string;
  /** Original value (may be undefined if not previously set). */
  original: number | string | boolean | undefined;
  /** Adjusted value. */
  adjusted: number | string | boolean;
  /** Human-readable description of the adjustment. */
  description: string;
}

/** Result for one override rule evaluation. */
export interface OverrideResult {
  /** Rule identifier (snake_case). */
  rule_name: string;
  /** True if this rule fired (condition met). */
  triggered: boolean;
  /** Explanation of why the rule did or did not trigger. */
  reason: string;
  /** List of parameter adjustments (empty when not triggered). */
  adjustments: OverrideAdjustment[];
  /** Severity of override. */
  severity: "mandatory" | "recommended";
  /** Short display label for the rule. */
  label: string;
}

/** Machining parameters that can be adjusted by overrides. */
export interface MachiningParams {
  /** Radial engagement as % of tool diameter (ae %D). */
  ae_pct_D?: number;
  /** Axial depth of cut in mm (ap). */
  ap_mm?: number;
  /** Feed rate in mm/min. */
  feed_rate_mmpm?: number;
  /** Spindle speed in RPM. */
  spindle_rpm?: number;
  /** Speed factor / SFM multiplier (safety factor ≥ 1.0). */
  speed_factor?: number;
  /** Strategy name. */
  strategy?: string;
  /** Drilling method. */
  drilling_method?: string;
  /** Coolant type. */
  coolant?: string;
  /** Minimum number of flutes. */
  min_flutes?: number;
  /** Engagement angle limit in degrees. */
  max_engagement_deg?: number;
  /** Whether spring passes are required. */
  spring_passes?: boolean;
  /** Whether climb milling is preferred. */
  prefer_climb?: boolean;
  /** Whether vibration monitoring is required. */
  vibration_monitoring?: boolean;
  /** Whether entry deceleration is required. */
  entry_decel?: boolean;
  /** Chip breaker required. */
  chip_breaker?: boolean;
  /** Required tool material upgrade. */
  tool_material_required?: string;
  /** Toolpath sequence descriptor. */
  sequence?: string;
  [key: string]: unknown;
}

/** Output from applyOverrides: adjusted parameter set with change log. */
export interface AdjustedParams {
  /** Final adjusted parameters. */
  params: MachiningParams;
  /** List of all adjustments that were applied. */
  applied_adjustments: OverrideAdjustment[];
  /** Names of rules that were triggered. */
  triggered_rules: string[];
  /** Count of mandatory overrides applied. */
  mandatory_count: number;
  /** Count of recommended overrides applied. */
  recommended_count: number;
  /** Human-readable summary. */
  summary: string;
}

/** Describes an override rule (for listRules). */
export interface OverrideRuleDescription {
  rule_name: string;
  label: string;
  condition: string;
  actions: string[];
  severity: "mandatory" | "recommended";
  rationale: string;
}

// ============================================================================
// RULE CATALOGUE
// ============================================================================

const RULE_CATALOGUE: OverrideRuleDescription[] = [
  {
    rule_name: "thin_wall",
    label: "Thin Wall",
    condition: "wall_thickness < 2 mm",
    actions: [
      "Force ae < 3 %D (low radial engagement)",
      "Prefer climb milling",
      "Add spring passes",
    ],
    severity: "mandatory",
    rationale:
      "Walls thinner than 2 mm deflect and chatter under normal radial loads. " +
      "Limiting ae to 3 %D minimises lateral force; climb milling reduces push-away; " +
      "spring passes recover elastic deflection on the final pass.",
  },
  {
    rule_name: "deep_bore",
    label: "Deep Bore (L/D > 10)",
    condition: "bore_depth / tool_diameter > 10",
    actions: [
      "Force peck drilling or BTA deep-hole drilling",
      "Ban conventional drilling",
    ],
    severity: "mandatory",
    rationale:
      "Beyond L/D 10 chip evacuation fails in conventional drilling, causing " +
      "heat spikes, galling, and drill breakage. Peck cycles clear chips; BTA " +
      "provides pressurised coolant through-tool for extreme depths.",
  },
  {
    rule_name: "fragile_material",
    label: "Fragile Material (ISO H / ceramic / composite)",
    condition: "iso_group === 'H' (HRC > 55) OR subtype in [ceramic, composite]",
    actions: [
      "Force low engagement (max_engagement_deg ≤ 5°)",
      "Require CBN or PCD tool material",
    ],
    severity: "mandatory",
    rationale:
      "Hardened steels above 55 HRC, ceramics, and CFRP composites fracture " +
      "under excessive cutting forces. Micro-engagement and super-hard tool " +
      "materials prevent edge chipping and workpiece cracking.",
  },
  {
    rule_name: "prototype_batch",
    label: "Prototype / Small Batch (qty ≤ 3)",
    condition: "quantity <= 3",
    actions: [
      "Apply conservative speed factor (SF × 1.5)",
      "Prefer proven, well-understood strategies",
    ],
    severity: "recommended",
    rationale:
      "With ≤ 3 parts there is no opportunity to recover from a scrapped " +
      "workpiece. Conservative parameters sacrifice cycle time to protect " +
      "against edge cases not captured during programming.",
  },
  {
    rule_name: "hard_material",
    label: "Hard Material (HRC > 45)",
    condition: "hrc > 45",
    actions: [
      "Force HSM (high-speed machining) strategies",
      "Ban conventional milling",
      "Require min 4 flutes",
    ],
    severity: "mandatory",
    rationale:
      "Materials above 45 HRC require the thermodynamic softening effect of " +
      "HSM to stay in the cutting sweet-spot. Conventional milling builds heat " +
      "catastrophically; fewer than 4 flutes lack the chip-thinning geometry " +
      "needed for hard-part cutting.",
  },
  {
    rule_name: "soft_gummy",
    label: "Soft / Gummy Material (ISO M — stainless / titanium)",
    condition: "iso_group === 'M'",
    actions: [
      "Require chip breaker geometry",
      "Increase feed rate by 20 % (reduce rubbing)",
      "Avoid rubbing / dwell",
    ],
    severity: "mandatory",
    rationale:
      "ISO M materials (austenitic stainless, titanium alloys) work-harden " +
      "rapidly. Chip breakers prevent stringy built-up chips; higher feeds " +
      "keep the tool cutting rather than rubbing against the work-hardened layer.",
  },
  {
    rule_name: "micro_feature",
    label: "Micro Feature (dim < 1 mm)",
    condition: "feature_dim < 1 mm",
    actions: [
      "Force micro-machining strategies",
      "Increase spindle RPM (size-corrected Vc)",
      "Use air blast coolant only",
    ],
    severity: "mandatory",
    rationale:
      "Features below 1 mm demand size-corrected surface speeds and chip " +
      "loads. Flood coolant creates hydraulic forces that deflect micro tools; " +
      "clean air blast provides chip evacuation without lateral loading.",
  },
  {
    rule_name: "interrupted_cut",
    label: "Interrupted Cut (keyway / cross-hole / bolt pattern)",
    condition: "is_interrupted === true OR feature_type in [keyway, cross_hole, bolt_pattern]",
    actions: [
      "Reduce feed rate by 30 % at interruption",
      "Add entry deceleration",
    ],
    severity: "mandatory",
    rationale:
      "Each interruption creates an impact load that can chip carbide inserts. " +
      "Reducing feed at the interrupt zone and adding a controlled entry " +
      "deceleration smooths the impact transient.",
  },
  {
    rule_name: "very_deep_pocket",
    label: "Very Deep Pocket (depth > 6×D)",
    condition: "pocket_depth / tool_diameter > 6",
    actions: [
      "Force Z-level (level-by-level) toolpath",
      "Include rest-machining pass",
    ],
    severity: "mandatory",
    rationale:
      "Pockets deeper than 6×D generate chip packing and coolant starvation at " +
      "full depth. Z-level machining keeps the cutting zone near the top of the " +
      "remaining stock; rest machining cleans corner material that full-diameter " +
      "tools cannot reach.",
  },
  {
    rule_name: "unsupported_overhang",
    label: "Unsupported Tool Overhang (L/D > 7)",
    condition: "tool length / tool diameter > 7",
    actions: [
      "Force ap < 0.5 × tool_diameter",
      "Require vibration monitoring",
    ],
    severity: "mandatory",
    rationale:
      "Tool assemblies with L/D > 7 have resonant frequencies that overlap " +
      "typical spindle speeds. Limiting axial depth to 0.5 D lowers cutting " +
      "forces below the threshold for self-excited chatter; vibration monitoring " +
      "provides a real-time safety net.",
  },
];

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function adj(
  param: string,
  original: number | string | boolean | undefined,
  adjusted: number | string | boolean,
  description: string,
): OverrideAdjustment {
  return { param, original, adjusted, description };
}

function noTrigger(rule_name: string, label: string, reason: string, severity: "mandatory" | "recommended"): OverrideResult {
  return { rule_name, triggered: false, reason, adjustments: [], severity, label };
}

function triggered(
  rule_name: string,
  label: string,
  reason: string,
  adjustments: OverrideAdjustment[],
  severity: "mandatory" | "recommended",
): OverrideResult {
  return { rule_name, triggered: true, reason, adjustments, severity, label };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ContextualStrategyOverrideEngine {

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Evaluate all 10 override rules for the given inputs.
   * Returns one OverrideResult per rule (triggered or not).
   */
  checkOverrides(
    feature: OverrideFeature,
    material: OverrideMaterial,
    tool: OverrideTool,
    strategy: OverrideStrategy,
    quantity?: number,
  ): OverrideResult[] {
    return [
      this._checkThinWall(feature, tool),
      this._checkDeepBore(feature, tool),
      this._checkFragileMaterial(material),
      this._checkPrototypeBatch(quantity),
      this._checkHardMaterial(material),
      this._checkSoftGummy(material),
      this._checkMicroFeature(feature, tool),
      this._checkInterruptedCut(feature),
      this._checkVeryDeepPocket(feature, tool),
      this._checkUnsupportedOverhang(tool),
    ];
  }

  /**
   * Apply a set of triggered OverrideResults to a base MachiningParams object.
   * Non-triggered overrides are skipped.
   * Returns the modified params plus a full change log.
   */
  applyOverrides(
    params: MachiningParams,
    overrides: OverrideResult[],
  ): AdjustedParams {
    const result: MachiningParams = { ...params };
    const allAdjustments: OverrideAdjustment[] = [];
    const triggeredRules: string[] = [];
    let mandatoryCount = 0;
    let recommendedCount = 0;

    for (const override of overrides) {
      if (!override.triggered) continue;
      triggeredRules.push(override.rule_name);
      if (override.severity === "mandatory") mandatoryCount++;
      else recommendedCount++;

      for (const a of override.adjustments) {
        (result as Record<string, unknown>)[a.param] = a.adjusted;
        allAdjustments.push(a);
      }
    }

    const summary = triggeredRules.length === 0
      ? "No overrides triggered — standard parameters apply."
      : `${mandatoryCount} mandatory + ${recommendedCount} recommended overrides applied: ` +
        triggeredRules.join(", ") + ".";

    return {
      params: result,
      applied_adjustments: allAdjustments,
      triggered_rules: triggeredRules,
      mandatory_count: mandatoryCount,
      recommended_count: recommendedCount,
      summary,
    };
  }

  /**
   * Return the canonical catalogue of all 10 override rules with full descriptions.
   */
  listRules(): OverrideRuleDescription[] {
    return RULE_CATALOGUE;
  }

  // --------------------------------------------------------------------------
  // RULE IMPLEMENTATIONS
  // --------------------------------------------------------------------------

  private _checkThinWall(feature: OverrideFeature, tool: OverrideTool): OverrideResult {
    const wt = feature.wall_thickness;
    const d  = tool.diameter ?? feature.tool_diameter ?? 12; // default 12 mm guard

    if (wt === undefined) {
      return noTrigger("thin_wall", "Thin Wall", "wall_thickness not provided — rule skipped.", "mandatory");
    }
    if (wt >= 2) {
      return noTrigger("thin_wall", "Thin Wall", `wall_thickness=${wt}mm ≥ 2mm — no thin-wall constraint.`, "mandatory");
    }

    const maxAe = +(d * 0.03).toFixed(4); // 3 %D
    return triggered("thin_wall", "Thin Wall",
      `wall_thickness=${wt}mm < 2mm — thin-wall override required.`,
      [
        adj("ae_pct_D",    undefined, 3,      `Force ae to 3 %D (${maxAe}mm at D=${d}mm) to limit lateral force.`),
        adj("prefer_climb", undefined, true,   "Prefer climb milling to reduce push-away deflection."),
        adj("spring_passes", undefined, true,  "Add spring passes to recover elastic deflection on final wall."),
      ],
      "mandatory",
    );
  }

  private _checkDeepBore(feature: OverrideFeature, tool: OverrideTool): OverrideResult {
    const depth = feature.bore_depth;
    const d     = tool.diameter ?? feature.tool_diameter;

    if (depth === undefined || d === undefined) {
      return noTrigger("deep_bore", "Deep Bore (L/D > 10)", "bore_depth or tool_diameter not provided — rule skipped.", "mandatory");
    }
    const ld = depth / d;
    if (ld <= 10) {
      return noTrigger("deep_bore", "Deep Bore (L/D > 10)", `bore L/D=${ld.toFixed(1)} ≤ 10 — conventional drill permitted.`, "mandatory");
    }
    return triggered("deep_bore", "Deep Bore (L/D > 10)",
      `bore L/D=${ld.toFixed(1)} > 10 — deep-bore override required.`,
      [
        adj("drilling_method", undefined, "peck_drill",
          `L/D=${ld.toFixed(1)} exceeds 10: force peck drilling (or BTA for L/D > 20) to ensure chip evacuation.`),
      ],
      "mandatory",
    );
  }

  private _checkFragileMaterial(material: OverrideMaterial): OverrideResult {
    const isIsoH   = material.iso_group === "H";
    const isHard   = (material.hrc ?? 0) > 55;
    const subtype  = (material.subtype ?? "").toLowerCase();
    const isFrag   = isIsoH || isHard || subtype.includes("ceramic") || subtype.includes("composite");

    if (!isFrag) {
      return noTrigger("fragile_material", "Fragile Material", "Material is not ISO H, ceramic, or composite — rule not triggered.", "mandatory");
    }

    const reason = isIsoH
      ? "ISO group H material detected"
      : isHard
        ? `HRC=${material.hrc} > 55`
        : `subtype="${material.subtype}" — ceramic/composite detected`;

    return triggered("fragile_material", "Fragile Material",
      `${reason} — fragile material override required.`,
      [
        adj("max_engagement_deg", undefined, 5,       "Limit engagement angle to ≤ 5° for fragile/hard materials."),
        adj("tool_material_required", undefined, "CBN_or_PCD",
          "Require CBN or PCD tool — carbide insufficient for ceramic/composite/H-group."),
      ],
      "mandatory",
    );
  }

  private _checkPrototypeBatch(quantity?: number): OverrideResult {
    if (quantity === undefined) {
      return noTrigger("prototype_batch", "Prototype / Small Batch", "quantity not provided — rule skipped.", "recommended");
    }
    if (quantity > 3) {
      return noTrigger("prototype_batch", "Prototype / Small Batch", `quantity=${quantity} > 3 — production batch, no conservative override needed.`, "recommended");
    }
    return triggered("prototype_batch", "Prototype / Small Batch",
      `quantity=${quantity} ≤ 3 — prototype/small-batch override applied.`,
      [
        adj("speed_factor", undefined, 1.5,
          "Apply SF×1.5 (conservative feeds/speeds) to protect irreplaceable prototype parts."),
        adj("strategy", undefined, "proven_conservative",
          "Prefer well-understood proven strategies over novel/aggressive toolpaths."),
      ],
      "recommended",
    );
  }

  private _checkHardMaterial(material: OverrideMaterial): OverrideResult {
    const hrc = material.hrc ?? 0;
    if (hrc <= 45) {
      return noTrigger("hard_material", "Hard Material", `HRC=${hrc} ≤ 45 — HSM override not required.`, "mandatory");
    }
    return triggered("hard_material", "Hard Material",
      `HRC=${hrc} > 45 — hard-material override required.`,
      [
        adj("strategy", undefined, "HSM",
          "Force HSM (High-Speed Machining) strategy — thermal softening required for HRC > 45."),
        adj("min_flutes", undefined, 4,
          "Minimum 4 flutes required for chip-thinning geometry in hard-part cutting."),
      ],
      "mandatory",
    );
  }

  private _checkSoftGummy(material: OverrideMaterial): OverrideResult {
    const isIsoM  = material.iso_group === "M";
    const subtype = (material.subtype ?? "").toLowerCase();
    const isGummy = isIsoM || subtype.includes("stainless") || subtype.includes("titanium");

    if (!isGummy) {
      return noTrigger("soft_gummy", "Soft / Gummy Material", "Material is not ISO M / stainless / titanium — rule not triggered.", "mandatory");
    }
    return triggered("soft_gummy", "Soft / Gummy Material",
      "ISO M / stainless / titanium material detected — gummy material override applied.",
      [
        adj("chip_breaker", undefined, true,
          "Chip breaker geometry required — ISO M forms stringy work-hardened chips without it."),
        adj("feed_rate_pct_increase", undefined, 20,
          "Increase programmed feed by 20 % to prevent rubbing on the work-hardened layer."),
      ],
      "mandatory",
    );
  }

  private _checkMicroFeature(feature: OverrideFeature, tool: OverrideTool): OverrideResult {
    const dim = feature.feature_dim ?? tool.diameter;
    if (dim === undefined) {
      return noTrigger("micro_feature", "Micro Feature", "feature_dim not provided — rule skipped.", "mandatory");
    }
    if (dim >= 1) {
      return noTrigger("micro_feature", "Micro Feature", `feature_dim=${dim}mm ≥ 1mm — standard machining applies.`, "mandatory");
    }

    // Size-corrected RPM: Vc ~20 m/min typical micro; N = 1000*Vc / (π*D)
    const Vc_micro = 20; // m/min — conservative safe start for micro
    const rpm_suggested = Math.round((1000 * Vc_micro) / (Math.PI * dim));

    return triggered("micro_feature", "Micro Feature",
      `feature_dim=${dim}mm < 1mm — micro-feature override required.`,
      [
        adj("strategy", undefined, "micro_machining",
          "Force micro-machining strategy (size-corrected chip load, minimal runout tolerance)."),
        adj("spindle_rpm", undefined, rpm_suggested,
          `Size-corrected RPM for Vc=${Vc_micro}m/min at D=${dim}mm.`),
        adj("coolant", undefined, "air_blast",
          "Air blast only — flood coolant causes hydraulic deflection on micro tools."),
      ],
      "mandatory",
    );
  }

  private _checkInterruptedCut(feature: OverrideFeature): OverrideResult {
    const INTERRUPTED_TYPES = ["keyway", "cross_hole", "bolt_pattern", "interrupted"];
    const ft      = (feature.feature_type ?? "").toLowerCase();
    const isInt   = feature.is_interrupted === true || INTERRUPTED_TYPES.some(t => ft.includes(t));

    if (!isInt) {
      return noTrigger("interrupted_cut", "Interrupted Cut", "Feature is not flagged as interrupted — rule not triggered.", "mandatory");
    }
    return triggered("interrupted_cut", "Interrupted Cut",
      `Interrupted cut detected (feature_type="${feature.feature_type}", is_interrupted=${feature.is_interrupted}) — impact mitigation applied.`,
      [
        adj("feed_rate_pct_reduction", undefined, 30,
          "Reduce feed by 30 % at interruption zone to dampen impact transient on carbide edge."),
        adj("entry_decel", undefined, true,
          "Enable entry deceleration — controlled approach smooths the tool-into-workpiece impact."),
      ],
      "mandatory",
    );
  }

  private _checkVeryDeepPocket(feature: OverrideFeature, tool: OverrideTool): OverrideResult {
    const depth = feature.pocket_depth;
    const d     = tool.diameter ?? feature.tool_diameter;

    if (depth === undefined || d === undefined) {
      return noTrigger("very_deep_pocket", "Very Deep Pocket", "pocket_depth or tool_diameter not provided — rule skipped.", "mandatory");
    }
    const ratio = depth / d;
    if (ratio <= 6) {
      return noTrigger("very_deep_pocket", "Very Deep Pocket", `pocket depth/D=${ratio.toFixed(1)} ≤ 6 — standard pocket strategy applies.`, "mandatory");
    }
    return triggered("very_deep_pocket", "Very Deep Pocket",
      `pocket depth/D=${ratio.toFixed(1)} > 6 — deep pocket override required.`,
      [
        adj("strategy", undefined, "z_level",
          `Force Z-level (level-by-level) strategy for depth/D=${ratio.toFixed(1)} to prevent chip packing.`),
        adj("sequence", undefined, "z_level_then_rest_machining",
          "Include rest-machining pass after Z-level to clear corner material inaccessible to full-diameter tool."),
      ],
      "mandatory",
    );
  }

  private _checkUnsupportedOverhang(tool: OverrideTool): OverrideResult {
    const len = tool.length;
    const d   = tool.diameter;

    if (len === undefined || d === undefined) {
      return noTrigger("unsupported_overhang", "Unsupported Tool Overhang", "tool.length or tool.diameter not provided — rule skipped.", "mandatory");
    }
    const ld = len / d;
    if (ld <= 7) {
      return noTrigger("unsupported_overhang", "Unsupported Tool Overhang", `tool L/D=${ld.toFixed(1)} ≤ 7 — standard ap applies.`, "mandatory");
    }

    const maxAp = +(d * 0.5).toFixed(4);
    return triggered("unsupported_overhang", "Unsupported Tool Overhang",
      `tool L/D=${ld.toFixed(1)} > 7 — overhang override required.`,
      [
        adj("ap_mm", undefined, maxAp,
          `Force ap ≤ 0.5 D (${maxAp}mm) — limits cutting force below chatter threshold for L/D=${ld.toFixed(1)}.`),
        adj("vibration_monitoring", undefined, true,
          "Require vibration monitoring — high L/D tools have low resonant frequencies overlapping spindle speeds."),
      ],
      "mandatory",
    );
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const contextualStrategyOverrideEngine = new ContextualStrategyOverrideEngine();
