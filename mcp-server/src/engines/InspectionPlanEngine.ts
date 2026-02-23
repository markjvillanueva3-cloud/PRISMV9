/**
 * InspectionPlanEngine — Inspection plans, sampling strategies, FAI & dimensional analysis
 * Phase R30-MS3: Metrology & Calibration Intelligence
 *
 * Actions:
 *   insp_plan      — create/query inspection plans with characteristics and methods
 *   insp_sample    — sampling strategy calculation (AQL, LTPD, skip-lot)
 *   insp_fai       — first article inspection reports and approval status
 *   insp_dimension — dimensional inspection results with balloon/characteristic mapping
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface InspectionPlan {
  id: string;
  part_number: string;
  part_name: string;
  revision: string;
  characteristics: { id: string; name: string; nominal: number; tolerance: string; method: string; frequency: string; gage_id: string; critical: boolean }[];
  created: string;
  approved_by: string;
}

interface FAIReport {
  id: string;
  plan_id: string;
  part_number: string;
  lot_id: string;
  results: { char_id: string; nominal: number; measured: number; tolerance_min: number; tolerance_max: number; pass: boolean }[];
  overall: 'approved' | 'rejected' | 'conditional';
  inspector: string;
  date: string;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const INSPECTION_PLANS: InspectionPlan[] = [
  {
    id: 'IP-001', part_number: 'PMP-BODY-100', part_name: 'Pump Body Casting', revision: 'C',
    characteristics: [
      { id: 'C1', name: 'Bore Diameter', nominal: 50.000, tolerance: '±0.005', method: 'CMM', frequency: '100%', gage_id: 'CMM-001', critical: true },
      { id: 'C2', name: 'Face Flatness', nominal: 0.000, tolerance: '≤0.010', method: 'CMM', frequency: '100%', gage_id: 'CMM-001', critical: true },
      { id: 'C3', name: 'Overall Length', nominal: 125.00, tolerance: '±0.10', method: 'Micrometer', frequency: '1st/last + AQL', gage_id: 'MIC-001', critical: false },
      { id: 'C4', name: 'Surface Finish Ra', nominal: 0.40, tolerance: '≤0.40', method: 'Profilometer', frequency: '1st piece + 1/10', gage_id: 'SG-001', critical: false },
      { id: 'C5', name: 'Thread M10x1.5', nominal: 0, tolerance: 'Go/No-Go', method: 'Thread Gage', frequency: '100%', gage_id: 'TG-001', critical: true },
    ],
    created: '2025-01-05', approved_by: 'Quality Manager',
  },
  {
    id: 'IP-002', part_number: 'VLV-SEAT-200', part_name: 'Valve Seat Insert', revision: 'B',
    characteristics: [
      { id: 'V1', name: 'Seating Angle', nominal: 45.00, tolerance: '±0.25°', method: 'CMM', frequency: '100%', gage_id: 'CMM-001', critical: true },
      { id: 'V2', name: 'Seating Width', nominal: 1.50, tolerance: '±0.10', method: 'Optical', frequency: '100%', gage_id: 'OPT-001', critical: true },
      { id: 'V3', name: 'OD', nominal: 32.000, tolerance: '±0.008', method: 'Micrometer', frequency: 'AQL Level II', gage_id: 'MIC-002', critical: false },
      { id: 'V4', name: 'Flatness', nominal: 0.000, tolerance: '≤0.001', method: 'Optical Flat', frequency: '100%', gage_id: 'OF-001', critical: true },
    ],
    created: '2025-02-10', approved_by: 'Quality Manager',
  },
];

const FAI_REPORTS: FAIReport[] = [
  {
    id: 'FAI-001', plan_id: 'IP-001', part_number: 'PMP-BODY-100', lot_id: 'LOT-2025-0301',
    results: [
      { char_id: 'C1', nominal: 50.000, measured: 50.002, tolerance_min: 49.995, tolerance_max: 50.005, pass: true },
      { char_id: 'C2', nominal: 0.000, measured: 0.006, tolerance_min: 0, tolerance_max: 0.010, pass: true },
      { char_id: 'C3', nominal: 125.00, measured: 125.04, tolerance_min: 124.90, tolerance_max: 125.10, pass: true },
      { char_id: 'C4', nominal: 0.40, measured: 0.35, tolerance_min: 0, tolerance_max: 0.40, pass: true },
      { char_id: 'C5', nominal: 0, measured: 0, tolerance_min: 0, tolerance_max: 0, pass: true },
    ],
    overall: 'approved', inspector: 'R. Patel', date: '2025-03-01',
  },
  {
    id: 'FAI-002', plan_id: 'IP-002', part_number: 'VLV-SEAT-200', lot_id: 'LOT-2025-0315',
    results: [
      { char_id: 'V1', nominal: 45.00, measured: 45.12, tolerance_min: 44.75, tolerance_max: 45.25, pass: true },
      { char_id: 'V2', nominal: 1.50, measured: 1.42, tolerance_min: 1.40, tolerance_max: 1.60, pass: true },
      { char_id: 'V3', nominal: 32.000, measured: 32.005, tolerance_min: 31.992, tolerance_max: 32.008, pass: true },
      { char_id: 'V4', nominal: 0.000, measured: 0.0015, tolerance_min: 0, tolerance_max: 0.001, pass: false },
    ],
    overall: 'conditional', inspector: 'L. Chen', date: '2025-03-15',
  },
];

// ── Action Implementations ─────────────────────────────────────────────────

function inspPlan(params: Record<string, unknown>): unknown {
  const planId = params.plan_id as string | undefined;
  const partNumber = params.part_number as string | undefined;

  let plans = INSPECTION_PLANS;
  if (planId) plans = plans.filter(p => p.id === planId);
  if (partNumber) plans = plans.filter(p => p.part_number === partNumber);

  return {
    total_plans: plans.length,
    plans: plans.map(p => ({
      id: p.id,
      part_number: p.part_number,
      part_name: p.part_name,
      revision: p.revision,
      characteristics: p.characteristics,
      summary: {
        total_characteristics: p.characteristics.length,
        critical: p.characteristics.filter(c => c.critical).length,
        cmm_required: p.characteristics.filter(c => c.method === 'CMM').length,
        full_inspection: p.characteristics.filter(c => c.frequency === '100%').length,
      },
      approved_by: p.approved_by,
    })),
  };
}

function inspSample(params: Record<string, unknown>): unknown {
  const lotSize = (params.lot_size as number) || 150;
  const aqlLevel = (params.aql as number) || 1.0;
  const inspLevel = (params.inspection_level as string) || 'II';

  // AQL sampling table lookup (simplified ANSI/ASQ Z1.4)
  const sampleTable: Record<string, { code: string; sample: number; accept: number; reject: number }> = {
    'II_50': { code: 'D', sample: 8, accept: 0, reject: 1 },
    'II_150': { code: 'G', sample: 32, accept: 1, reject: 2 },
    'II_500': { code: 'J', sample: 50, accept: 2, reject: 3 },
    'II_1200': { code: 'K', sample: 80, accept: 3, reject: 4 },
    'II_3200': { code: 'L', sample: 125, accept: 5, reject: 6 },
  };

  const sizeKey = lotSize <= 50 ? '50' : lotSize <= 150 ? '150' : lotSize <= 500 ? '500' : lotSize <= 1200 ? '1200' : '3200';
  const key = `${inspLevel}_${sizeKey}`;
  const plan = sampleTable[key] || sampleTable['II_150'];

  const skipLotEligible = lotSize >= 100 && aqlLevel <= 1.0;

  return {
    lot_size: lotSize,
    aql: aqlLevel,
    inspection_level: inspLevel,
    sampling_plan: {
      code_letter: plan.code,
      sample_size: plan.sample,
      accept_number: plan.accept,
      reject_number: plan.reject,
      inspection_pct: Math.round(plan.sample / lotSize * 1000) / 10,
    },
    skip_lot: {
      eligible: skipLotEligible,
      skip_frequency: skipLotEligible ? '1 in 5 lots' : 'N/A',
      qualification: skipLotEligible ? '10 consecutive lots accepted' : 'N/A',
    },
    tightened_plan: {
      sample_size: Math.min(plan.sample * 2, lotSize),
      accept_number: Math.max(0, plan.accept - 1),
      trigger: '2 of 5 lots rejected at normal',
    },
    reduced_plan: {
      sample_size: Math.max(3, Math.round(plan.sample / 2)),
      accept_number: plan.accept,
      trigger: '10 consecutive lots accepted at normal',
    },
  };
}

function inspFAI(params: Record<string, unknown>): unknown {
  const faiId = params.fai_id as string | undefined;
  const partNumber = params.part_number as string | undefined;
  const status = params.status as string | undefined;

  let reports = FAI_REPORTS;
  if (faiId) reports = reports.filter(r => r.id === faiId);
  if (partNumber) reports = reports.filter(r => r.part_number === partNumber);
  if (status) reports = reports.filter(r => r.overall === status);

  return {
    total_reports: reports.length,
    reports: reports.map(r => {
      const plan = INSPECTION_PLANS.find(p => p.id === r.plan_id);
      const passCount = r.results.filter(res => res.pass).length;
      return {
        id: r.id,
        part_number: r.part_number,
        lot_id: r.lot_id,
        overall: r.overall,
        inspector: r.inspector,
        date: r.date,
        results: r.results.map(res => {
          const char = plan?.characteristics.find(c => c.id === res.char_id);
          return { ...res, name: char?.name, critical: char?.critical, deviation: Math.round(Math.abs(res.measured - res.nominal) * 10000) / 10000 };
        }),
        summary: {
          total_checks: r.results.length,
          passed: passCount,
          failed: r.results.length - passCount,
          pass_rate_pct: Math.round(passCount / r.results.length * 100),
          critical_failures: r.results.filter(res => !res.pass && plan?.characteristics.find(c => c.id === res.char_id)?.critical).length,
        },
      };
    }),
    summary: {
      approved: reports.filter(r => r.overall === 'approved').length,
      rejected: reports.filter(r => r.overall === 'rejected').length,
      conditional: reports.filter(r => r.overall === 'conditional').length,
    },
  };
}

function inspDimension(params: Record<string, unknown>): unknown {
  const partNumber = params.part_number as string || 'PMP-BODY-100';
  const plan = INSPECTION_PLANS.find(p => p.part_number === partNumber);
  if (!plan) return { error: `No inspection plan for ${partNumber}` };

  const faiReports = FAI_REPORTS.filter(r => r.part_number === partNumber);
  const latestFAI = faiReports[faiReports.length - 1];

  const dimensionMap = plan.characteristics.map(c => {
    const result = latestFAI?.results.find(r => r.char_id === c.id);
    return {
      balloon: c.id,
      name: c.name,
      nominal: c.nominal,
      tolerance: c.tolerance,
      method: c.method,
      gage: c.gage_id,
      critical: c.critical,
      latest_measurement: result?.measured,
      in_tolerance: result?.pass,
      frequency: c.frequency,
    };
  });

  return {
    part_number: partNumber,
    part_name: plan.part_name,
    revision: plan.revision,
    dimension_map: dimensionMap,
    summary: {
      total_dimensions: dimensionMap.length,
      critical: dimensionMap.filter(d => d.critical).length,
      all_in_tolerance: dimensionMap.every(d => d.in_tolerance !== false),
      failing: dimensionMap.filter(d => d.in_tolerance === false).map(d => d.name),
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeInspectionPlanAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'insp_plan':      return inspPlan(params);
    case 'insp_sample':    return inspSample(params);
    case 'insp_fai':       return inspFAI(params);
    case 'insp_dimension': return inspDimension(params);
    default:
      return { error: `Unknown InspectionPlan action: ${action}` };
  }
}
