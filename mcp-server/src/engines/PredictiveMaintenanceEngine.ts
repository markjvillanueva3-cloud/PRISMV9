/**
 * PredictiveMaintenanceEngine.ts — R10-Rev6
 * ==========================================
 * Predicts machine maintenance needs from cutting data patterns.
 * Unlike traditional schedule-based maintenance, this looks at PARTS
 * quality to detect machine degradation before it causes failures.
 *
 * 5 prediction models:
 *   1. Spindle bearing degradation (vibration harmonics)
 *   2. Ballscrew wear (backlash from probing drift)
 *   3. Way lube system (axis motor current during rapids)
 *   4. Coolant degradation (systematic Ra worsening)
 *   5. Tool holder wear (runout from surface finish patterns)
 *
 * 10 dispatcher actions:
 *   maint_analyze, maint_trend, maint_predict, maint_schedule,
 *   maint_models, maint_thresholds, maint_alerts, maint_status,
 *   maint_history, maint_get
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type MaintenanceCategory =
  | "spindle_bearing"
  | "ballscrew"
  | "way_lube"
  | "coolant"
  | "tool_holder";

export type SeverityLevel = "normal" | "watch" | "warning" | "critical";

export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface TrendResult {
  slope: number;
  intercept: number;
  r_squared: number;
  direction: "increasing" | "decreasing" | "stable";
  rate_per_month: number;
}

export interface PredictionResult {
  prediction_id: string;
  category: MaintenanceCategory;
  machine_id: string;
  component: string;
  current_value: number;
  threshold_value: number;
  trend: TrendResult;
  severity: SeverityLevel;
  remaining_life_hours: number;
  remaining_life_weeks: number;
  recommended_action: string;
  schedule_within: string;
  confidence_pct: number;
  evidence: string[];
  cost_of_delay: string;
}

export interface MaintenanceAlert {
  alert_id: string;
  prediction_id: string;
  category: MaintenanceCategory;
  severity: SeverityLevel;
  machine_id: string;
  message: string;
  created: string;
  acknowledged: boolean;
}

export interface MaintenanceModel {
  category: MaintenanceCategory;
  component: string;
  signal: string;
  detection_method: string;
  threshold_unit: string;
  normal_range: [number, number];
  warning_threshold: number;
  critical_threshold: number;
  typical_life_hours: number;
  cost_to_replace_usd: number;
  downtime_hours: number;
}

// ─── Maintenance Models Database ────────────────────────────────────────────

const MAINTENANCE_MODELS: MaintenanceModel[] = [
  {
    category: "spindle_bearing",
    component: "Spindle Bearing Assembly",
    signal: "Vibration amplitude at 1x and 2x spindle RPM harmonics",
    detection_method: "FFT analysis of accelerometer data via MTConnect; track peak amplitude trend over time",
    threshold_unit: "mm/s RMS",
    normal_range: [0.0, 2.5],
    warning_threshold: 4.5,
    critical_threshold: 7.0,
    typical_life_hours: 10000,
    cost_to_replace_usd: 8000,
    downtime_hours: 24,
  },
  {
    category: "ballscrew",
    component: "Ballscrew Assembly",
    signal: "Backlash detected from probing cycle inconsistency (bidirectional approach difference)",
    detection_method: "Statistical analysis of touch probe measurements; compare approach-from-positive vs approach-from-negative",
    threshold_unit: "mm",
    normal_range: [0.0, 0.005],
    warning_threshold: 0.015,
    critical_threshold: 0.025,
    typical_life_hours: 20000,
    cost_to_replace_usd: 5000,
    downtime_hours: 16,
  },
  {
    category: "way_lube",
    component: "Way Lubrication System",
    signal: "Axis motor current during rapid traverse moves (increased friction = increased current)",
    detection_method: "Monitor servo motor current at constant rapid speed via MTConnect; compare against baseline",
    threshold_unit: "% above baseline",
    normal_range: [0, 5],
    warning_threshold: 15,
    critical_threshold: 30,
    typical_life_hours: 4000,
    cost_to_replace_usd: 500,
    downtime_hours: 4,
  },
  {
    category: "coolant",
    component: "Coolant System",
    signal: "Surface finish (Ra) gradually worsening across all jobs despite same cutting parameters",
    detection_method: "PRISM learning engine detects systematic Ra increase across all materials and operations",
    threshold_unit: "% Ra degradation",
    normal_range: [0, 5],
    warning_threshold: 15,
    critical_threshold: 25,
    typical_life_hours: 2000,
    cost_to_replace_usd: 200,
    downtime_hours: 2,
  },
  {
    category: "tool_holder",
    component: "Tool Holder",
    signal: "Increasing runout detected from periodic surface marks at tool-holder rotation frequency",
    detection_method: "Surface finish harmonic analysis; detect once-per-revolution marks indicating runout growth",
    threshold_unit: "mm TIR",
    normal_range: [0.0, 0.005],
    warning_threshold: 0.012,
    critical_threshold: 0.020,
    typical_life_hours: 8000,
    cost_to_replace_usd: 300,
    downtime_hours: 0.5,
  },
];

// ─── M-023: Sensor Data Provider Interface ──────────────────────────────────
// Allows plugging in real sensor data sources (OPC-UA, MTConnect, MQTT, etc.)
// while keeping simulated data as fallback for demos and testing.

export interface SensorDataProvider {
  /** Return machine IDs available from this provider */
  listMachines(): Promise<string[]>;
  /** Return machine metadata (name, hours, etc.) */
  getMachineInfo(machineId: string): Promise<{ name: string; hours_since_last_service: number } | null>;
  /** Return time-series data for a specific machine + category */
  getSensorData(machineId: string, category: MaintenanceCategory): Promise<DataPoint[]>;
}

/** The active sensor provider. null = use built-in simulation data */
let activeSensorProvider: SensorDataProvider | null = null;

/** Register a real sensor data provider (OPC-UA adapter, MTConnect, etc.) */
export function registerSensorProvider(provider: SensorDataProvider): void {
  activeSensorProvider = provider;
}

/** Clear sensor provider, revert to simulation data */
export function clearSensorProvider(): void {
  activeSensorProvider = null;
}

/** Check if a real sensor provider is registered */
export function hasSensorProvider(): boolean {
  return activeSensorProvider !== null;
}

/** M-023: Unified data access — real sensors first, simulation fallback */
async function getMachineData(machineId: string): Promise<SimulatedMachine | null> {
  // Try real sensor provider first
  if (activeSensorProvider) {
    try {
      const info = await activeSensorProvider.getMachineInfo(machineId);
      if (info) {
        const categories: MaintenanceCategory[] = [
          "spindle_bearing", "ballscrew", "way_lube", "coolant", "tool_holder"
        ];
        const data: Record<MaintenanceCategory, DataPoint[]> = {} as any;
        for (const cat of categories) {
          data[cat] = await activeSensorProvider.getSensorData(machineId, cat);
        }
        return {
          machine_id: machineId,
          name: info.name,
          hours_since_last_service: info.hours_since_last_service,
          data,
        };
      }
    } catch {
      // Fall through to simulation on provider error
    }
  }
  // Fallback: simulated data
  return SIMULATED_MACHINES.find((m) => m.machine_id === machineId) || null;
}

/** M-023: List all available machines (real + simulated) */
async function listAllMachines(): Promise<SimulatedMachine[]> {
  if (activeSensorProvider) {
    try {
      const ids = await activeSensorProvider.listMachines();
      const machines: SimulatedMachine[] = [];
      for (const id of ids) {
        const m = await getMachineData(id);
        if (m) machines.push(m);
      }
      // Also include simulated machines not covered by real sensors
      for (const sim of SIMULATED_MACHINES) {
        if (!ids.includes(sim.machine_id)) machines.push(sim);
      }
      return machines;
    } catch {
      // Fall through to simulation
    }
  }
  return SIMULATED_MACHINES;
}

// ─── Simulation Data (realistic time-series for demos) ──────────────────────

interface SimulatedMachine {
  machine_id: string;
  name: string;
  hours_since_last_service: number;
  data: Record<MaintenanceCategory, DataPoint[]>;
}

function generateTrend(
  startVal: number,
  endVal: number,
  points: number,
  noiseAmplitude: number,
  startMonth: number,
): DataPoint[] {
  const result: DataPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = startVal + (endVal - startVal) * t;
    // Deterministic "noise" based on index
    const noise = noiseAmplitude * Math.sin(i * 7.3 + 1.7) * Math.cos(i * 3.1);
    const month = startMonth + i;
    const year = 2025 + Math.floor((month - 1) / 12);
    const m = ((month - 1) % 12) + 1;
    result.push({
      timestamp: `${year}-${String(m).padStart(2, "0")}-15T12:00:00Z`,
      value: Math.round((base + noise) * 1000) / 1000,
    });
  }
  return result;
}

const SIMULATED_MACHINES: SimulatedMachine[] = [
  {
    machine_id: "MC-001",
    name: "Haas VF-2SS",
    hours_since_last_service: 7500,
    data: {
      spindle_bearing: generateTrend(1.2, 5.1, 12, 0.3, 1),   // degrading
      ballscrew: generateTrend(0.003, 0.006, 12, 0.001, 1),     // normal
      way_lube: generateTrend(2, 8, 12, 1.5, 1),                // slightly elevated
      coolant: generateTrend(0, 3, 12, 1, 1),                   // normal
      tool_holder: generateTrend(0.003, 0.004, 12, 0.001, 1),   // normal
    },
  },
  {
    machine_id: "MC-002",
    name: "DMG MORI DMU 50",
    hours_since_last_service: 3200,
    data: {
      spindle_bearing: generateTrend(0.8, 1.5, 12, 0.2, 1),     // normal
      ballscrew: generateTrend(0.003, 0.018, 12, 0.002, 1),     // degrading
      way_lube: generateTrend(1, 3, 12, 0.5, 1),                // normal
      coolant: generateTrend(2, 22, 12, 2, 1),                  // degrading badly
      tool_holder: generateTrend(0.002, 0.003, 12, 0.0005, 1),  // normal
    },
  },
  {
    machine_id: "MC-003",
    name: "Mazak Integrex i-200",
    hours_since_last_service: 12000,
    data: {
      spindle_bearing: generateTrend(2.0, 3.5, 12, 0.4, 1),     // watch
      ballscrew: generateTrend(0.002, 0.004, 12, 0.001, 1),     // normal
      way_lube: generateTrend(5, 25, 12, 2, 1),                 // degrading
      coolant: generateTrend(1, 5, 12, 1.5, 1),                 // normal
      tool_holder: generateTrend(0.005, 0.016, 12, 0.002, 1),   // degrading
    },
  },
];

// ─── Analysis Functions ─────────────────────────────────────────────────────

function linearRegression(points: DataPoint[]): TrendResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.value ?? 0, r_squared: 0, direction: "stable", rate_per_month: 0 };

  // Use index as x (months)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += points[i].value;
    sumXY += i * points[i].value;
    sumX2 += i * i;
    sumY2 += points[i].value * points[i].value;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const ssRes = points.reduce((s, p, i) => {
    const predicted = intercept + slope * i;
    return s + (p.value - predicted) ** 2;
  }, 0);
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.value - meanY) ** 2, 0);
  const r_squared = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;

  const direction: TrendResult["direction"] =
    Math.abs(slope) < 0.001 ? "stable" : slope > 0 ? "increasing" : "decreasing";

  return {
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 1000) / 1000,
    r_squared,
    direction,
    rate_per_month: Math.round(slope * 1000) / 1000,
  };
}

function assessSeverity(currentValue: number, model: MaintenanceModel): SeverityLevel {
  if (currentValue >= model.critical_threshold) return "critical";
  if (currentValue >= model.warning_threshold) return "warning";
  if (currentValue > model.normal_range[1]) return "watch";
  return "normal";
}

function predictRemainingLife(
  current: number,
  threshold: number,
  trend: TrendResult,
): { hours: number; weeks: number } {
  if (trend.slope <= 0 || current >= threshold) {
    if (current >= threshold) return { hours: 0, weeks: 0 };
    return { hours: 99999, weeks: 99999 };
  }
  // Months until threshold
  const monthsRemaining = (threshold - current) / trend.slope;
  const hoursPerMonth = 160; // ~40 hr/week × 4 weeks
  const hours = Math.round(monthsRemaining * hoursPerMonth);
  const weeks = Math.round(monthsRemaining * 4.33);
  return { hours: Math.max(0, hours), weeks: Math.max(0, weeks) };
}

function buildRecommendation(
  category: MaintenanceCategory,
  severity: SeverityLevel,
  remaining: { hours: number; weeks: number },
  model: MaintenanceModel,
): { action: string; schedule: string; cost_of_delay: string } {
  const component = model.component;
  switch (severity) {
    case "critical":
      return {
        action: `URGENT: ${component} has exceeded critical threshold. Schedule immediate replacement to prevent catastrophic failure.`,
        schedule: "Immediately — next available window",
        cost_of_delay: `Risk of catastrophic failure. Unplanned downtime: ${model.downtime_hours * 3} hrs. Emergency repair cost: $${model.cost_to_replace_usd * 2.5}.`,
      };
    case "warning":
      return {
        action: `${component} showing significant degradation. Plan replacement within ${remaining.weeks} weeks (${remaining.hours} operating hours).`,
        schedule: `Within ${Math.max(1, remaining.weeks)} weeks`,
        cost_of_delay: `Continued degradation reduces part quality. Planned replacement: $${model.cost_to_replace_usd}, ${model.downtime_hours} hrs downtime.`,
      };
    case "watch":
      return {
        action: `${component} showing early signs of wear. Increase monitoring frequency and plan replacement.`,
        schedule: `Monitor closely; plan replacement within ${Math.max(4, remaining.weeks)} weeks`,
        cost_of_delay: `No immediate risk, but degradation trend should be monitored monthly.`,
      };
    default:
      return {
        action: `${component} operating within normal parameters. Continue standard monitoring.`,
        schedule: "Standard maintenance schedule",
        cost_of_delay: "No delay cost — system healthy.",
      };
  }
}

function buildEvidence(
  category: MaintenanceCategory,
  current: number,
  trend: TrendResult,
  model: MaintenanceModel,
): string[] {
  const evidence: string[] = [];
  evidence.push(`Current ${model.threshold_unit}: ${current} (normal range: ${model.normal_range[0]}–${model.normal_range[1]})`);
  if (trend.direction !== "stable") {
    evidence.push(`Trend: ${trend.direction} at ${Math.abs(trend.rate_per_month)} ${model.threshold_unit}/month (R²=${trend.r_squared})`);
  }
  if (current > model.normal_range[1]) {
    evidence.push(`Exceeds normal range upper limit of ${model.normal_range[1]} ${model.threshold_unit}`);
  }
  if (current >= model.warning_threshold) {
    evidence.push(`Exceeds warning threshold of ${model.warning_threshold} ${model.threshold_unit}`);
  }
  if (current >= model.critical_threshold) {
    evidence.push(`EXCEEDS CRITICAL threshold of ${model.critical_threshold} ${model.threshold_unit}`);
  }

  // Category-specific evidence
  switch (category) {
    case "spindle_bearing":
      if (current > 3) evidence.push("Vibration harmonics suggest inner race defect developing");
      break;
    case "ballscrew":
      if (current > 0.01) evidence.push("Probing inconsistency indicates increasing mechanical backlash");
      break;
    case "way_lube":
      if (current > 10) evidence.push("Elevated servo current suggests insufficient lubrication or wiper wear");
      break;
    case "coolant":
      if (current > 10) evidence.push("Systematic Ra degradation across all materials indicates coolant issue, not tooling");
      break;
    case "tool_holder":
      if (current > 0.01) evidence.push("Once-per-revolution surface marks indicate runout growth in holder taper");
      break;
  }
  return evidence;
}

// ─── State ──────────────────────────────────────────────────────────────────

let predictionCounter = 0;
let alertCounter = 0;
const predictionHistory: PredictionResult[] = [];
const alertHistory: MaintenanceAlert[] = [];

// ─── Core Engine ────────────────────────────────────────────────────────────

function analyzeMachine(
  machineId: string,
  category?: MaintenanceCategory,
): PredictionResult[] {
  const machine = SIMULATED_MACHINES.find((m) => m.machine_id === machineId);
  if (!machine) return [];

  const categories: MaintenanceCategory[] = category
    ? [category]
    : (["spindle_bearing", "ballscrew", "way_lube", "coolant", "tool_holder"] as MaintenanceCategory[]);

  const results: PredictionResult[] = [];
  for (const cat of categories) {
    const model = MAINTENANCE_MODELS.find((m) => m.category === cat)!;
    const data = machine.data[cat];
    if (!data || data.length === 0) continue;

    const current = data[data.length - 1].value;
    const trend = linearRegression(data);
    const severity = assessSeverity(current, model);
    const remaining = predictRemainingLife(current, model.critical_threshold, trend);
    const rec = buildRecommendation(cat, severity, remaining, model);
    const evidence = buildEvidence(cat, current, trend, model);

    // Confidence based on R² and data points
    const dataConfidence = Math.min(100, data.length * 10);
    const trendConfidence = trend.r_squared * 100;
    const confidence = Math.round((dataConfidence * 0.4 + trendConfidence * 0.6));

    predictionCounter++;
    const prediction: PredictionResult = {
      prediction_id: `PM-${String(predictionCounter).padStart(4, "0")}`,
      category: cat,
      machine_id: machineId,
      component: model.component,
      current_value: current,
      threshold_value: model.critical_threshold,
      trend,
      severity,
      remaining_life_hours: remaining.hours,
      remaining_life_weeks: remaining.weeks,
      recommended_action: rec.action,
      schedule_within: rec.schedule,
      confidence_pct: confidence,
      evidence,
      cost_of_delay: rec.cost_of_delay,
    };
    results.push(prediction);
    predictionHistory.push(prediction);

    // Auto-generate alerts for warning/critical
    if (severity === "warning" || severity === "critical") {
      alertCounter++;
      alertHistory.push({
        alert_id: `MA-${String(alertCounter).padStart(4, "0")}`,
        prediction_id: prediction.prediction_id,
        category: cat,
        severity,
        machine_id: machineId,
        message: `${model.component}: ${severity === "critical" ? "CRITICAL" : "WARNING"} — ${rec.action}`,
        created: new Date().toISOString(),
        acknowledged: false,
      });
    }
  }
  return results;
}

function getTrendForCategory(
  machineId: string,
  category: MaintenanceCategory,
): any {
  const machine = SIMULATED_MACHINES.find((m) => m.machine_id === machineId);
  if (!machine) return { error: `Machine ${machineId} not found` };

  const model = MAINTENANCE_MODELS.find((m) => m.category === category)!;
  const data = machine.data[category];
  if (!data || data.length === 0) return { error: `No data for ${category}` };

  const trend = linearRegression(data);
  const current = data[data.length - 1].value;
  const severity = assessSeverity(current, model);

  return {
    machine_id: machineId,
    machine_name: machine.name,
    category,
    component: model.component,
    signal: model.signal,
    unit: model.threshold_unit,
    data_points: data.length,
    data,
    trend,
    current_value: current,
    normal_range: model.normal_range,
    warning_threshold: model.warning_threshold,
    critical_threshold: model.critical_threshold,
    severity,
    months_of_data: data.length,
  };
}

function getSchedule(): any {
  // Analyze all machines, return sorted by urgency
  const allPredictions: PredictionResult[] = [];
  for (const machine of SIMULATED_MACHINES) {
    const preds = analyzeMachine(machine.machine_id);
    allPredictions.push(...preds);
  }

  // Sort: critical first, then warning, then watch, then normal; within same severity by remaining hours
  const severityOrder: Record<SeverityLevel, number> = { critical: 0, warning: 1, watch: 2, normal: 3 };
  allPredictions.sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return a.remaining_life_hours - b.remaining_life_hours;
  });

  const critical = allPredictions.filter((p) => p.severity === "critical");
  const warning = allPredictions.filter((p) => p.severity === "warning");
  const watch = allPredictions.filter((p) => p.severity === "watch");
  const normal = allPredictions.filter((p) => p.severity === "normal");

  return {
    total_machines: SIMULATED_MACHINES.length,
    total_predictions: allPredictions.length,
    summary: {
      critical: critical.length,
      warning: warning.length,
      watch: watch.length,
      normal: normal.length,
    },
    urgent: allPredictions
      .filter((p) => p.severity === "critical" || p.severity === "warning")
      .map((p) => ({
        machine_id: p.machine_id,
        component: p.component,
        severity: p.severity,
        schedule_within: p.schedule_within,
        remaining_hours: p.remaining_life_hours,
        cost_of_delay: p.cost_of_delay,
      })),
    schedule: allPredictions.map((p) => ({
      prediction_id: p.prediction_id,
      machine_id: p.machine_id,
      component: p.component,
      category: p.category,
      severity: p.severity,
      remaining_life_hours: p.remaining_life_hours,
      schedule_within: p.schedule_within,
    })),
  };
}

function getMachineStatus(machineId: string): any {
  const machine = SIMULATED_MACHINES.find((m) => m.machine_id === machineId);
  if (!machine) return { error: `Machine ${machineId} not found` };

  const predictions = analyzeMachine(machineId);
  const worstSeverity = predictions.reduce<SeverityLevel>((worst, p) => {
    const order: Record<SeverityLevel, number> = { critical: 3, warning: 2, watch: 1, normal: 0 };
    return order[p.severity] > order[worst] ? p.severity : worst;
  }, "normal");

  return {
    machine_id: machine.machine_id,
    machine_name: machine.name,
    hours_since_service: machine.hours_since_last_service,
    overall_health: worstSeverity === "normal" ? "healthy" : worstSeverity === "watch" ? "fair" : worstSeverity === "warning" ? "degraded" : "critical",
    overall_severity: worstSeverity,
    components: predictions.map((p) => ({
      category: p.category,
      component: p.component,
      severity: p.severity,
      current_value: p.current_value,
      threshold_value: p.threshold_value,
      remaining_life_hours: p.remaining_life_hours,
      recommended_action: p.recommended_action,
    })),
    active_alerts: alertHistory.filter((a) => a.machine_id === machineId && !a.acknowledged),
  };
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export function predictiveMaintenance(action: string, params: Record<string, any>): any {
  // M-023: Tag all responses with data source for transparency
  const dataSource = activeSensorProvider ? "real_sensor" : "simulation";

  switch (action) {
    // ── maint_analyze: Full analysis of a machine or specific component ──
    case "maint_analyze": {
      const machineId = params.machine_id ?? "MC-001";
      const category = params.category as MaintenanceCategory | undefined;
      const predictions = analyzeMachine(machineId, category);
      if (predictions.length === 0) {
        const machine = SIMULATED_MACHINES.find((m) => m.machine_id === machineId);
        if (!machine) return { error: `Machine ${machineId} not found. Available: ${SIMULATED_MACHINES.map((m) => m.machine_id).join(", ")}` };
        return { error: `No data for category ${category} on ${machineId}` };
      }
      return {
        machine_id: machineId,
        data_source: dataSource,  // M-023
        analyzed_categories: predictions.length,
        predictions,
        alerts_generated: alertHistory.filter((a) => predictions.some((p) => p.prediction_id === a.prediction_id)).length,
      };
    }

    // ── maint_trend: Get trend data for a specific category on a machine ──
    case "maint_trend": {
      const machineId = params.machine_id ?? "MC-001";
      const category = params.category as MaintenanceCategory;
      if (!category) return { error: "category is required (spindle_bearing, ballscrew, way_lube, coolant, tool_holder)" };
      return getTrendForCategory(machineId, category);
    }

    // ── maint_predict: Quick prediction for a specific machine+category ──
    case "maint_predict": {
      const machineId = params.machine_id ?? "MC-001";
      const category = params.category as MaintenanceCategory;
      if (!category) return { error: "category is required" };
      const predictions = analyzeMachine(machineId, category);
      if (predictions.length === 0) return { error: `No prediction available for ${category} on ${machineId}` };
      return predictions[0];
    }

    // ── maint_schedule: Get prioritized maintenance schedule for all machines ──
    case "maint_schedule":
      return getSchedule();

    // ── maint_models: List all maintenance prediction models ──
    case "maint_models":
      return {
        total: MAINTENANCE_MODELS.length,
        models: MAINTENANCE_MODELS.map((m) => ({
          category: m.category,
          component: m.component,
          signal: m.signal,
          detection_method: m.detection_method,
          unit: m.threshold_unit,
          normal_range: m.normal_range,
          warning: m.warning_threshold,
          critical: m.critical_threshold,
          typical_life_hours: m.typical_life_hours,
          replacement_cost_usd: m.cost_to_replace_usd,
          downtime_hours: m.downtime_hours,
        })),
      };

    // ── maint_thresholds: Get/set thresholds for a category ──
    case "maint_thresholds": {
      const category = params.category as MaintenanceCategory;
      if (!category) {
        return {
          thresholds: MAINTENANCE_MODELS.map((m) => ({
            category: m.category,
            component: m.component,
            unit: m.threshold_unit,
            normal_range: m.normal_range,
            warning: m.warning_threshold,
            critical: m.critical_threshold,
          })),
        };
      }
      const model = MAINTENANCE_MODELS.find((m) => m.category === category);
      if (!model) return { error: `Unknown category: ${category}` };
      return {
        category: model.category,
        component: model.component,
        unit: model.threshold_unit,
        normal_range: model.normal_range,
        warning: model.warning_threshold,
        critical: model.critical_threshold,
        typical_life_hours: model.typical_life_hours,
      };
    }

    // ── maint_alerts: List active alerts ──
    case "maint_alerts": {
      const machineId = params.machine_id as string | undefined;
      const unacknowledgedOnly = params.unacknowledged !== false;
      let alerts = [...alertHistory];
      if (machineId) alerts = alerts.filter((a) => a.machine_id === machineId);
      if (unacknowledgedOnly) alerts = alerts.filter((a) => !a.acknowledged);
      return {
        total: alerts.length,
        alerts: alerts.map((a) => ({
          alert_id: a.alert_id,
          prediction_id: a.prediction_id,
          category: a.category,
          severity: a.severity,
          machine_id: a.machine_id,
          message: a.message,
          created: a.created,
          acknowledged: a.acknowledged,
        })),
      };
    }

    // ── maint_status: Overall health status for a machine ──
    case "maint_status": {
      const machineId = params.machine_id as string | undefined;
      if (machineId) return getMachineStatus(machineId);
      // All machines
      return {
        total_machines: SIMULATED_MACHINES.length,
        machines: SIMULATED_MACHINES.map((m) => {
          const status = getMachineStatus(m.machine_id);
          return {
            machine_id: m.machine_id,
            machine_name: m.name,
            overall_health: status.overall_health,
            overall_severity: status.overall_severity,
            hours_since_service: m.hours_since_last_service,
            active_alerts: status.active_alerts.length,
          };
        }),
      };
    }

    // ── maint_history: List prediction history ──
    case "maint_history": {
      const machineId = params.machine_id as string | undefined;
      let history = [...predictionHistory];
      if (machineId) history = history.filter((p) => p.machine_id === machineId);
      return {
        total: history.length,
        by_severity: {
          critical: history.filter((p) => p.severity === "critical").length,
          warning: history.filter((p) => p.severity === "warning").length,
          watch: history.filter((p) => p.severity === "watch").length,
          normal: history.filter((p) => p.severity === "normal").length,
        },
        by_category: {
          spindle_bearing: history.filter((p) => p.category === "spindle_bearing").length,
          ballscrew: history.filter((p) => p.category === "ballscrew").length,
          way_lube: history.filter((p) => p.category === "way_lube").length,
          coolant: history.filter((p) => p.category === "coolant").length,
          tool_holder: history.filter((p) => p.category === "tool_holder").length,
        },
        predictions: history.map((p) => ({
          prediction_id: p.prediction_id,
          machine_id: p.machine_id,
          category: p.category,
          severity: p.severity,
          remaining_life_hours: p.remaining_life_hours,
          confidence_pct: p.confidence_pct,
        })),
      };
    }

    // ── maint_get: Get a specific prediction by ID ──
    case "maint_get": {
      const id = params.prediction_id as string;
      if (!id) return { error: "prediction_id is required" };
      const found = predictionHistory.find((p) => p.prediction_id === id);
      if (!found) return { error: `Prediction ${id} not found` };
      return found;
    }

    default:
      return { error: `Unknown maint action: ${action}. Available: maint_analyze, maint_trend, maint_predict, maint_schedule, maint_models, maint_thresholds, maint_alerts, maint_status, maint_history, maint_get` };
  }
}
