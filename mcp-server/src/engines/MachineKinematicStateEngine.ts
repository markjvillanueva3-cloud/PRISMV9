/**
 * MachineKinematicStateEngine — Dynamic Machine State Tracker (U-MIO39)
 * =====================================================================
 *
 * Phase 12 Machine-state gate: a machine's real capability is DYNAMIC.
 * Static spec sheets tell you what the machine was *certified* to do;
 * this engine tracks what it can *currently* do based on:
 *
 *   1. Thermal expansion state per linear axis (X/Y/Z) — ISO 230-3
 *      spindle-growth + body/column thermal distortion. delta_mm = L * alpha *
 *      (T - T_ref). alpha_steel = 1.2e-5 /K; alpha_alum = 2.3e-5 /K.
 *      At +5 K over a 1 m column, steel grows 60 micron — which matters for
 *      tolerancing.
 *
 *   2. Servo following-error (lag) trend. If rolling-average lag grows
 *      beyond 2x the spec baseline, the servo drive is degrading
 *      (bearing preload loss, scale drift, belt wear). Reduce jerk limit
 *      to avoid further damage; flag for maintenance.
 *
 *   3. Dynamic jerk limit. Spec jerk is derated when (a) servo lag elevated,
 *      (b) payload > 80% rated, (c) temperature outside 15-35 C band.
 *      Derating is multiplicative and clamped to >= 30% of spec.
 *
 *   4. Look-ahead validation per controller (Fanuc AI-Contour 200 blocks,
 *      Siemens Advanced Surface 1000 blocks, Okuma OSP-P300 400 blocks,
 *      Heidenhain TNC7 ~10000 blocks, Haas HSM 90 blocks).
 *      Flags when program block density / lookahead < feed-time safety margin.
 *
 * All state is stored per machine_id. Snapshots are immutable time-stamped
 * records; the engine keeps the last N (default 1000) per machine for
 * trend analysis.
 *
 * References:
 *   - ISO 230-3:2020 — Determination of thermal effects on machine tools
 *   - ISO 230-6:2002 — Positioning accuracy under servo load
 *   - Machinery's Handbook 31st ed. — thermal coefficients for alpha_steel,
 *     alpha_alum, alpha_cast_iron
 *   - Fanuc, Siemens, Okuma, Heidenhain, Haas documentation (look-ahead
 *     block counts)
 *
 * @module engines/MachineKinematicStateEngine
 * @milestone MIO-MS0 U-MIO39
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type MachineAxis = "X" | "Y" | "Z" | "A" | "B" | "C";

/** Supported machine structural materials for thermal expansion */
export type StructureMaterial = "steel" | "cast_iron" | "aluminum" | "granite" | "ceramic";

/** Thermal expansion coefficients [1/K]. Sources: Machinery's Handbook 31e */
export const THERMAL_ALPHA: Record<StructureMaterial, number> = {
  steel: 1.2e-5,
  cast_iron: 1.08e-5,
  aluminum: 2.3e-5,
  granite: 6e-6,
  ceramic: 3e-6,
};

export type ControllerType = "fanuc" | "siemens" | "okuma" | "heidenhain" | "haas" | "mazak" | "generic";

/** Look-ahead block capacity per controller. Vendor-documented values. */
export const LOOKAHEAD_BLOCKS: Record<ControllerType, number> = {
  fanuc: 200,       // AI-Contour II standard
  siemens: 1000,    // 840D Advanced Surface
  okuma: 400,       // OSP-P300 HiCut
  heidenhain: 10000,// TNC7 high-speed cutting
  haas: 90,         // HSM Enhanced
  mazak: 600,       // Mazatrol SmoothX
  generic: 50,
};

/** Per-axis thermal state sample */
export interface ThermalAxisState {
  axis: MachineAxis;
  temperature_c: number;
  /** Stroke length [mm] — controls magnitude of expansion */
  stroke_mm: number;
  /** Structural material (steel default) */
  material?: StructureMaterial;
  /** Reference temperature [°C] for the baseline calibration */
  reference_temp_c?: number;
}

/** Per-axis servo health sample */
export interface ServoAxisState {
  axis: MachineAxis;
  /** Mean following-error magnitude [mm] over sampling window */
  following_error_mean_mm: number;
  /** Baseline following-error [mm] at commissioning */
  baseline_following_error_mm: number;
  /** Current commanded feed rate [mm/min] */
  feed_rate_mpm?: number;
}

/** Payload (workpiece + fixture) loading */
export interface PayloadState {
  mass_kg: number;
  /** Machine rated max payload [kg] */
  rated_max_kg: number;
}

/** Program-block density for look-ahead check */
export interface LookAheadCheckInput {
  /** Expected blocks per second at programmed feed */
  blocks_per_sec: number;
  /** Required safety margin multiple (1.0 = at limit, 1.5 recommended) */
  safety_margin?: number;
}

/** Input snapshot captured each state update */
export interface MachineStateSnapshot {
  machine_id: string;
  controller: ControllerType;
  captured_at: string;
  thermal: ThermalAxisState[];
  servo: ServoAxisState[];
  payload?: PayloadState;
  ambient_temp_c?: number;
  lookahead?: LookAheadCheckInput;
}

export interface AxisThermalResult {
  axis: MachineAxis;
  delta_mm: number;
  beyond_tolerance: boolean;
}

export interface AxisServoResult {
  axis: MachineAxis;
  lag_ratio: number;       // mean / baseline
  degraded: boolean;
  status: "nominal" | "warning" | "critical";
}

export interface JerkDerate {
  factor: number;            // 0.3 .. 1.0
  reasons: string[];
}

export interface LookAheadResult {
  controller: ControllerType;
  capacity_blocks: number;
  blocks_per_sec: number;
  required_blocks: number;
  adequate: boolean;
}

export interface DerivedState {
  snapshot_id: string;
  machine_id: string;
  controller: ControllerType;
  captured_at: string;
  thermal: AxisThermalResult[];
  servo: AxisServoResult[];
  payload_overload: boolean;
  jerk: JerkDerate;
  lookahead?: LookAheadResult;
  warnings: string[];
  overall_status: "nominal" | "warning" | "critical";
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class MachineKinematicStateEngine {
  private history: Map<string, DerivedState[]> = new Map();
  private maxHistoryPerMachine = 1000;
  private counter = 0;

  /**
   * Ingest a snapshot, compute derived state, append to history, return the
   * derived state.
   *
   * @param snap — captured thermal + servo + payload + lookahead sample
   * @param tolerance_mm — if provided, beyond_tolerance is delta_mm > tol/3
   */
  update(snap: MachineStateSnapshot, tolerance_mm?: number): DerivedState {
    if (!snap.machine_id) {
      throw new Error("MachineKinematicState: machine_id required");
    }
    if (!snap.controller) {
      throw new Error("MachineKinematicState: controller required");
    }
    if (!snap.thermal || snap.thermal.length === 0) {
      throw new Error("MachineKinematicState: at least one thermal axis sample required");
    }

    const warnings: string[] = [];

    // ── Thermal expansion (ISO 230-3) ──────────────────────────────────────
    const thermal: AxisThermalResult[] = snap.thermal.map(t => {
      const material: StructureMaterial = t.material ?? "steel";
      const alpha = THERMAL_ALPHA[material];
      const t_ref = t.reference_temp_c ?? 20;
      const delta_mm = t.stroke_mm * alpha * (t.temperature_c - t_ref);
      const beyond = tolerance_mm !== undefined ? Math.abs(delta_mm) > tolerance_mm / 3 : false;
      if (beyond) {
        warnings.push(`Thermal expansion on ${t.axis} (${delta_mm.toFixed(4)} mm) exceeds tolerance/3 band`);
      }
      return { axis: t.axis, delta_mm, beyond_tolerance: beyond };
    });

    // ── Servo following-error trend ────────────────────────────────────────
    const servo: AxisServoResult[] = snap.servo.map(s => {
      const baseline = Math.max(s.baseline_following_error_mm, 1e-9);
      const ratio = s.following_error_mean_mm / baseline;
      let status: AxisServoResult["status"] = "nominal";
      if (ratio > 2.0) status = "critical";
      else if (ratio > 1.5) status = "warning";
      const degraded = status !== "nominal";
      if (status === "critical") {
        warnings.push(`Servo axis ${s.axis} CRITICAL: follow-error ${s.following_error_mean_mm.toFixed(4)} mm (${ratio.toFixed(2)}x baseline) — schedule maintenance`);
      } else if (status === "warning") {
        warnings.push(`Servo axis ${s.axis} warning: follow-error trend ${ratio.toFixed(2)}x baseline`);
      }
      return { axis: s.axis, lag_ratio: ratio, degraded, status };
    });

    // ── Payload overload ──────────────────────────────────────────────────
    const payload_overload = !!snap.payload && snap.payload.mass_kg > snap.payload.rated_max_kg;
    const payload_near_max = !!snap.payload && snap.payload.mass_kg > 0.8 * snap.payload.rated_max_kg;
    if (payload_overload) warnings.push(`Payload ${snap.payload!.mass_kg.toFixed(1)} kg exceeds rated max ${snap.payload!.rated_max_kg.toFixed(1)} kg`);

    // ── Jerk derate ───────────────────────────────────────────────────────
    const jerk = this.computeJerkDerate(servo, payload_near_max, snap.ambient_temp_c);

    // ── Look-ahead validation ─────────────────────────────────────────────
    let lookahead: LookAheadResult | undefined;
    if (snap.lookahead) {
      const capacity = LOOKAHEAD_BLOCKS[snap.controller] ?? LOOKAHEAD_BLOCKS.generic;
      const margin = snap.lookahead.safety_margin ?? 1.5;
      const requiredBlocks = Math.ceil(snap.lookahead.blocks_per_sec * margin);
      const adequate = capacity >= requiredBlocks;
      lookahead = {
        controller: snap.controller,
        capacity_blocks: capacity,
        blocks_per_sec: snap.lookahead.blocks_per_sec,
        required_blocks: requiredBlocks,
        adequate,
      };
      if (!adequate) {
        warnings.push(`Look-ahead inadequate: controller=${snap.controller} capacity=${capacity}, need ${requiredBlocks} (program ${snap.lookahead.blocks_per_sec} blk/s * ${margin}x margin)`);
      }
    }

    // ── Overall status ────────────────────────────────────────────────────
    const criticalCount =
      servo.filter(s => s.status === "critical").length +
      (payload_overload ? 1 : 0) +
      (lookahead && !lookahead.adequate ? 1 : 0);
    const warningCount =
      thermal.filter(t => t.beyond_tolerance).length +
      servo.filter(s => s.status === "warning").length +
      (payload_near_max && !payload_overload ? 1 : 0);
    let overall: DerivedState["overall_status"] = "nominal";
    if (criticalCount > 0) overall = "critical";
    else if (warningCount > 0) overall = "warning";

    // ── Store and return ──────────────────────────────────────────────────
    this.counter++;
    const derived: DerivedState = {
      snapshot_id: `MKS-${String(this.counter).padStart(6, "0")}`,
      machine_id: snap.machine_id,
      controller: snap.controller,
      captured_at: snap.captured_at,
      thermal,
      servo,
      payload_overload,
      jerk,
      lookahead,
      warnings,
      overall_status: overall,
    };
    const hist = this.history.get(snap.machine_id) ?? [];
    hist.push(derived);
    if (hist.length > this.maxHistoryPerMachine) hist.shift();
    this.history.set(snap.machine_id, hist);
    return derived;
  }

  /** Latest derived state for a machine, or null if never ingested. */
  getLatest(machine_id: string): DerivedState | null {
    const hist = this.history.get(machine_id);
    if (!hist || hist.length === 0) return null;
    return hist[hist.length - 1];
  }

  /** Full snapshot history for a machine (newest last). */
  getHistory(machine_id: string): DerivedState[] {
    return [...(this.history.get(machine_id) ?? [])];
  }

  /**
   * Compute per-axis lag ratio trend from history (newest last).
   * Returns { axis: [ratios...] }.
   */
  servoLagTrend(machine_id: string, axis: MachineAxis): number[] {
    const hist = this.history.get(machine_id) ?? [];
    return hist
      .map(h => h.servo.find(s => s.axis === axis)?.lag_ratio)
      .filter((v): v is number => typeof v === "number");
  }

  /** Render Markdown state report. */
  renderMarkdown(d: DerivedState): string {
    const out: string[] = [];
    out.push(`# Machine Kinematic State ${d.snapshot_id}`);
    out.push("");
    out.push(`**Machine:** ${d.machine_id}  |  **Controller:** ${d.controller}  |  **Captured:** ${d.captured_at}`);
    out.push(`**Overall:** \`${d.overall_status}\`  |  **Jerk Derate:** ${(d.jerk.factor * 100).toFixed(0)}%`);
    out.push("");
    out.push(`## Thermal Expansion`);
    out.push(`| Axis | delta_mm | Over Tol |`);
    out.push(`|------|----------|----------|`);
    for (const t of d.thermal) out.push(`| ${t.axis} | ${t.delta_mm.toFixed(4)} | ${t.beyond_tolerance ? "yes" : "no"} |`);
    out.push("");
    out.push(`## Servo Health`);
    out.push(`| Axis | Lag Ratio | Status |`);
    out.push(`|------|-----------|--------|`);
    for (const s of d.servo) out.push(`| ${s.axis} | ${s.lag_ratio.toFixed(2)}x | ${s.status} |`);
    if (d.lookahead) {
      out.push("");
      out.push(`## Look-ahead`);
      out.push(`- Controller: ${d.lookahead.controller} (capacity ${d.lookahead.capacity_blocks} blk)`);
      out.push(`- Program: ${d.lookahead.blocks_per_sec} blk/s; required ${d.lookahead.required_blocks}`);
      out.push(`- Adequate: ${d.lookahead.adequate ? "yes" : "NO"}`);
    }
    if (d.jerk.reasons.length > 0) {
      out.push("");
      out.push(`## Jerk Derate Reasons`);
      for (const r of d.jerk.reasons) out.push(`- ${r}`);
    }
    if (d.warnings.length > 0) {
      out.push("");
      out.push(`## Warnings`);
      for (const w of d.warnings) out.push(`- ${w}`);
    }
    return out.join("\n");
  }

  /** Clear all state (primarily for tests). */
  reset(): void {
    this.history.clear();
    this.counter = 0;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private computeJerkDerate(
    servo: AxisServoResult[],
    payload_near_max: boolean,
    ambient_c?: number,
  ): JerkDerate {
    let factor = 1.0;
    const reasons: string[] = [];

    // Servo health: multiplicative — each critical axis reduces factor 20%,
    // each warning axis reduces 10%. Floored at 30%.
    for (const s of servo) {
      if (s.status === "critical") {
        factor *= 0.8;
        reasons.push(`servo ${s.axis} CRITICAL → -20% jerk`);
      } else if (s.status === "warning") {
        factor *= 0.9;
        reasons.push(`servo ${s.axis} warning → -10% jerk`);
      }
    }

    if (payload_near_max) {
      factor *= 0.9;
      reasons.push("payload > 80% rated → -10% jerk");
    }

    if (ambient_c !== undefined && (ambient_c < 15 || ambient_c > 35)) {
      factor *= 0.85;
      reasons.push(`ambient ${ambient_c.toFixed(1)}°C outside 15-35 band → -15% jerk`);
    }

    factor = Math.max(0.3, factor);
    return { factor, reasons };
  }
}

export const machineKinematicStateEngine = new MachineKinematicStateEngine();
