/**
 * LatheProductionQualityTrackingEngine — Real-Time Quality Tracking
 *
 * U-LTH55: Production quality metrics, SPC, inspection tracking
 * Uses QualityControlEngine + SPCEngine + InspectionEngine patterns
 *
 * @module engines/LatheProductionQualityTrackingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Dimension {
  name: string;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: "mm" | "inch";
  critical: boolean;
}

export interface Measurement {
  dimension_name: string;
  measured_value: number;
  deviation: number;
  in_tolerance: boolean;
  timestamp: string;
  operator_id: string;
  instrument_id: string;
}

export interface Inspection {
  inspection_id: string;
  job_id: string;
  part_number: string;
  serial_number: string;
  inspection_type: "first_article" | "in_process" | "final" | "receiving";
  measurements: Measurement[];
  result: "pass" | "fail" | "conditional";
  inspected_by: string;
  inspected_at: string;
  notes?: string;
}

export interface SPCDataPoint {
  timestamp: string;
  value: number;
  subgroup: number;
}

export interface SPCChart {
  dimension_name: string;
  chart_type: "xbar" | "r" | "s" | "p" | "np" | "c" | "u";
  ucl: number;
  lcl: number;
  center_line: number;
  data_points: SPCDataPoint[];
  out_of_control_points: number[];
  rules_violated: string[];
  cpk: number;
  ppk: number;
}

export interface QualityMetrics {
  job_id: string;
  total_inspected: number;
  total_passed: number;
  total_failed: number;
  first_pass_yield: number;
  defect_rate_ppm: number;
  dimensions_tracked: number;
  cpk_average: number;
  quality_score: number;
}

export interface NonConformance {
  nc_id: string;
  job_id: string;
  part_serial: string;
  dimension_name: string;
  measured_value: number;
  deviation: number;
  disposition: "scrap" | "rework" | "use_as_is" | "return_to_vendor" | "pending";
  root_cause?: string;
  corrective_action?: string;
  created_at: string;
  resolved_at?: string;
}

export interface TrendAnalysis {
  dimension_name: string;
  trend: "improving" | "stable" | "degrading";
  mean_shift: number;
  range_change: number;
  prediction: string;
  confidence: number;
}

// ============================================================================
// SPC RULES (Western Electric)
// ============================================================================

const SPC_RULES = {
  RULE_1: "1 point beyond 3σ",
  RULE_2: "2 of 3 points beyond 2σ (same side)",
  RULE_3: "4 of 5 points beyond 1σ (same side)",
  RULE_4: "8 points in a row on same side of center",
  RULE_5: "6 points trending up or down",
  RULE_6: "14 points alternating up/down",
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheProductionQualityTrackingEngine {
  private inspections: Map<string, Inspection> = new Map();
  private spcData: Map<string, SPCDataPoint[]> = new Map();
  private nonConformances: Map<string, NonConformance> = new Map();
  private dimensions: Map<string, Dimension> = new Map();

  constructor() {
    this.initializeSampleDimensions();
  }

  private initializeSampleDimensions(): void {
    const dims: Dimension[] = [
      { name: "OD_1", nominal: 25.000, tolerance_plus: 0.025, tolerance_minus: 0.025, unit: "mm", critical: true },
      { name: "ID_1", nominal: 12.000, tolerance_plus: 0.020, tolerance_minus: 0.020, unit: "mm", critical: true },
      { name: "LENGTH", nominal: 50.000, tolerance_plus: 0.100, tolerance_minus: 0.100, unit: "mm", critical: false },
      { name: "THREAD_PD", nominal: 9.350, tolerance_plus: 0.013, tolerance_minus: 0.013, unit: "mm", critical: true },
      { name: "GROOVE_WIDTH", nominal: 3.000, tolerance_plus: 0.050, tolerance_minus: 0.050, unit: "mm", critical: false },
    ];

    for (const dim of dims) {
      this.dimensions.set(dim.name, dim);
    }
  }

  // --------------------------------------------------------------------------
  // Inspection Management
  // --------------------------------------------------------------------------

  createInspection(params: {
    job_id: string;
    part_number: string;
    serial_number: string;
    inspection_type: Inspection["inspection_type"];
    inspected_by: string;
  }): Inspection {
    const inspectionId = `INS-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const inspection: Inspection = {
      inspection_id: inspectionId,
      job_id: params.job_id,
      part_number: params.part_number,
      serial_number: params.serial_number,
      inspection_type: params.inspection_type,
      measurements: [],
      result: "pass",
      inspected_by: params.inspected_by,
      inspected_at: new Date().toISOString(),
    };

    this.inspections.set(inspectionId, inspection);
    return inspection;
  }

  recordMeasurement(
    inspectionId: string,
    dimensionName: string,
    measuredValue: number,
    operatorId: string,
    instrumentId: string
  ): Measurement | null {
    const inspection = this.inspections.get(inspectionId);
    const dimension = this.dimensions.get(dimensionName);

    if (!inspection || !dimension) return null;

    const deviation = measuredValue - dimension.nominal;
    const inTolerance =
      deviation <= dimension.tolerance_plus && deviation >= -dimension.tolerance_minus;

    const measurement: Measurement = {
      dimension_name: dimensionName,
      measured_value: measuredValue,
      deviation: Math.round(deviation * 10000) / 10000,
      in_tolerance: inTolerance,
      timestamp: new Date().toISOString(),
      operator_id: operatorId,
      instrument_id: instrumentId,
    };

    inspection.measurements.push(measurement);

    if (!inTolerance) {
      inspection.result = "fail";

      this.createNonConformance({
        job_id: inspection.job_id,
        part_serial: inspection.serial_number,
        dimension_name: dimensionName,
        measured_value: measuredValue,
        deviation,
      });
    }

    this.inspections.set(inspectionId, inspection);

    const spcKey = `${inspection.job_id}:${dimensionName}`;
    const spcPoints = this.spcData.get(spcKey) || [];
    spcPoints.push({
      timestamp: measurement.timestamp,
      value: measuredValue,
      subgroup: Math.floor(spcPoints.length / 5),
    });
    this.spcData.set(spcKey, spcPoints);

    return measurement;
  }

  finalizeInspection(inspectionId: string, notes?: string): Inspection | null {
    const inspection = this.inspections.get(inspectionId);
    if (!inspection) return null;

    const failedMeasurements = inspection.measurements.filter((m) => !m.in_tolerance);

    if (failedMeasurements.length === 0) {
      inspection.result = "pass";
    } else if (failedMeasurements.every((m) => !this.dimensions.get(m.dimension_name)?.critical)) {
      inspection.result = "conditional";
    } else {
      inspection.result = "fail";
    }

    if (notes) {
      inspection.notes = notes;
    }

    this.inspections.set(inspectionId, inspection);
    return inspection;
  }

  getInspection(inspectionId: string): Inspection | null {
    return this.inspections.get(inspectionId) || null;
  }

  getInspectionsByJob(jobId: string): Inspection[] {
    return Array.from(this.inspections.values()).filter((i) => i.job_id === jobId);
  }

  // --------------------------------------------------------------------------
  // SPC Analysis
  // --------------------------------------------------------------------------

  generateSPCChart(jobId: string, dimensionName: string): SPCChart | null {
    const spcKey = `${jobId}:${dimensionName}`;
    const dataPoints = this.spcData.get(spcKey);
    const dimension = this.dimensions.get(dimensionName);

    if (!dataPoints || dataPoints.length < 5 || !dimension) return null;

    const values = dataPoints.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const subgroups: number[][] = [];
    for (let i = 0; i < dataPoints.length; i += 5) {
      const subgroup = dataPoints.slice(i, i + 5).map((p) => p.value);
      if (subgroup.length >= 2) {
        subgroups.push(subgroup);
      }
    }

    const ranges = subgroups.map((sg) => Math.max(...sg) - Math.min(...sg));
    const avgRange = ranges.length > 0 ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;

    const d2 = 2.326;
    const A2 = 0.577;
    const sigma = avgRange / d2;

    const ucl = mean + 3 * sigma;
    const lcl = mean - 3 * sigma;

    const outOfControlPoints: number[] = [];
    const rulesViolated: string[] = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] > ucl || values[i] < lcl) {
        outOfControlPoints.push(i);
        if (!rulesViolated.includes(SPC_RULES.RULE_1)) {
          rulesViolated.push(SPC_RULES.RULE_1);
        }
      }
    }

    let consecutiveSameSide = 0;
    let lastSide = 0;
    for (const val of values) {
      const side = val > mean ? 1 : -1;
      if (side === lastSide) {
        consecutiveSameSide++;
        if (consecutiveSameSide >= 8 && !rulesViolated.includes(SPC_RULES.RULE_4)) {
          rulesViolated.push(SPC_RULES.RULE_4);
        }
      } else {
        consecutiveSameSide = 1;
        lastSide = side;
      }
    }

    const usl = dimension.nominal + dimension.tolerance_plus;
    const lsl = dimension.nominal - dimension.tolerance_minus;
    const cpk = Math.min(
      (usl - mean) / (3 * sigma),
      (mean - lsl) / (3 * sigma)
    );

    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    const ppk = Math.min(
      (usl - mean) / (3 * stdDev),
      (mean - lsl) / (3 * stdDev)
    );

    return {
      dimension_name: dimensionName,
      chart_type: "xbar",
      ucl: Math.round(ucl * 10000) / 10000,
      lcl: Math.round(lcl * 10000) / 10000,
      center_line: Math.round(mean * 10000) / 10000,
      data_points: dataPoints,
      out_of_control_points: outOfControlPoints,
      rules_violated: rulesViolated,
      cpk: Math.round(cpk * 100) / 100,
      ppk: Math.round(ppk * 100) / 100,
    };
  }

  // --------------------------------------------------------------------------
  // Quality Metrics
  // --------------------------------------------------------------------------

  calculateJobMetrics(jobId: string): QualityMetrics {
    const inspections = this.getInspectionsByJob(jobId);

    const totalInspected = inspections.length;
    const passed = inspections.filter((i) => i.result === "pass").length;
    const failed = inspections.filter((i) => i.result === "fail").length;

    const firstPassYield = totalInspected > 0 ? (passed / totalInspected) * 100 : 100;
    const defectRate = totalInspected > 0 ? (failed / totalInspected) * 1000000 : 0;

    const allDimensions = new Set<string>();
    const cpkValues: number[] = [];

    for (const inspection of inspections) {
      for (const measurement of inspection.measurements) {
        allDimensions.add(measurement.dimension_name);
      }
    }

    for (const dimName of allDimensions) {
      const chart = this.generateSPCChart(jobId, dimName);
      if (chart && !isNaN(chart.cpk) && isFinite(chart.cpk)) {
        cpkValues.push(chart.cpk);
      }
    }

    const avgCpk = cpkValues.length > 0
      ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length
      : 0;

    const qualityScore = this.calculateQualityScore(firstPassYield, avgCpk, defectRate);

    return {
      job_id: jobId,
      total_inspected: totalInspected,
      total_passed: passed,
      total_failed: failed,
      first_pass_yield: Math.round(firstPassYield * 10) / 10,
      defect_rate_ppm: Math.round(defectRate),
      dimensions_tracked: allDimensions.size,
      cpk_average: Math.round(avgCpk * 100) / 100,
      quality_score: qualityScore,
    };
  }

  private calculateQualityScore(fpy: number, cpk: number, defectPpm: number): number {
    const fpyScore = Math.min(fpy, 100);
    const cpkScore = Math.min(cpk * 50, 100);
    const defectScore = Math.max(100 - defectPpm / 1000, 0);

    const weightedScore = fpyScore * 0.4 + cpkScore * 0.4 + defectScore * 0.2;
    return Math.round(weightedScore * 10) / 10;
  }

  // --------------------------------------------------------------------------
  // Non-Conformance Management
  // --------------------------------------------------------------------------

  createNonConformance(params: {
    job_id: string;
    part_serial: string;
    dimension_name: string;
    measured_value: number;
    deviation: number;
  }): NonConformance {
    const ncId = `NC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const nc: NonConformance = {
      nc_id: ncId,
      job_id: params.job_id,
      part_serial: params.part_serial,
      dimension_name: params.dimension_name,
      measured_value: params.measured_value,
      deviation: params.deviation,
      disposition: "pending",
      created_at: new Date().toISOString(),
    };

    this.nonConformances.set(ncId, nc);
    return nc;
  }

  resolveNonConformance(
    ncId: string,
    disposition: NonConformance["disposition"],
    rootCause?: string,
    correctiveAction?: string
  ): NonConformance | null {
    const nc = this.nonConformances.get(ncId);
    if (!nc) return null;

    nc.disposition = disposition;
    nc.root_cause = rootCause;
    nc.corrective_action = correctiveAction;
    nc.resolved_at = new Date().toISOString();

    this.nonConformances.set(ncId, nc);
    return nc;
  }

  getNonConformancesByJob(jobId: string): NonConformance[] {
    return Array.from(this.nonConformances.values()).filter((nc) => nc.job_id === jobId);
  }

  getPendingNonConformances(): NonConformance[] {
    return Array.from(this.nonConformances.values()).filter((nc) => nc.disposition === "pending");
  }

  // --------------------------------------------------------------------------
  // Trend Analysis
  // --------------------------------------------------------------------------

  analyzeTrend(jobId: string, dimensionName: string): TrendAnalysis | null {
    const spcKey = `${jobId}:${dimensionName}`;
    const dataPoints = this.spcData.get(spcKey);

    if (!dataPoints || dataPoints.length < 10) return null;

    const halfPoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, halfPoint).map((p) => p.value);
    const secondHalf = dataPoints.slice(halfPoint).map((p) => p.value);

    const meanFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const meanSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const rangeFirst = Math.max(...firstHalf) - Math.min(...firstHalf);
    const rangeSecond = Math.max(...secondHalf) - Math.min(...secondHalf);

    const meanShift = meanSecond - meanFirst;
    const rangeChange = rangeSecond - rangeFirst;

    let trend: TrendAnalysis["trend"];
    let prediction: string;

    if (Math.abs(meanShift) < 0.001 && Math.abs(rangeChange) < 0.002) {
      trend = "stable";
      prediction = "Process expected to remain in control";
    } else if (rangeChange < 0 || (meanShift < 0.001 && meanShift > -0.001)) {
      trend = "improving";
      prediction = "Variation decreasing, process capability improving";
    } else {
      trend = "degrading";
      prediction = "Tool wear or process drift detected, intervention recommended";
    }

    const dimension = this.dimensions.get(dimensionName);
    const tolerance = dimension ? dimension.tolerance_plus + dimension.tolerance_minus : 0.05;
    const confidence = 1 - Math.min(Math.abs(meanShift) / tolerance, 0.5);

    return {
      dimension_name: dimensionName,
      trend,
      mean_shift: Math.round(meanShift * 10000) / 10000,
      range_change: Math.round(rangeChange * 10000) / 10000,
      prediction,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  defineDimension(dimension: Dimension): void {
    this.dimensions.set(dimension.name, dimension);
  }

  getDimension(name: string): Dimension | null {
    return this.dimensions.get(name) || null;
  }

  getAllDimensions(): Dimension[] {
    return Array.from(this.dimensions.values());
  }

  clearAll(): void {
    this.inspections.clear();
    this.spcData.clear();
    this.nonConformances.clear();
  }
}

export const latheProductionQualityTrackingEngine = new LatheProductionQualityTrackingEngine();
