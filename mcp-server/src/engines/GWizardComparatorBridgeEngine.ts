/**
 * GWizardComparatorBridgeEngine — compare PRISM SFC vs G-Wizard Calculator
 *
 * The missing third leg of the 3-way comparison stack. The HSMAdvisor side already
 * ships two engines (`hsmAdvisorAdapterEngine` reads the live Cut, `hsmAdvisorComparator-
 * BridgeEngine` diffs PRISM vs HSMAdvisor). The G-Wizard side only had a *reader*
 * (`gWizardAdapterEngine`, U-OSC9-12) — no comparator. This engine closes that gap.
 *
 * --- Why this is shaped differently from the HSMAdvisor comparator ---
 *
 * HSMAdvisor publishes a live `<Cut>` block: the operator's currently-selected tool AND
 * workpiece material AND HSMAdvisor's computed sfm/ipt/rpm/feed/mrr. So the HSMAdvisor
 * comparator can read a self-contained data point.
 *
 * G-Wizard's `toolcrib.csv` is a *tool library* — it stores each tool's geometry plus a
 * "proven" sfm/ipt (either G-Wizard-computed or manufacturer, flagged by useMfgSFM/IPT) —
 * but it does NOT record the workpiece material those numbers were derived for. So a
 * PRISM-vs-G-Wizard comparison REQUIRES the caller to supply the workpiece material. The
 * comparison contract is: "given this G-Wizard tool's geometry cutting <caller material>,
 * here is G-Wizard's stored recommendation vs PRISM's fresh computation."
 *
 * --- UNITS FIRST (root CLAUDE.md safety rail — a units mismatch is a 25.4× scale error) ---
 *
 * G-Wizard stores a per-tool `units` field ("inches" | "mm" | "unknown"). In an imperial
 * install the `sfm` column is surface ft/min, `ipt` is in/tooth, `diameter` is inches. In a
 * metric install the same columns carry m/min, mm/tooth, mm. We resolve the unit system
 * from the tool's `units` field, convert G-Wizard's recommendation to PRISM-canonical metric
 * (vc m/min, fz mm/tooth, dia mm), and surface a LOUD warning when units are "unknown"
 * (defaulting to inches — the dominant US install — but never silently).
 *
 * Pure composition (R8/R11): does NOT re-implement physics or G-Wizard CSV parsing.
 * Delegates to `gWizardAdapterEngine` (U-OSC9-12) + `speedFeedNineAxisOrchestratorEngine`
 * (U-OSC9-01). Mirrors the diff/agreement maths of `hsmAdvisorComparatorBridgeEngine`
 * so the tri-comparator can stack the two on equal footing.
 *
 * --- Comparison currency ---
 *
 * Diffs up to 4 axes in PRISM-canonical metric units:
 *   vc (m/min), fz (mm/tooth), rpm, feed (mm/min).
 *
 * rpm/feed are DERIVED from G-Wizard's sfm+ipt+geometry (G-Wizard's crib does not store
 * rpm/feed per tool).
 *
 * MRR is DELIBERATELY NOT a G-Wizard comparison axis. G-Wizard's tool crib stores no cut
 * depth (ap/ae), so it makes no MRR recommendation — and PRISM's `prism_optimized` mode
 * picks its OWN ap/ae, so any MRR diff would compare G-Wizard-at-caller-depths against
 * PRISM-at-PRISM-depths (apples-to-oranges) OR collapse to a feed-axis restatement at fixed
 * depths (redundant). The honest set is the 4 axes G-Wizard actually informs. (The HSMAdvisor
 * leg DOES carry MRR — its live <Cut> block emits it — so the tri-comparator surfaces MRR
 * only where the external system genuinely recommends it.) Caller-supplied ap/ae are still
 * forwarded to PRISM's toolpath so PRISM's vc/fz/feed reflect the operator's real cut.
 *
 * `agreement_score` ∈ [0,1]: geometric mean of per-axis `(1 - clamp01(|delta_pct|/0.5))`.
 *
 * @module engines/GWizardComparatorBridgeEngine
 * @milestone QUOTING-SYNERGY-MS0 / SFC-3WAY (slot:oscar, 2026-06-02)
 * @author oscar (slot:oscar)
 */

import { z } from "zod";
import {
  gWizardAdapterEngine,
  type GWizardState,
  type GWizardTool,
} from "./GWizardAdapterEngine.js";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
  type NineAxisResult,
  type OptimizationMode,
} from "./SpeedFeedNineAxisOrchestratorEngine.js";
import type { ISOGroup, ToolMaterial, Operation, CutType } from "./UltimateSpeedFeedEngine.js";

// Unit conversion constants (exact). Surface speed: 1 ft/min = 0.3048 m/min. 1 inch = 25.4 mm.
const FT_PER_MIN_TO_M_PER_MIN = 0.3048;
const INCH_TO_MM = 25.4;

// ============================================================================
// G-WIZARD STRING → PRISM-CANONICAL MAPPINGS
// ============================================================================

/**
 * G-Wizard `toolmaterial` / `tool` string → PRISM ToolMaterial.
 * G-Wizard writes free-text-ish material strings; we match case-insensitively on substrings.
 * Order matters: more-specific families (cobalt HSS, coated carbide) resolve before generic.
 */
const TOOL_MATERIAL_PATTERNS: Array<{ re: RegExp; material: ToolMaterial }> = [
  { re: /\bpcd\b|polycrystalline\s*diamond/i, material: "pcd" },
  { re: /\bcbn\b|cubic\s*boron/i, material: "cbn" },
  { re: /\bcermet\b/i, material: "cermet" },
  { re: /\bceramic\b|whisker|sialon/i, material: "ceramic" },
  { re: /carbide|tungsten|\bwc\b/i, material: "carbide" },
  { re: /\bhss\b|high\s*speed\s*steel|cobalt|\bm42\b|\bm35\b/i, material: "hss" },
];

/**
 * G-Wizard `tool` / `geometry` string → PRISM Operation.
 * Inferred when the caller does not override `operation`.
 */
const OPERATION_PATTERNS: Array<{ re: RegExp; op: Operation }> = [
  { re: /thread\s*mill/i, op: "thread_milling" },
  { re: /\btap\b|tapping/i, op: "tapping" },
  { re: /ream/i, op: "reaming" },
  { re: /\bbor(e|ing)\b/i, op: "boring" },
  { re: /drill/i, op: "drilling" },
  { re: /turn|lathe|\binsert\b|\bod\b|\bid\b/i, op: "turning" },
  { re: /end\s*mill|endmill|\bface\s*mill|slot|\bmill\b/i, op: "milling" },
];

// ============================================================================
// INPUT SCHEMA
// ============================================================================

/** Workpiece material — REQUIRED because G-Wizard's crib carries no workpiece material. */
const MaterialInputSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  name: z.string().optional(),
  hardness_hb: z.number().positive().optional(),
  hardness_hrc: z.number().positive().optional(),
}).refine((m) => m.iso_group !== undefined || (m.name !== undefined && m.name.length > 0), {
  message: "material requires at least one of { iso_group, name }",
});

/** How to pick the G-Wizard tool out of the crib. First matching predicate wins. */
const ToolSelectorSchema = z.object({
  guid: z.string().optional(),
  key: z.number().optional(),
  slot: z.number().optional(),
  description_contains: z.string().optional(),
}).optional();

export const GWizardCompareInputSchema = z.object({
  /** Override the toolcrib.csv path (tests / alternate install). */
  toolcrib_path: z.string().optional(),
  /** Skip the disk read and feed a pre-built crib state (fixture tests / offline replay). */
  state_override: z.unknown().optional(),
  /** Select which crib tool to compare. If omitted, the first crib tool is used (with a warning). */
  tool_selector: ToolSelectorSchema,
  /** Directly supply a G-Wizard tool instead of reading the crib (advanced / tests). */
  tool_override: z.unknown().optional(),
  /** REQUIRED — the workpiece material G-Wizard's numbers should be compared against. */
  material: MaterialInputSchema,
  /** Operation override; inferred from the tool string when omitted. */
  operation: z
    .enum(["milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling"])
    .optional(),
  /** Cut type; defaults to "roughing". */
  cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
  /** Axial depth ap (mm) — forwarded to PRISM's toolpath so vc/fz/feed reflect the real cut.
   *  (Does NOT add an MRR axis — G-Wizard makes no MRR recommendation; see module header.) */
  axial_depth_mm: z.number().positive().optional(),
  /** Radial depth ae (mm) — forwarded to PRISM's toolpath (see axial_depth_mm). */
  radial_depth_mm: z.number().positive().optional(),
  /** Optimization mode override; defaults to "prism_optimized". */
  optimization_mode: z.enum(["cost_batch", "aggressive_rush", "prism_optimized"]).optional(),
  /** Augment the G-Wizard tool-material-string → PRISM ToolMaterial map. */
  tool_material_overrides: z
    .record(z.string(), z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]))
    .optional(),
});

export type GWizardCompareInput = z.infer<typeof GWizardCompareInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface GWizardComparisonAxis {
  axis: "vc" | "fz" | "rpm" | "feed";
  unit: string;
  gwizard: number;
  prism: number;
  delta_abs: number;
  delta_pct: number;
  /** 1 - clamp01(|delta_pct|/0.5). 1.0 = identical, 0.0 = ≥50% off. */
  axis_agreement: number;
}

export interface GWizardCompareResult {
  /** The G-Wizard tool that was compared. */
  gwizard_tool: GWizardTool;
  /** G-Wizard's recommendation for that tool, normalized to PRISM-canonical metric. */
  gwizard_recommendation: {
    vc_mpm: number;
    fz_mm: number;
    rpm: number;
    feed_mmmin: number;
    /** Whether sfm/ipt came from manufacturer (useMfg*) or G-Wizard-computed. */
    source: "manufacturer" | "gwizard_computed" | "mixed";
    /** The unit system resolved for this tool. */
    units: "inches" | "mm" | "unknown";
  };
  /** PRISM NineAxisOrchestrator result for the same tool + caller material. */
  prism_result: NineAxisResult;
  /** Per-axis diff over vc/fz/rpm/feed (fz/feed omitted when G-Wizard lacks ipt/flutes). */
  axes: GWizardComparisonAxis[];
  /** Geometric mean of axis_agreement — overall agreement (0..1). */
  agreement_score: number;
  /** What we translated the G-Wizard tool to. */
  translation: {
    tool_material: ToolMaterial;
    tool_material_source: "pattern-match" | "caller-override" | "fallback-default";
    operation: Operation;
    operation_source: "pattern-match" | "caller-override" | "fallback-default";
    iso_group: ISOGroup;
  };
  warnings: string[];
}

/** Pre-orchestrator state from `prepare()` — the deterministic G-Wizard side, independently testable. */
export interface PreparedComparison {
  tool: GWizardTool;
  units: "inches" | "mm" | "unknown";
  translation: GWizardCompareResult["translation"];
  gwizard_recommendation: GWizardCompareResult["gwizard_recommendation"];
  orchestrator_input: NineAxisInput;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class GWizardComparatorBridgeEngine {
  /**
   * Everything up to (but NOT including) the PRISM orchestrator call: resolve the crib tool,
   * resolve its unit system, translate it to PRISM-canonical enums, normalize G-Wizard's
   * stored recommendation to metric, and assemble the NineAxisInput.
   *
   * Exposed publicly so the deterministic G-Wizard side (unit conversion + translation) can be
   * unit-tested directly without paying the cost of a full physics-orchestrator run, and so the
   * tri-comparator can reuse the same translation without re-running PRISM here.
   *
   * @param raw GWizardCompareInput
   * @returns PreparedComparison — tool, units, translation, gwizard_recommendation, the built
   *   orchestrator input, and accumulated warnings.
   * @throws Error when no crib tool can be resolved, the tool has no sfm, or no usable diameter.
   */
  prepare(raw: unknown): PreparedComparison {
    const input = GWizardCompareInputSchema.parse(raw);
    const warnings: string[] = [];

    // 1. Resolve the G-Wizard tool — direct override, or read+select from the crib.
    const tool = this.resolveTool(input, warnings);

    // 2. Resolve the unit system FIRST (units-mismatch = 25.4× error).
    const units = this.resolveUnits(tool, warnings);

    // 3. Translate the G-Wizard tool to PRISM-canonical enums.
    const translation = this.translate(tool, input, warnings);

    // 4. Normalize G-Wizard's stored recommendation to PRISM-canonical metric.
    const gwizard_recommendation = this.normalizeRecommendation(tool, units, input, warnings);

    // 5. Build the NineAxisInput from the same tool + caller material.
    const diameterMm = units === "mm" ? tool.diameter ?? 0 : (tool.diameter ?? 0) * INCH_TO_MM;
    if (!(diameterMm > 0)) {
      throw new Error(
        `G-Wizard tool "${tool.description || tool.guid}" has no usable diameter — cannot build PRISM input.`,
      );
    }
    const orchestrator_input: NineAxisInput = {
      material: {
        iso_group: translation.iso_group,
        name: input.material.name ?? `ISO-${translation.iso_group}`,
        hardness_hb: input.material.hardness_hb,
        hardness_hrc: input.material.hardness_hrc,
      },
      tooling: {
        tool_diameter_mm: diameterMm,
        flutes: tool.flutes && tool.flutes > 0 ? tool.flutes : undefined,
        tool_material: translation.tool_material,
        coating: tool.coating,
        helix_angle_deg: tool.helixAngle,
        corner_radius_mm:
          tool.noseRad !== undefined
            ? units === "mm"
              ? tool.noseRad
              : tool.noseRad * INCH_TO_MM
            : undefined,
        stickout_mm:
          tool.stickout !== undefined
            ? units === "mm"
              ? tool.stickout
              : tool.stickout * INCH_TO_MM
            : undefined,
      },
      toolpath: {
        operation: translation.operation,
        cut_type: (input.cut_type as CutType | undefined) ?? "roughing",
        axial_depth_mm: input.axial_depth_mm,
        radial_depth_mm: input.radial_depth_mm,
      },
      mode: (input.optimization_mode as OptimizationMode | undefined) ?? "prism_optimized",
    };

    return { tool, units, translation, gwizard_recommendation, orchestrator_input, warnings };
  }

  /**
   * Read the G-Wizard crib, pick a tool, translate it, run PRISM, diff field-by-field.
   *
   * @param raw GWizardCompareInput — material (required) + tool selector + depths + mode
   * @returns GWizardCompareResult — G-Wizard recommendation + PRISM result + per-axis deltas
   * @throws Error when no crib tool can be resolved, or the tool lacks the sfm needed to compare.
   */
  run(raw: unknown): GWizardCompareResult {
    const prepared = this.prepare(raw);
    const { tool, translation, gwizard_recommendation: gwRec, orchestrator_input, warnings } = prepared;

    // Run PRISM.
    let prismResult: NineAxisResult;
    try {
      prismResult = speedFeedNineAxisOrchestratorEngine.run(orchestrator_input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`PRISM NineAxisOrchestrator failed for G-Wizard-translated input: ${msg}`);
    }

    // Diff vc/fz/rpm/feed (fz/feed dropped when G-Wizard lacks ipt/flutes).
    const axes = this.diffAxes(gwRec, prismResult, warnings);
    const agreementScore = this.agreementGeoMean(axes);

    return {
      gwizard_tool: tool,
      gwizard_recommendation: gwRec,
      prism_result: prismResult,
      axes,
      agreement_score: agreementScore,
      translation,
      warnings,
    };
  }

  // -- Tool resolution -------------------------------------------------------

  private resolveTool(input: GWizardCompareInput, warnings: string[]): GWizardTool {
    if (input.tool_override !== undefined) {
      return input.tool_override as GWizardTool;
    }

    const state: GWizardState =
      input.state_override !== undefined
        ? (input.state_override as GWizardState)
        : gWizardAdapterEngine.read({ toolcrib_path: input.toolcrib_path });

    if (!state.tools || state.tools.length === 0) {
      throw new Error(
        "G-Wizard crib has no tools to compare. Populate the tool crib in G-Wizard, or pass tool_override.",
      );
    }

    const sel = input.tool_selector;
    if (sel) {
      const match = state.tools.find((t) => {
        if (sel.guid !== undefined && t.guid !== sel.guid) return false;
        if (sel.key !== undefined && t.key !== sel.key) return false;
        if (sel.slot !== undefined && t.slot !== sel.slot) return false;
        if (
          sel.description_contains !== undefined &&
          !t.description.toLowerCase().includes(sel.description_contains.toLowerCase())
        ) {
          return false;
        }
        // Require at least one predicate to have been provided for a "match".
        return sel.guid !== undefined || sel.key !== undefined || sel.slot !== undefined || sel.description_contains !== undefined;
      });
      if (!match) {
        throw new Error(
          `No G-Wizard crib tool matched selector ${JSON.stringify(sel)}. ` +
            `Crib has ${state.tools.length} tool(s).`,
        );
      }
      return match;
    }

    warnings.push(
      `No tool_selector supplied — compared the first crib tool ("${state.tools[0]!.description || state.tools[0]!.guid}"). ` +
        `Pass tool_selector to target a specific tool.`,
    );
    return state.tools[0]!;
  }

  // -- Units resolution (UNITS FIRST) ----------------------------------------

  private resolveUnits(tool: GWizardTool, warnings: string[]): "inches" | "mm" | "unknown" {
    if (tool.units === "inches" || tool.units === "mm") return tool.units;
    warnings.push(
      `G-Wizard tool "${tool.description || tool.guid}" has units="unknown" — assuming INCHES ` +
        `(dominant US install). If this tool is metric, the comparison is off by 25.4×; ` +
        `set the tool's units in G-Wizard or supply a metric crib.`,
    );
    return "unknown"; // treated as inches downstream, but kept distinct so callers see the assumption
  }

  // -- Translation -----------------------------------------------------------

  private translate(
    tool: GWizardTool,
    input: GWizardCompareInput,
    warnings: string[],
  ): GWizardCompareResult["translation"] {
    // ISO group from caller material.
    let isoGroup: ISOGroup;
    if (input.material.iso_group) {
      isoGroup = input.material.iso_group;
    } else {
      isoGroup = this.inferIsoFromName(input.material.name ?? "", warnings);
    }

    // Tool material — caller override map, then pattern match, then carbide fallback.
    const matStr = `${tool.toolmaterial ?? ""} ${tool.tool ?? ""}`.trim();
    let toolMaterial: ToolMaterial;
    let tmSource: "pattern-match" | "caller-override" | "fallback-default";
    const overrideKey = (tool.toolmaterial ?? "").trim();
    const callerOverride = overrideKey ? input.tool_material_overrides?.[overrideKey] : undefined;
    if (callerOverride) {
      toolMaterial = callerOverride as ToolMaterial;
      tmSource = "caller-override";
    } else {
      const matched = TOOL_MATERIAL_PATTERNS.find((p) => p.re.test(matStr));
      if (matched) {
        toolMaterial = matched.material;
        tmSource = "pattern-match";
      } else {
        toolMaterial = "carbide";
        tmSource = "fallback-default";
        warnings.push(
          `Could not infer tool material from G-Wizard "${matStr}" — defaulted to carbide. ` +
            `Pass tool_material_overrides to correct.`,
        );
      }
    }

    // Operation — caller override, then pattern match, then milling fallback.
    let operation: Operation;
    let opSource: "pattern-match" | "caller-override" | "fallback-default";
    if (input.operation) {
      operation = input.operation;
      opSource = "caller-override";
    } else {
      const opStr = `${tool.tool ?? ""} ${tool.geometry ?? ""} ${tool.description ?? ""}`;
      const matched = OPERATION_PATTERNS.find((p) => p.re.test(opStr));
      if (matched) {
        operation = matched.op;
        opSource = "pattern-match";
      } else {
        operation = "milling";
        opSource = "fallback-default";
        warnings.push(
          `Could not infer operation from G-Wizard tool "${opStr.trim()}" — defaulted to milling. ` +
            `Pass operation to correct.`,
        );
      }
    }

    return { tool_material: toolMaterial, tool_material_source: tmSource, operation, operation_source: opSource, iso_group: isoGroup };
  }

  /** Best-effort ISO group from a free-text material name. Steel (P) is the conservative default. */
  private inferIsoFromName(name: string, warnings: string[]): ISOGroup {
    const n = name.toLowerCase();
    if (/alum|6061|7075|2024|\bal\b/.test(n)) return "N";
    if (/titani|ti-?6al|inconel|hastelloy|nickel|superalloy|\bti\b/.test(n)) return "S";
    if (/stainless|\b3\d\d\b|\b1\d-\d\b|17-4|duplex/.test(n)) return "M";
    if (/cast\s*iron|gray\s*iron|ductile|\bgg\b|\bgcc?\b/.test(n)) return "K";
    if (/harden|hrc|\b4140\b.*\bhr|tool\s*steel.*hard|d2|a2|h13/.test(n)) return "H";
    if (/steel|\b10\d\d\b|\b41\d\d\b|\b86\d\d\b|alloy\s*steel|carbon/.test(n)) return "P";
    warnings.push(`Could not infer ISO group from material name "${name}" — defaulted to P (steel).`);
    return "P";
  }

  // -- G-Wizard recommendation normalization ---------------------------------

  /**
   * Convert G-Wizard's stored sfm/ipt + geometry into PRISM-canonical metric, deriving
   * rpm/feed (the crib does not store those per tool). MRR is intentionally not derived —
   * see the module header for why G-Wizard has no comparable MRR axis.
   */
  private normalizeRecommendation(
    tool: GWizardTool,
    units: "inches" | "mm" | "unknown",
    _input: GWizardCompareInput,
    warnings: string[],
  ): GWizardCompareResult["gwizard_recommendation"] {
    const metric = units === "mm";

    // Surface speed source — manufacturer override vs G-Wizard-computed.
    const sfmRaw = tool.useMfgSFM && tool.mfgSFM !== undefined ? tool.mfgSFM : tool.sfm;
    const iptRaw = tool.useMfgIPT && tool.mfgIPT !== undefined ? tool.mfgIPT : (tool.ipt ?? tool.chipload);

    if (sfmRaw === undefined || !(sfmRaw > 0)) {
      throw new Error(
        `G-Wizard tool "${tool.description || tool.guid}" has no surface speed (sfm) — nothing to compare.`,
      );
    }
    if (iptRaw === undefined || !(iptRaw > 0)) {
      warnings.push(
        `G-Wizard tool has no ipt/chipload — fz/feed/mrr axes will be skipped (only vc/rpm compared).`,
      );
    }

    // To PRISM-canonical metric.
    const vc_mpm = metric ? sfmRaw : sfmRaw * FT_PER_MIN_TO_M_PER_MIN;
    const fz_mm = iptRaw === undefined ? NaN : metric ? iptRaw : iptRaw * INCH_TO_MM;
    const diameterMm = (tool.diameter ?? 0) > 0 ? (metric ? tool.diameter! : tool.diameter! * INCH_TO_MM) : NaN;

    // rpm = vc[m/min]·1000 / (π·D[mm]).  feed = rpm · fz · flutes.
    const rpm = Number.isFinite(diameterMm) && diameterMm > 0 ? (vc_mpm * 1000) / (Math.PI * diameterMm) : NaN;
    const flutes = tool.flutes && tool.flutes > 0 ? tool.flutes : NaN;
    // Flute-count gap (P1a): without flutes, G-Wizard's feed cannot be derived, so the feed
    // axis is dropped. PRISM still computes its own feed (it defaults flutes internally), so
    // we must warn — otherwise the operator sees vc/fz/rpm agreement and never realizes feed
    // was silently not compared.
    if (Number.isFinite(fz_mm) && !Number.isFinite(flutes)) {
      warnings.push(
        "G-Wizard tool has no flute count — feed axis omitted; PRISM uses its own internal flute " +
          "default for its computation, so feed is NOT compared on this tool.",
      );
    }
    const feed_mmmin = Number.isFinite(rpm) && Number.isFinite(fz_mm) && Number.isFinite(flutes) ? rpm * fz_mm * flutes : NaN;

    const usedMfg = (tool.useMfgSFM && tool.mfgSFM !== undefined) || (tool.useMfgIPT && tool.mfgIPT !== undefined);
    const usedComputed = !tool.useMfgSFM || !tool.useMfgIPT;
    const source: "manufacturer" | "gwizard_computed" | "mixed" =
      usedMfg && usedComputed ? "mixed" : usedMfg ? "manufacturer" : "gwizard_computed";

    return {
      vc_mpm: round(vc_mpm, 2),
      fz_mm: Number.isFinite(fz_mm) ? round(fz_mm, 4) : NaN,
      rpm: Number.isFinite(rpm) ? Math.round(rpm) : NaN,
      feed_mmmin: Number.isFinite(feed_mmmin) ? Math.round(feed_mmmin) : NaN,
      source,
      units,
    };
  }

  // -- Axis diff -------------------------------------------------------------

  private diffAxes(
    gw: GWizardCompareResult["gwizard_recommendation"],
    prism: NineAxisResult,
    warnings: string[],
  ): GWizardComparisonAxis[] {
    const rec = prism.recommendation;
    const axes: GWizardComparisonAxis[] = [];

    axes.push(this.axis("vc", "m/min", gw.vc_mpm, rec.cutting_speed_mpm));
    axes.push(this.axis("rpm", "rpm", gw.rpm, rec.spindle_rpm));

    if (Number.isFinite(gw.fz_mm)) {
      axes.push(this.axis("fz", "mm/tooth", gw.fz_mm, rec.feed_per_tooth_mm));
      // feed only when G-Wizard could derive it (needs flutes); the missing-flute warning is
      // raised in normalizeRecommendation. The trailing filter drops a NaN feed cleanly.
      axes.push(this.axis("feed", "mm/min", gw.feed_mmmin, rec.feed_rate_mmmin));
    } else {
      warnings.push("G-Wizard fz unavailable — fz/feed axes omitted from the comparison.");
    }

    return axes.filter((a) => Number.isFinite(a.gwizard) && Number.isFinite(a.prism));
  }

  private axis(
    axisName: GWizardComparisonAxis["axis"],
    unit: string,
    gw: number,
    prism: number,
  ): GWizardComparisonAxis {
    const deltaAbs = prism - gw;
    const deltaPct = gw !== 0 && Number.isFinite(gw) ? deltaAbs / gw : NaN;
    const axisAgreement = Number.isFinite(deltaPct) ? Math.max(0, 1 - Math.min(1, Math.abs(deltaPct) / 0.5)) : NaN;
    return {
      axis: axisName,
      unit,
      gwizard: gw,
      prism,
      delta_abs: Number.isFinite(deltaAbs) ? round(deltaAbs, 4) : NaN,
      delta_pct: Number.isFinite(deltaPct) ? round(deltaPct, 4) : NaN,
      axis_agreement: Number.isFinite(axisAgreement) ? round(axisAgreement, 4) : NaN,
    };
  }

  // -- Agreement aggregation -------------------------------------------------

  private agreementGeoMean(axes: GWizardComparisonAxis[]): number {
    const finite = axes.filter((a) => Number.isFinite(a.axis_agreement));
    if (finite.length === 0) return 0;
    let logSum = 0;
    for (const a of finite) {
      const ag = Math.max(1e-6, a.axis_agreement);
      logSum += Math.log(ag);
    }
    return round(Math.exp(logSum / finite.length), 4);
  }
}

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const gWizardComparatorBridgeEngine = new GWizardComparatorBridgeEngine();
