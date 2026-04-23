/**
 * AuditManagerEngine — BIZ-MS5 U-BIZ41
 * ISO/AS9100 audit scheduling, finding tracking, CAPA creation via QME, management review packages.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";
import { qualityManagementEngine } from "./QualityManagementEngine.js";

export interface AuditSchedule {
  id: string;
  standard: "ISO_9001" | "AS9100D" | "ISO_14001" | "IATF_16949" | "internal";
  audit_name: string;
  scheduled_date: string;
  lead_auditor: string;
  scope: string;
  status: "planned" | "in_progress" | "complete" | "cancelled";
  created_at: string;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  finding_type: "observation" | "minor_nc" | "major_nc";
  clause_reference: string;
  description: string;
  evidence: string;
  due_date: string;
  assigned_to: string;
  status: "open" | "capa_created" | "closed";
  capa_id: string | undefined;
  created_at: string;
}

export interface ManagementReviewSection {
  title: string;
  content: string;
}

export interface ManagementReviewPackage {
  id: string;
  review_date: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  sections: ManagementReviewSection[];
}

class AuditManagerEngine {
  private auditSchedules = new Map<string, AuditSchedule>();
  private auditFindings = new Map<string, AuditFinding>();
  private managementReviews = new Map<string, ManagementReviewPackage>();

  constructor() {
    persistenceBridge.registerMap({ entity: "audit_schedules", getMap: () => this.auditSchedules as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "audit_findings", getMap: () => this.auditFindings as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "management_reviews", getMap: () => this.managementReviews as unknown as Map<string, any>, keyField: "id" });
  }

  scheduleAudit(params: Omit<AuditSchedule, "id" | "created_at">): AuditSchedule {
    const audit: AuditSchedule = {
      ...params,
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    this.auditSchedules.set(audit.id, audit);
    persistenceBridge.persist("audit_schedules", audit.id, audit as any);
    return audit;
  }

  listAudits(filters?: { standard?: string; status?: string }): AuditSchedule[] {
    let results = Array.from(this.auditSchedules.values());
    if (filters?.standard) results = results.filter(a => a.standard === filters.standard);
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    return results.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }

  createFinding(params: Omit<AuditFinding, "id" | "created_at">): AuditFinding {
    if (!this.auditSchedules.has(params.audit_id)) {
      throw new Error(`Audit not found: ${params.audit_id}`);
    }
    const finding: AuditFinding = {
      ...params,
      id: `FND-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      capa_id: params.capa_id ?? undefined,
      created_at: new Date().toISOString(),
    };
    this.auditFindings.set(finding.id, finding);
    persistenceBridge.persist("audit_findings", finding.id, finding as any);
    return finding;
  }

  listFindings(filters?: { audit_id?: string; status?: string; finding_type?: string }): AuditFinding[] {
    let results = Array.from(this.auditFindings.values());
    if (filters?.audit_id) results = results.filter(f => f.audit_id === filters.audit_id);
    if (filters?.status) results = results.filter(f => f.status === filters.status);
    if (filters?.finding_type) results = results.filter(f => f.finding_type === filters.finding_type);
    return results;
  }

  createCAPA(findingId: string, capaParams: {
    description?: string;
    d1_team?: string[];
  }): { finding: AuditFinding; capa_id: string } {
    const finding = this.auditFindings.get(findingId);
    if (!finding) throw new Error(`Finding not found: ${findingId}`);

    // Create 8D via QualityManagementEngine
    // Need an NCR first — create a minimal one
    const ncr = (qualityManagementEngine as any).createNCR?.({
      job_id: "audit",
      part_number: "N/A",
      description: `Audit finding: ${finding.description}`,
      severity: finding.finding_type === "major_nc" ? "major" : "minor",
      category: "documentation",
      created_by: finding.assigned_to,
      quantity_affected: 0,
      cost_impact: 0,
      source: "audit_finding",
    });

    let capaId = `CAPA-${findingId}`;
    if (ncr) {
      try {
        const eightD = qualityManagementEngine.createEightD({
          ncr_id: ncr.id,
          d1_team: capaParams.d1_team ?? [finding.assigned_to],
          source: "audit_finding",
        });
        capaId = eightD.id;
      } catch {
        // Fallback if 8D creation fails
      }
    }

    finding.capa_id = capaId;
    finding.status = "capa_created";
    this.auditFindings.set(finding.id, finding);
    persistenceBridge.persist("audit_findings", finding.id, finding as any);
    return { finding, capa_id: capaId };
  }

  generateManagementReview(periodStart: string, periodEnd: string): ManagementReviewPackage {
    const sections: ManagementReviewSection[] = [];

    // Quality Objectives
    try {
      const kpis = qualityManagementEngine.qualityKPIs();
      sections.push({
        title: "Quality Objectives Status",
        content: `First Pass Yield: ${kpis.first_pass_yield.toFixed(1)}%, Scrap Rate: ${kpis.scrap_rate.toFixed(1)}%, NCR Closure: ${kpis.ncr_closure_rate.toFixed(1)}%, Avg Cpk: ${kpis.avg_cpk.toFixed(2)}`,
      });
    } catch {
      sections.push({ title: "Quality Objectives Status", content: "Data unavailable" });
    }

    // NCR Summary
    const openNCRs = Array.from((qualityManagementEngine as any).ncrs?.values() ?? [])
      .filter((n: any) => n.status !== "closed" && n.status !== "verified").length;
    sections.push({
      title: "NCR Summary",
      content: `Open NCRs: ${openNCRs}. Period: ${periodStart} to ${periodEnd}.`,
    });

    // Audit Findings
    const openFindings = Array.from(this.auditFindings.values())
      .filter(f => f.status === "open").length;
    sections.push({
      title: "Audit Findings",
      content: `Open findings: ${openFindings}. Total findings on record: ${this.auditFindings.size}.`,
    });

    // Customer Complaints
    sections.push({
      title: "Customer Complaints",
      content: "See NCR records with source = customer_complaint for period details.",
    });

    // OEE Summary
    sections.push({
      title: "OEE Summary",
      content: "OEE data available via analytics dashboard.",
    });

    // Action Items
    const overdueFindings = Array.from(this.auditFindings.values())
      .filter(f => f.status === "open" && Date.parse(f.due_date) < Date.now());
    sections.push({
      title: "Action Items",
      content: `${overdueFindings.length} overdue audit findings require immediate attention.`,
    });

    const pkg: ManagementReviewPackage = {
      id: `MR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      review_date: new Date().toISOString().slice(0, 10),
      generated_at: new Date().toISOString(),
      period_start: periodStart,
      period_end: periodEnd,
      sections,
    };
    this.managementReviews.set(pkg.id, pkg);
    persistenceBridge.persist("management_reviews", pkg.id, pkg as any);
    return pkg;
  }
}

export const auditManagerEngine = new AuditManagerEngine();
