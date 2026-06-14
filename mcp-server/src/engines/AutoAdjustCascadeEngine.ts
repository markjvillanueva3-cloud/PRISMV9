/**
 * AutoAdjustCascadeEngine — Parameter Dependency DAG for the Speed/Feed Orchestrator
 *
 * When the operator changes one OrchestratorInput field, this engine computes which
 * dependent parameters need re-tuning, applies the cascade, and returns a diff
 * showing the suggested adjustments. Pure function (no side effects, no I/O).
 *
 * Dependency DAG (forward edges = "changes propagate to"):
 *   material         → iso_group, hardness defaults (refresh material baseline)
 *   machine_type     → machine_max_rpm, spindle_taper compat, rigidity, axis_accel
 *   spindle_taper    → holder_type compatibility (HSK rejects Weldon, etc.)
 *   tool_diameter    → max RPM ceiling (Vc_max / πD), holder_gauge_length suggestion
 *   tool_stickout    → max DoC (deflection ceiling, δ ∝ L³), max feed (chatter)
 *   holder_type      → TIR envelope, stickout limit, balance grade
 *   operation        → cut_type, strategy defaults
 *   strategy         → fz multiplier (trochoidal scales fz down; HSM scales up)
 *   coolant_type     → Vc multiplier (cryogenic ×1.4, dry ×0.6), tool_life multiplier
 *   workholding      → max clamping force → max cutting force → max ap/ae
 *   optimize_for     → re-run flag (no field changes)
 *
 * Implements SFC-ACCURACY-MS1 Iter 4 (spec: state/shared/specs/SFC-ACCURACY-MS1-DESIGN.md §7).
 * Wires as prism_calc:sf_auto_adjust.
 *
 * References:
 *   - Timoshenko beam deflection δ = FL³/3EI (cantilever) → L³ scaling
 *   - Sandvik CoroKey coolant Vc multipliers (cryogenic, dry, flood)
 *   - Machinery's Handbook 30th ed. — workholding clamping force tables
 *   - ISO 7388/HSK-A63 spec — taper-holder compatibility constraints
 *   - SpeedFeedOrchestratorEngine OrchestratorInput (70+ field surface)
 *
 * @module engines/AutoAdjustCascadeEngine
 */

import { z } from "zod";
import type { OrchestratorInput } from "./SpeedFeedOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────────
// SCHEMA / TYPES
// ────────────────────────────────────────────────────────────────────────────

export const CascadeAdjustmentSeveritySchema = z.enum(["info", "warning", "critical"]);
export type CascadeAdjustmentSeverity = z.infer<typeof CascadeAdjustmentSeveritySchema>;

export const CascadeAdjustmentSourceSchema = z.enum([
  "material_baseline",
  "machine_type_envelope",
  "taper_holder_compat",
  "tool_diameter_rpm_ceiling",
  "stickout_deflection_ceiling",
  "holder_envelope",
  "operation_defaults",
  "strategy_fz_multiplier",
  "coolant_vc_multiplier",
  "workholding_force_capacity",
  "objective_reset",
]);
export type CascadeAdjustmentSource = z.infer<typeof CascadeAdjustmentSourceSchema>;

export interface CascadeAdjustment {
  field: keyof OrchestratorInput;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  severity: CascadeAdjustmentSeverity;
  source: CascadeAdjustmentSource;
}

export interface CascadeResult {
  oldInput: OrchestratorInput;
  newInput: OrchestratorInput;
  changedField: keyof OrchestratorInput;
  newValue: unknown;
  adjustments: CascadeAdjustment[];
  cascadeDepth: number;
  warnings: string[];
  /** Whether downstream orchestrator should be re-run with the new input */
  requiresRecompute: boolean;
}

export const CascadeInputSchema = z.object({
  oldInput: z.record(z.string(), z.unknown()),
  changedField: z.string().min(1),
  newValue: z.unknown(),
  /** Maximum recursion depth for transitive cascades. Default 2 (1st + 2nd order). */
  maxDepth: z.number().int().min(0).max(5).default(2).optional(),
  /** When true, only emit advisory adjustments (info/warning) — do not write to newInput. */
  dryRun: z.boolean().default(false).optional(),
});

export type CascadeInput = z.infer<typeof CascadeInputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY TABLES — sourced from referenced standards
// ────────────────────────────────────────────────────────────────────────────

/** ISO 7388/HSK-A63 — Weldon side-screw is incompatible with HSK form-fit interface. */
const TAPER_HOLDER_INCOMPATIBLE: Record<string, ReadonlySet<string>> = {
  "HSK-A63":  new Set(["Weldon"]),
  "HSK-A100": new Set(["Weldon"]),
  "HSK-E40":  new Set(["Weldon", "milling_chuck"]),  // E-series small — milling_chuck too heavy
};

/** Strategy fz multipliers — Sandvik CoroKey + literature (HSM, trochoidal). */
const STRATEGY_FZ_MULTIPLIER: Record<string, number> = {
  conventional: 1.0,
  adaptive:     1.2,
  trochoidal:   0.5,  // Radial engagement compensation — chip thinning
  hsm:          1.5,
  hpc:          1.5,
  plunge:       0.3,
  slot:         0.7,
};

/** Coolant Vc multipliers — Sandvik CoroKey + Iscar. Cryogenic Vc bonus from MIT 2.832. */
const COOLANT_VC_MULTIPLIER: Record<string, number> = {
  flood:        1.0,
  mist:         0.9,
  MQL:          0.85,
  dry:          0.6,
  cryogenic:    1.4,
  through_tool: 1.1,
};

/** Workholding typical clamping force capacity (kN) — Machinery's Handbook 30th. */
const WORKHOLDING_CLAMP_FORCE_KN: Record<string, number> = {
  vise:       5,
  fixture:    20,
  vacuum:     1,
  magnetic:   8,
  collet:     30,
  chuck:      50,
  tombstone:  30,
};

/** Machine archetype defaults — spec §2 row 1. */
const MACHINE_TYPE_DEFAULTS: Record<string, {
  rigidity: "low" | "medium" | "high";
  max_rpm: number;
  axis_accel_m_s2: number;
  typical_taper: string;
}> = {
  vertical_mill:   { rigidity: "medium", max_rpm: 12000, axis_accel_m_s2: 5,  typical_taper: "BT40"    },
  horizontal_mill: { rigidity: "high",   max_rpm:  8000, axis_accel_m_s2: 4,  typical_taper: "BT50"    },
  lathe:           { rigidity: "high",   max_rpm:  6000, axis_accel_m_s2: 6,  typical_taper: "BT40"    },
  "5axis":         { rigidity: "medium", max_rpm: 20000, axis_accel_m_s2: 8,  typical_taper: "HSK-A63" },
  router:          { rigidity: "low",    max_rpm: 24000, axis_accel_m_s2: 10, typical_taper: "ER_collet" },
  swiss:           { rigidity: "high",   max_rpm: 10000, axis_accel_m_s2: 5,  typical_taper: "ER_collet" },
};

/**
 * Maximum Vc envelope per ISO group (m/min) — Sandvik CoroKey reference upper bound for
 * carbide endmilling. Used to compute max RPM ceiling from tool diameter:
 *   n_max ≈ Vc_max / (π × D)
 */
const ISO_GROUP_VC_MAX_MPM: Record<string, number> = {
  P: 350,  // steel
  M: 250,  // stainless
  K: 1200, // cast iron
  N: 800,  // non-ferrous
  S: 80,   // superalloy
  H: 200,  // hardened
};

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

class AutoAdjustCascadeEngineImpl {
  /**
   * Compute the dependency cascade when one OrchestratorInput field changes.
   *
   * @param input Cascade input — oldInput, changedField, newValue, maxDepth, dryRun
   * @returns CascadeResult with adjustments list, newInput, recompute flag
   * @throws Error if changedField is empty
   */
  cascade(input: CascadeInput): CascadeResult {
    const parsed = CascadeInputSchema.parse(input);
    const oldInput = parsed.oldInput as OrchestratorInput;
    const changedField = parsed.changedField as keyof OrchestratorInput;
    const newValue = parsed.newValue;
    const maxDepth = parsed.maxDepth ?? 2;
    const dryRun = parsed.dryRun === true;

    // Apply the primary change first (depth 0)
    const newInput: OrchestratorInput = { ...oldInput, [changedField]: newValue };
    const adjustments: CascadeAdjustment[] = [];
    const warnings: string[] = [];
    let cascadeDepth = 0;

    if (maxDepth >= 1) {
      this.applyFirstOrderCascade(oldInput, newInput, changedField, adjustments, warnings, dryRun);
      cascadeDepth = 1;
    }

    if (maxDepth >= 2 && adjustments.length > 0) {
      // Second-order: any adjustment with severity≥warning may itself trigger downstream
      const firstOrderFields = adjustments.map(a => a.field);
      for (const f of firstOrderFields) {
        if (f === changedField) continue;  // don't re-process the primary
        this.applyFirstOrderCascade(
          { ...oldInput, [changedField]: newValue },
          newInput,
          f,
          adjustments,
          warnings,
          dryRun,
          /*secondOrder=*/ true,
        );
      }
      cascadeDepth = 2;
    }

    // optimize_for change is non-mutating — just sets recompute flag
    const requiresRecompute = changedField === "optimize_for" || adjustments.length > 0
                              || changedField === "material" || changedField === "machine_type";

    return {
      oldInput,
      newInput: dryRun ? oldInput : newInput,  // dry-run never mutates
      changedField,
      newValue,
      adjustments,
      cascadeDepth,
      warnings,
      requiresRecompute,
    };
  }

  /** Apply 1st-order edges for the given changedField. Mutates newInput + adjustments. */
  private applyFirstOrderCascade(
    oldInput: OrchestratorInput,
    newInput: OrchestratorInput,
    changedField: keyof OrchestratorInput,
    adjustments: CascadeAdjustment[],
    warnings: string[],
    dryRun: boolean,
    secondOrder = false,
  ): void {
    void dryRun;  // surfaced into handlers via mutation skip; tracked here for symmetry
    void secondOrder;  // future hook for recursion gating

    switch (changedField) {
      case "material":
        this.handleMaterialChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "machine_type":
        this.handleMachineTypeChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "spindle_taper":
        this.handleSpindleTaperChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "tool_diameter_mm":
        this.handleToolDiameterChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "tool_stickout_mm":
        this.handleStickoutChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "holder_type":
        this.handleHolderTypeChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "operation":
        this.handleOperationChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "strategy":
        this.handleStrategyChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "coolant_type":
        this.handleCoolantChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "workholding_type":
        this.handleWorkholdingChange(oldInput, newInput, adjustments, warnings, dryRun);
        break;
      case "optimize_for":
        // No field cascades — handled via requiresRecompute flag in caller
        if (!secondOrder) {
          warnings.push(`optimize_for changed to ${String(newInput.optimize_for)} — recommend re-running orchestrator`);
        }
        break;
      default:
        // Field has no registered downstream — silent
        break;
    }
  }

  // ── Edge handlers ─────────────────────────────────────────────────────────

  private handleMaterialChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], _dryRun: boolean,
  ): void {
    // A material change invalidates iso_group / hardness if user hadn't explicitly set them.
    // We can't lookup the new material's iso_group here without DB access (engine is pure);
    // surface an advisory adjustment requesting resolveMaterialContextFn re-run.
    if (oldI.iso_group !== undefined) {
      adj.push({
        field: "iso_group",
        oldValue: oldI.iso_group,
        newValue: oldI.iso_group,  // unchanged (kept as user override)
        reason: `Material changed to '${String(newI.material)}' — verify iso_group still applies (run sf_resolve_material for fresh classification)`,
        severity: "info",
        source: "material_baseline",
      });
    }
    if (oldI.hardness_hb !== undefined || oldI.hardness_hrc !== undefined) {
      adj.push({
        field: "hardness_hb",
        oldValue: oldI.hardness_hb ?? oldI.hardness_hrc,
        newValue: oldI.hardness_hb ?? oldI.hardness_hrc,
        reason: `Material baseline changed — confirm hardness matches new material condition`,
        severity: "info",
        source: "material_baseline",
      });
    }
    warn.push(`Material → '${String(newI.material)}': re-resolve material context recommended`);
  }

  private handleMachineTypeChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], _warn: string[], dryRun: boolean,
  ): void {
    const newType = newI.machine_type;
    if (!newType) return;
    const defaults = MACHINE_TYPE_DEFAULTS[newType];
    if (!defaults) return;

    // machine_max_rpm — only fill if missing OR violates new envelope
    if (oldI.machine_max_rpm === undefined) {
      if (!dryRun) newI.machine_max_rpm = defaults.max_rpm;
      adj.push({
        field: "machine_max_rpm",
        oldValue: undefined,
        newValue: defaults.max_rpm,
        reason: `Default for ${newType}`,
        severity: "info",
        source: "machine_type_envelope",
      });
    } else if (oldI.machine_max_rpm > defaults.max_rpm * 1.5) {
      adj.push({
        field: "machine_max_rpm",
        oldValue: oldI.machine_max_rpm,
        newValue: defaults.max_rpm,
        reason: `Current max_rpm ${oldI.machine_max_rpm} exceeds typical ${newType} ceiling ${defaults.max_rpm} by >50% — confirm spindle is upgraded`,
        severity: "warning",
        source: "machine_type_envelope",
      });
    }

    // machine_rigidity — fill if missing
    if (oldI.machine_rigidity === undefined) {
      if (!dryRun) newI.machine_rigidity = defaults.rigidity;
      adj.push({
        field: "machine_rigidity",
        oldValue: undefined,
        newValue: defaults.rigidity,
        reason: `Typical rigidity class for ${newType}`,
        severity: "info",
        source: "machine_type_envelope",
      });
    }

    // axis_accel — fill if missing
    if (oldI.machine_axis_accel_m_s2 === undefined) {
      if (!dryRun) newI.machine_axis_accel_m_s2 = defaults.axis_accel_m_s2;
      adj.push({
        field: "machine_axis_accel_m_s2",
        oldValue: undefined,
        newValue: defaults.axis_accel_m_s2,
        reason: `Typical accel for ${newType}`,
        severity: "info",
        source: "machine_type_envelope",
      });
    }

    // spindle_taper compat check
    if (oldI.spindle_taper && defaults.typical_taper && oldI.spindle_taper !== defaults.typical_taper) {
      adj.push({
        field: "spindle_taper",
        oldValue: oldI.spindle_taper,
        newValue: oldI.spindle_taper,
        reason: `Current taper ${oldI.spindle_taper} is atypical for ${newType} (typical: ${defaults.typical_taper}) — confirm machine config`,
        severity: "info",
        source: "machine_type_envelope",
      });
    }
  }

  private handleSpindleTaperChange(
    _oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], dryRun: boolean,
  ): void {
    const newTaper = newI.spindle_taper;
    const holder = newI.holder_type;
    if (!newTaper || !holder) return;

    const incompatSet = TAPER_HOLDER_INCOMPATIBLE[newTaper];
    if (incompatSet && incompatSet.has(holder)) {
      adj.push({
        field: "holder_type",
        oldValue: holder,
        newValue: null,
        reason: `${newTaper} is INCOMPATIBLE with ${holder} holder (form-fit/face-contact violated by side-screw or undersized)`,
        severity: "critical",
        source: "taper_holder_compat",
      });
      warn.push(`CRITICAL: ${newTaper} cannot use ${holder} holder — select shrink_fit or hydraulic`);
      if (!dryRun) newI.holder_type = undefined;
    }
  }

  private handleToolDiameterChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], _warn: string[], dryRun: boolean,
  ): void {
    const D = newI.tool_diameter_mm;
    if (!D || D <= 0) return;

    // Max RPM ceiling: n_max ≈ Vc_max / (π × D) (mm → m: ×1000)
    const isoGroup = newI.iso_group ?? "P";
    const vcMax = ISO_GROUP_VC_MAX_MPM[isoGroup] ?? 350;
    const nMaxFromVc = (vcMax * 1000) / (Math.PI * D);

    // If machine_max_rpm exceeds the Vc-derived ceiling, we surface an advisory.
    // (We do NOT lower machine_max_rpm — that's a machine spec, not a tool spec.
    //  The orchestrator will pick the min of the two during compute.)
    if (oldI.machine_max_rpm !== undefined && oldI.machine_max_rpm > nMaxFromVc * 1.2) {
      adj.push({
        field: "machine_max_rpm",
        oldValue: oldI.machine_max_rpm,
        newValue: oldI.machine_max_rpm,  // unchanged — advisory only
        reason: `Tool diameter ${D}mm in ${isoGroup} caps RPM at ~${Math.round(nMaxFromVc)} via Vc_max ${vcMax} m/min; spindle ceiling ${oldI.machine_max_rpm} will not be reached`,
        severity: "info",
        source: "tool_diameter_rpm_ceiling",
      });
    }

    // Suggest holder gauge length: typical 1.5×D for shrink-fit, 2×D for ER
    if (oldI.holder_gauge_length_mm === undefined) {
      const gauge = oldI.holder_type === "ER_collet" ? D * 2 : D * 1.5;
      if (!dryRun) newI.holder_gauge_length_mm = gauge;
      adj.push({
        field: "holder_gauge_length_mm",
        oldValue: undefined,
        newValue: gauge,
        reason: `Default gauge for ${D}mm tool in ${oldI.holder_type ?? "default"} holder`,
        severity: "info",
        source: "tool_diameter_rpm_ceiling",
      });
    }
  }

  private handleStickoutChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], dryRun: boolean,
  ): void {
    const newL = newI.tool_stickout_mm;
    const oldL = oldI.tool_stickout_mm;
    if (!newL || newL <= 0) return;

    // Timoshenko cantilever: δ ∝ L³. If stickout grows, max ap shrinks by (oldL/newL)³.
    // If stickout shrinks, no force adjustment needed (margin grows).
    if (oldL !== undefined && oldL > 0 && newL > oldL) {
      const ratio = oldL / newL;
      const cubicRatio = ratio * ratio * ratio;  // (L_old/L_new)³ ≤ 1

      if (oldI.axial_depth_mm !== undefined && oldI.axial_depth_mm > 0) {
        const newAp = oldI.axial_depth_mm * cubicRatio;
        if (!dryRun) newI.axial_depth_mm = Math.max(0.1, newAp);  // clamp lower bound
        adj.push({
          field: "axial_depth_mm",
          oldValue: oldI.axial_depth_mm,
          newValue: Math.max(0.1, newAp),
          reason: `Stickout grew ${oldL.toFixed(1)}→${newL.toFixed(1)}mm (deflection ∝ L³) — reducing ap by factor ${cubicRatio.toFixed(3)} to preserve deflection ceiling`,
          severity: "warning",
          source: "stickout_deflection_ceiling",
        });
      }
      warn.push(`Tool stickout increased ${oldL.toFixed(1)}→${newL.toFixed(1)}mm — chatter risk rises with L (Timoshenko δ∝L³)`);
    }

    // Compute L/D advisory
    const D = newI.tool_diameter_mm;
    if (D && D > 0) {
      const ld = newL / D;
      if (ld > 6) {
        adj.push({
          field: "tool_stickout_mm",
          oldValue: oldL,
          newValue: newL,
          reason: `L/D = ${ld.toFixed(1)} > 6 — high deflection regime, consider shorter tool or anti-vibration holder`,
          severity: ld > 8 ? "critical" : "warning",
          source: "stickout_deflection_ceiling",
        });
        warn.push(`L/D ${ld.toFixed(1)} exceeds safe envelope (>6 warning, >8 critical)`);
      }
    }
  }

  private handleHolderTypeChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], dryRun: boolean,
  ): void {
    const holder = newI.holder_type;
    if (!holder) return;

    // TIR envelope by holder type (typical max runout)
    const tirEnvelope: Record<string, number> = {
      shrink_fit:    0.003,
      hydraulic:     0.005,
      ER_collet:     0.010,
      Weldon:        0.020,
      milling_chuck: 0.015,
    };
    const tirMax = tirEnvelope[holder];
    if (tirMax !== undefined && oldI.holder_tir_mm === undefined) {
      if (!dryRun) newI.holder_tir_mm = tirMax;
      adj.push({
        field: "holder_tir_mm",
        oldValue: undefined,
        newValue: tirMax,
        reason: `Typical TIR envelope for ${holder} holder`,
        severity: "info",
        source: "holder_envelope",
      });
    }

    // Balance grade — shrink/hydraulic ≤ G2.5, others G6.3
    if (oldI.holder_balanced_g === undefined) {
      const balanceG = (holder === "shrink_fit" || holder === "hydraulic") ? 2.5 : 6.3;
      if (!dryRun) newI.holder_balanced_g = balanceG;
      adj.push({
        field: "holder_balanced_g",
        oldValue: undefined,
        newValue: balanceG,
        reason: `Typical balance grade for ${holder}`,
        severity: "info",
        source: "holder_envelope",
      });
    }

    // Taper compat re-check (the same taper-holder table)
    const taper = newI.spindle_taper;
    if (taper) {
      const incompatSet = TAPER_HOLDER_INCOMPATIBLE[taper];
      if (incompatSet && incompatSet.has(holder)) {
        adj.push({
          field: "holder_type",
          oldValue: holder,
          newValue: null,
          reason: `${holder} is INCOMPATIBLE with ${taper} taper`,
          severity: "critical",
          source: "taper_holder_compat",
        });
        warn.push(`CRITICAL: ${holder} cannot run in ${taper} taper`);
      }
    }
  }

  private handleOperationChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], _warn: string[], dryRun: boolean,
  ): void {
    const op = newI.operation;
    if (!op) return;

    // Suggest default cut_type if missing
    if (oldI.cut_type === undefined) {
      const defaultCut: Record<string, OrchestratorInput["cut_type"]> = {
        milling:       "semi_finishing",
        turning:       "semi_finishing",
        drilling:      "roughing",
        tapping:       "finishing",
        reaming:       "finishing",
        boring:        "semi_finishing",
        thread_milling: "finishing",
      };
      const cut = defaultCut[op];
      if (cut) {
        if (!dryRun) newI.cut_type = cut;
        adj.push({
          field: "cut_type",
          oldValue: undefined,
          newValue: cut,
          reason: `Default cut_type for ${op}`,
          severity: "info",
          source: "operation_defaults",
        });
      }
    }

    // Suggest default strategy if missing
    if (oldI.strategy === undefined) {
      const defaultStrategy: Record<string, OrchestratorInput["strategy"]> = {
        milling:       "adaptive",
        turning:       "conventional",
        drilling:      "conventional",
        tapping:       "conventional",
        reaming:       "conventional",
        boring:        "conventional",
        thread_milling: "conventional",
      };
      const strat = defaultStrategy[op];
      if (strat) {
        if (!dryRun) newI.strategy = strat;
        adj.push({
          field: "strategy",
          oldValue: undefined,
          newValue: strat,
          reason: `Default strategy for ${op}`,
          severity: "info",
          source: "operation_defaults",
        });
      }
    }
  }

  private handleStrategyChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], _warn: string[], dryRun: boolean,
  ): void {
    const strat = newI.strategy;
    if (!strat) return;

    const multiplier = STRATEGY_FZ_MULTIPLIER[strat];
    if (multiplier !== undefined && multiplier !== 1.0) {
      adj.push({
        field: "strategy",
        oldValue: oldI.strategy,
        newValue: strat,
        reason: `Strategy '${strat}' applies fz multiplier ×${multiplier.toFixed(2)} during orchestrator compute (chip thinning / engagement compensation)`,
        severity: "info",
        source: "strategy_fz_multiplier",
      });
    }

    // Trochoidal/HSM scale radial_depth_pct down — typical ae ≤ 0.1×D for trochoidal
    if ((strat === "trochoidal" || strat === "hsm") && oldI.radial_depth_pct === undefined) {
      const ae = strat === "trochoidal" ? 0.10 : 0.15;
      if (!dryRun) newI.radial_depth_pct = ae;
      adj.push({
        field: "radial_depth_pct",
        oldValue: undefined,
        newValue: ae,
        reason: `${strat} typical radial engagement (D × ${ae})`,
        severity: "info",
        source: "strategy_fz_multiplier",
      });
    }
  }

  private handleCoolantChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], _dryRun: boolean,
  ): void {
    const coolant = newI.coolant_type;
    if (!coolant) return;
    const multiplier = COOLANT_VC_MULTIPLIER[coolant];
    if (multiplier !== undefined && multiplier !== 1.0) {
      adj.push({
        field: "coolant_type",
        oldValue: oldI.coolant_type,
        newValue: coolant,
        reason: `Coolant '${coolant}' applies Vc multiplier ×${multiplier.toFixed(2)} (chip evacuation + thermal effect)`,
        severity: coolant === "dry" ? "warning" : "info",
        source: "coolant_vc_multiplier",
      });
      if (coolant === "dry") {
        warn.push(`Dry cutting reduces Vc by 40% and accelerates tool wear — confirm coating supports dry regime`);
      }
    }

    // Cryogenic + superalloy synergy
    if (coolant === "cryogenic" && newI.iso_group === "S") {
      adj.push({
        field: "coolant_type",
        oldValue: oldI.coolant_type,
        newValue: coolant,
        reason: `Cryogenic + superalloy (S-group) — 2-3× tool life improvement documented (MIT 2.832)`,
        severity: "info",
        source: "coolant_vc_multiplier",
      });
    }
  }

  private handleWorkholdingChange(
    oldI: OrchestratorInput, newI: OrchestratorInput,
    adj: CascadeAdjustment[], warn: string[], dryRun: boolean,
  ): void {
    const wh = newI.workholding_type;
    if (!wh) return;
    const typicalForce = WORKHOLDING_CLAMP_FORCE_KN[wh];
    if (typicalForce === undefined) return;

    if (oldI.clamping_force_kN === undefined) {
      if (!dryRun) newI.clamping_force_kN = typicalForce;
      adj.push({
        field: "clamping_force_kN",
        oldValue: undefined,
        newValue: typicalForce,
        reason: `Typical capacity for ${wh}`,
        severity: "info",
        source: "workholding_force_capacity",
      });
    } else if (oldI.clamping_force_kN > typicalForce * 2) {
      adj.push({
        field: "clamping_force_kN",
        oldValue: oldI.clamping_force_kN,
        newValue: oldI.clamping_force_kN,
        reason: `Stated clamping force ${oldI.clamping_force_kN}kN exceeds typical ${wh} capacity ${typicalForce}kN by >2× — confirm fixture spec`,
        severity: "warning",
        source: "workholding_force_capacity",
      });
    }

    // Low-force workholding warns against aggressive removal
    if (typicalForce <= 5 && (newI.axial_depth_mm ?? 0) > 5) {
      adj.push({
        field: "axial_depth_mm",
        oldValue: newI.axial_depth_mm,
        newValue: newI.axial_depth_mm,
        reason: `${wh} (~${typicalForce}kN clamp) may not hold part against ap=${newI.axial_depth_mm}mm cut — reduce DoC or upgrade fixture`,
        severity: "warning",
        source: "workholding_force_capacity",
      });
      warn.push(`Workholding force (${typicalForce}kN) may be insufficient for current axial DoC`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export const autoAdjustCascadeEngine = new AutoAdjustCascadeEngineImpl();
export type AutoAdjustCascadeEngine = typeof autoAdjustCascadeEngine;
export { AutoAdjustCascadeEngineImpl };
