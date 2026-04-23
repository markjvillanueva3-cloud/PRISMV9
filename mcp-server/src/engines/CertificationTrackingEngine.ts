/**
 * PRISM: CertificationTrackingEngine
 * =====================================
 * Track material certifications, tool certifications, machine calibrations,
 * and generate audit reports for quality management systems.
 *
 * Methods:
 *  - trackMaterialCert  — validate material mill cert against spec
 *  - trackToolCert      — check tool certification status
 *  - trackMachineCal    — check machine calibration status
 *  - generateAuditReport — summary audit report
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterialCertInput {
  material: string;
  heat_lot: string;
  mill_cert_data: {
    tensile_MPa?: number;
    yield_MPa?: number;
    elongation_pct?: number;
    hardness?: number;
  };
  spec: string;
}

export interface SpecRequirements {
  min_tensile_MPa: number;
  min_yield_MPa: number;
  min_elongation_pct: number;
  hardness_range: [number, number];
}

export interface MaterialCertResult {
  compliant: boolean;
  spec_requirements: SpecRequirements;
  deviations: string[];
  cert_valid: boolean;
}

export interface ToolCertInput {
  tool_id: string;
  manufacturer: string;
  grade: string;
  coating: string;
  batch: string;
  inspection_date: string;
}

export interface ToolCertResult {
  cert_status: 'valid' | 'expiring' | 'expired';
  days_remaining: number;
  recertification_needed: boolean;
}

export interface MachineMeasurement {
  axis: string;
  error_um: number;
  spec_um: number;
}

export interface MachineCalInput {
  machine_id: string;
  last_calibration: string;
  calibration_interval_days: number;
  measurements?: MachineMeasurement[];
}

export interface MachineCalResult {
  cal_status: 'current' | 'due_soon' | 'overdue';
  days_until_due: number;
  in_spec: boolean;
  worst_axis?: string;
  recommended_actions: string[];
}

export type AuditScope = 'material' | 'tool' | 'machine' | 'all';

export interface AuditReportInput {
  scope: AuditScope;
}

export interface AuditReportResult {
  summary: string;
  items_tracked: number;
  items_compliant: number;
  items_non_conformant: number;
  action_items: string[];
}

// ---------------------------------------------------------------------------
// Material spec database (common ASTM/AMS/ISO specs)
// ---------------------------------------------------------------------------

const MATERIAL_SPECS: Record<string, SpecRequirements> = {
  // Steels
  'ASTM A29 1045': {
    min_tensile_MPa: 585, min_yield_MPa: 450,
    min_elongation_pct: 12, hardness_range: [170, 210],
  },
  'ASTM A29 4140': {
    min_tensile_MPa: 655, min_yield_MPa: 415,
    min_elongation_pct: 15, hardness_range: [197, 302],
  },
  'ASTM A29 4340': {
    min_tensile_MPa: 745, min_yield_MPa: 470,
    min_elongation_pct: 12, hardness_range: [217, 352],
  },
  'AMS 6415': {
    min_tensile_MPa: 860, min_yield_MPa: 690,
    min_elongation_pct: 10, hardness_range: [28, 34],
  },
  // Stainless
  'ASTM A276 304': {
    min_tensile_MPa: 515, min_yield_MPa: 205,
    min_elongation_pct: 40, hardness_range: [123, 201],
  },
  'ASTM A276 316': {
    min_tensile_MPa: 515, min_yield_MPa: 205,
    min_elongation_pct: 40, hardness_range: [123, 217],
  },
  'ASTM A276 17-4PH': {
    min_tensile_MPa: 930, min_yield_MPa: 725,
    min_elongation_pct: 5, hardness_range: [33, 40],
  },
  // Aluminum
  'AMS 4027 6061-T6': {
    min_tensile_MPa: 290, min_yield_MPa: 241,
    min_elongation_pct: 10, hardness_range: [90, 110],
  },
  'AMS 4037 7075-T6': {
    min_tensile_MPa: 524, min_yield_MPa: 462,
    min_elongation_pct: 5, hardness_range: [140, 160],
  },
  'AMS 4117 2024-T3': {
    min_tensile_MPa: 440, min_yield_MPa: 290,
    min_elongation_pct: 12, hardness_range: [120, 140],
  },
  // Titanium
  'AMS 4911 Ti-6Al-4V': {
    min_tensile_MPa: 896, min_yield_MPa: 827,
    min_elongation_pct: 10, hardness_range: [30, 39],
  },
  'AMS 4928 Ti-6Al-4V': {
    min_tensile_MPa: 896, min_yield_MPa: 827,
    min_elongation_pct: 10, hardness_range: [30, 39],
  },
  'ASTM B348 Grade 2': {
    min_tensile_MPa: 345, min_yield_MPa: 275,
    min_elongation_pct: 20, hardness_range: [80, 200],
  },
  // Inconel
  'AMS 5662 718': {
    min_tensile_MPa: 1240, min_yield_MPa: 1035,
    min_elongation_pct: 10, hardness_range: [36, 44],
  },
  'AMS 5663 718': {
    min_tensile_MPa: 1275, min_yield_MPa: 1035,
    min_elongation_pct: 10, hardness_range: [36, 44],
  },
  // Medical
  'ASTM F75 CoCrMo': {
    min_tensile_MPa: 655, min_yield_MPa: 450,
    min_elongation_pct: 8, hardness_range: [25, 35],
  },
  'ASTM F1537 CoCrMo': {
    min_tensile_MPa: 860, min_yield_MPa: 515,
    min_elongation_pct: 20, hardness_range: [25, 35],
  },
  'ASTM F2063 NiTi': {
    min_tensile_MPa: 895, min_yield_MPa: 195,
    min_elongation_pct: 10, hardness_range: [30, 40],
  },
};

// Default cert validity period for tools (days)
const TOOL_CERT_VALIDITY_DAYS = 365;
const TOOL_CERT_WARNING_DAYS = 30;

// ---------------------------------------------------------------------------
// Internal tracking (in-memory for this session)
// ---------------------------------------------------------------------------

interface TrackedMaterial {
  material: string;
  heat_lot: string;
  spec: string;
  compliant: boolean;
  timestamp: string;
}

interface TrackedTool {
  tool_id: string;
  manufacturer: string;
  status: 'valid' | 'expiring' | 'expired';
  timestamp: string;
}

interface TrackedMachine {
  machine_id: string;
  status: 'current' | 'due_soon' | 'overdue';
  in_spec: boolean;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class CertificationTrackingEngine {
  private materialRecords: TrackedMaterial[] = [];
  private toolRecords: TrackedTool[] = [];
  private machineRecords: TrackedMachine[] = [];

  /**
   * Validate material mill cert data against specification requirements.
   */
  trackMaterialCert(input: MaterialCertInput): MaterialCertResult {
    const { material, heat_lot, mill_cert_data, spec } = input;
    const deviations: string[] = [];

    // Look up spec requirements — try exact match, then partial
    let specReq = MATERIAL_SPECS[spec];
    if (!specReq) {
      const specUpper = spec.toUpperCase();
      for (const [key, val] of Object.entries(MATERIAL_SPECS)) {
        if (specUpper.includes(key.toUpperCase())
          || key.toUpperCase().includes(specUpper)) {
          specReq = val;
          break;
        }
      }
    }

    if (!specReq) {
      // Generate reasonable defaults based on material name
      specReq = this.inferSpecRequirements(material);
    }

    // Check tensile strength
    if (mill_cert_data.tensile_MPa !== undefined) {
      if (mill_cert_data.tensile_MPa < specReq.min_tensile_MPa) {
        deviations.push(
          `Tensile ${mill_cert_data.tensile_MPa} MPa below min ` +
          `${specReq.min_tensile_MPa} MPa`
        );
      }
    } else {
      deviations.push('Tensile strength not provided on mill cert');
    }

    // Check yield strength
    if (mill_cert_data.yield_MPa !== undefined) {
      if (mill_cert_data.yield_MPa < specReq.min_yield_MPa) {
        deviations.push(
          `Yield ${mill_cert_data.yield_MPa} MPa below min ` +
          `${specReq.min_yield_MPa} MPa`
        );
      }
    } else {
      deviations.push('Yield strength not provided on mill cert');
    }

    // Check elongation
    if (mill_cert_data.elongation_pct !== undefined) {
      if (mill_cert_data.elongation_pct < specReq.min_elongation_pct) {
        deviations.push(
          `Elongation ${mill_cert_data.elongation_pct}% below min ` +
          `${specReq.min_elongation_pct}%`
        );
      }
    }

    // Check hardness
    if (mill_cert_data.hardness !== undefined) {
      const [hMin, hMax] = specReq.hardness_range;
      if (mill_cert_data.hardness < hMin || mill_cert_data.hardness > hMax) {
        deviations.push(
          `Hardness ${mill_cert_data.hardness} outside range ` +
          `[${hMin}, ${hMax}]`
        );
      }
    }

    // Cert is valid if we have at least tensile + yield and no deviations
    const hasMinData = mill_cert_data.tensile_MPa !== undefined
      && mill_cert_data.yield_MPa !== undefined;
    const certValid = hasMinData
      && !deviations.some(d =>
        d.includes('below min') || d.includes('outside range')
      );
    const compliant = deviations.length === 0;

    // Track
    this.materialRecords.push({
      material, heat_lot, spec, compliant,
      timestamp: new Date().toISOString(),
    });

    return {
      compliant,
      spec_requirements: specReq,
      deviations,
      cert_valid: certValid,
    };
  }

  /**
   * Check tool certification status based on inspection date.
   */
  trackToolCert(input: ToolCertInput): ToolCertResult {
    const { tool_id, manufacturer, inspection_date } = input;

    const inspDate = new Date(inspection_date);
    const now = new Date();
    const expiryDate = new Date(inspDate);
    expiryDate.setDate(expiryDate.getDate() + TOOL_CERT_VALIDITY_DAYS);

    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status: 'valid' | 'expiring' | 'expired';
    let recertNeeded: boolean;

    if (daysRemaining <= 0) {
      status = 'expired';
      recertNeeded = true;
    } else if (daysRemaining <= TOOL_CERT_WARNING_DAYS) {
      status = 'expiring';
      recertNeeded = true;
    } else {
      status = 'valid';
      recertNeeded = false;
    }

    // Track
    this.toolRecords.push({
      tool_id, manufacturer, status,
      timestamp: new Date().toISOString(),
    });

    return {
      cert_status: status,
      days_remaining: Math.max(0, daysRemaining),
      recertification_needed: recertNeeded,
    };
  }

  /**
   * Check machine calibration status and axis measurements.
   */
  trackMachineCal(input: MachineCalInput): MachineCalResult {
    const { machine_id, last_calibration, calibration_interval_days } = input;
    const measurements = input.measurements ?? [];

    const calDate = new Date(last_calibration);
    const now = new Date();
    const nextCalDate = new Date(calDate);
    nextCalDate.setDate(nextCalDate.getDate() + calibration_interval_days);

    const diffMs = nextCalDate.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let calStatus: 'current' | 'due_soon' | 'overdue';
    if (daysUntilDue <= 0) {
      calStatus = 'overdue';
    } else if (daysUntilDue <= 30) {
      calStatus = 'due_soon';
    } else {
      calStatus = 'current';
    }

    // Check axis measurements
    let inSpec = true;
    let worstAxis: string | undefined;
    let worstRatio = 0;

    for (const m of measurements) {
      const ratio = Math.abs(m.error_um) / m.spec_um;
      if (Math.abs(m.error_um) > m.spec_um) {
        inSpec = false;
      }
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstAxis = m.axis;
      }
    }

    // If no measurements provided, assume in spec
    if (measurements.length === 0) {
      inSpec = true;
    }

    // Recommended actions
    const actions: string[] = [];
    if (calStatus === 'overdue') {
      actions.push(
        `Calibration overdue by ${Math.abs(daysUntilDue)} days ` +
        `— schedule immediate recalibration`
      );
    }
    if (calStatus === 'due_soon') {
      actions.push(
        `Calibration due in ${daysUntilDue} days ` +
        `— schedule calibration`
      );
    }
    if (!inSpec && worstAxis) {
      const worstMeas = measurements.find(m => m.axis === worstAxis);
      if (worstMeas) {
        actions.push(
          `${worstAxis} axis error ${worstMeas.error_um} µm ` +
          `exceeds spec ${worstMeas.spec_um} µm — ` +
          `requires alignment/compensation`
        );
      }
    }
    if (worstRatio > 0.8 && inSpec && worstAxis) {
      actions.push(
        `${worstAxis} axis at ${Math.round(worstRatio * 100)}% of spec ` +
        `— monitor closely`
      );
    }
    if (actions.length === 0) {
      actions.push('No actions required — machine within calibration');
    }

    // Track
    this.machineRecords.push({
      machine_id, status: calStatus, in_spec: inSpec,
      timestamp: new Date().toISOString(),
    });

    return {
      cal_status: calStatus,
      days_until_due: Math.max(0, daysUntilDue),
      in_spec: inSpec,
      worst_axis: worstAxis,
      recommended_actions: actions,
    };
  }

  /**
   * Generate an audit report across tracked certifications.
   */
  generateAuditReport(input: AuditReportInput): AuditReportResult {
    const { scope } = input;
    let tracked = 0;
    let compliant = 0;
    let nonConformant = 0;
    const actionItems: string[] = [];

    if (scope === 'material' || scope === 'all') {
      for (const rec of this.materialRecords) {
        tracked++;
        if (rec.compliant) {
          compliant++;
        } else {
          nonConformant++;
          actionItems.push(
            `Material ${rec.material} lot ${rec.heat_lot}: ` +
            `non-conformant to ${rec.spec}`
          );
        }
      }
    }

    if (scope === 'tool' || scope === 'all') {
      for (const rec of this.toolRecords) {
        tracked++;
        if (rec.status === 'valid') {
          compliant++;
        } else {
          nonConformant++;
          actionItems.push(
            `Tool ${rec.tool_id}: certification ${rec.status} ` +
            `— recertification needed`
          );
        }
      }
    }

    if (scope === 'machine' || scope === 'all') {
      for (const rec of this.machineRecords) {
        tracked++;
        if (rec.status === 'current' && rec.in_spec) {
          compliant++;
        } else {
          nonConformant++;
          const issues: string[] = [];
          if (rec.status !== 'current') issues.push(`calibration ${rec.status}`);
          if (!rec.in_spec) issues.push('out of spec');
          actionItems.push(
            `Machine ${rec.machine_id}: ${issues.join(', ')}`
          );
        }
      }
    }

    const scopeLabel = scope === 'all' ? 'all categories' : scope;
    const summary = tracked === 0
      ? `No items tracked for scope: ${scopeLabel}`
      : `Audit of ${scopeLabel}: ${compliant}/${tracked} compliant ` +
        `(${Math.round(compliant / tracked * 100)}%)` +
        (nonConformant > 0
          ? `, ${nonConformant} non-conformance(s) requiring action`
          : ' — all items conformant');

    return {
      summary,
      items_tracked: tracked,
      items_compliant: compliant,
      items_non_conformant: nonConformant,
      action_items: actionItems,
    };
  }

  /** Reset tracked records (useful for testing). */
  reset(): void {
    this.materialRecords = [];
    this.toolRecords = [];
    this.machineRecords = [];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private inferSpecRequirements(material: string): SpecRequirements {
    const m = material.toLowerCase();
    if (m.includes('aluminum') || m.includes('aluminium')) {
      return {
        min_tensile_MPa: 270, min_yield_MPa: 215,
        min_elongation_pct: 8, hardness_range: [80, 120],
      };
    }
    if (m.includes('titanium')) {
      return {
        min_tensile_MPa: 860, min_yield_MPa: 790,
        min_elongation_pct: 10, hardness_range: [30, 39],
      };
    }
    if (m.includes('stainless')) {
      return {
        min_tensile_MPa: 515, min_yield_MPa: 205,
        min_elongation_pct: 30, hardness_range: [123, 217],
      };
    }
    if (m.includes('inconel')) {
      return {
        min_tensile_MPa: 1200, min_yield_MPa: 1000,
        min_elongation_pct: 10, hardness_range: [36, 44],
      };
    }
    // Generic steel
    return {
      min_tensile_MPa: 500, min_yield_MPa: 350,
      min_elongation_pct: 15, hardness_range: [150, 300],
    };
  }
}

/** Singleton */
export const certificationTrackingEngine = new CertificationTrackingEngine();
