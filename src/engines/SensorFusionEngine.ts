/**
 * SensorFusionEngine — Multi-sensor data fusion using Extended Kalman Filter
 * for unified cutting state estimation.
 *
 * State vector [5]: Fc (cutting force N), dFc/dt (N/s), temperature (C),
 *   deflection (mm), wear_state (0-1)
 * Sensors: force dynamometer, spindle load/power, vibration accel, thermocouple
 * Features: sequential sensor update, chi-squared gating, dropout handling
 */

// ── Interfaces ───────────────

interface AtomicValue<T> {
  value: T; unit: string; formula?: string; confidence?: number;
}

interface ForceSample {
  timestamp_ms: number; fx_n: number; fy_n: number; fz_n: number;
}
interface SpindleSample {
  timestamp_ms: number; load_pct: number;
  power_kw: number; rpm_actual: number;
}
interface VibrationSample {
  timestamp_ms: number; accel_x_g: number;
  accel_y_g: number; accel_z_g: number;
}
interface TemperatureSample {
  timestamp_ms: number; tool_temp_c: number;
}

export interface SensorFusionInput {
  force_samples?: ForceSample[];
  spindle_samples?: SpindleSample[];
  vibration_samples?: VibrationSample[];
  temperature_samples?: TemperatureSample[];
  process_params: {
    diameter_mm: number;
    flute_count: number;
    depth_mm: number;
    feed_mmrev: number;
    power_max_kw?: number;
  };
  dt_ms?: number;
}

export interface SensorFusionResult {
  fused_states: {
    timestamp_ms: number; state: number[];
    covariance_diag: number[];
  }[];
  sensor_health: {
    force: string; spindle: string;
    vibration: string; temperature: string;
  };
  estimated_wear: number;
  force_trend: "stable" | "increasing" | "decreasing";
  warnings: string[];
}

// ── Matrix helpers (dense, up to 5x5) ───────────────

type Mat = number[][];
type Vec = number[];

function zeros(r: number, c: number): Mat {
  return Array.from({ length: r }, () => new Array(c).fill(0));
}
function eye(n: number): Mat {
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}
function diag(v: Vec): Mat {
  const m = zeros(v.length, v.length);
  v.forEach((val, i) => (m[i][i] = val));
  return m;
}
function diagOf(m: Mat): Vec {
  return m.map((row, i) => row[i]);
}
function matAdd(a: Mat, b: Mat): Mat {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}
function matSub(a: Mat, b: Mat): Mat {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}
function matMul(a: Mat, b: Mat): Mat {
  const r = a.length, c = b[0].length, k = b.length;
  const out = zeros(r, c);
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      for (let l = 0; l < k; l++)
        out[i][j] += a[i][l] * b[l][j];
  return out;
}
function matT(a: Mat): Mat {
  return a[0].map((_, j) => a.map(row => row[j]));
}
function matVec(a: Mat, v: Vec): Vec {
  return a.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
}
function vecSub(a: Vec, b: Vec): Vec {
  return a.map((v, i) => v - b[i]);
}
function vecAdd(a: Vec, b: Vec): Vec {
  return a.map((v, i) => v + b[i]);
}
function scaleVec(s: number, v: Vec): Vec {
  return v.map(x => x * s);
}
function scaleMat(s: number, m: Mat): Mat {
  return m.map(row => row.map(v => v * s));
}

/** Gauss-Jordan inverse for small matrices. */
function matInv(m: Mat): Mat {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...eye(n)[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col]))
        pivot = row;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const d = aug[col][col];
    if (Math.abs(d) < 1e-12) { aug[col][col] = 1e-12; }
    const dd = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= dd;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

/** Outer product v * w^T -> matrix */
function outer(a: Vec, b: Vec): Mat {
  return a.map(ai => b.map(bj => ai * bj));
}

// ── Constants ───────────────

const N = 5; // state dimension
const CHI2_THRESHOLD_1DOF = 6.635; // 99% confidence, 1 dof
const THERMAL_LAG_MS = 200;
const WEAR_RATE_BASE = 1e-6;     // normalized wear per N per ms
const DEFLECTION_STIFFNESS = 50; // N/mm tool stiffness

// ── Sensor index helpers ───────────────

interface TimedSample {
  timestamp_ms: number;
}

/** Build lookup map: timestamp_ms -> sample */
function buildTimeLookup<T extends TimedSample>(
  samples: T[]
): Map<number, T> {
  const map = new Map<number, T>();
  for (const s of samples) map.set(s.timestamp_ms, s);
  return map;
}

/** Find nearest sample within tolerance */
function nearest<T extends TimedSample>(
  map: Map<number, T>, t: number, tol: number
): T | undefined {
  if (map.has(t)) return map.get(t);
  let best: T | undefined;
  let bestDist = Infinity;
  for (const [ts, s] of Array.from(map)) {
    const d = Math.abs(ts - t);
    if (d < bestDist && d <= tol) { bestDist = d; best = s; }
  }
  return best;
}

// ── Sensor key type ───────────────

type SensorKey = "force" | "spindle" | "vibration" | "temperature";

// ── Engine ───────────────

class SensorFusionEngine {
  /**
   * Fuse multi-sensor data into unified cutting state via EKF.
   */
  fuse(input: SensorFusionInput): AtomicValue<SensorFusionResult> {
    const warnings: string[] = [];
    const dt_ms = input.dt_ms ?? 10;
    const dt = dt_ms / 1000; // seconds
    const pp = input.process_params;
    const Pmax = pp.power_max_kw ?? 15;
    const rpm = input.spindle_samples?.[0]?.rpm_actual ?? 5000;

    // Cutting speed (m/min)
    const Vc = Math.PI * pp.diameter_mm * rpm / 1000;
    // Angular velocity (rad/s)
    const omega = 2 * Math.PI * rpm / 60;

    // ── Determine time range ───────────────
    const allTs: number[] = [];
    const pushTs = (arr?: { timestamp_ms: number }[]) => {
      if (arr) for (const s of arr) allTs.push(s.timestamp_ms);
    };
    pushTs(input.force_samples);
    pushTs(input.spindle_samples);
    pushTs(input.vibration_samples);
    pushTs(input.temperature_samples);

    if (allTs.length === 0) {
      return {
        value: {
          fused_states: [],
          sensor_health: {
            force: "dropout", spindle: "dropout",
            vibration: "dropout", temperature: "dropout"
          },
          estimated_wear: 0,
          force_trend: "stable",
          warnings: ["No sensor data provided"]
        },
        unit: "fusion_result", confidence: 0
      };
    }

    const tMin = Math.min(...allTs);
    const tMax = Math.max(...allTs);

    // ── Build lookup maps ───────────────
    const forceMap = input.force_samples
      ? buildTimeLookup(input.force_samples) : new Map();
    const spindleMap = input.spindle_samples
      ? buildTimeLookup(input.spindle_samples) : new Map();
    const vibMap = input.vibration_samples
      ? buildTimeLookup(input.vibration_samples) : new Map();
    const tempMap = input.temperature_samples
      ? buildTimeLookup(input.temperature_samples) : new Map();

    const tol = dt_ms * 1.5; // nearest-neighbor tolerance

    // ── Initial state ───────────────
    const f0 = input.force_samples?.[0];
    const initialForce = f0
      ? Math.sqrt(f0.fx_n ** 2 + f0.fy_n ** 2 + f0.fz_n ** 2)
      : 200;
    const initialTemp =
      input.temperature_samples?.[0]?.tool_temp_c ?? 25;

    let x: Vec = [
      initialForce, 0, initialTemp,
      initialForce / DEFLECTION_STIFFNESS, 0.01
    ];
    let P: Mat = diag([1000, 100, 25, 0.01, 0.001]);

    // Process noise Q — tuned for cutting dynamics
    const Q: Mat = diag([
      50 * dt,     // force variance growth
      500 * dt,    // force rate variance
      0.5 * dt,    // temperature variance
      0.001 * dt,  // deflection variance
      1e-5 * dt    // wear variance
    ]);

    // Measurement noise R values per sensor
    const R_force = 25;    // N^2
    const R_spindle = 4;   // %^2
    const R_vib = 0.5;     // g^2
    const R_temp = 1;      // C^2

    // ── State transition model F (5x5) ───────────────
    // Fc(k+1) = Fc(k) + dFc/dt * dt
    // dFc/dt(k+1) = dFc/dt(k)        (random walk)
    // temp(k+1) = temp(k) + heating   (slow thermal)
    // defl(k+1) = Fc(k+1)/stiffness  (quasi-static)
    // wear(k+1) = wear(k)+Fc*dt*rate  (Taylor-like)
    const F: Mat = eye(N);
    F[0][1] = dt;                        // Fc += dFc/dt * dt
    F[3][0] = dt / DEFLECTION_STIFFNESS; // deflection tracks force
    F[4][0] = WEAR_RATE_BASE * dt;       // wear accumulates

    // ── Sensor health tracking ───────────────
    const counts: Record<SensorKey, number> = {
      force: 0, spindle: 0, vibration: 0, temperature: 0
    };
    const disagree: Record<SensorKey, number> = {
      force: 0, spindle: 0, vibration: 0, temperature: 0
    };
    let totalSteps = 0;

    // ── EKF loop ───────────────
    const fusedStates: SensorFusionResult["fused_states"] = [];
    const forceHistory: number[] = [];

    for (let t = tMin; t <= tMax; t += dt_ms) {
      totalSteps++;

      // ── Predict ───────────────
      const x_pred = matVec(F, x);
      x_pred[4] = Math.max(0, Math.min(1, x_pred[4]));
      x_pred[3] = Math.max(0, x_pred[3]);
      const P_pred = matAdd(matMul(matMul(F, P), matT(F)), Q);

      let x_upd = [...x_pred];
      let P_upd = P_pred.map(row => [...row]);

      // ── Sequential sensor updates ───────────────

      // 1. Force sensor — measures Fc directly
      const fSamp = nearest(forceMap, t, tol) as
        ForceSample | undefined;
      if (fSamp) {
        counts.force++;
        const Fc_meas = Math.sqrt(
          fSamp.fx_n ** 2 + fSamp.fy_n ** 2 + fSamp.fz_n ** 2
        );
        const H: Vec = [1, 0, 0, 0, 0];
        const res = this.scalarUpdate(
          x_upd, P_upd, H, Fc_meas, R_force
        );
        if (res.accepted) {
          x_upd = res.x; P_upd = res.P;
        } else {
          disagree.force++;
          const chi = res.chi2.toFixed(1);
          warnings.push(`Force disagree t=${t}ms chi2=${chi}`);
        }
      }

      // 2. Spindle load sensor
      const sSamp = nearest(spindleMap, t, tol) as
        SpindleSample | undefined;
      if (sSamp) {
        counts.spindle++;
        const z_load = sSamp.load_pct;
        // load_pct = (Fc * Vc) / (60000 * Pmax) * 100
        const loadScale = Vc / (60000 * Pmax) * 100;
        const H: Vec = [loadScale, 0, 0, 0, 0];
        const res = this.scalarUpdate(
          x_upd, P_upd, H, z_load, R_spindle
        );
        if (res.accepted) {
          x_upd = res.x; P_upd = res.P;
        } else {
          disagree.spindle++;
        }
      }

      // 3. Vibration sensor
      const vSamp = nearest(vibMap, t, tol) as
        VibrationSample | undefined;
      if (vSamp) {
        counts.vibration++;
        const accelMag = Math.sqrt(
          vSamp.accel_x_g ** 2 +
          vSamp.accel_y_g ** 2 +
          vSamp.accel_z_g ** 2
        );
        // accel(g) ~ deflection(mm) * w^2 / 9810
        const vibScale = omega * omega / 9810;
        const H: Vec = [0, 0, 0, vibScale, 0];
        const res = this.scalarUpdate(
          x_upd, P_upd, H, accelMag, R_vib
        );
        if (res.accepted) {
          x_upd = res.x; P_upd = res.P;
        } else {
          disagree.vibration++;
        }
      }

      // 4. Temperature sensor (thermal lag compensation)
      const tSamp = nearest(tempMap, t, tol) as
        TemperatureSample | undefined;
      if (tSamp) {
        counts.temperature++;
        const z_temp = tSamp.tool_temp_c;
        const alpha = 1 - Math.exp(-dt_ms / THERMAL_LAG_MS);
        const H: Vec = [0, 0, 1, 0, 0];
        // Inflate noise to account for thermal lag
        const R_adj = R_temp / (alpha * alpha + 0.01);
        const res = this.scalarUpdate(
          x_upd, P_upd, H, z_temp, R_adj
        );
        if (res.accepted) {
          x_upd = res.x; P_upd = res.P;
        } else {
          disagree.temperature++;
        }
      }

      // ── Sensor dropout: inflate covariance ───────────────
      if (!fSamp && forceMap.size > 0) P_upd[0][0] *= 1.05;
      if (!sSamp && spindleMap.size > 0) P_upd[0][0] *= 1.02;
      if (!vSamp && vibMap.size > 0) P_upd[3][3] *= 1.05;
      if (!tSamp && tempMap.size > 0) P_upd[2][2] *= 1.05;

      // ── Clamp state ───────────────
      x_upd[0] = Math.max(0, x_upd[0]);
      x_upd[2] = Math.max(-40, x_upd[2]);
      x_upd[3] = Math.max(0, x_upd[3]);
      x_upd[4] = Math.max(0, Math.min(1, x_upd[4]));

      x = x_upd;
      P = P_upd;
      forceHistory.push(x[0]);

      fusedStates.push({
        timestamp_ms: t,
        state: [...x],
        covariance_diag: diagOf(P)
      });
    }

    // ── Compute sensor health ───────────────
    const healthThresh = totalSteps * 0.1;
    const disagreeThresh = 0.15; // 15%

    const healthOf = (key: SensorKey, sz: number): string => {
      if (sz === 0) return "dropout";
      if (counts[key] < healthThresh) return "dropout";
      const ratio = disagree[key] / Math.max(1, counts[key]);
      if (ratio > disagreeThresh) return "disagreement";
      return "ok";
    };

    const sensorHealth = {
      force: healthOf("force", forceMap.size),
      spindle: healthOf("spindle", spindleMap.size),
      vibration: healthOf("vibration", vibMap.size),
      temperature: healthOf("temperature", tempMap.size)
    };

    // ── Force trend (regression on last 50%) ───────────────
    const forceTrend = this.computeForceTrend(forceHistory);

    // ── Warnings ───────────────
    const finalWear = x[4];
    if (finalWear > 0.8) {
      const pct = (finalWear * 100).toFixed(1);
      warnings.push(`High wear: ${pct}% — replace tool`);
    } else if (finalWear > 0.5) {
      const pct = (finalWear * 100).toFixed(1);
      warnings.push(`Moderate wear: ${pct}% — monitor`);
    }
    if (x[2] > 600) {
      warnings.push(`High temp: ${x[2].toFixed(0)}C — thermal risk`);
    }
    if (x[3] > 0.1) {
      const d = x[3].toFixed(3);
      warnings.push(`Tool deflection: ${d}mm — check rigidity`);
    }

    for (const [name, status] of Object.entries(sensorHealth)) {
      if (status === "dropout")
        warnings.push(`${name} sensor: dropout detected`);
      if (status === "disagreement")
        warnings.push(`${name} sensor: disagreement`);
    }

    const result: SensorFusionResult = {
      fused_states: fusedStates,
      sensor_health: sensorHealth,
      estimated_wear: finalWear,
      force_trend: forceTrend,
      warnings
    };

    // Confidence based on sensor availability
    const avail = [
      forceMap.size, spindleMap.size,
      vibMap.size, tempMap.size
    ].filter(s => s > 0).length;
    const confidence = Math.min(0.95, 0.5 + avail * 0.12);

    return {
      value: result,
      unit: "fusion_result",
      formula: "EKF(F*x, sequential_update, chi2_gating)",
      confidence
    };
  }

  /**
   * Scalar measurement update (single-row H).
   * Chi-squared gating rejects outliers.
   */
  private scalarUpdate(
    x: Vec, P: Mat, H: Vec, z: number, R: number
  ): { x: Vec; P: Mat; accepted: boolean; chi2: number } {
    // Innovation: y = z - H*x
    const z_pred = H.reduce((s, h, i) => s + h * x[i], 0);
    const y = z - z_pred;

    // Innovation covariance: S = H*P*H' + R (scalar)
    const PH = matVec(P, H);
    const S = H.reduce((s, h, i) => s + h * PH[i], 0) + R;

    // Chi-squared test
    const chi2 = (y * y) / Math.max(S, 1e-12);
    if (chi2 > CHI2_THRESHOLD_1DOF) {
      return {
        x: [...x], P: P.map(r => [...r]),
        accepted: false, chi2
      };
    }

    // Kalman gain: K = P*H' / S
    const K = scaleVec(1 / S, PH);

    // State update: x = x + K*y
    const x_new = vecAdd(x, scaleVec(y, K));

    // Covariance: Joseph form P=(I-KH)P(I-KH)'+R*KK'
    const KH = outer(K, H);
    const IKH = matSub(eye(N), KH);
    const P_new = matAdd(
      matMul(matMul(IKH, P), matT(IKH)),
      scaleMat(R, outer(K, K))
    );

    return { x: x_new, P: P_new, accepted: true, chi2 };
  }

  /**
   * Force trend from latter half via linear regression slope.
   */
  private computeForceTrend(
    forces: number[]
  ): "stable" | "increasing" | "decreasing" {
    if (forces.length < 4) return "stable";
    const half = Math.floor(forces.length / 2);
    const seg = forces.slice(half);
    const n = seg.length;

    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
      sx += i; sy += seg[i];
      sxy += i * seg[i]; sxx += i * i;
    }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-12) return "stable";
    const slope = (n * sxy - sx * sy) / denom;

    const meanF = sy / n;
    if (meanF < 1) return "stable";
    const relSlope = slope / meanF;

    if (relSlope > 0.005) return "increasing";
    if (relSlope < -0.005) return "decreasing";
    return "stable";
  }
}

/** Singleton instance */
export const sensorFusionEngine = new SensorFusionEngine();
export { SensorFusionEngine };
