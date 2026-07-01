/**
 * MillAuxAxisTimingEngine
 * ========================
 *
 * 14-component mill cycle-time decomposition focused on auxiliary-axis
 * time that dominates real-world door-to-door cycle but is missed by
 * generic cut-time models.
 *
 * Mill parity for LatheAuxAxisTimingEngine (LATHE-PRO-MS10) with mill-
 * specific aux axes substituted in:
 *   - Lathe had: turret(BMT/VDI/gang), tailstock, part-catcher, live-tool
 *   - Mill has:  ATC (auto tool change), 4th-axis rotary index, 5th-axis
 *                tilt, pallet changer, probe cycle, vise actuation, head
 *                index (B-axis indexer)
 *
 * Components modeled (14, vs lathe 12):
 *   1.  cut_time         — NC program cut path / feed
 *   2.  rapid_traverse   — G00 moves at machine rapid rate
 *   3.  spindle_accel    — ramp to commanded rpm (high-speed mills 0-15k RPM ramp)
 *   4.  spindle_decel    — ramp to stop / orient for ATC
 *   5.  atc_swap         — auto tool change (umbrella vs swing-arm)
 *   6.  rotary_a_index   — 4th-axis A rotary index (trunnion or table)
 *   7.  tilt_b_index     — 5th-axis B tilt (full 5-axis simultaneous machines)
 *   8.  head_c_index     — Right-angle / indexing head (5-face machines)
 *   9.  pallet_change    — pallet-changer cycle (10-200s for HMC)
 *  10.  probe_cycle      — touch-probe routine (renishaw / blum / heidenhain)
 *  11.  vise_actuate     — pneumatic/hydraulic vise clamp/unclamp
 *  12.  coolant_settle   — coolant on + settle delay
 *  13.  dwell_g4         — programmed pauses (G4)
 *  14.  lookahead        — block-lookahead decel on sharp corners
 *
 * Formulas (key ones):
 *   spindle_accel_s   = |rpm_cmd - rpm_prev| / accel_rpm_per_s
 *   atc_swap_s        = base_swap + arm_swing + spindle_orient_dwell
 *   rotary_index_s    = base + |Δθ| / rotary_rate_deg_s
 *   tilt_index_s      = base + |Δφ| / tilt_rate_deg_s
 *   pallet_change_s   = base_lift + Δstation × shuttle_per_pos + base_drop
 *   lookahead_s       = Σ (sharp_corner_count) × lookahead_per_corner
 *
 * Distinct from existing:
 *   - LatheAuxAxisTimingEngine    : lathe turret/tailstock/catcher
 *   - MillBlockTimeProfilerEngine : block-bucket aggregation (iter64)
 *   - This engine                 : per-op mill aux axes (ATC + rotary +
 *                                   tilt + pallet + probe + vise)
 *
 * References:
 *   - Mazak Variaxis spec sheets (5-axis rotary/tilt rates)
 *   - DMG MORI DMU-series spec (B-axis trunnion timing)
 *   - Makino A-series spec (HMC pallet-change timing)
 *   - Renishaw "On-Machine Probing" technical guide (probe routines)
 *   - Heidenhain TNC 640 timing tables
 *   - Sandvik Cutting Tools Technical Guide §Look-Ahead Decel
 *
 * @module engines/MillAuxAxisTimingEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-AUX-AXIS-TIMING (iter74)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

/** Default machine rapid rate (mm/min) — typical modern VMC 30 m/min. */
export const DEFAULT_RAPID_RATE_MM_MIN = 30_000;

/** Default spindle accel (rpm/s) — typical HSM ramp ~15000 rpm/4s = 3750. */
export const DEFAULT_SPINDLE_ACCEL_RPM_S = 3_750;

/** Default ATC swap time (s) — umbrella ATC 1.5s, swing-arm ATC 1.8s. */
export const DEFAULT_ATC_SWAP_S = 1.8;

/** Default rotary A-axis rate (deg/s) — trunnion typical 90 deg/s. */
export const DEFAULT_ROTARY_A_RATE_DEG_S = 90;

/** Default rotary A-axis base index time (s) — accel/decel overhead. */
export const DEFAULT_ROTARY_A_BASE_S = 0.4;

/** Default tilt B-axis rate (deg/s) — slower than rotary, typical 60 deg/s. */
export const DEFAULT_TILT_B_RATE_DEG_S = 60;

/** Default tilt B-axis base index time (s). */
export const DEFAULT_TILT_B_BASE_S = 0.5;

/** Default head C-axis right-angle index time (s) — 90° detent. */
export const DEFAULT_HEAD_C_INDEX_S = 2.0;

/** Default pallet-changer base cycle (s) — HMC shuttle, 30s typical. */
export const DEFAULT_PALLET_CHANGE_S = 30;

/** Default probe cycle (s) — single-touch probe routine. */
export const DEFAULT_PROBE_CYCLE_S = 4.5;

/** Default vise actuation (s) — pneumatic clamp + verify. */
export const DEFAULT_VISE_ACTUATE_S = 2.0;

/** Default coolant settle delay (s). */
export const DEFAULT_COOLANT_SETTLE_S = 0.3;

/** Default lookahead decel per sharp corner (s). */
export const DEFAULT_LOOKAHEAD_PER_CORNER_S = 0.05;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillAtcKind = "umbrella" | "swing_arm" | "chain" | "drum";

export interface MillAuxAxisOpInput {
  op: string;
  /** Programmed feed cut time seconds */
  cut_time_s: number;
  /** Rapid moves length mm */
  rapid_distance_mm?: number;
  /** Target spindle rpm for this op */
  spindle_rpm?: number;
  /** Auto tool change before this op? */
  atc_swap?: boolean;
  /** Rotary A-axis target angle (deg) — if changed from prev op */
  a_axis_deg?: number;
  /** Tilt B-axis target angle (deg) — if changed from prev op */
  b_axis_deg?: number;
  /** Head C-axis index target (e.g., 0/90/180/270) — discrete step */
  c_head_index_deg?: number;
  /** Pallet shuttle stations to move (1 = next, 2 = skip one, etc.) */
  pallet_shuttle_stations?: number;
  /** Probe touch points for this op (Renishaw / Blum) */
  probe_touch_count?: number;
  /** Vise actuation (clamp/unclamp) on this op? */
  vise_actuate?: boolean;
  /** Coolant on (settle delay) */
  coolant_on?: boolean;
  /** Additional G4 dwell seconds */
  dwell_g4_s?: number;
  /** Corner count for lookahead decel */
  sharp_corner_count?: number;
}

export interface MillAuxAxisTimingInput {
  operations: MillAuxAxisOpInput[];
  /** Machine rapid rate mm/min (default DEFAULT_RAPID_RATE_MM_MIN) */
  rapid_rate_mm_min?: number;
  /** Spindle accel rpm/s (default DEFAULT_SPINDLE_ACCEL_RPM_S) */
  spindle_accel_rpm_s?: number;
  /** ATC kind for swap time defaults */
  atc_kind?: MillAtcKind;
  /** ATC swap time override (s) */
  atc_swap_s?: number;
  /** Rotary A rate deg/s (default DEFAULT_ROTARY_A_RATE_DEG_S) */
  rotary_a_rate_deg_s?: number;
  /** Rotary A base index time (s) */
  rotary_a_base_s?: number;
  /** Tilt B rate deg/s */
  tilt_b_rate_deg_s?: number;
  /** Tilt B base index time (s) */
  tilt_b_base_s?: number;
  /** Head C index time per step (s) */
  head_c_index_s?: number;
  /** Pallet change time (s) */
  pallet_change_s?: number;
  /** Per-touch probe time within a routine (s) */
  probe_per_touch_s?: number;
  /** Vise actuate cycle (s) */
  vise_actuate_s?: number;
  /** Coolant settle (s) */
  coolant_settle_s?: number;
  /** Lookahead per corner (s) */
  lookahead_per_corner_s?: number;
}

export interface MillAuxAxisComponent {
  name: string;
  time_s: number;
  pct: number;
}

export interface MillAuxAxisTimingResult {
  components: MillAuxAxisComponent[];
  total_time_s: number;
  total_time_min: number;
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const ATC_DEFAULTS_BY_KIND: Record<MillAtcKind, number> = {
  swing_arm: 1.8,
  umbrella:  1.5,
  chain:     3.0,
  drum:      2.5,
};

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillAuxAxisTimingEngineImpl {
  analyze(i: MillAuxAxisTimingInput): MillAuxAxisTimingResult {
    this.validate(i);
    const reasoning: string[] = [];

    const rapidRate = i.rapid_rate_mm_min ?? DEFAULT_RAPID_RATE_MM_MIN;
    const spAccel = i.spindle_accel_rpm_s ?? DEFAULT_SPINDLE_ACCEL_RPM_S;
    const atcKind = i.atc_kind ?? "swing_arm";
    const atcSwap = i.atc_swap_s ?? ATC_DEFAULTS_BY_KIND[atcKind];
    const rotARate = i.rotary_a_rate_deg_s ?? DEFAULT_ROTARY_A_RATE_DEG_S;
    const rotABase = i.rotary_a_base_s ?? DEFAULT_ROTARY_A_BASE_S;
    const tiltBRate = i.tilt_b_rate_deg_s ?? DEFAULT_TILT_B_RATE_DEG_S;
    const tiltBBase = i.tilt_b_base_s ?? DEFAULT_TILT_B_BASE_S;
    const headCInd = i.head_c_index_s ?? DEFAULT_HEAD_C_INDEX_S;
    const palletS = i.pallet_change_s ?? DEFAULT_PALLET_CHANGE_S;
    const probePerTouch = i.probe_per_touch_s ?? DEFAULT_PROBE_CYCLE_S;
    const viseS = i.vise_actuate_s ?? DEFAULT_VISE_ACTUATE_S;
    const coolantSettle = i.coolant_settle_s ?? DEFAULT_COOLANT_SETTLE_S;
    const lookahead = i.lookahead_per_corner_s ?? DEFAULT_LOOKAHEAD_PER_CORNER_S;

    let cut = 0, rapid = 0, spAccelT = 0, spDecelT = 0,
        atc = 0, rotA = 0, tiltB = 0, headC = 0,
        pallet = 0, probe = 0, vise = 0,
        coolant = 0, dwell = 0, looka = 0;

    let prevRpm = 0;
    let prevA: number | null = null;
    let prevB: number | null = null;
    let prevC: number | null = null;

    for (const op of i.operations) {
      cut += op.cut_time_s;
      if (op.rapid_distance_mm) rapid += (op.rapid_distance_mm / rapidRate) * 60;
      if (op.spindle_rpm !== undefined && spAccel > 0) {
        spAccelT += Math.abs(op.spindle_rpm - prevRpm) / spAccel;
        prevRpm = op.spindle_rpm;
      }
      if (op.atc_swap) atc += atcSwap;

      // Rotary A: time = base + |Δθ| / rate. If first occurrence, no prev → no time.
      if (op.a_axis_deg !== undefined && prevA !== null) {
        const delta = Math.abs(op.a_axis_deg - prevA);
        if (delta > 0) rotA += rotABase + delta / rotARate;
      }
      if (op.a_axis_deg !== undefined) prevA = op.a_axis_deg;

      // Tilt B
      if (op.b_axis_deg !== undefined && prevB !== null) {
        const delta = Math.abs(op.b_axis_deg - prevB);
        if (delta > 0) tiltB += tiltBBase + delta / tiltBRate;
      }
      if (op.b_axis_deg !== undefined) prevB = op.b_axis_deg;

      // Head C index (discrete — only fires when target differs from prev)
      if (op.c_head_index_deg !== undefined && prevC !== null && op.c_head_index_deg !== prevC) {
        headC += headCInd;
      }
      if (op.c_head_index_deg !== undefined) prevC = op.c_head_index_deg;

      if (op.pallet_shuttle_stations && op.pallet_shuttle_stations > 0) {
        pallet += palletS;
      }
      if (op.probe_touch_count && op.probe_touch_count > 0) {
        probe += op.probe_touch_count * probePerTouch;
      }
      if (op.vise_actuate) vise += viseS;
      if (op.coolant_on) coolant += coolantSettle;
      dwell += op.dwell_g4_s ?? 0;
      if (op.sharp_corner_count) looka += op.sharp_corner_count * lookahead;
    }
    if (prevRpm > 0 && spAccel > 0) spDecelT = prevRpm / spAccel;

    const components: MillAuxAxisComponent[] = [
      { name: "cut_time", time_s: cut, pct: 0 },
      { name: "rapid_traverse", time_s: rapid, pct: 0 },
      { name: "spindle_accel", time_s: spAccelT, pct: 0 },
      { name: "spindle_decel", time_s: spDecelT, pct: 0 },
      { name: "atc_swap", time_s: atc, pct: 0 },
      { name: "rotary_a_index", time_s: rotA, pct: 0 },
      { name: "tilt_b_index", time_s: tiltB, pct: 0 },
      { name: "head_c_index", time_s: headC, pct: 0 },
      { name: "pallet_change", time_s: pallet, pct: 0 },
      { name: "probe_cycle", time_s: probe, pct: 0 },
      { name: "vise_actuate", time_s: vise, pct: 0 },
      { name: "coolant_settle", time_s: coolant, pct: 0 },
      { name: "dwell_g4", time_s: dwell, pct: 0 },
      { name: "lookahead", time_s: looka, pct: 0 },
    ];
    const total = components.reduce((s, c) => s + c.time_s, 0);
    for (const c of components) {
      c.pct = total > 0 ? round2((c.time_s / total) * 100) : 0;
      c.time_s = round2(c.time_s);
    }

    reasoning.push(`Total ${round2(total)}s (${round2(total / 60)}min) across ${components.length} components`);
    const sorted = [...components].sort((a, b) => b.pct - a.pct);
    if (sorted[0]) reasoning.push(`Dominant: ${sorted[0].name} (${sorted[0].pct}%)`);
    if (sorted[1] && sorted[1].pct > 5) reasoning.push(`Secondary: ${sorted[1].name} (${sorted[1].pct}%)`);
    reasoning.push(`ATC kind: ${atcKind} swap=${atcSwap}s`);

    return {
      components,
      total_time_s: round2(total),
      total_time_min: round2(total / 60),
      reasoning,
    };
  }

  getStats(): {
    components: number;
    mill_canonical_aux_axes: string[];
    reference: string;
  } {
    return {
      components: 14,
      mill_canonical_aux_axes: [
        "atc_swap", "rotary_a_index", "tilt_b_index", "head_c_index",
        "pallet_change", "probe_cycle", "vise_actuate",
      ], // 7 mill-specific vs lathe's 12 components mostly different aux
      reference: "Mazak Variaxis spec; DMG MORI DMU; Makino A-series; Renishaw probing guide; Heidenhain TNC 640 timing tables",
    };
  }

  private validate(i: MillAuxAxisTimingInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillAuxAxisTimingEngine.analyze: input required");
    if (!Array.isArray(i.operations)) throw new TypeError("operations[] required");
    for (const op of i.operations) {
      if (!(op.cut_time_s >= 0)) throw new TypeError(`Op '${op.op}': cut_time_s must be >= 0`);
    }
  }
}

export const millAuxAxisTimingEngine = new MillAuxAxisTimingEngineImpl();
export type { MillAuxAxisTimingEngineImpl };
