/**
 * PRISM: IndustryStandardsComplianceEngine
 * ==========================================
 * Check parts/processes against industry standards (ISO 2768, ISO 1302,
 * AS9100, ISO 13485, IATF 16949, DIN 65151, ISO 14644).
 *
 * Methods:
 *  - checkCompliance   — validate part against applicable standards
 *  - getRequirements   — list full requirements for industry/process
 *  - suggestStandards  — rank applicable standards for a material/process/application
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndustryType = 'aerospace' | 'automotive' | 'medical' | 'general';

export interface PartSpec {
  material: string;
  surface_finish_Ra_um?: number;
  tolerances_mm?: number[];
  hardness_HRC?: number;
  process?: string;
}

export interface ComplianceCheckInput {
  industry: IndustryType;
  standards?: string[];
  part: PartSpec;
}

export interface StandardCheck {
  standard: string;
  requirement: string;
  actual_value: string | number | undefined;
  passes: boolean;
  gap?: string;
}

export interface NonConformance {
  standard: string;
  issue: string;
  corrective_action: string;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  standard_checks: StandardCheck[];
  required_documentation: string[];
  non_conformances: NonConformance[];
}

export interface RequirementsInput {
  industry: IndustryType;
  process_type: string;
}

export interface Requirement {
  standard: string;
  category: string;
  requirement: string;
  mandatory: boolean;
}

export interface RequirementsResult {
  industry: IndustryType;
  process_type: string;
  requirements: Requirement[];
}

export interface SuggestInput {
  material: string;
  process: string;
  application?: string;
}

export interface SuggestedStandard {
  standard: string;
  title: string;
  relevance: number; // 0-1
  reason: string;
}

export interface SuggestResult {
  standards: SuggestedStandard[];
}

// ---------------------------------------------------------------------------
// ISO 2768 — General Tolerances (fine / medium / coarse)
// Dimension ranges in mm → tolerance limit in mm per class
// ---------------------------------------------------------------------------

interface ToleranceBand {
  max_dim_mm: number;
  fine_mm: number;
  medium_mm: number;
  coarse_mm: number;
}

const ISO_2768_TOLERANCES: ToleranceBand[] = [
  { max_dim_mm: 0.5,   fine_mm: 0.05,  medium_mm: 0.1,   coarse_mm: 0.2  },
  { max_dim_mm: 3,     fine_mm: 0.05,  medium_mm: 0.1,   coarse_mm: 0.2  },
  { max_dim_mm: 6,     fine_mm: 0.05,  medium_mm: 0.1,   coarse_mm: 0.3  },
  { max_dim_mm: 30,    fine_mm: 0.1,   medium_mm: 0.2,   coarse_mm: 0.5  },
  { max_dim_mm: 120,   fine_mm: 0.15,  medium_mm: 0.3,   coarse_mm: 0.8  },
  { max_dim_mm: 400,   fine_mm: 0.2,   medium_mm: 0.5,   coarse_mm: 1.2  },
  { max_dim_mm: 1000,  fine_mm: 0.3,   medium_mm: 0.8,   coarse_mm: 2.0  },
  { max_dim_mm: 2000,  fine_mm: 0.5,   medium_mm: 1.2,   coarse_mm: 3.0  },
  { max_dim_mm: 4000,  fine_mm: 0.5,   medium_mm: 2.0,   coarse_mm: 4.0  },
];

function iso2768Limit(dim_mm: number, cls: 'fine' | 'medium' | 'coarse'): number {
  for (const band of ISO_2768_TOLERANCES) {
    if (dim_mm <= band.max_dim_mm) {
      return band[`${cls}_mm`];
    }
  }
  return ISO_2768_TOLERANCES[ISO_2768_TOLERANCES.length - 1][`${cls}_mm`];
}

// ---------------------------------------------------------------------------
// ISO 1302 — Surface Texture: Ra limits by manufacturing process
// ---------------------------------------------------------------------------

const ISO_1302_PROCESS_RA: Record<string, { typical_Ra_um: number; achievable_Ra_um: number }> = {
  turning:     { typical_Ra_um: 1.6,  achievable_Ra_um: 0.4  },
  milling:     { typical_Ra_um: 1.6,  achievable_Ra_um: 0.4  },
  drilling:    { typical_Ra_um: 3.2,  achievable_Ra_um: 1.6  },
  grinding:    { typical_Ra_um: 0.4,  achievable_Ra_um: 0.05 },
  honing:      { typical_Ra_um: 0.2,  achievable_Ra_um: 0.025 },
  lapping:     { typical_Ra_um: 0.05, achievable_Ra_um: 0.012 },
  polishing:   { typical_Ra_um: 0.1,  achievable_Ra_um: 0.012 },
  broaching:   { typical_Ra_um: 0.8,  achievable_Ra_um: 0.4  },
  reaming:     { typical_Ra_um: 0.8,  achievable_Ra_um: 0.2  },
  boring:      { typical_Ra_um: 0.8,  achievable_Ra_um: 0.2  },
  edm:         { typical_Ra_um: 3.2,  achievable_Ra_um: 0.8  },
  laser:       { typical_Ra_um: 6.3,  achievable_Ra_um: 1.6  },
  casting:     { typical_Ra_um: 12.5, achievable_Ra_um: 3.2  },
  forging:     { typical_Ra_um: 12.5, achievable_Ra_um: 3.2  },
};

// ---------------------------------------------------------------------------
// AS9100 (Aerospace) requirements
// ---------------------------------------------------------------------------

interface AS9100Req {
  category: string;
  requirements: string[];
  documentation: string[];
}

const AS9100_REQUIREMENTS: AS9100Req[] = [
  {
    category: 'material_traceability',
    requirements: [
      'Full material traceability from raw stock to finished part',
      'Heat lot tracking with mill certificate verification',
      'Material conformance certificate per AMS/ASTM spec',
      'Positive material identification (PMI) for critical materials',
    ],
    documentation: ['Material Certificate', 'PMI Report', 'Heat Lot Record'],
  },
  {
    category: 'process_validation',
    requirements: [
      'Special process qualification (NADCAP where applicable)',
      'First Article Inspection (FAI) per AS9102',
      'Process capability Cpk >= 1.33 for critical dimensions',
      'Statistical Process Control for key characteristics',
    ],
    documentation: ['FAI Report (AS9102)', 'Process Capability Study', 'SPC Charts'],
  },
  {
    category: 'surface_integrity',
    requirements: [
      'Surface finish Ra per DIN 65151 or drawing callout',
      'No grinding burns or thermal damage',
      'Shot peening coverage >= 100% for fatigue-critical surfaces',
      'Residual stress measurement for critical features',
    ],
    documentation: ['Surface Finish Report', 'Nital Etch Inspection', 'Shot Peen Report'],
  },
  {
    category: 'dimensional',
    requirements: [
      'All dimensions per drawing with tolerances',
      'CMM report for critical dimensions',
      'GD&T conformance per ASME Y14.5',
      'Measurement uncertainty < 10% of tolerance',
    ],
    documentation: ['CMM Report', 'Dimensional Report', 'GD&T Analysis'],
  },
];

// ---------------------------------------------------------------------------
// DIN 65151 — Aerospace surface finish limits by function
// ---------------------------------------------------------------------------

const DIN_65151_LIMITS: Record<string, { Ra_max_um: number; Rz_max_um: number }> = {
  bearing_surface:     { Ra_max_um: 0.4, Rz_max_um: 1.6  },
  sealing_surface:     { Ra_max_um: 0.8, Rz_max_um: 4.0  },
  fatigue_critical:    { Ra_max_um: 0.8, Rz_max_um: 4.0  },
  hydraulic_bore:      { Ra_max_um: 0.2, Rz_max_um: 1.0  },
  sliding_surface:     { Ra_max_um: 0.4, Rz_max_um: 2.0  },
  general_machined:    { Ra_max_um: 3.2, Rz_max_um: 12.5 },
  cosmetic:            { Ra_max_um: 0.8, Rz_max_um: 4.0  },
};

// ---------------------------------------------------------------------------
// ISO 13485 (Medical) requirements
// ---------------------------------------------------------------------------

interface MedicalReq {
  category: string;
  requirements: string[];
  documentation: string[];
}

const ISO_13485_REQUIREMENTS: MedicalReq[] = [
  {
    category: 'biocompatibility',
    requirements: [
      'Biocompatibility testing per ISO 10993',
      'Material certification for implant-grade (if applicable)',
      'Cytotoxicity, sensitization, irritation testing',
      'Leachable/extractable analysis for fluid-contact parts',
    ],
    documentation: ['ISO 10993 Test Report', 'Material Biocompatibility Certificate'],
  },
  {
    category: 'sterilization',
    requirements: [
      'Sterilization validation per ISO 11135/11137/17665',
      'Sterility assurance level (SAL) 10^-6',
      'Packaging validation per ISO 11607',
      'Shelf life validation',
    ],
    documentation: ['Sterilization Validation Report', 'Packaging Validation', 'Shelf Life Study'],
  },
  {
    category: 'validation',
    requirements: [
      'Design validation per ISO 13485 clause 7.3.6',
      'Process validation (IQ/OQ/PQ)',
      'Software validation (if CNC programs qualify)',
      'Risk management per ISO 14971',
    ],
    documentation: ['Design Validation Report', 'IQ/OQ/PQ Protocols', 'Risk Management File'],
  },
  {
    category: 'traceability',
    requirements: [
      'Unique Device Identification (UDI) per FDA/EU MDR',
      'Full lot/batch traceability',
      'Device History Record (DHR)',
      'Post-market surveillance plan',
    ],
    documentation: ['UDI Assignment', 'DHR', 'Post-Market Surveillance Plan'],
  },
];

// ---------------------------------------------------------------------------
// IATF 16949 (Automotive) requirements
// ---------------------------------------------------------------------------

interface AutomotiveReq {
  category: string;
  requirements: string[];
  documentation: string[];
  cpk_min: number;
}

const IATF_16949_REQUIREMENTS: AutomotiveReq[] = [
  {
    category: 'ppap',
    requirements: [
      'Production Part Approval Process (PPAP) Level 3 submission',
      'Control Plan per AIAG',
      'Process Flow Diagram',
      'DFMEA and PFMEA',
    ],
    documentation: ['PPAP Package', 'Control Plan', 'FMEA', 'Process Flow'],
    cpk_min: 1.33,
  },
  {
    category: 'process_capability',
    requirements: [
      'Cpk >= 1.33 for standard characteristics',
      'Cpk >= 1.67 for safety/critical characteristics',
      'Measurement System Analysis (MSA) per AIAG',
      'Gage R&R < 10% for critical, < 30% for standard',
    ],
    documentation: ['Cpk Study', 'MSA Report', 'Gage R&R Study'],
    cpk_min: 1.33,
  },
  {
    category: 'quality_system',
    requirements: [
      'Layered Process Audit (LPA)',
      'Reaction plans for out-of-control conditions',
      'Customer-specific requirements (CSR)',
      '8D problem solving for non-conformances',
    ],
    documentation: ['LPA Records', 'Reaction Plans', 'CSR Matrix'],
    cpk_min: 1.33,
  },
];

// ---------------------------------------------------------------------------
// ISO 14644 — Cleanroom classes (particles >= 0.5um per m^3)
// ---------------------------------------------------------------------------

const ISO_14644_CLASSES: Record<number, { particles_per_m3_05um: number }> = {
  1: { particles_per_m3_05um: 10 },
  2: { particles_per_m3_05um: 100 },
  3: { particles_per_m3_05um: 1000 },
  4: { particles_per_m3_05um: 10000 },
  5: { particles_per_m3_05um: 100000 },
  6: { particles_per_m3_05um: 1000000 },
  7: { particles_per_m3_05um: 10000000 },
  8: { particles_per_m3_05um: 100000000 },
  9: { particles_per_m3_05um: 1000000000 },
};

// ---------------------------------------------------------------------------
// Industry → default standards mapping
// ---------------------------------------------------------------------------

const INDUSTRY_STANDARDS: Record<IndustryType, string[]> = {
  aerospace:   ['ISO 2768', 'ISO 1302', 'AS9100', 'DIN 65151'],
  automotive:  ['ISO 2768', 'ISO 1302', 'IATF 16949'],
  medical:     ['ISO 2768', 'ISO 1302', 'ISO 13485', 'ISO 14644'],
  general:     ['ISO 2768', 'ISO 1302'],
};

// ---------------------------------------------------------------------------
// Tolerance class selection by industry
// ---------------------------------------------------------------------------

function toleranceClassForIndustry(industry: IndustryType): 'fine' | 'medium' | 'coarse' {
  switch (industry) {
    case 'aerospace': return 'fine';
    case 'medical':   return 'fine';
    case 'automotive': return 'medium';
    case 'general':   return 'medium';
  }
}

// ---------------------------------------------------------------------------
// Material → applicable standards hints
// ---------------------------------------------------------------------------

const MATERIAL_STANDARD_HINTS: Record<string, string[]> = {
  'titanium':   ['AMS 4911', 'AMS 4928', 'ASTM B348', 'AS9100'],
  'inconel':    ['AMS 5662', 'AMS 5663', 'AS9100'],
  'aluminum':   ['AMS 4027', 'AMS-QQ-A-250', 'ASTM B209'],
  'stainless':  ['AMS 5510', 'ASTM A240', 'ASTM A276'],
  'steel':      ['ASTM A29', 'ASTM A108', 'AMS 6415'],
  'cobalt':     ['ASTM F75', 'ASTM F1537', 'ISO 5832-12'],
  'peek':       ['ASTM D6262'],
  'nitinol':    ['ASTM F2063'],
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class IndustryStandardsComplianceEngine {
  /**
   * Check a part/process against industry standards.
   */
  checkCompliance(input: ComplianceCheckInput): ComplianceCheckResult {
    const { industry, part } = input;
    const applicableStandards = input.standards ?? INDUSTRY_STANDARDS[industry] ?? INDUSTRY_STANDARDS.general;

    const checks: StandardCheck[] = [];
    const docs: string[] = [];
    const nonConformances: NonConformance[] = [];

    for (const std of applicableStandards) {
      const upperStd = std.toUpperCase();

      // --- ISO 2768 tolerance checks ---
      if (upperStd.includes('ISO 2768') || upperStd.includes('2768')) {
        const cls = toleranceClassForIndustry(industry);
        if (part.tolerances_mm && part.tolerances_mm.length > 0) {
          for (let i = 0; i < part.tolerances_mm.length; i++) {
            const tol = part.tolerances_mm[i];
            // Assume dimension ~ 50mm for general check if not specified
            const dim = 50;
            const limit = iso2768Limit(dim, cls);
            const passes = tol <= limit;
            checks.push({
              standard: 'ISO 2768',
              requirement: `Tolerance class ${cls}: ±${limit} mm for dim ≤${dim} mm`,
              actual_value: tol,
              passes,
              gap: passes ? undefined : `Tolerance ${tol} mm exceeds ${cls} class limit ±${limit} mm`,
            });
            if (!passes) {
              nonConformances.push({
                standard: 'ISO 2768',
                issue: `Tolerance[${i}] = ${tol} mm exceeds ${cls} limit of ±${limit} mm`,
                corrective_action: `Tighten machining process or reclassify tolerance class`,
              });
            }
          }
        } else {
          checks.push({
            standard: 'ISO 2768',
            requirement: `Tolerance class ${cls} applied`,
            actual_value: 'No tolerances specified',
            passes: true,
          });
        }
        docs.push('Dimensional Inspection Report');
      }

      // --- ISO 1302 surface texture checks ---
      if (upperStd.includes('ISO 1302') || upperStd.includes('1302')) {
        const process = (part.process || 'milling').toLowerCase();
        const procData = ISO_1302_PROCESS_RA[process] ?? ISO_1302_PROCESS_RA.milling;
        if (part.surface_finish_Ra_um !== undefined) {
          const passes = part.surface_finish_Ra_um <= procData.typical_Ra_um;
          checks.push({
            standard: 'ISO 1302',
            requirement: `Ra ≤ ${procData.typical_Ra_um} µm (typical for ${process})`,
            actual_value: part.surface_finish_Ra_um,
            passes,
            gap: passes ? undefined : `Ra ${part.surface_finish_Ra_um} µm exceeds typical ${procData.typical_Ra_um} µm for ${process}`,
          });
          if (!passes) {
            const achievable = part.surface_finish_Ra_um <= procData.achievable_Ra_um;
            nonConformances.push({
              standard: 'ISO 1302',
              issue: `Surface finish Ra ${part.surface_finish_Ra_um} µm exceeds typical for ${process}`,
              corrective_action: achievable
                ? `Optimize cutting parameters — achievable Ra for ${process} is ${procData.achievable_Ra_um} µm`
                : `Consider alternate process (grinding/honing) to achieve required finish`,
            });
          }
        } else {
          checks.push({
            standard: 'ISO 1302',
            requirement: `Typical Ra for ${process}: ${procData.typical_Ra_um} µm`,
            actual_value: 'Not specified',
            passes: true,
          });
        }
        docs.push('Surface Finish Report');
      }

      // --- AS9100 aerospace checks ---
      if (upperStd.includes('AS9100') || upperStd.includes('9100')) {
        for (const req of AS9100_REQUIREMENTS) {
          for (const r of req.requirements) {
            checks.push({
              standard: 'AS9100',
              requirement: r,
              actual_value: 'Audit required',
              passes: true, // Cannot auto-verify — flagged for audit
            });
          }
          docs.push(...req.documentation);
        }
      }

      // --- DIN 65151 aerospace surface ---
      if (upperStd.includes('DIN 65151') || upperStd.includes('65151')) {
        if (part.surface_finish_Ra_um !== undefined) {
          // Default to general_machined if no specific function
          const funcType = 'general_machined';
          const limits = DIN_65151_LIMITS[funcType];
          const passes = part.surface_finish_Ra_um <= limits.Ra_max_um;
          checks.push({
            standard: 'DIN 65151',
            requirement: `Ra ≤ ${limits.Ra_max_um} µm for ${funcType}`,
            actual_value: part.surface_finish_Ra_um,
            passes,
            gap: passes ? undefined : `Ra ${part.surface_finish_Ra_um} µm exceeds DIN 65151 limit of ${limits.Ra_max_um} µm`,
          });
          if (!passes) {
            nonConformances.push({
              standard: 'DIN 65151',
              issue: `Surface finish exceeds DIN 65151 ${funcType} limit`,
              corrective_action: `Add finishing pass or post-process to achieve Ra ≤ ${limits.Ra_max_um} µm`,
            });
          }
        }
        docs.push('Surface Integrity Report');
      }

      // --- ISO 13485 medical checks ---
      if (upperStd.includes('ISO 13485') || upperStd.includes('13485')) {
        for (const req of ISO_13485_REQUIREMENTS) {
          for (const r of req.requirements) {
            checks.push({
              standard: 'ISO 13485',
              requirement: r,
              actual_value: 'Audit required',
              passes: true,
            });
          }
          docs.push(...req.documentation);
        }
      }

      // --- ISO 14644 cleanroom ---
      if (upperStd.includes('ISO 14644') || upperStd.includes('14644')) {
        // Medical devices typically need class 7 or 8
        const requiredClass = industry === 'medical' ? 7 : 8;
        const maxParticles = ISO_14644_CLASSES[requiredClass].particles_per_m3_05um;
        checks.push({
          standard: 'ISO 14644',
          requirement: `Cleanroom class ${requiredClass}: ≤ ${maxParticles.toExponential()} particles/m³ (≥0.5µm)`,
          actual_value: 'Environment audit required',
          passes: true,
        });
        docs.push('Cleanroom Certification', 'Particle Count Report');
      }

      // --- IATF 16949 automotive checks ---
      if (upperStd.includes('IATF 16949') || upperStd.includes('16949')) {
        for (const req of IATF_16949_REQUIREMENTS) {
          for (const r of req.requirements) {
            checks.push({
              standard: 'IATF 16949',
              requirement: r,
              actual_value: 'Audit required',
              passes: true,
            });
          }
          docs.push(...req.documentation);
        }
      }
    }

    // Deduplicate documentation
    const uniqueDocs = [...new Set(docs)];

    const compliant = nonConformances.length === 0;
    return { compliant, standard_checks: checks, required_documentation: uniqueDocs, non_conformances: nonConformances };
  }

  /**
   * Get full requirements list for an industry/process combination.
   */
  getRequirements(input: RequirementsInput): RequirementsResult {
    const { industry, process_type } = input;
    const reqs: Requirement[] = [];
    const standards = INDUSTRY_STANDARDS[industry] ?? INDUSTRY_STANDARDS.general;

    for (const std of standards) {
      const upper = std.toUpperCase();

      if (upper.includes('ISO 2768')) {
        const cls = toleranceClassForIndustry(industry);
        reqs.push({
          standard: 'ISO 2768',
          category: 'dimensional',
          requirement: `General tolerances class ${cls} applied to all untoleranced dimensions`,
          mandatory: true,
        });
        for (const band of ISO_2768_TOLERANCES) {
          reqs.push({
            standard: 'ISO 2768',
            category: 'dimensional',
            requirement: `Dim ≤ ${band.max_dim_mm} mm: ±${band[`${cls}_mm`]} mm`,
            mandatory: true,
          });
        }
      }

      if (upper.includes('ISO 1302')) {
        const proc = process_type.toLowerCase();
        const procData = ISO_1302_PROCESS_RA[proc];
        if (procData) {
          reqs.push({
            standard: 'ISO 1302',
            category: 'surface_finish',
            requirement: `Typical Ra for ${proc}: ${procData.typical_Ra_um} µm`,
            mandatory: false,
          });
          reqs.push({
            standard: 'ISO 1302',
            category: 'surface_finish',
            requirement: `Best achievable Ra for ${proc}: ${procData.achievable_Ra_um} µm`,
            mandatory: false,
          });
        } else {
          reqs.push({
            standard: 'ISO 1302',
            category: 'surface_finish',
            requirement: `Surface texture indication required per ISO 1302`,
            mandatory: true,
          });
        }
      }

      if (upper.includes('AS9100')) {
        for (const req of AS9100_REQUIREMENTS) {
          for (const r of req.requirements) {
            reqs.push({ standard: 'AS9100', category: req.category, requirement: r, mandatory: true });
          }
        }
      }

      if (upper.includes('DIN 65151')) {
        for (const [func, limits] of Object.entries(DIN_65151_LIMITS)) {
          reqs.push({
            standard: 'DIN 65151',
            category: 'surface_integrity',
            requirement: `${func}: Ra ≤ ${limits.Ra_max_um} µm, Rz ≤ ${limits.Rz_max_um} µm`,
            mandatory: true,
          });
        }
      }

      if (upper.includes('ISO 13485')) {
        for (const req of ISO_13485_REQUIREMENTS) {
          for (const r of req.requirements) {
            reqs.push({ standard: 'ISO 13485', category: req.category, requirement: r, mandatory: true });
          }
        }
      }

      if (upper.includes('IATF 16949')) {
        for (const req of IATF_16949_REQUIREMENTS) {
          for (const r of req.requirements) {
            reqs.push({ standard: 'IATF 16949', category: req.category, requirement: r, mandatory: true });
          }
        }
      }

      if (upper.includes('ISO 14644')) {
        for (const [cls, data] of Object.entries(ISO_14644_CLASSES)) {
          reqs.push({
            standard: 'ISO 14644',
            category: 'cleanroom',
            requirement: `Class ${cls}: ≤ ${data.particles_per_m3_05um.toExponential()} particles/m³ (≥0.5µm)`,
            mandatory: industry === 'medical',
          });
        }
      }
    }

    return { industry, process_type, requirements: reqs };
  }

  /**
   * Suggest applicable standards for a material/process/application.
   */
  suggestStandards(input: SuggestInput): SuggestResult {
    const { material, process, application } = input;
    const matLower = material.toLowerCase();
    const procLower = process.toLowerCase();
    const appLower = (application || '').toLowerCase();
    const suggestions: SuggestedStandard[] = [];

    // ISO 2768 — always applicable
    suggestions.push({
      standard: 'ISO 2768',
      title: 'General tolerances for linear and angular dimensions',
      relevance: 0.95,
      reason: 'Applicable to all machined parts for untoleranced dimensions',
    });

    // ISO 1302 — always applicable for machined parts
    if (ISO_1302_PROCESS_RA[procLower]) {
      suggestions.push({
        standard: 'ISO 1302',
        title: 'Geometrical Product Specifications — Surface texture indication',
        relevance: 0.9,
        reason: `Defines surface texture requirements for ${procLower}`,
      });
    }

    // Aerospace standards
    const aeroMaterials = ['titanium', 'inconel', 'hastelloy', 'waspaloy', 'rene'];
    const isAero = aeroMaterials.some(m => matLower.includes(m)) ||
                   appLower.includes('aerospace') || appLower.includes('aviation') || appLower.includes('aircraft');
    if (isAero) {
      suggestions.push({
        standard: 'AS9100',
        title: 'Quality Management Systems — Aerospace',
        relevance: 0.95,
        reason: 'Aerospace material/application detected — AS9100 certification required',
      });
      suggestions.push({
        standard: 'DIN 65151',
        title: 'Aerospace — Surface roughness requirements',
        relevance: 0.85,
        reason: 'Defines Ra/Rz limits for aerospace functional surfaces',
      });
    }

    // Medical standards
    const medMaterials = ['cobalt', 'nitinol', 'peek', 'uhmwpe', 'cp-ti'];
    const isMed = medMaterials.some(m => matLower.includes(m)) ||
                  appLower.includes('medical') || appLower.includes('implant') || appLower.includes('surgical');
    if (isMed) {
      suggestions.push({
        standard: 'ISO 13485',
        title: 'Medical devices — Quality management systems',
        relevance: 0.95,
        reason: 'Medical device material/application detected',
      });
      suggestions.push({
        standard: 'ISO 14644',
        title: 'Cleanrooms and associated controlled environments',
        relevance: 0.7,
        reason: 'Medical device manufacturing may require cleanroom environment',
      });
      suggestions.push({
        standard: 'ISO 10993',
        title: 'Biological evaluation of medical devices',
        relevance: 0.9,
        reason: 'Biocompatibility testing required for patient-contact devices',
      });
    }

    // Automotive standards
    const isAuto = appLower.includes('automotive') || appLower.includes('vehicle') || appLower.includes('powertrain');
    if (isAuto) {
      suggestions.push({
        standard: 'IATF 16949',
        title: 'Quality management systems — Automotive',
        relevance: 0.95,
        reason: 'Automotive application detected — IATF certification required',
      });
    }

    // Material-specific standards
    for (const [mat, stds] of Object.entries(MATERIAL_STANDARD_HINTS)) {
      if (matLower.includes(mat)) {
        for (const std of stds) {
          if (!suggestions.some(s => s.standard === std)) {
            suggestions.push({
              standard: std,
              title: `Material specification for ${mat}`,
              relevance: 0.8,
              reason: `Material-specific standard for ${material}`,
            });
          }
        }
      }
    }

    // Sort by relevance descending
    suggestions.sort((a, b) => b.relevance - a.relevance);
    return { standards: suggestions };
  }
}

/** Singleton */
export const industryStandardsComplianceEngine = new IndustryStandardsComplianceEngine();
