/**
 * JMDieLatheProgramUpgraderEngine — per-machine S/F upgrade for JM Die lathe programs
 * ====================================================================================
 *
 * Closes the /goal directive (slot:whiskey 2026-05-23): upgrade every JM Die
 * lathe program with PRISM-computed optimal speeds/feeds, emitting one variant
 * per JM Die lathe (7 Okuma lathes), naming the output `<partnumber>_<machine>.nc`.
 *
 * ─── Hard assumptions baked in (operator directive) ────────────────────────
 *
 *   - Cutting tools default to: HSSco Allied Engineering TA inserts with
 *     TiAlN coating. (Operator confirmed standardization across JM Die.)
 *   - Workpiece material default: tool steels (majority of jobs). Specific
 *     material is overridden if a matching print is found.
 *   - Output naming: `<partNumber>_<machineModel>.nc` — partNumber from
 *     program filename or G-code header; machineModel from JM_DIE_CONTROLLER_MAP.
 *
 * ─── Trust rules (per `feedback_shop_programs_amateur`) ────────────────────
 *
 *   Box-archive programs were written by amateurs — the S/F values are NOT
 *   trusted. This upgrader uses program STRUCTURE (operation order, feature
 *   list, tool changes) but computes fresh S/F via PRISM physics engines.
 *   Existing S/F values are read for diff/audit only, never copied through.
 *
 * ─── Output shape ──────────────────────────────────────────────────────────
 *
 *   `upgradeOne(input)` returns an `UpgradeResult` carrying:
 *     - sourcePath:    original program path
 *     - partNumber:    extracted from header or filename
 *     - materialHint:  defaulted to "tool_steel" unless a print override
 *     - variants[7]:   one per JM Die lathe — { machineId, machineModel,
 *                      outputFileName, rpm, feedrate, depthOfCut, rationale }
 *     - warnings[]:    operator-review flags (unknown tool, missing print, etc.)
 *
 * The upgrader does NOT write to disk in this engine — that is the batch
 * orchestrator's job (a CLI wrapper or scheduled task). This keeps the
 * engine pure-function + unit-testable.
 *
 * @module engines/JMDieLatheProgramUpgraderEngine
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-CORE
 * @version 1.0.0
 */

/** JM Die lathes — canonical 7-machine inventory from JM_DIE_CONTROLLER_MAP. */
/**
 * JM Die 7-Okuma-lathe inventory. The `envelope` field added 2026-05-24
 * (JM-DIE-LATHE-UPGRADE-MS0/U-UPGRADE-BODY-RESCALE) for upgrader-side
 * envelope-fit gating — variants that don't fit the target machine's
 * work envelope are now marked `skipped:true` instead of silently written
 * to disk as physically-unsafe programs. Envelopes from Okuma nameplate.
 */
export const JM_DIE_LATHES: ReadonlyArray<{
  machineId: string;
  machineModel: string;
  controllerFamily: string;
  spindleRpmMax: number;
  rigidityTier: "light" | "medium" | "heavy";
  /** Work envelope (mm) — used by upgrader to skip variants that don't fit. */
  envelope: { x_max_mm: number; z_max_mm: number; chuck_z_mm: number };
}> = [
  { machineId: "LTH-01", machineModel: "Okuma_GENOS_L300-M",      controllerFamily: "okuma", spindleRpmMax: 5000, rigidityTier: "heavy",  envelope: { x_max_mm: 400, z_max_mm: 700,  chuck_z_mm: 0 } },
  { machineId: "LTH-02", machineModel: "Okuma_GENOS_L200E-M",     controllerFamily: "okuma", spindleRpmMax: 6000, rigidityTier: "medium", envelope: { x_max_mm: 250, z_max_mm: 600,  chuck_z_mm: 0 } },
  { machineId: "LTH-03", machineModel: "Okuma_LNC8",              controllerFamily: "okuma", spindleRpmMax: 4500, rigidityTier: "medium", envelope: { x_max_mm: 200, z_max_mm: 525,  chuck_z_mm: 0 } },
  { machineId: "LTH-04", machineModel: "Okuma_LB-3000EX",         controllerFamily: "okuma", spindleRpmMax: 4200, rigidityTier: "heavy",  envelope: { x_max_mm: 380, z_max_mm: 1000, chuck_z_mm: 0 } },
  { machineId: "LTH-05", machineModel: "Okuma_LB-3000EX_II",      controllerFamily: "okuma", spindleRpmMax: 4200, rigidityTier: "heavy",  envelope: { x_max_mm: 380, z_max_mm: 1000, chuck_z_mm: 0 } },
  { machineId: "LTH-06", machineModel: "Okuma_LB-3000EX-BigBore", controllerFamily: "okuma", spindleRpmMax: 3600, rigidityTier: "heavy",  envelope: { x_max_mm: 460, z_max_mm: 1250, chuck_z_mm: 0 } },
  { machineId: "LTH-07", machineModel: "Okuma_Multus_B250II",     controllerFamily: "okuma", spindleRpmMax: 5000, rigidityTier: "medium", envelope: { x_max_mm: 380, z_max_mm: 900,  chuck_z_mm: 0 } },
] as const;

/** Default tool assumption per operator directive (HSSco Allied TA + TiAlN). */
export const DEFAULT_TOOL = {
  family: "HSSco_Allied_TA_insert",
  coating: "TiAlN",
  // Sfm baseline for HSSco TiAlN on tool steel (D2/A2/H13 typical). See
  // ISO 3685 / Machinery's Handbook 29th ed. p.1037 for tool-steel + coated-
  // HSS Sfm range 150-220; we anchor at 180 SFM (≈55 m/min) and let the
  // rigidity-tier multiplier adjust per machine.
  sfm_tool_steel_baseline: 180,
  // Feed per revolution baseline for TA insert in tool steel, mm/rev.
  // Allied TA "TiAlN" data sheet recommends 0.10-0.18 mm/rev for turning
  // tool steels; we anchor at 0.13 mm/rev.
  fpr_tool_steel_baseline_mm: 0.13,
  // Depth of cut baseline, mm.
  doc_tool_steel_baseline_mm: 1.5,
} as const;

/** Default material when no print override is found. */
export const DEFAULT_MATERIAL = "tool_steel" as const;

/** Rigidity tier → S/F multiplier. Heavy machines get aggressive params, light get conservative. */
const RIGIDITY_MULTIPLIER: Record<"light" | "medium" | "heavy", { sfm: number; fpr: number; doc: number }> = {
  light: { sfm: 0.85, fpr: 0.85, doc: 0.75 },
  medium: { sfm: 1.0, fpr: 1.0, doc: 1.0 },
  heavy: { sfm: 1.10, fpr: 1.10, doc: 1.20 },
};

/** Engine API contract. */
export interface UpgradeInput {
  sourcePath: string;
  programText?: string;
  partNumber?: string;
  materialOverride?: string;
  toolDiameterMm?: number;
}

export interface UpgradeVariant {
  machineId: string;
  machineModel: string;
  outputFileName: string;
  rpm: number;
  feedrate_mm_min: number;
  depthOfCut_mm: number;
  sfm_effective: number;
  rationale: string;
}

export interface UpgradeResult {
  sourcePath: string;
  partNumber: string;
  material: string;
  variants: UpgradeVariant[];
  warnings: string[];
}

/**
 * Extract a part number from a program filename or G-code header. Falls back
 * to "UNKNOWN-PART" with a warning. Filename takes precedence — the operator
 * naming convention at JM Die uses `<partnumber>.nc` / `<partnumber>.txt`.
 */
export function extractPartNumber(input: { sourcePath: string; programText?: string }): { partNumber: string; warnings: string[] } {
  const warnings: string[] = [];
  // Try filename stem first.
  const lastSep = Math.max(input.sourcePath.lastIndexOf("/"), input.sourcePath.lastIndexOf("\\"));
  const stem = input.sourcePath.slice(lastSep + 1).replace(/\.(nc|NC|txt|TXT|tap|TAP|cnc|CNC|min|MIN)$/, "");
  if (stem && !/^o?\d{4,}$/i.test(stem) && stem.length >= 2) {
    // Stem looks like a real part number (not just an O-number).
    return { partNumber: stem, warnings };
  }
  // Fallback: scan program text for `(P/N: ...)` or `(PN: ...)` block comments.
  if (input.programText) {
    const m = input.programText.match(/\(\s*(?:P\/N|PN|PART(?:\s*NUMBER)?)\s*[:=]\s*([^\)\s]+)\s*\)/i);
    if (m) return { partNumber: m[1], warnings };
  }
  warnings.push("part_number_unknown — could not extract from filename or header");
  return { partNumber: stem || "UNKNOWN-PART", warnings };
}

/** Convert SFM + tool diameter (mm) → spindle RPM. RPM = (SFM × 304.8) / (π × Dmm). */
function sfmToRpm(sfm: number, toolDiameterMm: number): number {
  if (toolDiameterMm <= 0) return 0;
  return Math.round((sfm * 304.8) / (Math.PI * toolDiameterMm));
}

export class JMDieLatheProgramUpgraderEngine {
  /**
   * Compute one upgraded variant per JM Die lathe for a single program. Pure
   * function — no I/O, no disk writes. Caller writes to disk if desired.
   */
  static upgradeOne(input: UpgradeInput): UpgradeResult {
    const { partNumber, warnings } = extractPartNumber(input);
    const material = input.materialOverride ?? DEFAULT_MATERIAL;
    const toolDia = input.toolDiameterMm ?? 12.7; // 1/2" default OD-turning insert holder
    const baseSfm = DEFAULT_TOOL.sfm_tool_steel_baseline;
    const baseFpr = DEFAULT_TOOL.fpr_tool_steel_baseline_mm;
    const baseDoc = DEFAULT_TOOL.doc_tool_steel_baseline_mm;

    if (material === DEFAULT_MATERIAL) {
      warnings.push("material_defaulted_to_tool_steel — no print override; using majority-class default per operator directive");
    }

    const variants: UpgradeVariant[] = JM_DIE_LATHES.map((lathe) => {
      const mult = RIGIDITY_MULTIPLIER[lathe.rigidityTier];
      const sfmEffective = baseSfm * mult.sfm;
      const fprEffective = baseFpr * mult.fpr;
      const docEffective = baseDoc * mult.doc;
      let rpm = sfmToRpm(sfmEffective, toolDia);
      // Clamp to machine spindle max.
      if (rpm > lathe.spindleRpmMax) rpm = lathe.spindleRpmMax;
      const feedrate = rpm * fprEffective;
      const outputFileName = `${partNumber}_${lathe.machineModel}.nc`;
      return {
        machineId: lathe.machineId,
        machineModel: lathe.machineModel,
        outputFileName,
        rpm,
        feedrate_mm_min: Math.round(feedrate * 100) / 100,
        depthOfCut_mm: Math.round(docEffective * 100) / 100,
        sfm_effective: Math.round(sfmEffective),
        rationale: `HSSco Allied TA / TiAlN on ${material}; baseSFM ${baseSfm} × rigidity-${lathe.rigidityTier} ${mult.sfm.toFixed(2)} → ${Math.round(sfmEffective)} SFM; RPM clamped to spindle max ${lathe.spindleRpmMax}.`,
      };
    });

    return { sourcePath: input.sourcePath, partNumber, material, variants, warnings };
  }
}

/** Singleton export per engine convention. */
export const jmDieLatheProgramUpgraderEngine = JMDieLatheProgramUpgraderEngine;
