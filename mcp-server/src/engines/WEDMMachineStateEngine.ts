/**
 * WEDMMachineStateEngine — WEDM AGI Phase 1 / U-P1-01
 *
 * Aggregates raw sensor streams from a Wire EDM machine into a single
 * structured MachineState snapshot with rolling history and state
 * classification (idle / calibrating / cutting / alarm / fault).
 *
 * Canonical sensor channels (all optional — engine gracefully handles partial
 * reports):
 *   - gap_voltage_V, discharge_current_A, pulse_on_us, pulse_off_us
 *   - wire_tension_N, wire_feed_mm_s
 *   - flush_pressure_bar, dielectric_conductivity_uS_cm, bath_temperature_C
 *   - position_x_mm, position_y_mm, position_u_mm, position_v_mm, position_z_mm
 *   - servo_voltage_V, spark_frequency_Hz
 *   - alarm_bits (bit-field raised by controller)
 *
 * The engine keeps a bounded ring buffer of recent snapshots so downstream
 * consumers (digital twin, anomaly hooks, SPC) can pull windowed history.
 * Latency budget: each ingest must complete in < 10 ms on commodity hardware
 * (exit gate from P1-MS1).
 *
 * This engine is pure: no I/O, no wall clock dependence (timestamps must be
 * provided by the caller so determinism is preserved for tests).
 *
 * Actions: wedm_machine_state_ingest, wedm_machine_state_get
 */

// ────────────────────────── Types ──────────────────────────

/** Safe numeric value with uncertainty, used for aggregate signals. */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty?: number;
  confidence?: number;
  source: string;
  warning?: string;
}

export type WEDMMachineMode =
  | "idle"
  | "calibrating"
  | "cutting"
  | "alarm"
  | "fault";

/** A single sensor frame from the controller. All fields optional. */
export interface WEDMSensorReading {
  /** ms since epoch — caller-supplied for determinism. */
  t_ms: number;
  gap_voltage_V?: number;
  discharge_current_A?: number;
  pulse_on_us?: number;
  pulse_off_us?: number;
  wire_tension_N?: number;
  wire_feed_mm_s?: number;
  flush_pressure_bar?: number;
  dielectric_conductivity_uS_cm?: number;
  bath_temperature_C?: number;
  position_x_mm?: number;
  position_y_mm?: number;
  position_u_mm?: number;
  position_v_mm?: number;
  position_z_mm?: number;
  servo_voltage_V?: number;
  spark_frequency_Hz?: number;
  alarm_bits?: number;
}

export interface WEDMMachineState {
  t_ms: number;
  mode: WEDMMachineMode;
  modeConfidence: number; // 0-1
  healthScore: number; // 0-1 composite
  channels: {
    gap_voltage: AtomicValue | null;
    discharge_current: AtomicValue | null;
    wire_tension: AtomicValue | null;
    flush_pressure: AtomicValue | null;
    bath_temperature: AtomicValue | null;
    spark_frequency: AtomicValue | null;
  };
  position_mm: {
    x: number | null;
    y: number | null;
    u: number | null;
    v: number | null;
    z: number | null;
  };
  activeAlarmBits: number; // 0 = none
  activeWarnings: string[];
  latencyMs: number; // time taken to ingest
}

export interface WEDMStateTransition {
  from: WEDMMachineMode;
  to: WEDMMachineMode;
  t_ms: number;
  cause: string;
}

// ────────────────────────── Constants ──────────────────────────

/** Physical operating bounds — readings outside flag a warning, not a block. */
const BOUNDS = {
  gap_voltage_V: { min: 0, max: 320 },
  discharge_current_A: { min: 0, max: 60 },
  wire_tension_N: { min: 0, max: 25 },
  flush_pressure_bar: { min: 0, max: 20 },
  bath_temperature_C: { min: 5, max: 45 },
  spark_frequency_Hz: { min: 0, max: 100_000 },
} as const;

/** Mode classification thresholds — tuned for Mitsubishi MV / Makino wire EDM. */
const MODE_THRESHOLDS = {
  // "cutting": any non-trivial discharge activity
  cutting_min_current_A: 0.5,
  cutting_min_spark_Hz: 100,
  // "calibrating": probing / reference moves, no discharge
  calibrating_max_current_A: 0.3,
  calibrating_min_wire_tension_N: 0.5,
} as const;

const DEFAULT_HISTORY_CAPACITY = 256;

// ────────────────────────── Helpers ──────────────────────────

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function mkAV(
  value: number | undefined,
  unit: string,
  source: string,
  bound?: { min: number; max: number },
): AtomicValue | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  const av: AtomicValue = { value, unit, source };
  if (bound) {
    if (value < bound.min || value > bound.max) {
      av.warning = `${source} ${value}${unit} out of [${bound.min}, ${bound.max}]`;
      av.confidence = 0.4;
    } else {
      av.confidence = 0.95;
    }
  }
  return av;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMMachineStateEngine {
  private history: WEDMMachineState[] = [];
  private capacity: number;
  private lastMode: WEDMMachineMode = "idle";
  private transitions: WEDMStateTransition[] = [];

  constructor(historyCapacity: number = DEFAULT_HISTORY_CAPACITY) {
    this.capacity = Math.max(2, historyCapacity);
  }

  /** Ingest a new sensor frame and return the aggregated MachineState. */
  ingest(reading: WEDMSensorReading, nowMs?: number): WEDMMachineState {
    const startNs = hrstart();
    const t = reading.t_ms;
    const warnings: string[] = [];

    const gap = mkAV(reading.gap_voltage_V, "V", "gap_voltage", BOUNDS.gap_voltage_V);
    const cur = mkAV(
      reading.discharge_current_A,
      "A",
      "discharge_current",
      BOUNDS.discharge_current_A,
    );
    const ten = mkAV(reading.wire_tension_N, "N", "wire_tension", BOUNDS.wire_tension_N);
    const flux = mkAV(
      reading.flush_pressure_bar,
      "bar",
      "flush_pressure",
      BOUNDS.flush_pressure_bar,
    );
    const bath = mkAV(
      reading.bath_temperature_C,
      "C",
      "bath_temperature",
      BOUNDS.bath_temperature_C,
    );
    const spark = mkAV(
      reading.spark_frequency_Hz,
      "Hz",
      "spark_frequency",
      BOUNDS.spark_frequency_Hz,
    );

    for (const av of [gap, cur, ten, flux, bath, spark]) {
      if (av?.warning) warnings.push(av.warning);
    }

    const activeAlarmBits = reading.alarm_bits ?? 0;
    const { mode, confidence, cause } = this.classifyMode(reading, activeAlarmBits);

    // Record transition if mode changed
    if (mode !== this.lastMode) {
      this.transitions.push({ from: this.lastMode, to: mode, t_ms: t, cause });
      this.lastMode = mode;
    }

    const health = this.computeHealth({ mode, warnings, activeAlarmBits });

    const latencyMs = hrend(startNs, nowMs);

    const state: WEDMMachineState = {
      t_ms: t,
      mode,
      modeConfidence: confidence,
      healthScore: health,
      channels: {
        gap_voltage: gap,
        discharge_current: cur,
        wire_tension: ten,
        flush_pressure: flux,
        bath_temperature: bath,
        spark_frequency: spark,
      },
      position_mm: {
        x: reading.position_x_mm ?? null,
        y: reading.position_y_mm ?? null,
        u: reading.position_u_mm ?? null,
        v: reading.position_v_mm ?? null,
        z: reading.position_z_mm ?? null,
      },
      activeAlarmBits,
      activeWarnings: warnings,
      latencyMs,
    };

    this.history.push(state);
    if (this.history.length > this.capacity) {
      this.history.splice(0, this.history.length - this.capacity);
    }

    return state;
  }

  /** Most recent aggregated state, or null if none ingested. */
  getState(): WEDMMachineState | null {
    return this.history.length === 0 ? null : this.history[this.history.length - 1];
  }

  /** All states with t_ms within [now - windowMs, now]. */
  getHistory(windowMs: number): WEDMMachineState[] {
    if (this.history.length === 0) return [];
    const latest = this.history[this.history.length - 1].t_ms;
    const cutoff = latest - Math.max(0, windowMs);
    return this.history.filter(s => s.t_ms >= cutoff);
  }

  /** Full list of mode transitions observed so far. */
  getTransitions(): WEDMStateTransition[] {
    return [...this.transitions];
  }

  /** Reset engine state (for test isolation). */
  reset(): void {
    this.history = [];
    this.transitions = [];
    this.lastMode = "idle";
  }

  // ── internal classification ──

  private classifyMode(
    r: WEDMSensorReading,
    alarmBits: number,
  ): { mode: WEDMMachineMode; confidence: number; cause: string } {
    // Priority: alarm/fault > cutting > calibrating > idle
    if (alarmBits !== 0) {
      // A sustained alarm bit across multiple frames escalates to fault.
      const last = this.history[this.history.length - 1];
      if (last && last.activeAlarmBits === alarmBits && last.mode === "alarm") {
        return { mode: "fault", confidence: 0.9, cause: `alarm_bits=${alarmBits} sustained` };
      }
      return { mode: "alarm", confidence: 0.9, cause: `alarm_bits=${alarmBits}` };
    }

    const cur = r.discharge_current_A ?? 0;
    const spark = r.spark_frequency_Hz ?? 0;
    const ten = r.wire_tension_N ?? 0;

    const cuttingSignal =
      cur >= MODE_THRESHOLDS.cutting_min_current_A ||
      spark >= MODE_THRESHOLDS.cutting_min_spark_Hz;
    if (cuttingSignal) {
      const conf = clamp01(
        0.5 +
          0.5 *
            Math.max(
              cur / (MODE_THRESHOLDS.cutting_min_current_A * 4),
              spark / (MODE_THRESHOLDS.cutting_min_spark_Hz * 4),
            ),
      );
      return { mode: "cutting", confidence: conf, cause: `current=${cur}A,spark=${spark}Hz` };
    }

    const calibrating =
      cur < MODE_THRESHOLDS.calibrating_max_current_A &&
      ten >= MODE_THRESHOLDS.calibrating_min_wire_tension_N &&
      (r.position_x_mm !== undefined || r.position_y_mm !== undefined);
    if (calibrating) {
      return { mode: "calibrating", confidence: 0.7, cause: `tensioned, no discharge` };
    }

    return { mode: "idle", confidence: 0.8, cause: "no discharge, no probe motion" };
  }

  private computeHealth(opts: {
    mode: WEDMMachineMode;
    warnings: string[];
    activeAlarmBits: number;
  }): number {
    if (opts.mode === "fault") return 0;
    if (opts.mode === "alarm") return 0.2;
    let h = 1.0;
    h -= Math.min(0.5, 0.1 * opts.warnings.length);
    if (opts.activeAlarmBits !== 0) h -= 0.3;
    return clamp01(h);
  }
}

// Small monotonic timer that falls back to Date.now when performance is not
// available (e.g. in older Node versions); overridable via `nowMs` for tests.
function hrstart(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function hrend(startNs: number, nowMsOverride?: number): number {
  if (nowMsOverride !== undefined) {
    // Tests supply an explicit ms to avoid wall-clock flakiness.
    return Math.max(0, nowMsOverride);
  }
  const end =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  return Math.max(0, end - startNs);
}

/** Default singleton for dispatcher wiring. */
export const wedmMachineStateEngine = new WEDMMachineStateEngine();
