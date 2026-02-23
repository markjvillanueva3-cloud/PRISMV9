/**
 * CalibrationEngine — Calibration scheduling, certificate management, recall tracking & traceability
 * Phase R30-MS1: Metrology & Calibration Intelligence
 *
 * Actions:
 *   cal_schedule  — view/manage calibration schedules, due dates, overdue alerts
 *   cal_cert      — calibration certificate management, as-found/as-left data
 *   cal_recall    — instrument recall tracking, out-of-tolerance impact analysis
 *   cal_trace     — calibration traceability chain back to NIST standards
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CalibrationRecord {
  id: string;
  instrument_id: string;
  instrument_name: string;
  type: 'dimensional' | 'pressure' | 'temperature' | 'torque' | 'electrical' | 'force';
  location: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  cal_interval_days: number;
  last_cal_date: string;
  next_cal_date: string;
  status: 'current' | 'due_soon' | 'overdue' | 'out_of_service';
  cal_provider: string;
  nist_traceable: boolean;
}

interface CalibrationCertificate {
  id: string;
  instrument_id: string;
  cert_number: string;
  cal_date: string;
  cal_due: string;
  technician: string;
  as_found: { parameter: string; nominal: number; measured: number; tolerance: number; pass: boolean }[];
  as_left: { parameter: string; nominal: number; measured: number; tolerance: number; pass: boolean }[];
  overall_result: 'pass' | 'fail' | 'adjusted';
  uncertainty: number;
  temperature_c: number;
  humidity_pct: number;
}

interface RecallEvent {
  id: string;
  instrument_id: string;
  recall_date: string;
  reason: string;
  oot_parameter: string;
  oot_deviation: number;
  affected_measurements: number;
  affected_parts: string[];
  disposition: 'reinspect' | 'accept_as_is' | 'quarantine' | 'under_review';
  resolved: boolean;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const CAL_RECORDS: CalibrationRecord[] = [
  { id: 'INS-001', instrument_id: 'MIC-001', instrument_name: 'Digital Micrometer 0-25mm', type: 'dimensional', location: 'Cell-A', manufacturer: 'Mitutoyo', model: 'MDC-25MX', serial_number: 'MT-2024-5521', cal_interval_days: 180, last_cal_date: '2024-12-15', next_cal_date: '2025-06-13', status: 'current', cal_provider: 'Precision Cal Lab', nist_traceable: true },
  { id: 'INS-002', instrument_id: 'MIC-002', instrument_name: 'Digital Micrometer 25-50mm', type: 'dimensional', location: 'Cell-A', manufacturer: 'Mitutoyo', model: 'MDC-50MX', serial_number: 'MT-2024-5522', cal_interval_days: 180, last_cal_date: '2024-11-01', next_cal_date: '2025-04-30', status: 'due_soon', cal_provider: 'Precision Cal Lab', nist_traceable: true },
  { id: 'INS-003', instrument_id: 'CMM-001', instrument_name: 'CMM Hexagon Global S', type: 'dimensional', location: 'QC Lab', manufacturer: 'Hexagon', model: 'Global S 9.12.8', serial_number: 'HX-2023-1001', cal_interval_days: 365, last_cal_date: '2024-06-15', next_cal_date: '2025-06-15', status: 'current', cal_provider: 'Hexagon Service', nist_traceable: true },
  { id: 'INS-004', instrument_id: 'PG-001', instrument_name: 'Pressure Gauge 0-300 PSI', type: 'pressure', location: 'Test-Bay', manufacturer: 'Ashcroft', model: '1082', serial_number: 'AC-2024-3301', cal_interval_days: 365, last_cal_date: '2024-03-01', next_cal_date: '2025-03-01', status: 'overdue', cal_provider: 'In-House', nist_traceable: true },
  { id: 'INS-005', instrument_id: 'TW-001', instrument_name: 'Digital Torque Wrench 10-50 Nm', type: 'torque', location: 'Cell-C', manufacturer: 'Snap-on', model: 'TECHANGLE', serial_number: 'SN-2024-7710', cal_interval_days: 90, last_cal_date: '2025-01-15', next_cal_date: '2025-04-15', status: 'current', cal_provider: 'In-House', nist_traceable: true },
  { id: 'INS-006', instrument_id: 'TC-001', instrument_name: 'Type K Thermocouple', type: 'temperature', location: 'Oven-1', manufacturer: 'Omega', model: 'KMQSS-062', serial_number: 'OM-2024-4401', cal_interval_days: 365, last_cal_date: '2024-08-20', next_cal_date: '2025-08-20', status: 'current', cal_provider: 'In-House', nist_traceable: true },
  { id: 'INS-007', instrument_id: 'DI-001', instrument_name: 'Dial Indicator 0-10mm', type: 'dimensional', location: 'Cell-B', manufacturer: 'Mitutoyo', model: '2046S', serial_number: 'MT-2023-2210', cal_interval_days: 180, last_cal_date: '2024-09-10', next_cal_date: '2025-03-09', status: 'overdue', cal_provider: 'Precision Cal Lab', nist_traceable: true },
  { id: 'INS-008', instrument_id: 'SG-001', instrument_name: 'Surface Roughness Tester', type: 'dimensional', location: 'QC Lab', manufacturer: 'Mitutoyo', model: 'SJ-410', serial_number: 'MT-2024-8801', cal_interval_days: 365, last_cal_date: '2024-10-01', next_cal_date: '2025-10-01', status: 'current', cal_provider: 'Mitutoyo Service', nist_traceable: true },
];

const CAL_CERTIFICATES: CalibrationCertificate[] = [
  {
    id: 'CERT-001', instrument_id: 'MIC-001', cert_number: 'PCL-2024-12150', cal_date: '2024-12-15', cal_due: '2025-06-13', technician: 'D. Palmer',
    as_found: [
      { parameter: '10mm', nominal: 10.000, measured: 10.001, tolerance: 0.003, pass: true },
      { parameter: '20mm', nominal: 20.000, measured: 20.002, tolerance: 0.003, pass: true },
    ],
    as_left: [
      { parameter: '10mm', nominal: 10.000, measured: 10.000, tolerance: 0.003, pass: true },
      { parameter: '20mm', nominal: 20.000, measured: 20.001, tolerance: 0.003, pass: true },
    ],
    overall_result: 'pass', uncertainty: 0.0005, temperature_c: 20.1, humidity_pct: 45,
  },
  {
    id: 'CERT-002', instrument_id: 'PG-001', cert_number: 'IH-2024-03010', cal_date: '2024-03-01', cal_due: '2025-03-01', technician: 'E. Vasquez',
    as_found: [
      { parameter: '50 PSI', nominal: 50.0, measured: 50.8, tolerance: 1.5, pass: true },
      { parameter: '150 PSI', nominal: 150.0, measured: 151.2, tolerance: 1.5, pass: true },
      { parameter: '300 PSI', nominal: 300.0, measured: 303.5, tolerance: 3.0, pass: false },
    ],
    as_left: [
      { parameter: '50 PSI', nominal: 50.0, measured: 50.1, tolerance: 1.5, pass: true },
      { parameter: '150 PSI', nominal: 150.0, measured: 150.3, tolerance: 1.5, pass: true },
      { parameter: '300 PSI', nominal: 300.0, measured: 300.8, tolerance: 3.0, pass: true },
    ],
    overall_result: 'adjusted', uncertainty: 0.5, temperature_c: 21.3, humidity_pct: 42,
  },
  {
    id: 'CERT-003', instrument_id: 'DI-001', cert_number: 'PCL-2024-09100', cal_date: '2024-09-10', cal_due: '2025-03-09', technician: 'D. Palmer',
    as_found: [
      { parameter: '1mm', nominal: 1.000, measured: 1.008, tolerance: 0.005, pass: false },
      { parameter: '5mm', nominal: 5.000, measured: 5.012, tolerance: 0.005, pass: false },
    ],
    as_left: [
      { parameter: '1mm', nominal: 1.000, measured: 1.002, tolerance: 0.005, pass: true },
      { parameter: '5mm', nominal: 5.000, measured: 5.003, tolerance: 0.005, pass: true },
    ],
    overall_result: 'adjusted', uncertainty: 0.001, temperature_c: 20.5, humidity_pct: 48,
  },
];

const RECALL_EVENTS: RecallEvent[] = [
  { id: 'RCL-001', instrument_id: 'DI-001', recall_date: '2025-03-10', reason: 'Dial indicator found out of tolerance at last calibration — as-found exceeded ±0.005mm', oot_parameter: 'Linearity', oot_deviation: 0.012, affected_measurements: 340, affected_parts: ['LOT-2024-1201', 'LOT-2024-1202', 'LOT-2025-0101'], disposition: 'reinspect', resolved: false },
  { id: 'RCL-002', instrument_id: 'PG-001', recall_date: '2025-03-02', reason: 'Pressure gauge overdue — 300 PSI reading exceeded tolerance at last check', oot_parameter: 'Accuracy at 300 PSI', oot_deviation: 3.5, affected_measurements: 120, affected_parts: ['LOT-2025-0201', 'LOT-2025-0202'], disposition: 'under_review', resolved: false },
];

// ── Action Implementations ─────────────────────────────────────────────────

function calSchedule(params: Record<string, unknown>): unknown {
  const status = params.status as string | undefined;
  const type = params.type as string | undefined;
  const location = params.location as string | undefined;

  let records = CAL_RECORDS;
  if (status) records = records.filter(r => r.status === status);
  if (type) records = records.filter(r => r.type === type);
  if (location) records = records.filter(r => r.location.toLowerCase().includes((location as string).toLowerCase()));

  const today = new Date('2025-03-20');
  const schedule = records.map(r => {
    const nextDue = new Date(r.next_cal_date);
    const daysUntilDue = Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...r, days_until_due: daysUntilDue, urgency: daysUntilDue < 0 ? 'OVERDUE' : daysUntilDue < 30 ? 'DUE_SOON' : 'OK' };
  });

  return {
    total_instruments: schedule.length,
    schedule: schedule.map(s => ({
      id: s.id,
      instrument: s.instrument_name,
      type: s.type,
      location: s.location,
      serial: s.serial_number,
      last_cal: s.last_cal_date,
      next_due: s.next_cal_date,
      days_until_due: s.days_until_due,
      status: s.status,
      urgency: s.urgency,
      provider: s.cal_provider,
    })),
    summary: {
      current: schedule.filter(s => s.status === 'current').length,
      due_soon: schedule.filter(s => s.status === 'due_soon').length,
      overdue: schedule.filter(s => s.status === 'overdue').length,
      out_of_service: schedule.filter(s => s.status === 'out_of_service').length,
      compliance_pct: Math.round(schedule.filter(s => s.status === 'current' || s.status === 'due_soon').length / schedule.length * 100),
      by_type: Object.entries(schedule.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([t, c]) => ({ type: t, count: c })),
    },
  };
}

function calCert(params: Record<string, unknown>): unknown {
  const instrumentId = params.instrument_id as string | undefined;
  const certId = params.cert_id as string | undefined;

  let certs = CAL_CERTIFICATES;
  if (instrumentId) certs = certs.filter(c => c.instrument_id === instrumentId);
  if (certId) certs = certs.filter(c => c.id === certId);

  return {
    total_certificates: certs.length,
    certificates: certs.map(c => {
      const instrument = CAL_RECORDS.find(r => r.instrument_id === c.instrument_id);
      return {
        cert_id: c.id,
        cert_number: c.cert_number,
        instrument: instrument?.instrument_name,
        instrument_id: c.instrument_id,
        cal_date: c.cal_date,
        cal_due: c.cal_due,
        technician: c.technician,
        result: c.overall_result,
        uncertainty: c.uncertainty,
        environment: { temp_c: c.temperature_c, humidity_pct: c.humidity_pct },
        as_found: c.as_found,
        as_left: c.as_left,
        as_found_pass_rate: Math.round(c.as_found.filter(a => a.pass).length / c.as_found.length * 100),
        as_left_pass_rate: Math.round(c.as_left.filter(a => a.pass).length / c.as_left.length * 100),
      };
    }),
  };
}

function calRecall(params: Record<string, unknown>): unknown {
  const instrumentId = params.instrument_id as string | undefined;
  const resolved = params.resolved as boolean | undefined;

  let recalls = RECALL_EVENTS;
  if (instrumentId) recalls = recalls.filter(r => r.instrument_id === instrumentId);
  if (resolved !== undefined) recalls = recalls.filter(r => r.resolved === resolved);

  return {
    total_recalls: recalls.length,
    recalls: recalls.map(r => {
      const instrument = CAL_RECORDS.find(i => i.instrument_id === r.instrument_id);
      return {
        id: r.id,
        instrument: instrument?.instrument_name,
        instrument_id: r.instrument_id,
        recall_date: r.recall_date,
        reason: r.reason,
        oot_parameter: r.oot_parameter,
        oot_deviation: r.oot_deviation,
        affected_measurements: r.affected_measurements,
        affected_lots: r.affected_parts,
        disposition: r.disposition,
        resolved: r.resolved,
        risk_level: r.affected_measurements > 200 ? 'high' : r.affected_measurements > 50 ? 'medium' : 'low',
      };
    }),
    summary: {
      open_recalls: recalls.filter(r => !r.resolved).length,
      total_affected_measurements: recalls.reduce((sum, r) => sum + r.affected_measurements, 0),
      total_affected_lots: [...new Set(recalls.flatMap(r => r.affected_parts))].length,
      dispositions: Object.entries(recalls.reduce((acc, r) => { acc[r.disposition] = (acc[r.disposition] || 0) + 1; return acc; }, {} as Record<string, number>)),
    },
  };
}

function calTrace(params: Record<string, unknown>): unknown {
  const instrumentId = params.instrument_id as string || 'MIC-001';
  const instrument = CAL_RECORDS.find(r => r.instrument_id === instrumentId);
  if (!instrument) return { error: `Instrument ${instrumentId} not found` };

  const cert = CAL_CERTIFICATES.find(c => c.instrument_id === instrumentId);

  return {
    instrument: {
      id: instrument.instrument_id,
      name: instrument.instrument_name,
      serial: instrument.serial_number,
      manufacturer: instrument.manufacturer,
      model: instrument.model,
    },
    traceability_chain: [
      { level: 0, entity: instrument.instrument_name, serial: instrument.serial_number, cal_date: instrument.last_cal_date, cert: cert?.cert_number },
      { level: 1, entity: `${instrument.cal_provider} Reference Standards`, serial: 'REF-STD-001', cal_date: '2024-06-01', cert: 'RS-2024-0601' },
      { level: 2, entity: 'NIST Primary Standard', serial: 'NIST-PS-2024', cal_date: '2024-01-15', cert: 'NIST-2024-0115' },
    ],
    nist_traceable: instrument.nist_traceable,
    uncertainty_budget: {
      instrument_uncertainty: cert?.uncertainty || 0.001,
      reference_uncertainty: (cert?.uncertainty || 0.001) * 0.3,
      nist_uncertainty: (cert?.uncertainty || 0.001) * 0.1,
      combined_uncertainty: Math.round((cert?.uncertainty || 0.001) * 1.2 * 10000) / 10000,
      expanded_uncertainty_k2: Math.round((cert?.uncertainty || 0.001) * 1.2 * 2 * 10000) / 10000,
    },
    compliance: {
      iso_17025: true,
      ansi_z540_3: true,
      as9100_7_1_5: true,
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeCalibrationAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'cal_schedule': return calSchedule(params);
    case 'cal_cert':     return calCert(params);
    case 'cal_recall':   return calRecall(params);
    case 'cal_trace':    return calTrace(params);
    default:
      return { error: `Unknown Calibration action: ${action}` };
  }
}
