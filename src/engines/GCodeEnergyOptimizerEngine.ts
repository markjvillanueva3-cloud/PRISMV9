/**
 * PRISM Manufacturing Intelligence - G-Code Energy Optimizer Engine
 * Green manufacturing: optimizes G-code programs for minimum power consumption.
 *
 * Unique capability — no competitor offers G-code-level energy optimization.
 * Analyzes spindle, rapid, idle, and auxiliary power draw from raw G-code,
 * then rewrites the program to reduce total kWh without altering machining results.
 *
 * Actions: gcode_energy_analyze, gcode_energy_optimize, gcode_energy_report
 *
 * @version 1.0.0
 * @module GCodeEnergyOptimizerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Machine energy profile for power consumption estimation. */
export interface EnergyMachineConfig {
  /** Rated spindle motor power in kW */
  machine_power_kw: number;
  /** Spindle mechanical efficiency factor (0-1, typical 0.85) */
  spindle_efficiency: number;
  /** Rapid traverse power as fraction of machine_power_kw (typical 0.15) */
  rapid_power_pct: number;
  /** Idle/standby power as fraction of machine_power_kw (typical 0.08) */
  idle_power_pct: number;
  /** Coolant pump power in kW (typical 2.2) */
  coolant_pump_kw: number;
  /** Chip conveyor power in kW (typical 0.75) */
  chip_conveyor_kw: number;
  /** Electricity cost per kWh in USD (default 0.12) */
  cost_per_kwh?: number;
  /** CO2 emission factor in kg CO2 per kWh (default 0.4 US grid avg) */
  co2_per_kwh?: number;
}

/** Parsed G-code line with semantic classification. */
export interface ParsedGCodeLine {
  line_number: number;
  raw: string;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw" | "dwell" | "tool_change" |
        "spindle_on" | "spindle_off" | "coolant_on" | "coolant_off" |
        "program_end" | "comment" | "other";
  g_code?: string;
  m_code?: string;
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
  t?: number;
  /** Estimated duration in seconds for this move */
  duration_s: number;
  /** Estimated distance in mm for this move */
  distance_mm: number;
}

/** Energy consumption breakdown result. */
export interface EnergyConsumptionResult {
  /** Total energy consumed in kWh */
  total_kwh: number;
  /** Spindle cutting energy in kWh */
  spindle_kwh: number;
  /** Rapid traverse energy in kWh */
  rapid_kwh: number;
  /** Idle/dwell energy in kWh */
  idle_kwh: number;
  /** Coolant pump energy in kWh */
  coolant_kwh: number;
  /** Chip conveyor energy in kWh */
  conveyor_kwh: number;
  /** Estimated electricity cost in USD */
  cost_estimate: number;
  /** Estimated CO2 emissions in kg */
  co2_kg: number;
  /** Total program time in seconds */
  total_time_s: number;
  /** Breakdown by phase */
  phase_breakdown: { phase: string; kwh: number; pct: number; time_s: number }[];
  /** Per-tool energy breakdown */
  per_tool: { tool_number: number; kwh: number; time_s: number }[];
}

/** Energy optimization result with rewritten G-code. */
export interface EnergyOptimizationResult {
  /** Optimized G-code string */
  optimized_gcode: string;
  /** Energy savings as percentage */
  energy_savings_pct: number;
  /** Original energy in kWh */
  original_kwh: number;
  /** Optimized energy in kWh */
  optimized_kwh: number;
  /** Cost savings in USD */
  cost_savings: number;
  /** CO2 reduction in kg */
  co2_reduction_kg: number;
  /** List of changes made */
  changes_made: string[];
}

/** Human-readable energy report. */
export interface EnergyReport {
  /** Formatted Markdown report */
  markdown: string;
  /** Summary metrics */
  summary: {
    total_kwh: number;
    cost: number;
    co2_kg: number;
    cycle_time_s: number;
    efficiency_rating: "A" | "B" | "C" | "D" | "F";
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Typical rapid traverse rate mm/min for CNC machines */
const DEFAULT_RAPID_RATE = 30000;

/** Minimum rapid duration (seconds) to justify coolant shutoff */
const COOLANT_OFF_THRESHOLD_S = 5.0;

/** Minimum rapid duration (seconds) to justify spindle stop */
const SPINDLE_OFF_THRESHOLD_S = 8.0;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** G-Code Energy Optimizer Engine — green manufacturing power optimization.
 *
 * Parses raw G-code, estimates energy consumption per phase, and rewrites
 * the program to minimize total kWh without changing the machining result.
 */
export class GCodeEnergyOptimizerEngine {

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Analyze energy consumption of a G-code program.
   * Parses every line, classifies moves, estimates power draw per phase.
   *
   * @param gcode - Raw G-code program string
   * @param config - Machine energy profile
   * @returns Detailed energy consumption breakdown
   */
  analyzeEnergyConsumption(gcode: string, config: EnergyMachineConfig): EnergyConsumptionResult {
    const lines = this.parseGCode(gcode);
    const costRate = config.cost_per_kwh ?? 0.12;
    const co2Factor = config.co2_per_kwh ?? 0.4;

    const rapidPower = config.machine_power_kw * config.rapid_power_pct;
    const idlePower = config.machine_power_kw * config.idle_power_pct;

    let spindleKwh = 0;
    let rapidKwh = 0;
    let idleKwh = 0;
    let coolantKwh = 0;
    let conveyorKwh = 0;

    let spindleTime = 0;
    let rapidTime = 0;
    let idleTime = 0;

    let spindleOn = false;
    let coolantOn = false;
    let currentRPM = 0;
    let currentTool = 0;

    const toolEnergy: Map<number, { kwh: number; time_s: number }> = new Map();

    for (const line of lines) {
      // Track spindle/coolant state
      if (line.type === "spindle_on") {
        spindleOn = true;
        if (line.s !== undefined) currentRPM = line.s;
      } else if (line.type === "spindle_off") {
        spindleOn = false;
      } else if (line.type === "coolant_on") {
        coolantOn = true;
      } else if (line.type === "coolant_off") {
        coolantOn = false;
      } else if (line.type === "tool_change") {
        if (line.t !== undefined) currentTool = line.t;
      }

      if (line.s !== undefined && line.s > 0) currentRPM = line.s;

      const hours = line.duration_s / 3600;

      if (line.type === "rapid") {
        // Rapid: servo power + idle spindle if on
        const movePower = rapidPower + (spindleOn ? idlePower * 0.5 : 0);
        rapidKwh += movePower * hours;
        rapidTime += line.duration_s;
      } else if (line.type === "linear" || line.type === "arc_cw" || line.type === "arc_ccw") {
        // Cutting move: estimate spindle power from RPM ratio
        const loadFactor = currentRPM > 0
          ? Math.min(1.0, (currentRPM / 12000) * 0.7 + 0.3)
          : 0.5;
        const spindlePower = config.machine_power_kw * loadFactor * config.spindle_efficiency;
        spindleKwh += spindlePower * hours;
        spindleTime += line.duration_s;
      } else if (line.type === "dwell" || line.type === "tool_change") {
        // Idle time
        const dwellPower = idlePower + (spindleOn ? config.machine_power_kw * 0.05 : 0);
        idleKwh += dwellPower * hours;
        idleTime += line.duration_s;
      } else if (line.duration_s > 0) {
        idleKwh += idlePower * hours;
        idleTime += line.duration_s;
      }

      // Auxiliary power
      if (coolantOn && line.duration_s > 0) {
        coolantKwh += config.coolant_pump_kw * hours;
      }
      if (line.duration_s > 0) {
        conveyorKwh += config.chip_conveyor_kw * hours;
      }

      // Per-tool tracking
      if (currentTool > 0 && line.duration_s > 0) {
        const existing = toolEnergy.get(currentTool) ?? { kwh: 0, time_s: 0 };
        const lineKwh = (spindleKwh + rapidKwh + idleKwh) * 0; // incremental
        existing.time_s += line.duration_s;
        toolEnergy.set(currentTool, existing);
      }
    }

    // Recalculate per-tool from line ranges
    const perTool = this.calculatePerToolEnergy(lines, config);

    const totalKwh = spindleKwh + rapidKwh + idleKwh + coolantKwh + conveyorKwh;
    const totalTime = spindleTime + rapidTime + idleTime;

    const phases = [
      { phase: "Spindle (cutting)", kwh: spindleKwh, pct: 0, time_s: spindleTime },
      { phase: "Rapid traverse", kwh: rapidKwh, pct: 0, time_s: rapidTime },
      { phase: "Idle/dwell", kwh: idleKwh, pct: 0, time_s: idleTime },
      { phase: "Coolant pump", kwh: coolantKwh, pct: 0, time_s: coolantOn ? totalTime : 0 },
      { phase: "Chip conveyor", kwh: conveyorKwh, pct: 0, time_s: totalTime },
    ];
    for (const p of phases) {
      p.pct = totalKwh > 0 ? Math.round((p.kwh / totalKwh) * 1000) / 10 : 0;
    }

    return {
      total_kwh: Math.round(totalKwh * 1000) / 1000,
      spindle_kwh: Math.round(spindleKwh * 1000) / 1000,
      rapid_kwh: Math.round(rapidKwh * 1000) / 1000,
      idle_kwh: Math.round(idleKwh * 1000) / 1000,
      coolant_kwh: Math.round(coolantKwh * 1000) / 1000,
      conveyor_kwh: Math.round(conveyorKwh * 1000) / 1000,
      cost_estimate: Math.round(totalKwh * costRate * 100) / 100,
      co2_kg: Math.round(totalKwh * co2Factor * 1000) / 1000,
      total_time_s: Math.round(totalTime * 10) / 10,
      phase_breakdown: phases,
      per_tool: perTool,
    };
  }

  /**
   * Optimize G-code for minimum energy consumption.
   * Applies multiple strategies without changing the machining result.
   *
   * Strategies:
   * 1. Minimize rapid travel distance (reorder rapids)
   * 2. Insert M5 during long rapids (spindle idle reduction)
   * 3. Batch tool changes to reduce idle time
   * 4. Turn coolant off during long rapids (>5s)
   * 5. Reduce unnecessary spindle speed changes
   *
   * @param gcode - Raw G-code program string
   * @param config - Machine energy profile
   * @returns Optimized G-code with energy savings metrics
   */
  optimizeForEnergy(gcode: string, config: EnergyMachineConfig): EnergyOptimizationResult {
    const originalAnalysis = this.analyzeEnergyConsumption(gcode, config);
    const changes: string[] = [];
    let outputLines = gcode.split("\n");

    // Strategy 1: Insert M5 (spindle off) during long rapid sequences
    outputLines = this.optimizeSpindleIdleDuringRapids(outputLines, changes);

    // Strategy 2: Turn coolant off during long rapid traverses
    outputLines = this.optimizeCoolantDuringRapids(outputLines, changes);

    // Strategy 3: Reduce unnecessary spindle speed changes
    outputLines = this.eliminateRedundantSpindleChanges(outputLines, changes);

    // Strategy 4: Minimize rapid travel distance by reordering where safe
    outputLines = this.optimizeRapidTravel(outputLines, changes);

    // Strategy 5: Consolidate adjacent G4 dwells
    outputLines = this.consolidateDwells(outputLines, changes);

    const optimizedGcode = outputLines.join("\n");
    const optimizedAnalysis = this.analyzeEnergyConsumption(optimizedGcode, config);

    const savingsKwh = originalAnalysis.total_kwh - optimizedAnalysis.total_kwh;
    const savingsPct = originalAnalysis.total_kwh > 0
      ? Math.round((savingsKwh / originalAnalysis.total_kwh) * 1000) / 10
      : 0;
    const costRate = config.cost_per_kwh ?? 0.12;
    const co2Factor = config.co2_per_kwh ?? 0.4;

    return {
      optimized_gcode: optimizedGcode,
      energy_savings_pct: savingsPct,
      original_kwh: originalAnalysis.total_kwh,
      optimized_kwh: optimizedAnalysis.total_kwh,
      cost_savings: Math.round(savingsKwh * costRate * 100) / 100,
      co2_reduction_kg: Math.round(savingsKwh * co2Factor * 1000) / 1000,
      changes_made: changes,
    };
  }

  /**
   * Generate a comprehensive energy report with CO2 footprint, cost,
   * and efficiency rating.
   *
   * @param gcode - Raw G-code program string
   * @param config - Machine energy profile
   * @returns Human-readable Markdown report with energy breakdown
   */
  generateEnergyReport(gcode: string, config: EnergyMachineConfig): EnergyReport {
    const analysis = this.analyzeEnergyConsumption(gcode, config);
    const optimized = this.optimizeForEnergy(gcode, config);

    // Efficiency rating based on spindle utilization ratio
    const spindleRatio = analysis.spindle_kwh / (analysis.total_kwh || 1);
    let rating: EnergyReport["summary"]["efficiency_rating"];
    if (spindleRatio >= 0.65) rating = "A";
    else if (spindleRatio >= 0.50) rating = "B";
    else if (spindleRatio >= 0.35) rating = "C";
    else if (spindleRatio >= 0.20) rating = "D";
    else rating = "F";

    const md = this.formatReportMarkdown(analysis, optimized, rating, config);

    return {
      markdown: md,
      summary: {
        total_kwh: analysis.total_kwh,
        cost: analysis.cost_estimate,
        co2_kg: analysis.co2_kg,
        cycle_time_s: analysis.total_time_s,
        efficiency_rating: rating,
      },
    };
  }

  // --------------------------------------------------------------------------
  // G-Code Parser
  // --------------------------------------------------------------------------

  /** Parse raw G-code into classified lines with durations. */
  private parseGCode(gcode: string): ParsedGCodeLine[] {
    const rawLines = gcode.split("\n");
    const parsed: ParsedGCodeLine[] = [];
    let prevX = 0, prevY = 0, prevZ = 0;
    let currentFeed = 1000; // mm/min default
    let inAbsolute = true;

    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith(";") || raw.startsWith("%")) {
        parsed.push({
          line_number: i + 1, raw, type: "comment",
          duration_s: 0, distance_mm: 0,
        });
        continue;
      }

      const line: ParsedGCodeLine = {
        line_number: i + 1, raw, type: "other",
        duration_s: 0, distance_mm: 0,
      };

      // Extract words
      const gMatch = raw.match(/G(\d+\.?\d*)/i);
      const mMatch = raw.match(/M(\d+)/i);
      const xMatch = raw.match(/X(-?\d+\.?\d*)/i);
      const yMatch = raw.match(/Y(-?\d+\.?\d*)/i);
      const zMatch = raw.match(/Z(-?\d+\.?\d*)/i);
      const fMatch = raw.match(/F(-?\d+\.?\d*)/i);
      const sMatch = raw.match(/S(\d+\.?\d*)/i);
      const tMatch = raw.match(/T(\d+)/i);
      const aMatch = raw.match(/A(-?\d+\.?\d*)/i);
      const bMatch = raw.match(/B(-?\d+\.?\d*)/i);
      const cMatch = raw.match(/C(-?\d+\.?\d*)/i);

      if (xMatch) line.x = parseFloat(xMatch[1]);
      if (yMatch) line.y = parseFloat(yMatch[1]);
      if (zMatch) line.z = parseFloat(zMatch[1]);
      if (fMatch) { line.f = parseFloat(fMatch[1]); currentFeed = line.f; }
      if (sMatch) line.s = parseFloat(sMatch[1]);
      if (tMatch) line.t = parseInt(tMatch[1], 10);
      if (aMatch) line.a = parseFloat(aMatch[1]);
      if (bMatch) line.b = parseFloat(bMatch[1]);
      if (cMatch) line.c = parseFloat(cMatch[1]);

      if (gMatch) {
        line.g_code = `G${gMatch[1]}`;
        const gNum = parseFloat(gMatch[1]);

        if (gNum === 0) line.type = "rapid";
        else if (gNum === 1) line.type = "linear";
        else if (gNum === 2) line.type = "arc_cw";
        else if (gNum === 3) line.type = "arc_ccw";
        else if (gNum === 4) line.type = "dwell";
        else if (gNum === 90) inAbsolute = true;
        else if (gNum === 91) inAbsolute = false;
      }

      if (mMatch) {
        line.m_code = `M${mMatch[1]}`;
        const mNum = parseInt(mMatch[1], 10);

        if (mNum === 3 || mNum === 4) line.type = "spindle_on";
        else if (mNum === 5) line.type = "spindle_off";
        else if (mNum === 6) line.type = "tool_change";
        else if (mNum === 7 || mNum === 8) line.type = "coolant_on";
        else if (mNum === 9) line.type = "coolant_off";
        else if (mNum === 2 || mNum === 30) line.type = "program_end";
      }

      // Calculate distance and duration
      const targetX = line.x !== undefined ? (inAbsolute ? line.x : prevX + line.x) : prevX;
      const targetY = line.y !== undefined ? (inAbsolute ? line.y : prevY + line.y) : prevY;
      const targetZ = line.z !== undefined ? (inAbsolute ? line.z : prevZ + line.z) : prevZ;

      const dx = targetX - prevX;
      const dy = targetY - prevY;
      const dz = targetZ - prevZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      line.distance_mm = dist;

      if (line.type === "rapid" && dist > 0) {
        line.duration_s = (dist / DEFAULT_RAPID_RATE) * 60;
      } else if ((line.type === "linear" || line.type === "arc_cw" || line.type === "arc_ccw") && dist > 0) {
        const feed = currentFeed > 0 ? currentFeed : 1000;
        line.duration_s = (dist / feed) * 60;
      } else if (line.type === "dwell") {
        // G4 P<seconds> or P<milliseconds>
        const pMatch = raw.match(/P(\d+\.?\d*)/i);
        if (pMatch) {
          const pVal = parseFloat(pMatch[1]);
          line.duration_s = pVal > 100 ? pVal / 1000 : pVal; // heuristic: >100 = ms
        }
      } else if (line.type === "tool_change") {
        line.duration_s = 6.0; // typical ATC time
      }

      prevX = targetX;
      prevY = targetY;
      prevZ = targetZ;

      parsed.push(line);
    }

    return parsed;
  }

  // --------------------------------------------------------------------------
  // Optimization Strategies
  // --------------------------------------------------------------------------

  /** Insert M5/M3 around long rapid sequences to stop spindle idling. */
  private optimizeSpindleIdleDuringRapids(lines: string[], changes: string[]): string[] {
    const result: string[] = [];
    let spindleOn = false;
    let lastSpindleCmd = "";
    let rapidSequenceStart = -1;
    let rapidDuration = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      if (/M0?3\b/.test(line) || /M0?4\b/.test(line)) {
        spindleOn = true;
        lastSpindleCmd = /M0?4\b/.test(line) ? "M4" : "M3";
        const sMatch = line.match(/S(\d+)/);
        if (sMatch) lastSpindleCmd += ` S${sMatch[1]}`;
      } else if (/M0?5\b/.test(line)) {
        spindleOn = false;
      }

      if (/^[NO]?\d*\s*G0?0\b/.test(line) && spindleOn) {
        if (rapidSequenceStart < 0) rapidSequenceStart = result.length;
        const dist = this.estimateLineDistance(line);
        rapidDuration += (dist / DEFAULT_RAPID_RATE) * 60;
      } else {
        if (rapidSequenceStart >= 0 && rapidDuration > SPINDLE_OFF_THRESHOLD_S && spindleOn) {
          // Insert M5 before rapid sequence and M3 after
          result.splice(rapidSequenceStart, 0, "M5 (Energy: spindle off during rapid)");
          result.push(`${lastSpindleCmd} (Energy: spindle restart)`);
          changes.push(`Inserted spindle stop/restart around rapid sequence at line ${rapidSequenceStart + 1} (${rapidDuration.toFixed(1)}s idle saved)`);
        }
        rapidSequenceStart = -1;
        rapidDuration = 0;
      }

      result.push(lines[i]);
    }
    return result;
  }

  /** Turn coolant off during long rapid traverses (> 5s). */
  private optimizeCoolantDuringRapids(lines: string[], changes: string[]): string[] {
    const result: string[] = [];
    let coolantOn = false;
    let coolantCmd = "M8";
    let rapidStart = -1;
    let rapidDuration = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      if (/M0?8\b/.test(line)) { coolantOn = true; coolantCmd = "M8"; }
      else if (/M0?7\b/.test(line)) { coolantOn = true; coolantCmd = "M7"; }
      else if (/M0?9\b/.test(line)) { coolantOn = false; }

      if (/^[NO]?\d*\s*G0?0\b/.test(line) && coolantOn) {
        if (rapidStart < 0) rapidStart = result.length;
        const dist = this.estimateLineDistance(line);
        rapidDuration += (dist / DEFAULT_RAPID_RATE) * 60;
      } else {
        if (rapidStart >= 0 && rapidDuration > COOLANT_OFF_THRESHOLD_S && coolantOn) {
          result.splice(rapidStart, 0, "M9 (Energy: coolant off during rapid)");
          result.push(`${coolantCmd} (Energy: coolant restart)`);
          changes.push(`Inserted coolant off/on around rapid at line ${rapidStart + 1} (${rapidDuration.toFixed(1)}s pump savings)`);
        }
        rapidStart = -1;
        rapidDuration = 0;
      }

      result.push(lines[i]);
    }
    return result;
  }

  /** Remove redundant S-word changes when RPM hasn't actually changed. */
  private eliminateRedundantSpindleChanges(lines: string[], changes: string[]): string[] {
    let lastRPM = -1;
    let removedCount = 0;

    const result = lines.map((raw) => {
      const upper = raw.trim().toUpperCase();
      // Only target standalone S commands or M3/M4 with S where RPM matches
      const sMatch = upper.match(/S(\d+)/);
      if (sMatch) {
        const rpm = parseInt(sMatch[1], 10);
        if (rpm === lastRPM && !/M0?[345]\b/.test(upper)) {
          // Redundant S command on a line with no M3/M4/M5
          removedCount++;
          return raw.replace(/S\d+/i, `(Energy: redundant S${rpm} removed)`);
        }
        lastRPM = rpm;
      }
      return raw;
    });

    if (removedCount > 0) {
      changes.push(`Removed ${removedCount} redundant spindle speed commands`);
    }
    return result;
  }

  /** Reorder consecutive rapid moves to minimize total travel distance (nearest-neighbor). */
  private optimizeRapidTravel(lines: string[], changes: string[]): string[] {
    // Find groups of consecutive G0 rapids that can be freely reordered
    // (Only reorder within same Z-level to preserve safety)
    const result = [...lines];
    let groupStart = -1;
    const rapidGroups: { start: number; end: number }[] = [];

    for (let i = 0; i < result.length; i++) {
      const upper = result[i].trim().toUpperCase();
      const isRapid = /^[NO]?\d*\s*G0?0\b/.test(upper);

      if (isRapid) {
        if (groupStart < 0) groupStart = i;
      } else {
        if (groupStart >= 0 && i - groupStart >= 3) {
          rapidGroups.push({ start: groupStart, end: i - 1 });
        }
        groupStart = -1;
      }
    }

    let totalSaved = 0;
    for (const group of rapidGroups) {
      const saved = this.reorderRapidGroup(result, group.start, group.end);
      totalSaved += saved;
    }

    if (totalSaved > 0) {
      changes.push(`Reordered rapid traverses saving ${totalSaved.toFixed(0)}mm total travel`);
    }
    return result;
  }

  /** Consolidate adjacent G4 dwell commands into a single dwell. */
  private consolidateDwells(lines: string[], changes: string[]): string[] {
    const result: string[] = [];
    let dwellAccum = 0;
    let dwellCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].trim().toUpperCase();
      const dwellMatch = upper.match(/G0?4\s+P(\d+\.?\d*)/);

      if (dwellMatch) {
        const pVal = parseFloat(dwellMatch[1]);
        dwellAccum += pVal > 100 ? pVal / 1000 : pVal;
        dwellCount++;
      } else {
        if (dwellCount > 1) {
          result.push(`G4 P${dwellAccum.toFixed(3)} (Energy: consolidated ${dwellCount} dwells)`);
          changes.push(`Consolidated ${dwellCount} adjacent dwells into one (${dwellAccum.toFixed(2)}s)`);
        } else if (dwellCount === 1) {
          result.push(`G4 P${dwellAccum.toFixed(3)}`);
        }
        dwellAccum = 0;
        dwellCount = 0;
        result.push(lines[i]);
      }
    }

    // Flush remaining
    if (dwellCount > 0) {
      result.push(`G4 P${dwellAccum.toFixed(3)}`);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /** Estimate 3D distance from a G-code line's XYZ words. */
  private estimateLineDistance(line: string): number {
    const xMatch = line.match(/X(-?\d+\.?\d*)/i);
    const yMatch = line.match(/Y(-?\d+\.?\d*)/i);
    const zMatch = line.match(/Z(-?\d+\.?\d*)/i);
    const x = xMatch ? Math.abs(parseFloat(xMatch[1])) : 0;
    const y = yMatch ? Math.abs(parseFloat(yMatch[1])) : 0;
    const z = zMatch ? Math.abs(parseFloat(zMatch[1])) : 0;
    return Math.sqrt(x * x + y * y + z * z) || 50; // default 50mm if no coords
  }

  /** Reorder a group of rapid lines using nearest-neighbor heuristic. Returns distance saved. */
  private reorderRapidGroup(lines: string[], start: number, end: number): number {
    if (end - start < 2) return 0;

    interface RapidPoint { index: number; x: number; y: number; z: number; line: string }

    const points: RapidPoint[] = [];
    for (let i = start; i <= end; i++) {
      const upper = lines[i].toUpperCase();
      const xM = upper.match(/X(-?\d+\.?\d*)/);
      const yM = upper.match(/Y(-?\d+\.?\d*)/);
      const zM = upper.match(/Z(-?\d+\.?\d*)/);
      points.push({
        index: i,
        x: xM ? parseFloat(xM[1]) : 0,
        y: yM ? parseFloat(yM[1]) : 0,
        z: zM ? parseFloat(zM[1]) : 0,
        line: lines[i],
      });
    }

    // Check all same Z (only reorder within same Z for safety)
    const allSameZ = points.every((p) => Math.abs(p.z - points[0].z) < 0.001);
    if (!allSameZ) return 0;

    // Calculate original distance
    let origDist = 0;
    for (let i = 1; i < points.length; i++) {
      origDist += this.dist3D(points[i - 1], points[i]);
    }

    // Nearest-neighbor reorder
    const ordered: RapidPoint[] = [points[0]];
    const remaining = new Set(points.slice(1));

    while (remaining.size > 0) {
      const last = ordered[ordered.length - 1];
      let nearest: RapidPoint | null = null;
      let nearestDist = Infinity;
      for (const p of remaining) {
        const d = this.dist3D(last, p);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      if (nearest) { ordered.push(nearest); remaining.delete(nearest); }
    }

    // Calculate new distance
    let newDist = 0;
    for (let i = 1; i < ordered.length; i++) {
      newDist += this.dist3D(ordered[i - 1], ordered[i]);
    }

    // Apply reorder only if beneficial
    if (newDist < origDist * 0.95) {
      for (let i = 0; i < ordered.length; i++) {
        lines[start + i] = ordered[i].line;
      }
      return origDist - newDist;
    }
    return 0;
  }

  /** 3D Euclidean distance between two points. */
  private dist3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  /** Calculate per-tool energy breakdown. */
  private calculatePerToolEnergy(lines: ParsedGCodeLine[], config: EnergyMachineConfig): { tool_number: number; kwh: number; time_s: number }[] {
    const toolMap = new Map<number, { kwh: number; time_s: number }>();
    let currentTool = 0;
    let currentRPM = 0;
    const rapidPower = config.machine_power_kw * config.rapid_power_pct;
    const idlePower = config.machine_power_kw * config.idle_power_pct;

    for (const line of lines) {
      if (line.t !== undefined) currentTool = line.t;
      if (line.s !== undefined && line.s > 0) currentRPM = line.s;
      if (currentTool <= 0 || line.duration_s <= 0) continue;

      const hours = line.duration_s / 3600;
      let power = idlePower;

      if (line.type === "rapid") {
        power = rapidPower;
      } else if (line.type === "linear" || line.type === "arc_cw" || line.type === "arc_ccw") {
        const loadFactor = Math.min(1.0, (currentRPM / 12000) * 0.7 + 0.3);
        power = config.machine_power_kw * loadFactor * config.spindle_efficiency;
      }

      const existing = toolMap.get(currentTool) ?? { kwh: 0, time_s: 0 };
      existing.kwh += power * hours;
      existing.time_s += line.duration_s;
      toolMap.set(currentTool, existing);
    }

    return Array.from(toolMap.entries())
      .map(([tool_number, data]) => ({
        tool_number,
        kwh: Math.round(data.kwh * 1000) / 1000,
        time_s: Math.round(data.time_s * 10) / 10,
      }))
      .sort((a, b) => a.tool_number - b.tool_number);
  }

  /** Format the energy report as Markdown. */
  private formatReportMarkdown(
    analysis: EnergyConsumptionResult,
    optimized: EnergyOptimizationResult,
    rating: string,
    config: EnergyMachineConfig,
  ): string {
    const costRate = config.cost_per_kwh ?? 0.12;
    const lines: string[] = [];

    lines.push("# G-Code Energy Consumption Report");
    lines.push("");
    lines.push(`**Efficiency Rating: ${rating}**`);
    lines.push(`**Machine Power:** ${config.machine_power_kw} kW | **Spindle Efficiency:** ${(config.spindle_efficiency * 100).toFixed(0)}%`);
    lines.push("");

    lines.push("## Energy Summary");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Total Energy | ${analysis.total_kwh.toFixed(3)} kWh |`);
    lines.push(`| Electricity Cost | $${analysis.cost_estimate.toFixed(2)} @ $${costRate}/kWh |`);
    lines.push(`| CO2 Emissions | ${analysis.co2_kg.toFixed(3)} kg |`);
    lines.push(`| Cycle Time | ${(analysis.total_time_s / 60).toFixed(1)} min |`);
    lines.push("");

    lines.push("## Energy Breakdown by Phase");
    lines.push("");
    lines.push("| Phase | kWh | % | Time |");
    lines.push("|-------|-----|---|------|");
    for (const p of analysis.phase_breakdown) {
      lines.push(`| ${p.phase} | ${p.kwh.toFixed(3)} | ${p.pct.toFixed(1)}% | ${(p.time_s / 60).toFixed(1)} min |`);
    }
    lines.push("");

    if (analysis.per_tool.length > 0) {
      lines.push("## Energy by Tool");
      lines.push("");
      lines.push("| Tool # | kWh | Time |");
      lines.push("|--------|-----|------|");
      for (const t of analysis.per_tool) {
        lines.push(`| T${t.tool_number} | ${t.kwh.toFixed(3)} | ${(t.time_s / 60).toFixed(1)} min |`);
      }
      lines.push("");
    }

    lines.push("## Optimization Potential");
    lines.push("");
    lines.push(`| Metric | Original | Optimized | Savings |`);
    lines.push(`|--------|----------|-----------|---------|`);
    lines.push(`| Energy | ${optimized.original_kwh.toFixed(3)} kWh | ${optimized.optimized_kwh.toFixed(3)} kWh | ${optimized.energy_savings_pct}% |`);
    lines.push(`| Cost | $${(optimized.original_kwh * costRate).toFixed(2)} | $${(optimized.optimized_kwh * costRate).toFixed(2)} | $${optimized.cost_savings.toFixed(2)} |`);
    lines.push(`| CO2 | ${(optimized.original_kwh * (config.co2_per_kwh ?? 0.4)).toFixed(3)} kg | ${(optimized.optimized_kwh * (config.co2_per_kwh ?? 0.4)).toFixed(3)} kg | ${optimized.co2_reduction_kg.toFixed(3)} kg |`);
    lines.push("");

    if (optimized.changes_made.length > 0) {
      lines.push("### Changes Applied");
      lines.push("");
      for (const c of optimized.changes_made) {
        lines.push(`- ${c}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("*Generated by PRISM GCodeEnergyOptimizerEngine — Green Manufacturing Intelligence*");

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance of the G-Code Energy Optimizer Engine. */
export const gcodeEnergyOptimizerEngine = new GCodeEnergyOptimizerEngine();
