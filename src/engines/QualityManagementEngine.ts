/**
 * QualityManagementEngine — SPC charting, calibration tracking, material cert traceability,
 * NCR workflow, first article inspection (FAI), CAPA management.
 * Supports ISO 9001 / AS9100 compliance requirements.
 *
 * U-XWIRE2: Cross-engine wiring — FAI creation cascades to JobLifecycle
 * (qc_pending → qc_passed/qc_failed), auto-creates NCR on failure.
 */

// U-XWIRE2: Cross-engine import for quality → lifecycle cascade
import { jobLifecycleEngine } from "./JobLifecycleEngine.js";

export interface SPCDataPoint {
  timestamp: string;
  value: number;
  sample_id: string;
  operator?: string;
}

export interface SPCChart {
  characteristic: string;
  part_number: string;
  operation: string;
  nominal: number;
  usl: number;
  lsl: number;
  data: SPCDataPoint[];
  x_bar: number;
  range_bar: number;
  ucl: number;
  lcl: number;
  cp: number;
  cpk: number;
  ppk: number;
  in_control: boolean;
  out_of_control_points: number[];
  violations: string[];
}

export interface CalibrationRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  type: 'gage' | 'micrometer' | 'caliper' | 'cmm' | 'indicator' | 'surface_plate' | 'ring_gage' | 'pin_gage' | 'other';
  serial_number: string;
  last_calibration: string;
  next_calibration: string;
  calibrated_by: string;
  certificate_number?: string;
  status: 'current' | 'due_soon' | 'overdue' | 'out_of_service';
  accuracy: string;
}

export interface MaterialCert {
  id: string;
  heat_lot: string;
  material: string;
  supplier: string;
  po_number?: string;
  cert_date: string;
  properties: { property: string; value: number; unit: string; spec_min?: number; spec_max?: number; pass: boolean }[];
  linked_jobs: string[];
  document_ref?: string;
}

export interface NCR {
  id: string;
  job_id: string;
  part_number: string;
  created_at: string;
  created_by: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  category: 'dimensional' | 'surface_finish' | 'material' | 'cosmetic' | 'functional' | 'documentation';
  disposition: 'use_as_is' | 'rework' | 'scrap' | 'return_to_supplier' | 'pending';
  root_cause?: string;
  corrective_action?: string;
  cost_impact: number;
  quantity_affected: number;
  status: 'open' | 'investigating' | 'corrective_action' | 'closed' | 'verified';
  closed_at?: string;
}

export interface FAIRecord {
  id: string;
  job_id: string;
  part_number: string;
  revision: string;
  inspection_date: string;
  inspector: string;
  characteristics: {
    id: string;
    description: string;
    nominal: number;
    tolerance_plus: number;
    tolerance_minus: number;
    actual: number;
    unit: string;
    in_spec: boolean;
    tool_used: string;
  }[];
  overall_pass: boolean;
  notes?: string;
}

// SPC constants for subgroup size n=5
const A2 = 0.577, D3 = 0, D4 = 2.114;

class QualityManagementEngine {
  private spcData: Map<string, SPCDataPoint[]> = new Map();
  private calibrations: Map<string, CalibrationRecord> = new Map();
  private materialCerts: Map<string, MaterialCert> = new Map();
  private ncrs: Map<string, NCR> = new Map();
  private fais: Map<string, FAIRecord> = new Map();

  // --- SPC ---
  createSPCChart(params: {
    characteristic: string;
    part_number: string;
    operation: string;
    nominal: number;
    usl: number;
    lsl: number;
    data: SPCDataPoint[];
    subgroup_size?: number;
  }): SPCChart {
    const key = `${params.part_number}-${params.characteristic}`;
    this.spcData.set(key, params.data);

    const n = params.subgroup_size ?? 5;
    const values = params.data.map((d) => d.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;

    // Calculate ranges between consecutive subgroups
    const ranges: number[] = [];
    for (let i = 0; i < values.length - 1; i += n) {
      const subgroup = values.slice(i, Math.min(i + n, values.length));
      ranges.push(Math.max(...subgroup) - Math.min(...subgroup));
    }
    const rBar = ranges.length > 0 ? ranges.reduce((s, r) => s + r, 0) / ranges.length : 0;

    const ucl = mean + A2 * rBar;
    const lcl = mean - A2 * rBar;

    // Capability indices
    const sigma = rBar / 2.326; // d2 for n=5
    const cp = sigma > 0 ? (params.usl - params.lsl) / (6 * sigma) : 0;
    const cpu = sigma > 0 ? (params.usl - mean) / (3 * sigma) : 0;
    const cpl = sigma > 0 ? (mean - params.lsl) / (3 * sigma) : 0;
    const cpk = Math.min(cpu, cpl);

    // Ppk (overall)
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(values.length - 1, 1));
    const ppk = stdDev > 0 ? Math.min((params.usl - mean) / (3 * stdDev), (mean - params.lsl) / (3 * stdDev)) : 0;

    // Out of control detection (Western Electric rules)
    const violations: string[] = [];
    const oocPoints: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] > ucl || values[i] < lcl) {
        oocPoints.push(i);
        violations.push(`Point ${i + 1}: value ${values[i].toFixed(4)} outside control limits`);
      }
    }
    // Rule 2: 2 of 3 consecutive beyond 2-sigma
    const twoSigma = (ucl - mean) * 2 / 3;
    for (let i = 2; i < values.length; i++) {
      const window = [values[i - 2], values[i - 1], values[i]];
      const beyond = window.filter((v) => Math.abs(v - mean) > twoSigma).length;
      if (beyond >= 2 && !oocPoints.includes(i)) {
        violations.push(`Points ${i - 1}-${i + 1}: 2-of-3 beyond 2-sigma warning`);
      }
    }
    // Rule 3: 7 consecutive on same side
    let runCount = 1;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] > mean && values[i - 1] > mean) || (values[i] < mean && values[i - 1] < mean)) {
        runCount++;
        if (runCount === 7) violations.push(`Points ${i - 5}-${i + 1}: 7 consecutive on same side of center`);
      } else {
        runCount = 1;
      }
    }

    return {
      characteristic: params.characteristic,
      part_number: params.part_number,
      operation: params.operation,
      nominal: params.nominal,
      usl: params.usl,
      lsl: params.lsl,
      data: params.data,
      x_bar: mean,
      range_bar: rBar,
      ucl, lcl,
      cp, cpk, ppk,
      in_control: oocPoints.length === 0 && violations.length === 0,
      out_of_control_points: oocPoints,
      violations,
    };
  }

  // --- Calibration ---
  addCalibration(params: Omit<CalibrationRecord, 'id' | 'status'>): CalibrationRecord {
    const id = `CAL-${Date.now()}`;
    const now = new Date();
    const nextCal = new Date(params.next_calibration);
    const daysUntil = Math.floor((nextCal.getTime() - now.getTime()) / 86400000);
    const status: CalibrationRecord['status'] = daysUntil < 0 ? 'overdue' : daysUntil < 30 ? 'due_soon' : 'current';

    const record: CalibrationRecord = { ...params, id, status };
    this.calibrations.set(id, record);
    return record;
  }

  getCalibrationDashboard(): {
    total: number;
    current: number;
    due_soon: number;
    overdue: number;
    out_of_service: number;
    items: CalibrationRecord[];
  } {
    const items = [...this.calibrations.values()];
    // Refresh statuses
    const now = new Date();
    for (const item of items) {
      if (item.status === 'out_of_service') continue;
      const nextCal = new Date(item.next_calibration);
      const daysUntil = Math.floor((nextCal.getTime() - now.getTime()) / 86400000);
      item.status = daysUntil < 0 ? 'overdue' : daysUntil < 30 ? 'due_soon' : 'current';
    }
    return {
      total: items.length,
      current: items.filter((i) => i.status === 'current').length,
      due_soon: items.filter((i) => i.status === 'due_soon').length,
      overdue: items.filter((i) => i.status === 'overdue').length,
      out_of_service: items.filter((i) => i.status === 'out_of_service').length,
      items: items.sort((a, b) => a.next_calibration.localeCompare(b.next_calibration)),
    };
  }

  // --- Material Certs ---
  addMaterialCert(params: Omit<MaterialCert, 'id'>): MaterialCert {
    const id = `MC-${Date.now()}`;
    const cert: MaterialCert = { ...params, id };
    this.materialCerts.set(id, cert);
    return cert;
  }

  traceByHeatLot(heat_lot: string): { cert: MaterialCert | undefined; linked_jobs: string[] } {
    const cert = [...this.materialCerts.values()].find((c) => c.heat_lot === heat_lot);
    return { cert, linked_jobs: cert?.linked_jobs ?? [] };
  }

  traceByJob(job_id: string): MaterialCert[] {
    return [...this.materialCerts.values()].filter((c) => c.linked_jobs.includes(job_id));
  }

  // --- NCR ---
  createNCR(params: Omit<NCR, 'id' | 'status' | 'closed_at'>): NCR {
    const id = `NCR-${String([...this.ncrs.keys()].length + 1).padStart(4, '0')}`;
    const ncr: NCR = { ...params, id, status: 'open' };
    this.ncrs.set(id, ncr);
    return ncr;
  }

  updateNCR(id: string, updates: Partial<Pick<NCR, 'disposition' | 'root_cause' | 'corrective_action' | 'status'>>): NCR {
    const ncr = this.ncrs.get(id);
    if (!ncr) throw new Error(`NCR ${id} not found`);
    Object.assign(ncr, updates);
    if (updates.status === 'closed') ncr.closed_at = new Date().toISOString();
    return ncr;
  }

  getNCRDashboard(): {
    total: number;
    open: number;
    closed: number;
    by_category: { category: string; count: number }[];
    by_severity: { severity: string; count: number }[];
    total_cost: number;
    scrap_count: number;
    rework_count: number;
  } {
    const ncrs = [...this.ncrs.values()];
    const byCat = new Map<string, number>();
    const bySev = new Map<string, number>();
    for (const ncr of ncrs) {
      byCat.set(ncr.category, (byCat.get(ncr.category) ?? 0) + 1);
      bySev.set(ncr.severity, (bySev.get(ncr.severity) ?? 0) + 1);
    }
    return {
      total: ncrs.length,
      open: ncrs.filter((n) => n.status !== 'closed' && n.status !== 'verified').length,
      closed: ncrs.filter((n) => n.status === 'closed' || n.status === 'verified').length,
      by_category: [...byCat.entries()].map(([category, count]) => ({ category, count })),
      by_severity: [...bySev.entries()].map(([severity, count]) => ({ severity, count })),
      total_cost: ncrs.reduce((s, n) => s + n.cost_impact, 0),
      scrap_count: ncrs.filter((n) => n.disposition === 'scrap').length,
      rework_count: ncrs.filter((n) => n.disposition === 'rework').length,
    };
  }

  // --- FAI ---
  /**
   * Create a First Article Inspection record.
   * U-XWIRE2: Cascades to JobLifecycle — sets job to qc_pending on creation,
   * then qc_passed or qc_failed based on results. Auto-creates NCR on failure.
   */
  createFAI(params: Omit<FAIRecord, 'id' | 'overall_pass'>): FAIRecord & { cascade?: Record<string, any> } {
    const id = `FAI-${Date.now()}`;
    const overall_pass = params.characteristics.every((c) => c.in_spec);
    const fai: FAIRecord = { ...params, id, overall_pass };
    this.fais.set(id, fai);

    // U-XWIRE2: Cross-engine cascade to JobLifecycle + auto-NCR
    const cascade: Record<string, any> = { warnings: [] as string[] };
    try {
      // First mark job as qc_pending, then immediately resolve based on result
      jobLifecycleEngine.updateStatus(params.job_id, "qc_pending" as any, {
        user: params.inspector,
        notes: `FAI ${id} submitted`,
      });

      if (overall_pass) {
        jobLifecycleEngine.updateStatus(params.job_id, "qc_passed" as any, {
          user: params.inspector,
          notes: `FAI ${id} passed — all ${params.characteristics.length} characteristics in spec`,
        });
        cascade.job_status = "qc_passed";
      } else {
        const outOfSpec = params.characteristics.filter((c) => !c.in_spec);
        jobLifecycleEngine.updateStatus(params.job_id, "qc_failed" as any, {
          user: params.inspector,
          notes: `FAI ${id} failed — ${outOfSpec.length}/${params.characteristics.length} out of spec`,
        });
        cascade.job_status = "qc_failed";
        cascade.warnings.push(
          `FAI FAILED: ${outOfSpec.length} characteristic(s) out of spec: ${outOfSpec.map((c) => c.description).join(", ")}`,
        );

        // Auto-create NCR for failed FAI
        try {
          const ncr = this.createNCR({
            job_id: params.job_id,
            part_number: params.part_number,
            created_at: new Date().toISOString(),
            created_by: params.inspector,
            description: `Auto-generated from failed FAI ${id}: ${outOfSpec.length} characteristic(s) out of spec`,
            severity: outOfSpec.length > params.characteristics.length / 2 ? "critical" : outOfSpec.length > 1 ? "major" : "minor",
            category: "dimensional",
            disposition: "pending",
            root_cause: undefined,
            corrective_action: undefined,
            cost_impact: 0,
            quantity_affected: 1,
          });
          cascade.ncr = { id: ncr.id, severity: ncr.severity };
        } catch (e: any) {
          cascade.ncr = { error: e.message };
          cascade.warnings.push(`NCR auto-creation failed: ${e.message}`);
        }
      }
    } catch (e: any) {
      cascade.job_update = { error: e.message };
      cascade.warnings.push(`JobLifecycle cascade failed: ${e.message}`);
    }

    return { ...fai, cascade };
  }

  getFAI(id: string): FAIRecord | undefined {
    return this.fais.get(id);
  }

  listFAIs(job_id?: string): FAIRecord[] {
    let result = [...this.fais.values()];
    if (job_id) result = result.filter((f) => f.job_id === job_id);
    return result;
  }

  // --- Quality KPIs ---
  qualityKPIs(): {
    first_pass_yield: number;
    scrap_rate: number;
    rework_rate: number;
    ncr_closure_rate: number;
    avg_cpk: number;
    calibration_compliance: number;
  } {
    const ncrs = [...this.ncrs.values()];
    const fais = [...this.fais.values()];
    const cal = this.getCalibrationDashboard();

    const totalParts = fais.length > 0 ? fais.length : 1;
    const passedFirst = fais.filter((f) => f.overall_pass).length;
    const scrapCount = ncrs.filter((n) => n.disposition === 'scrap').length;
    const reworkCount = ncrs.filter((n) => n.disposition === 'rework').length;
    const closedNcrs = ncrs.filter((n) => n.status === 'closed' || n.status === 'verified').length;

    // Average Cpk from SPC data
    const cpkValues: number[] = [];
    for (const [, data] of this.spcData) {
      if (data.length >= 5) {
        const values = data.map((d) => d.value);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const sigma = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(values.length - 1, 1));
        if (sigma > 0) cpkValues.push(Math.min(mean / (3 * sigma), mean / (3 * sigma)));
      }
    }

    return {
      first_pass_yield: totalParts > 0 ? (passedFirst / totalParts) * 100 : 100,
      scrap_rate: ncrs.length > 0 ? (scrapCount / ncrs.length) * 100 : 0,
      rework_rate: ncrs.length > 0 ? (reworkCount / ncrs.length) * 100 : 0,
      ncr_closure_rate: ncrs.length > 0 ? (closedNcrs / ncrs.length) * 100 : 100,
      avg_cpk: cpkValues.length > 0 ? cpkValues.reduce((s, v) => s + v, 0) / cpkValues.length : 0,
      calibration_compliance: cal.total > 0 ? (cal.current / cal.total) * 100 : 100,
    };
  }
}

export const qualityManagementEngine = new QualityManagementEngine();
