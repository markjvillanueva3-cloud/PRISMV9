/**
 * WEDMVirtualMachineEngine — WEDM AGI Phase 1 / U-P1-03 (digital twin)
 *
 * Maintains a virtual mirror of the physical Wire EDM machine. This is the
 * roadmap's "digital twin" unit, named WEDMVirtualMachine to avoid name
 * collision with the existing CNC-mill DigitalTwinEngine — the two are not
 * substitutable: milling twin tracks spindle/tool/coolant/program line,
 * WEDM twin tracks wire/gap/discharge/U-V taper channels.
 *
 * Consumes fused sensor frames (WEDMKalmanFusionEngine) and/or classified
 * machine states (WEDMMachineStateEngine) and produces:
 *   - TwinState : current position, mode, cumulative integrals
 *   - TwinPrediction : short-horizon linear extrapolation
 *   - TwinDiscrepancy : error vs a re-observed physical state
 *
 * Exit gates (P1-MS1):
 *   - sync() completes in <10 ms on commodity hardware
 *   - position tracking ≤1 mm when fed consistent physical frames
 *
 * Pure: no I/O, no wall clock dependency (tests supply nowMsOverride).
 *
 * Actions: wedm_twin_sync, wedm_twin_predict, wedm_twin_compare
 */

import type { WEDMFusedState } from "./WEDMKalmanFusionEngine.js";
import type {
  WEDMMachineState,
  WEDMMachineMode,
} from "./WEDMMachineStateEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface Position5D {
  x: number;
  y: number;
  u: number; // upper-guide taper offset
  v: number;
  z: number;
}

export interface TwinState {
  t_ms: number;
  mode: WEDMMachineMode;
  position_mm: Position5D;
  velocity_mm_s: Position5D;
  cumulative: {
    cut_length_mm: number;
    wire_consumed_mm: number;
    discharge_energy_J: number;
  };
  channels: {
    gap_voltage_V: number | null;
    discharge_current_A: number | null;
    wire_tension_N: number | null;
    bath_temperature_C: number | null;
  };
  syncLatencyMs: number;
}

export interface TwinPrediction {
  t_ms: number;
  horizonMs: number;
  position_mm: Position5D;
  wire_remaining_mm: number | null;
  mode_guess: WEDMMachineMode;
  confidence: number; // 0-1, decays with horizon
}

export interface TwinDiscrepancy {
  position_error_mm: number;
  axis_errors_mm: { x: number; y: number; z: number };
  mode_mismatch: boolean;
  withinBudget: boolean; // true if position_error_mm < 1.0
}

export interface TwinOptions {
  /** Total spool length in mm. If null, predictions report wire_remaining_mm = null. */
  wire_spool_mm?: number | null;
  /** Energy per discharge (J). Default 0.15 J ≈ typical wire EDM pulse. */
  energy_J_per_discharge?: number;
  /** Explicit wire feed (mm/s) when the controller does not publish it
   *  in the sensor frame. Caller can update this between syncs. */
  wire_feed_mm_s?: number;
}

// ────────────────────────── Helpers ──────────────────────────

function hypotXY(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}
function hypotXYZ(dx: number, dy: number, dz: number): number {
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function vel(prev: number, cur: number, dt_s: number): number {
  return dt_s > 0 ? (cur - prev) / dt_s : 0;
}
function nowNs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMVirtualMachineEngine {
  private state: TwinState | null = null;
  private wireRemaining_mm: number | null;
  private energyPerDischarge_J: number;
  private wireFeed_mm_s: number;

  constructor(opts: TwinOptions = {}) {
    this.wireRemaining_mm = opts.wire_spool_mm ?? null;
    this.energyPerDischarge_J = opts.energy_J_per_discharge ?? 0.15;
    this.wireFeed_mm_s = opts.wire_feed_mm_s ?? 0;
  }

  /** Update wire feed-rate (the controller publishes this on a slower cadence
   *  than sensor frames, so it is tracked separately). */
  setWireFeed(mm_s: number): void {
    this.wireFeed_mm_s = Math.max(0, mm_s);
  }

  /** Sync the virtual machine to the latest physical observation. */
  sync(
    machine: WEDMMachineState,
    fused?: WEDMFusedState,
    nowMsOverride?: number,
  ): TwinState {
    const start = nowNs();

    const pos: Position5D = {
      x: machine.position_mm.x ?? this.state?.position_mm.x ?? 0,
      y: machine.position_mm.y ?? this.state?.position_mm.y ?? 0,
      u: machine.position_mm.u ?? this.state?.position_mm.u ?? 0,
      v: machine.position_mm.v ?? this.state?.position_mm.v ?? 0,
      z: machine.position_mm.z ?? this.state?.position_mm.z ?? 0,
    };

    const dt_s =
      this.state !== null ? Math.max(0, (machine.t_ms - this.state.t_ms) / 1000) : 0;

    const velocity: Position5D = this.state
      ? {
          x: vel(this.state.position_mm.x, pos.x, dt_s),
          y: vel(this.state.position_mm.y, pos.y, dt_s),
          u: vel(this.state.position_mm.u, pos.u, dt_s),
          v: vel(this.state.position_mm.v, pos.v, dt_s),
          z: vel(this.state.position_mm.z, pos.z, dt_s),
        }
      : { x: 0, y: 0, u: 0, v: 0, z: 0 };

    const prevCum = this.state?.cumulative ?? {
      cut_length_mm: 0,
      wire_consumed_mm: 0,
      discharge_energy_J: 0,
    };

    const step_cut = this.state
      ? hypotXY(pos.x - this.state.position_mm.x, pos.y - this.state.position_mm.y)
      : 0;

    const step_wire = this.wireFeed_mm_s * dt_s;

    const current_A =
      fused?.discharge_current_A?.value ?? machine.channels.discharge_current?.value ?? 0;
    const spark_Hz =
      fused?.spark_frequency_Hz?.value ?? machine.channels.spark_frequency?.value ?? 0;
    const step_energy =
      current_A > 0 ? dt_s * spark_Hz * this.energyPerDischarge_J : 0;

    const cumulative = {
      cut_length_mm: prevCum.cut_length_mm + step_cut,
      wire_consumed_mm: prevCum.wire_consumed_mm + Math.max(0, step_wire),
      discharge_energy_J: prevCum.discharge_energy_J + Math.max(0, step_energy),
    };
    if (this.wireRemaining_mm !== null) {
      this.wireRemaining_mm = Math.max(0, this.wireRemaining_mm - Math.max(0, step_wire));
    }

    const channels = {
      gap_voltage_V:
        fused?.gap_voltage_V?.value ?? machine.channels.gap_voltage?.value ?? null,
      discharge_current_A:
        fused?.discharge_current_A?.value ??
        machine.channels.discharge_current?.value ??
        null,
      wire_tension_N:
        fused?.wire_tension_N?.value ?? machine.channels.wire_tension?.value ?? null,
      bath_temperature_C:
        fused?.bath_temperature_C?.value ??
        machine.channels.bath_temperature?.value ??
        null,
    };

    const syncLatencyMs =
      nowMsOverride !== undefined ? Math.max(0, nowMsOverride) : Math.max(0, nowNs() - start);

    this.state = {
      t_ms: machine.t_ms,
      mode: machine.mode,
      position_mm: pos,
      velocity_mm_s: velocity,
      cumulative,
      channels,
      syncLatencyMs,
    };
    return this.state;
  }

  /** Predict twin state forward by horizonMs (linear extrapolation, mode
   *  persistence). Returns null if there is no current state. */
  predict(horizonMs: number): TwinPrediction | null {
    if (!this.state) return null;
    const h = Math.max(0, horizonMs / 1000);
    const pos: Position5D = {
      x: this.state.position_mm.x + this.state.velocity_mm_s.x * h,
      y: this.state.position_mm.y + this.state.velocity_mm_s.y * h,
      u: this.state.position_mm.u + this.state.velocity_mm_s.u * h,
      v: this.state.position_mm.v + this.state.velocity_mm_s.v * h,
      z: this.state.position_mm.z + this.state.velocity_mm_s.z * h,
    };
    // Confidence decays over 1 s → 0, clamped to [0, 1].
    const confidence = Math.max(0, Math.min(1, 1 - h));
    const wire_remaining_mm =
      this.wireRemaining_mm !== null
        ? Math.max(0, this.wireRemaining_mm - this.wireFeed_mm_s * h)
        : null;
    return {
      t_ms: this.state.t_ms + horizonMs,
      horizonMs,
      position_mm: pos,
      wire_remaining_mm,
      mode_guess: this.state.mode,
      confidence,
    };
  }

  /** Compare the virtual machine to an externally-observed physical state. */
  compareToPhysical(physical: WEDMMachineState): TwinDiscrepancy | null {
    if (!this.state) return null;
    const dx = (physical.position_mm.x ?? this.state.position_mm.x) - this.state.position_mm.x;
    const dy = (physical.position_mm.y ?? this.state.position_mm.y) - this.state.position_mm.y;
    const dz = (physical.position_mm.z ?? this.state.position_mm.z) - this.state.position_mm.z;
    const err = hypotXYZ(dx, dy, dz);
    return {
      position_error_mm: err,
      axis_errors_mm: { x: dx, y: dy, z: dz },
      mode_mismatch: physical.mode !== this.state.mode,
      withinBudget: err < 1.0,
    };
  }

  getState(): TwinState | null {
    return this.state;
  }

  getWireRemaining(): number | null {
    return this.wireRemaining_mm;
  }

  reset(opts: TwinOptions = {}): void {
    this.state = null;
    if ("wire_spool_mm" in opts) this.wireRemaining_mm = opts.wire_spool_mm ?? null;
    if (opts.energy_J_per_discharge !== undefined) {
      this.energyPerDischarge_J = opts.energy_J_per_discharge;
    }
    if (opts.wire_feed_mm_s !== undefined) {
      this.wireFeed_mm_s = opts.wire_feed_mm_s;
    }
  }
}

export const wedmVirtualMachineEngine = new WEDMVirtualMachineEngine();
