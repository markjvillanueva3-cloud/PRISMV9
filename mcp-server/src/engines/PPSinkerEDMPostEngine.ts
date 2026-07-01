/**
 * PPSinkerEDMPostEngine — Mitsubishi Sinker (Die-Sinking) EDM post processing
 *
 * Generates sinker EDM programs for JM Die's Mitsubishi EA12V.
 * Sinker EDM differs fundamentally from milling/turning/wire:
 *   - No cutting tool — electrode burns image into workpiece
 *   - No feed rates — Z-axis servo controlled by gap voltage
 *   - Pulse parameters (ON/OFF time, peak current) define burn energy
 *   - Orbital motion (C-axis or X/Y circle) generates side clearance
 *   - Multi-stage burn: rough (high power) → semi-finish → finish
 *   - Electrode wear compensation via over-burn depth
 *   - Dielectric flush (pressure + suction) critical for chip evacuation
 *
 * Covers:
 *   - Straight plunge (Z-only sinking)
 *   - Orbital burn (circular/square orbit patterns)
 *   - Multi-electrode sequences (rough + finish electrodes)
 *   - Planetary orbit for cavity finishing
 *   - Flushing cycle integration
 *
 * @module PPSinkerEDMPostEngine
 */

import {
  resolveEDMMaterial,
  resolveEDMBiMaterial,
  EDM_MULTIPASS_MATERIALS,
  EDM_BIMATERIAL_MATERIALS,
  type EDMMultiPassMaterialProps,
  type EDMBiMaterialProps,
} from "../data/edm-material-db.js";

// ── Types ─────────────────────────────────────────────────────────────

export type SinkerBurnStage = "rough" | "semi_finish" | "finish" | "super_finish";

export type OrbitPattern = "none" | "circle" | "square" | "cross" | "star" | "planetary";

export interface SinkerOperation {
  stage: SinkerBurnStage;

  // Position
  start_x?: number;
  start_y?: number;
  start_z?: number;           // Initial Z (retract plane)
  target_depth_mm: number;    // Final depth below start_z (positive number)
  retract_depth_mm?: number;  // How much to retract between flush cycles

  // Electrode
  electrode_number?: number;  // Tool/electrode number (T1, T2, ...)
  electrode_name?: string;    // "ROUGH_GRAPHITE", "FINISH_COPPER"
  over_burn_mm?: number;      // Additional depth to compensate electrode wear

  // Pulse parameters
  peak_current_a?: number;    // Peak discharge current (A)
  on_time_us?: number;        // Pulse on-time (µs)
  off_time_us?: number;       // Pulse off-time (µs)
  gap_voltage_v?: number;     // Servo gap voltage
  polarity?: "positive" | "negative"; // Electrode polarity
  duty_cycle?: number;        // 0-1

  // Orbit
  orbit_pattern?: OrbitPattern;
  orbit_radius_mm?: number;   // Side clearance / orbit size
  orbit_speed_mm_min?: number;
  orbit_revolutions?: number; // Complete circles

  // Flushing
  flush_pressure_bar?: number;  // Dielectric injection pressure
  suction_enabled?: boolean;    // Suction through electrode
  flush_cycle_sec?: number;     // Retract-for-flush interval
}

export interface SinkerProgramInput {
  program_number?: string;
  part_description?: string;
  material?: string;
  cavity_depth_mm?: number;     // Total cavity depth for planning
  operations: SinkerOperation[];
  // EA12D added 2026-06-25: JM Die's EDM-02 is a Mitsubishi EA12D (C30EA-2 control).
  // Without it in the union, an EA12D job fell back to the default "EA12V" header and
  // silently mis-labeled the machine identity (the lathe-identity lesson, e6b72b9e69).
  // Identity only -- pulse params stay stage-default / caller-supplied (no fabricated spec).
  machine_model?: "EA12V" | "EA12S" | "EA12D" | "EA28V";
  /** Output units: "metric" (G21, mm) or "imperial" (G20, inches). Defaults to metric. */
  units?: "metric" | "imperial";
}

export interface SinkerProgram {
  gcode_lines: string[];
  gcode_text: string;
  line_count: number;
  operation_count: number;
  electrode_count: number;      // Unique electrodes referenced
  total_burn_depth_mm: number;
  estimated_burn_time_min?: number;
  warnings: string[];
  /** U-PP-EDM-MATERIAL-WIRE: canonical EDM material key the workpiece resolved to
   *  (via src/data/edm-material-db.ts). Lets programmatic consumers/UI show what the
   *  raw material string mapped to. Advisory metadata -- does not affect emitted G-code. */
  material_resolved?: string;
}

// ── Stage defaults (Mitsubishi EA12V E-pack approximations) ───────────

interface StageDefaults {
  peak_current: number;   // A
  on_time: number;        // µs
  off_time: number;       // µs
  gap_voltage: number;    // V
  duty_cycle: number;     // 0-1
  flush_pressure: number; // bar
  orbit_radius: number;   // mm typical
}

const STAGE_DEFAULTS: Record<SinkerBurnStage, StageDefaults> = {
  rough:        { peak_current: 32, on_time: 200, off_time: 50, gap_voltage: 60, duty_cycle: 0.8, flush_pressure: 3.0, orbit_radius: 0.30 },
  semi_finish:  { peak_current: 12, on_time: 50,  off_time: 25, gap_voltage: 50, duty_cycle: 0.7, flush_pressure: 1.5, orbit_radius: 0.12 },
  finish:       { peak_current: 4,  on_time: 10,  off_time: 8,  gap_voltage: 40, duty_cycle: 0.5, flush_pressure: 0.5, orbit_radius: 0.05 },
  super_finish: { peak_current: 1,  on_time: 3,   off_time: 4,  gap_voltage: 30, duty_cycle: 0.4, flush_pressure: 0.2, orbit_radius: 0.02 },
};

// ── Unit conversion helpers (U-WGAP01: Imperial support) ─────────────────

/** Scale factor for coordinates: 1.0 for metric (mm), 1/25.4 for imperial (inches) */
function coordScale(units?: "metric" | "imperial"): number {
  return units === "imperial" ? 1.0 / 25.4 : 1.0;
}

/** G-code for units: G20 for imperial, G21 for metric */
function unitCode(units?: "metric" | "imperial"): string {
  return units === "imperial" ? "G20" : "G21";
}

/** Label for units: "INCH" or "METRIC" */
function unitLabel(units?: "metric" | "imperial"): string {
  return units === "imperial" ? "INCH" : "METRIC";
}

/** Format coordinate with scale */
function formatCoord(value: number, decimals: number, scale: number): string {
  return (value * scale).toFixed(decimals);
}

// ── Engine ─────────────────────────────────────────────────────────────

/** U-PP-NONFINITE-EMIT-SWEEP: numeric op fields that feed an emitted coordinate token
 *  (start X/Y/Z, plunge depth, retract, over-burn, orbit radius). A present-but-non-finite
 *  value formats into a literal `XNaN`/`ZInfinity` the Mitsubishi sinker control rejects --
 *  the `?? default` fallbacks only catch null/undefined, NOT NaN/Infinity. Returns the
 *  offending field=value pairs so the op can be HALTED (fail loud), never silently emit a
 *  wrong-but-valid coord. Sibling of the OkumaB250/OkumaOSP/HurcoV11/Mitsubishi/PPOkuma/
 *  PPWireEDM/FiveAxis fixes (R15 apply-to-all). Absent fields are not flagged. */
function nonFiniteSinkerEmitFields(op: SinkerOperation): string[] {
  const FIELDS = [
    "start_x", "start_y", "start_z",
    "target_depth_mm", "retract_depth_mm", "over_burn_mm", "orbit_radius_mm",
  ] as const;
  const bad: string[] = [];
  for (const f of FIELDS) {
    const v = (op as unknown as Record<string, unknown>)[f];
    if (typeof v === "number" && !Number.isFinite(v)) bad.push(`${f}=${v}`);
  }
  return bad;
}

/** U-PP-EDM-MATERIAL-WIRE: resolve the workpiece material against the canonical EDM
 *  material DB (single source of truth -- src/data/edm-material-db.ts), the same DB
 *  EDMBiMaterialCompensationEngine + PostProcessorComprehensiveKnowledgeEngine consume.
 *  Returns a GUARANTEED-valid multi-pass props bucket: `resolveEDMMaterial` can hand
 *  back a die-steel GRADE (H13/D2/A2/S7/M2) that lives ONLY in the bi-material table,
 *  NOT in EDM_MULTIPASS_MATERIALS -- so those map to the `tool_steel` bucket (all are
 *  hardenable die steels JM Die burns); any other miss falls back to `steel`. Never
 *  undefined, never throws. This drives ADVISORY output only (header comments /
 *  warnings / burn-time estimate) -- it NEVER alters the emitted pulse params
 *  (IP/ON/OF/SV) or motion blocks, which stay stage-default / caller-supplied so no
 *  fabricated burn energy ever reaches real iron. */
const DIE_STEEL_GRADES = new Set(["H13", "D2", "A2", "S7", "M2"]);
function resolveSinkerMaterialProps(material: string): {
  key: string;
  multipass: EDMMultiPassMaterialProps;
  bi: EDMBiMaterialProps;
} {
  const resolved = resolveEDMMaterial(material);
  let key = resolved;
  if (!EDM_MULTIPASS_MATERIALS[key]) {
    key = DIE_STEEL_GRADES.has(resolved) ? "tool_steel" : "steel";
  }
  // Bi-material thermal props (machinability / melting point) for the header advisory. The bi
  // table is keyed by GRADE (H13/D2/A2/S7/M2/steel/...) and has NO `tool_steel`/`hardened_steel`
  // bucket key -- so an alias die-steel grade like P20/O1/W1 (multipass bucket `tool_steel`)
  // falls back to plain STEEL bi-props, mislabeling the header (a TOOL_STEEL bucket showing
  // steel's machinability 1.00 / melt 1500C). Use H13 as the canonical die-steel thermal profile
  // for those two buckets so the displayed values are consistent with the bucket label. Grades
  // with their OWN bi entry (H13/D2/A2/S7/M2) resolve directly and are untouched; plain steel
  // (1018/4140 -> `steel` bucket) keeps its steel bi-props.
  let bi = resolveEDMBiMaterial(material);
  if ((key === "tool_steel" || key === "hardened_steel") && bi === EDM_BIMATERIAL_MATERIALS["steel"]) {
    bi = EDM_BIMATERIAL_MATERIALS["H13"];
  }
  return {
    key,
    multipass: EDM_MULTIPASS_MATERIALS[key],
    bi,
  };
}

export class PPSinkerEDMPostEngine {
  /**
   * Generate a complete sinker EDM program.
   */
  generate(input: SinkerProgramInput): SinkerProgram {
    const lines: string[] = [];
    const warnings: string[] = [];
    const progNum = input.program_number ?? "0001";
    const machine = input.machine_model ?? "EA12V";

    // Header
    lines.push(`%`);
    lines.push(`O${progNum}`);
    lines.push(`(${input.part_description ?? "SINKER EDM PROGRAM"})`);
    lines.push(`(MACHINE: MITSUBISHI ${machine})`);
    // U-PP-EDM-MATERIAL-WIRE: make the post material-aware via the canonical EDM DB.
    // ADVISORY ONLY -- these header comments + the warnings + the time estimate; the
    // emitted pulse params (IP/ON/OF/SV) and motion blocks are NOT touched.
    const rawMaterial = input.material ?? "TOOL STEEL";
    const matProps = resolveSinkerMaterialProps(rawMaterial);
    lines.push(`(MATERIAL: ${rawMaterial})`);
    lines.push(`(MAT PROPS: ${matProps.key.toUpperCase()} | MRR ${matProps.multipass.mrr_factor.toFixed(2)}x | MACHINABILITY ${matProps.bi.machinability_index.toFixed(2)} | MELT ${matProps.bi.melting_point_C}C)`);
    if (matProps.multipass.distortion_prone) {
      lines.push(`(ADVISORY: ${matProps.key.toUpperCase()} IS DISTORTION-PRONE -- STRESS-RELIEVE BEFORE FINISH, KEEP FINISH PULSE LIGHT)`);
    }
    if (matProps.multipass.flush_factor >= 1.3) {
      lines.push(`(ADVISORY: ${matProps.key.toUpperCase()} NEEDS AGGRESSIVE FLUSH (factor ${matProps.multipass.flush_factor.toFixed(2)}) -- INCREASE OFF-TIME RATIO / FLUSH PRESSURE)`);
    }
    if (input.cavity_depth_mm !== undefined) {
      lines.push(`(CAVITY DEPTH: ${input.cavity_depth_mm}mm)`);
    }
    lines.push(`(GENERATED BY PP-AGI — SINKER EDM)`);
    lines.push(``);

    // Machine setup — U-WGAP01: support imperial (G20) or metric (G21)
    const cs = coordScale(input.units);
    const dp = input.units === "imperial" ? 5 : 3; // decimal places: 5 for inch, 3 for mm
    lines.push(`G90 ${unitCode(input.units)} (ABSOLUTE, ${unitLabel(input.units)})`);
    lines.push(`G54 (WORK COORD SYSTEM)`);
    lines.push(`M80 (DIELECTRIC FILL — SUBMERGE TANK)`);
    lines.push(``);

    // Track electrodes for summary
    const electrodes = new Set<number>();
    let totalBurnDepth = 0;
    let lastElectrode = -1;

    // Process operations
    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      // U-PP-NONFINITE-EMIT-SWEEP: a non-finite coord/depth field would emit a literal
      // XNaN/ZInfinity the Mitsubishi sinker control rejects -- HALT the op's emit (fail
      // loud) + warn; never silently emit a wrong-but-valid coord (and don't let a NaN
      // depth corrupt the burn-depth summary).
      const badEmit = nonFiniteSinkerEmitFields(op);
      if (badEmit.length > 0) {
        warnings.push(`Operation ${i + 1} (${op.stage}): non-finite emit field(s) [${badEmit.join(", ")}] -- operation block replaced with an ERROR marker to avoid a literal XNaN/ZInfinity the sinker control rejects; fix the upstream setup before running.`);
        lines.push(``);
        lines.push(`(ERROR: OPERATION ${i + 1} ${op.stage.toUpperCase()} NON-FINITE ${badEmit.join(" ")} -- DO NOT RUN, REVIEW SETUP)`);
        continue;
      }
      const electrodeNum = op.electrode_number ?? 1;
      electrodes.add(electrodeNum);
      totalBurnDepth += op.target_depth_mm;

      // Validation warnings
      if (op.target_depth_mm > 50) {
        warnings.push(`Operation ${i + 1}: target depth ${op.target_depth_mm}mm exceeds 50mm — verify electrode length and flush`);
      }
      if (op.stage === "rough" && op.peak_current_a !== undefined && op.peak_current_a > 64) {
        warnings.push(`Operation ${i + 1}: peak current ${op.peak_current_a}A exceeds EA12V generator limit (64A)`);
      }
      // U-PP-EDM-MATERIAL-WIRE: material-aware over-current advisory (matters on larger
      // generators e.g. EA28V where the 64A cap above does not bind). Advisory only --
      // does not clamp the emitted current.
      if (op.peak_current_a !== undefined && op.peak_current_a > matProps.multipass.max_current_A) {
        warnings.push(`Operation ${i + 1}: peak current ${op.peak_current_a}A exceeds ${matProps.key} max safe current (${matProps.multipass.max_current_A}A at 50mm thickness) -- recast/microcrack risk`);
      }

      lines.push(``);
      lines.push(`(==== OPERATION ${i + 1}: ${op.stage.toUpperCase()} ====)`);
      if (op.electrode_name) {
        lines.push(`(ELECTRODE: ${op.electrode_name})`);
      }

      // Electrode change if different from last op
      if (electrodeNum !== lastElectrode) {
        lines.push(`M0 (ELECTRODE CHANGE — LOAD T${electrodeNum})`);
        lines.push(`T${String(electrodeNum).padStart(2, "0")} M6 (SELECT ELECTRODE ${electrodeNum})`);
        lastElectrode = electrodeNum;
      }

      // Apply stage defaults, override with op values
      const defaults = STAGE_DEFAULTS[op.stage];
      const peakI = op.peak_current_a ?? defaults.peak_current;
      const onT = op.on_time_us ?? defaults.on_time;
      const offT = op.off_time_us ?? defaults.off_time;
      const gapV = op.gap_voltage_v ?? defaults.gap_voltage;
      const duty = op.duty_cycle ?? defaults.duty_cycle;
      const flushP = op.flush_pressure_bar ?? defaults.flush_pressure;
      const polarity = op.polarity ?? "negative";

      // E-pack / condition code comment (Mitsubishi style)
      lines.push(`(COND: IP=${peakI}A ON=${onT}us OFF=${offT}us GAP=${gapV}V DUTY=${(duty * 100).toFixed(0)}%)`);
      lines.push(`(POLARITY: ${polarity.toUpperCase()} | FLUSH: ${flushP.toFixed(1)}bar)`);

      // Mitsubishi-style E-pack call (C## condition number + parameter override)
      const condNum = this.getEpackNumber(op.stage);
      lines.push(`C${condNum} (E-PACK CONDITION — ${op.stage.toUpperCase()})`);
      lines.push(`IP${peakI} (PEAK CURRENT A)`);
      lines.push(`ON${onT} (ON TIME)`);
      lines.push(`OF${offT} (OFF TIME)`);
      lines.push(`SV${gapV} (SERVO VOLTAGE)`);

      if (polarity === "positive") {
        lines.push(`M40 (POLARITY +)`);
      } else {
        lines.push(`M41 (POLARITY -)`);
      }

      // Flushing setup
      lines.push(`P${flushP.toFixed(1)} (FLUSH PRESSURE bar)`);
      if (op.suction_enabled) {
        lines.push(`M48 (ELECTRODE SUCTION ON)`);
      }

      // Position to start XY — U-WGAP01: imperial coordinate conversion
      if (op.start_x !== undefined && op.start_y !== undefined) {
        lines.push(`G0 X${formatCoord(op.start_x, dp, cs)} Y${formatCoord(op.start_y, dp, cs)} (MOVE TO XY)`);
      }

      // Move to retract plane Z
      const startZ = op.start_z ?? 5.0;
      lines.push(`G0 Z${formatCoord(startZ, dp, cs)} (RETRACT PLANE)`);

      // Compute final burn Z (going negative from start)
      const overBurn = op.over_burn_mm ?? 0;
      const finalZ = startZ - op.target_depth_mm - overBurn;

      // Orbit setup
      const orbitPat = op.orbit_pattern ?? "none";
      const orbitR = op.orbit_radius_mm ?? defaults.orbit_radius;

      if (orbitPat !== "none" && orbitR > 0) {
        lines.push(`(ORBIT: ${orbitPat.toUpperCase()} RADIUS=${formatCoord(orbitR, dp, cs)})`);
        lines.push(`${this.getOrbitCode(orbitPat)} R${formatCoord(orbitR, dp, cs)} (ORBIT ENABLE)`);
      }

      // The burn — Mitsubishi uses G81/G82 for sinker Z-plunge with servo
      const flushCycle = op.flush_cycle_sec ?? 0;
      if (flushCycle > 0) {
        // Peck-style flush: G83 analogue for EDM
        const retract = op.retract_depth_mm ?? 2.0;
        lines.push(`G83 Z${formatCoord(finalZ, dp, cs)} Q${formatCoord(retract, dp, cs)} F${flushCycle.toFixed(1)} (PECK BURN W/ FLUSH)`);
      } else {
        // Straight servo plunge
        lines.push(`G81 Z${formatCoord(finalZ, dp, cs)} (SINKER SERVO PLUNGE)`);
      }

      // Orbit revolutions if applicable
      if (orbitPat !== "none" && op.orbit_revolutions && op.orbit_revolutions > 0) {
        lines.push(`(ORBIT ${op.orbit_revolutions} REVOLUTIONS AT DEPTH)`);
        for (let r = 0; r < op.orbit_revolutions; r++) {
          lines.push(`G03 I${formatCoord(orbitR, dp, cs)} J0 (ORBIT REV ${r + 1})`);
        }
      }

      // Cancel orbit
      if (orbitPat !== "none" && orbitR > 0) {
        lines.push(`${this.getOrbitCode(orbitPat, true)} (ORBIT CANCEL)`);
      }

      // Retract
      lines.push(`G0 Z${formatCoord(startZ, dp, cs)} (RETRACT)`);

      // Flush cleanup
      if (op.suction_enabled) {
        lines.push(`M49 (SUCTION OFF)`);
      }
      lines.push(`M9 (FLUSH OFF)`);
    }

    // Program end — U-WGAP01: imperial coordinate conversion
    const retractZ = 50; // mm
    lines.push(``);
    lines.push(`G0 Z${formatCoord(retractZ, dp, cs)} (FULL RETRACT)`);
    lines.push(`M81 (DIELECTRIC DRAIN)`);
    lines.push(`M30`);
    lines.push(`%`);

    // Rough time estimate
    // Heuristic: rough MRR ~200mm³/min, each stage slower by 5x
    let estBurnTime: number | undefined;
    if (input.operations.length > 0) {
      // U-PP-EDM-MATERIAL-WIRE: scale the heuristic by the workpiece MRR factor --
      // carbide (~0.35x) burns ~3x slower than steel; copper/graphite faster. A
      // non-finite depth (a halted op above) contributes 0 so the estimate never NaNs.
      const mrrFactor = matProps.multipass.mrr_factor;
      const timeByOp = input.operations.map(op => {
        if (!Number.isFinite(op.target_depth_mm)) return 0;
        const baseMRR = { rough: 200, semi_finish: 40, finish: 8, super_finish: 1 }[op.stage] * mrrFactor;
        const volume = op.target_depth_mm * 100; // Assume 100mm² cross-section
        return volume / baseMRR;
      });
      estBurnTime = Math.round(timeByOp.reduce((a, b) => a + b, 0));
    }

    return {
      gcode_lines: lines,
      gcode_text: lines.join("\n"),
      line_count: lines.length,
      operation_count: input.operations.length,
      electrode_count: electrodes.size,
      total_burn_depth_mm: totalBurnDepth,
      estimated_burn_time_min: estBurnTime,
      warnings,
      material_resolved: matProps.key,
    };
  }

  /**
   * Generate a standard 3-stage burn (rough → semi-finish → finish).
   */
  generateStandard3Stage(
    cavityDepth: number,
    material = "H13",
    machineModel: "EA12V" | "EA12S" | "EA28V" = "EA12V",
  ): SinkerProgram {
    return this.generate({
      machine_model: machineModel,
      material,
      cavity_depth_mm: cavityDepth,
      part_description: `${material} STANDARD 3-STAGE`,
      operations: [
        {
          stage: "rough", electrode_number: 1, electrode_name: "ROUGH_GRAPHITE",
          target_depth_mm: cavityDepth - 0.15,
          orbit_pattern: "circle", orbit_radius_mm: 0.30,
          start_z: 2, flush_cycle_sec: 5, retract_depth_mm: 2,
          suction_enabled: true,
        },
        {
          stage: "semi_finish", electrode_number: 2, electrode_name: "SEMI_GRAPHITE",
          target_depth_mm: cavityDepth - 0.03,
          orbit_pattern: "circle", orbit_radius_mm: 0.12,
          start_z: 2, flush_cycle_sec: 3, retract_depth_mm: 1,
        },
        {
          stage: "finish", electrode_number: 3, electrode_name: "FINISH_COPPER",
          target_depth_mm: cavityDepth,
          orbit_pattern: "circle", orbit_radius_mm: 0.05,
          start_z: 2, flush_cycle_sec: 0, // continuous for finish
        },
      ],
    });
  }

  /**
   * Get E-pack / condition number for stage (Mitsubishi convention).
   */
  getEpackNumber(stage: SinkerBurnStage): number {
    const mapping: Record<SinkerBurnStage, number> = {
      rough: 100,
      semi_finish: 200,
      finish: 300,
      super_finish: 400,
    };
    return mapping[stage];
  }

  /**
   * Get G-code for orbit pattern.
   */
  getOrbitCode(pattern: OrbitPattern, cancel = false): string {
    if (cancel) return "G40.1";
    const mapping: Record<OrbitPattern, string> = {
      none: "",
      circle: "G41.1",       // Mitsubishi circular orbit
      square: "G41.2",       // Square orbit
      cross: "G41.3",        // Cross orbit
      star: "G41.4",         // Star orbit
      planetary: "G41.5",    // Planetary (spiral)
    };
    return mapping[pattern] ?? "G41.1";
  }

  /**
   * Get stage defaults.
   */
  getStageDefaults(stage: SinkerBurnStage): StageDefaults {
    return STAGE_DEFAULTS[stage];
  }

  /**
   * List supported stages.
   */
  listStages(): SinkerBurnStage[] {
    return ["rough", "semi_finish", "finish", "super_finish"];
  }

  /**
   * List supported orbit patterns.
   */
  listOrbitPatterns(): OrbitPattern[] {
    return ["none", "circle", "square", "cross", "star", "planetary"];
  }
}

export const ppSinkerEDMPostEngine = new PPSinkerEDMPostEngine();
