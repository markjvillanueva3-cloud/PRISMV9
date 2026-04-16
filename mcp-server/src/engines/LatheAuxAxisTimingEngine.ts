/**
 * LatheAuxAxisTimingEngine
 * ==========================
 *
 * 12-component lathe cycle-time decomposition focused on auxiliary-axis
 * time (chuck/tailstock/catcher/turret) that dominates real-world bills
 * but is missed by generic cut-time models.
 *
 * Components modeled:
 *   1. cut_time        — NC program cut path / feed
 *   2. rapid_traverse  — G00 moves at machine rapid rate
 *   3. spindle_accel   — ramp to commanded rpm (inertia-limited)
 *   4. spindle_decel   — ramp to stop
 *   5. turret_index    — Δturret_pos × index_time (BMT vs VDI, CW vs CCW)
 *   6. coolant_settle  — coolant on + settle delay
 *   7. chuck_actuate   — clamp / unclamp
 *   8. tailstock       — advance + retract
 *   9. part_catcher    — deploy + dwell + retract
 *  10. dwell_g4        — programmed pauses (G4)
 *  11. lookahead       — block-lookahead decel on sharp corners
 *  12. tool_change     — extra time beyond turret index (e.g., live tool engage)
 *
 * Formulas (key ones):
 *   spindle_accel_s  = rpm_cmd / (accel_rpm_per_s)
 *   turret_index_s   = base_index + steps * step_time
 *   lookahead_s      = Σ (1 - cos(θ_corner/2)) * feed_decel_factor
 *
 * Distinct from generic CycleTimeEngine (pure cut-time rollup):
 *   this engine models lathe-specific auxiliary axes (chuck, tailstock,
 *   catcher) and turret kinematics (BMT vs VDI vs gang) that drive 20-40%
 *   of true door-to-door cycle on production turning.
 *
 * References:
 *   - Okuma OSP machine spec sheets (turret indexing rates)
 *   - Mori Seiki NT-series spec (catcher cycle dwell)
 *   - Sandvik Cutting Tools Technical Guide (feed look-ahead)
 *
 * @module engines/LatheAuxAxisTimingEngine
 * @milestone LATHE-PRO-MS10
 */

export type TurretKinematics = "BMT" | "VDI" | "gang_tool";

export interface AuxAxisOpInput {
  op: string;
  /** Programmed feed cut time seconds */
  cut_time_s: number;
  /** Rapid moves length mm */
  rapid_distance_mm?: number;
  /** Target spindle rpm for this op */
  spindle_rpm?: number;
  /** Turret positions away from current (0..max/2) */
  turret_delta_positions?: number;
  /** Coolant turn on this op? */
  coolant_on?: boolean;
  /** Includes chuck actuation? */
  chuck_actuate?: boolean;
  /** Tailstock advance/retract? */
  tailstock_move?: boolean;
  /** Part catcher deploy? */
  part_catcher?: boolean;
  /** Additional G4 dwell seconds */
  dwell_g4_s?: number;
  /** Corner count for lookahead (approx sharp corners) */
  sharp_corner_count?: number;
  /** Live tool engagement? */
  live_tool_engage?: boolean;
}

export interface AuxAxisTimingInput {
  operations: AuxAxisOpInput[];
  /** Machine rapid rate mm/min (default 30000) */
  rapid_rate_mm_min?: number;
  /** Spindle accel rpm/s (default 250) */
  spindle_accel_rpm_s?: number;
  /** Turret kinematics */
  turret: TurretKinematics;
  /** Base turret index seconds (default 0.2 BMT, 0.5 VDI, 0 gang) */
  turret_base_index_s?: number;
  /** Per-step turret time (default 0.08 BMT, 0.15 VDI, 0 gang) */
  turret_step_time_s?: number;
  /** Coolant settle delay (default 0.3 s) */
  coolant_settle_s?: number;
  /** Chuck clamp/unclamp (default 1.5 s) */
  chuck_actuate_s?: number;
  /** Tailstock advance + retract (default 3.0 s) */
  tailstock_cycle_s?: number;
  /** Part catcher deploy+dwell+retract (default 2.5 s) */
  part_catcher_cycle_s?: number;
  /** Lookahead decel seconds per sharp corner (default 0.05 s) */
  lookahead_per_corner_s?: number;
  /** Live tool engage (default 0.8 s) */
  live_tool_engage_s?: number;
}

export interface AuxAxisComponent {
  name: string;
  time_s: number;
  pct: number;
}

export interface AuxAxisTimingResult {
  components: AuxAxisComponent[];
  total_time_s: number;
  total_time_min: number;
  reasoning: string[];
}

const DEFAULTS_BY_TURRET: Record<TurretKinematics, { base: number; step: number }> = {
  BMT: { base: 0.2, step: 0.08 },
  VDI: { base: 0.5, step: 0.15 },
  gang_tool: { base: 0, step: 0 },
};

class LatheAuxAxisTimingEngineImpl {
  analyze(i: AuxAxisTimingInput): AuxAxisTimingResult {
    const reasoning: string[] = [];

    const rapidRate = i.rapid_rate_mm_min ?? 30000;
    const spAccel = i.spindle_accel_rpm_s ?? 250;
    const turretDefaults = DEFAULTS_BY_TURRET[i.turret];
    const turretBase = i.turret_base_index_s ?? turretDefaults.base;
    const turretStep = i.turret_step_time_s ?? turretDefaults.step;
    const coolantSettle = i.coolant_settle_s ?? 0.3;
    const chuckAct = i.chuck_actuate_s ?? 1.5;
    const tailCycle = i.tailstock_cycle_s ?? 3.0;
    const catcherCycle = i.part_catcher_cycle_s ?? 2.5;
    const lookahead = i.lookahead_per_corner_s ?? 0.05;
    const liveToolEng = i.live_tool_engage_s ?? 0.8;

    let cut = 0, rapid = 0, spAccelT = 0, spDecelT = 0, turret = 0, coolant = 0,
        chuck = 0, tail = 0, catcher = 0, dwell = 0, looka = 0, toolChange = 0;

    let prevRpm = 0;
    for (const op of i.operations) {
      cut += op.cut_time_s;
      if (op.rapid_distance_mm) rapid += (op.rapid_distance_mm / rapidRate) * 60;
      if (op.spindle_rpm !== undefined && spAccel > 0) {
        spAccelT += Math.abs(op.spindle_rpm - prevRpm) / spAccel;
        prevRpm = op.spindle_rpm;
      }
      if (op.turret_delta_positions && op.turret_delta_positions > 0) {
        turret += turretBase + op.turret_delta_positions * turretStep;
      }
      if (op.coolant_on) coolant += coolantSettle;
      if (op.chuck_actuate) chuck += chuckAct;
      if (op.tailstock_move) tail += tailCycle;
      if (op.part_catcher) catcher += catcherCycle;
      dwell += op.dwell_g4_s ?? 0;
      if (op.sharp_corner_count) looka += op.sharp_corner_count * lookahead;
      if (op.live_tool_engage) toolChange += liveToolEng;
    }
    if (prevRpm > 0 && spAccel > 0) spDecelT = prevRpm / spAccel;

    const components: AuxAxisComponent[] = [
      { name: "cut_time", time_s: cut, pct: 0 },
      { name: "rapid_traverse", time_s: rapid, pct: 0 },
      { name: "spindle_accel", time_s: spAccelT, pct: 0 },
      { name: "spindle_decel", time_s: spDecelT, pct: 0 },
      { name: "turret_index", time_s: turret, pct: 0 },
      { name: "coolant_settle", time_s: coolant, pct: 0 },
      { name: "chuck_actuate", time_s: chuck, pct: 0 },
      { name: "tailstock", time_s: tail, pct: 0 },
      { name: "part_catcher", time_s: catcher, pct: 0 },
      { name: "dwell_g4", time_s: dwell, pct: 0 },
      { name: "lookahead", time_s: looka, pct: 0 },
      { name: "tool_change", time_s: toolChange, pct: 0 },
    ];
    const total = components.reduce((s, c) => s + c.time_s, 0);
    for (const c of components) {
      c.pct = total > 0 ? round2((c.time_s / total) * 100) : 0;
      c.time_s = round2(c.time_s);
    }

    reasoning.push(`Total ${round2(total)}s (${round2(total / 60)}min) across ${components.length} components`);
    const top = [...components].sort((a, b) => b.pct - a.pct)[0];
    if (top) reasoning.push(`Dominant: ${top.name} (${top.pct}%)`);
    reasoning.push(`Turret ${i.turret} base=${turretBase}s step=${turretStep}s`);

    return {
      components,
      total_time_s: round2(total),
      total_time_min: round2(total / 60),
      reasoning,
    };
  }

  getStats(): { components: number; reference: string } {
    return {
      components: 12,
      reference: "Okuma OSP spec sheets; Mori Seiki NT series; Sandvik Technical Guide",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheAuxAxisTimingEngine = new LatheAuxAxisTimingEngineImpl();
export type { LatheAuxAxisTimingEngineImpl };
