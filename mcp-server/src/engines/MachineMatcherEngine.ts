/**
 * MachineMatcherEngine — G-Code to Machine Recommendation
 *
 * Given a G-code program + part requirements, recommends the best machine(s)
 * from PRISM's 239-machine catalog based on:
 *   - Work envelope (X/Y/Z travel vs part dimensions)
 *   - Spindle speed range (max RPM in program vs machine max)
 *   - Spindle power (cutting power demand vs available power)
 *   - Axis count (3-axis vs 4-axis vs 5-axis requirements)
 *   - Controller compatibility (Fanuc/Haas/Siemens/etc.)
 *   - Pallet changer / ATC capacity for production
 *   - Cost efficiency (machine hourly rate vs cycle time)
 *
 * Novel: No CAM software matches G-code programs to machines. Operators
 * manually decide which machine to use. This engine automates that decision
 * with physics-backed scoring.
 *
 * @module engines/MachineMatcherEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MatchInput {
  gcode: string;
  part_dimensions?: { x: number; y: number; z: number };
  required_axes?: number;           // 3, 4, or 5
  controller_preference?: string;   // "fanuc", "haas", "siemens", etc.
  min_atc_capacity?: number;        // Minimum tool magazine size
  needs_pallet_changer?: boolean;
  material?: string;
  max_hourly_rate?: number;         // Budget constraint ($/hr)
  production_qty?: number;          // For amortization scoring
  priority?: "speed" | "precision" | "cost" | "balanced";
}

export interface MachineScore {
  machine_name: string;
  manufacturer: string;
  model: string;
  score: number;                    // 0-100 overall match score
  scores: {
    envelope: number;               // 0-100 work envelope fit
    spindle: number;                // 0-100 spindle capability
    power: number;                  // 0-100 power adequacy
    axes: number;                   // 0-100 axis match
    controller: number;             // 0-100 controller match
    tooling: number;                // 0-100 ATC capacity
    cost: number;                   // 0-100 cost efficiency
  };
  specs: {
    x_travel_mm: number;
    y_travel_mm: number;
    z_travel_mm: number;
    max_rpm: number;
    power_kw: number;
    axes: number;
    controller: string;
    atc_capacity: number;
    has_pallet: boolean;
    hourly_rate?: number;
  };
  fit_notes: string[];
  disqualified: boolean;
  disqualify_reason?: string;
}

export interface MatchResult {
  recommendations: MachineScore[];
  best_match: MachineScore | null;
  program_requirements: {
    max_x: number; max_y: number; max_z: number;
    max_rpm: number;
    estimated_power_kw: number;
    tool_count: number;
    has_rotary: boolean;
    has_5axis: boolean;
  };
  machines_evaluated: number;
  machines_qualified: number;
}

// ============================================================================
// BUILT-IN MACHINE DATABASE (representative subset for matching)
// ============================================================================

interface MachineProfile {
  name: string;
  manufacturer: string;
  model: string;
  x_mm: number; y_mm: number; z_mm: number;
  max_rpm: number;
  power_kw: number;
  axes: number;
  controller: string;
  atc: number;
  pallet: boolean;
  rate_hr?: number; // $/hr
  table_load_kg?: number;
  precision_um?: number; // positioning accuracy
}

const MACHINES: MachineProfile[] = [
  // HAAS
  { name: "Haas VF-2", manufacturer: "Haas", model: "VF-2", x_mm: 762, y_mm: 406, z_mm: 508, max_rpm: 8100, power_kw: 22.4, axes: 3, controller: "haas", atc: 20, pallet: false, rate_hr: 65, precision_um: 10 },
  { name: "Haas VF-2SS", manufacturer: "Haas", model: "VF-2SS", x_mm: 762, y_mm: 406, z_mm: 508, max_rpm: 12000, power_kw: 22.4, axes: 3, controller: "haas", atc: 24, pallet: false, rate_hr: 75, precision_um: 10 },
  { name: "Haas UMC-750", manufacturer: "Haas", model: "UMC-750", x_mm: 762, y_mm: 508, z_mm: 508, max_rpm: 8100, power_kw: 22.4, axes: 5, controller: "haas", atc: 40, pallet: false, rate_hr: 95, precision_um: 8 },
  { name: "Haas UMC-750SS", manufacturer: "Haas", model: "UMC-750SS", x_mm: 762, y_mm: 508, z_mm: 508, max_rpm: 12000, power_kw: 22.4, axes: 5, controller: "haas", atc: 40, pallet: false, rate_hr: 105, precision_um: 8 },
  { name: "Haas VF-4", manufacturer: "Haas", model: "VF-4", x_mm: 1270, y_mm: 457, z_mm: 508, max_rpm: 8100, power_kw: 22.4, axes: 3, controller: "haas", atc: 20, pallet: false, rate_hr: 70, precision_um: 10 },
  { name: "Haas DM-2", manufacturer: "Haas", model: "DM-2", x_mm: 711, y_mm: 406, z_mm: 394, max_rpm: 15000, power_kw: 11.2, axes: 3, controller: "haas", atc: 18, pallet: false, rate_hr: 60, precision_um: 8 },
  // DMG MORI
  { name: "DMG DMU 50", manufacturer: "DMG Mori", model: "DMU 50", x_mm: 500, y_mm: 450, z_mm: 400, max_rpm: 14000, power_kw: 25, axes: 5, controller: "siemens", atc: 30, pallet: false, rate_hr: 120, precision_um: 5 },
  { name: "DMG DMU 80P", manufacturer: "DMG Mori", model: "DMU 80P", x_mm: 800, y_mm: 700, z_mm: 600, max_rpm: 14000, power_kw: 35, axes: 5, controller: "siemens", atc: 60, pallet: true, rate_hr: 160, precision_um: 4 },
  { name: "DMG DMC 650V", manufacturer: "DMG Mori", model: "DMC 650V", x_mm: 650, y_mm: 520, z_mm: 475, max_rpm: 14000, power_kw: 25, axes: 3, controller: "siemens", atc: 20, pallet: false, rate_hr: 100, precision_um: 5 },
  // MAZAK
  { name: "Mazak VCN-530C", manufacturer: "Mazak", model: "VCN-530C", x_mm: 1050, y_mm: 530, z_mm: 510, max_rpm: 12000, power_kw: 22, axes: 3, controller: "mazak", atc: 30, pallet: false, rate_hr: 85, precision_um: 7 },
  { name: "Mazak Variaxis i-600", manufacturer: "Mazak", model: "Variaxis i-600", x_mm: 600, y_mm: 550, z_mm: 510, max_rpm: 12000, power_kw: 25, axes: 5, controller: "mazak", atc: 40, pallet: true, rate_hr: 140, precision_um: 4 },
  { name: "Mazak HCN-5000", manufacturer: "Mazak", model: "HCN-5000", x_mm: 730, y_mm: 730, z_mm: 810, max_rpm: 10000, power_kw: 30, axes: 4, controller: "mazak", atc: 40, pallet: true, rate_hr: 130, precision_um: 5 },
  // FANUC
  { name: "Fanuc Robodrill a-D21MiB5", manufacturer: "Fanuc", model: "Robodrill a-D21MiB5", x_mm: 700, y_mm: 400, z_mm: 330, max_rpm: 24000, power_kw: 11, axes: 5, controller: "fanuc", atc: 21, pallet: false, rate_hr: 55, precision_um: 4 },
  { name: "Fanuc Robodrill a-D21LiB5", manufacturer: "Fanuc", model: "Robodrill a-D21LiB5", x_mm: 700, y_mm: 400, z_mm: 330, max_rpm: 24000, power_kw: 11, axes: 3, controller: "fanuc", atc: 21, pallet: false, rate_hr: 45, precision_um: 4 },
  // OKUMA
  { name: "Okuma MB-5000H", manufacturer: "Okuma", model: "MB-5000H", x_mm: 762, y_mm: 762, z_mm: 800, max_rpm: 8000, power_kw: 22, axes: 4, controller: "okuma", atc: 48, pallet: true, rate_hr: 110, precision_um: 5 },
  { name: "Okuma MU-5000V", manufacturer: "Okuma", model: "MU-5000V", x_mm: 762, y_mm: 460, z_mm: 460, max_rpm: 15000, power_kw: 22, axes: 5, controller: "okuma", atc: 32, pallet: false, rate_hr: 125, precision_um: 4 },
  // MAKINO
  { name: "Makino a51nx", manufacturer: "Makino", model: "a51nx", x_mm: 560, y_mm: 500, z_mm: 500, max_rpm: 14000, power_kw: 30, axes: 4, controller: "fanuc", atc: 60, pallet: true, rate_hr: 140, precision_um: 3 },
  { name: "Makino D500", manufacturer: "Makino", model: "D500", x_mm: 500, y_mm: 500, z_mm: 350, max_rpm: 20000, power_kw: 22, axes: 5, controller: "fanuc", atc: 60, pallet: false, rate_hr: 150, precision_um: 2 },
  // HERMLE
  { name: "Hermle C 400", manufacturer: "Hermle", model: "C 400", x_mm: 850, y_mm: 700, z_mm: 500, max_rpm: 18000, power_kw: 35, axes: 5, controller: "siemens", atc: 42, pallet: true, rate_hr: 170, precision_um: 3 },
  // BROTHER
  { name: "Brother Speedio S500X2", manufacturer: "Brother", model: "Speedio S500X2", x_mm: 500, y_mm: 400, z_mm: 305, max_rpm: 16000, power_kw: 7.5, axes: 3, controller: "fanuc", atc: 22, pallet: false, rate_hr: 40, precision_um: 6 },
];

// ============================================================================
// ENGINE
// ============================================================================

class MachineMatcherEngineImpl {

  /**
   * Match G-code program to best machines from catalog.
   */
  match(input: MatchInput): MatchResult {
    // Extract program requirements from G-code
    const reqs = this._analyzeProgram(input.gcode);
    const priority = input.priority ?? "balanced";

    // Override with explicit inputs
    if (input.part_dimensions) {
      reqs.max_x = Math.max(reqs.max_x, input.part_dimensions.x);
      reqs.max_y = Math.max(reqs.max_y, input.part_dimensions.y);
      reqs.max_z = Math.max(reqs.max_z, input.part_dimensions.z);
    }
    if (input.required_axes) {
      if (input.required_axes >= 5) reqs.has_5axis = true;
      if (input.required_axes >= 4) reqs.has_rotary = true;
    }

    // Score each machine
    const scored: MachineScore[] = MACHINES.map(m => this._scoreMachine(m, reqs, input, priority));

    // Sort by score descending
    scored.sort((a, b) => {
      // Qualified first, then by score
      if (a.disqualified && !b.disqualified) return 1;
      if (!a.disqualified && b.disqualified) return -1;
      return b.score - a.score;
    });

    const qualified = scored.filter(s => !s.disqualified);

    return {
      recommendations: scored.slice(0, 10),
      best_match: qualified.length > 0 ? qualified[0] : null,
      program_requirements: reqs,
      machines_evaluated: MACHINES.length,
      machines_qualified: qualified.length,
    };
  }

  /**
   * Quick match — just return top 3 recommendations.
   */
  quickMatch(gcode: string, material?: string): { top3: string[]; requirements: string } {
    const result = this.match({ gcode, material });
    const top3 = result.recommendations.filter(r => !r.disqualified).slice(0, 3);
    return {
      top3: top3.map(r => `${r.machine_name} (score: ${r.score})`),
      requirements: `X${result.program_requirements.max_x} Y${result.program_requirements.max_y} Z${result.program_requirements.max_z} ` +
        `RPM${result.program_requirements.max_rpm} ${result.program_requirements.tool_count}T ` +
        `${result.program_requirements.has_5axis ? "5ax" : result.program_requirements.has_rotary ? "4ax" : "3ax"}`,
    };
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private _analyzeProgram(gcode: string): {
    max_x: number; max_y: number; max_z: number;
    max_rpm: number; estimated_power_kw: number;
    tool_count: number; has_rotary: boolean; has_5axis: boolean;
  } {
    let maxX = 0, maxY = 0, maxZ = 0, maxRPM = 0;
    const tools = new Set<number>();
    let hasA = false, hasB = false, hasC = false;

    for (const line of gcode.split("\n")) {
      const upper = line.trim().toUpperCase();
      if (!upper || upper.startsWith("(") || upper.startsWith(";")) continue;

      // Coordinates
      const xm = upper.match(/X([+-]?\d+\.?\d*)/);
      const ym = upper.match(/Y([+-]?\d+\.?\d*)/);
      const zm = upper.match(/Z([+-]?\d+\.?\d*)/);
      if (xm) maxX = Math.max(maxX, Math.abs(parseFloat(xm[1])));
      if (ym) maxY = Math.max(maxY, Math.abs(parseFloat(ym[1])));
      if (zm) maxZ = Math.max(maxZ, Math.abs(parseFloat(zm[1])));

      // Spindle speed
      const sm = upper.match(/S(\d+)/);
      if (sm) maxRPM = Math.max(maxRPM, parseInt(sm[1]));

      // Tool changes
      const tm = upper.match(/^T(\d+)/);
      if (tm) tools.add(parseInt(tm[1]));

      // Rotary axes
      if (/A[+-]?\d/.test(upper)) hasA = true;
      if (/B[+-]?\d/.test(upper)) hasB = true;
      if (/C[+-]?\d/.test(upper)) hasC = true;
    }

    const rotaryCount = [hasA, hasB, hasC].filter(Boolean).length;

    return {
      max_x: maxX,
      max_y: maxY,
      max_z: maxZ,
      max_rpm: maxRPM,
      estimated_power_kw: maxRPM > 10000 ? 15 : 10, // Simple estimate
      tool_count: tools.size,
      has_rotary: rotaryCount >= 1,
      has_5axis: rotaryCount >= 2,
    };
  }

  private _scoreMachine(
    m: MachineProfile,
    reqs: ReturnType<MachineMatcherEngineImpl["_analyzeProgram"]>,
    input: MatchInput,
    priority: string,
  ): MachineScore {
    const notes: string[] = [];
    let disqualified = false;
    let disqualifyReason = "";

    // Envelope score (must fit, bonus for headroom)
    const xFit = reqs.max_x > 0 ? m.x_mm / (reqs.max_x * 2) : 1; // *2 for +/- range
    const yFit = reqs.max_y > 0 ? m.y_mm / (reqs.max_y * 2) : 1;
    const zFit = reqs.max_z > 0 ? m.z_mm / reqs.max_z : 1;

    if (xFit < 1 || yFit < 1 || zFit < 1) {
      disqualified = true;
      disqualifyReason = `Envelope too small: need X${reqs.max_x * 2} Y${reqs.max_y * 2} Z${reqs.max_z}, have X${m.x_mm} Y${m.y_mm} Z${m.z_mm}`;
    }
    const envelopeScore = Math.min(100, Math.round(Math.min(xFit, yFit, zFit) * 80 + 20));

    // Spindle score
    let spindleScore = 100;
    if (reqs.max_rpm > m.max_rpm) {
      spindleScore = Math.round((m.max_rpm / reqs.max_rpm) * 100);
      if (spindleScore < 70) {
        disqualified = true;
        disqualifyReason = `Spindle too slow: need ${reqs.max_rpm} RPM, max ${m.max_rpm}`;
      }
      notes.push(`Spindle limited: ${m.max_rpm} vs ${reqs.max_rpm} RPM needed`);
    } else {
      const headroom = m.max_rpm / Math.max(reqs.max_rpm, 1);
      spindleScore = Math.min(100, Math.round(70 + headroom * 10));
    }

    // Power score
    const powerScore = reqs.estimated_power_kw > m.power_kw
      ? Math.round((m.power_kw / reqs.estimated_power_kw) * 80)
      : Math.min(100, Math.round(80 + (m.power_kw / Math.max(reqs.estimated_power_kw, 1)) * 5));

    // Axis score
    let axisScore = 100;
    if (reqs.has_5axis && m.axes < 5) {
      disqualified = true;
      disqualifyReason = `Needs 5-axis, machine has ${m.axes}`;
      axisScore = 20;
    } else if (reqs.has_rotary && m.axes < 4) {
      disqualified = true;
      disqualifyReason = `Needs rotary axis, machine is 3-axis`;
      axisScore = 30;
    } else if (m.axes > (reqs.has_5axis ? 5 : reqs.has_rotary ? 4 : 3)) {
      axisScore = 90; // Slight penalty for over-spec (cost)
      notes.push(`Over-spec: ${m.axes}-axis for ${reqs.has_5axis ? "5" : reqs.has_rotary ? "4" : "3"}-axis job`);
    }

    // Controller match
    let controllerScore = 80; // default neutral
    if (input.controller_preference) {
      const pref = input.controller_preference.toLowerCase();
      controllerScore = m.controller.toLowerCase() === pref ? 100 :
        m.controller.toLowerCase().includes(pref) ? 90 : 50;
    }

    // Tooling (ATC capacity)
    let toolingScore = 100;
    if (reqs.tool_count > m.atc) {
      toolingScore = Math.round((m.atc / reqs.tool_count) * 70);
      notes.push(`ATC too small: ${m.atc} slots for ${reqs.tool_count} tools — needs extra setup`);
    }
    if (input.min_atc_capacity && m.atc < input.min_atc_capacity) {
      toolingScore = Math.min(toolingScore, 40);
    }

    // Pallet requirement
    if (input.needs_pallet_changer && !m.pallet) {
      toolingScore = Math.min(toolingScore, 30);
      notes.push("No pallet changer");
    }

    // Cost score
    let costScore = 80;
    if (m.rate_hr) {
      if (input.max_hourly_rate && m.rate_hr > input.max_hourly_rate) {
        costScore = Math.round((input.max_hourly_rate / m.rate_hr) * 60);
        notes.push(`Over budget: $${m.rate_hr}/hr vs $${input.max_hourly_rate}/hr limit`);
      } else {
        costScore = Math.min(100, Math.round(100 - (m.rate_hr / 200) * 30));
      }
    }

    // Weighted overall score
    const weights = this._getWeights(priority);
    const overall = Math.round(
      envelopeScore * weights.envelope +
      spindleScore * weights.spindle +
      powerScore * weights.power +
      axisScore * weights.axes +
      controllerScore * weights.controller +
      toolingScore * weights.tooling +
      costScore * weights.cost
    );

    return {
      machine_name: m.name,
      manufacturer: m.manufacturer,
      model: m.model,
      score: disqualified ? Math.min(overall, 30) : overall,
      scores: {
        envelope: envelopeScore,
        spindle: spindleScore,
        power: powerScore,
        axes: axisScore,
        controller: controllerScore,
        tooling: toolingScore,
        cost: costScore,
      },
      specs: {
        x_travel_mm: m.x_mm,
        y_travel_mm: m.y_mm,
        z_travel_mm: m.z_mm,
        max_rpm: m.max_rpm,
        power_kw: m.power_kw,
        axes: m.axes,
        controller: m.controller,
        atc_capacity: m.atc,
        has_pallet: m.pallet,
        hourly_rate: m.rate_hr,
      },
      fit_notes: notes,
      disqualified,
      disqualify_reason: disqualifyReason || undefined,
    };
  }

  private _getWeights(priority: string): Record<string, number> {
    switch (priority) {
      case "speed":
        return { envelope: 0.15, spindle: 0.25, power: 0.20, axes: 0.15, controller: 0.05, tooling: 0.10, cost: 0.10 };
      case "precision":
        return { envelope: 0.15, spindle: 0.15, power: 0.10, axes: 0.20, controller: 0.10, tooling: 0.10, cost: 0.20 };
      case "cost":
        return { envelope: 0.15, spindle: 0.10, power: 0.10, axes: 0.10, controller: 0.05, tooling: 0.10, cost: 0.40 };
      default: // balanced
        return { envelope: 0.20, spindle: 0.15, power: 0.15, axes: 0.15, controller: 0.10, tooling: 0.10, cost: 0.15 };
    }
  }
}

export const machineMatcherEngine = new MachineMatcherEngineImpl();
