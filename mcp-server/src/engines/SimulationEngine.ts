/**
 * SimulationEngine — CNC Machining Simulation
 *
 * L2-P0-MS1: Ported from monolith simulation modules.
 * Provides toolpath simulation, material removal verification,
 * G-code execution modeling, and cycle time estimation.
 *
 * Does NOT produce graphics — outputs structured simulation data
 * suitable for frontend 3D visualization.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number; }

export type SimulationMode = "rapid" | "normal" | "step_by_step";
export type MoveType = "G0" | "G1" | "G2" | "G3" | "dwell" | "tool_change" | "probe";

export interface ToolDefinition {
  id: string;
  type: "endmill" | "ballnose" | "drill" | "tap" | "chamfer" | "face_mill" | "insert" | "custom";
  diameter: number;
  flute_length: number;
  total_length: number;
  corner_radius?: number;
  number_of_flutes: number;
  holder_diameter?: number;
  holder_length?: number;
}

export interface MachineDefinition {
  name: string;
  controller: string;
  axes: number;
  travel: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  max_rpm: number;
  max_feed: number;
  rapid_rate: number;
  spindle_taper: string;
}

export interface StockDefinition {
  type: "block" | "cylinder" | "custom";
  material: string;
  dimensions: { x: number; y: number; z: number };
  origin: Vec3;
}

export interface SimulatedMove {
  line_number: number;
  move_type: MoveType;
  start: Vec3;
  end: Vec3;
  feed_rate: number;
  spindle_rpm: number;
  tool_id: string;
  arc_center?: Vec3;
  arc_radius?: number;
  arc_direction?: "cw" | "ccw";
  duration_sec: number;
  distance_mm: number;
  mrr?: number;
  axial_depth?: number;
  radial_depth?: number;
}

export interface CollisionEvent {
  line_number: number;
  type: "tool_stock" | "holder_stock" | "tool_fixture" | "rapid_plunge" | "gouge" | "overtravel";
  severity: "critical" | "warning" | "info";
  position: Vec3;
  description: string;
  depth_mm?: number;
}

export interface SimulationResult {
  machine: string;
  tool_count: number;
  total_moves: number;
  rapid_moves: number;
  cutting_moves: number;
  total_distance_mm: number;
  rapid_distance_mm: number;
  cutting_distance_mm: number;
  cycle_time_sec: number;
  cutting_time_sec: number;
  rapid_time_sec: number;
  dwell_time_sec: number;
  tool_change_time_sec: number;
  max_spindle_rpm: number;
  max_feed_rate: number;
  material_removed_mm3: number;
  average_mrr: number;
  peak_mrr: number;
  moves: SimulatedMove[];
  collisions: CollisionEvent[];
  tool_usage: Array<{ tool_id: string; cutting_time_sec: number; distance_mm: number; max_rpm: number; max_feed: number }>;
  bounding_box: { min: Vec3; max: Vec3 };
  warnings: string[];
}

// ── G-code Parser Types ───────────────────────────────────────────────

interface GCodeLine {
  line_number: number;
  original: string;
  g_codes: number[];
  m_codes: number[];
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
  i?: number;
  j?: number;
  k?: number;
  r?: number;
  t?: number;
  p?: number;
  q?: number;
  l?: number;
  comment?: string;
}

interface MachineState {
  x: number; y: number; z: number;
  a: number; b: number; c: number;
  f: number; s: number;
  tool: number;
  wcs: number;
  absolute: boolean;
  metric: boolean;
  plane: "XY" | "XZ" | "YZ";
  motion: "G0" | "G1" | "G2" | "G3";
  coolant: boolean;
  spindle: "off" | "cw" | "ccw";
  cutter_comp: "off" | "left" | "right";
}

// ── Constants ─────────────────────────────────────────────────────────

const DEFAULT_TOOL_CHANGE_SEC = 8;
const DEFAULT_RAPID_RATE = 30000; // mm/min

// ── Engine ────────────────────────────────────────────────────────────

export class SimulationEngine {
  /** Parse G-code program into structured lines */
  parseGCode(program: string): GCodeLine[] {
    const rawLines = program.split(/\r?\n/);
    const parsed: GCodeLine[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line || line.startsWith("%") || line.startsWith("(") || line.startsWith(";")) continue;

      const result: GCodeLine = {
        line_number: i + 1,
        original: line,
        g_codes: [],
        m_codes: [],
      };

      // Extract comment
      const commentMatch = line.match(/\(([^)]*)\)/);
      if (commentMatch) result.comment = commentMatch[1];

      // Strip comments for parsing
      const clean = line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "").trim();

      // Parse word-address tokens
      const tokens = clean.match(/[A-Za-z][+-]?[\d.]+/g);
      if (!tokens) continue;

      for (const token of tokens) {
        const letter = token[0].toUpperCase();
        const value = parseFloat(token.slice(1));
        switch (letter) {
          case "G": result.g_codes.push(value); break;
          case "M": result.m_codes.push(value); break;
          case "X": result.x = value; break;
          case "Y": result.y = value; break;
          case "Z": result.z = value; break;
          case "A": result.a = value; break;
          case "B": result.b = value; break;
          case "C": result.c = value; break;
          case "F": result.f = value; break;
          case "S": result.s = value; break;
          case "I": result.i = value; break;
          case "J": result.j = value; break;
          case "K": result.k = value; break;
          case "R": result.r = value; break;
          case "T": result.t = value; break;
          case "P": result.p = value; break;
          case "Q": result.q = value; break;
          case "L": result.l = value; break;
          case "N": /* line label, skip */ break;
          case "O": /* program number, skip */ break;
        }
      }

      parsed.push(result);
    }

    return parsed;
  }

  /** Run full simulation of a G-code program */
  simulate(input: {
    program: string;
    machine?: Partial<MachineDefinition>;
    stock?: Partial<StockDefinition>;
    tools?: ToolDefinition[];
    tool_change_time_sec?: number;
  }): SimulationResult {
    const parsed = this.parseGCode(input.program);
    const toolChangeTime = input.tool_change_time_sec ?? DEFAULT_TOOL_CHANGE_SEC;
    const rapidRate = input.machine?.rapid_rate ?? DEFAULT_RAPID_RATE;
    const maxMachineRpm = input.machine?.max_rpm ?? 40000;
    const maxMachineFeed = input.machine?.max_feed ?? 50000;
    const machineName = input.machine?.name ?? "Generic CNC";

    // Tool lookup
    const toolMap = new Map<number, ToolDefinition>();
    if (input.tools) {
      for (let i = 0; i < input.tools.length; i++) {
        toolMap.set(i + 1, input.tools[i]);
      }
    }

    // Machine state
    const state: MachineState = {
      x: 0, y: 0, z: 0, a: 0, b: 0, c: 0,
      f: 1000, s: 0, tool: 0, wcs: 54,
      absolute: true, metric: true,
      plane: "XY", motion: "G0",
      coolant: false, spindle: "off", cutter_comp: "off",
    };

    const moves: SimulatedMove[] = [];
    const collisions: CollisionEvent[] = [];
    const warnings: string[] = [];
    const toolUsage = new Map<string, { cutting_time_sec: number; distance_mm: number; max_rpm: number; max_feed: number }>();

    let totalDistance = 0, rapidDistance = 0, cuttingDistance = 0;
    let cuttingTime = 0, rapidTime = 0, dwellTime = 0, toolChangeTimeTot = 0;
    let maxRpm = 0, maxFeed = 0, totalMRR = 0, peakMRR = 0, mrrCount = 0;
    let materialRemoved = 0;

    const bb = {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };

    for (const line of parsed) {
      // Update modal state
      for (const g of line.g_codes) {
        if (g === 0) state.motion = "G0";
        else if (g === 1) state.motion = "G1";
        else if (g === 2) state.motion = "G2";
        else if (g === 3) state.motion = "G3";
        else if (g === 17) state.plane = "XY";
        else if (g === 18) state.plane = "XZ";
        else if (g === 19) state.plane = "YZ";
        else if (g === 20) state.metric = false;
        else if (g === 21) state.metric = true;
        else if (g === 28) { /* home — move to machine zero */ }
        else if (g === 40) state.cutter_comp = "off";
        else if (g === 41) state.cutter_comp = "left";
        else if (g === 42) state.cutter_comp = "right";
        else if (g >= 54 && g <= 59) state.wcs = g;
        else if (g === 90) state.absolute = true;
        else if (g === 91) state.absolute = false;
      }

      // Handle M-codes
      for (const m of line.m_codes) {
        if (m === 3) state.spindle = "cw";
        else if (m === 4) state.spindle = "ccw";
        else if (m === 5) state.spindle = "off";
        else if (m === 6) {
          // Tool change
          if (line.t !== undefined) {
            state.tool = line.t;
            toolChangeTimeTot += toolChangeTime;
          }
        }
        else if (m === 8) state.coolant = true;
        else if (m === 9) state.coolant = false;
        else if (m === 30 || m === 2) { /* program end */ }
      }

      if (line.f !== undefined) state.f = line.f;
      if (line.s !== undefined) state.s = line.s;
      if (line.t !== undefined) state.tool = line.t;

      // Calculate target position
      const hasMotion = line.x !== undefined || line.y !== undefined || line.z !== undefined;
      if (!hasMotion && line.g_codes.length === 0) continue;

      if (hasMotion) {
        const start: Vec3 = { x: state.x, y: state.y, z: state.z };
        const targetX = state.absolute ? (line.x ?? state.x) : state.x + (line.x ?? 0);
        const targetY = state.absolute ? (line.y ?? state.y) : state.y + (line.y ?? 0);
        const targetZ = state.absolute ? (line.z ?? state.z) : state.z + (line.z ?? 0);
        const end: Vec3 = { x: targetX, y: targetY, z: targetZ };

        // Distance
        const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
        let dist: number;
        if (state.motion === "G2" || state.motion === "G3") {
          // Arc — approximate with linear distance * pi/2 factor
          const chordLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const radius = line.r ?? Math.sqrt((line.i ?? 0) ** 2 + (line.j ?? 0) ** 2);
          dist = radius > 0 ? 2 * radius * Math.asin(chordLen / (2 * radius)) : chordLen;
          if (!isFinite(dist)) dist = chordLen;
        } else {
          dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        // Time
        const feedRate = state.motion === "G0" ? rapidRate : Math.max(state.f, 1);
        const duration = dist > 0 ? (dist / feedRate) * 60 : 0;

        // MRR estimation for cutting moves
        let mrr = 0;
        if (state.motion !== "G0" && dist > 0 && state.spindle !== "off") {
          const tool = toolMap.get(state.tool);
          const toolDia = tool?.diameter ?? 10;
          const depthZ = Math.abs(dz);
          const axialDepth = depthZ > 0 ? Math.min(depthZ, toolDia) : toolDia * 0.5;
          const radialDepth = toolDia * 0.3;
          mrr = axialDepth * radialDepth * feedRate / 1000; // cm3/min approx
          materialRemoved += mrr * (duration / 60);
          totalMRR += mrr;
          mrrCount++;
          if (mrr > peakMRR) peakMRR = mrr;
        }

        const toolId = toolMap.get(state.tool)?.id ?? `T${state.tool}`;
        const move: SimulatedMove = {
          line_number: line.line_number,
          move_type: state.motion,
          start,
          end,
          feed_rate: feedRate,
          spindle_rpm: state.s,
          tool_id: toolId,
          duration_sec: duration,
          distance_mm: dist,
          mrr: mrr > 0 ? mrr : undefined,
        };

        if (state.motion === "G2" || state.motion === "G3") {
          move.arc_center = { x: start.x + (line.i ?? 0), y: start.y + (line.j ?? 0), z: start.z + (line.k ?? 0) };
          move.arc_direction = state.motion === "G2" ? "cw" : "ccw";
        }

        moves.push(move);

        // Update stats
        totalDistance += dist;
        if (state.motion === "G0") { rapidDistance += dist; rapidTime += duration; }
        else { cuttingDistance += dist; cuttingTime += duration; }

        maxRpm = Math.max(maxRpm, state.s);
        maxFeed = Math.max(maxFeed, feedRate);

        // Update bounding box
        for (const p of [start, end]) {
          bb.min.x = Math.min(bb.min.x, p.x); bb.min.y = Math.min(bb.min.y, p.y); bb.min.z = Math.min(bb.min.z, p.z);
          bb.max.x = Math.max(bb.max.x, p.x); bb.max.y = Math.max(bb.max.y, p.y); bb.max.z = Math.max(bb.max.z, p.z);
        }

        // Tool usage tracking
        if (state.motion !== "G0") {
          const usage = toolUsage.get(toolId) ?? { cutting_time_sec: 0, distance_mm: 0, max_rpm: 0, max_feed: 0 };
          usage.cutting_time_sec += duration;
          usage.distance_mm += dist;
          usage.max_rpm = Math.max(usage.max_rpm, state.s);
          usage.max_feed = Math.max(usage.max_feed, feedRate);
          toolUsage.set(toolId, usage);
        }

        // Collision checks
        if (state.motion === "G0" && dz < -5 && state.spindle === "off") {
          collisions.push({
            line_number: line.line_number,
            type: "rapid_plunge",
            severity: "critical",
            position: end,
            description: `Rapid plunge Z${dz.toFixed(1)}mm with spindle off`,
            depth_mm: Math.abs(dz),
          });
        }

        // Over-travel check
        if (input.machine?.travel) {
          const travel = input.machine.travel;
          if (Math.abs(end.x) > travel.x / 2 || Math.abs(end.y) > travel.y / 2 || Math.abs(end.z) > travel.z / 2) {
            collisions.push({
              line_number: line.line_number,
              type: "overtravel",
              severity: "critical",
              position: end,
              description: `Position exceeds machine travel limits`,
            });
          }
        }

        // RPM/feed limit checks
        if (state.s > maxMachineRpm) {
          warnings.push(`Line ${line.line_number}: RPM ${state.s} exceeds machine limit ${maxMachineRpm}`);
        }
        if (state.f > maxMachineFeed && state.motion !== "G0") {
          warnings.push(`Line ${line.line_number}: Feed ${state.f} exceeds machine limit ${maxMachineFeed}`);
        }

        // Update position
        state.x = targetX;
        state.y = targetY;
        state.z = targetZ;
      }

      // Dwell handling
      if (line.g_codes.includes(4) && line.p !== undefined) {
        const dwellSec = line.p >= 100 ? line.p / 1000 : line.p; // P in ms or sec
        dwellTime += dwellSec;
      }
    }

    // Finalize bounding box
    if (moves.length === 0) {
      bb.min = { x: 0, y: 0, z: 0 };
      bb.max = { x: 0, y: 0, z: 0 };
    }

    const totalCycleTime = cuttingTime + rapidTime + dwellTime + toolChangeTimeTot;

    return {
      machine: machineName,
      tool_count: toolUsage.size,
      total_moves: moves.length,
      rapid_moves: moves.filter(m => m.move_type === "G0").length,
      cutting_moves: moves.filter(m => m.move_type !== "G0").length,
      total_distance_mm: totalDistance,
      rapid_distance_mm: rapidDistance,
      cutting_distance_mm: cuttingDistance,
      cycle_time_sec: totalCycleTime,
      cutting_time_sec: cuttingTime,
      rapid_time_sec: rapidTime,
      dwell_time_sec: dwellTime,
      tool_change_time_sec: toolChangeTimeTot,
      max_spindle_rpm: maxRpm,
      max_feed_rate: maxFeed,
      material_removed_mm3: materialRemoved * 1000, // cm3 to mm3
      average_mrr: mrrCount > 0 ? totalMRR / mrrCount : 0,
      peak_mrr: peakMRR,
      moves,
      collisions,
      tool_usage: Array.from(toolUsage.entries()).map(([tool_id, u]) => ({ tool_id, ...u })),
      bounding_box: bb,
      warnings,
    };
  }

  /** Verify a toolpath against stock boundaries */
  verifyToolpath(input: {
    moves: SimulatedMove[];
    stock: StockDefinition;
    tools: ToolDefinition[];
  }): { within_stock: boolean; air_cut_percent: number; violations: Array<{ line: number; position: Vec3; description: string }> } {
    const { stock, moves, tools } = input;
    const violations: Array<{ line: number; position: Vec3; description: string }> = [];
    let airCutMoves = 0;
    let cuttingMoves = 0;

    const toolMap = new Map<string, ToolDefinition>();
    for (const t of tools) toolMap.set(t.id, t);

    const halfX = stock.dimensions.x / 2;
    const halfY = stock.dimensions.y / 2;

    for (const move of moves) {
      if (move.move_type === "G0") continue;
      cuttingMoves++;

      const p = move.end;
      const tool = toolMap.get(move.tool_id);
      const toolRadius = (tool?.diameter ?? 10) / 2;

      // Check if cutting position is within stock + tool radius
      const withinX = Math.abs(p.x - stock.origin.x) <= halfX + toolRadius;
      const withinY = Math.abs(p.y - stock.origin.y) <= halfY + toolRadius;
      const withinZ = p.z >= stock.origin.z - stock.dimensions.z - 1 && p.z <= stock.origin.z + toolRadius;

      if (!withinX || !withinY || !withinZ) {
        airCutMoves++;
      }

      // Check if tool goes below stock bottom
      if (p.z < stock.origin.z - stock.dimensions.z - 1) {
        violations.push({
          line: move.line_number,
          position: p,
          description: `Tool penetrates below stock bottom by ${(stock.origin.z - stock.dimensions.z - p.z).toFixed(2)}mm`,
        });
      }
    }

    return {
      within_stock: violations.length === 0,
      air_cut_percent: cuttingMoves > 0 ? (airCutMoves / cuttingMoves) * 100 : 0,
      violations,
    };
  }

  /** Estimate cycle time from basic parameters (no G-code needed) */
  estimateCycleTime(input: {
    operations: Array<{
      type: string;
      cutting_distance_mm: number;
      feed_rate: number;
      rapid_distance_mm?: number;
      dwell_sec?: number;
    }>;
    tool_changes: number;
    tool_change_time_sec?: number;
    rapid_rate?: number;
  }): { total_sec: number; cutting_sec: number; rapid_sec: number; dwell_sec: number; tool_change_sec: number; breakdown: Array<{ type: string; sec: number }> } {
    const rapidRate = input.rapid_rate ?? DEFAULT_RAPID_RATE;
    const tcTime = input.tool_change_time_sec ?? DEFAULT_TOOL_CHANGE_SEC;

    let cuttingSec = 0, rapidSec = 0, dwellSec = 0;
    const breakdown: Array<{ type: string; sec: number }> = [];

    for (const op of input.operations) {
      const cutTime = (op.cutting_distance_mm / Math.max(op.feed_rate, 1)) * 60;
      const rapTime = ((op.rapid_distance_mm ?? op.cutting_distance_mm * 0.3) / rapidRate) * 60;
      const dwell = op.dwell_sec ?? 0;

      cuttingSec += cutTime;
      rapidSec += rapTime;
      dwellSec += dwell;
      breakdown.push({ type: op.type, sec: cutTime + rapTime + dwell });
    }

    const toolChangeSec = input.tool_changes * tcTime;
    const totalSec = cuttingSec + rapidSec + dwellSec + toolChangeSec;

    return {
      total_sec: totalSec,
      cutting_sec: cuttingSec,
      rapid_sec: rapidSec,
      dwell_sec: dwellSec,
      tool_change_sec: toolChangeSec,
      breakdown,
    };
  }

  /** Get simulation capabilities info */
  getCapabilities(): {
    supported_codes: { g_codes: number[]; m_codes: number[] };
    features: string[];
    limitations: string[];
  } {
    return {
      supported_codes: {
        g_codes: [0, 1, 2, 3, 4, 17, 18, 19, 20, 21, 28, 40, 41, 42, 43, 54, 55, 56, 57, 58, 59, 90, 91],
        m_codes: [0, 1, 2, 3, 4, 5, 6, 8, 9, 30],
      },
      features: [
        "G-code parsing (Fanuc dialect)",
        "Modal state tracking",
        "Cycle time estimation",
        "Material removal rate calculation",
        "Rapid plunge detection",
        "Over-travel detection",
        "Tool usage tracking",
        "Bounding box computation",
        "Arc move approximation",
        "Toolpath verification against stock",
      ],
      limitations: [
        "No canned cycle expansion (G81-G89)",
        "No macro/variable support (G65, #variables)",
        "Arc distance is approximated",
        "MRR estimation assumes simple engagement model",
        "No sub-program expansion (M98/M99)",
      ],
    };
  }
}

export const simulationEngine = new SimulationEngine();
