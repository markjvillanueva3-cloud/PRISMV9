/**
 * PrintToInventorHSMBridge — Blueprint OCR → Inventor HSM iLogic VB.NET script
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-INVHSM-01)
 *
 * Sister to PrintToHyperMillBridge but for the Autodesk side: takes a
 * BlueprintAnalysis (or vision-extracted profiles) and emits an iLogic VB.NET
 * automation script that drives Inventor HSM (now folded into Fusion 360
 * Manufacturing). The script defines tools, creates CAM operations, and
 * optionally posts NC code via the user's chosen .cps post-processor.
 *
 * Mapping rules (v1, conservative):
 *   - hole profile     → drill operation (tool 1, ø derived from profile.diameter_mm)
 *   - pocket profile   → adaptive_2d roughing + parallel finishing pair
 *   - external profile → contour_2d (climb, multi-pass)
 *   - dimensions-only  → adaptive_3d roughing + parallel finishing pass using
 *                        bounding-box stepdown heuristics
 *
 * Tool table (defaults — same numbering as HyperMill bridge for fleet parity):
 *   1: drill (auto-sized from largest hole, fallback ø6 mm)
 *   2: end mill flat ø8 mm (pocket roughing)
 *   3: end mill ball ø6 mm (parallel finishing)
 *   4: end mill flat ø10 mm (contour roughing)
 *
 * Material-driven feed/speed calibration via UltimateSpeedFeedEngine — same
 * DI seam pattern as PrintToHyperMillBridge so the two CAM bridges share
 * physics-backed values when material is resolved.
 *
 * @engine PrintToInventorHSMBridge
 * @dispatcher camDispatcher (action: print_to_inventor_hsm)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-PRINT-INVHSM-01
 */

import {
  inventorCAMCodeGeneratorEngine,
  type OperationSpec,
  type ToolSpec,
  type OperationType,
  type GenerateParams,
} from "./InventorCAMCodeGeneratorEngine.js";
import type { BlueprintAnalysis } from "./BlueprintOCREngine.js";
import type { ExtractedProfile } from "./BlueprintVisionOCREngine.js";
import {
  ultimateSpeedFeedEngine,
  type UltimateSpeedFeedInput,
} from "./UltimateSpeedFeedEngine.js";
import type { BridgeFeedSpeedResult, FeedSpeedCalculator } from "./PrintToHyperMillBridge.js";

// ── Constants ────────────────────────────────────────────────────────────────

const BRIDGE_VERSION = "1.0.0";
const DEFAULT_DRILL_DIA_MM = 6.0;
const DEFAULT_POCKET_ROUGH_DIA_MM = 8.0;
const DEFAULT_FINISH_BALL_DIA_MM = 6.0;
const DEFAULT_CONTOUR_DIA_MM = 10.0;
const DRILL_TOOL_NUMBER = 1;
const POCKET_ROUGH_TOOL_NUMBER = 2;
const FINISH_BALL_TOOL_NUMBER = 3;
const CONTOUR_TOOL_NUMBER = 4;

const POCKET_ROUGH_STEPDOWN_FRAC = 0.5;
const CONTOUR_STEPDOWN_FRAC = 0.4;
const ADAPTIVE_3D_STEPDOWN_MM = 4.0;
const ADAPTIVE_3D_STEPOVER_MM = 1.5;
const PARALLEL_FINISH_STEPDOWN_MM = 0.3;
const POCKET_FINISH_STOCK_LEAVE_MM = 0.0;
const POCKET_ROUGH_STOCK_LEAVE_MM = 0.2;

// Default feed/rpm values (used when calibration disabled or fails)
const DEFAULT_DRILL_RPM = 2400;
const DEFAULT_DRILL_FEED = 200;
const DEFAULT_POCKET_ROUGH_RPM = 6500;
const DEFAULT_POCKET_ROUGH_FEED = 850;
const DEFAULT_FINISH_RPM = 12500;
const DEFAULT_FINISH_FEED = 1600;
const DEFAULT_CONTOUR_RPM = 8500;
const DEFAULT_CONTOUR_FEED = 1100;
const DEFAULT_ADAPTIVE_3D_RPM = 9000;
const DEFAULT_ADAPTIVE_3D_FEED = 1300;

// Sanity bounds on physics output
const RPM_MIN = 1;
const RPM_MAX = 100_000;
const FEED_MIN = 1;
const FEED_MAX = 50_000;

// ── Public types ─────────────────────────────────────────────────────────────

export interface PrintToInventorHSMInput {
  analysis?: BlueprintAnalysis;
  profiles?: ExtractedProfile[];
  /** Override default depth for pocket extrusion (mm) */
  defaultDepth?: number;
  /** Override part name (otherwise derived from title block) */
  partName?: string;
  /** Override units (otherwise mm) */
  units?: "mm" | "in";
  /** Override Inventor machine/post name */
  machineName?: string;
  /** Override post-processor (.cps), e.g. "haas_next_generation.cps" */
  postProcessor?: string;
  /** Path to write NC output when emitted */
  ncOutputPath?: string;
  /** Whether to emit error handling around iLogic ops (default true) */
  addErrorHandling?: boolean;
  /** Material-driven feed/speed calibration (auto on when material resolved) */
  useMaterialFeedSpeed?: boolean;
  /** Override the title-block material */
  materialOverride?: string;
}

export interface PrintToInventorHSMOutput {
  script: string;
  filename: string;
  opsEmitted: number;
  toolsCount: number;
  unsupported: string[];
  warnings: string[];
  partName: string;
  material: string | null;
  units: "mm" | "in";
  operationSummary: Array<{ type: OperationType; tool: number | null; name: string }>;
  materialCalibration: {
    enabled: boolean;
    material: string | null;
    perOp: Array<{
      op: string;
      tool: number;
      source: "physics" | "default" | "failed";
      rpm: number;
      feed_mm_min: number;
      reason?: string;
    }>;
    summary: { physics: number; fallback: number; failed: number };
  };
  provenance: {
    source: "blueprint_analysis" | "profiles" | "mixed" | "dimensions_only";
    profileCount: number;
    dimensionCount: number;
    bridgeVersion: string;
    generatorVersion: string;
    timestamp: string;
  };
}

export interface PrintToInventorHSMValidation {
  valid: boolean;
  warnings: string[];
}

interface InternalOpRecord {
  op: OperationSpec;
  defaultRpm: number;
  defaultFeed: number;
  toolNumber: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateInput(input: unknown): PrintToInventorHSMValidation {
  const warnings: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, warnings: ["input is not an object"] };
  }
  const i = input as PrintToInventorHSMInput;
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

function partNameFrom(input: PrintToInventorHSMInput): string {
  return (
    input.partName ??
    input.analysis?.title_block?.part_number ??
    "PRISM_InvHSM_Part"
  );
}

function unitsFrom(input: PrintToInventorHSMInput): "mm" | "in" {
  if (input.units) return input.units;
  const u = input.analysis?.title_block?.units;
  if (u === "in") return "in";
  return "mm";
}

function materialFrom(input: PrintToInventorHSMInput): string | null {
  if (input.materialOverride && input.materialOverride.trim().length > 0) {
    return input.materialOverride.trim();
  }
  return input.analysis?.title_block?.material ?? input.analysis?.summary?.material ?? null;
}

function clampDrillDiameter(profileDia: number | undefined): number {
  if (typeof profileDia !== "number" || !Number.isFinite(profileDia) || profileDia <= 0) {
    return DEFAULT_DRILL_DIA_MM;
  }
  return profileDia;
}

function buildOperations(input: PrintToInventorHSMInput): {
  records: InternalOpRecord[];
  unsupported: string[];
  warnings: string[];
  source: PrintToInventorHSMOutput["provenance"]["source"];
} {
  const records: InternalOpRecord[] = [];
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

  // Holes → drill operations
  let holeIdx = 0;
  for (const p of profiles) {
    if (p.type === "hole") {
      const dia = p.diameter_mm ?? DEFAULT_DRILL_DIA_MM;
      records.push({
        op: {
          type: "drill",
          name: `Drill_${holeIdx + 1}_dia${dia.toFixed(2)}`,
          tool: { tool_number: DRILL_TOOL_NUMBER, diameter_mm: dia, type: "drill" },
          cutting: {
            spindle_rpm: DEFAULT_DRILL_RPM,
            feed_mmpm: DEFAULT_DRILL_FEED,
            coolant: "flood",
          },
        },
        defaultRpm: DEFAULT_DRILL_RPM,
        defaultFeed: DEFAULT_DRILL_FEED,
        toolNumber: DRILL_TOOL_NUMBER,
      });
      holeIdx += 1;
    }
  }

  // Pockets → adaptive_2d rough + parallel finish
  let pocketIdx = 0;
  for (const p of profiles) {
    if (p.type === "pocket") {
      records.push({
        op: {
          type: "adaptive_2d",
          name: `Pocket_Rough_${pocketIdx + 1}`,
          tool: {
            tool_number: POCKET_ROUGH_TOOL_NUMBER,
            diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM,
            type: "flat_end",
            flutes: 4,
          },
          cutting: {
            spindle_rpm: DEFAULT_POCKET_ROUGH_RPM,
            feed_mmpm: DEFAULT_POCKET_ROUGH_FEED,
            max_stepdown_mm: DEFAULT_POCKET_ROUGH_DIA_MM * POCKET_ROUGH_STEPDOWN_FRAC,
            stock_to_leave_mm: POCKET_ROUGH_STOCK_LEAVE_MM,
            coolant: "flood",
          },
          strategy: { strategy: "adaptive", direction: "climb" },
        },
        defaultRpm: DEFAULT_POCKET_ROUGH_RPM,
        defaultFeed: DEFAULT_POCKET_ROUGH_FEED,
        toolNumber: POCKET_ROUGH_TOOL_NUMBER,
      });
      records.push({
        op: {
          type: "parallel",
          name: `Pocket_Finish_${pocketIdx + 1}`,
          tool: {
            tool_number: FINISH_BALL_TOOL_NUMBER,
            diameter_mm: DEFAULT_FINISH_BALL_DIA_MM,
            type: "ball_end",
            flutes: 4,
          },
          cutting: {
            spindle_rpm: DEFAULT_FINISH_RPM,
            feed_mmpm: DEFAULT_FINISH_FEED,
            stock_to_leave_mm: POCKET_FINISH_STOCK_LEAVE_MM,
            coolant: "flood",
          },
          strategy: { strategy: "parallel" },
        },
        defaultRpm: DEFAULT_FINISH_RPM,
        defaultFeed: DEFAULT_FINISH_FEED,
        toolNumber: FINISH_BALL_TOOL_NUMBER,
      });
      pocketIdx += 1;
    }
  }

  // External profile → contour_2d
  let contourIdx = 0;
  for (const p of profiles) {
    if (p.type === "external") {
      records.push({
        op: {
          type: "contour_2d",
          name: `Contour_${contourIdx + 1}`,
          tool: {
            tool_number: CONTOUR_TOOL_NUMBER,
            diameter_mm: DEFAULT_CONTOUR_DIA_MM,
            type: "flat_end",
            flutes: 4,
          },
          cutting: {
            spindle_rpm: DEFAULT_CONTOUR_RPM,
            feed_mmpm: DEFAULT_CONTOUR_FEED,
            max_stepdown_mm: DEFAULT_CONTOUR_DIA_MM * CONTOUR_STEPDOWN_FRAC,
            coolant: "flood",
          },
          strategy: { strategy: "contour", direction: "climb" },
        },
        defaultRpm: DEFAULT_CONTOUR_RPM,
        defaultFeed: DEFAULT_CONTOUR_FEED,
        toolNumber: CONTOUR_TOOL_NUMBER,
      });
      contourIdx += 1;
    }
  }

  // Unsupported profile types — captured but non-blocking
  for (const p of profiles) {
    if (p.type === "internal" || p.type === "slot") {
      if (!unsupported.includes(p.type)) unsupported.push(p.type);
    }
  }

  let source: PrintToInventorHSMOutput["provenance"]["source"];
  if (records.length === 0 && dims.length > 0) {
    // Dims-only fallback: adaptive_3d rough + parallel finish
    records.push({
      op: {
        type: "adaptive_3d",
        name: "Adaptive3D_Rough_01",
        tool: {
          tool_number: POCKET_ROUGH_TOOL_NUMBER,
          diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM,
          type: "flat_end",
          flutes: 4,
        },
        cutting: {
          spindle_rpm: DEFAULT_ADAPTIVE_3D_RPM,
          feed_mmpm: DEFAULT_ADAPTIVE_3D_FEED,
          max_stepdown_mm: ADAPTIVE_3D_STEPDOWN_MM,
          stock_to_leave_mm: POCKET_ROUGH_STOCK_LEAVE_MM,
          coolant: "flood",
        },
        strategy: { strategy: "adaptive" },
      },
      defaultRpm: DEFAULT_ADAPTIVE_3D_RPM,
      defaultFeed: DEFAULT_ADAPTIVE_3D_FEED,
      toolNumber: POCKET_ROUGH_TOOL_NUMBER,
    });
    records.push({
      op: {
        type: "parallel",
        name: "Parallel_Finish_01",
        tool: {
          tool_number: FINISH_BALL_TOOL_NUMBER,
          diameter_mm: DEFAULT_FINISH_BALL_DIA_MM,
          type: "ball_end",
          flutes: 4,
        },
        cutting: {
          spindle_rpm: DEFAULT_FINISH_RPM,
          feed_mmpm: DEFAULT_FINISH_FEED,
          stock_to_leave_mm: POCKET_FINISH_STOCK_LEAVE_MM,
          coolant: "flood",
        },
        strategy: { strategy: "parallel" },
      },
      defaultRpm: DEFAULT_FINISH_RPM,
      defaultFeed: DEFAULT_FINISH_FEED,
      toolNumber: FINISH_BALL_TOOL_NUMBER,
    });
    warnings.push("No profiles supplied — emitted adaptive_3d roughing + parallel finishing pass from dimensions");
    source = "dimensions_only";
  } else if (input.analysis && profiles.length > 0) {
    source = "mixed";
  } else if (profiles.length > 0) {
    source = "profiles";
  } else {
    source = "blueprint_analysis";
  }

  if (records.length === 0) {
    warnings.push("No operations could be derived from the supplied input");
  }
  if (largestHoleDia > 0 && largestHoleDia !== DEFAULT_DRILL_DIA_MM) {
    warnings.push(`Drill tool 1 sized to ø${largestHoleDia.toFixed(2)} mm based on largest detected hole`);
  }

  return { records, unsupported, warnings, source };
}

function buildToolTable(profiles: ExtractedProfile[]): ToolSpec[] {
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

  const tools: ToolSpec[] = [
    {
      tool_number: DRILL_TOOL_NUMBER,
      type: "drill",
      diameter_mm: clampDrillDiameter(largestHoleDia > 0 ? largestHoleDia : undefined),
      flutes: 2,
    },
  ];
  if (hasPocket || !hasPocket) {
    // Always include pocket+finish for HPC fallback even if no pocket profile
    tools.push(
      {
        tool_number: POCKET_ROUGH_TOOL_NUMBER,
        type: "flat_end",
        diameter_mm: DEFAULT_POCKET_ROUGH_DIA_MM,
        flutes: 4,
      },
      {
        tool_number: FINISH_BALL_TOOL_NUMBER,
        type: "ball_end",
        diameter_mm: DEFAULT_FINISH_BALL_DIA_MM,
        flutes: 4,
      },
    );
  }
  if (hasContour) {
    tools.push({
      tool_number: CONTOUR_TOOL_NUMBER,
      type: "flat_end",
      diameter_mm: DEFAULT_CONTOUR_DIA_MM,
      flutes: 4,
    });
  }
  return tools;
}

function opTypeToFeedSpeedInput(
  op: OperationSpec,
  material: string,
): UltimateSpeedFeedInput {
  let operation: UltimateSpeedFeedInput["operation"] = "milling";
  let cut_type: UltimateSpeedFeedInput["cut_type"] = "roughing";
  let strategy: UltimateSpeedFeedInput["strategy"] | undefined;

  switch (op.type) {
    case "drill":
    case "bore":
      operation = "drill" === op.type ? "drilling" : "boring";
      cut_type = "roughing";
      break;
    case "thread":
      operation = "tapping";
      cut_type = "finishing";
      break;
    case "parallel":
    case "scallop":
    case "pencil":
    case "horizontal":
    case "steep_shallow":
    case "spiral":
    case "morphed_spiral":
    case "flow":
    case "radial":
      operation = "milling";
      cut_type = "finishing";
      break;
    case "adaptive_2d":
    case "adaptive_3d":
      operation = "milling";
      cut_type = "roughing";
      strategy = "adaptive";
      break;
    case "pocket_2d":
    case "contour_2d":
    case "face":
    case "slot":
    case "contour_3d":
    default:
      operation = "milling";
      cut_type = "roughing";
      break;
  }

  return {
    material,
    tool_diameter_mm: op.tool?.diameter_mm,
    flutes: op.tool?.flutes ?? 2,
    tool_material: "carbide",
    operation,
    cut_type,
    ...(strategy ? { strategy } : {}),
  };
}

function isCleanResult(rpm: number, feed: number): boolean {
  return (
    Number.isFinite(rpm) && rpm >= RPM_MIN && rpm <= RPM_MAX &&
    Number.isFinite(feed) && feed >= FEED_MIN && feed <= FEED_MAX
  );
}

function calibrateOps(
  records: InternalOpRecord[],
  material: string,
  feedSpeed: FeedSpeedCalculator,
  warnings: string[],
): PrintToInventorHSMOutput["materialCalibration"] {
  const perOp: PrintToInventorHSMOutput["materialCalibration"]["perOp"] = [];
  let physics = 0;
  let fallback = 0;
  let failed = 0;

  for (const rec of records) {
    const opName = rec.op.name ?? rec.op.type;
    try {
      const sfInput = opTypeToFeedSpeedInput(rec.op, material);
      const sfResult: BridgeFeedSpeedResult = feedSpeed.calculate(sfInput);
      const rpm = sfResult.spindle_rpm.value;
      const feed = sfResult.feed_rate.value;
      if (!isCleanResult(rpm, feed)) {
        perOp.push({
          op: opName,
          tool: rec.toolNumber,
          source: "failed",
          rpm: rec.defaultRpm,
          feed_mm_min: rec.defaultFeed,
          reason: `physics returned out-of-range rpm=${rpm} feed=${feed}`,
        });
        warnings.push(`[${opName}] physics calc out-of-range — kept defaults rpm=${rec.defaultRpm} feed=${rec.defaultFeed}`);
        failed += 1;
        continue;
      }
      const rpmRounded = Math.round(rpm);
      const feedRounded = Math.round(feed);
      // Apply onto the operation's cutting params
      rec.op.cutting = {
        ...(rec.op.cutting ?? {}),
        spindle_rpm: rpmRounded,
        feed_mmpm: feedRounded,
      };
      perOp.push({
        op: opName,
        tool: rec.toolNumber,
        source: "physics",
        rpm: rpmRounded,
        feed_mm_min: feedRounded,
      });
      physics += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      perOp.push({
        op: opName,
        tool: rec.toolNumber,
        source: "failed",
        rpm: rec.defaultRpm,
        feed_mm_min: rec.defaultFeed,
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

// ── Engine ───────────────────────────────────────────────────────────────────

export interface PrintToInventorHSMDeps {
  feedSpeed?: FeedSpeedCalculator;
}

export class PrintToInventorHSMBridge {
  readonly version = BRIDGE_VERSION;
  private readonly feedSpeed: FeedSpeedCalculator;

  constructor(deps?: PrintToInventorHSMDeps) {
    this.feedSpeed = deps?.feedSpeed ?? ultimateSpeedFeedEngine;
  }

  validate(input: unknown): PrintToInventorHSMValidation {
    return validateInput(input);
  }

  buildBridgeScript(input: PrintToInventorHSMInput): PrintToInventorHSMOutput {
    const v = validateInput(input);
    if (!v.valid) {
      throw new Error(`PrintToInventorHSMBridge: ${v.warnings.join("; ")}`);
    }

    const partName = partNameFrom(input);
    const units = unitsFrom(input);
    const material = materialFrom(input);
    const profiles = input.profiles ?? [];
    const dims = input.analysis?.dimensions ?? [];

    const { records, unsupported, warnings, source } = buildOperations(input);
    const tools = buildToolTable(profiles);

    const wantCalibration = input.useMaterialFeedSpeed ?? Boolean(material);
    let materialCalibration: PrintToInventorHSMOutput["materialCalibration"];
    if (wantCalibration && material && records.length > 0) {
      materialCalibration = calibrateOps(records, material, this.feedSpeed, warnings);
    } else {
      const reason = !material
        ? "no material resolved from title block / override"
        : records.length === 0
          ? "no operations to calibrate"
          : "useMaterialFeedSpeed=false";
      materialCalibration = {
        enabled: false,
        material,
        perOp: records.map((rec) => ({
          op: rec.op.name ?? rec.op.type,
          tool: rec.toolNumber,
          source: "default",
          rpm: rec.defaultRpm,
          feed_mm_min: rec.defaultFeed,
          reason,
        })),
        summary: { physics: 0, fallback: records.length, failed: 0 },
      };
    }

    const operations = records.map((r) => r.op);
    const params: Omit<GenerateParams, "script_type" | "operations" | "tools"> = {
      machine_name: input.machineName ?? "Inventor HSM Default",
      ...(input.postProcessor ? { post_processor: input.postProcessor } : {}),
      ...(input.ncOutputPath ? { nc_output_path: input.ncOutputPath } : {}),
      error_handling: input.addErrorHandling ?? true,
    };

    const result = inventorCAMCodeGeneratorEngine.generateILogicScript(operations, tools, params);

    const allWarnings = [...warnings];
    if (material && materialCalibration.enabled) {
      allWarnings.push(
        `Material-calibrated feeds/speeds: material=${material}, physics=${materialCalibration.summary.physics}, fallback=${materialCalibration.summary.fallback}, failed=${materialCalibration.summary.failed}`,
      );
    } else if (material) {
      allWarnings.push(`Material from title block: ${material} (calibration disabled — using bridge defaults)`);
    }
    if (units === "in") {
      allWarnings.push("Units=inch — generated iLogic script assumes Inventor is configured for inch mode");
    }

    let script = result.script;
    if (!script.endsWith("\n")) script += "\n";
    script += `' PRISM PrintToInventorHSMBridge v${BRIDGE_VERSION} — ${operations.length} ops, ${profiles.length} profiles, ${dims.length} dims, source=${source}\n`;

    return {
      script,
      filename: `${partName}.ihsm.iLogicVb`,
      opsEmitted: operations.length,
      toolsCount: tools.length,
      unsupported,
      warnings: allWarnings,
      partName,
      material,
      units,
      operationSummary: operations.map((o) => ({
        type: o.type,
        tool: o.tool?.tool_number ?? null,
        name: o.name ?? o.type,
      })),
      materialCalibration,
      provenance: {
        source,
        profileCount: profiles.length,
        dimensionCount: dims.length,
        bridgeVersion: BRIDGE_VERSION,
        generatorVersion: "2401",
        timestamp: new Date().toISOString(),
      },
    };
  }

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

export const printToInventorHSMBridge = new PrintToInventorHSMBridge();
