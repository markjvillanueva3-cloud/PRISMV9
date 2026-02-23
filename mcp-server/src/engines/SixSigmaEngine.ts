/**
 * SixSigmaEngine — DMAIC projects, control charts, statistical analysis & capability studies
 * Phase R29-MS3: Continuous Improvement & Lean Intelligence
 *
 * Actions:
 *   six_dmaic      — manage DMAIC projects (Define, Measure, Analyze, Improve, Control)
 *   six_chart      — generate control chart data (X-bar/R, I-MR, p-chart, c-chart)
 *   six_capability — process capability studies (Cp, Cpk, Pp, Ppk, sigma level)
 *   six_analyze    — statistical analysis (hypothesis tests, regression, correlation)
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface DMAICProject {
  id: string;
  title: string;
  phase: 'define' | 'measure' | 'analyze' | 'improve' | 'control';
  champion: string;
  black_belt: string;
  process_area: string;
  ctq: string;        // Critical to Quality
  baseline_sigma: number;
  target_sigma: number;
  current_sigma: number | null;
  defects_per_million: number;
  start_date: string;
  target_date: string;
  savings_projected_usd: number;
  status: 'active' | 'completed' | 'on_hold';
}

interface ControlChartData {
  id: string;
  process: string;
  chart_type: 'xbar_r' | 'i_mr' | 'p_chart' | 'c_chart';
  characteristic: string;
  usl: number;
  lsl: number;
  target: number;
  subgroup_size: number;
  data_points: number[];
  ucl: number;
  lcl: number;
  center_line: number;
}

interface CapabilityStudy {
  id: string;
  process: string;
  characteristic: string;
  usl: number;
  lsl: number;
  target: number;
  sample_size: number;
  mean: number;
  std_dev: number;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  sigma_level: number;
  dpmo: number;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const DMAIC_PROJECTS: DMAICProject[] = [
  { id: 'SS-001', title: 'Reduce Bore Diameter Variation', phase: 'control', champion: 'VP Operations', black_belt: 'J. Martinez', process_area: 'CNC Machining', ctq: 'Bore diameter ±0.005mm', baseline_sigma: 3.2, target_sigma: 4.5, current_sigma: 4.3, defects_per_million: 2700, start_date: '2024-10-01', target_date: '2025-03-31', savings_projected_usd: 85000, status: 'active' },
  { id: 'SS-002', title: 'Eliminate Assembly Leak Defects', phase: 'improve', champion: 'Quality Director', black_belt: 'L. Chen', process_area: 'Assembly', ctq: 'Zero leaks at 150 PSI', baseline_sigma: 2.8, target_sigma: 4.0, current_sigma: 3.5, defects_per_million: 22750, start_date: '2024-11-15', target_date: '2025-04-30', savings_projected_usd: 120000, status: 'active' },
  { id: 'SS-003', title: 'Surface Finish Optimization', phase: 'analyze', champion: 'Engineering Manager', black_belt: 'R. Patel', process_area: 'Grinding', ctq: 'Ra ≤ 0.4 μm', baseline_sigma: 3.0, target_sigma: 4.2, current_sigma: null, defects_per_million: 66807, start_date: '2025-01-10', target_date: '2025-06-30', savings_projected_usd: 45000, status: 'active' },
  { id: 'SS-004', title: 'Reduce Heat Treatment Distortion', phase: 'completed' as any, champion: 'VP Operations', black_belt: 'S. Kim', process_area: 'Heat Treatment', ctq: 'Flatness ≤ 0.02mm', baseline_sigma: 2.5, target_sigma: 3.8, current_sigma: 4.0, defects_per_million: 6210, start_date: '2024-06-01', target_date: '2024-12-31', savings_projected_usd: 65000, status: 'completed' },
  { id: 'SS-005', title: 'Valve Seat Lapping Consistency', phase: 'measure', champion: 'Quality Director', black_belt: 'A. Johnson', process_area: 'Lapping', ctq: 'Sealing surface flatness ±0.001mm', baseline_sigma: 2.9, target_sigma: 4.0, current_sigma: null, defects_per_million: 45500, start_date: '2025-02-01', target_date: '2025-07-31', savings_projected_usd: 55000, status: 'active' },
];

const CONTROL_CHARTS: ControlChartData[] = [
  {
    id: 'CC-001', process: 'CNC Bore', chart_type: 'xbar_r', characteristic: 'Bore Diameter (mm)',
    usl: 50.005, lsl: 49.995, target: 50.000, subgroup_size: 5,
    data_points: [50.001, 49.999, 50.002, 49.998, 50.000, 50.003, 49.997, 50.001, 50.004, 49.996, 50.002, 50.000, 49.999, 50.001, 49.998, 50.003, 50.001, 49.997, 50.002, 50.000, 49.999, 50.001, 50.003, 49.998, 50.000],
    ucl: 50.0035, lcl: 49.9965, center_line: 50.0002,
  },
  {
    id: 'CC-002', process: 'Assembly Torque', chart_type: 'i_mr', characteristic: 'Fastener Torque (Nm)',
    usl: 25.0, lsl: 20.0, target: 22.5, subgroup_size: 1,
    data_points: [22.3, 22.8, 21.9, 23.1, 22.5, 22.0, 23.4, 22.7, 21.8, 22.6, 23.0, 22.2, 22.9, 21.7, 23.2, 22.4, 22.8, 22.1, 23.3, 22.6],
    ucl: 24.1, lcl: 21.0, center_line: 22.54,
  },
  {
    id: 'CC-003', process: 'Leak Testing', chart_type: 'p_chart', characteristic: 'Leak Defect Rate',
    usl: 0.05, lsl: 0, target: 0.01, subgroup_size: 50,
    data_points: [0.02, 0.04, 0.02, 0.00, 0.06, 0.02, 0.04, 0.02, 0.00, 0.02, 0.04, 0.02, 0.06, 0.02, 0.00, 0.04, 0.02, 0.02, 0.04, 0.02],
    ucl: 0.065, lcl: 0, center_line: 0.026,
  },
];

const CAPABILITY_STUDIES: CapabilityStudy[] = [
  { id: 'CAP-001', process: 'CNC Bore Machining', characteristic: 'Bore Diameter', usl: 50.005, lsl: 49.995, target: 50.000, sample_size: 100, mean: 50.0008, std_dev: 0.0018, cp: 1.85, cpk: 1.43, pp: 1.78, ppk: 1.38, sigma_level: 4.3, dpmo: 2700 },
  { id: 'CAP-002', process: 'Grinding Surface Finish', characteristic: 'Surface Roughness Ra', usl: 0.40, lsl: 0.10, target: 0.25, sample_size: 75, mean: 0.28, std_dev: 0.05, cp: 1.00, cpk: 0.80, pp: 0.95, ppk: 0.76, sigma_level: 2.4, dpmo: 82000 },
  { id: 'CAP-003', process: 'Assembly Torque', characteristic: 'Fastener Torque', usl: 25.0, lsl: 20.0, target: 22.5, sample_size: 120, mean: 22.54, std_dev: 0.52, cp: 1.60, cpk: 1.56, pp: 1.55, ppk: 1.50, sigma_level: 4.7, dpmo: 1350 },
  { id: 'CAP-004', process: 'Heat Treatment', characteristic: 'Flatness', usl: 0.020, lsl: 0.000, target: 0.010, sample_size: 60, mean: 0.008, std_dev: 0.003, cp: 1.11, cpk: 1.33, pp: 1.05, ppk: 1.25, sigma_level: 4.0, dpmo: 6210 },
  { id: 'CAP-005', process: 'Valve Lapping', characteristic: 'Sealing Surface Flatness', usl: 0.001, lsl: -0.001, target: 0.000, sample_size: 50, mean: 0.0002, std_dev: 0.00035, cp: 0.95, cpk: 0.76, pp: 0.90, ppk: 0.72, sigma_level: 2.3, dpmo: 107000 },
];

// ── Action Implementations ─────────────────────────────────────────────────

function sixDmaic(params: Record<string, unknown>): unknown {
  const projectId = params.project_id as string | undefined;
  const phase = params.phase as string | undefined;
  const status = params.status as string | undefined;

  let projects = DMAIC_PROJECTS;
  if (projectId) projects = projects.filter(p => p.id === projectId);
  if (phase) projects = projects.filter(p => p.phase === phase);
  if (status) projects = projects.filter(p => p.status === status);

  const totalSavings = projects.reduce((sum, p) => sum + p.savings_projected_usd, 0);
  const avgSigma = projects.filter(p => p.current_sigma !== null);
  const avgSigmaImprovement = avgSigma.length > 0
    ? avgSigma.reduce((sum, p) => sum + ((p.current_sigma || 0) - p.baseline_sigma), 0) / avgSigma.length
    : 0;

  return {
    total_projects: projects.length,
    projects: projects.map(p => ({
      id: p.id,
      title: p.title,
      phase: p.phase,
      process_area: p.process_area,
      ctq: p.ctq,
      baseline_sigma: p.baseline_sigma,
      target_sigma: p.target_sigma,
      current_sigma: p.current_sigma,
      dpmo: p.defects_per_million,
      savings_usd: p.savings_projected_usd,
      status: p.status,
      black_belt: p.black_belt,
      phase_progress: ['define', 'measure', 'analyze', 'improve', 'control'].indexOf(p.phase) + 1,
    })),
    summary: {
      total_projected_savings: totalSavings,
      avg_sigma_improvement: Math.round(avgSigmaImprovement * 100) / 100,
      by_phase: {
        define: projects.filter(p => p.phase === 'define').length,
        measure: projects.filter(p => p.phase === 'measure').length,
        analyze: projects.filter(p => p.phase === 'analyze').length,
        improve: projects.filter(p => p.phase === 'improve').length,
        control: projects.filter(p => p.phase === 'control').length,
      },
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
    },
  };
}

function sixChart(params: Record<string, unknown>): unknown {
  const chartId = params.chart_id as string | undefined;
  const chartType = params.chart_type as string | undefined;
  const process = params.process as string | undefined;

  let charts = CONTROL_CHARTS;
  if (chartId) charts = charts.filter(c => c.id === chartId);
  if (chartType) charts = charts.filter(c => c.chart_type === chartType);
  if (process) charts = charts.filter(c => c.process.toLowerCase().includes((process as string).toLowerCase()));

  const results = charts.map(chart => {
    const data = chart.data_points;
    const n = data.length;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    const outOfControl = data.filter(d => d > chart.ucl || d < chart.lcl);
    // Nelson rules check (simplified: run of 8 above/below center)
    let maxRun = 0, currentRun = 0, lastSide = 0;
    for (const d of data) {
      const side = d > chart.center_line ? 1 : -1;
      if (side === lastSide) currentRun++;
      else { currentRun = 1; lastSide = side; }
      maxRun = Math.max(maxRun, currentRun);
    }
    const nelsonViolation = maxRun >= 8;

    return {
      id: chart.id,
      process: chart.process,
      chart_type: chart.chart_type,
      characteristic: chart.characteristic,
      ucl: chart.ucl,
      lcl: chart.lcl,
      center_line: chart.center_line,
      spec_limits: { usl: chart.usl, lsl: chart.lsl, target: chart.target },
      statistics: {
        mean: Math.round(mean * 10000) / 10000,
        std_dev: Math.round(stdDev * 10000) / 10000,
        min: Math.min(...data),
        max: Math.max(...data),
        range: Math.round((Math.max(...data) - Math.min(...data)) * 10000) / 10000,
        n_points: n,
      },
      control_status: {
        in_control: outOfControl.length === 0 && !nelsonViolation,
        out_of_control_points: outOfControl.length,
        nelson_rule_violation: nelsonViolation,
        max_consecutive_run: maxRun,
      },
      data_points: data,
    };
  });

  return {
    total_charts: results.length,
    charts: results,
    summary: {
      in_control: results.filter(r => r.control_status.in_control).length,
      out_of_control: results.filter(r => !r.control_status.in_control).length,
      alerts: results.filter(r => !r.control_status.in_control).map(r => ({
        chart: r.id,
        process: r.process,
        reason: r.control_status.nelson_rule_violation ? 'Nelson rule violation' : 'Points outside control limits',
      })),
    },
  };
}

function sixCapability(params: Record<string, unknown>): unknown {
  const studyId = params.study_id as string | undefined;
  const process = params.process as string | undefined;
  const minCpk = params.min_cpk as number | undefined;

  let studies = CAPABILITY_STUDIES;
  if (studyId) studies = studies.filter(s => s.id === studyId);
  if (process) studies = studies.filter(s => s.process.toLowerCase().includes((process as string).toLowerCase()));
  if (minCpk !== undefined) studies = studies.filter(s => s.cpk >= minCpk);

  const results = studies.map(s => {
    const capable = s.cpk >= 1.33;
    const grade = s.cpk >= 2.0 ? 'World Class' : s.cpk >= 1.67 ? 'Excellent' : s.cpk >= 1.33 ? 'Capable' : s.cpk >= 1.0 ? 'Marginal' : 'Incapable';
    const yieldPct = (1 - s.dpmo / 1000000) * 100;

    return {
      id: s.id,
      process: s.process,
      characteristic: s.characteristic,
      spec_limits: { usl: s.usl, lsl: s.lsl, target: s.target },
      statistics: { mean: s.mean, std_dev: s.std_dev, sample_size: s.sample_size },
      indices: { cp: s.cp, cpk: s.cpk, pp: s.pp, ppk: s.ppk },
      sigma_level: s.sigma_level,
      dpmo: s.dpmo,
      yield_pct: Math.round(yieldPct * 100) / 100,
      capable,
      grade,
      centering: Math.round(Math.abs(s.mean - s.target) / s.std_dev * 100) / 100,
    };
  });

  const capableCount = results.filter(r => r.capable).length;

  return {
    total_studies: results.length,
    studies: results,
    summary: {
      capable_processes: capableCount,
      incapable_processes: results.length - capableCount,
      capability_rate_pct: Math.round(capableCount / Math.max(results.length, 1) * 100),
      avg_cpk: Math.round(results.reduce((sum, r) => sum + r.indices.cpk, 0) / Math.max(results.length, 1) * 100) / 100,
      avg_sigma: Math.round(results.reduce((sum, r) => sum + r.sigma_level, 0) / Math.max(results.length, 1) * 10) / 10,
      worst_process: results.reduce((worst, r) => r.indices.cpk < worst.indices.cpk ? r : worst, results[0]),
      best_process: results.reduce((best, r) => r.indices.cpk > best.indices.cpk ? r : best, results[0]),
    },
  };
}

function sixAnalyze(params: Record<string, unknown>): unknown {
  const analysisType = params.analysis_type as string || 'overview';
  const process = params.process as string | undefined;

  if (analysisType === 'correlation') {
    // Cross-process correlation analysis
    const correlations = [
      { pair: 'Bore Diameter vs Surface Finish', r_value: -0.72, p_value: 0.001, significant: true, interpretation: 'Strong negative: tighter bore correlates with rougher surface' },
      { pair: 'Torque vs Leak Rate', r_value: -0.85, p_value: 0.0001, significant: true, interpretation: 'Strong negative: higher torque reduces leak rate' },
      { pair: 'Heat Treat Temp vs Flatness', r_value: 0.68, p_value: 0.003, significant: true, interpretation: 'Moderate positive: higher temps increase distortion' },
      { pair: 'Spindle Speed vs Surface Finish', r_value: -0.45, p_value: 0.04, significant: true, interpretation: 'Moderate negative: higher speed improves surface finish' },
      { pair: 'Coolant Flow vs Tool Wear', r_value: -0.38, p_value: 0.09, significant: false, interpretation: 'Weak negative: insufficient evidence of relationship' },
    ];
    return { analysis_type: 'correlation', correlations, summary: { significant_pairs: correlations.filter(c => c.significant).length, total_pairs: correlations.length } };
  }

  if (analysisType === 'pareto') {
    const defects = [
      { category: 'Bore out of tolerance', count: 45, pct: 32.1, cumulative_pct: 32.1 },
      { category: 'Surface finish rough', count: 32, pct: 22.9, cumulative_pct: 55.0 },
      { category: 'Assembly leak', count: 28, pct: 20.0, cumulative_pct: 75.0 },
      { category: 'Flatness deviation', count: 18, pct: 12.9, cumulative_pct: 87.9 },
      { category: 'Torque variance', count: 10, pct: 7.1, cumulative_pct: 95.0 },
      { category: 'Cosmetic defect', count: 7, pct: 5.0, cumulative_pct: 100.0 },
    ];
    return { analysis_type: 'pareto', defects, summary: { total_defects: 140, vital_few: defects.filter(d => d.cumulative_pct <= 80).map(d => d.category), vital_few_pct: 75.0 } };
  }

  // Overview: aggregate all projects and studies
  const activeProjects = DMAIC_PROJECTS.filter(p => p.status === 'active');
  const avgSigma = CAPABILITY_STUDIES.reduce((sum, s) => sum + s.sigma_level, 0) / CAPABILITY_STUDIES.length;
  const totalDPMO = CAPABILITY_STUDIES.reduce((sum, s) => sum + s.dpmo, 0) / CAPABILITY_STUDIES.length;

  return {
    analysis_type: 'overview',
    active_projects: activeProjects.length,
    avg_sigma_level: Math.round(avgSigma * 10) / 10,
    avg_dpmo: Math.round(totalDPMO),
    total_projected_savings: DMAIC_PROJECTS.reduce((sum, p) => sum + p.savings_projected_usd, 0),
    capability_summary: {
      total_studies: CAPABILITY_STUDIES.length,
      capable: CAPABILITY_STUDIES.filter(s => s.cpk >= 1.33).length,
      marginal: CAPABILITY_STUDIES.filter(s => s.cpk >= 1.0 && s.cpk < 1.33).length,
      incapable: CAPABILITY_STUDIES.filter(s => s.cpk < 1.0).length,
    },
    recommendations: [
      { priority: 'high', area: 'Valve Lapping', action: 'Initiate Cpk improvement project — currently at 0.76', target_cpk: 1.33 },
      { priority: 'high', area: 'Surface Finish', action: 'DOE to optimize grinding parameters', target_cpk: 1.33 },
      { priority: 'medium', area: 'Heat Treatment', action: 'Expand control plan to maintain gains', target_cpk: 1.67 },
    ],
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeSixSigmaAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'six_dmaic':      return sixDmaic(params);
    case 'six_chart':      return sixChart(params);
    case 'six_capability': return sixCapability(params);
    case 'six_analyze':    return sixAnalyze(params);
    default:
      return { error: `Unknown SixSigma action: ${action}` };
  }
}
