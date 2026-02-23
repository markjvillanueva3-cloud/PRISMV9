/**
 * MetrologyDataEngine — CMM data analysis, measurement SPC, drift detection & correlation
 * Phase R30-MS4: Metrology & Calibration Intelligence
 *
 * Actions:
 *   met_cmm       — CMM measurement data analysis with feature extraction
 *   met_spc       — measurement SPC (statistical process control on measurement data)
 *   met_drift     — instrument drift detection and trending
 *   met_correlate — cross-gage correlation analysis
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CMMDataSet {
  id: string;
  part_number: string;
  feature: string;
  nominal: number;
  usl: number;
  lsl: number;
  measurements: { lot_id: string; value: number; date: string }[];
  program: string;
  machine_id: string;
}

interface DriftRecord {
  gage_id: string;
  gage_name: string;
  check_dates: string[];
  reference_value: number;
  readings: number[];
  tolerance: number;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const CMM_DATA: CMMDataSet[] = [
  {
    id: 'CMM-D001', part_number: 'PMP-BODY-100', feature: 'Bore Diameter', nominal: 50.000, usl: 50.005, lsl: 49.995,
    measurements: [
      { lot_id: 'L01', value: 50.002, date: '2025-03-01' }, { lot_id: 'L02', value: 50.001, date: '2025-03-02' },
      { lot_id: 'L03', value: 50.003, date: '2025-03-03' }, { lot_id: 'L04', value: 49.999, date: '2025-03-04' },
      { lot_id: 'L05', value: 50.000, date: '2025-03-05' }, { lot_id: 'L06', value: 50.002, date: '2025-03-06' },
      { lot_id: 'L07', value: 49.998, date: '2025-03-07' }, { lot_id: 'L08', value: 50.001, date: '2025-03-08' },
      { lot_id: 'L09', value: 50.004, date: '2025-03-09' }, { lot_id: 'L10', value: 50.001, date: '2025-03-10' },
      { lot_id: 'L11', value: 50.002, date: '2025-03-11' }, { lot_id: 'L12', value: 50.000, date: '2025-03-12' },
      { lot_id: 'L13', value: 50.003, date: '2025-03-13' }, { lot_id: 'L14', value: 49.997, date: '2025-03-14' },
      { lot_id: 'L15', value: 50.001, date: '2025-03-15' }, { lot_id: 'L16', value: 50.002, date: '2025-03-16' },
      { lot_id: 'L17', value: 50.000, date: '2025-03-17' }, { lot_id: 'L18', value: 50.003, date: '2025-03-18' },
      { lot_id: 'L19', value: 49.999, date: '2025-03-19' }, { lot_id: 'L20', value: 50.001, date: '2025-03-20' },
    ],
    program: 'BORE-CHK-V3', machine_id: 'CMM-001',
  },
  {
    id: 'CMM-D002', part_number: 'PMP-BODY-100', feature: 'Face Flatness', nominal: 0.000, usl: 0.010, lsl: 0.000,
    measurements: [
      { lot_id: 'L01', value: 0.004, date: '2025-03-01' }, { lot_id: 'L02', value: 0.005, date: '2025-03-02' },
      { lot_id: 'L03', value: 0.003, date: '2025-03-03' }, { lot_id: 'L04', value: 0.006, date: '2025-03-04' },
      { lot_id: 'L05', value: 0.005, date: '2025-03-05' }, { lot_id: 'L06', value: 0.007, date: '2025-03-06' },
      { lot_id: 'L07', value: 0.004, date: '2025-03-07' }, { lot_id: 'L08', value: 0.006, date: '2025-03-08' },
      { lot_id: 'L09', value: 0.008, date: '2025-03-09' }, { lot_id: 'L10', value: 0.005, date: '2025-03-10' },
    ],
    program: 'FLAT-CHK-V2', machine_id: 'CMM-001',
  },
];

const DRIFT_RECORDS: DriftRecord[] = [
  {
    gage_id: 'MIC-001', gage_name: 'Digital Micrometer 0-25mm', reference_value: 10.000, tolerance: 0.003,
    check_dates: ['2025-01-15', '2025-02-15', '2025-03-15', '2025-04-15', '2025-05-15', '2025-06-15'],
    readings: [10.0000, 10.0005, 10.0008, 10.0010, 10.0012, 10.0015],
  },
  {
    gage_id: 'DI-001', gage_name: 'Dial Indicator 0-10mm', reference_value: 5.000, tolerance: 0.005,
    check_dates: ['2025-01-10', '2025-02-10', '2025-03-10'],
    readings: [5.0020, 5.0060, 5.0120],
  },
  {
    gage_id: 'PG-001', gage_name: 'Pressure Gauge 0-300 PSI', reference_value: 150.0, tolerance: 1.5,
    check_dates: ['2024-09-01', '2024-12-01', '2025-03-01'],
    readings: [150.2, 150.8, 151.2],
  },
];

// ── Action Implementations ─────────────────────────────────────────────────

function metCMM(params: Record<string, unknown>): unknown {
  const dataId = params.data_id as string | undefined;
  const partNumber = params.part_number as string | undefined;
  const feature = params.feature as string | undefined;

  let datasets = CMM_DATA;
  if (dataId) datasets = datasets.filter(d => d.id === dataId);
  if (partNumber) datasets = datasets.filter(d => d.part_number === partNumber);
  if (feature) datasets = datasets.filter(d => d.feature.toLowerCase().includes((feature as string).toLowerCase()));

  const results = datasets.map(ds => {
    const values = ds.measurements.map(m => m.value);
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const outOfSpec = values.filter(v => v > ds.usl || v < ds.lsl).length;

    return {
      id: ds.id,
      part_number: ds.part_number,
      feature: ds.feature,
      program: ds.program,
      machine: ds.machine_id,
      spec: { nominal: ds.nominal, usl: ds.usl, lsl: ds.lsl },
      statistics: {
        n,
        mean: Math.round(mean * 10000) / 10000,
        std_dev: Math.round(stdDev * 100000) / 100000,
        min: Math.round(min * 10000) / 10000,
        max: Math.round(max * 10000) / 10000,
        range: Math.round(range * 100000) / 100000,
      },
      out_of_spec: outOfSpec,
      out_of_spec_pct: Math.round(outOfSpec / n * 1000) / 10,
      measurements: ds.measurements,
    };
  });

  return { total_datasets: results.length, datasets: results };
}

function metSPC(params: Record<string, unknown>): unknown {
  const dataId = params.data_id as string || 'CMM-D001';
  const ds = CMM_DATA.find(d => d.id === dataId);
  if (!ds) return { error: `Dataset ${dataId} not found` };

  const values = ds.measurements.map(m => m.value);
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

  // Moving range for I-MR chart
  const movingRanges: number[] = [];
  for (let i = 1; i < n; i++) movingRanges.push(Math.abs(values[i] - values[i - 1]));
  const avgMR = movingRanges.reduce((s, v) => s + v, 0) / movingRanges.length;

  const ucl = mean + 2.66 * avgMR;
  const lcl = mean - 2.66 * avgMR;
  const outOfControl = values.filter(v => v > ucl || v < lcl);

  // Capability
  const cp = (ds.usl - ds.lsl) / (6 * stdDev);
  const cpkUpper = (ds.usl - mean) / (3 * stdDev);
  const cpkLower = (mean - ds.lsl) / (3 * stdDev);
  const cpk = Math.min(cpkUpper, cpkLower);

  // Nelson rule 2: 9 points same side of center
  let maxRun = 0, run = 0, lastSide = 0;
  for (const v of values) {
    const side = v > mean ? 1 : -1;
    if (side === lastSide) run++;
    else { run = 1; lastSide = side; }
    maxRun = Math.max(maxRun, run);
  }

  return {
    feature: ds.feature,
    chart_type: 'I-MR',
    control_limits: { ucl: Math.round(ucl * 10000) / 10000, center: Math.round(mean * 10000) / 10000, lcl: Math.round(lcl * 10000) / 10000 },
    statistics: { mean: Math.round(mean * 10000) / 10000, std_dev: Math.round(stdDev * 100000) / 100000, avg_moving_range: Math.round(avgMR * 100000) / 100000 },
    capability: { cp: Math.round(cp * 100) / 100, cpk: Math.round(cpk * 100) / 100, cpk_upper: Math.round(cpkUpper * 100) / 100, cpk_lower: Math.round(cpkLower * 100) / 100 },
    control_status: { in_control: outOfControl.length === 0 && maxRun < 9, out_of_control_points: outOfControl.length, max_run: maxRun, nelson_violation: maxRun >= 9 },
    data_points: values,
  };
}

function metDrift(params: Record<string, unknown>): unknown {
  const gageId = params.gage_id as string | undefined;

  let records = DRIFT_RECORDS;
  if (gageId) records = records.filter(r => r.gage_id === gageId);

  const driftAnalysis = records.map(r => {
    const n = r.readings.length;
    const deviations = r.readings.map(v => v - r.reference_value);
    const latestDev = deviations[n - 1];
    const driftRate = n >= 2 ? (deviations[n - 1] - deviations[0]) / (n - 1) : 0;
    const daysPerInterval = 30; // approximate
    const predictedExceedance = Math.abs(driftRate) > 0 ? Math.ceil((r.tolerance - Math.abs(latestDev)) / Math.abs(driftRate)) * daysPerInterval : Infinity;
    const atRisk = predictedExceedance < 180;

    return {
      gage_id: r.gage_id,
      gage_name: r.gage_name,
      reference: r.reference_value,
      tolerance: r.tolerance,
      readings: r.check_dates.map((d, i) => ({ date: d, value: r.readings[i], deviation: Math.round(deviations[i] * 10000) / 10000 })),
      drift_analysis: {
        drift_rate_per_interval: Math.round(driftRate * 100000) / 100000,
        current_deviation: Math.round(latestDev * 10000) / 10000,
        deviation_pct_tolerance: Math.round(Math.abs(latestDev) / r.tolerance * 1000) / 10,
        predicted_days_to_exceedance: predictedExceedance === Infinity ? 'stable' : predictedExceedance,
        at_risk: atRisk,
        trend: driftRate > 0 ? 'increasing' : driftRate < 0 ? 'decreasing' : 'stable',
      },
    };
  });

  return {
    total_gages: driftAnalysis.length,
    drift_data: driftAnalysis,
    summary: {
      at_risk: driftAnalysis.filter(d => d.drift_analysis.at_risk).length,
      stable: driftAnalysis.filter(d => !d.drift_analysis.at_risk).length,
      worst_drift: driftAnalysis.reduce((worst, d) => {
        const devPct = typeof d.drift_analysis.deviation_pct_tolerance === 'number' ? d.drift_analysis.deviation_pct_tolerance : 0;
        const worstPct = typeof worst.drift_analysis.deviation_pct_tolerance === 'number' ? worst.drift_analysis.deviation_pct_tolerance : 0;
        return devPct > worstPct ? d : worst;
      }, driftAnalysis[0]),
    },
  };
}

function metCorrelate(params: Record<string, unknown>): unknown {
  // Cross-gage correlation: compare measurements from different instruments on same parts
  const correlations = [
    { gage_a: 'CMM-001', gage_b: 'MIC-001', feature: 'Bore Diameter', n_samples: 20, r_value: 0.992, bias: 0.0003, max_diff: 0.002, acceptable: true },
    { gage_a: 'CMM-001', gage_b: 'DI-001', feature: 'Face Flatness', n_samples: 10, r_value: 0.945, bias: -0.001, max_diff: 0.003, acceptable: true },
    { gage_a: 'MIC-001', gage_b: 'MIC-002', feature: 'OD Measurement', n_samples: 15, r_value: 0.998, bias: 0.0001, max_diff: 0.001, acceptable: true },
    { gage_a: 'TW-001', gage_b: 'TW-002', feature: 'Torque Verification', n_samples: 10, r_value: 0.978, bias: 0.3, max_diff: 0.8, acceptable: true },
    { gage_a: 'PG-001', gage_b: 'PG-002', feature: 'Pressure Reading', n_samples: 8, r_value: 0.890, bias: 1.5, max_diff: 3.2, acceptable: false },
  ];

  const feature = params.feature as string | undefined;
  let filtered = correlations;
  if (feature) filtered = filtered.filter(c => c.feature.toLowerCase().includes((feature as string).toLowerCase()));

  return {
    total_correlations: filtered.length,
    correlations: filtered.map(c => ({
      ...c,
      correlation_grade: c.r_value >= 0.99 ? 'Excellent' : c.r_value >= 0.95 ? 'Good' : c.r_value >= 0.90 ? 'Marginal' : 'Poor',
    })),
    summary: {
      acceptable: filtered.filter(c => c.acceptable).length,
      needs_attention: filtered.filter(c => !c.acceptable).length,
      avg_correlation: Math.round(filtered.reduce((sum, c) => sum + c.r_value, 0) / Math.max(filtered.length, 1) * 1000) / 1000,
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeMetrologyDataAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'met_cmm':       return metCMM(params);
    case 'met_spc':       return metSPC(params);
    case 'met_drift':     return metDrift(params);
    case 'met_correlate': return metCorrelate(params);
    default:
      return { error: `Unknown MetrologyData action: ${action}` };
  }
}
