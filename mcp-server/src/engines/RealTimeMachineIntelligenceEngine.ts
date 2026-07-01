/**
 * RealTimeMachineIntelligenceEngine — TECH-MS2
 *
 * Unified real-time machine intelligence combining live sensor data
 * with PRISM physics models. Provides:
 *   1. Spindle load monitoring vs Kienzle force prediction
 *   2. Chatter detection via FFT + auto feed reduction
 *   3. Thermal drift compensation via CTE model
 *   4. Tool life countdown from Taylor model + actual wear
 *   5. Time-series storage and trend analysis
 *
 * Consumes data from MTConnect/MQTT/OPC-UA adapters (Wave 8)
 * and correlates with Kienzle, Taylor, stability lobe models.
 *
 * Lines: ~950
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SpindleLoadReading {
  timestamp: number;
  spindleLoad: number;      // % of rated
  spindleRpm: number;
  feedRate: number;          // mm/min
  programBlock?: string;
}

interface VibrationReading {
  timestamp: number;
  axis: "x" | "y" | "z";
  amplitudes: number[];      // time-domain samples
  sampleRate: number;        // Hz
}

interface TemperatureReading {
  timestamp: number;
  sensorId: string;
  temperature: number;       // °C
  location: { x: number; y: number; z: number };
}

interface ToolWearReading {
  timestamp: number;
  toolId: string;
  flankWear: number;         // mm (VB)
  cuttingTime: number;       // minutes
  materialRemoved: number;   // cm³
}

interface TimeSeriesPoint {
  timestamp: number;
  metric: string;
  value: number;
  tags: Record<string, string>;
}

interface ChatterDetectionResult {
  detected: boolean;
  dominantFrequency: number;  // Hz
  amplitude: number;
  toothPassFrequency: number;
  ratio: number;              // dominant / tooth-pass
  severity: "none" | "mild" | "moderate" | "severe";
  recommendedAction: string;
  feedReduction?: number;     // % reduction
  rpmAlternative?: number;
}

interface ThermalCompensation {
  axis: string;
  currentTemp: number;
  referenceTemp: number;
  deltaT: number;
  cte: number;               // µm/m/°C
  measuredLength: number;    // mm
  compensation: number;       // µm offset
  confidence: number;
}

interface ToolLifeCountdown {
  toolId: string;
  taylorLife: number;        // minutes predicted
  actualCuttingTime: number; // minutes used
  remainingLife: number;     // minutes
  remainingPercent: number;
  wearRate: number;          // mm/min VB growth
  estimatedPartsRemaining: number;
  changeRecommendation: "ok" | "monitor" | "change_soon" | "change_now";
  nextCheckIn: number;       // parts
}

interface DashboardSnapshot {
  timestamp: number;
  machine: string;
  spindleLoad: { current: number; predicted: number; delta: number; status: string };
  chatter: ChatterDetectionResult;
  thermal: ThermalCompensation[];
  toolLife: ToolLifeCountdown[];
  alerts: Array<{ level: string; message: string; metric: string }>;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

// Kienzle coefficients now imported from canonical physics/constants.ts (see CANONICAL_KIENZLE).

/** Taylor tool life constants by ISO group */
const TAYLOR_DEFAULTS: Record<string, { C: number; n: number }> = {
  P: { C: 250, n: 0.25 },
  M: { C: 180, n: 0.22 },
  K: { C: 300, n: 0.28 },
  N: { C: 600, n: 0.35 },
  S: { C: 120, n: 0.18 },
  H: { C: 100, n: 0.15 },
};

/** CTE values µm/m/°C */
const CTE_VALUES: Record<string, number> = {
  steel: 11.7,
  cast_iron: 10.5,
  aluminum: 23.1,
  granite: 6.0,
  invar: 1.2,
  ceramic: 8.0,
};

const CHATTER_SEVERITY_THRESHOLDS = {
  mild: 1.5,     // ratio of dominant to tooth-pass
  moderate: 2.5,
  severe: 4.0,
};

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class RealTimeMachineIntelligenceEngine {
  private timeSeries: TimeSeriesPoint[] = [];
  private readonly maxSeriesLength = 100000;
  private spindleHistory: SpindleLoadReading[] = [];
  private wearHistory: Map<string, ToolWearReading[]> = new Map();

  /**
   * Main dispatcher entry point
   */
  calculate(
    action: string,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    switch (action) {
      case "rtmi_spindle_monitor":
        return this.monitorSpindleLoad(params);
      case "rtmi_chatter_detect":
        return this.detectChatter(params);
      case "rtmi_thermal_compensate":
        return this.compensateThermal(params);
      case "rtmi_tool_life_countdown":
        return this.toolLifeCountdown(params);
      case "rtmi_dashboard":
        return this.getDashboard(params);
      case "rtmi_store_reading":
        return this.storeReading(params);
      case "rtmi_query_series":
        return this.querySeries(params);
      case "rtmi_trend_analysis":
        return this.analyzeTrend(params);
      case "rtmi_alert_check":
        return this.checkAlerts(params);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // ─────────────────────────────────────────────────────────
  // T2-U01: Spindle Load Monitor
  // ─────────────────────────────────────────────────────────

  /**
   * Compare actual spindle load against Kienzle force prediction.
   * Detects overload, underload (broken tool), and abnormal patterns.
   */
  private monitorSpindleLoad(params: Record<string, unknown>): Record<string, unknown> {
    const spindleLoad = Number(params.spindleLoad ?? 0);
    const spindleRpm = Number(params.spindleRpm ?? 0);
    const feedRate = Number(params.feedRate ?? 0);
    const ap = Number(params.depthOfCut ?? 3);
    const ae = Number(params.widthOfCut ?? 10);
    const toolDiameter = Number(params.toolDiameter ?? 12);
    const fluteCount = Number(params.fluteCount ?? 4);
    const isoGroup = String(params.isoGroup ?? "P");
    const ratedPower = Number(params.ratedPower ?? 15); // kW

    // Kienzle force prediction
    const kc = CANONICAL_KIENZLE[isoGroup as ISOGroup] ?? CANONICAL_KIENZLE.P;
    const fz = feedRate / (fluteCount * spindleRpm + 1e-9);
    const hm = Math.max(fz * (ae / toolDiameter), 0.001);
    const kc_actual = kc.kc1_1 * Math.pow(hm, -kc.mc);
    const Fc = kc_actual * ap * ae / 1000; // N
    const predictedPower = (Fc * Math.PI * toolDiameter * spindleRpm) / (60000 * 1000); // kW
    const predictedLoad = (predictedPower / ratedPower) * 100;

    const delta = spindleLoad - predictedLoad;
    const deltaPercent = predictedLoad > 0 ? (delta / predictedLoad) * 100 : 0;

    let status = "normal";
    let alert = "";
    if (spindleLoad > 90) {
      status = "overload";
      alert = "Spindle load >90% — reduce feed or depth";
    } else if (deltaPercent > 50) {
      status = "abnormal_high";
      alert = `Load ${deltaPercent.toFixed(0)}% above prediction — check for tool dulling or hard spot`;
    } else if (deltaPercent < -60 && spindleLoad < 5) {
      status = "broken_tool";
      alert = "Load near zero vs prediction — possible broken tool";
    } else if (deltaPercent < -40) {
      status = "abnormal_low";
      alert = "Load significantly below prediction — check engagement";
    }

    // Store reading
    const reading: SpindleLoadReading = {
      timestamp: Date.now(),
      spindleLoad,
      spindleRpm,
      feedRate,
    };
    this.spindleHistory.push(reading);
    if (this.spindleHistory.length > 10000) {
      this.spindleHistory = this.spindleHistory.slice(-5000);
    }

    return {
      actual: { spindleLoad, spindleRpm, feedRate },
      predicted: {
        force_N: Math.round(Fc),
        power_kW: Number(predictedPower.toFixed(2)),
        load_percent: Number(predictedLoad.toFixed(1)),
        kc_actual: Math.round(kc_actual),
      },
      comparison: {
        delta: Number(delta.toFixed(1)),
        deltaPercent: Number(deltaPercent.toFixed(1)),
        status,
      },
      alert: alert || undefined,
      kienzle: { kc1_1: kc.kc1_1, mc: kc.mc, hm: Number(hm.toFixed(4)) },
    };
  }

  // ─────────────────────────────────────────────────────────
  // T2-U02: Chatter Detection + Auto Feed Reduction
  // ─────────────────────────────────────────────────────────

  /**
   * FFT-based chatter detection from vibration data.
   * Identifies chatter frequency, compares to tooth-pass frequency,
   * and recommends feed reduction or alternative RPM.
   */
  private detectChatter(params: Record<string, unknown>): Record<string, unknown> {
    const amplitudes = (params.amplitudes as number[]) ?? [];
    const sampleRate = Number(params.sampleRate ?? 10000);
    const spindleRpm = Number(params.spindleRpm ?? 8000);
    const fluteCount = Number(params.fluteCount ?? 4);
    const currentFeed = Number(params.feedRate ?? 1000);

    if (amplitudes.length < 64) {
      return { error: "Need at least 64 samples for FFT", detected: false };
    }

    // Tooth-pass frequency
    const toothPassFreq = (spindleRpm * fluteCount) / 60;

    // Simple FFT (radix-2 DIT Cooley-Tukey)
    const N = Math.pow(2, Math.floor(Math.log2(amplitudes.length)));
    const fftResult = this.computeFFT(amplitudes.slice(0, N));

    // Find magnitude spectrum
    const magnitudes: number[] = [];
    const freqResolution = sampleRate / N;
    for (let i = 0; i < N / 2; i++) {
      const mag = Math.sqrt(
        fftResult.real[i] * fftResult.real[i] +
        fftResult.imag[i] * fftResult.imag[i]
      ) / N;
      magnitudes.push(mag);
    }

    // Find dominant frequency (exclude DC and very low freq)
    const minBin = Math.max(3, Math.floor(50 / freqResolution));
    const maxBin = Math.min(magnitudes.length - 1, Math.floor(5000 / freqResolution));
    let peakMag = 0;
    let peakBin = minBin;
    for (let i = minBin; i <= maxBin; i++) {
      if (magnitudes[i] > peakMag) {
        peakMag = magnitudes[i];
        peakBin = i;
      }
    }
    const dominantFreq = peakBin * freqResolution;

    // Check if dominant is near tooth-pass harmonics
    const ratio = peakMag / (this.getMagnitudeAt(magnitudes, toothPassFreq, freqResolution) + 1e-9);

    let severity: ChatterDetectionResult["severity"] = "none";
    if (ratio > CHATTER_SEVERITY_THRESHOLDS.severe) severity = "severe";
    else if (ratio > CHATTER_SEVERITY_THRESHOLDS.moderate) severity = "moderate";
    else if (ratio > CHATTER_SEVERITY_THRESHOLDS.mild) severity = "mild";

    // Is dominant near a tooth-pass harmonic?
    const nearHarmonic = this.isNearHarmonic(dominantFreq, toothPassFreq, 0.1);
    const isChatter = severity !== "none" && !nearHarmonic;

    let recommendedAction = "No action needed";
    let feedReduction: number | undefined;
    let rpmAlternative: number | undefined;

    if (isChatter) {
      if (severity === "severe") {
        feedReduction = 40;
        recommendedAction = `Reduce feed by 40% to ${Math.round(currentFeed * 0.6)} mm/min. Consider RPM change.`;
      } else if (severity === "moderate") {
        feedReduction = 25;
        recommendedAction = `Reduce feed by 25% to ${Math.round(currentFeed * 0.75)} mm/min.`;
      } else {
        feedReduction = 10;
        recommendedAction = `Reduce feed by 10% to ${Math.round(currentFeed * 0.9)} mm/min. Monitor.`;
      }

      // Calculate stable RPM from stability lobe theory
      // Stable RPM = 60 * f_chatter / (fluteCount * (k + 1)) for lobe k
      for (let k = 0; k < 10; k++) {
        const stableRpm = (60 * dominantFreq) / (fluteCount * (k + 1));
        if (stableRpm > spindleRpm * 0.5 && stableRpm < spindleRpm * 1.5 &&
            Math.abs(stableRpm - spindleRpm) > 200) {
          rpmAlternative = Math.round(stableRpm);
          recommendedAction += ` Alternative: try ${rpmAlternative} RPM (stability lobe ${k}).`;
          break;
        }
      }
    }

    const result: ChatterDetectionResult = {
      detected: isChatter,
      dominantFrequency: Number(dominantFreq.toFixed(1)),
      amplitude: Number(peakMag.toFixed(4)),
      toothPassFrequency: Number(toothPassFreq.toFixed(1)),
      ratio: Number(ratio.toFixed(2)),
      severity,
      recommendedAction,
      feedReduction,
      rpmAlternative,
    };

    return result as unknown as Record<string, unknown>;
  }

  // ─────────────────────────────────────────────────────────
  // T2-U03: Thermal Compensation
  // ─────────────────────────────────────────────────────────

  /**
   * Calculate thermal drift compensation from temperature readings.
   * Uses CTE model: δ = α × ΔT × L
   */
  private compensateThermal(params: Record<string, unknown>): Record<string, unknown> {
    const readings = (params.readings as TemperatureReading[]) ?? [];
    const referenceTemp = Number(params.referenceTemp ?? 20);
    const machineMaterial = String(params.machineMaterial ?? "cast_iron");
    const axisLengths = (params.axisLengths as Record<string, number>) ?? { X: 500, Y: 400, Z: 350 };

    const cte = CTE_VALUES[machineMaterial] ?? CTE_VALUES.cast_iron;

    // Group readings by nearest axis
    const axisReadings: Record<string, TemperatureReading[]> = {};
    for (const r of readings) {
      // Determine dominant axis by position
      const axis = this.classifyAxis(r.location);
      if (!axisReadings[axis]) axisReadings[axis] = [];
      axisReadings[axis].push(r);
    }

    const compensations: ThermalCompensation[] = [];
    let totalCompensation = 0;

    for (const [axis, rds] of Object.entries(axisReadings)) {
      if (rds.length === 0) continue;
      const avgTemp = rds.reduce((s, r) => s + r.temperature, 0) / rds.length;
      const deltaT = avgTemp - referenceTemp;
      const length = axisLengths[axis] ?? 400;
      // δ = α × ΔT × L (µm)
      const compensation = cte * deltaT * length / 1000;

      compensations.push({
        axis,
        currentTemp: Number(avgTemp.toFixed(1)),
        referenceTemp,
        deltaT: Number(deltaT.toFixed(1)),
        cte,
        measuredLength: length,
        compensation: Number(compensation.toFixed(1)),
        confidence: Math.min(1.0, rds.length / 3), // more sensors = higher confidence
      });
      totalCompensation += Math.abs(compensation);
    }

    // If no readings, compute defaults for each axis
    if (compensations.length === 0) {
      for (const [axis, length] of Object.entries(axisLengths)) {
        const ambientTemp = Number(params.ambientTemp ?? 22);
        const deltaT = ambientTemp - referenceTemp;
        const compensation = cte * deltaT * length / 1000;
        compensations.push({
          axis,
          currentTemp: ambientTemp,
          referenceTemp,
          deltaT,
          cte,
          measuredLength: length,
          compensation: Number(compensation.toFixed(1)),
          confidence: 0.3, // low confidence without real sensors
        });
      }
    }

    return {
      compensations,
      totalAbsCompensation_um: Number(totalCompensation.toFixed(1)),
      machineMaterial,
      cte_um_m_C: cte,
      recommendation: totalCompensation > 5
        ? "Apply thermal compensation offsets to work coordinates"
        : "Thermal drift within tolerance — no action needed",
      warmupComplete: compensations.every(c => Math.abs(c.deltaT) < 2),
    };
  }

  // ─────────────────────────────────────────────────────────
  // T2-U04: Tool Life Countdown
  // ─────────────────────────────────────────────────────────

  /**
   * Track tool life against Taylor prediction.
   * VB wear progression with countdown to change.
   */
  private toolLifeCountdown(params: Record<string, unknown>): Record<string, unknown> {
    const toolId = String(params.toolId ?? "T01");
    const cuttingSpeed = Number(params.cuttingSpeed ?? 200);
    const actualCuttingTime = Number(params.actualCuttingTime ?? 0);
    const currentVB = Number(params.currentVB ?? 0);
    const isoGroup = String(params.isoGroup ?? "P");
    const cycleTimePart = Number(params.cycleTimePart ?? 5);
    const vbLimit = Number(params.vbLimit ?? 0.3);

    const taylor = TAYLOR_DEFAULTS[isoGroup] ?? TAYLOR_DEFAULTS.P;

    // Taylor tool life: T = (C/Vc)^(1/n)
    const taylorLife = Math.pow(taylor.C / cuttingSpeed, 1 / taylor.n);

    // VB-based remaining life
    let remainingLife: number;
    let wearRate: number;

    if (currentVB > 0 && actualCuttingTime > 0) {
      // Empirical wear rate from measurement
      wearRate = currentVB / actualCuttingTime;
      const timeToVBLimit = (vbLimit - currentVB) / wearRate;
      remainingLife = Math.max(0, timeToVBLimit);
    } else {
      // Use Taylor prediction
      wearRate = vbLimit / taylorLife;
      remainingLife = Math.max(0, taylorLife - actualCuttingTime);
    }

    const remainingPercent = taylorLife > 0
      ? Math.max(0, Math.min(100, (remainingLife / taylorLife) * 100))
      : 0;

    const estimatedPartsRemaining = cycleTimePart > 0
      ? Math.floor(remainingLife / cycleTimePart)
      : 0;

    let changeRecommendation: ToolLifeCountdown["changeRecommendation"];
    if (remainingPercent <= 5 || remainingLife < cycleTimePart) {
      changeRecommendation = "change_now";
    } else if (remainingPercent <= 15 || estimatedPartsRemaining <= 3) {
      changeRecommendation = "change_soon";
    } else if (remainingPercent <= 30) {
      changeRecommendation = "monitor";
    } else {
      changeRecommendation = "ok";
    }

    // Store wear data
    const wearReading: ToolWearReading = {
      timestamp: Date.now(),
      toolId,
      flankWear: currentVB,
      cuttingTime: actualCuttingTime,
      materialRemoved: 0,
    };
    if (!this.wearHistory.has(toolId)) {
      this.wearHistory.set(toolId, []);
    }
    this.wearHistory.get(toolId)!.push(wearReading);

    const result: ToolLifeCountdown = {
      toolId,
      taylorLife: Number(taylorLife.toFixed(1)),
      actualCuttingTime,
      remainingLife: Number(remainingLife.toFixed(1)),
      remainingPercent: Number(remainingPercent.toFixed(1)),
      wearRate: Number(wearRate.toFixed(5)),
      estimatedPartsRemaining,
      changeRecommendation,
      nextCheckIn: Math.min(estimatedPartsRemaining, 5),
    };

    return result as unknown as Record<string, unknown>;
  }

  // ─────────────────────────────────────────────────────────
  // T2-U05: Time Series Storage + Dashboard
  // ─────────────────────────────────────────────────────────

  private storeReading(params: Record<string, unknown>): Record<string, unknown> {
    const metric = String(params.metric ?? "unknown");
    const value = Number(params.value ?? 0);
    const tags = (params.tags as Record<string, string>) ?? {};

    const point: TimeSeriesPoint = {
      timestamp: Date.now(),
      metric,
      value,
      tags,
    };

    this.timeSeries.push(point);
    if (this.timeSeries.length > this.maxSeriesLength) {
      this.timeSeries = this.timeSeries.slice(-this.maxSeriesLength / 2);
    }

    return { stored: true, totalPoints: this.timeSeries.length };
  }

  private querySeries(params: Record<string, unknown>): Record<string, unknown> {
    const metric = String(params.metric ?? "");
    const since = Number(params.since ?? Date.now() - 3600000); // last hour
    const limit = Number(params.limit ?? 1000);

    const results = this.timeSeries
      .filter(p => p.metric === metric && p.timestamp >= since)
      .slice(-limit);

    const values = results.map(r => r.value);
    const stats = values.length > 0 ? {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
      stddev: this.stddev(values),
    } : null;

    return { metric, points: results.length, stats, data: results.slice(-100) };
  }

  private analyzeTrend(params: Record<string, unknown>): Record<string, unknown> {
    const metric = String(params.metric ?? "");
    const windowMinutes = Number(params.windowMinutes ?? 60);
    const since = Date.now() - windowMinutes * 60000;

    const data = this.timeSeries
      .filter(p => p.metric === metric && p.timestamp >= since);

    if (data.length < 5) {
      return { trend: "insufficient_data", points: data.length };
    }

    // Simple linear regression for trend
    const n = data.length;
    const xMean = data.reduce((s, d) => s + d.timestamp, 0) / n;
    const yMean = data.reduce((s, d) => s + d.value, 0) / n;

    let ssxy = 0, ssxx = 0;
    for (const d of data) {
      ssxy += (d.timestamp - xMean) * (d.value - yMean);
      ssxx += (d.timestamp - xMean) * (d.timestamp - xMean);
    }

    const slope = ssxx > 0 ? ssxy / ssxx : 0;
    const slopePerMinute = slope * 60000; // change per minute

    let trend: string;
    if (Math.abs(slopePerMinute) < 0.01) trend = "stable";
    else if (slopePerMinute > 0) trend = "increasing";
    else trend = "decreasing";

    return {
      metric,
      trend,
      slopePerMinute: Number(slopePerMinute.toFixed(4)),
      points: n,
      window: `${windowMinutes}min`,
      firstValue: data[0].value,
      lastValue: data[n - 1].value,
      change: Number((data[n - 1].value - data[0].value).toFixed(3)),
    };
  }

  private checkAlerts(params: Record<string, unknown>): Record<string, unknown> {
    const thresholds = (params.thresholds as Record<string, { warn: number; critical: number }>) ?? {
      spindle_load: { warn: 80, critical: 95 },
      vibration_rms: { warn: 2.0, critical: 5.0 },
      temperature_delta: { warn: 3.0, critical: 5.0 },
      tool_wear_vb: { warn: 0.2, critical: 0.28 },
    };

    const alerts: Array<{ level: string; metric: string; value: number; threshold: number; message: string }> = [];

    // Check latest readings for each metric
    for (const [metric, limits] of Object.entries(thresholds)) {
      const latest = this.timeSeries
        .filter(p => p.metric === metric)
        .slice(-1)[0];

      if (!latest) continue;

      if (latest.value >= limits.critical) {
        alerts.push({
          level: "critical",
          metric,
          value: latest.value,
          threshold: limits.critical,
          message: `${metric} at ${latest.value} exceeds critical threshold ${limits.critical}`,
        });
      } else if (latest.value >= limits.warn) {
        alerts.push({
          level: "warning",
          metric,
          value: latest.value,
          threshold: limits.warn,
          message: `${metric} at ${latest.value} exceeds warning threshold ${limits.warn}`,
        });
      }
    }

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.level === "critical").length,
      warningCount: alerts.filter(a => a.level === "warning").length,
      status: alerts.some(a => a.level === "critical")
        ? "critical"
        : alerts.length > 0
          ? "warning"
          : "ok",
    };
  }

  /**
   * Unified dashboard snapshot combining all intelligence
   */
  private getDashboard(params: Record<string, unknown>): Record<string, unknown> {
    const machine = String(params.machine ?? "unknown");

    const spindle = this.monitorSpindleLoad(params);
    const thermal = this.compensateThermal(params);
    const toolLife = this.toolLifeCountdown(params);
    const alerts = this.checkAlerts(params);

    return {
      timestamp: Date.now(),
      machine,
      spindle,
      thermal,
      toolLife,
      alerts,
      seriesPoints: this.timeSeries.length,
      spindleHistoryPoints: this.spindleHistory.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // FFT Helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Radix-2 DIT Cooley-Tukey FFT
   */
  private computeFFT(signal: number[]): { real: number[]; imag: number[] } {
    const N = signal.length;
    if (N <= 1) return { real: [...signal], imag: new Array(N).fill(0) };

    // Bit-reversal permutation
    const real = new Array(N).fill(0);
    const imag = new Array(N).fill(0);

    const bits = Math.log2(N);
    for (let i = 0; i < N; i++) {
      let rev = 0;
      for (let j = 0; j < bits; j++) {
        rev = (rev << 1) | ((i >> j) & 1);
      }
      real[rev] = signal[i];
    }

    // Butterfly operations
    for (let size = 2; size <= N; size *= 2) {
      const halfSize = size / 2;
      const angle = -2 * Math.PI / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const wr = Math.cos(angle * j);
          const wi = Math.sin(angle * j);
          const tr = wr * real[i + j + halfSize] - wi * imag[i + j + halfSize];
          const ti = wr * imag[i + j + halfSize] + wi * real[i + j + halfSize];
          real[i + j + halfSize] = real[i + j] - tr;
          imag[i + j + halfSize] = imag[i + j] - ti;
          real[i + j] += tr;
          imag[i + j] += ti;
        }
      }
    }

    return { real, imag };
  }

  private getMagnitudeAt(magnitudes: number[], freq: number, resolution: number): number {
    const bin = Math.round(freq / resolution);
    if (bin < 0 || bin >= magnitudes.length) return 0;
    // Check ±1 bin for spectral leakage
    let max = magnitudes[bin];
    if (bin > 0) max = Math.max(max, magnitudes[bin - 1]);
    if (bin < magnitudes.length - 1) max = Math.max(max, magnitudes[bin + 1]);
    return max;
  }

  private isNearHarmonic(freq: number, fundamental: number, tolerance: number): boolean {
    if (fundamental <= 0) return false;
    const ratio = freq / fundamental;
    const nearestInt = Math.round(ratio);
    return nearestInt > 0 && Math.abs(ratio - nearestInt) / nearestInt < tolerance;
  }

  private classifyAxis(location: { x: number; y: number; z: number }): string {
    const abs = { X: Math.abs(location.x), Y: Math.abs(location.y), Z: Math.abs(location.z) };
    if (abs.X >= abs.Y && abs.X >= abs.Z) return "X";
    if (abs.Y >= abs.X && abs.Y >= abs.Z) return "Y";
    return "Z";
  }

  private stddev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sumSq = values.reduce((s, v) => s + (v - mean) * (v - mean), 0);
    return Math.sqrt(sumSq / (values.length - 1));
  }
}

export const realTimeMachineIntelligenceEngine = new RealTimeMachineIntelligenceEngine();
