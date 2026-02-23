/**
 * BestPracticesEngine.ts — R13-MS2: Best Practices + Troubleshooting Extraction
 *
 * Extracted from monolith modules:
 *   - PRISM_LEAN_SIX_SIGMA_KAIZEN.js (SPC, Lean metrics, FMEA, OEE)
 *   - PRISM_PHASE2_QUALITY_SYSTEM.js (control charts, CUSUM)
 *   - PRISM_QUALITY_MANAGER.js (inspection/NCR/CAR workflow)
 *   - PRISM_INSPECTION_ENGINE.js (CMM program generation)
 *   - PRISM_ERROR_LOOKUP.js (error code database)
 *
 * New MCP actions: get_best_practices, spc_analysis, troubleshoot, lean_analysis
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SPCInput {
  measurements: number[];
  USL: number;
  LSL: number;
  target?: number;
  subgroupSize?: number;
}

export interface ControlChartResult {
  chartType: string;
  centerline: number;
  UCL: number;
  LCL: number;
  values: number[];
  inControl: boolean;
  outOfControl: Array<{ index: number; type: string; value?: number }>;
  estimatedSigma?: number;
}

export interface ProcessCapabilityResult {
  Cp: number;
  Cpk: number;
  Cpu: number;
  Cpl: number;
  ppm: number;
  sigmaLevel: number;
  interpretation: string;
  confidence95?: { lower: number; upper: number };
}

export interface OEEInput {
  plannedProductionTime: number;
  downtime: number;
  idealCycleTime: number;
  totalParts: number;
  goodParts: number;
}

export interface OEEResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  interpretation: string;
  losses: { availabilityLoss: number; performanceLoss: number; qualityLoss: number };
  benchmark: { worldClass: number; typical: number; gap: number };
}

export interface FMEAInput {
  failureModes: Array<{
    name: string;
    severity: number;
    occurrence: number;
    detection: number;
    description?: string;
  }>;
  simulations?: number;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Control chart factors for subgroup sizes 2-10 */
const CHART_FACTORS: Record<number, { A2: number; D3: number; D4: number; d2: number }> = {
  2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};

/** Seven wastes of Lean manufacturing */
const SEVEN_WASTES = {
  TRANSPORT: { name: 'Transportation', description: 'Unnecessary movement of materials' },
  INVENTORY: { name: 'Inventory', description: 'Excess raw materials, WIP, or finished goods' },
  MOTION: { name: 'Motion', description: 'Unnecessary movement of people' },
  WAITING: { name: 'Waiting', description: 'Idle time waiting for next step' },
  OVERPRODUCTION: { name: 'Overproduction', description: 'Making more than needed' },
  OVERPROCESSING: { name: 'Over-processing', description: 'Doing more work than required' },
  DEFECTS: { name: 'Defects', description: 'Rework, scrap, corrections' },
} as const;

/** PRISM error code database */
const ERROR_CODES: Record<number, { message: string; action: string }> = {
  1000: { message: 'Invalid input provided', action: 'Check input format and try again' },
  1001: { message: 'Required field missing', action: 'Provide all required parameters' },
  1002: { message: 'Value out of acceptable range', action: 'Adjust value to be within limits' },
  2000: { message: 'Division by zero attempted', action: 'Check denominator values' },
  2004: { message: 'Iteration did not converge', action: 'Adjust tolerance or initial guess' },
  3000: { message: 'Item not found in database', action: 'Verify ID or search criteria' },
  4000: { message: 'RPM exceeds machine maximum', action: 'Reduce spindle speed' },
  4001: { message: 'Feed rate exceeds machine maximum', action: 'Reduce feed rate' },
  4002: { message: 'Power requirement exceeds machine capacity', action: 'Reduce cutting parameters' },
  4003: { message: 'Torque exceeds spindle capacity', action: 'Reduce DOC or feed' },
  4004: { message: 'Chatter predicted at these parameters', action: 'Adjust RPM or reduce DOC' },
  4005: { message: 'Tool deflection exceeds tolerance', action: 'Reduce stickout or use larger tool' },
  4006: { message: 'Cutting temperature exceeds safe limit', action: 'Reduce speed or improve cooling' },
  5000: { message: 'Prediction confidence too low', action: 'Provide more data or use conservative values' },
  5004: { message: 'Optimization did not find solution', action: 'Relax constraints or adjust parameters' },
  9000: { message: 'Internal system error', action: 'Contact support' },
  9001: { message: 'Operation timed out', action: 'Retry with simpler request' },
};

/** Best practices knowledge base */
const BEST_PRACTICES: Array<{
  id: string; category: string; topic: string;
  recommendation: string; source: string; severity: 'must' | 'should' | 'may';
}> = [
  { id: 'BP_SPC_001', category: 'quality', topic: 'SPC', recommendation: 'Minimum 25 subgroups (125+ measurements) before establishing control limits.', source: 'AIAG SPC Manual', severity: 'must' },
  { id: 'BP_SPC_002', category: 'quality', topic: 'SPC', recommendation: 'Cpk >= 1.33 for existing processes, >= 1.67 for new/safety-critical processes.', source: 'ISO 22514', severity: 'must' },
  { id: 'BP_SPC_003', category: 'quality', topic: 'SPC', recommendation: 'Use X-bar R chart for subgroups n=2-10, X-bar S chart for n>10.', source: 'AIAG SPC Manual', severity: 'should' },
  { id: 'BP_OEE_001', category: 'lean', topic: 'OEE', recommendation: 'World-class OEE target is 85% (Availability 90% x Performance 95% x Quality 99.9%).', source: 'Nakajima TPM', severity: 'should' },
  { id: 'BP_OEE_002', category: 'lean', topic: 'OEE', recommendation: 'Track the Six Big Losses: breakdowns, setup, minor stops, reduced speed, startup rejects, production rejects.', source: 'Nakajima TPM', severity: 'should' },
  { id: 'BP_LEAN_001', category: 'lean', topic: 'Setup', recommendation: 'Target single-minute exchange of die (SMED) — setup < 10 minutes.', source: 'Shingo SMED', severity: 'should' },
  { id: 'BP_LEAN_002', category: 'lean', topic: 'Flow', recommendation: 'Value-added ratio should exceed 25%. World class > 50%.', source: 'Lean Enterprise Institute', severity: 'should' },
  { id: 'BP_FMEA_001', category: 'quality', topic: 'FMEA', recommendation: 'Address all failure modes with RPN > 100 or Severity >= 9 regardless of RPN.', source: 'AIAG FMEA Manual', severity: 'must' },
  { id: 'BP_FMEA_002', category: 'quality', topic: 'FMEA', recommendation: 'Use AP (Action Priority) method instead of RPN for FMEA 5th edition.', source: 'AIAG-VDA FMEA', severity: 'may' },
  { id: 'BP_INSP_001', category: 'quality', topic: 'Inspection', recommendation: 'First article inspection (FAI) required for all new parts and after process changes.', source: 'AS9102', severity: 'must' },
  { id: 'BP_INSP_002', category: 'quality', topic: 'Inspection', recommendation: 'Gauge R&R must show < 10% of tolerance for critical dimensions.', source: 'AIAG MSA Manual', severity: 'must' },
  { id: 'BP_MACH_001', category: 'machining', topic: 'Tool Life', recommendation: 'Monitor tool wear at 70% of expected life — replace proactively, not reactively.', source: 'ISO 3685', severity: 'should' },
  { id: 'BP_MACH_002', category: 'machining', topic: 'Coolant', recommendation: 'Maintain coolant concentration 6-8% for water-soluble. Check pH weekly (target 8.5-9.5).', source: 'OSHA/Industry Standard', severity: 'should' },
  { id: 'BP_MACH_003', category: 'machining', topic: 'Workholding', recommendation: 'Minimum 3x part height clamping engagement. For thin walls, use soft jaws profiled to part.', source: 'Practical Machining', severity: 'should' },
  { id: 'BP_MACH_004', category: 'machining', topic: 'Chip Control', recommendation: 'Chip thickness should be 0.03-0.10mm for good chip breaking in steel.', source: 'Sandvik/Kennametal', severity: 'should' },
];

// ─── HELPER: Normal CDF ─────────────────────────────────────────────────────

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * absZ);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
  return 0.5 * (1 + sign * y);
}

function triangularSample(min: number, mode: number, max: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  return u < fc
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

// ─── BEST PRACTICES ENGINE CLASS ────────────────────────────────────────────

export class BestPracticesEngine {

  // ── SPC ANALYSIS ────────────────────────────────────────────────────

  calculateCp(USL: number, LSL: number, sigma: number): number {
    if (sigma <= 0) return 0;
    return (USL - LSL) / (6 * sigma);
  }

  calculateCpk(USL: number, LSL: number, mean: number, sigma: number): ProcessCapabilityResult {
    if (sigma <= 0) return { Cp: 0, Cpk: 0, Cpu: 0, Cpl: 0, ppm: 1000000, sigmaLevel: 0, interpretation: 'Invalid sigma' };

    const Cp = (USL - LSL) / (6 * sigma);
    const Cpu = (USL - mean) / (3 * sigma);
    const Cpl = (mean - LSL) / (3 * sigma);
    const Cpk = Math.min(Cpu, Cpl);

    const z = Cpk * 3;
    const ppm = Math.round(2 * 1000000 * (1 - normalCDF(z)));
    const sigmaLevel = Math.round(Cpk * 3 * 10) / 10;

    let interpretation: string;
    if (Cpk >= 2.0) interpretation = 'World Class (6-sigma)';
    else if (Cpk >= 1.67) interpretation = 'Excellent (5-sigma)';
    else if (Cpk >= 1.33) interpretation = 'Good (4-sigma)';
    else if (Cpk >= 1.0) interpretation = 'Capable (3-sigma)';
    else if (Cpk >= 0.67) interpretation = 'Marginal';
    else interpretation = 'Not Capable — Action Required';

    return { Cp, Cpk, Cpu, Cpl, ppm, sigmaLevel, interpretation };
  }

  /** Cpk with bootstrap 95% confidence intervals */
  calculateCpkWithUncertainty(measurements: number[], USL: number, LSL: number): ProcessCapabilityResult & { confidence95: { lower: number; upper: number }; sampleSize: number } {
    const n = measurements.length;
    if (n < 10) return { ...this.calculateCpk(USL, LSL, 0, 1), confidence95: { lower: 0, upper: 0 }, sampleSize: n };

    const mean = measurements.reduce((a, b) => a + b, 0) / n;
    const sigma = Math.sqrt(measurements.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1));
    const base = this.calculateCpk(USL, LSL, mean, sigma);

    // Bootstrap 1000 samples
    const bootstrapCpks: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const sample: number[] = [];
      for (let j = 0; j < n; j++) sample.push(measurements[Math.floor(Math.random() * n)]);
      const sMean = sample.reduce((a, b) => a + b, 0) / n;
      const sSigma = Math.sqrt(sample.reduce((sum, x) => sum + (x - sMean) ** 2, 0) / (n - 1));
      if (sSigma > 0) bootstrapCpks.push(Math.min((USL - sMean) / (3 * sSigma), (sMean - LSL) / (3 * sSigma)));
    }
    bootstrapCpks.sort((a, b) => a - b);

    return {
      ...base,
      confidence95: {
        lower: bootstrapCpks[Math.floor(bootstrapCpks.length * 0.025)] || 0,
        upper: bootstrapCpks[Math.floor(bootstrapCpks.length * 0.975)] || 0,
      },
      sampleSize: n,
    };
  }

  /** X-bar and R control chart */
  xBarRChart(subgroups: number[][]): { xBar: ControlChartResult; range: ControlChartResult } {
    const n = subgroups[0].length;
    const k = subgroups.length;
    const f = CHART_FACTORS[n] || CHART_FACTORS[5];

    const xBars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
    const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
    const xBarBar = xBars.reduce((a, b) => a + b, 0) / k;
    const rBar = ranges.reduce((a, b) => a + b, 0) / k;

    const xBarUCL = xBarBar + f.A2 * rBar;
    const xBarLCL = xBarBar - f.A2 * rBar;
    const rUCL = f.D4 * rBar;
    const rLCL = f.D3 * rBar;

    const outX = xBars.filter((v, i) => v > xBarUCL || v < xBarLCL).length;
    const outR = ranges.filter(v => v > rUCL || v < rLCL).length;

    return {
      xBar: { chartType: 'X-bar', centerline: xBarBar, UCL: xBarUCL, LCL: xBarLCL, values: xBars, inControl: outX === 0, outOfControl: xBars.map((v, i) => v > xBarUCL || v < xBarLCL ? { index: i, type: 'X-bar', value: v } : null).filter(Boolean) as any, estimatedSigma: rBar / f.d2 },
      range: { chartType: 'R', centerline: rBar, UCL: rUCL, LCL: rLCL, values: ranges, inControl: outR === 0, outOfControl: ranges.map((v, i) => v > rUCL || v < rLCL ? { index: i, type: 'Range', value: v } : null).filter(Boolean) as any },
    };
  }

  /** Individual and Moving Range chart */
  iMRChart(individuals: number[]): { individuals: ControlChartResult; movingRange: ControlChartResult } {
    const n = individuals.length;
    const movingRanges: number[] = [];
    for (let i = 1; i < n; i++) movingRanges.push(Math.abs(individuals[i] - individuals[i - 1]));

    const xBar = individuals.reduce((a, b) => a + b, 0) / n;
    const mRBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;
    const d2 = 1.128;
    const D4 = 3.267;
    const estimatedSigma = mRBar / d2;

    const iUCL = xBar + 3 * estimatedSigma;
    const iLCL = xBar - 3 * estimatedSigma;
    const mrUCL = D4 * mRBar;

    return {
      individuals: { chartType: 'I', centerline: xBar, UCL: iUCL, LCL: iLCL, values: individuals, inControl: individuals.every(v => v >= iLCL && v <= iUCL), outOfControl: individuals.map((v, i) => v > iUCL || v < iLCL ? { index: i, type: 'Individual', value: v } : null).filter(Boolean) as any, estimatedSigma },
      movingRange: { chartType: 'MR', centerline: mRBar, UCL: mrUCL, LCL: 0, values: movingRanges, inControl: movingRanges.every(v => v <= mrUCL), outOfControl: movingRanges.map((v, i) => v > mrUCL ? { index: i, type: 'MR', value: v } : null).filter(Boolean) as any },
    };
  }

  /** CUSUM chart for detecting small persistent shifts */
  cusumChart(data: number[], target: number, k = 0.5, h = 5): { cusumHigh: number[]; cusumLow: number[]; outOfControl: Array<{ index: number; type: string; value: number }>; inControl: boolean } {
    const sigma = Math.sqrt(data.reduce((sum, x) => sum + (x - target) ** 2, 0) / (data.length - 1));
    const cusumHigh: number[] = [];
    const cusumLow: number[] = [];
    const outOfControl: Array<{ index: number; type: string; value: number }> = [];
    let cH = 0, cL = 0;

    for (let i = 0; i < data.length; i++) {
      const z = sigma > 0 ? (data[i] - target) / sigma : 0;
      cH = Math.max(0, cH + z - k);
      cL = Math.min(0, cL + z + k);
      cusumHigh.push(cH);
      cusumLow.push(cL);
      if (cH > h) outOfControl.push({ index: i, type: 'high', value: cH });
      if (cL < -h) outOfControl.push({ index: i, type: 'low', value: cL });
    }

    return { cusumHigh, cusumLow, outOfControl, inControl: outOfControl.length === 0 };
  }

  // ── LEAN METRICS ────────────────────────────────────────────────────

  /** Overall Equipment Effectiveness */
  calculateOEE(input: OEEInput): OEEResult {
    const operatingTime = input.plannedProductionTime - input.downtime;
    const availability = operatingTime / input.plannedProductionTime;
    const performance = (input.idealCycleTime * input.totalParts) / operatingTime;
    const quality = input.goodParts / input.totalParts;
    const oee = availability * performance * quality;

    let interpretation: string;
    if (oee >= 0.85) interpretation = 'World Class';
    else if (oee >= 0.75) interpretation = 'Good';
    else if (oee >= 0.65) interpretation = 'Average';
    else if (oee >= 0.55) interpretation = 'Below Average';
    else interpretation = 'Poor — Major improvement needed';

    return {
      availability: Math.round(availability * 1000) / 10,
      performance: Math.round(performance * 1000) / 10,
      quality: Math.round(quality * 1000) / 10,
      oee: Math.round(oee * 1000) / 10,
      interpretation,
      losses: {
        availabilityLoss: Math.round((1 - availability) * input.plannedProductionTime),
        performanceLoss: Math.round((1 - performance) * operatingTime),
        qualityLoss: Math.round((input.totalParts - input.goodParts) * input.idealCycleTime),
      },
      benchmark: { worldClass: 85, typical: 60, gap: Math.round((0.85 - oee) * 1000) / 10 },
    };
  }

  /** Detect seven wastes from shop floor data */
  analyzeWaste(shopData: Record<string, number>): { wastesIdentified: number; wastes: Array<{ type: string; severity: number; indicator: string; recommendation: string }>; leanScore: number } {
    const wastes: Array<{ type: string; severity: number; indicator: string; recommendation: string }> = [];

    if (shopData.avgMaterialTravelDistance > 50) wastes.push({ type: 'TRANSPORT', severity: Math.min(10, shopData.avgMaterialTravelDistance / 10), indicator: `Avg material travel: ${shopData.avgMaterialTravelDistance}m`, recommendation: 'Consider cellular manufacturing layout' });
    if (shopData.wipDays > 5) wastes.push({ type: 'INVENTORY', severity: Math.min(10, shopData.wipDays), indicator: `WIP covers ${shopData.wipDays} days`, recommendation: 'Implement pull system / kanban' });
    if (shopData.machineUtilization < 70) wastes.push({ type: 'WAITING', severity: Math.round((100 - shopData.machineUtilization) / 10), indicator: `Machine utilization: ${shopData.machineUtilization}%`, recommendation: 'Analyze bottlenecks, balance workload' });
    if (shopData.scrapRate > 2) wastes.push({ type: 'DEFECTS', severity: Math.min(10, shopData.scrapRate * 2), indicator: `Scrap rate: ${shopData.scrapRate}%`, recommendation: 'Root cause analysis, implement poka-yoke' });
    if (shopData.finishedGoodsDays > 10) wastes.push({ type: 'OVERPRODUCTION', severity: Math.min(10, shopData.finishedGoodsDays / 3), indicator: `${shopData.finishedGoodsDays} days FG inventory`, recommendation: 'Produce to customer demand, not forecast' });
    if (shopData.avgSetupTime > 60) wastes.push({ type: 'MOTION', severity: Math.min(10, shopData.avgSetupTime / 15), indicator: `Avg setup: ${shopData.avgSetupTime} min`, recommendation: 'Implement SMED methodology' });
    if (shopData.avgToleranceRatio < 0.5) wastes.push({ type: 'OVERPROCESSING', severity: Math.round((1 - shopData.avgToleranceRatio) * 10), indicator: `Tolerances tighter than needed by ${Math.round((1 - shopData.avgToleranceRatio) * 100)}%`, recommendation: 'Review customer requirements' });

    wastes.sort((a, b) => b.severity - a.severity);
    return { wastesIdentified: wastes.length, wastes, leanScore: Math.max(0, 100 - wastes.reduce((sum, w) => sum + w.severity * 2, 0)) };
  }

  /** Value Stream Mapping metrics */
  calculateVSM(steps: Array<{ name: string; cycleTime: number; waitTime?: number; transportTime?: number; setupTime?: number }>): { steps: any[]; totalLeadTime: number; totalValueAdded: number; valueAddedRatio: number; processEfficiency: number; bottleneck: string | null } {
    const mapped = steps.map((s, i) => {
      const va = s.cycleTime || 0;
      const nva = (s.waitTime || 0) + (s.transportTime || 0);
      return { ...s, index: i, valueAdded: va, nonValueAdded: nva, leadTime: va + nva };
    });
    const totalLead = mapped.reduce((sum, s) => sum + s.leadTime, 0);
    const totalVA = mapped.reduce((sum, s) => sum + s.valueAdded, 0);
    const ratio = totalLead > 0 ? totalVA / totalLead : 0;
    const maxCycle = Math.max(...mapped.map(s => s.valueAdded));
    const bottleneck = mapped.find(s => s.valueAdded === maxCycle);

    return { steps: mapped, totalLeadTime: totalLead, totalValueAdded: totalVA, valueAddedRatio: Math.round(ratio * 1000) / 1000, processEfficiency: Math.round(ratio * 100), bottleneck: bottleneck?.name || null };
  }

  // ── FMEA ────────────────────────────────────────────────────────────

  /** Standard RPN calculation */
  calculateRPN(severity: number, occurrence: number, detection: number): number {
    return severity * occurrence * detection;
  }

  /** Monte Carlo probabilistic FMEA with uncertainty modeling */
  monteCarloFMEA(input: FMEAInput): { failureModes: any[]; simulations: number; topRisks: any[]; totalP95Risk: number } {
    const sims = input.simulations || 10000;
    const results = input.failureModes.map(fm => {
      const rpnSamples: number[] = [];
      for (let i = 0; i < sims; i++) {
        const s = triangularSample(Math.max(1, fm.severity - 1), fm.severity, Math.min(10, fm.severity + 1));
        const o = triangularSample(Math.max(1, fm.occurrence - 1), fm.occurrence, Math.min(10, fm.occurrence + 1));
        const d = triangularSample(Math.max(1, fm.detection - 1), fm.detection, Math.min(10, fm.detection + 1));
        rpnSamples.push(s * o * d);
      }
      rpnSamples.sort((a, b) => a - b);

      const nominalRPN = fm.severity * fm.occurrence * fm.detection;
      const p95 = rpnSamples[Math.floor(sims * 0.95)];
      let riskCategory: string;
      if (p95 >= 200) riskCategory = 'CRITICAL — Immediate action required';
      else if (p95 >= 100) riskCategory = 'HIGH — Action required';
      else if (p95 >= 50) riskCategory = 'MEDIUM — Monitor closely';
      else riskCategory = 'LOW — Acceptable risk';

      return {
        ...fm,
        nominalRPN,
        meanRPN: Math.round(rpnSamples.reduce((a, b) => a + b, 0) / sims),
        p95RPN: Math.round(p95),
        worstCaseRPN: Math.round(rpnSamples[sims - 1]),
        riskCategory,
      };
    });

    results.sort((a, b) => b.p95RPN - a.p95RPN);
    return { failureModes: results, simulations: sims, topRisks: results.slice(0, 5), totalP95Risk: results.reduce((sum, fm) => sum + fm.p95RPN, 0) };
  }

  /** Sigma level from defect data */
  calculateSigmaLevel(defects: number, opportunities: number, units: number): { dpmo: number; yield: number; sigmaLevel: number; interpretation: string } {
    const dpo = defects / (opportunities * units);
    const dpmo = Math.round(dpo * 1000000);
    const p = dpmo / 1000000;

    // Inverse normal approximation (Newton-Raphson)
    let z = 3;
    if (p > 0 && p < 1) {
      for (let i = 0; i < 10; i++) {
        const cdf = normalCDF(z);
        const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
        if (pdf > 0) z = z - (cdf - (1 - p)) / pdf;
      }
    } else if (p <= 0) { z = 6; }
    else { z = 0; }

    const sigmaLevel = Math.round((z + 1.5) * 100) / 100;
    let interpretation: string;
    if (sigmaLevel >= 6) interpretation = 'World Class (3.4 DPMO)';
    else if (sigmaLevel >= 5) interpretation = 'Excellent (233 DPMO)';
    else if (sigmaLevel >= 4) interpretation = 'Good (6,210 DPMO)';
    else if (sigmaLevel >= 3) interpretation = 'Average (66,807 DPMO)';
    else if (sigmaLevel >= 2) interpretation = 'Below Average (308,538 DPMO)';
    else interpretation = 'Poor (>691,462 DPMO)';

    return { dpmo, yield: Math.round((1 - dpo) * 10000) / 100, sigmaLevel, interpretation };
  }

  // ── TROUBLESHOOTING ─────────────────────────────────────────────────

  /** Look up a PRISM error code */
  lookupErrorCode(code: number): { code: number; message: string; action: string; severity: string; recoverable: boolean } {
    const info = ERROR_CODES[code];
    if (!info) return { code, message: 'Unknown error', action: 'Contact support', severity: 'ERROR', recoverable: false };

    let severity = 'ERROR';
    if (code >= 5000 && code < 6000) severity = 'WARNING';
    if (code >= 1000 && code < 2000) severity = 'WARNING';
    if (code >= 9000) severity = 'CRITICAL';

    const recoverable = (code >= 1000 && code < 2000) || (code >= 5000 && code < 6000);
    return { code, ...info, severity, recoverable };
  }

  /** Search error codes by keyword */
  searchErrorCodes(keyword: string): Array<{ code: number; message: string; action: string }> {
    const kw = keyword.toLowerCase();
    return Object.entries(ERROR_CODES)
      .filter(([, v]) => v.message.toLowerCase().includes(kw) || v.action.toLowerCase().includes(kw))
      .map(([k, v]) => ({ code: Number(k), ...v }));
  }

  // ── BEST PRACTICES LOOKUP ───────────────────────────────────────────

  getBestPractices(category?: string, topic?: string): typeof BEST_PRACTICES {
    let results = [...BEST_PRACTICES];
    if (category) results = results.filter(bp => bp.category === category);
    if (topic) results = results.filter(bp => bp.topic.toLowerCase().includes(topic.toLowerCase()));
    return results;
  }

  searchBestPractices(keyword: string): typeof BEST_PRACTICES {
    const kw = keyword.toLowerCase();
    return BEST_PRACTICES.filter(bp =>
      bp.recommendation.toLowerCase().includes(kw) || bp.topic.toLowerCase().includes(kw) || bp.category.toLowerCase().includes(kw)
    );
  }

  // ── STATIC ACCESSORS ──────────────────────────────────────────────

  getSevenWastes(): typeof SEVEN_WASTES { return { ...SEVEN_WASTES }; }
  getChartFactors(): typeof CHART_FACTORS { return { ...CHART_FACTORS }; }
  getBestPracticeCount(): number { return BEST_PRACTICES.length; }
  getErrorCodeCount(): number { return Object.keys(ERROR_CODES).length; }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const bestPracticesEngine = new BestPracticesEngine();

// ── ACTION DISPATCHER (for MCP wiring) ─────────────────────────────────────

export function executeBestPracticesAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case 'get_best_practices': {
      const results = params.keyword
        ? bestPracticesEngine.searchBestPractices(params.keyword)
        : bestPracticesEngine.getBestPractices(params.category, params.topic);
      return { results, total: results.length, category: params.category || 'all', topic: params.topic || 'all' };
    }

    case 'spc_analysis': {
      const measurements = params.measurements as number[];
      if (!measurements?.length) return { error: 'measurements array required' };
      const USL = params.USL ?? params.usl;
      const LSL = params.LSL ?? params.lsl;
      if (USL == null || LSL == null) return { error: 'USL and LSL required' };

      const capability = measurements.length >= 10
        ? bestPracticesEngine.calculateCpkWithUncertainty(measurements, USL, LSL)
        : bestPracticesEngine.calculateCpk(USL, LSL, measurements.reduce((a, b) => a + b, 0) / measurements.length, Math.sqrt(measurements.reduce((sum, x, _, arr) => sum + (x - arr.reduce((a, b) => a + b, 0) / arr.length) ** 2, 0) / (measurements.length - 1)));

      // Control chart (I-MR for individual measurements)
      const chart = bestPracticesEngine.iMRChart(measurements);

      // CUSUM if target provided
      const target = params.target ?? (USL + LSL) / 2;
      const cusum = bestPracticesEngine.cusumChart(measurements, target);

      return {
        capability,
        chart: { individuals: { centerline: chart.individuals.centerline, UCL: chart.individuals.UCL, LCL: chart.individuals.LCL, inControl: chart.individuals.inControl, outOfControl: chart.individuals.outOfControl.length }, movingRange: { centerline: chart.movingRange.centerline, UCL: chart.movingRange.UCL, inControl: chart.movingRange.inControl, outOfControl: chart.movingRange.outOfControl.length } },
        cusum: { inControl: cusum.inControl, outOfControl: cusum.outOfControl.length },
        sampleSize: measurements.length,
        specs: { USL, LSL, target },
      };
    }

    case 'lean_analysis': {
      const result: Record<string, any> = {};

      if (params.oee) {
        result.oee = bestPracticesEngine.calculateOEE(params.oee);
      }
      if (params.shopData) {
        result.wasteAnalysis = bestPracticesEngine.analyzeWaste(params.shopData);
      }
      if (params.processSteps) {
        result.vsm = bestPracticesEngine.calculateVSM(params.processSteps);
      }
      if (params.failureModes) {
        result.fmea = bestPracticesEngine.monteCarloFMEA({ failureModes: params.failureModes, simulations: params.simulations });
      }
      if (params.defects != null && params.opportunities != null && params.units != null) {
        result.sigmaLevel = bestPracticesEngine.calculateSigmaLevel(params.defects, params.opportunities, params.units);
      }

      return { ...result, analysis_types: Object.keys(result) };
    }

    case 'troubleshoot': {
      if (params.error_code != null) {
        return bestPracticesEngine.lookupErrorCode(params.error_code);
      }
      if (params.keyword) {
        const results = bestPracticesEngine.searchErrorCodes(params.keyword);
        return { results, total: results.length, keyword: params.keyword };
      }
      return { error: 'Provide error_code (number) or keyword (string)' };
    }

    default:
      throw new Error(`Unknown best_practices action: ${action}`);
  }
}
