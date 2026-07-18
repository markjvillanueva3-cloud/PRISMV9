/**
 * LegalComplianceOperatingEngine
 * ==============================
 * Legal + compliance operating layer for CNC manufacturing shops.
 * Covers 6 domains missing from the existing ComplianceEngine/IndustryStandardsComplianceEngine:
 *
 * 1. NDA Lifecycle — create, track, renew, expire, alert on NDAs
 * 2. Export Control — ITAR/EAR classification, denied-party screening, license tracking
 * 3. Document Retention — policy assignment, legal hold, destruction scheduling
 * 4. Audit Trail — queryable compliance event log with filtering and evidence packaging
 * 5. OSHA Safety — incident tracking, inspection records, OSHA 300 log generation
 * 6. Certification Tracking — AS9100/ISO 13485/NADCAP cert dates, renewal, scope
 *
 * All data is in-memory with append-only audit logging for compliance integrity.
 *
 * @version 1.0.0
 * @task SQ4-2-LEGAL
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NDA {
  id: string;
  counterparty: string;
  type: "mutual" | "unilateral_inbound" | "unilateral_outbound";
  effective_date: string;        // ISO date
  expiration_date: string;       // ISO date
  auto_renew: boolean;
  scope: string;
  status: "active" | "expired" | "terminated" | "pending";
  signed_by: string;
  created_at: string;
}

export interface ExportClassification {
  id: string;
  part_number: string;
  description: string;
  regime: "ITAR" | "EAR";
  classification: string;        // e.g., USML Cat IV or ECCN 2B001
  jurisdiction: string;
  license_required: boolean;
  license_number?: string;
  license_expiry?: string;
  reviewed_by: string;
  reviewed_date: string;
}

export interface DeniedPartyCheckResult {
  entity: string;
  screened_at: string;
  lists_checked: string[];
  matches: Array<{ list: string; entry: string; score: number }>;
  cleared: boolean;
}

export interface RetentionPolicy {
  id: string;
  document_type: string;
  retention_years: number;
  regulatory_basis: string;      // e.g., "FAR 4.703", "AS9100 7.5.3"
  destruction_method: "shred" | "digital_wipe" | "incinerate";
  legal_hold: boolean;
  hold_reason?: string;
}

export interface RetentionRecord {
  id: string;
  document_id: string;
  document_type: string;
  policy_id: string;
  created_date: string;
  retain_until: string;
  status: "active" | "held" | "pending_destruction" | "destroyed";
  destroyed_date?: string;
  destroyed_by?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  domain: "nda" | "export" | "retention" | "safety" | "certification" | "general";
  action: string;
  actor: string;
  entity_id: string;
  details: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
}

export interface SafetyIncident {
  id: string;
  date: string;
  type: "injury" | "illness" | "near_miss" | "property_damage";
  severity: "first_aid" | "recordable" | "lost_time" | "fatality";
  location: string;
  description: string;
  employee_id?: string;
  root_cause?: string;
  corrective_action?: string;
  osha_reportable: boolean;
  days_away: number;
  days_restricted: number;
  status: "open" | "investigating" | "closed";
}

export interface SafetyInspection {
  id: string;
  date: string;
  inspector: string;
  area: string;
  findings: Array<{ item: string; status: "pass" | "fail" | "warning"; note?: string }>;
  overall_status: "pass" | "conditional" | "fail";
  next_inspection_date: string;
}

export interface Certification {
  id: string;
  standard: string;             // e.g., "AS9100D", "ISO 13485:2016", "NADCAP AC7004"
  scope: string;
  certifying_body: string;
  issue_date: string;
  expiry_date: string;
  status: "active" | "expired" | "suspended" | "pending";
  surveillance_dates: string[];
  last_audit_date?: string;
  nonconformances_open: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DENIED_PARTY_LISTS = [
  "SDN (OFAC)",
  "Entity List (BIS)",
  "Denied Persons List (BIS)",
  "Unverified List (BIS)",
  "Debarred List (DDTC)",
  "UN Sanctions",
] as const;

const DEFAULT_RETENTION_POLICIES: Omit<RetentionPolicy, "id">[] = [
  { document_type: "quality_records", retention_years: 7, regulatory_basis: "AS9100 7.5.3.2", destruction_method: "shred", legal_hold: false },
  { document_type: "contract_records", retention_years: 6, regulatory_basis: "FAR 4.703", destruction_method: "shred", legal_hold: false },
  { document_type: "inspection_reports", retention_years: 10, regulatory_basis: "ISO 13485 4.2.5", destruction_method: "digital_wipe", legal_hold: false },
  { document_type: "safety_records", retention_years: 5, regulatory_basis: "OSHA 29 CFR 1904.33", destruction_method: "shred", legal_hold: false },
  { document_type: "training_records", retention_years: 3, regulatory_basis: "AS9100 7.2", destruction_method: "digital_wipe", legal_hold: false },
  { document_type: "export_records", retention_years: 5, regulatory_basis: "22 CFR 122.5 (ITAR)", destruction_method: "shred", legal_hold: false },
  { document_type: "financial_records", retention_years: 7, regulatory_basis: "IRS Rev. Proc. 98-25", destruction_method: "shred", legal_hold: false },
  { document_type: "material_certs", retention_years: 10, regulatory_basis: "NADCAP AC7004", destruction_method: "shred", legal_hold: false },
];

// ─── Engine ─────────────────────────────────────────────────────────────────

export class LegalComplianceOperatingEngine {
  private ndas: Map<string, NDA> = new Map();
  private exportClassifications: Map<string, ExportClassification> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private retentionRecords: Map<string, RetentionRecord> = new Map();
  private auditLog: AuditEntry[] = [];
  private safetyIncidents: Map<string, SafetyIncident> = new Map();
  private safetyInspections: Map<string, SafetyInspection> = new Map();
  private certifications: Map<string, Certification> = new Map();
  private nextId = 1;

  constructor() {
    this._initDefaultPolicies();
  }

  private _initDefaultPolicies(): void {
    for (const policy of DEFAULT_RETENTION_POLICIES) {
      const id = `RP-${String(this.nextId++).padStart(4, "0")}`;
      this.retentionPolicies.set(id, { id, ...policy });
    }
  }

  private _genId(prefix: string): string {
    return `${prefix}-${String(this.nextId++).padStart(4, "0")}`;
  }

  private _logAudit(domain: AuditEntry["domain"], action: string, actor: string, entityId: string, details: Record<string, unknown>, severity: AuditEntry["severity"] = "info"): void {
    this.auditLog.push({
      id: this._genId("AUD"),
      timestamp: new Date().toISOString(),
      domain,
      action,
      actor,
      entity_id: entityId,
      details,
      severity,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. NDA Lifecycle
  // ═══════════════════════════════════════════════════════════════════

  createNDA(params: {
    counterparty: string;
    type: NDA["type"];
    effective_date: string;
    expiration_date: string;
    auto_renew?: boolean;
    scope: string;
    signed_by: string;
  }): NDA {
    if (!params.counterparty) throw new Error("counterparty is required");
    if (!params.effective_date || !params.expiration_date) throw new Error("effective_date and expiration_date are required");
    if (new Date(params.expiration_date) <= new Date(params.effective_date)) {
      throw new Error("expiration_date must be after effective_date");
    }

    const id = this._genId("NDA");
    const now = new Date().toISOString();
    const nda: NDA = {
      id,
      counterparty: params.counterparty,
      type: params.type ?? "mutual",
      effective_date: params.effective_date,
      expiration_date: params.expiration_date,
      auto_renew: params.auto_renew ?? false,
      scope: params.scope ?? "",
      status: new Date(params.effective_date) > new Date() ? "pending" : "active",
      signed_by: params.signed_by,
      created_at: now,
    };
    this.ndas.set(id, nda);
    this._logAudit("nda", "create", params.signed_by, id, { counterparty: params.counterparty, type: nda.type });
    return nda;
  }

  getNDA(id: string): NDA | null {
    return this.ndas.get(id) ?? null;
  }

  listNDAs(filter?: { status?: NDA["status"]; counterparty?: string }): NDA[] {
    let results = Array.from(this.ndas.values());
    if (filter?.status) results = results.filter(n => n.status === filter.status);
    if (filter?.counterparty) {
      const cp = filter.counterparty.toLowerCase();
      results = results.filter(n => n.counterparty.toLowerCase().includes(cp));
    }
    return results;
  }

  checkNDAExpirations(withinDays: number = 90): Array<{ nda: NDA; days_until_expiry: number }> {
    const now = Date.now();
    const cutoff = now + withinDays * 86400000;
    const expiring: Array<{ nda: NDA; days_until_expiry: number }> = [];
    for (const nda of this.ndas.values()) {
      if (nda.status !== "active") continue;
      const expiry = new Date(nda.expiration_date).getTime();
      if (expiry <= cutoff) {
        expiring.push({ nda, days_until_expiry: Math.max(0, Math.round((expiry - now) / 86400000)) });
      }
    }
    return expiring.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  }

  terminateNDA(id: string, terminatedBy: string, reason?: string): NDA {
    const nda = this.ndas.get(id);
    if (!nda) throw new Error(`NDA ${id} not found`);
    if (nda.status === "terminated") throw new Error(`NDA ${id} already terminated`);
    nda.status = "terminated";
    this._logAudit("nda", "terminate", terminatedBy, id, { reason: reason ?? "manual termination" }, "warning");
    return nda;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. Export Control (ITAR/EAR)
  // ═══════════════════════════════════════════════════════════════════

  classifyExport(params: {
    part_number: string;
    description: string;
    regime: "ITAR" | "EAR";
    classification: string;
    jurisdiction: string;
    license_required: boolean;
    license_number?: string;
    license_expiry?: string;
    reviewed_by: string;
  }): ExportClassification {
    if (!params.part_number) throw new Error("part_number is required");
    if (!params.regime || !["ITAR", "EAR"].includes(params.regime)) throw new Error("regime must be 'ITAR' or 'EAR'");
    if (!params.classification) throw new Error("classification is required");

    const id = this._genId("EXP");
    const ec: ExportClassification = {
      id,
      part_number: params.part_number,
      description: params.description ?? "",
      regime: params.regime,
      classification: params.classification,
      jurisdiction: params.jurisdiction ?? "US",
      license_required: params.license_required,
      license_number: params.license_number,
      license_expiry: params.license_expiry,
      reviewed_by: params.reviewed_by,
      reviewed_date: new Date().toISOString().slice(0, 10),
    };
    this.exportClassifications.set(id, ec);
    this._logAudit("export", "classify", params.reviewed_by, id, {
      part_number: params.part_number,
      regime: params.regime,
      classification: params.classification,
    }, params.license_required ? "warning" : "info");
    return ec;
  }

  screenDeniedParty(entity: string): DeniedPartyCheckResult {
    if (!entity || entity.trim().length === 0) throw new Error("entity name is required for screening");
    // Deterministic screening against known denied-party lists.
    // In production this would call external APIs (SAM.gov, BIS, OFAC).
    // Here we implement pattern-based heuristic for demo/testing.
    const normalized = entity.toLowerCase().trim();
    const matches: DeniedPartyCheckResult["matches"] = [];

    // DEMO ONLY: In production, wire to SAM.gov / BIS Consolidated Screening List API.
    // Known test patterns for denied parties (would be API-backed in production)
    const denyPatterns = [
      { pattern: "restricted_entity", list: "Entity List (BIS)", score: 0.95 },
      { pattern: "sanctioned_corp", list: "SDN (OFAC)", score: 0.98 },
      { pattern: "denied_person", list: "Denied Persons List (BIS)", score: 0.92 },
    ];

    for (const dp of denyPatterns) {
      if (normalized.includes(dp.pattern)) {
        matches.push({ list: dp.list, entry: entity, score: dp.score });
      }
    }

    const result: DeniedPartyCheckResult = {
      entity,
      screened_at: new Date().toISOString(),
      lists_checked: [...DENIED_PARTY_LISTS],
      matches,
      cleared: matches.length === 0,
    };

    this._logAudit("export", "denied_party_screen", "system", entity, {
      cleared: result.cleared,
      match_count: matches.length,
    }, matches.length > 0 ? "critical" : "info");

    return result;
  }

  listExportClassifications(filter?: { regime?: "ITAR" | "EAR"; part_number?: string }): ExportClassification[] {
    let results = Array.from(this.exportClassifications.values());
    if (filter?.regime) results = results.filter(e => e.regime === filter.regime);
    if (filter?.part_number) {
      const pn = filter.part_number.toLowerCase();
      results = results.filter(e => e.part_number.toLowerCase().includes(pn));
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. Document Retention
  // ═══════════════════════════════════════════════════════════════════

  listRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  assignRetention(params: {
    document_id: string;
    document_type: string;
    created_date?: string;
    assigned_by: string;
  }): RetentionRecord {
    if (!params.document_id) throw new Error("document_id is required");
    if (!params.document_type) throw new Error("document_type is required");

    // Find matching policy
    const policy = Array.from(this.retentionPolicies.values())
      .find(p => p.document_type === params.document_type);
    if (!policy) throw new Error(`No retention policy for document_type '${params.document_type}'`);

    const createdDate = params.created_date ?? new Date().toISOString().slice(0, 10);
    const retainUntil = new Date(createdDate);
    retainUntil.setFullYear(retainUntil.getFullYear() + policy.retention_years);

    const id = this._genId("RET");
    const record: RetentionRecord = {
      id,
      document_id: params.document_id,
      document_type: params.document_type,
      policy_id: policy.id,
      created_date: createdDate,
      retain_until: retainUntil.toISOString().slice(0, 10),
      status: policy.legal_hold ? "held" : "active",
    };
    this.retentionRecords.set(id, record);
    this._logAudit("retention", "assign", params.assigned_by, id, {
      document_id: params.document_id,
      policy: policy.id,
      retain_until: record.retain_until,
    });
    return record;
  }

  applyLegalHold(params: { document_type?: string; record_id?: string; reason: string; applied_by: string }): { held_count: number; records: RetentionRecord[] } {
    if (!params.reason) throw new Error("reason is required for legal hold");
    const held: RetentionRecord[] = [];

    if (params.record_id) {
      const rec = this.retentionRecords.get(params.record_id);
      if (!rec) throw new Error(`Retention record ${params.record_id} not found`);
      rec.status = "held";
      held.push(rec);
    } else if (params.document_type) {
      // Hold all records of this type
      for (const rec of this.retentionRecords.values()) {
        if (rec.document_type === params.document_type && rec.status === "active") {
          rec.status = "held";
          held.push(rec);
        }
      }
      // Also update the policy
      const policy = Array.from(this.retentionPolicies.values()).find(p => p.document_type === params.document_type);
      if (policy) {
        policy.legal_hold = true;
        policy.hold_reason = params.reason;
      }
    } else {
      throw new Error("Either record_id or document_type is required");
    }

    this._logAudit("retention", "legal_hold", params.applied_by, params.record_id ?? params.document_type ?? "", {
      reason: params.reason,
      held_count: held.length,
    }, "critical");

    return { held_count: held.length, records: held };
  }

  getPendingDestructions(): RetentionRecord[] {
    const now = new Date().toISOString().slice(0, 10);
    return Array.from(this.retentionRecords.values())
      .filter(r => r.status === "active" && r.retain_until <= now);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. Audit Trail
  // ═══════════════════════════════════════════════════════════════════

  queryAuditLog(filter?: {
    domain?: AuditEntry["domain"];
    severity?: AuditEntry["severity"];
    actor?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): AuditEntry[] {
    let entries = [...this.auditLog];
    if (filter?.domain) entries = entries.filter(e => e.domain === filter.domain);
    if (filter?.severity) entries = entries.filter(e => e.severity === filter.severity);
    if (filter?.actor) entries = entries.filter(e => e.actor === filter.actor);
    if (filter?.from_date) entries = entries.filter(e => e.timestamp >= filter.from_date!);
    if (filter?.to_date) entries = entries.filter(e => e.timestamp <= filter.to_date!);
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return entries.slice(0, filter?.limit ?? 100);
  }

  getAuditSummary(): {
    total_entries: number;
    by_domain: Record<string, number>;
    by_severity: Record<string, number>;
    recent_critical: AuditEntry[];
  } {
    const byDomain: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const criticals: AuditEntry[] = [];

    for (const entry of this.auditLog) {
      byDomain[entry.domain] = (byDomain[entry.domain] ?? 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
      if (entry.severity === "critical") criticals.push(entry);
    }

    return {
      total_entries: this.auditLog.length,
      by_domain: byDomain,
      by_severity: bySeverity,
      recent_critical: criticals.slice(-10),
    };
  }

  buildEvidencePackage(params: {
    entity_id: string;
    domain?: AuditEntry["domain"];
  }): {
    entity_id: string;
    audit_entries: AuditEntry[];
    related_records: Record<string, unknown>;
    generated_at: string;
  } {
    const entries = this.auditLog.filter(e =>
      e.entity_id === params.entity_id &&
      (!params.domain || e.domain === params.domain)
    );

    const related: Record<string, unknown> = {};
    // Attach the source record if we can find it
    if (this.ndas.has(params.entity_id)) related.nda = this.ndas.get(params.entity_id);
    if (this.exportClassifications.has(params.entity_id)) related.export_classification = this.exportClassifications.get(params.entity_id);
    if (this.retentionRecords.has(params.entity_id)) related.retention_record = this.retentionRecords.get(params.entity_id);
    if (this.safetyIncidents.has(params.entity_id)) related.safety_incident = this.safetyIncidents.get(params.entity_id);
    if (this.certifications.has(params.entity_id)) related.certification = this.certifications.get(params.entity_id);

    return {
      entity_id: params.entity_id,
      audit_entries: entries,
      related_records: related,
      generated_at: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. OSHA Safety
  // ═══════════════════════════════════════════════════════════════════

  listSafetyIncidents(filter?: { status?: SafetyIncident["status"]; osha_reportable?: boolean }): SafetyIncident[] {
    let results = Array.from(this.safetyIncidents.values());
    if (filter?.status) results = results.filter(i => i.status === filter.status);
    if (filter?.osha_reportable !== undefined) results = results.filter(i => i.osha_reportable === filter.osha_reportable);
    return results;
  }

  recordIncident(params: {
    date: string;
    type: SafetyIncident["type"];
    severity: SafetyIncident["severity"];
    location: string;
    description: string;
    employee_id?: string;
    reported_by: string;
  }): SafetyIncident {
    if (!params.date) throw new Error("date is required");
    if (!params.description) throw new Error("description is required");
    if (!params.location) throw new Error("location is required");

    const id = this._genId("INC");
    const oshaReportable = params.severity === "recordable" || params.severity === "lost_time" || params.severity === "fatality";
    const incident: SafetyIncident = {
      id,
      date: params.date,
      type: params.type,
      severity: params.severity,
      location: params.location,
      description: params.description,
      employee_id: params.employee_id,
      osha_reportable: oshaReportable,
      days_away: 0,
      days_restricted: 0,
      status: "open",
    };
    this.safetyIncidents.set(id, incident);
    this._logAudit("safety", "incident_report", params.reported_by, id, {
      type: params.type,
      severity: params.severity,
      osha_reportable: oshaReportable,
    }, oshaReportable ? "critical" : "warning");
    return incident;
  }

  updateIncident(params: {
    id: string;
    root_cause?: string;
    corrective_action?: string;
    days_away?: number;
    days_restricted?: number;
    status?: SafetyIncident["status"];
    updated_by: string;
  }): SafetyIncident {
    const incident = this.safetyIncidents.get(params.id);
    if (!incident) throw new Error(`Incident ${params.id} not found`);

    if (params.root_cause !== undefined) incident.root_cause = params.root_cause;
    if (params.corrective_action !== undefined) incident.corrective_action = params.corrective_action;
    if (params.days_away !== undefined) incident.days_away = params.days_away;
    if (params.days_restricted !== undefined) incident.days_restricted = params.days_restricted;
    if (params.status !== undefined) incident.status = params.status;

    this._logAudit("safety", "incident_update", params.updated_by, params.id, {
      fields_updated: Object.keys(params).filter(k => k !== "id" && k !== "updated_by"),
    });
    return incident;
  }

  recordInspection(params: {
    date: string;
    inspector: string;
    area: string;
    findings: Array<{ item: string; status: "pass" | "fail" | "warning"; note?: string }>;
    next_inspection_date: string;
  }): SafetyInspection {
    if (!params.inspector) throw new Error("inspector is required");
    if (!params.area) throw new Error("area is required");
    if (!params.findings || params.findings.length === 0) throw new Error("findings are required");

    const id = this._genId("INS");
    const failCount = params.findings.filter(f => f.status === "fail").length;
    const inspection: SafetyInspection = {
      id,
      date: params.date ?? new Date().toISOString().slice(0, 10),
      inspector: params.inspector,
      area: params.area,
      findings: params.findings,
      overall_status: failCount > 0 ? "fail" : params.findings.some(f => f.status === "warning") ? "conditional" : "pass",
      next_inspection_date: params.next_inspection_date,
    };
    this.safetyInspections.set(id, inspection);
    this._logAudit("safety", "inspection", params.inspector, id, {
      area: params.area,
      overall_status: inspection.overall_status,
      fail_count: failCount,
    }, failCount > 0 ? "warning" : "info");
    return inspection;
  }

  generateOSHA300Log(year?: number): {
    year: number;
    establishment: string;
    entries: Array<{
      case_no: string;
      employee_name: string;
      date: string;
      location: string;
      description: string;
      death: boolean;
      days_away: number;
      days_restricted: number;
      injury: boolean;
      illness: boolean;
    }>;
    totals: {
      total_cases: number;
      total_deaths: number;
      total_days_away: number;
      total_days_restricted: number;
      total_injuries: number;
      total_illnesses: number;
    };
  } {
    const targetYear = year ?? new Date().getFullYear();
    const recordable = Array.from(this.safetyIncidents.values())
      .filter(i => i.osha_reportable && new Date(i.date).getFullYear() === targetYear);

    const entries = recordable.map((i, idx) => ({
      case_no: `${targetYear}-${String(idx + 1).padStart(3, "0")}`,
      employee_name: i.employee_id ?? "Anonymous",
      date: i.date,
      location: i.location,
      description: i.description,
      death: i.severity === "fatality",
      days_away: i.days_away,
      days_restricted: i.days_restricted,
      injury: i.type === "injury",
      illness: i.type === "illness",
    }));

    return {
      year: targetYear,
      establishment: "PRISM Manufacturing",
      entries,
      totals: {
        total_cases: entries.length,
        total_deaths: entries.filter(e => e.death).length,
        total_days_away: entries.reduce((s, e) => s + e.days_away, 0),
        total_days_restricted: entries.reduce((s, e) => s + e.days_restricted, 0),
        total_injuries: entries.filter(e => e.injury).length,
        total_illnesses: entries.filter(e => e.illness).length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. Certification Tracking
  // ═══════════════════════════════════════════════════════════════════

  addCertification(params: {
    standard: string;
    scope: string;
    certifying_body: string;
    issue_date: string;
    expiry_date: string;
    surveillance_dates?: string[];
    added_by: string;
  }): Certification {
    if (!params.standard) throw new Error("standard is required");
    if (!params.certifying_body) throw new Error("certifying_body is required");
    if (!params.issue_date || !params.expiry_date) throw new Error("issue_date and expiry_date are required");

    const id = this._genId("CERT");
    const cert: Certification = {
      id,
      standard: params.standard,
      scope: params.scope ?? "",
      certifying_body: params.certifying_body,
      issue_date: params.issue_date,
      expiry_date: params.expiry_date,
      status: new Date(params.expiry_date) < new Date() ? "expired" : "active",
      surveillance_dates: params.surveillance_dates ?? [],
      nonconformances_open: 0,
    };
    this.certifications.set(id, cert);
    this._logAudit("certification", "add", params.added_by, id, {
      standard: params.standard,
      expiry_date: params.expiry_date,
    });
    return cert;
  }

  listCertifications(filter?: { status?: Certification["status"]; standard?: string }): Certification[] {
    let results = Array.from(this.certifications.values());
    if (filter?.status) results = results.filter(c => c.status === filter.status);
    if (filter?.standard) {
      const std = filter.standard.toLowerCase();
      results = results.filter(c => c.standard.toLowerCase().includes(std));
    }
    return results;
  }

  checkCertificationExpirations(withinDays: number = 90): Array<{ cert: Certification; days_until_expiry: number }> {
    const now = Date.now();
    const cutoff = now + withinDays * 86400000;
    const expiring: Array<{ cert: Certification; days_until_expiry: number }> = [];
    for (const cert of this.certifications.values()) {
      if (cert.status !== "active") continue;
      const expiry = new Date(cert.expiry_date).getTime();
      if (expiry <= cutoff) {
        expiring.push({ cert, days_until_expiry: Math.max(0, Math.round((expiry - now) / 86400000)) });
      }
    }
    return expiring.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  }

  recordAuditResult(params: {
    cert_id: string;
    audit_date: string;
    nonconformances_found: number;
    audited_by: string;
  }): Certification {
    const cert = this.certifications.get(params.cert_id);
    if (!cert) throw new Error(`Certification ${params.cert_id} not found`);

    cert.last_audit_date = params.audit_date;
    cert.nonconformances_open += params.nonconformances_found;
    if (params.nonconformances_found > 5) {
      cert.status = "suspended";
    }

    this._logAudit("certification", "audit_result", params.audited_by, params.cert_id, {
      nonconformances_found: params.nonconformances_found,
      total_open: cert.nonconformances_open,
      suspended: cert.status === "suspended",
    }, params.nonconformances_found > 5 ? "critical" : "info");
    return cert;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Compliance Dashboard
  // ═══════════════════════════════════════════════════════════════════

  dashboard(): {
    ndas: { total: number; active: number; expiring_90d: number };
    export_control: { total_classifications: number; itar_count: number; ear_count: number; license_required: number };
    retention: { total_records: number; held: number; pending_destruction: number; policies: number };
    safety: { total_incidents: number; open_incidents: number; osha_recordable: number; inspections_this_year: number };
    certifications: { total: number; active: number; expiring_90d: number; suspended: number };
    audit: { total_entries: number; critical_count: number };
  } {
    const now = Date.now();
    const cutoff90 = now + 90 * 86400000;
    const currentYear = new Date().getFullYear();

    const activeNdas = Array.from(this.ndas.values()).filter(n => n.status === "active");
    const expiringNdas = activeNdas.filter(n => new Date(n.expiration_date).getTime() <= cutoff90);

    const exports = Array.from(this.exportClassifications.values());
    const retRecords = Array.from(this.retentionRecords.values());
    const incidents = Array.from(this.safetyIncidents.values());
    const inspections = Array.from(this.safetyInspections.values())
      .filter(i => new Date(i.date).getFullYear() === currentYear);

    const activeCerts = Array.from(this.certifications.values()).filter(c => c.status === "active");
    const expiringCerts = activeCerts.filter(c => new Date(c.expiry_date).getTime() <= cutoff90);

    return {
      ndas: { total: this.ndas.size, active: activeNdas.length, expiring_90d: expiringNdas.length },
      export_control: {
        total_classifications: exports.length,
        itar_count: exports.filter(e => e.regime === "ITAR").length,
        ear_count: exports.filter(e => e.regime === "EAR").length,
        license_required: exports.filter(e => e.license_required).length,
      },
      retention: {
        total_records: retRecords.length,
        held: retRecords.filter(r => r.status === "held").length,
        pending_destruction: this.getPendingDestructions().length,
        policies: this.retentionPolicies.size,
      },
      safety: {
        total_incidents: incidents.length,
        open_incidents: incidents.filter(i => i.status !== "closed").length,
        osha_recordable: incidents.filter(i => i.osha_reportable).length,
        inspections_this_year: inspections.length,
      },
      certifications: {
        total: this.certifications.size,
        active: activeCerts.length,
        expiring_90d: expiringCerts.length,
        suspended: Array.from(this.certifications.values()).filter(c => c.status === "suspended").length,
      },
      audit: {
        total_entries: this.auditLog.length,
        critical_count: this.auditLog.filter(e => e.severity === "critical").length,
      },
    };
  }
}

export const legalComplianceOperatingEngine = new LegalComplianceOperatingEngine();
