/**
 * Tests for LegalComplianceOperatingEngine
 * Covers all 6 domains: NDA, Export Control, Document Retention,
 * Audit Trail, OSHA Safety, Certification Tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import { LegalComplianceOperatingEngine } from "../engines/LegalComplianceOperatingEngine.js";

describe("LegalComplianceOperatingEngine", () => {
  let engine: InstanceType<typeof LegalComplianceOperatingEngine>;

  beforeEach(() => {
    engine = new LegalComplianceOperatingEngine();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. NDA Lifecycle
  // ═══════════════════════════════════════════════════════════════
  describe("NDA Lifecycle", () => {
    it("creates an NDA with valid params", () => {
      const nda = engine.createNDA({
        counterparty: "Sandvik Coromant",
        type: "mutual",
        effective_date: "2026-01-01",
        expiration_date: "2027-01-01",
        scope: "Cutting tool data sharing",
        signed_by: "John Smith",
      });
      expect(nda.id).toMatch(/^NDA-/);
      expect(nda.counterparty).toBe("Sandvik Coromant");
      expect(nda.type).toBe("mutual");
      expect(nda.status).toBe("active");
      expect(nda.auto_renew).toBe(false);
    });

    it("rejects NDA with expiration before effective date", () => {
      expect(() => engine.createNDA({
        counterparty: "Test Corp",
        type: "mutual",
        effective_date: "2027-01-01",
        expiration_date: "2026-01-01",
        scope: "test",
        signed_by: "tester",
      })).toThrow("expiration_date must be after effective_date");
    });

    it("rejects NDA without counterparty", () => {
      expect(() => engine.createNDA({
        counterparty: "",
        type: "mutual",
        effective_date: "2026-01-01",
        expiration_date: "2027-01-01",
        scope: "test",
        signed_by: "tester",
      })).toThrow("counterparty is required");
    });

    it("lists NDAs with filters", () => {
      engine.createNDA({ counterparty: "Vendor A", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "data", signed_by: "s" });
      engine.createNDA({ counterparty: "Vendor B", type: "unilateral_inbound", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "data", signed_by: "s" });

      expect(engine.listNDAs()).toHaveLength(2);
      expect(engine.listNDAs({ counterparty: "Vendor A" })).toHaveLength(1);
    });

    it("gets NDA by ID", () => {
      const nda = engine.createNDA({ counterparty: "Test", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "test", signed_by: "s" });
      expect(engine.getNDA(nda.id)).toBeTruthy();
      expect(engine.getNDA("NDA-9999")).toBeNull();
    });

    it("terminates NDA", () => {
      const nda = engine.createNDA({ counterparty: "Test", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "test", signed_by: "s" });
      const terminated = engine.terminateNDA(nda.id, "admin", "Project cancelled");
      expect(terminated.status).toBe("terminated");
    });

    it("rejects terminating already terminated NDA", () => {
      const nda = engine.createNDA({ counterparty: "Test", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "test", signed_by: "s" });
      engine.terminateNDA(nda.id, "admin");
      expect(() => engine.terminateNDA(nda.id, "admin")).toThrow("already terminated");
    });

    it("checks NDA expirations within window", () => {
      // Create NDA expiring in 30 days
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      engine.createNDA({
        counterparty: "Expiring Corp",
        type: "mutual",
        effective_date: "2025-01-01",
        expiration_date: soon.toISOString().slice(0, 10),
        scope: "test",
        signed_by: "s",
      });
      const expiring = engine.checkNDAExpirations(90);
      expect(expiring.length).toBeGreaterThanOrEqual(1);
      expect(expiring[0].days_until_expiry).toBeLessThanOrEqual(90);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Export Control
  // ═══════════════════════════════════════════════════════════════
  describe("Export Control", () => {
    it("classifies an ITAR part", () => {
      const ec = engine.classifyExport({
        part_number: "MIL-BRACKET-001",
        description: "Fighter jet mounting bracket",
        regime: "ITAR",
        classification: "USML Cat IV",
        jurisdiction: "US",
        license_required: true,
        reviewed_by: "export_officer",
      });
      expect(ec.id).toMatch(/^EXP-/);
      expect(ec.regime).toBe("ITAR");
      expect(ec.license_required).toBe(true);
    });

    it("classifies an EAR part", () => {
      const ec = engine.classifyExport({
        part_number: "CNC-SPINDLE-200",
        description: "High-speed spindle motor",
        regime: "EAR",
        classification: "2B001",
        jurisdiction: "US",
        license_required: false,
        reviewed_by: "export_officer",
      });
      expect(ec.regime).toBe("EAR");
      expect(ec.classification).toBe("2B001");
    });

    it("rejects classification without part number", () => {
      expect(() => engine.classifyExport({
        part_number: "",
        regime: "ITAR",
        classification: "X",
        reviewed_by: "test",
      })).toThrow("part_number is required");
    });

    it("rejects invalid regime", () => {
      expect(() => engine.classifyExport({
        part_number: "P1",
        regime: "INVALID" as any,
        classification: "X",
        reviewed_by: "test",
      })).toThrow("regime must be");
    });

    it("screens denied party — cleared entity", () => {
      const result = engine.screenDeniedParty("Sandvik Coromant");
      expect(result.cleared).toBe(true);
      expect(result.matches).toHaveLength(0);
      expect(result.lists_checked.length).toBeGreaterThan(0);
    });

    it("screens denied party — flagged entity", () => {
      const result = engine.screenDeniedParty("restricted_entity_corp");
      expect(result.cleared).toBe(false);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].list).toBe("Entity List (BIS)");
    });

    it("rejects empty entity for screening", () => {
      expect(() => engine.screenDeniedParty("")).toThrow("entity name is required");
    });

    it("lists export classifications with filters", () => {
      engine.classifyExport({ part_number: "P1", description: "d", regime: "ITAR", classification: "C1", jurisdiction: "US", license_required: true, reviewed_by: "r" });
      engine.classifyExport({ part_number: "P2", description: "d", regime: "EAR", classification: "C2", jurisdiction: "US", license_required: false, reviewed_by: "r" });
      expect(engine.listExportClassifications({ regime: "ITAR" })).toHaveLength(1);
      expect(engine.listExportClassifications()).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Document Retention
  // ═══════════════════════════════════════════════════════════════
  describe("Document Retention", () => {
    it("has default retention policies loaded", () => {
      const policies = engine.listRetentionPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(8);
      expect(policies.some((p: any) => p.document_type === "quality_records")).toBe(true);
      expect(policies.some((p: any) => p.document_type === "safety_records")).toBe(true);
    });

    it("assigns retention to a document", () => {
      const record = engine.assignRetention({
        document_id: "DOC-001",
        document_type: "quality_records",
        created_date: "2026-01-01",
        assigned_by: "quality_mgr",
      });
      expect(record.id).toMatch(/^RET-/);
      expect(record.document_id).toBe("DOC-001");
      expect(record.status).toBe("active");
      // quality_records = 7 years, so retain_until should be 2033
      expect(record.retain_until).toContain("2033");
    });

    it("rejects retention assignment for unknown document type", () => {
      expect(() => engine.assignRetention({
        document_id: "DOC-X",
        document_type: "nonexistent_type",
        assigned_by: "test",
      })).toThrow("No retention policy");
    });

    it("applies legal hold to records by type", () => {
      engine.assignRetention({ document_id: "D1", document_type: "quality_records", assigned_by: "a" });
      engine.assignRetention({ document_id: "D2", document_type: "quality_records", assigned_by: "a" });
      const result = engine.applyLegalHold({
        document_type: "quality_records",
        reason: "Litigation pending",
        applied_by: "legal_counsel",
      });
      expect(result.held_count).toBe(2);
      expect(result.records.every((r: any) => r.status === "held")).toBe(true);
    });

    it("applies legal hold to single record", () => {
      const rec = engine.assignRetention({ document_id: "D1", document_type: "safety_records", assigned_by: "a" });
      const result = engine.applyLegalHold({
        record_id: rec.id,
        reason: "OSHA inquiry",
        applied_by: "legal",
      });
      expect(result.held_count).toBe(1);
    });

    it("rejects legal hold without reason", () => {
      expect(() => engine.applyLegalHold({
        document_type: "quality_records",
        reason: "",
        applied_by: "test",
      })).toThrow("reason is required");
    });

    it("returns pending destructions for expired retention", () => {
      // All freshly assigned records have future retain_until dates,
      // so pending destructions should be empty
      engine.assignRetention({ document_id: "D1", document_type: "quality_records", assigned_by: "a" });
      expect(engine.getPendingDestructions()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Audit Trail
  // ═══════════════════════════════════════════════════════════════
  describe("Audit Trail", () => {
    it("logs audit entries from engine operations", () => {
      engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      const log = engine.queryAuditLog();
      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log[0].domain).toBe("nda");
      expect(log[0].action).toBe("create");
    });

    it("filters audit log by domain", () => {
      engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      engine.classifyExport({ part_number: "P1", description: "d", regime: "ITAR", classification: "C1", jurisdiction: "US", license_required: false, reviewed_by: "r" });
      expect(engine.queryAuditLog({ domain: "nda" }).every((e: any) => e.domain === "nda")).toBe(true);
      expect(engine.queryAuditLog({ domain: "export" }).every((e: any) => e.domain === "export")).toBe(true);
    });

    it("filters audit log by severity", () => {
      engine.screenDeniedParty("restricted_entity_corp"); // critical
      engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" }); // info
      const criticals = engine.queryAuditLog({ severity: "critical" });
      expect(criticals.every((e: any) => e.severity === "critical")).toBe(true);
    });

    it("respects limit in audit query", () => {
      for (let i = 0; i < 5; i++) {
        engine.createNDA({ counterparty: `V${i}`, type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      }
      expect(engine.queryAuditLog({ limit: 3 })).toHaveLength(3);
    });

    it("generates audit summary", () => {
      engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      engine.screenDeniedParty("restricted_entity_corp");
      const summary = engine.getAuditSummary();
      expect(summary.total_entries).toBeGreaterThanOrEqual(2);
      expect(summary.by_domain).toBeDefined();
      expect(summary.by_severity).toBeDefined();
      expect(summary.recent_critical.length).toBeGreaterThanOrEqual(1);
    });

    it("builds evidence package for entity", () => {
      const nda = engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      const pkg = engine.buildEvidencePackage({ entity_id: nda.id });
      expect(pkg.entity_id).toBe(nda.id);
      expect(pkg.audit_entries.length).toBeGreaterThanOrEqual(1);
      expect(pkg.related_records.nda).toBeDefined();
      expect(pkg.generated_at).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. OSHA Safety
  // ═══════════════════════════════════════════════════════════════
  describe("OSHA Safety", () => {
    it("records a safety incident", () => {
      const incident = engine.recordIncident({
        date: "2026-03-15",
        type: "injury",
        severity: "recordable",
        location: "CNC Area 2",
        description: "Operator cut on chip removal",
        employee_id: "EMP-42",
        reported_by: "supervisor",
      });
      expect(incident.id).toMatch(/^INC-/);
      expect(incident.osha_reportable).toBe(true);
      expect(incident.status).toBe("open");
    });

    it("marks first_aid as non-OSHA-reportable", () => {
      const incident = engine.recordIncident({
        date: "2026-03-15",
        type: "near_miss",
        severity: "first_aid",
        location: "Assembly",
        description: "Near miss with forklift",
        reported_by: "operator",
      });
      expect(incident.osha_reportable).toBe(false);
    });

    it("rejects incident without required fields", () => {
      expect(() => engine.recordIncident({
        date: "",
        type: "injury",
        severity: "recordable",
        location: "Shop",
        description: "test",
        reported_by: "r",
      })).toThrow("date is required");
    });

    it("updates incident with root cause and corrective action", () => {
      const inc = engine.recordIncident({
        date: "2026-03-15",
        type: "injury",
        severity: "recordable",
        location: "CNC",
        description: "Cut",
        reported_by: "sup",
      });
      const updated = engine.updateIncident({
        id: inc.id,
        root_cause: "Missing chip guard",
        corrective_action: "Install chip guard on all lathes",
        days_away: 3,
        status: "closed",
        updated_by: "safety_mgr",
      });
      expect(updated.root_cause).toBe("Missing chip guard");
      expect(updated.corrective_action).toContain("chip guard");
      expect(updated.days_away).toBe(3);
      expect(updated.status).toBe("closed");
    });

    it("records a safety inspection", () => {
      const insp = engine.recordInspection({
        date: "2026-03-20",
        inspector: "safety_officer",
        area: "Machine Shop Floor",
        findings: [
          { item: "Fire extinguisher access", status: "pass" },
          { item: "Eye wash station", status: "pass" },
          { item: "Machine guarding", status: "fail", note: "Guard missing on lathe #3" },
        ],
        next_inspection_date: "2026-06-20",
      });
      expect(insp.id).toMatch(/^INS-/);
      expect(insp.overall_status).toBe("fail"); // has a failure
      expect(insp.findings).toHaveLength(3);
    });

    it("marks inspection as pass when all items pass", () => {
      const insp = engine.recordInspection({
        date: "2026-03-20",
        inspector: "officer",
        area: "Office",
        findings: [
          { item: "Exit signs", status: "pass" },
          { item: "First aid kit", status: "pass" },
        ],
        next_inspection_date: "2026-06-20",
      });
      expect(insp.overall_status).toBe("pass");
    });

    it("marks inspection as conditional with warnings", () => {
      const insp = engine.recordInspection({
        date: "2026-03-20",
        inspector: "officer",
        area: "Warehouse",
        findings: [
          { item: "Forklift inspection", status: "warning", note: "Due next week" },
          { item: "Floor markings", status: "pass" },
        ],
        next_inspection_date: "2026-06-20",
      });
      expect(insp.overall_status).toBe("conditional");
    });

    it("generates OSHA 300 log", () => {
      engine.recordIncident({
        date: `${new Date().getFullYear()}-02-15`,
        type: "injury",
        severity: "recordable",
        location: "CNC",
        description: "Laceration",
        employee_id: "EMP-10",
        reported_by: "sup",
      });
      engine.recordIncident({
        date: `${new Date().getFullYear()}-05-10`,
        type: "illness",
        severity: "lost_time",
        location: "Grinding",
        description: "Respiratory issue",
        employee_id: "EMP-20",
        reported_by: "sup",
      });
      // Near miss — NOT osha_reportable (first_aid)
      engine.recordIncident({
        date: `${new Date().getFullYear()}-06-01`,
        type: "near_miss",
        severity: "first_aid",
        location: "Assembly",
        description: "Dropped part",
        reported_by: "op",
      });

      const log = engine.generateOSHA300Log();
      expect(log.year).toBe(new Date().getFullYear());
      expect(log.entries).toHaveLength(2); // only recordable + lost_time
      expect(log.totals.total_cases).toBe(2);
      expect(log.totals.total_injuries).toBe(1);
      expect(log.totals.total_illnesses).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Certification Tracking
  // ═══════════════════════════════════════════════════════════════
  describe("Certification Tracking", () => {
    it("adds a certification", () => {
      const cert = engine.addCertification({
        standard: "AS9100D",
        scope: "CNC machining of aerospace components",
        certifying_body: "BSI",
        issue_date: "2025-06-01",
        expiry_date: "2028-06-01",
        added_by: "quality_mgr",
      });
      expect(cert.id).toMatch(/^CERT-/);
      expect(cert.standard).toBe("AS9100D");
      expect(cert.status).toBe("active");
      expect(cert.nonconformances_open).toBe(0);
    });

    it("marks expired cert as expired on creation", () => {
      const cert = engine.addCertification({
        standard: "ISO 9001:2015",
        scope: "General",
        certifying_body: "TUV",
        issue_date: "2020-01-01",
        expiry_date: "2023-01-01",
        added_by: "test",
      });
      expect(cert.status).toBe("expired");
    });

    it("rejects cert without required fields", () => {
      expect(() => engine.addCertification({
        standard: "",
        scope: "s",
        certifying_body: "b",
        issue_date: "2026-01-01",
        expiry_date: "2029-01-01",
        added_by: "t",
      })).toThrow("standard is required");
    });

    it("lists certifications with filters", () => {
      engine.addCertification({ standard: "AS9100D", scope: "s", certifying_body: "BSI", issue_date: "2025-01-01", expiry_date: "2028-01-01", added_by: "t" });
      engine.addCertification({ standard: "ISO 13485:2016", scope: "s", certifying_body: "TUV", issue_date: "2025-01-01", expiry_date: "2028-01-01", added_by: "t" });
      expect(engine.listCertifications()).toHaveLength(2);
      expect(engine.listCertifications({ standard: "AS9100" })).toHaveLength(1);
    });

    it("checks certification expirations", () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 60);
      engine.addCertification({
        standard: "NADCAP AC7004",
        scope: "NDT",
        certifying_body: "PRI",
        issue_date: "2024-01-01",
        expiry_date: soon.toISOString().slice(0, 10),
        added_by: "t",
      });
      const expiring = engine.checkCertificationExpirations(90);
      expect(expiring.length).toBeGreaterThanOrEqual(1);
      expect(expiring[0].cert.standard).toBe("NADCAP AC7004");
    });

    it("records audit result and suspends on >5 NCs", () => {
      const cert = engine.addCertification({
        standard: "AS9100D",
        scope: "s",
        certifying_body: "BSI",
        issue_date: "2025-01-01",
        expiry_date: "2028-01-01",
        added_by: "t",
      });
      const updated = engine.recordAuditResult({
        cert_id: cert.id,
        audit_date: "2026-03-15",
        nonconformances_found: 6,
        audited_by: "lead_auditor",
      });
      expect(updated.status).toBe("suspended");
      expect(updated.nonconformances_open).toBe(6);
      expect(updated.last_audit_date).toBe("2026-03-15");
    });

    it("keeps active status when NCs <= 5", () => {
      const cert = engine.addCertification({
        standard: "ISO 13485:2016",
        scope: "s",
        certifying_body: "TUV",
        issue_date: "2025-01-01",
        expiry_date: "2028-01-01",
        added_by: "t",
      });
      const updated = engine.recordAuditResult({
        cert_id: cert.id,
        audit_date: "2026-03-15",
        nonconformances_found: 3,
        audited_by: "auditor",
      });
      expect(updated.status).toBe("active");
      expect(updated.nonconformances_open).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════
  describe("Dashboard", () => {
    it("returns comprehensive dashboard with all domains", () => {
      // Populate some data
      engine.createNDA({ counterparty: "X", type: "mutual", effective_date: "2026-01-01", expiration_date: "2027-01-01", scope: "s", signed_by: "s" });
      engine.classifyExport({ part_number: "P1", description: "d", regime: "ITAR", classification: "C1", jurisdiction: "US", license_required: true, reviewed_by: "r" });
      engine.assignRetention({ document_id: "D1", document_type: "quality_records", assigned_by: "a" });
      engine.recordIncident({ date: "2026-03-15", type: "injury", severity: "recordable", location: "CNC", description: "cut", reported_by: "sup" });
      engine.addCertification({ standard: "AS9100D", scope: "s", certifying_body: "BSI", issue_date: "2025-01-01", expiry_date: "2028-01-01", added_by: "t" });

      const dash = engine.dashboard();
      expect(dash.ndas.total).toBe(1);
      expect(dash.ndas.active).toBe(1);
      expect(dash.export_control.total_classifications).toBe(1);
      expect(dash.export_control.itar_count).toBe(1);
      expect(dash.export_control.license_required).toBe(1);
      expect(dash.retention.total_records).toBe(1);
      expect(dash.retention.policies).toBeGreaterThanOrEqual(8);
      expect(dash.safety.total_incidents).toBe(1);
      expect(dash.safety.osha_recordable).toBe(1);
      expect(dash.certifications.total).toBe(1);
      expect(dash.certifications.active).toBe(1);
      expect(dash.audit.total_entries).toBeGreaterThan(0);
    });
  });
});
