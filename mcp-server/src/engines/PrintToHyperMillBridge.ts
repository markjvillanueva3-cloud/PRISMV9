/**
 * PrintToHyperMillBridge — Blueprint OCR → hyperMILL Automation Center Python script
 * (CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01)
 *
 * Sister to the 6 CAD print bridges, but on the CAM side. Where Fusion/HC/MC/
 * Inv/SW/Esprit bridges emit CAD geometry-build scripts, this bridge emits a
 * hyperMILL Automation Center (AC) Python script that creates a job list with
 * roughing + finishing + drilling operations derived from the blueprint's
 * profiles + dimensions.
 *
 * Mapping rules (v1, conservative):
 *   - hole profile     → drilling op (tool 1, ø derived from profile.diameter_mm)
 *   - pocket profile   → maxx_roughing + scallop_finishing pair
 *   - external profile → contour_2d (climb cut, conventional finish)
 *   - dimensions-only  → batch defaults (HPC roughing + Z-level finishing) using
 *                        bounding-box stepdown heuristics
 *
 * Tool table (defaults):
 *   - 1: drill (auto-sized from largest hole, fallback ø6 mm)
 *   - 2: end mill flat ø8 mm (pocket roughing)
 *   - 3: end mill ball ø6 mm (scallop finishing)
 *   - 4: end mill flat ø10 mm (contour roughing)
 *
 * @engine PrintToHyperMillBridge
 * @dispatcher camDispatcher (action: print_to_hypermill)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-HM-PRINT-01
 */

import {
  hyperMillCodeGeneratorEngine,
  type HMOperation,
  type HMTool,
  type HMGenerateParams,
  type HMGenerateResult,
} from "./HyperMillCodeGeneratorEngine.js";
import type { BlueprintAnalysis } from "./BlueprintOCREngine.js";
import type { ExtractedProfile } from "./BlueprintVisionOCREngine.js";
import {
  ultimateSpeedFeedEngine,
  type UltimateSpeedFeedInput,
} from "./UltimateSpeedFeedEngine.js";

/** Minimal result shape the bridge consumes — wider engine results satisfy this */
export interface BridgeFeedSpeedResult {
  spindle_rpm: { value: number };
  feed_rate: { value: number };
}

// ── Constants ────────────────────────────────────────────────────────────────

const BRIDGE_VERSION = "1.1.0";

/** Sanity bounds — anything outside is treated as a failed calc */
const RPM_MIN = 1;
const RPM_MAX = 100_000;
const FEED_MIN = 1;
const FEED_MAX = 50_000;

const DEFAULT_DRILL_DIA_MM = 6.0;
const DEFAULT_POCKET_ROUGH_DIA_MM = 8.0;
const DEFAULT_FINISH_BALL_DIA_MM = 6.0;
const DEFAULT_CONTOUR_DIA_MM = 10.0;
const DRILL_TOOL_NUMBER = 1;
const POCKET_ROUGH_TOOL_NUMBER = 2;
const FINISH_BALL_TOOL_NUMBER = 3;
const CONTOUR_TOOL_NUMBER = 4;
const SCALLOP_HEIGHT_MM = 0.005;

// Stepdown / stepover heuristics (conservative for general-purpose AC scripts)
const POCKET_ROUGH_STEPDOWN_FRAC = 0.5; // ap = 0.5 × tool diameter
const POCKET_FINISH_STOCK_LEAVE_MM = 0.0;
const CONTOUR_STEPDOWN_FRAC = 0.4;
const HPC_DEFAULT_STEPDOWN_MM = 5.0;
const HPC_DEFAULT_STEPOVER_MM = 1.5;
const ZLEVEL_FINISH_STEPDOWN_MM = 0.3;

// ── Public types ─────────────────────────────────────────────────────────────

export interface PrintToHyperMillInput {
  analysis?: BlueprintAnalysis;
  profiles?: ExtractedProfile[];
  /** Override default depth for pocket extrusion (mm) */
  defaultDepth?: number;
  /** Override part name (otherwise derived from title block) */
  partName?: string;
  /** Override units (otherwise mm) */
  units?: "mm" | "in";
  /** Override hyperMILL machine name */
  machineName?: string;
  /** Override controller post-processor (omPPFI, omPPHH, omPPSI, omPPF3X) */
  postProcessor?: string;
  /** Whether to emit run_nc_generation block (default false — preview only) */
  runNCGeneration?: boolean;
  /** Whether to wrap script in try/except (default true for prod safety) */
  addErrorHandling?: boolean;
  /**
   * Material-driven calibration of feeds + spindle RPM. Default behavior:
   *   - true  if a material name is resolved from analysis (or input.materialOverride)
   *   - false otherwise (no point invoking physics with no material)
   * Pass `false` explicitly to force hardcoded defaults (e.g. for repro tests).
   */
  useMaterialFeedSpeed?: boolean;
  /** Override the title-block material (e.g. when caller knows the actual stock) */
  materialOverride?: string;
}

/** DI surface for the speed/feed physics engine — keeps the bridge testable */
export interface FeedSpeedCalculator {
  calculate(input: UltimateSpeedFeedInput): BridgeFeedSpeedResult;
}

export interface MaterialCalibrationEntry {
  /** Operation name (HMOperation.name) */
  op: string;
  /** Tool number used for the calc */
  tool: number;
  /** Where the final feed/rpm came from */
  source: "physics" | "default" | "failed";
  /** Final spindle rpm written into HMOperation */
  rpm: number;
  /** Final feed in mm/min written into HMOperation */
  feed_mm_min: number;
  /** Why physics calc was skipped or failed (only set when source != "physics") */
  reason?: string;
}

export interface MaterialCalibration {
  enabled: boolean;
  /** Material name actually fed to the physics engine (may differ from title block) */
  material: string | null;
  /** Per-operation outcomes — same length as ops emitted */
  perOp: MaterialCalibrationEntry[];
  /** Counters for quick assertion in tests / dashboards */
  summary: {
    physics: number;
    fallback: number;
    failed: number;
  };
}

export interface PrintToHyperMillOutput {
  script: string;
  filename: string;
  opsEmitted: number;
  toolsCount: number;
  /** Profile types we couldn't map to an HM operation */
  unsupported: string[];
  warnings: string[];
  partName: string;
  material: string | null;
  units: "mm" | "in";
  /** Per-operation summary (type + tool + name) for traceability */
  operationSummary: Array<{ type: string; tool: number | null; name: string }>;
  /** Per-op calibration outcome from the speed/feed physics engine */
  materialCalibration: MaterialCalibration;
  provenance: {
    source: "blueprint_analysis" | "profiles" | "mixed" | "dimensions_only";
    profileCount: number;
    dimensionCount: number;
    bridgeVersion: string;
    generatorVersion: string;
    timestamp: string;
  };
}

export interface PrintToHyperMillValidation {
  valid: boolean;
  warnings: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateInput(input: unknown): PrintToHyperMillValidation {
  const warnings: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, warnings: ["input is not an object"] };
  }
  const i = input as PrintToHyperMillInput;
  const hasAnalysis = i.analysis !== undefined && i.analysis !== null;
  const hasProfiles = Array.isArray(i.profiles) && i.profiles.length > 0;
  if (!hasAnalysis && !hasProfiles) {
    warnings.push("input requires at least one of `analysis` or `profiles`");
  }
  if (i.defaultDepth !== undefined) {
    if (typeof i.defaultDepth !== "number" || !Number.isFinite(i.defaultDepth) || i.defaultDepth <= 0) {
      warnings.push("defaultDepth must be a finite positive number when supplied");
    }
  }
  if (i.units !== undefined && i.units !== "mm" && i.units !== "in") {
    warnings.push(`units must be "mm" or "in", got "${i.units}"`);
  }
  return { valid: warnings.length === 0, warnings };
}

function partNameFrom(input: PrintToHyperMillInput): string {
  return (
    input.partName ??
    input.analysis?.title_block?.part_number ??
    "PRISM_HM_Part"
  );
}

function unitsFrom(input: PrintToHyperMillInput): "mm" | "in" {
  if (input.units) return input.units;
  const u = input.analysis?.title_block?.units;
  if (u === "in") return "in";
  return "mm";
}

function materialFrom(input: PrintToHyperMillInput): string | null {
  if (input.materialOverride && input.materialOverride.trim().length > 0) {
    return input.materialOverride.trim();
  }
  return input.analysis?.title_block?.material ?? input.analysis?.summary?.material ?? null;
}

/** Map an HMOperation type onto an UltimateSpeedFeed input */
function opToFeedSpeedInput(
  op: HMOperation,
  tool: HMTool,
  material: string,
): UltimateSpeedFeedInput {
  let operation: UltimateSpeedFeedInput["operation"] = "milling";
  let cut_type: UltimateSpeedFeedInput["cut_type"] = "roughing";
  let strategy: UltimateSpeedFeedInput["strategy"] | undefined;

  switch (op.type) {
    case "drilling":
      operation = "drilling";
      cut_type = "roughing";
      break;
    case "scallop_finishing":
    case "z_level_finishing":
      operation = "milling";
      cut_type = "finishing";
      break;
    case "hpc_roughing":
      operation = "milling";
      cut_type = "roughing";
      strategy = "hpc";
      break;
    case "pocket_2d":
    case "contour_2d":
    default:
      operation = "milling";
      cut_type = "roughing";
      break;
  }

  return {
    material,
    tool_diameter_mm: tool.diameter_mm,
    flutes: tool.flutes ?? 2,
    tool_material: "carbide",
    operation,
    cut_type,
    ...(strategy ? { strategy } : {}),
  };
}

/** Sanity-check a physics result before promoting it onto an HMOperation */
function isCleanResult(rpm: number, feed: number): boolean {
  return (
    Number.isFinite(rpm) && rpm >= RPM_MIN && rpm <= RPM_MAX &&
    Number.isFinite(feed) && feed >= FEED_MIN && feed <= FEED_MAX
  );
}

/**
 * Calibrate every op's feed_mm_min + spindle_rpm from physics. Mutates `ops`
 * in place. Failures are isolated per-op; defaults stay if calc cannot run.
 */
function calibrateOps(
  ops: HMOperation[],
  tools: HMTool[],
  material: string,
  feedSpeed: FeedSpeedCalculator,
  warnings: string[],
): MaterialCalibration {
  const toolByNumber = new Map<number, HMTool>(tools.map((t) => [t.number, t]));
  const perOp: MaterialCalibrationEntry[] = [];
  let physics = 0;
  let fallback = 0;
  let failed = 0;

  for (const op of ops) {
    const opName = op.name ?? op.type;
    const toolNum = op.tool_number ?? -1;
    const tool = toolByNumber.get(toolNum);
    const defaultRpm = op.spindle_rpm ?? 0;
    const defaultFeed = op.feed_mm_min ?? 0;

    if (!tool) {
      perOp.push({
        op: opName,
        tool: toolNum,
        source: "default",
        rpm: defaultRpm,
        feed_mm_min: defaultFeed,
        reason: `tool ${toolNum} not in tool table`,
      });
      fallback += 1;
      continue;
    }

    try {
      const sfInput = opToFeedSpeedInput(op, tool, material);
      const sfResult = feedSpeed.calculate(sfInput);
      const rpm = sfResult.spindle_rpm.value;
      const feed = sfResult.feed_rate.value;
      if (!isCleanResult(rpm, feed)) {
        perOp.push({
          op: opName,
          tool: toolNum,
          source: "failed",
          rpm: defaultRpm,
          feed_mm_min: defaultFeed,
          reason: `physics returned out-of-range rpm=${rpm} feed=${feed}`,
        });
        warnings.push(`[${opName}] physics calc out-of-range — kept defaults rpm=${defaultRpm} feed=${defaultFeed}`);
        failed += 1;
        continue;
      }
      const rpmRounded = Math.round(rpm);
      const feedRounded = Math.round(feed);
      op.spindle_rpm = rpmRounded;
      op.feed_mm_min = feedRounded;
      perOp.push({
        op: opName,
        tool: toolNum,
        source: "physics",
        rpm: rpmRounded,
        feed_mm_min: feedRounded,
      });
      physics += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      perOp.push({
        op: opName,
        tool: toolNum,
        source: "failed",
        rpm: defaultRpm,
        feed_mm_min: defaultFeed,
        reason: msg,
      });
      warnings.push(`[${opName}] physics calc threw — kept defaults: ${msg}`);
      failed += 1;
    }
  }

  return {
    enabled: true,
    material,
    perOp,
    summary: { physics, fallback, failed },
  };
}

function pickPostProcessor(materialOrControllerHint: string | null, override?: string): string {
  if (override) return override;
  // Default to FANUC-Interactive — matches HyperMillCodeGeneratorEngine default.
  return "omPPFI";
}

function clampDrillDiameter(profileDia: number | undefined): number {
  if (typeof profileDia !== "number" || !Number.isFinite(profileDia) || profileDia <= 0) {
    return DEFAULT_DRILL_DIA_MM;
  }
  return profileDia;
}

function buildOperations(input: PrintToHyperMillInput): {
  ops: HMOperation[];
  unsupported: string[];
  warnings: string[];
  source: PrintToHyperMillOutput["provenance"]["source"];
} {
  const ops: HMOperation[] = [];
  const unsupported: string[] = [];
  const warnings: string[] = [];
  const profiles = input.profiles ?? [];
  const dims = input.analysis?.dimensions ?? [];

  let largestHoleDia = 0;
  for (const p of profiles) {
    if (p.type === "hole" && typeof p.diameter_mm === "number" && p.diameter_mm > largestHoleDia) {
      largestHoleDia = p.diameter_mm;
    }
  }

  // Hole → drilling operation
  let holeIdx = 0;
  for (const p of profiles) {
    if (p.type === "hole") {
      ops.push({
        type: "drilling",
        name: `Drill_${holeIdx + 1}_dia${(p.diameter_mm ?? DEFAULT_DRILL_DIA_MM).toFixed(2)}`,
        tool_number: DRILL_TOOL_NUMBER,
        feed_mm_min: 200,
        spindle_rpm: 2500,
        coolant: "flood",
        approach: "plunge",
        retract: "direct",
      });
      holeIdx += 1;
    }
  }

  // Pocket → roughing + finishing
  let pocketIdx = 0;
  for (const p of profiles) {
    if (p.type === "pocket") {
      ops.push({
        type: "pocket_2d",
        name: `Pocket_Rough_${pocketIdx + 1}`,
        tool_number: POCKET_ROUGH_TOOL_NUMBER,
        stepdown_mm: DEFAULT_POCKET_ROUGH_DIA_MM * POCKET_ROUGH_STEPDOWN_FRAC,
        stock_leave_mm: 0.2,
        feed_mm_min: 800,
        spindle_rpm: 6000,
        coolant: "flood",
        approach: "helical",
        cut_direction: "climb",
      });
      ops.push({
        type: "scallop_finishing",
        name: `Pocket_Finish_${pocketIdx + 1}`,
        tool_number: FINISH_BALL_TOOL_NUMBER,
        scallop_height_mm: SCALLOP_HEIGHT_MM,
        stock_leave_mm: POCKET_FINISH_STOCK_LEAVE_MM,
        feed_mm_min: 1500,
        spindle_rpm: 12000,
        coolant: "flood",
      });
      pocketIdx += 1;
    }
  }

  // External profile → contour 2D
  let contourIdx = 0;
  for (const p of profiles) {
    if (p.type === "external") {
      ops.push({
        type: "contour_2d",
        name: `Contour_${contourIdx + 1}`,
        tool_number: CONTOUR_TOOL_NUMBER,
        stepdown_mm: DEFAULT_CONTOUR_DIA_MM * CONTOUR_STEPDOWN_FRAC,
        feed_mm_min: 1000,
        spindle_rpm: 8000,
        coolant: "flood",
        cut_direction: "climb",
      });
      contourIdx += 1;
    }
  }

  // Unsupported profile types — captured but not blocking
  for (const p of profiles) {
    if (p.type === "internal" || p.type === "slot") {
      if (!unsupported.includes(p.type)) unsupported.push(p.type);
    }
  }

  let source: PrintToHyperMillOutput["provenance"]["source"];
  if (ops.length === 0 && dims.length > 0) {
    // Fall back to a generic HPC + Z-level finishing pass when only dimensions are available
    ops.push({
      type: "hpc_roughing",
      name: "HPC_Rough_01",
      tool_number: POCKET_ROUGH_TOOL_NUMBER,
      stepdown_mm: HPC_DEFAULT_STEPDOWN_MM,
      stepover_mm: HPC_DEFAULT_STEPOVER_MM,
      feed_mm_min: 1200,
      spindle_rpm: 8000,
      coolant: "flood",
      approach: "helical",
    });
    ops.push({
      type: "z_level_finishing",
      name: "ZLevel_Finish_01",
      tool_number: FINISH_BALL_TOOL_NUMBER,
      stepdown_mm: ZLEVEL_FINISH_STEPDOWN_MM,
      stock_leave_mm: 0,
      feed_mm_min: 2000,
      spindle_rpm: 14000,
      coolant: "flood",
    });
    warnings.push("No profiles supplied — emitted generic HPC roughing + Z-level finishing pass from dimensions");
    source = "dimensions_only";
  } else if (input.analysis && profiles.length > 0) {
    source = "mixed";
  } else if (profiles.length > 0) {
    source = "profiles";
  } else {
    source = "blueprint_analysis";
  }

  if (ops.length === 0) {
    warnings.push("No operations could be derived from the supplied input");
  }

  // Use the largest detected hole to size the drill tool, if any
  if (largestHoleDia > 0 && largestHoleDia !== DEFAULT_DRILL_DIA_MM) {
    warnings.push(`Drill tool 1 sized to ø${largestHoleDia.toFixed(2)} mm based on largest detected hole`);
  }

  return { ops, unsupported, warnings, source };
}

function buildToolTable(profiles: ExtractedProfile[]): HMTool[] {
  let largestHoleDia = 0;
  let hasPocket = false;
  let hasContour = false;
  for (const p of profiles) {
    if (p.type === "hole" && typeof p.diameter_mm === "number" && p.diameter_mm > largestHoleDia) {
      largestHoleDia = p.diameter_mm;
    }
    if (p.type === "pocket") hasPocket = true;
    if (p.type === "external") hasContour = true;
  }

  const tools: HMTool[] = [
    {
      number: DRILL_TOOL_NUMBER,
      type: "drill",
      diameter_mm: clampDrillDiameter(largestHoleDia > 0 ? largestHoleDia : undefined),
      flutes: 2,
      material: "carbide",
      label: "PRISM auto-sized drill",
    },
  ];
  if (hasPocket) {
    tools.push(
      {
        number: POCKET_ROUGH_TOOL_NUMBER,
        type: "endmill_flat",
        diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM,
        flutes: 4,
        material: "carbide",
        label: "PRISM pocket rougher",
      },
      {
        number: FINISH_BALL_TOOL_NUMBER,
        type: "endmill_ball",
        diameter_mm: DEFAULT_FINISH_BALL_DIA_MM,
        flutes: 4,
        material: "carbide",
        label: "PRISM finish ball",
      },
    );
  }
  if (hasContour) {
    tools.push({
      number: CONTOUR_TOOL_NUMBER,
      type: "endmill_flat",
      diameter_mm: DEFAULT_CONTOUR_DIA_MM,
      flutes: 4,
      material: "carbide",
      label: "PRISM contour cutter",
    });
  }
  // Always include pocket-rough + finish-ball even when no pocket (HPC fallback uses them)
  if (!hasPocket) {
    tools.push(
      {
        number: POCKET_ROUGH_TOOL_NUMBER,
        type: "endmill_flat",
        diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM,
        flutes: 4,
        material: "carbide",
        label: "PRISM HPC rougher",
      },
      {
        number: FINISH_BALL_TOOL_NUMBER,
        type: "endmill_ball",
        diameter_mm: DEFAULT_FINISH_BALL_DIA_MM,
        flutes: 4,
        material: "carbide",
        label: "PRISM finish ball",
      },
    );
  }
  return tools;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class PrintToHyperMillBridge {
  readonly version = BRIDGE_VERSION;
  private readonly feedSpeed: FeedSpeedCalculator;

  constructor(deps?: { feedSpeed?: FeedSpeedCalculator }) {
    this.feedSpeed = deps?.feedSpeed ?? ultimateSpeedFeedEngine;
  }

  validate(input: unknown): PrintToHyperMillValidation {
    return validateInput(input);
  }

  buildBridgeScript(input: PrintToHyperMillInput): PrintToHyperMillOutput {
    const v = validateInput(input);
    if (!v.valid) {
      throw new Error(`PrintToHyperMillBridge: ${v.warnings.join("; ")}`);
    }

    const partName = partNameFrom(input);
    const units = unitsFrom(input);
    const material = materialFrom(input);
    const profiles = input.profiles ?? [];
    const dims = input.analysis?.dimensions ?? [];

    const { ops, unsupported, warnings, source } = buildOperations(input);
    const tools = buildToolTable(profiles);

    // Material-driven calibration of feed/rpm. Default ON when a material is
    // resolved; explicit `useMaterialFeedSpeed: false` opts out.
    const wantCalibration = input.useMaterialFeedSpeed ?? Boolean(material);
    let materialCalibration: MaterialCalibration;
    if (wantCalibration && material && ops.length > 0) {
      materialCalibration = calibrateOps(ops, tools, material, this.feedSpeed, warnings);
    } else {
      const reason = !material
        ? "no material resolved from title block / override"
        : ops.length === 0
          ? "no operations to calibrate"
          : "useMaterialFeedSpeed=false";
      materialCalibration = {
        enabled: false,
        material,
        perOp: ops.map((op) => ({
          op: op.name ?? op.type,
          tool: op.tool_number ?? -1,
          source: "default",
          rpm: op.spindle_rpm ?? 0,
          feed_mm_min: op.feed_mm_min ?? 0,
          reason,
        })),
        summary: { physics: 0, fallback: ops.length, failed: 0 },
      };
    }

    const params: HMGenerateParams = {
      part_name: partName,
      job_name: `${partName}_PRISM_Job`,
      machine_name: input.machineName,
      add_error_handling: input.addErrorHandling ?? true,
      add_progress_msgs: true,
      run_nc_generation: input.runNCGeneration ?? false,
      post_processor: pickPostProcessor(material, input.postProcessor),
    };

    const result: HMGenerateResult = hyperMillCodeGeneratorEngine.generateACScript(ops, tools, params);

    // Surface generator-side warnings in our own list
    const allWarnings = [...warnings, ...result.warnings];
    if (material && materialCalibration.enabled) {
      allWarnings.push(
        `Material-calibrated feeds/speeds: material=${material}, physics=${materialCalibration.summary.physics}, fallback=${materialCalibration.summary.fallback}, failed=${materialCalibration.summary.failed}`,
      );
    } else if (material) {
      allWarnings.push(`Material from title block: ${material} (calibration disabled — using bridge defaults)`);
    }
    if (units === "in") {
      allWarnings.push("Units=inch — generated AC script assumes hyperMILL is configured for inch mode");
    }

    let script = result.script;
    if (!script.endsWith("\n")) script += "\n";
    script += `# PRISM PrintToHyperMillBridge v${BRIDGE_VERSION} — ${ops.length} ops, ${profiles.length} profiles, ${dims.length} dims, source=${source}\n`;

    return {
      script,
      filename: `${partName}.hm.py`,
      opsEmitted: ops.length,
      toolsCount: tools.length,
      unsupported,
      warnings: allWarnings,
      partName,
      material,
      units,
      operationSummary: ops.map((o) => ({
        type: o.type,
        tool: o.tool_number ?? null,
        name: o.name ?? o.type,
      })),
      materialCalibration,
      provenance: {
        source,
        profileCount: profiles.length,
        dimensionCount: dims.length,
        bridgeVersion: BRIDGE_VERSION,
        generatorVersion: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** Capabilities surface — what profile/feature types we map */
  capabilities(): {
    version: string;
    supportedProfileTypes: readonly string[];
    unsupportedProfileTypes: readonly string[];
    defaultTools: readonly { number: number; role: string; diameter_mm: number }[];
  } {
    return {
      version: BRIDGE_VERSION,
      supportedProfileTypes: ["hole", "pocket", "external"] as const,
      unsupportedProfileTypes: ["internal", "slot"] as const,
      defaultTools: [
        { number: DRILL_TOOL_NUMBER, role: "drill", diameter_mm: DEFAULT_DRILL_DIA_MM },
        { number: POCKET_ROUGH_TOOL_NUMBER, role: "pocket_rougher", diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM },
        { number: FINISH_BALL_TOOL_NUMBER, role: "finish_ball", diameter_mm: DEFAULT_FINISH_BALL_DIA_MM },
        { number: CONTOUR_TOOL_NUMBER, role: "contour", diameter_mm: DEFAULT_CONTOUR_DIA_MM },
      ] as const,
    };
  }
}

export const printToHyperMillBridge = new PrintToHyperMillBridge();
