/**
 * NISTAIRMFComplianceEngine — U-LPR-OPS-NIST
 *
 * NIST AI Risk Management Framework (AI RMF 1.0) + ISO/IEC 42001:2023 control
 * mapping, STRIDE per-unit threat models, and residual-risk register.
 *
 * Frameworks modeled:
 *   - NIST_AI_RMF: NIST AI 100-1 four-function framework
 *     GOVERN, MAP, MEASURE, MANAGE — categories and subcategories
 *   - ISO_42001: ISO/IEC 42001 AI management system clauses 4–10 + Annex A
 *   - STRIDE: Microsoft's threat modeling taxonomy
 *     Spoofing / Tampering / Repudiation / Info-Disclosure / DoS / Elevation
 *
 * Residual risk math:
 *   inherent_score = likelihood (1–5) × impact (1–5)          → 1..25
 *   residual_score = inherent_score × (1 − mitigation_effectiveness)
 *   band: low < 5, medium 5–10, high 11–18, critical 19–25
 *
 * Reference: NIST AI 100-1 (2023), ISO/IEC 42001:2023, Microsoft STRIDE
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-NIST
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { log } from "../utils/Logger.js";

export type ControlFramework = "NIST_AI_RMF" | "ISO_42001" | "STRIDE";
export type StrideCategory =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information_disclosure"
  | "denial_of_service"
  | "elevation_of_privilege";
export type ImplementationStatus = "not_implemented" | "partial" | "implemented" | "validated";
export type RiskBand = "low" | "medium" | "high" | "critical";

export interface Control {
  id: string;
  framework: ControlFramework;
  category: string; // AI RMF function (GOVERN/MAP/MEASURE/MANAGE), ISO clause, or STRIDE category
  name: string;
  description: string;
  maturity_target: 0 | 1 | 2 | 3 | 4; // 0=not-applicable 1=initial 2=developing 3=defined 4=optimized
  maturity_current: 0 | 1 | 2 | 3 | 4;
  references: string[]; // NIST subcategory ids, ISO clause numbers, etc.
}

export interface StrideThreat {
  id: string;
  unit_id: string; // The subsystem / engine / flow being modeled
  category: StrideCategory;
  description: string;
  attack_vector: string;
  assets_at_risk: string[];
  mitigation_ids: string[];
}

export interface Mitigation {
  id: string;
  control_ids: string[]; // Cross-reference to Control ids this mitigation implements
  description: string;
  implementation_status: ImplementationStatus;
  effectiveness: number; // 0..1 — fraction of inherent risk eliminated when fully deployed
  evidence_ref: string;
  owner: string;
}

export interface Risk {
  id: string;
  threat_id: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  inherent_score: number;
  mitigation_effectiveness: number;
  residual_score: number;
  residual_band: RiskBand;
  acceptance_rationale: string;
  accepted_by: string;
  accepted_at: number;
  review_due: number; // epoch ms; risks must be re-reviewed before this date
}

export interface ControlMapping {
  control_id: string;
  mapped_unit_ids: string[];
  mapped_evidence_refs: string[];
  last_mapped_at: number;
}

export interface ComplianceReport {
  generated_at: number;
  framework: ControlFramework;
  controls_total: number;
  controls_implemented: number;
  controls_validated: number;
  maturity_average: number;
  maturity_gap: number; // target − current avg
  unmapped_control_ids: string[];
  recommendations: string[];
}

export interface RiskRegister {
  generated_at: number;
  total_risks: number;
  by_band: Record<RiskBand, number>;
  critical_risks: Risk[];
  overdue_reviews: Risk[];
  top_residual_risks: Risk[]; // top 10 by residual_score
}

export interface NISTStats {
  controls_registered: number;
  controls_by_framework: Record<ControlFramework, number>;
  threats_registered: number;
  mitigations_registered: number;
  risks_registered: number;
  risks_critical: number;
  risks_overdue_review: number;
  avg_maturity: number;
}

// ── Default NIST AI RMF controls (representative subset) ────────────────────

const DEFAULT_NIST_RMF: Control[] = [
  { id: "GOVERN-1.1", framework: "NIST_AI_RMF", category: "GOVERN", name: "AI governance policy",
    description: "Organization has documented AI governance policy that aligns with mission and risk tolerance.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 GV-1.1"] },
  { id: "GOVERN-1.2", framework: "NIST_AI_RMF", category: "GOVERN", name: "AI roles and responsibilities",
    description: "Clear roles, responsibilities, and accountability for AI system outcomes.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 GV-1.2"] },
  { id: "GOVERN-2.1", framework: "NIST_AI_RMF", category: "GOVERN", name: "AI incident response",
    description: "AI-specific incident response procedures including model rollback and impact containment.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 GV-2.1"] },
  { id: "MAP-1.1", framework: "NIST_AI_RMF", category: "MAP", name: "AI context characterization",
    description: "Intended purposes, benefits, costs, and impacts of AI system are understood.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MP-1.1"] },
  { id: "MAP-2.3", framework: "NIST_AI_RMF", category: "MAP", name: "Data provenance and lineage",
    description: "Training/validation data provenance, licenses, and lineage are documented.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MP-2.3"] },
  { id: "MEASURE-2.1", framework: "NIST_AI_RMF", category: "MEASURE", name: "AI system performance evaluation",
    description: "Quantitative evaluation of AI system performance across representative scenarios.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MS-2.1"] },
  { id: "MEASURE-2.7", framework: "NIST_AI_RMF", category: "MEASURE", name: "Security and resilience testing",
    description: "AI system is tested against adversarial inputs, model inversion, and supply-chain attacks.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MS-2.7"] },
  { id: "MANAGE-1.3", framework: "NIST_AI_RMF", category: "MANAGE", name: "Risk prioritization",
    description: "Identified risks are prioritized by likelihood, impact, and mitigation feasibility.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MG-1.3"] },
  { id: "MANAGE-4.1", framework: "NIST_AI_RMF", category: "MANAGE", name: "Post-deployment monitoring",
    description: "Continuous monitoring for drift, degradation, and emergent risks after deployment.",
    maturity_target: 4, maturity_current: 0, references: ["AI RMF 1.0 MG-4.1"] },
];

// ── Default ISO/IEC 42001 controls (representative subset) ──────────────────

const DEFAULT_ISO_42001: Control[] = [
  { id: "ISO42001-5.2", framework: "ISO_42001", category: "Clause 5 Leadership", name: "AI management policy",
    description: "Documented AI management policy approved by top management.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §5.2"] },
  { id: "ISO42001-6.1.2", framework: "ISO_42001", category: "Clause 6 Planning", name: "AI risk assessment",
    description: "Formal process to identify, analyze, and evaluate AI-related risks.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §6.1.2"] },
  { id: "ISO42001-7.2", framework: "ISO_42001", category: "Clause 7 Support", name: "AI competence",
    description: "Personnel involved in AI lifecycle have documented competence.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §7.2"] },
  { id: "ISO42001-8.3", framework: "ISO_42001", category: "Clause 8 Operation", name: "AI system impact assessment",
    description: "Impact assessment performed before AI system deployment.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §8.3"] },
  { id: "ISO42001-9.1", framework: "ISO_42001", category: "Clause 9 Performance", name: "Monitoring and measurement",
    description: "Defined metrics and processes to evaluate AI system performance.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §9.1"] },
  { id: "ISO42001-10.1", framework: "ISO_42001", category: "Clause 10 Improvement", name: "Nonconformity and corrective action",
    description: "Process to handle nonconformity events and track corrective actions.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 §10.1"] },
  { id: "ISO42001-A.6.1.1", framework: "ISO_42001", category: "Annex A", name: "AI system documentation",
    description: "Comprehensive documentation of AI system design, data, and training.",
    maturity_target: 4, maturity_current: 0, references: ["ISO/IEC 42001:2023 Annex A.6.1.1"] },
];

// ── Default STRIDE controls (category placeholders, threats live separately) ──

const DEFAULT_STRIDE: Control[] = [
  { id: "STRIDE-S", framework: "STRIDE", category: "spoofing", name: "Spoofing identity",
    description: "Attacker impersonates a legitimate user, service, or system identity.",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
  { id: "STRIDE-T", framework: "STRIDE", category: "tampering", name: "Tampering with data",
    description: "Attacker modifies data in transit, at rest, or inside the model.",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
  { id: "STRIDE-R", framework: "STRIDE", category: "repudiation", name: "Repudiation",
    description: "User denies performing an action; inadequate audit trail for attribution.",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
  { id: "STRIDE-I", framework: "STRIDE", category: "information_disclosure", name: "Information disclosure",
    description: "Unauthorized exposure of sensitive data (training data, weights, tenant PII).",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
  { id: "STRIDE-D", framework: "STRIDE", category: "denial_of_service", name: "Denial of service",
    description: "Service exhaustion via compute-intensive adversarial inputs or resource starvation.",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
  { id: "STRIDE-E", framework: "STRIDE", category: "elevation_of_privilege", name: "Elevation of privilege",
    description: "Attacker gains capabilities beyond authorized role (RBAC bypass, sandbox escape).",
    maturity_target: 4, maturity_current: 0, references: ["STRIDE Microsoft 1999"] },
];

class NISTAIRMFComplianceEngine {
  private controls: Map<string, Control> = new Map();
  private threats: Map<string, StrideThreat> = new Map();
  private mitigations: Map<string, Mitigation> = new Map();
  private risks: Map<string, Risk> = new Map();
  private mappings: Map<string, ControlMapping> = new Map(); // control_id → mapping
  private threatCounter = 0;
  private mitigationCounter = 0;
  private riskCounter = 0;

  constructor() {
    for (const c of [...DEFAULT_NIST_RMF, ...DEFAULT_ISO_42001, ...DEFAULT_STRIDE]) {
      this.controls.set(c.id, { ...c });
    }
  }

  // ── Controls ────────────────────────────────────────────────────

  registerControl(control: Control): { success: boolean; control_id: string } {
    if (!control.id) throw new Error("control.id required");
    if (control.maturity_current > control.maturity_target) {
      throw new Error("maturity_current cannot exceed maturity_target");
    }
    this.controls.set(control.id, { ...control });
    log.info("[NIST] Registered control: " + control.id + " (" + control.framework + ")");
    return { success: true, control_id: control.id };
  }

  getControl(id: string): Control | null {
    return this.controls.get(id) ?? null;
  }

  listControls(framework?: ControlFramework, category?: string): Control[] {
    let out = Array.from(this.controls.values());
    if (framework) out = out.filter(c => c.framework === framework);
    if (category) out = out.filter(c => c.category === category);
    return out;
  }

  /**
   * Update maturity score for an existing control (0..4).
   */
  updateControlMaturity(id: string, maturity: 0 | 1 | 2 | 3 | 4): Control {
    const c = this.controls.get(id);
    if (!c) throw new Error("Unknown control: " + id);
    if (maturity > c.maturity_target) throw new Error("maturity cannot exceed target");
    c.maturity_current = maturity;
    return { ...c };
  }

  // ── STRIDE threats ──────────────────────────────────────────────

  registerThreat(threat: Omit<StrideThreat, "id"> & { id?: string }): StrideThreat {
    if (!threat.unit_id) throw new Error("unit_id required");
    if (!threat.description) throw new Error("description required");
    this.threatCounter++;
    const full: StrideThreat = {
      id: threat.id || "T-" + String(this.threatCounter).padStart(4, "0"),
      unit_id: threat.unit_id,
      category: threat.category,
      description: threat.description,
      attack_vector: threat.attack_vector,
      assets_at_risk: threat.assets_at_risk,
      mitigation_ids: threat.mitigation_ids,
    };
    this.threats.set(full.id, full);
    return full;
  }

  listThreats(unitId?: string, category?: StrideCategory): StrideThreat[] {
    let out = Array.from(this.threats.values());
    if (unitId) out = out.filter(t => t.unit_id === unitId);
    if (category) out = out.filter(t => t.category === category);
    return out;
  }

  // ── Mitigations ─────────────────────────────────────────────────

  registerMitigation(m: Omit<Mitigation, "id"> & { id?: string }): Mitigation {
    if (m.effectiveness < 0 || m.effectiveness > 1) {
      throw new Error("effectiveness must be in [0, 1]");
    }
    for (const cid of m.control_ids) {
      if (!this.controls.has(cid)) {
        throw new Error("Unknown control reference in mitigation: " + cid);
      }
    }
    this.mitigationCounter++;
    const full: Mitigation = {
      id: m.id || "M-" + String(this.mitigationCounter).padStart(4, "0"),
      control_ids: [...m.control_ids],
      description: m.description,
      implementation_status: m.implementation_status,
      effectiveness: m.effectiveness,
      evidence_ref: m.evidence_ref,
      owner: m.owner,
    };
    this.mitigations.set(full.id, full);
    return full;
  }

  getMitigation(id: string): Mitigation | null {
    return this.mitigations.get(id) ?? null;
  }

  listMitigations(status?: ImplementationStatus): Mitigation[] {
    let out = Array.from(this.mitigations.values());
    if (status) out = out.filter(m => m.implementation_status === status);
    return out;
  }

  // ── Risk register ───────────────────────────────────────────────

  /**
   * Record a risk acceptance decision for a threat.
   * Computes residual risk using likelihood, impact, and effective
   * mitigation coverage from linked mitigations.
   */
  registerRisk(input: {
    threat_id: string;
    likelihood: 1 | 2 | 3 | 4 | 5;
    impact: 1 | 2 | 3 | 4 | 5;
    acceptance_rationale: string;
    accepted_by: string;
    review_due_days?: number; // default 180
  }): Risk {
    const threat = this.threats.get(input.threat_id);
    if (!threat) throw new Error("Unknown threat: " + input.threat_id);
    if (!input.acceptance_rationale) throw new Error("acceptance_rationale required");
    if (!input.accepted_by) throw new Error("accepted_by required");

    // Effective mitigation: combine linked mitigations by the "no-double-counting"
    // approach — 1 − Π(1 − effectiveness_i) for implemented/validated mitigations.
    let notCovered = 1;
    for (const mid of threat.mitigation_ids) {
      const m = this.mitigations.get(mid);
      if (!m) continue;
      if (m.implementation_status === "implemented" || m.implementation_status === "validated") {
        notCovered *= 1 - m.effectiveness;
      }
    }
    const effective = 1 - notCovered;

    const inherent = input.likelihood * input.impact;
    const residual = inherent * (1 - effective);
    const band: RiskBand =
      residual < 5 ? "low" :
      residual <= 10 ? "medium" :
      residual <= 18 ? "high" :
      "critical";

    this.riskCounter++;
    const now = Date.now();
    const reviewDays = input.review_due_days ?? 180;
    const risk: Risk = {
      id: "R-" + String(this.riskCounter).padStart(4, "0"),
      threat_id: input.threat_id,
      likelihood: input.likelihood,
      impact: input.impact,
      inherent_score: inherent,
      mitigation_effectiveness: effective,
      residual_score: residual,
      residual_band: band,
      acceptance_rationale: input.acceptance_rationale,
      accepted_by: input.accepted_by,
      accepted_at: now,
      review_due: now + reviewDays * 24 * 3600 * 1000,
    };
    this.risks.set(risk.id, risk);
    log.info("[NIST] Registered risk " + risk.id + " for threat " + input.threat_id + ": residual=" + residual.toFixed(2) + " (" + band + ")");
    return risk;
  }

  getRisk(id: string): Risk | null {
    return this.risks.get(id) ?? null;
  }

  listRisks(band?: RiskBand): Risk[] {
    let out = Array.from(this.risks.values());
    if (band) out = out.filter(r => r.residual_band === band);
    return out;
  }

  getRiskRegister(now: number = Date.now()): RiskRegister {
    const risks = Array.from(this.risks.values());
    const byBand: Record<RiskBand, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const r of risks) byBand[r.residual_band]++;
    const critical = risks.filter(r => r.residual_band === "critical");
    const overdue = risks.filter(r => r.review_due < now);
    const topTen = [...risks].sort((a, b) => b.residual_score - a.residual_score).slice(0, 10);
    return {
      generated_at: now,
      total_risks: risks.length,
      by_band: byBand,
      critical_risks: critical,
      overdue_reviews: overdue,
      top_residual_risks: topTen,
    };
  }

  // ── Control→unit mapping ────────────────────────────────────────

  /**
   * Map a control to a product unit with evidence.
   * Appends to existing mapping entries (never duplicates unit/evidence).
   */
  mapControlToUnit(controlId: string, unitId: string, evidenceRef: string): ControlMapping {
    if (!this.controls.has(controlId)) throw new Error("Unknown control: " + controlId);
    const existing = this.mappings.get(controlId);
    if (existing) {
      if (!existing.mapped_unit_ids.includes(unitId)) existing.mapped_unit_ids.push(unitId);
      if (evidenceRef && !existing.mapped_evidence_refs.includes(evidenceRef)) {
        existing.mapped_evidence_refs.push(evidenceRef);
      }
      existing.last_mapped_at = Date.now();
      return { ...existing };
    }
    const m: ControlMapping = {
      control_id: controlId,
      mapped_unit_ids: [unitId],
      mapped_evidence_refs: evidenceRef ? [evidenceRef] : [],
      last_mapped_at: Date.now(),
    };
    this.mappings.set(controlId, m);
    return { ...m };
  }

  getMapping(controlId: string): ControlMapping | null {
    return this.mappings.get(controlId) ?? null;
  }

  // ── Reporting ───────────────────────────────────────────────────

  generateComplianceReport(framework: ControlFramework, now: number = Date.now()): ComplianceReport {
    const controls = this.listControls(framework);
    const implemented = controls.filter(c => c.maturity_current >= 3).length;
    const validated = controls.filter(c => c.maturity_current === 4).length;
    const matAvg = controls.length > 0
      ? controls.reduce((s, c) => s + c.maturity_current, 0) / controls.length
      : 0;
    const targetAvg = controls.length > 0
      ? controls.reduce((s, c) => s + c.maturity_target, 0) / controls.length
      : 0;
    const unmapped = controls
      .filter(c => !this.mappings.has(c.id) || (this.mappings.get(c.id)?.mapped_unit_ids.length ?? 0) === 0)
      .map(c => c.id);
    const recs: string[] = [];
    if (matAvg < 2) recs.push("CRITICAL: " + framework + " maturity average below 'developing' (<2) — control program not operating");
    if (unmapped.length > controls.length / 2) {
      recs.push("Over half of " + framework + " controls are unmapped to product units — schedule mapping workshop");
    }
    const gap = targetAvg - matAvg;
    if (gap > 1.5) recs.push("Maturity gap " + gap.toFixed(1) + " stages away from target — allocate remediation budget");
    if (recs.length === 0) recs.push(framework + " posture acceptable. Continue periodic reassessment.");
    return {
      generated_at: now,
      framework,
      controls_total: controls.length,
      controls_implemented: implemented,
      controls_validated: validated,
      maturity_average: matAvg,
      maturity_gap: gap,
      unmapped_control_ids: unmapped,
      recommendations: recs,
    };
  }

  getStats(): NISTStats {
    const byFw: Record<ControlFramework, number> = { NIST_AI_RMF: 0, ISO_42001: 0, STRIDE: 0 };
    let matSum = 0;
    for (const c of this.controls.values()) {
      byFw[c.framework]++;
      matSum += c.maturity_current;
    }
    const risks = Array.from(this.risks.values());
    const now = Date.now();
    return {
      controls_registered: this.controls.size,
      controls_by_framework: byFw,
      threats_registered: this.threats.size,
      mitigations_registered: this.mitigations.size,
      risks_registered: this.risks.size,
      risks_critical: risks.filter(r => r.residual_band === "critical").length,
      risks_overdue_review: risks.filter(r => r.review_due < now).length,
      avg_maturity: this.controls.size > 0 ? matSum / this.controls.size : 0,
    };
  }

  clearAll(): { controls_cleared: number; threats_cleared: number; mitigations_cleared: number; risks_cleared: number } {
    const cc = this.controls.size;
    const tc = this.threats.size;
    const mc = this.mitigations.size;
    const rc = this.risks.size;
    this.controls.clear();
    for (const c of [...DEFAULT_NIST_RMF, ...DEFAULT_ISO_42001, ...DEFAULT_STRIDE]) {
      this.controls.set(c.id, { ...c });
    }
    this.threats.clear();
    this.mitigations.clear();
    this.risks.clear();
    this.mappings.clear();
    this.threatCounter = 0;
    this.mitigationCounter = 0;
    this.riskCounter = 0;
    return { controls_cleared: cc, threats_cleared: tc, mitigations_cleared: mc, risks_cleared: rc };
  }
}

export const nistAIRMFComplianceEngine = new NISTAIRMFComplianceEngine();
