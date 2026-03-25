/**
 * PRISM: MaterialCertTraceabilityEngine (E1088)
 * ==============================================
 * Full traceability chain: raw material cert -> stock assignment -> program ->
 * first article -> production -> shipping.
 * AS9100 / ITAR / NADCAP compliant chain-of-custody tracking.
 *
 * Methods:
 *  - registerCert         — store material certification with chemistry & mechanical props
 *  - assignStock          — link raw stock to a material cert
 *  - linkProgram          — link a CNC program run to stock (and transitively to cert)
 *  - recordInspection     — record quality/dimensional inspection results
 *  - recordShipment       — record shipping with cert package references
 *  - traceForward         — cert -> all parts made from this material
 *  - traceBackward        — part -> full material history back to mill cert
 *  - generateCertPackage  — full cert package for customer delivery
 *  - validateChain        — verify no gaps in traceability for a part
 *  - auditReport          — compliance audit report over a date range
 *
 * @shortcode E1088
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Chemistry breakdown from mill cert */
export interface ChemistryAnalysis {
  C?: number;
  Mn?: number;
  Si?: number;
  Cr?: number;
  Ni?: number;
  Mo?: number;
  V?: number;
  Ti?: number;
  Al?: number;
  Fe?: number;
  Cu?: number;
  S?: number;
  P?: number;
  [element: string]: number | undefined;
}

/** Mechanical properties from mill cert */
export interface MechanicalProperties {
  tensile_MPa?: number;
  yield_MPa?: number;
  elongation_pct?: number;
  reduction_area_pct?: number;
  hardness_HRC?: number;
  hardness_HB?: number;
  impact_J?: number;
}

/** Material certification record (mill cert / test report) */
export interface MaterialCert {
  cert_id: string;
  supplier: string;
  heat_lot: string;
  material_spec: string;        // AMS/ASTM/MIL spec designation
  material_name?: string;       // Human-readable name
  form?: string;                // Bar, plate, sheet, forging, etc.
  chemistry: ChemistryAnalysis;
  mechanical_properties: MechanicalProperties;
  test_date: string;            // ISO date
  expiry_date: string;          // ISO date
  document_ref?: string;        // Scanned cert file reference
  nadcap_process?: string;      // NADCAP special process if applicable
  itar_controlled?: boolean;
}

/** Raw stock assignment to a material cert */
export interface StockAssignment {
  stock_id: string;
  cert_id: string;
  raw_dimensions: {
    od_mm?: number;
    id_mm?: number;
    length_mm?: number;
    width_mm?: number;
    height_mm?: number;
    thickness_mm?: number;
  };
  purchased_date: string;
  location: string;             // Rack/bin location
  quantity?: number;
  status?: 'available' | 'allocated' | 'consumed' | 'quarantined';
}

/** Link between a CNC program run and stock material */
export interface ProgramLink {
  program_id: string;
  stock_id: string;
  cert_id: string;
  part_number?: string;
  operation_date: string;
  operator_id: string;
  machine_id?: string;
  operation_desc?: string;
  setup_sheet_ref?: string;
}

/** Inspection / quality check record */
export interface InspectionRecord {
  inspection_id: string;
  program_id: string;
  cert_id: string;
  part_number?: string;
  inspection_type: 'first_article' | 'in_process' | 'final' | 'source';
  dimensions_measured: DimensionMeasurement[];
  pass_fail: 'pass' | 'fail' | 'conditional';
  inspector_id: string;
  inspection_date: string;
  ncr_id?: string;             // Non-conformance report if failed
  notes?: string;
}

/** Single dimensional measurement */
export interface DimensionMeasurement {
  characteristic: string;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  actual: number;
  unit: string;
  in_spec: boolean;
}

/** Shipment record tying parts to cert packages */
export interface ShipmentRecord {
  shipment_id: string;
  parts: ShipmentPart[];
  cert_ids: string[];
  packing_slip_id: string;
  ship_date: string;
  tracking: string;
  customer?: string;
  po_number?: string;
  carrier?: string;
}

/** Individual part in a shipment */
export interface ShipmentPart {
  part_number: string;
  serial_number?: string;
  quantity: number;
  program_id: string;
}

// ---------------------------------------------------------------------------
// Traceability results
// ---------------------------------------------------------------------------

export interface ForwardTraceResult {
  cert_id: string;
  supplier: string;
  heat_lot: string;
  material_spec: string;
  stocks: string[];
  programs: string[];
  parts: string[];
  inspections: string[];
  shipments: string[];
}

export interface BackwardTraceResult {
  part_number: string;
  program_id: string;
  stock_id: string;
  cert: MaterialCert | null;
  inspections: InspectionRecord[];
  shipment: ShipmentRecord | null;
  chain_complete: boolean;
  gaps: string[];
}

export interface ChainValidation {
  part_id: string;
  valid: boolean;
  checks: ChainCheck[];
  gaps: string[];
  compliance_status: 'COMPLIANT' | 'NON_CONFORMANT' | 'INCOMPLETE';
}

export interface ChainCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
}

export interface CertPackage {
  shipment_id: string;
  customer: string;
  ship_date: string;
  parts: ShipmentPart[];
  material_certs: MaterialCert[];
  inspections: InspectionRecord[];
  chain_validations: ChainValidation[];
  package_complete: boolean;
  missing_items: string[];
}

export interface AuditReportResult {
  date_range: { start: string; end: string };
  total_certs: number;
  total_shipments: number;
  total_inspections: number;
  expired_certs: string[];
  broken_chains: string[];
  uninspected_parts: string[];
  compliance_score: number;
  findings: AuditFinding[];
}

export interface AuditFinding {
  severity: 'critical' | 'major' | 'minor' | 'observation';
  category: string;
  description: string;
  affected_ids: string[];
  corrective_action?: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class MaterialCertTraceabilityEngine {
  private certs = new Map<string, MaterialCert>();
  private stocks = new Map<string, StockAssignment>();
  private programs = new Map<string, ProgramLink>();
  private inspections = new Map<string, InspectionRecord>();
  private shipments = new Map<string, ShipmentRecord>();

  // -------------------------------------------------------------------------
  // Registration / storage
  // -------------------------------------------------------------------------

  /**
   * Register a material certification (mill cert / test report).
   * Validates required fields and checks expiry.
   */
  registerCert(cert: MaterialCert): { stored: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (!cert.cert_id || !cert.heat_lot || !cert.material_spec) {
      return { stored: false, warnings: ['Missing required fields: cert_id, heat_lot, material_spec'] };
    }
    if (this.isCertExpired(cert)) {
      warnings.push(`Certificate ${cert.cert_id} is expired (expiry: ${cert.expiry_date})`);
    }
    if (!cert.chemistry || Object.keys(cert.chemistry).length === 0) {
      warnings.push('No chemistry data provided');
    }
    if (!cert.mechanical_properties || Object.keys(cert.mechanical_properties).length === 0) {
      warnings.push('No mechanical properties provided');
    }
    this.certs.set(cert.cert_id, cert);
    return { stored: true, warnings };
  }

  /**
   * Assign raw stock to a material cert. Links physical material to its certification.
   */
  assignStock(assignment: StockAssignment): { assigned: boolean; error?: string } {
    if (!this.certs.has(assignment.cert_id)) {
      return { assigned: false, error: `Certificate ${assignment.cert_id} not found. Register cert first.` };
    }
    const a: StockAssignment = { ...assignment, status: assignment.status ?? 'available' };
    this.stocks.set(a.stock_id, a);
    return { assigned: true };
  }

  /**
   * Link a CNC program run to a stock item, establishing the material chain.
   */
  linkProgram(link: ProgramLink): { linked: boolean; error?: string } {
    if (!this.stocks.has(link.stock_id)) {
      return { linked: false, error: `Stock ${link.stock_id} not found. Assign stock first.` };
    }
    const stock = this.stocks.get(link.stock_id)!;
    if (stock.cert_id !== link.cert_id) {
      return { linked: false, error: `Cert mismatch: stock ${link.stock_id} is linked to ${stock.cert_id}, not ${link.cert_id}` };
    }
    // Mark stock as allocated/consumed
    stock.status = 'consumed';
    this.stocks.set(link.stock_id, stock);
    this.programs.set(link.program_id, link);
    return { linked: true };
  }

  /**
   * Record a quality / dimensional inspection for a program run.
   */
  recordInspection(inspection: InspectionRecord): { recorded: boolean; error?: string } {
    if (!this.programs.has(inspection.program_id)) {
      return { recorded: false, error: `Program ${inspection.program_id} not found. Link program first.` };
    }
    // Auto-compute in_spec for each measurement if not set
    for (const dim of inspection.dimensions_measured) {
      const upper = dim.nominal + dim.tolerance_plus;
      const lower = dim.nominal - Math.abs(dim.tolerance_minus);
      dim.in_spec = dim.actual >= lower && dim.actual <= upper;
    }
    // Derive pass_fail from measurements if all in spec
    const allInSpec = inspection.dimensions_measured.every(d => d.in_spec);
    if (!allInSpec && inspection.pass_fail === 'pass') {
      inspection.pass_fail = 'conditional';
    }
    this.inspections.set(inspection.inspection_id, inspection);
    return { recorded: true };
  }

  /**
   * Record a shipment with linked parts and cert references.
   */
  recordShipment(shipment: ShipmentRecord): { recorded: boolean; warnings: string[] } {
    const warnings: string[] = [];
    // Validate all referenced certs exist
    for (const cid of shipment.cert_ids) {
      if (!this.certs.has(cid)) {
        warnings.push(`Certificate ${cid} not found in registry`);
      }
    }
    // Validate all parts have programs
    for (const part of shipment.parts) {
      if (!this.programs.has(part.program_id)) {
        warnings.push(`Program ${part.program_id} for part ${part.part_number} not found`);
      }
    }
    this.shipments.set(shipment.shipment_id, shipment);
    return { recorded: true, warnings };
  }

  // -------------------------------------------------------------------------
  // Traceability queries
  // -------------------------------------------------------------------------

  /**
   * Trace forward from a cert to all parts, inspections, and shipments
   * derived from this material.
   */
  traceForward(cert_id: string): ForwardTraceResult | { error: string } {
    const cert = this.certs.get(cert_id);
    if (!cert) return { error: `Certificate ${cert_id} not found` };

    const stocks: string[] = [];
    const programs: string[] = [];
    const parts: string[] = [];
    const inspectionIds: string[] = [];
    const shipmentIds: string[] = [];

    // Find all stocks linked to this cert
    for (const [sid, stock] of this.stocks) {
      if (stock.cert_id === cert_id) {
        stocks.push(sid);
      }
    }
    // Find all programs using those stocks
    for (const [pid, prog] of this.programs) {
      if (stocks.includes(prog.stock_id)) {
        programs.push(pid);
        if (prog.part_number) parts.push(prog.part_number);
      }
    }
    // Find inspections for those programs
    for (const [iid, insp] of this.inspections) {
      if (programs.includes(insp.program_id)) {
        inspectionIds.push(iid);
      }
    }
    // Find shipments containing those parts/programs
    for (const [shid, ship] of this.shipments) {
      const hasLinkedPart = ship.parts.some(p => programs.includes(p.program_id));
      if (hasLinkedPart || ship.cert_ids.includes(cert_id)) {
        shipmentIds.push(shid);
      }
    }

    return {
      cert_id,
      supplier: cert.supplier,
      heat_lot: cert.heat_lot,
      material_spec: cert.material_spec,
      stocks,
      programs,
      parts: [...new Set(parts)],
      inspections: inspectionIds,
      shipments: shipmentIds,
    };
  }

  /**
   * Trace backward from a part to its complete material history.
   * Resolves the full chain: part -> program -> stock -> cert.
   */
  traceBackward(part_id: string): BackwardTraceResult {
    const gaps: string[] = [];
    // Find program that produced this part
    let foundProgram: ProgramLink | null = null;
    for (const [, prog] of this.programs) {
      if (prog.part_number === part_id || prog.program_id === part_id) {
        foundProgram = prog;
        break;
      }
    }
    if (!foundProgram) {
      return {
        part_number: part_id,
        program_id: '',
        stock_id: '',
        cert: null,
        inspections: [],
        shipment: null,
        chain_complete: false,
        gaps: ['No program found for this part'],
      };
    }

    const cert = this.certs.get(foundProgram.cert_id) ?? null;
    if (!cert) gaps.push(`Certificate ${foundProgram.cert_id} not found`);

    const stock = this.stocks.get(foundProgram.stock_id);
    if (!stock) gaps.push(`Stock ${foundProgram.stock_id} not found`);

    // Gather inspections
    const inspections: InspectionRecord[] = [];
    for (const [, insp] of this.inspections) {
      if (insp.program_id === foundProgram.program_id) {
        inspections.push(insp);
      }
    }
    if (inspections.length === 0) gaps.push('No inspection records found');

    // Find shipment
    let shipment: ShipmentRecord | null = null;
    for (const [, ship] of this.shipments) {
      if (ship.parts.some(p => p.program_id === foundProgram!.program_id)) {
        shipment = ship;
        break;
      }
    }

    return {
      part_number: part_id,
      program_id: foundProgram.program_id,
      stock_id: foundProgram.stock_id,
      cert,
      inspections,
      shipment,
      chain_complete: gaps.length === 0,
      gaps,
    };
  }

  // -------------------------------------------------------------------------
  // Cert package & validation
  // -------------------------------------------------------------------------

  /**
   * Generate a complete certification package for a shipment.
   * Includes material certs, inspection reports, and chain validations.
   */
  generateCertPackage(shipment_id: string): CertPackage | { error: string } {
    const shipment = this.shipments.get(shipment_id);
    if (!shipment) return { error: `Shipment ${shipment_id} not found` };

    const materialCerts: MaterialCert[] = [];
    const allInspections: InspectionRecord[] = [];
    const chainValidations: ChainValidation[] = [];
    const missing: string[] = [];

    // Gather certs
    for (const cid of shipment.cert_ids) {
      const cert = this.certs.get(cid);
      if (cert) {
        materialCerts.push(cert);
      } else {
        missing.push(`Material cert ${cid}`);
      }
    }

    // Gather inspections and validate chains for each part
    for (const part of shipment.parts) {
      // Inspections
      for (const [, insp] of this.inspections) {
        if (insp.program_id === part.program_id) {
          allInspections.push(insp);
        }
      }

      // Chain validation
      const validation = this.validateChain(part.part_number || part.program_id);
      chainValidations.push(validation);

      // Check for first-article inspection
      const hasFAI = allInspections.some(
        i => i.program_id === part.program_id && i.inspection_type === 'first_article'
      );
      if (!hasFAI) {
        missing.push(`First article inspection for ${part.part_number}`);
      }
    }

    if (allInspections.length === 0) {
      missing.push('No inspection records found for any parts');
    }

    return {
      shipment_id,
      customer: shipment.customer ?? 'Unknown',
      ship_date: shipment.ship_date,
      parts: shipment.parts,
      material_certs: materialCerts,
      inspections: allInspections,
      chain_validations: chainValidations,
      package_complete: missing.length === 0,
      missing_items: missing,
    };
  }

  /**
   * Validate the full traceability chain for a part.
   * Checks: cert exists and is valid, spec matches, all operations traced,
   * inspection recorded, and no gaps exist.
   */
  validateChain(part_id: string): ChainValidation {
    const checks: ChainCheck[] = [];
    const gaps: string[] = [];

    // 1. Find program
    const trace = this.traceBackward(part_id);

    // Check: program exists
    if (!trace.program_id) {
      checks.push({ check: 'program_linked', status: 'fail', detail: 'No program found for part' });
      gaps.push('No program link');
    } else {
      checks.push({ check: 'program_linked', status: 'pass', detail: `Program ${trace.program_id}` });
    }

    // Check: stock assigned
    if (!trace.stock_id) {
      checks.push({ check: 'stock_assigned', status: 'fail', detail: 'No stock assignment found' });
      gaps.push('No stock assignment');
    } else {
      checks.push({ check: 'stock_assigned', status: 'pass', detail: `Stock ${trace.stock_id}` });
    }

    // Check: cert exists and not expired
    if (!trace.cert) {
      checks.push({ check: 'cert_valid', status: 'fail', detail: 'No material cert found' });
      gaps.push('No material certification');
    } else if (this.isCertExpired(trace.cert)) {
      checks.push({
        check: 'cert_valid',
        status: 'fail',
        detail: `Cert ${trace.cert.cert_id} expired on ${trace.cert.expiry_date}`,
      });
      gaps.push('Material cert expired');
    } else {
      checks.push({ check: 'cert_valid', status: 'pass', detail: `Cert ${trace.cert.cert_id} valid` });
    }

    // Check: inspection recorded
    if (trace.inspections.length === 0) {
      checks.push({ check: 'inspection_recorded', status: 'fail', detail: 'No inspection records' });
      gaps.push('No inspection recorded');
    } else {
      const allPass = trace.inspections.every(i => i.pass_fail === 'pass');
      const status = allPass ? 'pass' : 'warning';
      checks.push({
        check: 'inspection_recorded',
        status,
        detail: `${trace.inspections.length} inspection(s), ${allPass ? 'all passing' : 'some non-conformant'}`,
      });
      if (!allPass) gaps.push('Non-conformant inspection results');
    }

    // Check: first article inspection exists
    const hasFAI = trace.inspections.some(i => i.inspection_type === 'first_article');
    if (!hasFAI && trace.inspections.length > 0) {
      checks.push({
        check: 'first_article_inspection',
        status: 'warning',
        detail: 'No first article inspection found',
      });
    } else if (hasFAI) {
      checks.push({ check: 'first_article_inspection', status: 'pass', detail: 'FAI completed' });
    }

    // Check: all operations traced (operator recorded)
    if (trace.program_id) {
      const prog = this.programs.get(trace.program_id);
      if (prog && !prog.operator_id) {
        checks.push({ check: 'operator_traced', status: 'warning', detail: 'No operator ID recorded' });
      } else if (prog) {
        checks.push({ check: 'operator_traced', status: 'pass', detail: `Operator: ${prog.operator_id}` });
      }
    }

    // Determine compliance status
    const hasFail = checks.some(c => c.status === 'fail');
    const hasWarning = checks.some(c => c.status === 'warning');
    let compliance_status: 'COMPLIANT' | 'NON_CONFORMANT' | 'INCOMPLETE';
    if (hasFail) {
      compliance_status = 'NON_CONFORMANT';
    } else if (hasWarning) {
      compliance_status = 'INCOMPLETE';
    } else {
      compliance_status = 'COMPLIANT';
    }

    return {
      part_id,
      valid: !hasFail,
      checks,
      gaps,
      compliance_status,
    };
  }

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  /**
   * Generate a compliance audit report for the given date range.
   * Scans all records for expired certs, broken chains, missing inspections.
   */
  auditReport(start_date: string, end_date: string): AuditReportResult {
    const findings: AuditFinding[] = [];
    const expiredCerts: string[] = [];
    const brokenChains: string[] = [];
    const uninspectedParts: string[] = [];

    const start = new Date(start_date).getTime();
    const end = new Date(end_date).getTime();

    // Check all certs for expiry
    for (const [cid, cert] of this.certs) {
      if (this.isCertExpired(cert)) {
        expiredCerts.push(cid);
        findings.push({
          severity: 'critical',
          category: 'Material Certification',
          description: `Cert ${cid} (${cert.material_spec}, heat ${cert.heat_lot}) expired ${cert.expiry_date}`,
          affected_ids: [cid],
          corrective_action: 'Obtain renewed certification or quarantine material',
        });
      }
    }

    // Check all programs for chain completeness
    const programsInRange: ProgramLink[] = [];
    for (const [, prog] of this.programs) {
      const opDate = new Date(prog.operation_date).getTime();
      if (opDate >= start && opDate <= end) {
        programsInRange.push(prog);
      }
    }

    for (const prog of programsInRange) {
      const partId = prog.part_number || prog.program_id;
      const validation = this.validateChain(partId);
      if (validation.compliance_status === 'NON_CONFORMANT') {
        brokenChains.push(partId);
        findings.push({
          severity: 'major',
          category: 'Traceability',
          description: `Broken traceability chain for ${partId}: ${validation.gaps.join(', ')}`,
          affected_ids: [prog.program_id, prog.stock_id, prog.cert_id],
          corrective_action: 'Investigate and restore missing chain links',
        });
      }

      // Check for inspection
      let hasInspection = false;
      for (const [, insp] of this.inspections) {
        if (insp.program_id === prog.program_id) {
          hasInspection = true;
          break;
        }
      }
      if (!hasInspection) {
        uninspectedParts.push(partId);
      }
    }

    if (uninspectedParts.length > 0) {
      findings.push({
        severity: 'major',
        category: 'Inspection',
        description: `${uninspectedParts.length} part(s) shipped or in-process without inspection records`,
        affected_ids: uninspectedParts,
        corrective_action: 'Locate inspection records or perform retroactive inspection',
      });
    }

    // Count shipments in range
    let shipmentsInRange = 0;
    for (const [, ship] of this.shipments) {
      const sd = new Date(ship.ship_date).getTime();
      if (sd >= start && sd <= end) shipmentsInRange++;
    }

    // Count inspections in range
    let inspectionsInRange = 0;
    for (const [, insp] of this.inspections) {
      const id = new Date(insp.inspection_date).getTime();
      if (id >= start && id <= end) inspectionsInRange++;
    }

    // Compliance score: percentage of programs with complete chains
    const totalPrograms = programsInRange.length || 1;
    const compliantPrograms = totalPrograms - brokenChains.length;
    const compliance_score = Math.round((compliantPrograms / totalPrograms) * 100);

    return {
      date_range: { start: start_date, end: end_date },
      total_certs: this.certs.size,
      total_shipments: shipmentsInRange,
      total_inspections: inspectionsInRange,
      expired_certs: expiredCerts,
      broken_chains: brokenChains,
      uninspected_parts: uninspectedParts,
      compliance_score,
      findings,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Check if a material cert has passed its expiry date */
  private isCertExpired(cert: MaterialCert): boolean {
    if (!cert.expiry_date) return false;
    return new Date(cert.expiry_date).getTime() < Date.now();
  }
}

/** Singleton */
export const materialCertTraceabilityEngine = new MaterialCertTraceabilityEngine();
