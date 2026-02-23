/**
 * GageRREngine — Gage R&R studies, measurement system analysis, uncertainty & linearity
 * Phase R30-MS2: Metrology & Calibration Intelligence
 *
 * Actions:
 *   grr_study      — gage repeatability & reproducibility study results
 *   grr_msa        — measurement system analysis (bias, stability, linearity)
 *   grr_uncertainty — measurement uncertainty budgets (GUM method)
 *   grr_linearity  — gage linearity and bias studies across measurement range
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface GRRStudy {
  id: string;
  gage_id: string;
  gage_name: string;
  characteristic: string;
  tolerance: number;
  operators: string[];
  parts: number;
  trials: number;
  measurements: number[][]; // [operator][part*trial]
  date: string;
}

interface MSAResult {
  id: string;
  gage_id: string;
  bias: number;
  bias_pct_tolerance: number;
  stability_range: number;
  linearity_slope: number;
  linearity_r_squared: number;
  resolution_pct: number;
  discrimination_ratio: number;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const GRR_STUDIES: GRRStudy[] = [
  {
    id: 'GRR-001', gage_id: 'MIC-001', gage_name: 'Digital Micrometer 0-25mm', characteristic: 'Bore Diameter', tolerance: 0.010,
    operators: ['Op-A', 'Op-B', 'Op-C'], parts: 10, trials: 3,
    measurements: [
      [50.002, 50.001, 50.003, 49.998, 49.999, 49.997, 50.001, 50.002, 50.000, 50.003, 50.001, 50.002, 50.002, 49.998, 49.998, 49.998, 50.002, 50.001, 50.001, 50.002, 50.001, 50.003, 49.999, 49.997, 50.001, 50.001, 50.000, 50.003, 50.002, 50.001],
      [50.003, 50.002, 50.002, 49.997, 49.998, 49.998, 50.002, 50.003, 50.001, 50.002, 50.002, 50.001, 50.003, 49.997, 49.999, 49.997, 50.001, 50.002, 50.000, 50.003, 50.002, 50.002, 49.998, 49.998, 50.002, 50.000, 50.001, 50.002, 50.003, 50.002],
      [50.001, 50.000, 50.002, 49.999, 50.000, 49.998, 50.000, 50.001, 49.999, 50.002, 50.000, 50.001, 50.001, 49.999, 49.999, 49.999, 50.001, 50.000, 49.999, 50.001, 50.000, 50.002, 50.000, 49.998, 50.000, 49.999, 50.000, 50.002, 50.001, 50.000],
    ],
    date: '2025-02-15',
  },
  {
    id: 'GRR-002', gage_id: 'TW-001', gage_name: 'Digital Torque Wrench', characteristic: 'Fastener Torque', tolerance: 5.0,
    operators: ['Op-A', 'Op-B'], parts: 5, trials: 3,
    measurements: [
      [22.5, 22.3, 22.4, 23.1, 23.0, 23.2, 21.8, 21.9, 21.7, 22.8, 22.7, 22.9, 22.0, 22.1, 21.9],
      [22.8, 22.6, 22.7, 23.4, 23.2, 23.3, 22.1, 22.0, 22.2, 23.0, 22.9, 23.1, 22.3, 22.4, 22.2],
    ],
    date: '2025-01-20',
  },
];

const MSA_RESULTS: MSAResult[] = [
  { id: 'MSA-001', gage_id: 'MIC-001', bias: 0.0005, bias_pct_tolerance: 5.0, stability_range: 0.001, linearity_slope: 0.00002, linearity_r_squared: 0.98, resolution_pct: 10, discrimination_ratio: 12.5 },
  { id: 'MSA-002', gage_id: 'TW-001', bias: 0.15, bias_pct_tolerance: 3.0, stability_range: 0.3, linearity_slope: 0.005, linearity_r_squared: 0.95, resolution_pct: 2, discrimination_ratio: 8.2 },
  { id: 'MSA-003', gage_id: 'CMM-001', bias: 0.0002, bias_pct_tolerance: 2.0, stability_range: 0.0005, linearity_slope: 0.00001, linearity_r_squared: 0.99, resolution_pct: 5, discrimination_ratio: 18.0 },
  { id: 'MSA-004', gage_id: 'PG-001', bias: 0.8, bias_pct_tolerance: 5.3, stability_range: 1.2, linearity_slope: 0.01, linearity_r_squared: 0.92, resolution_pct: 5, discrimination_ratio: 6.5 },
];

// ── Action Implementations ─────────────────────────────────────────────────

function grrStudy(params: Record<string, unknown>): unknown {
  const studyId = params.study_id as string | undefined;
  const gageId = params.gage_id as string | undefined;

  let studies = GRR_STUDIES;
  if (studyId) studies = studies.filter(s => s.id === studyId);
  if (gageId) studies = studies.filter(s => s.gage_id === gageId);

  const results = studies.map(study => {
    const k = study.operators.length;
    const n = study.parts;
    const r = study.trials;
    // Compute ANOVA-style GRR
    const allMeasurements = study.measurements.flat();
    const grandMean = allMeasurements.reduce((s, v) => s + v, 0) / allMeasurements.length;

    // Repeatability (Equipment Variation)
    const withinOp: number[] = [];
    study.measurements.forEach(opData => {
      for (let p = 0; p < n; p++) {
        const partTrials = [];
        for (let t = 0; t < r; t++) partTrials.push(opData[p * r + t]);
        const mean = partTrials.reduce((s, v) => s + v, 0) / r;
        partTrials.forEach(v => withinOp.push((v - mean) ** 2));
      }
    });
    const ev = Math.sqrt(withinOp.reduce((s, v) => s + v, 0) / (k * n * (r - 1)));

    // Reproducibility (Appraiser Variation)
    const opMeans = study.measurements.map(opData => opData.reduce((s, v) => s + v, 0) / opData.length);
    const av = Math.sqrt(Math.max(0, opMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0) / (k - 1) - ev ** 2 / (n * r)));

    const grr = Math.sqrt(ev ** 2 + av ** 2);
    const grrPctTolerance = (grr * 5.15 / study.tolerance) * 100; // 5.15σ = 99%
    const ndc = Math.floor(1.41 * (study.tolerance / 2) / grr); // number of distinct categories

    const rating = grrPctTolerance < 10 ? 'ACCEPTABLE' : grrPctTolerance < 30 ? 'MARGINAL' : 'UNACCEPTABLE';

    return {
      id: study.id,
      gage: study.gage_name,
      characteristic: study.characteristic,
      tolerance: study.tolerance,
      operators: k,
      parts: n,
      trials: r,
      equipment_variation: Math.round(ev * 100000) / 100000,
      appraiser_variation: Math.round(av * 100000) / 100000,
      grr: Math.round(grr * 100000) / 100000,
      grr_pct_tolerance: Math.round(grrPctTolerance * 10) / 10,
      ndc: ndc,
      rating,
      date: study.date,
    };
  });

  return {
    total_studies: results.length,
    studies: results,
    summary: {
      acceptable: results.filter(r => r.rating === 'ACCEPTABLE').length,
      marginal: results.filter(r => r.rating === 'MARGINAL').length,
      unacceptable: results.filter(r => r.rating === 'UNACCEPTABLE').length,
      avg_grr_pct: Math.round(results.reduce((sum, r) => sum + r.grr_pct_tolerance, 0) / Math.max(results.length, 1) * 10) / 10,
    },
  };
}

function grrMSA(params: Record<string, unknown>): unknown {
  const gageId = params.gage_id as string | undefined;

  let results = MSA_RESULTS;
  if (gageId) results = results.filter(r => r.gage_id === gageId);

  return {
    total_analyses: results.length,
    analyses: results.map(r => ({
      id: r.id,
      gage_id: r.gage_id,
      bias: r.bias,
      bias_pct_tolerance: r.bias_pct_tolerance,
      bias_acceptable: r.bias_pct_tolerance <= 10,
      stability_range: r.stability_range,
      linearity: { slope: r.linearity_slope, r_squared: r.linearity_r_squared, acceptable: r.linearity_r_squared >= 0.95 },
      resolution_pct: r.resolution_pct,
      resolution_adequate: r.resolution_pct <= 10,
      discrimination_ratio: r.discrimination_ratio,
      discrimination_adequate: r.discrimination_ratio >= 5,
      overall_capable: r.bias_pct_tolerance <= 10 && r.linearity_r_squared >= 0.95 && r.discrimination_ratio >= 5,
    })),
    summary: {
      capable_gages: results.filter(r => r.bias_pct_tolerance <= 10 && r.linearity_r_squared >= 0.95 && r.discrimination_ratio >= 5).length,
      total_gages: results.length,
      avg_bias_pct: Math.round(results.reduce((sum, r) => sum + r.bias_pct_tolerance, 0) / Math.max(results.length, 1) * 10) / 10,
    },
  };
}

function grrUncertainty(params: Record<string, unknown>): unknown {
  const gageId = params.gage_id as string || 'MIC-001';
  const msa = MSA_RESULTS.find(r => r.gage_id === gageId);
  if (!msa) return { error: `No MSA data for gage ${gageId}` };

  // GUM uncertainty budget
  const repeatability = msa.stability_range / 2;
  const resolution = 0.001 / (2 * Math.sqrt(3)); // rectangular distribution
  const calibration = msa.bias;
  const temperature = 0.0001 * 11.7 * 0.5; // thermal expansion uncertainty
  const operator = msa.stability_range * 0.3;

  const components = [
    { source: 'Repeatability', value: repeatability, distribution: 'normal', divisor: 1, sensitivity: 1 },
    { source: 'Resolution', value: resolution, distribution: 'rectangular', divisor: Math.sqrt(3), sensitivity: 1 },
    { source: 'Calibration', value: calibration, distribution: 'normal', divisor: 2, sensitivity: 1 },
    { source: 'Temperature', value: temperature, distribution: 'rectangular', divisor: Math.sqrt(3), sensitivity: 1 },
    { source: 'Operator', value: operator, distribution: 'normal', divisor: 1, sensitivity: 1 },
  ];

  const standardUncertainties = components.map(c => ({
    ...c,
    standard_uncertainty: c.value / c.divisor * c.sensitivity,
  }));

  const combinedUncertainty = Math.sqrt(standardUncertainties.reduce((sum, u) => sum + u.standard_uncertainty ** 2, 0));
  const expandedUncertainty = combinedUncertainty * 2; // k=2, 95% confidence

  return {
    gage_id: gageId,
    uncertainty_budget: standardUncertainties.map(u => ({
      source: u.source,
      value: Math.round(u.value * 100000) / 100000,
      distribution: u.distribution,
      standard_uncertainty: Math.round(u.standard_uncertainty * 100000) / 100000,
      contribution_pct: Math.round((u.standard_uncertainty ** 2 / combinedUncertainty ** 2) * 1000) / 10,
    })),
    combined_uncertainty: Math.round(combinedUncertainty * 100000) / 100000,
    expanded_uncertainty_k2: Math.round(expandedUncertainty * 100000) / 100000,
    coverage_factor: 2,
    confidence_level: '95%',
    dominant_source: standardUncertainties.reduce((max, u) => u.standard_uncertainty > max.standard_uncertainty ? u : max, standardUncertainties[0]).source,
  };
}

function grrLinearity(params: Record<string, unknown>): unknown {
  const gageId = params.gage_id as string || 'MIC-001';
  const msa = MSA_RESULTS.find(r => r.gage_id === gageId);
  if (!msa) return { error: `No MSA data for gage ${gageId}` };

  // Simulated linearity data across measurement range
  const rangePoints = [
    { reference: 5.000, bias: -0.0003, readings: [4.9997, 4.9998, 4.9996] },
    { reference: 10.000, bias: 0.0002, readings: [10.0002, 10.0001, 10.0003] },
    { reference: 15.000, bias: 0.0005, readings: [15.0005, 15.0004, 15.0006] },
    { reference: 20.000, bias: 0.0008, readings: [20.0008, 20.0007, 20.0009] },
    { reference: 25.000, bias: 0.0012, readings: [25.0012, 25.0011, 25.0013] },
  ];

  const biases = rangePoints.map(p => p.bias);
  const refs = rangePoints.map(p => p.reference);
  const n = biases.length;
  const sumX = refs.reduce((s, v) => s + v, 0);
  const sumY = biases.reduce((s, v) => s + v, 0);
  const sumXY = refs.reduce((s, v, i) => s + v * biases[i], 0);
  const sumX2 = refs.reduce((s, v) => s + v ** 2, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;

  return {
    gage_id: gageId,
    linearity_data: rangePoints.map(p => ({
      reference: p.reference,
      avg_bias: p.bias,
      readings: p.readings,
      repeatability: Math.round((Math.max(...p.readings) - Math.min(...p.readings)) * 100000) / 100000,
    })),
    regression: {
      slope: Math.round(slope * 1000000) / 1000000,
      intercept: Math.round(intercept * 100000) / 100000,
      r_squared: msa.linearity_r_squared,
    },
    linearity_acceptable: Math.abs(slope) < 0.001 && msa.linearity_r_squared >= 0.95,
    max_bias: Math.max(...biases.map(Math.abs)),
    bias_trend: slope > 0 ? 'increasing_with_size' : 'decreasing_with_size',
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeGageRRAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'grr_study':      return grrStudy(params);
    case 'grr_msa':        return grrMSA(params);
    case 'grr_uncertainty': return grrUncertainty(params);
    case 'grr_linearity':  return grrLinearity(params);
    default:
      return { error: `Unknown GageRR action: ${action}` };
  }
}
