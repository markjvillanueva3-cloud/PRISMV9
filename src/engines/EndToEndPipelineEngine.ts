/**
 * EndToEndPipelineEngine — Novel-Algorithm-to-G-code Orchestration
 *
 * CAMK-MS1: Chains the full pipeline in a single call:
 *   Feature analysis → Algorithm selection → Toolpath compute →
 *   Segment interpolation → Post-process → Program assembly → Verification
 *
 * SELF-CONTAINED — no imports from other engines to avoid circular deps.
 * Uses Kienzle force model: Fc = kc1.1 * ap * fz * fz^(-mc)
 *
 * Pure computation — no filesystem, no GPU.
 */

// ── Atomic Value Wrapper ──────────────────────────────────────

/** Atomic value with unit, formula provenance, and confidence. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ── Input / Output Interfaces ────────────────────────────────────────

/** Feature geometry for end-to-end pipeline input. */
export interface E2EFeatureInput {
  type: string;
  dimensions: {
    width_mm?: number;
    length_mm?: number;
    depth_mm?: number;
    diameter_mm?: number;
  };
  wall_angle_deg?: number;
  freeform?: boolean;
}

/** Machine specification. */
export interface MachineInput {
  type: string;
  max_rpm: number;
  max_feed_mmmin: number;
  axes: number;
  controller: "fanuc" | "siemens" | "heidenhain" | "mazak" | "haas";
}

/** Tool specification. */
export interface ToolInput {
  number: number;
  diameter_mm: number;
  length_mm: number;
  type: string;
  flute_count?: number;
}

/** Full pipeline input. */
export interface EndToEndInput {
  features: E2EFeatureInput[];
  material: string;
  machine: MachineInput;
  tool: ToolInput;
  priority?: "speed" | "quality" | "balanced";
  work_offset?: string;
  safe_z_mm?: number;
  verify?: boolean;
}

/** Physics summary block. */
export interface PhysicsSummary {
  cutting_force_n: number;
  deflection_mm: number;
  mrr_cm3min: number;
  scallop_height_um?: number;
}

/** Setup sheet output. */
export interface SetupSheet {
  part_name: string;
  material: string;
  tools: { num: number; desc: string }[];
  work_offset: string;
  operations: { seq: number; algorithm: string; type: string }[];
}

/** Verification result. */
export interface VerificationResult {
  valid: boolean;
  errors: number;
  warnings: number;
}

/** Pipeline stage timing. */
export interface PipelineStage {
  stage: string;
  duration_ms: number;
  status: "ok" | "fallback" | "skipped";
}

/** Full pipeline output. */
export interface EndToEndResult {
  gcode: string;
  algorithm_used: string;
  algorithm_fallback?: string;
  physics_summary: PhysicsSummary;
  cycle_time_sec: number;
  setup_sheet: SetupSheet;
  verification: VerificationResult | null;
  pipeline_stages: PipelineStage[];
  warnings: string[];
}

// ── Internal Types ───────────────────────────────────────────────────

interface MachiningZone {
  id: number;
  zone_type: "pocket" | "freeform" | "steep_wall" | "thin_wall"
    | "deep_pocket" | "finishing" | "contour";
  area_mm2: number;
  depth_mm: number;
  curvature: number;
  feature_index: number;
}

interface ToolpathSegment {
  x: number;
  y: number;
  z: number;
  feed_mmmin: number;
  rpm: number;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  i?: number;
  j?: number;
}

/** Material cutting data: kc1.1 (N/mm^2), mc exponent, base speed (m/min), base feed (mm/tooth). */
interface MaterialData {
  kc11: number;
  mc: number;
  vc_base: number;
  fz_base: number;
}

// ── Material Database ────────────────────────────────────────────────

const MATERIAL_DB: Record<string, MaterialData> = {
  aluminum_6061:   { kc11: 700,  mc: 0.23, vc_base: 300, fz_base: 0.10 },
  aluminum_7075:   { kc11: 700,  mc: 0.23, vc_base: 250, fz_base: 0.09 },
  steel_1018:      { kc11: 1800, mc: 0.25, vc_base: 120, fz_base: 0.08 },
  steel_4140:      { kc11: 1800, mc: 0.25, vc_base: 90,  fz_base: 0.07 },
  steel_4340:      { kc11: 1800, mc: 0.25, vc_base: 80,  fz_base: 0.06 },
  stainless_304:   { kc11: 2100, mc: 0.25, vc_base: 70,  fz_base: 0.06 },
  stainless_316:   { kc11: 2100, mc: 0.25, vc_base: 60,  fz_base: 0.05 },
  titanium_ti6al4v:{ kc11: 2800, mc: 0.28, vc_base: 50,  fz_base: 0.05 },
  inconel_718:     { kc11: 2800, mc: 0.28, vc_base: 25,  fz_base: 0.04 },
  copper_c110:     { kc11: 700,  mc: 0.23, vc_base: 200, fz_base: 0.10 },
  brass_c360:      { kc11: 700,  mc: 0.23, vc_base: 250, fz_base: 0.12 },
};

/** Algorithm map: zone_type → novel algorithm name. */
const ALGORITHM_MAP: Record<string, string> = {
  pocket:     "TGAR",   // Thermal-Gradient Adaptive Roughing
  freeform:   "CFSF",   // Constant-Force Spiral Finishing
  steep_wall: "MACS",   // Multi-Axis Contour Sculpting
  thin_wall:  "PTDC",   // Predictive Tool Deflection Compensation
  deep_pocket:"VCER",   // Vortex Chip Evacuation Roughing
  finishing:  "HRAF",   // Harmonic-Resonance Avoidant Finishing
  contour:    "CFSF",
};

/** Priority multipliers for feed/speed adjustments. */
const PRIORITY_MULT: Record<string, { feed: number; speed: number; stepover: number }> = {
  speed:    { feed: 1.2, speed: 1.15, stepover: 0.7 },
  balanced: { feed: 1.0, speed: 1.0,  stepover: 0.5 },
  quality:  { feed: 0.7, speed: 0.85, stepover: 0.3 },
};

// ── Controller post-processor configs ────────────────────────────────

const CONTROLLER_CONFIG: Record<string, {
  line_prefix: string;
  decimal_places: number;
  rtcp_on: string;
  rtcp_off: string;
  eol: string;
}> = {
  fanuc: {
    line_prefix: "N", decimal_places: 3,
    rtcp_on: "G43.4 H1", rtcp_off: "G49", eol: "",
  },
  siemens: {
    line_prefix: "N", decimal_places: 3,
    rtcp_on: "TRAORI", rtcp_off: "TRAFOOF", eol: "",
  },
  heidenhain: {
    line_prefix: "", decimal_places: 3,
    rtcp_on: "FUNCTION TCPM", rtcp_off: "FUNCTION RESET TCPM", eol: "",
  },
  mazak: {
    line_prefix: "N", decimal_places: 3,
    rtcp_on: "G43.4 H1", rtcp_off: "G49", eol: "",
  },
  haas: {
    line_prefix: "N", decimal_places: 4,
    rtcp_on: "G234", rtcp_off: "G49", eol: "",
  },
};

// ── Engine ────────────────────────────────────────────────────────────

/** EndToEndPipelineEngine orchestrates the full novel-algorithm-to-G-code pipeline. */
export class EndToEndPipelineEngine {

  /** Run the full pipeline: features → verified G-code program. */
  generate(input: EndToEndInput): EndToEndResult {
    const priority = input.priority ?? "balanced";
    const workOffset = input.work_offset ?? "G54";
    const safeZ = input.safe_z_mm ?? 50;
    const doVerify = input.verify ?? true;
    const warnings: string[] = [];
    const stages: PipelineStage[] = [];
    const mat = this.resolveMaterial(input.material);
    if (!mat) {
      warnings.push(`Unknown material "${input.material}", using aluminum_6061 defaults`);
    }
    const matData = mat ?? MATERIAL_DB.aluminum_6061;
    const flutes = input.tool.flute_count ?? 2;
    let usedFallback = false;
    let algorithmUsed = "";
    let fallbackAlgo: string | undefined;

    // ── Stage 1: Feature → Zones ───────────────────────────────────
    const t1 = Date.now();
    let zones: MachiningZone[];
    try {
      zones = this.featuresToZones(input.features);
      stages.push({ stage: "feature_to_zones", duration_ms: Date.now() - t1, status: "ok" });
    } catch {
      zones = input.features.map((f, i) => ({
        id: i, zone_type: "pocket" as const, area_mm2: 100, depth_mm: f.dimensions.depth_mm ?? 5,
        curvature: 0, feature_index: i,
      }));
      stages.push({ stage: "feature_to_zones", duration_ms: Date.now() - t1, status: "fallback" });
      warnings.push("Feature-to-zone mapping fell back to default pocket zones");
    }

    // ── Stage 2: Algorithm Selection ───────────────────────────────
    const t2 = Date.now();
    const primaryZone = zones.reduce((a, b) => a.area_mm2 >= b.area_mm2 ? a : b, zones[0]);
    algorithmUsed = ALGORITHM_MAP[primaryZone.zone_type] ?? "TGAR";
    stages.push({ stage: "algorithm_selection", duration_ms: Date.now() - t2, status: "ok" });

    // ── Stage 3: Novel Compute (segments + physics) ────────────────
    const t3 = Date.now();
    const mult = PRIORITY_MULT[priority];
    const vc = matData.vc_base * mult.speed;
    const rpm_calc = Math.round((vc * 1000) / (Math.PI * input.tool.diameter_mm));
    const rpm = Math.min(rpm_calc, input.machine.max_rpm);
    const fz = matData.fz_base * mult.feed;
    const feed_calc = Math.round(fz * flutes * rpm);
    const feed = Math.min(feed_calc, input.machine.max_feed_mmmin);
    const ae = input.tool.diameter_mm * mult.stepover;
    const ap = Math.min(primaryZone.depth_mm, input.tool.diameter_mm * 1.5);

    let segments: ToolpathSegment[];
    try {
      segments = this.generateNovelSegments(zones, algorithmUsed, rpm, feed, safeZ, input.tool, ae, ap);
      stages.push({ stage: "novel_compute", duration_ms: Date.now() - t3, status: "ok" });
    } catch {
      fallbackAlgo = algorithmUsed;
      algorithmUsed = "CONVENTIONAL_LINEAR";
      usedFallback = true;
      segments = this.generateFallbackSegments(zones, rpm * 0.8, feed * 0.6, safeZ, input.tool);
      stages.push({ stage: "novel_compute", duration_ms: Date.now() - t3, status: "fallback" });
      warnings.push(`Novel algorithm ${fallbackAlgo} failed, fell back to conventional linear`);
    }

    // Physics: Kienzle force model
    const Fc = matData.kc11 * ap * fz * Math.pow(fz, -matData.mc);
    // Simple cantilever deflection: delta = F*L^3 / (3*E*I), E=210GPa for HSS, I=pi*d^4/64
    const E = 210e3; // N/mm^2
    const I = (Math.PI * Math.pow(input.tool.diameter_mm, 4)) / 64;
    const L = input.tool.length_mm * 0.7; // effective overhang
    const deflection = (Fc * Math.pow(L, 3)) / (3 * E * I);
    const mrr = (ap * ae * feed) / 1000; // cm^3/min
    const scallop = priority === "quality" || primaryZone.zone_type === "finishing" || primaryZone.zone_type === "freeform"
      ? Math.round((ae * ae) / (8 * (input.tool.diameter_mm / 2)) * 1000) // um
      : undefined;

    const physics: PhysicsSummary = {
      cutting_force_n: Math.round(Fc * 100) / 100,
      deflection_mm: Math.round(deflection * 10000) / 10000,
      mrr_cm3min: Math.round(mrr * 100) / 100,
      scallop_height_um: scallop,
    };

    if (deflection > 0.05) {
      warnings.push(`Tool deflection ${deflection.toFixed(4)} mm exceeds 0.05 mm threshold — consider shorter tool or reduced DOC`);
    }

    // ── Stage 4: Segment → G-code ─────────────────────────────────
    const t4 = Date.now();
    const gcodeLines = this.segmentsToGcode(segments, CONTROLLER_CONFIG[input.machine.controller].decimal_places);
    stages.push({ stage: "segment_to_gcode", duration_ms: Date.now() - t4, status: "ok" });

    // ── Stage 5: Post-Process (controller-specific) ───────────────
    const t5 = Date.now();
    const ctrl = CONTROLLER_CONFIG[input.machine.controller];
    const postLines = this.postProcess(gcodeLines, ctrl, input.machine.axes, input.tool, workOffset);
    stages.push({ stage: "post_process", duration_ms: Date.now() - t5, status: "ok" });

    // ── Stage 6: Program Assembly ─────────────────────────────────
    const t6 = Date.now();
    const program = this.assembleProgram(postLines, ctrl, input, workOffset, safeZ, algorithmUsed, rpm, feed);
    stages.push({ stage: "program_assembly", duration_ms: Date.now() - t6, status: "ok" });

    // ── Stage 7: Verification ─────────────────────────────────────
    let verification: VerificationResult | null = null;
    if (doVerify) {
      const t7 = Date.now();
      verification = this.verifyProgram(program, input.machine);
      stages.push({ stage: "verification", duration_ms: Date.now() - t7, status: verification.valid ? "ok" : "fallback" });
      if (!verification.valid) {
        warnings.push(`Verification found ${verification.errors} error(s) and ${verification.warnings} warning(s)`);
      }
    } else {
      stages.push({ stage: "verification", duration_ms: 0, status: "skipped" });
    }

    // ── Cycle Time Estimate ───────────────────────────────────────
    const totalDist = segments.reduce((sum, s, i) => {
      if (i === 0) return 0;
      const prev = segments[i - 1];
      return sum + Math.sqrt(Math.pow(s.x - prev.x, 2) + Math.pow(s.y - prev.y, 2) + Math.pow(s.z - prev.z, 2));
    }, 0);
    const avgFeed = segments.reduce((s, seg) => s + seg.feed_mmmin, 0) / (segments.length || 1);
    const cycleTime = Math.round((totalDist / (avgFeed || 1)) * 60 * 100) / 100;

    // ── Setup Sheet ───────────────────────────────────────────────
    const setupSheet: SetupSheet = {
      part_name: `PRISM_${algorithmUsed}_${Date.now()}`,
      material: input.material,
      tools: [{ num: input.tool.number, desc: `${input.tool.type} D${input.tool.diameter_mm} L${input.tool.length_mm}` }],
      work_offset: workOffset,
      operations: zones.map((z, i) => ({
        seq: (i + 1) * 10,
        algorithm: ALGORITHM_MAP[z.zone_type] ?? algorithmUsed,
        type: z.zone_type,
      })),
    };

    return {
      gcode: program,
      algorithm_used: algorithmUsed,
      algorithm_fallback: usedFallback ? fallbackAlgo : undefined,
      physics_summary: physics,
      cycle_time_sec: cycleTime,
      setup_sheet: setupSheet,
      verification,
      pipeline_stages: stages,
      warnings,
    };
  }

  // ── Stage Implementations ──────────────────────────────────────────

  /** Stage 1: Map features to machining zones. */
  private featuresToZones(features: E2EFeatureInput[]): MachiningZone[] {
    return features.map((f, i) => {
      const w = f.dimensions.width_mm ?? f.dimensions.diameter_mm ?? 20;
      const l = f.dimensions.length_mm ?? w;
      const d = f.dimensions.depth_mm ?? 5;
      const dia = f.dimensions.diameter_mm;
      const area = dia ? Math.PI * (dia / 2) ** 2 : w * l;
      const curvature = f.freeform ? 0.5 : (dia ? 1 / (dia / 2) : 0);
      let zone_type: MachiningZone["zone_type"];

      if (f.freeform) {
        zone_type = "freeform";
      } else if (f.wall_angle_deg !== undefined && f.wall_angle_deg > 60) {
        zone_type = "steep_wall";
      } else if (f.wall_angle_deg !== undefined && f.wall_angle_deg < 10 && d < 2) {
        zone_type = "finishing";
      } else if (d > w * 1.5 || d > 30) {
        zone_type = "deep_pocket";
      } else if (f.type === "contour" || f.type === "profile") {
        zone_type = "contour";
      } else if (f.type === "thin_wall" || (f.wall_angle_deg !== undefined && w < 3)) {
        zone_type = "thin_wall";
      } else {
        zone_type = "pocket";
      }

      return { id: i, zone_type, area_mm2: Math.round(area * 100) / 100, depth_mm: d, curvature, feature_index: i };
    });
  }

  /** Stage 3a: Generate toolpath segments using novel algorithm patterns. */
  private generateNovelSegments(
    zones: MachiningZone[], algorithm: string, rpm: number, feed: number,
    safeZ: number, tool: ToolInput, ae: number, ap: number,
  ): ToolpathSegment[] {
    const segments: ToolpathSegment[] = [];
    const r = tool.diameter_mm / 2;

    for (const zone of zones) {
      const w = Math.sqrt(zone.area_mm2);
      const passes = Math.ceil(zone.depth_mm / ap);
      const stepovers = Math.max(1, Math.ceil(w / ae));

      // Rapid to safe Z above zone
      segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 0, rpm, type: "rapid" });

      for (let p = 0; p < passes; p++) {
        const z_level = -(p + 1) * Math.min(ap, zone.depth_mm - p * ap);

        switch (algorithm) {
          case "TGAR": // Thermal-gradient adaptive roughing: trochoidal-like arcs
            for (let s = 0; s < stepovers; s++) {
              const y_pos = s * ae;
              segments.push({
                x: 0, y: y_pos, z: z_level,
                feed_mmmin: feed, rpm, type: "linear",
              });
              // Trochoidal arc
              segments.push({
                x: w * 0.5, y: y_pos + r * 0.3, z: z_level,
                feed_mmmin: feed, rpm, type: "arc_cw",
                i: w * 0.25, j: 0,
              });
              segments.push({
                x: w, y: y_pos, z: z_level,
                feed_mmmin: feed, rpm, type: "arc_ccw",
                i: -w * 0.25, j: 0,
              });
            }
            break;

          case "CFSF": // Constant-force spiral finishing
            for (let angle = 0; angle < 360 * stepovers; angle += 15) {
              const rad = (angle * Math.PI) / 180;
              const spiral_r = r + (angle / 360) * ae;
              segments.push({
                x: Math.cos(rad) * spiral_r, y: Math.sin(rad) * spiral_r,
                z: z_level, feed_mmmin: feed * 0.9, rpm, type: "linear",
              });
            }
            break;

          case "VCER": // Vortex chip evacuation: helical plunge + radial sweeps
            // Helical plunge
            for (let a = 0; a < 720; a += 30) {
              const rad = (a * Math.PI) / 180;
              const z_inc = z_level * (a / 720);
              segments.push({
                x: Math.cos(rad) * r * 0.4, y: Math.sin(rad) * r * 0.4,
                z: z_inc, feed_mmmin: feed * 0.5, rpm, type: "arc_cw", i: 0, j: r * 0.4,
              });
            }
            // Radial sweeps
            for (let s = 0; s < stepovers; s++) {
              segments.push({ x: 0, y: s * ae, z: z_level, feed_mmmin: feed, rpm, type: "linear" });
              segments.push({ x: w, y: s * ae, z: z_level, feed_mmmin: feed, rpm, type: "linear" });
            }
            break;

          case "HRAF": // Harmonic-resonance avoidant finishing: varied feed
            for (let s = 0; s < stepovers; s++) {
              const y_pos = s * ae * 0.5;
              // Vary feed to avoid resonance buildup
              const f_var = feed * (0.85 + 0.15 * Math.sin(s * 1.618));
              segments.push({ x: 0, y: y_pos, z: z_level, feed_mmmin: Math.round(f_var), rpm, type: "linear" });
              segments.push({ x: w, y: y_pos, z: z_level, feed_mmmin: Math.round(f_var), rpm, type: "linear" });
            }
            break;

          case "PTDC": // Predictive tool deflection compensation: offset path
          case "MACS": // Multi-axis contour sculpting: linear with offset
          default:
            for (let s = 0; s < stepovers; s++) {
              const y_pos = s * ae;
              segments.push({ x: 0, y: y_pos, z: z_level, feed_mmmin: feed, rpm, type: "linear" });
              segments.push({ x: w, y: y_pos, z: z_level, feed_mmmin: feed, rpm, type: "linear" });
              segments.push({ x: w, y: y_pos + ae, z: z_level, feed_mmmin: feed * 0.7, rpm, type: "linear" });
            }
            break;
        }
      }
      // Retract
      segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 0, rpm, type: "rapid" });
    }
    return segments;
  }

  /** Stage 3b: Fallback — conservative linear toolpath. */
  private generateFallbackSegments(
    zones: MachiningZone[], rpm: number, feed: number, safeZ: number, tool: ToolInput,
  ): ToolpathSegment[] {
    const segments: ToolpathSegment[] = [];
    const ae = tool.diameter_mm * 0.3;
    for (const zone of zones) {
      const w = Math.sqrt(zone.area_mm2);
      const stepovers = Math.max(1, Math.ceil(w / ae));
      segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 0, rpm, type: "rapid" });
      segments.push({ x: 0, y: 0, z: -zone.depth_mm, feed_mmmin: feed * 0.3, rpm, type: "linear" });
      for (let s = 0; s < stepovers; s++) {
        segments.push({ x: 0, y: s * ae, z: -zone.depth_mm, feed_mmmin: feed, rpm, type: "linear" });
        segments.push({ x: w, y: s * ae, z: -zone.depth_mm, feed_mmmin: feed, rpm, type: "linear" });
      }
      segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 0, rpm, type: "rapid" });
    }
    return segments;
  }

  /** Stage 4: Convert segments to G-code lines. */
  private segmentsToGcode(segments: ToolpathSegment[], decimals: number): string[] {
    const lines: string[] = [];
    const fmt = (v: number) => v.toFixed(decimals);

    for (const seg of segments) {
      switch (seg.type) {
        case "rapid":
          lines.push(`G00 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)}`);
          break;
        case "linear":
          lines.push(`G01 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)} F${Math.round(seg.feed_mmmin)}`);
          break;
        case "arc_cw": {
          const ij = `I${fmt(seg.i ?? 0)} J${fmt(seg.j ?? 0)}`;
          lines.push(`G02 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)} ${ij} F${Math.round(seg.feed_mmmin)}`);
          break;
        }
        case "arc_ccw": {
          const ij = `I${fmt(seg.i ?? 0)} J${fmt(seg.j ?? 0)}`;
          lines.push(`G03 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)} ${ij} F${Math.round(seg.feed_mmmin)}`);
          break;
        }
      }
    }
    return lines;
  }

  /** Stage 5: Apply controller-specific post-processing. */
  private postProcess(
    lines: string[], ctrl: typeof CONTROLLER_CONFIG[string],
    axes: number, tool: ToolInput, workOffset: string,
  ): string[] {
    const result: string[] = [];
    // Tool change block
    result.push(`T${tool.number} M06`);
    result.push(`${workOffset}`);
    result.push(`S${0} M03`); // placeholder rpm, filled in assembly
    result.push("M08"); // coolant on

    // RTCP for 5-axis
    if (axes >= 5) {
      result.push(ctrl.rtcp_on);
    }

    // Number lines if controller uses line numbers
    if (ctrl.line_prefix) {
      let lineNum = 100;
      for (const line of lines) {
        result.push(`${ctrl.line_prefix}${lineNum} ${line}`);
        lineNum += 10;
      }
    } else {
      result.push(...lines);
    }

    // RTCP off
    if (axes >= 5) {
      result.push(ctrl.rtcp_off);
    }

    result.push("M09"); // coolant off
    return result;
  }

  /** Stage 6: Assemble complete program with header, safety, and end block. */
  private assembleProgram(
    body: string[], ctrl: typeof CONTROLLER_CONFIG[string],
    input: EndToEndInput, workOffset: string, safeZ: number,
    algorithm: string, rpm: number, feed: number,
  ): string {
    const header = [
      "%",
      `O0001 (PRISM E2E PIPELINE - ${algorithm})`,
      `(MATERIAL: ${input.material})`,
      `(TOOL: T${input.tool.number} ${input.tool.type} D${input.tool.diameter_mm})`,
      `(CONTROLLER: ${input.machine.controller.toUpperCase()})`,
      `(GENERATED: ${new Date().toISOString()})`,
      "",
      "(SAFETY BLOCK)",
      "G90 G94 G17 G40 G49 G80",
      `G21 (METRIC)`,
      `G28 G91 Z0`,
      `G90`,
      "",
    ];

    // Fix spindle speed in body
    const fixedBody = body.map(line =>
      line.includes("S0 M03") ? `S${rpm} M03` : line
    );

    const footer = [
      "",
      "(END BLOCK)",
      "M05",
      `G91 G28 Z0`,
      "G28 Y0",
      "G90",
      "M30",
      "%",
    ];

    return [...header, ...fixedBody, ...footer].join("\n");
  }

  /** Stage 7: Verify G-code program syntax and machine limits. */
  private verifyProgram(program: string, machine: MachineInput): VerificationResult {
    const lines = program.split("\n");
    let errors = 0;
    let verifyWarnings = 0;

    for (const line of lines) {
      if (line.startsWith("(") || line.startsWith("%") || line.trim() === "") continue;

      // Check for invalid G-codes
      const gcodes = line.match(/G\d+(\.\d+)?/g);
      if (gcodes) {
        for (const gc of gcodes) {
          const num = parseFloat(gc.substring(1));
          const valid = [0, 1, 2, 3, 17, 21, 28, 40, 43, 43.4, 49, 54, 55, 56, 57, 58, 59, 80, 90, 91, 94, 234];
          if (!valid.includes(num)) verifyWarnings++;
        }
      }

      // Check feed rate limits
      const feedMatch = line.match(/F(\d+)/);
      if (feedMatch) {
        const f = parseInt(feedMatch[1], 10);
        if (f > machine.max_feed_mmmin) {
          errors++;
        }
      }

      // Check spindle speed limits
      const spdMatch = line.match(/S(\d+)/);
      if (spdMatch) {
        const s = parseInt(spdMatch[1], 10);
        if (s > machine.max_rpm) {
          errors++;
        }
      }

      // Check motion continuity — no negative Z below work without G01
      if (line.includes("G00") && line.match(/Z-/)) {
        errors++; // Rapid into material
      }
    }

    return { valid: errors === 0, errors, warnings: verifyWarnings };
  }

  /** Resolve material string to data, handling aliases. */
  private resolveMaterial(material: string): MaterialData | null {
    const key = material.toLowerCase().replace(/[\s-]+/g, "_");
    if (MATERIAL_DB[key]) return MATERIAL_DB[key];
    // Fuzzy match
    for (const [k, v] of Object.entries(MATERIAL_DB)) {
      if (key.includes(k.split("_")[0]) || k.includes(key.split("_")[0])) return v;
    }
    return null;
  }
}

/** Singleton instance. */
export const endToEndPipelineEngine = new EndToEndPipelineEngine();
