/**
 * PRISM F8: Compliance-as-Code Engine
 * =====================================
 * 
 * Manages regulatory compliance templates, auto-provisions hooks (F6),
 * configures certificates (F4), runs compliance audits, resolves
 * multi-template conflicts, and maintains append-only audit logs.
 * 
 * SAFETY: Compliance engine failure = no compliance checking.
 * All existing S(x)≥0.70 enforcement, hooks, and Ω gates continue
 * to operate independently. Compliance is ADDITIVE, never gating.
 * 
 * @version 1.0.0
 * @feature F8
 * @depends F4 (CertificateEngine), F6 (NLHookEngine)
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  RegulatoryFramework, ComplianceTemplate, ComplianceRequirement,
  ComplianceAuditEntry, ProvisionedTemplate, ComplianceConfig,
  DEFAULT_COMPLIANCE_CONFIG, COMPLIANCE_DISCLAIMER, ComplianceStatus,
  GapAnalysisResult, ComplianceGap, ConflictResolution, ConflictStrategy,
} from '../types/compliance-types.js';
import { nlHookEngine } from './NLHookEngine.js';
import { certificateEngine } from './CertificateEngine.js';
import { log } from '../utils/Logger.js';

// ============================================================================
// STATE PATHS
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'compliance');
const AUDIT_LOG_PATH = path.join(STATE_DIR, 'audit.jsonl');
const REGISTRY_PATH = path.join(STATE_DIR, 'registry.json');
const CONFIG_PATH = path.join(STATE_DIR, 'config.json');

function ensureDirs(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch { /* Non-fatal */ }
}

// ============================================================================
// BUILT-IN TEMPLATE LIBRARY — 6 regulatory frameworks
// ============================================================================

const BUILTIN_TEMPLATES: ComplianceTemplate[] = [
  {
    id: 'iso_13485_v2016', framework: 'ISO_13485', version: '2016',
    publication_date: '2016-03-01', template_version: '1.0.0',
    title: 'ISO 13485:2016 Medical Devices QMS',
    description: 'Quality management system for medical device manufacturing',
    strictness_rank: 2, legal_review_required: true,
    default_audit_retain_days: 365, default_certificate_signing: true,
    tags: ['medical', 'qms', 'device'],
    requirements: [
      {
        id: 'ISO13485-4.2.4', regulation_clause: 'ISO 13485:2016 §4.2.4',
        title: 'Control of Documents', severity: 'mandatory',
        description: 'Documents required by QMS shall be controlled with approval, review, updates, and version identification.',
        hook_spec: { natural_language: 'log when any document is modified to track version changes for QMS compliance', phase: 'post-output', mode: 'log' },
        audit_policy: { mode: 'cadence', retain_days: 365, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.70 },
        conflict_priority: 2,
      },
      {
        id: 'ISO13485-7.5.1', regulation_clause: 'ISO 13485:2016 §7.5.1',
        title: 'Control of Production', severity: 'mandatory',
        description: 'Production shall be planned and carried out under controlled conditions including documented procedures and process validation.',
        hook_spec: { natural_language: 'warn if cutting parameters are used without documented validation for medical device production', phase: 'pre-calculation', mode: 'warning' },
        audit_policy: { mode: 'both', retain_days: 365, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.75 },
        conflict_priority: 2,
      },
      {
        id: 'ISO13485-8.2.4', regulation_clause: 'ISO 13485:2016 §8.2.4',
        title: 'Monitoring and Measurement of Product', severity: 'mandatory',
        description: 'Product characteristics shall be monitored and measured at appropriate stages per planned arrangements.',
        hook_spec: { natural_language: 'log all calculation outputs with safety scores for product measurement traceability', phase: 'post-calculation', mode: 'log' },
        audit_policy: { mode: 'cadence', retain_days: 365, include_in_certificate: true },
        conflict_priority: 3,
      },
    ],
  },
  {
    id: 'as9100_rev_d', framework: 'AS9100', version: 'Rev D',
    publication_date: '2016-09-01', template_version: '1.0.0',
    title: 'AS9100 Rev D Aerospace QMS',
    description: 'Quality management system for aerospace manufacturing',
    strictness_rank: 3, legal_review_required: true,
    default_audit_retain_days: 730, default_certificate_signing: true,
    tags: ['aerospace', 'qms', 'aviation'],
    requirements: [
      {
        id: 'AS9100-8.5.1', regulation_clause: 'AS9100D §8.5.1',
        title: 'Control of Production and Service Provision', severity: 'mandatory',
        description: 'First article inspection, process control with defined methods, and controlled conditions for production.',
        hook_spec: { natural_language: 'warn if first article inspection data is missing for aerospace production operations', phase: 'pre-calculation', mode: 'warning' },
        audit_policy: { mode: 'cadence', retain_days: 730, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.80 },
        conflict_priority: 3,
      },
      {
        id: 'AS9100-8.5.2', regulation_clause: 'AS9100D §8.5.2',
        title: 'Special Process Validation', severity: 'mandatory',
        description: 'Processes where output cannot be verified by subsequent monitoring shall be validated.',
        hook_spec: { natural_language: 'block if special process parameters lack prior validation records for aerospace', phase: 'pre-calculation', mode: 'block' },
        audit_policy: { mode: 'both', retain_days: 730, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.85 },
        conflict_priority: 2,
      },
    ],
  },
  {
    id: 'itar_22cfr', framework: 'ITAR', version: '22 CFR 120-130',
    publication_date: '2023-03-01', template_version: '1.0.0',
    title: 'ITAR Export Control',
    description: 'International Traffic in Arms Regulations for defense articles and services',
    strictness_rank: 1, legal_review_required: true,
    default_audit_retain_days: 1825, default_certificate_signing: true,
    tags: ['defense', 'export', 'itar', 'munitions'],
    requirements: [
      {
        id: 'ITAR-120.17', regulation_clause: 'ITAR 22 CFR §120.17',
        title: 'Export Control Classification', severity: 'mandatory',
        description: 'Defense articles on USML must be classified and controlled. All access to technical data must be restricted to US persons.',
        hook_spec: { natural_language: 'block if export-controlled material data is accessed without ITAR authorization verification', phase: 'pre-calculation', mode: 'block' },
        audit_policy: { mode: 'synchronous', retain_days: 1825, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.90 },
        access_control: { required_roles: ['itar_authorized'], deny_roles: ['foreign_national'] },
        conflict_priority: 1,
      },
      {
        id: 'ITAR-122.1', regulation_clause: 'ITAR 22 CFR §122.1',
        title: 'Registration Requirement', severity: 'mandatory',
        description: 'Manufacturers of defense articles must register with DDTC.',
        audit_policy: { mode: 'cadence', retain_days: 1825, include_in_certificate: true },
        conflict_priority: 1,
      },
    ],
  },
  {
    id: 'soc2_type2', framework: 'SOC2', version: 'Type II',
    publication_date: '2022-01-01', template_version: '1.0.0',
    title: 'SOC 2 Type II Trust Services',
    description: 'Service organization controls for security, availability, processing integrity, confidentiality, and privacy',
    strictness_rank: 5, legal_review_required: false,
    default_audit_retain_days: 365, default_certificate_signing: true,
    tags: ['security', 'trust', 'service'],
    requirements: [
      {
        id: 'SOC2-CC6.1', regulation_clause: 'SOC 2 CC6.1',
        title: 'Logical and Physical Access Controls', severity: 'mandatory',
        description: 'Logical access to information assets is restricted through access controls.',
        hook_spec: { natural_language: 'log all dispatcher access with session and user context for SOC2 access audit', phase: 'on-tool-call', mode: 'log' },
        audit_policy: { mode: 'cadence', retain_days: 365, include_in_certificate: false },
        conflict_priority: 5,
      },
      {
        id: 'SOC2-CC7.2', regulation_clause: 'SOC 2 CC7.2',
        title: 'System Monitoring', severity: 'mandatory',
        description: 'The entity monitors system components for anomalies indicative of malicious acts or errors.',
        hook_spec: { natural_language: 'warn if anomaly score exceeds threshold for system monitoring compliance', phase: 'post-calculation', mode: 'warning' },
        audit_policy: { mode: 'cadence', retain_days: 365, include_in_certificate: true },
        conflict_priority: 5,
      },
    ],
  },
  {
    id: 'hipaa_security', framework: 'HIPAA', version: 'Security Rule',
    publication_date: '2013-01-25', template_version: '1.0.0',
    title: 'HIPAA Security Rule',
    description: 'Administrative, physical, and technical safeguards for electronic protected health information',
    strictness_rank: 4, legal_review_required: true,
    default_audit_retain_days: 2190, default_certificate_signing: true,
    tags: ['healthcare', 'phi', 'privacy', 'security'],
    requirements: [
      {
        id: 'HIPAA-164.312a', regulation_clause: 'HIPAA 45 CFR §164.312(a)',
        title: 'Access Control', severity: 'mandatory',
        description: 'Implement technical policies to allow access only to authorized persons or software programs.',
        hook_spec: { natural_language: 'block if PHI-related data is accessed without HIPAA access control verification', phase: 'pre-calculation', mode: 'block' },
        audit_policy: { mode: 'synchronous', retain_days: 2190, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.80 },
        access_control: { required_roles: ['hipaa_authorized'], deny_roles: [] },
        conflict_priority: 2,
      },
      {
        id: 'HIPAA-164.312b', regulation_clause: 'HIPAA 45 CFR §164.312(b)',
        title: 'Audit Controls', severity: 'mandatory',
        description: 'Implement hardware, software, and procedural mechanisms to record and examine activity in systems with ePHI.',
        hook_spec: { natural_language: 'log all system activity involving health data for HIPAA audit controls', phase: 'post-output', mode: 'log' },
        audit_policy: { mode: 'both', retain_days: 2190, include_in_certificate: true },
        conflict_priority: 3,
      },
    ],
  },
  {
    id: 'fda_21cfr11', framework: 'FDA_21CFR11', version: '21 CFR Part 11',
    publication_date: '1997-08-20', template_version: '1.0.0',
    title: 'FDA 21 CFR Part 11 Electronic Records',
    description: 'Requirements for electronic records and electronic signatures in FDA-regulated industries',
    strictness_rank: 1, legal_review_required: true,
    default_audit_retain_days: 2555, default_certificate_signing: true,
    tags: ['fda', 'electronic-records', 'signatures', 'pharmaceutical'],
    requirements: [
      {
        id: 'FDA11-11.10a', regulation_clause: '21 CFR §11.10(a)',
        title: 'System Validation', severity: 'mandatory',
        description: 'Systems shall be validated to ensure accuracy, reliability, consistent intended performance, and ability to discern invalid records.',
        hook_spec: { natural_language: 'block if system validation status is not confirmed before generating electronic records', phase: 'pre-calculation', mode: 'block' },
        audit_policy: { mode: 'synchronous', retain_days: 2555, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.90 },
        conflict_priority: 1,
      },
      {
        id: 'FDA11-11.10e', regulation_clause: '21 CFR §11.10(e)',
        title: 'Audit Trail', severity: 'mandatory',
        description: 'Computer-generated, timestamped audit trails recording date/time of operator entries and actions that create, modify, or delete electronic records. Audit trail shall not be modified.',
        hook_spec: { natural_language: 'log all record creation modification and deletion with timestamp and operator identity for FDA audit trail', phase: 'post-output', mode: 'log' },
        audit_policy: { mode: 'synchronous', retain_days: 2555, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.85 },
        conflict_priority: 1,
      },
      {
        id: 'FDA11-11.50', regulation_clause: '21 CFR §11.50',
        title: 'Signature Manifestations', severity: 'mandatory',
        description: 'Signed electronic records shall contain printed name, date/time of signing, and meaning of signature.',
        audit_policy: { mode: 'synchronous', retain_days: 2555, include_in_certificate: true },
        certificate_config: { require_signature: true, min_safety_score: 0.80 },
        conflict_priority: 1,
      },
    ],
  },
];

// ============================================================================
// COMPLIANCE ENGINE — SINGLETON
// ============================================================================

export class ComplianceEngine {
  private config: ComplianceConfig;
  private templates: Map<string, ComplianceTemplate> = new Map();
  private provisioned: Map<string, ProvisionedTemplate> = new Map();
  private initialized: boolean = false;

  // Telemetry
  private metrics = {
    templates_provisioned: 0, templates_removed: 0, hooks_created: 0,
    audits_run: 0, gaps_found: 0, conflicts_resolved: 0,
    audit_entries_written: 0, provision_errors: 0,
    avg_audit_ms: 0, last_audit_at: 0,
  };

  constructor(configOverrides?: Partial<ComplianceConfig>) {
    this.config = { ...DEFAULT_COMPLIANCE_CONFIG, ...configOverrides };
  }

  init(): void {
    if (this.initialized) return;
    ensureDirs();

    // Load built-in templates
    for (const t of BUILTIN_TEMPLATES) {
      this.templates.set(t.id, t);
    }

    // Load provisioned registry
    this.loadRegistry();
    this.initialized = true;
    log.info(`[COMPLIANCE] Engine initialized (${this.templates.size} templates, ${this.provisioned.size} provisioned)`);
  }

  // ==========================================================================
  // TEMPLATE PROVISIONING — Deploy a compliance template
  // ==========================================================================

  applyTemplate(templateId: string, provisionedBy: string = 'system',
                disclaimerAcknowledged: boolean = false): {
    success: boolean; reason?: string; provisioned?: ProvisionedTemplate;
    hooks_created?: string[]; disclaimer: string;
  } {
    this.init();
    const disclaimer = COMPLIANCE_DISCLAIMER;

    // Gate: disclaimer acknowledgment
    if (this.config.require_disclaimer_ack && !disclaimerAcknowledged) {
      return { success: false, reason: 'Disclaimer must be acknowledged before provisioning. Templates are guidance only, not legal advice.', disclaimer };
    }

    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, reason: `Template '${templateId}' not found. Available: ${[...this.templates.keys()].join(', ')}`, disclaimer };
    }

    // Gate: max templates
    const activeCount = [...this.provisioned.values()].filter(p => p.status === 'active').length;
    if (activeCount >= this.config.max_templates) {
      return { success: false, reason: `Maximum ${this.config.max_templates} templates reached`, disclaimer };
    }

    // Gate: already provisioned?
    if (this.provisioned.has(templateId) && this.provisioned.get(templateId)!.status === 'active') {
      return { success: false, reason: `Template '${templateId}' already active`, disclaimer };
    }

    try {
      const hookIds: string[] = [];

      // Auto-provision hooks via F6
      if (this.config.auto_provision_hooks) {
        for (const req of template.requirements) {
          if (!req.hook_spec) continue;
          try {
            const result = nlHookEngine.createFromNL(req.hook_spec.natural_language);
            if (result.deploy?.hook_id) {
              hookIds.push(result.deploy.hook_id);
              this.metrics.hooks_created++;
            }
          } catch (e) {
            log.warn(`[COMPLIANCE] Hook provision failed for ${req.id}: ${(e as Error).message}`);
          }
        }
      }

      // Auto-configure certificates via F4
      if (this.config.auto_configure_certs) {
        try {
          certificateEngine.init(); // Ensure initialized
        } catch { /* F4 init failure is non-fatal */ }
      }

      const record: ProvisionedTemplate = {
        template_id: templateId,
        framework: template.framework,
        provisioned_at: Date.now(),
        provisioned_by: provisionedBy,
        hook_ids: hookIds,
        requirement_count: template.requirements.length,
        status: 'active',
        last_audit_at: 0,
        compliance_score: 0,
        disclaimer_acknowledged: disclaimerAcknowledged,
      };

      this.provisioned.set(templateId, record);
      this.saveRegistry();
      this.metrics.templates_provisioned++;

      // Write audit entry
      this.writeAuditEntry(template.framework, templateId, 'PROVISION',
        'compliant', `Template provisioned with ${hookIds.length} hooks by ${provisionedBy}`);

      log.info(`[COMPLIANCE] Template '${templateId}' provisioned (${hookIds.length} hooks, ${template.requirements.length} requirements)`);
      return { success: true, provisioned: record, hooks_created: hookIds, disclaimer };
    } catch (e) {
      this.metrics.provision_errors++;
      return { success: false, reason: `Provision failed: ${(e as Error).message}`, disclaimer };
    }
  }

  // ==========================================================================
  // TEMPLATE REMOVAL
  // ==========================================================================

  removeTemplate(templateId: string): { success: boolean; reason?: string } {
    this.init();
    const record = this.provisioned.get(templateId);
    if (!record || record.status !== 'active') {
      return { success: false, reason: `Template '${templateId}' not active` };
    }

    try {
      // Remove F6 hooks
      for (const hookId of record.hook_ids) {
        try { nlHookEngine.remove(hookId); } catch { /* best-effort */ }
      }

      // Mark removed (keep record for audit trail)
      const updated: ProvisionedTemplate = { ...record, status: 'removed' };
      this.provisioned.set(templateId, updated);
      this.saveRegistry();
      this.metrics.templates_removed++;

      this.writeAuditEntry(record.framework, templateId, 'REMOVAL',
        'not_assessed', `Template removed, ${record.hook_ids.length} hooks deregistered`);

      return { success: true };
    } catch (e) {
      return { success: false, reason: `Removal failed: ${(e as Error).message}` };
    }
  }

  // ==========================================================================
  // COMPLIANCE AUDIT — Check active templates against current state
  // ==========================================================================

  runAudit(templateId?: string): {
    results: { template_id: string; framework: RegulatoryFramework; score: number; details: string }[];
    total_score: number; disclaimer: string;
  } {
    this.init();
    const start = Date.now();
    const results: { template_id: string; framework: RegulatoryFramework; score: number; details: string }[] = [];

    const targets = templateId
      ? [this.provisioned.get(templateId)].filter(Boolean) as ProvisionedTemplate[]
      : [...this.provisioned.values()].filter(p => p.status === 'active');

    for (const prov of targets) {
      const template = this.templates.get(prov.template_id);
      if (!template) continue;

      let passing = 0;
      const total = template.requirements.length;

      for (const req of template.requirements) {
        // Check if corresponding hook exists and is active
        const hookActive = req.hook_spec
          ? prov.hook_ids.some(id => { try { return nlHookEngine.get(id) !== null; } catch { return false; } })
          : true; // No hook needed

        if (hookActive) passing++;
      }

      const score = total > 0 ? passing / total : 0;

      // Update provisioned record
      const updated: ProvisionedTemplate = { ...prov, compliance_score: score, last_audit_at: Date.now() };
      this.provisioned.set(prov.template_id, updated);

      results.push({
        template_id: prov.template_id,
        framework: template.framework,
        score,
        details: `${passing}/${total} requirements active (${(score * 100).toFixed(0)}%)`,
      });

      this.writeAuditEntry(template.framework, prov.template_id, 'AUDIT',
        score >= 0.9 ? 'compliant' : score >= 0.5 ? 'partial' : 'non_compliant',
        `Audit score: ${(score * 100).toFixed(0)}% (${passing}/${total})`);
    }

    this.saveRegistry();
    this.metrics.audits_run++;
    const auditMs = Date.now() - start;
    this.metrics.avg_audit_ms = this.metrics.audits_run === 1 ? auditMs
      : this.metrics.avg_audit_ms * 0.9 + auditMs * 0.1;
    this.metrics.last_audit_at = Date.now();

    const totalScore = results.length > 0
      ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;

    return { results, total_score: totalScore, disclaimer: COMPLIANCE_DISCLAIMER };
  }

  // ==========================================================================
  // GAP ANALYSIS — Identify missing controls per template
  // ==========================================================================

  gapAnalysis(templateId: string): GapAnalysisResult | { error: string; disclaimer: string } {
    this.init();
    const template = this.templates.get(templateId);
    if (!template) {
      return { error: `Template '${templateId}' not found`, disclaimer: COMPLIANCE_DISCLAIMER };
    }

    const prov = this.provisioned.get(templateId);
    const gaps: ComplianceGap[] = [];
    let compliant = 0, partial = 0, non_compliant = 0, not_assessed = 0;

    for (const req of template.requirements) {
      let status: ComplianceStatus = 'not_assessed';
      let reason = '';
      let remediation = '';

      if (!prov || prov.status !== 'active') {
        status = 'not_assessed';
        reason = 'Template not provisioned';
        remediation = `Apply template: prism_compliance apply_template ${templateId}`;
      } else if (req.hook_spec) {
        const hookActive = prov.hook_ids.some(id => {
          try { return nlHookEngine.get(id) !== null; } catch { return false; }
        });
        if (hookActive) {
          status = 'compliant';
        } else {
          status = 'non_compliant';
          reason = 'Required hook not active or failed deployment';
          remediation = `Re-provision template or manually create hook: "${req.hook_spec.natural_language}"`;
        }
      } else {
        // No hook needed — manual/procedural requirement
        status = 'partial';
        reason = 'Procedural requirement — requires manual verification';
        remediation = `Verify ${req.regulation_clause} compliance through manual review`;
      }

      if (status === 'compliant') compliant++;
      else if (status === 'partial') partial++;
      else if (status === 'non_compliant') non_compliant++;
      else not_assessed++;

      if (status !== 'compliant') {
        gaps.push({
          requirement_id: req.id, regulation_clause: req.regulation_clause,
          title: req.title, severity: req.severity, status, reason, remediation,
        });
        this.metrics.gaps_found++;
      }
    }

    const total = template.requirements.length;
    return {
      template_id: templateId, framework: template.framework,
      timestamp: Date.now(), total_requirements: total,
      compliant, partial, non_compliant, not_assessed, gaps,
      compliance_percentage: total > 0 ? (compliant / total) * 100 : 0,
      disclaimer: COMPLIANCE_DISCLAIMER,
    };
  }

  // ==========================================================================
  // CONFLICT RESOLUTION — Multi-template overlap handling
  // ==========================================================================

  resolveConflicts(): {
    conflicts: { field: string; templates: string[]; values: unknown[]; resolved: unknown; strategy: ConflictStrategy }[];
    disclaimer: string;
  } {
    this.init();
    const active = [...this.provisioned.entries()]
      .filter(([, p]) => p.status === 'active')
      .map(([id]) => this.templates.get(id))
      .filter(Boolean) as ComplianceTemplate[];

    if (active.length <= 1) {
      return { conflicts: [], disclaimer: COMPLIANCE_DISCLAIMER };
    }

    const conflicts: { field: string; templates: string[]; values: unknown[]; resolved: unknown; strategy: ConflictStrategy }[] = [];

    // Resolve retain_days: MAX
    const retainValues = active.map(t => ({ id: t.id, val: t.default_audit_retain_days }));
    if (new Set(retainValues.map(r => r.val)).size > 1) {
      const max = Math.max(...retainValues.map(r => r.val));
      conflicts.push({
        field: 'retain_days', templates: retainValues.map(r => r.id),
        values: retainValues.map(r => r.val), resolved: max, strategy: 'MAX',
      });
    }

    // Resolve signing: TRUE (any requires → all require)
    const signValues = active.map(t => ({ id: t.id, val: t.default_certificate_signing }));
    if (signValues.some(s => s.val)) {
      conflicts.push({
        field: 'certificate_signing', templates: signValues.map(s => s.id),
        values: signValues.map(s => s.val), resolved: true, strategy: 'TRUE',
      });
    }

    // Resolve strictness: MIN rank (most strict wins)
    const strictValues = active.map(t => ({ id: t.id, val: t.strictness_rank }));
    if (new Set(strictValues.map(s => s.val)).size > 1) {
      const strictest = Math.min(...strictValues.map(s => s.val));
      const winner = active.find(t => t.strictness_rank === strictest);
      conflicts.push({
        field: 'strictness_precedence', templates: strictValues.map(s => s.id),
        values: strictValues.map(s => s.val), resolved: winner?.id, strategy: 'STRICTEST',
      });
    }

    this.metrics.conflicts_resolved += conflicts.length;
    return { conflicts, disclaimer: COMPLIANCE_DISCLAIMER };
  }

  // ==========================================================================
  // AUDIT LOG — Append-only, NEVER compacted
  // ==========================================================================

  private writeAuditEntry(framework: RegulatoryFramework, templateId: string,
    requirementId: string, status: ComplianceStatus, details: string,
    extras?: { session_id?: string; dispatcher?: string; action?: string; certificate_id?: string; hook_id?: string }): void {
    try {
      const entry: ComplianceAuditEntry = {
        id: randomUUID(), timestamp: Date.now(),
        framework, template_id: templateId, requirement_id: requirementId,
        regulation_clause: requirementId, status, details,
        session_id: extras?.session_id || 'system',
        dispatcher: extras?.dispatcher, action: extras?.action,
        certificate_id: extras?.certificate_id, hook_id: extras?.hook_id,
        disclaimer: COMPLIANCE_DISCLAIMER,
      };

      ensureDirs();
      fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n');
      this.metrics.audit_entries_written++;
    } catch (e) {
      log.warn(`[COMPLIANCE] Audit write failed: ${(e as Error).message}`);
    }
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  listTemplates(): { available: { id: string; framework: RegulatoryFramework; title: string; strictness: number; legal_review: boolean }[];
                     provisioned: { id: string; framework: RegulatoryFramework; status: string; score: number }[];
                     disclaimer: string } {
    this.init();
    return {
      available: [...this.templates.values()].map(t => ({
        id: t.id, framework: t.framework, title: t.title,
        strictness: t.strictness_rank, legal_review: t.legal_review_required,
      })),
      provisioned: [...this.provisioned.values()].map(p => ({
        id: p.template_id, framework: p.framework,
        status: p.status, score: p.compliance_score,
      })),
      disclaimer: COMPLIANCE_DISCLAIMER,
    };
  }

  getTemplate(templateId: string): ComplianceTemplate | null {
    this.init();
    return this.templates.get(templateId) || null;
  }

  getAuditLog(limit: number = 50, framework?: RegulatoryFramework): ComplianceAuditEntry[] {
    try {
      if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
      const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8').split('\n').filter(Boolean);
      let entries: ComplianceAuditEntry[] = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      if (framework) entries = entries.filter(e => e.framework === framework);
      return entries.slice(-limit).reverse();
    } catch { return []; }
  }

  // ==========================================================================
  // REGISTRY PERSISTENCE
  // ==========================================================================

  private saveRegistry(): void {
    try {
      ensureDirs();
      const data = JSON.stringify({
        provisioned: Object.fromEntries(this.provisioned),
        saved_at: Date.now(),
      });
      const tmpPath = REGISTRY_PATH + '.tmp';
      fs.writeFileSync(tmpPath, data);
      fs.renameSync(tmpPath, REGISTRY_PATH);
    } catch (e) {
      log.warn(`[COMPLIANCE] Registry save failed: ${(e as Error).message}`);
    }
  }

  private loadRegistry(): void {
    try {
      if (fs.existsSync(REGISTRY_PATH)) {
        const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
        if (raw.provisioned) {
          for (const [key, val] of Object.entries(raw.provisioned)) {
            this.provisioned.set(key, val as ProvisionedTemplate);
          }
        }
      }
    } catch (e) {
      log.warn(`[COMPLIANCE] Registry load failed: ${(e as Error).message}`);
    }
  }

  // ==========================================================================
  // METRICS & CONFIG
  // ==========================================================================

  getStats(): {
    templates_available: number; templates_active: number;
    total_requirements: number; metrics: typeof this.metrics;
    disclaimer: string;
  } {
    this.init();
    const activeTemplates = [...this.provisioned.values()].filter(p => p.status === 'active');
    const totalReqs = activeTemplates.reduce((s, p) => {
      const t = this.templates.get(p.template_id);
      return s + (t?.requirements.length || 0);
    }, 0);
    return {
      templates_available: this.templates.size,
      templates_active: activeTemplates.length,
      total_requirements: totalReqs,
      metrics: { ...this.metrics },
      disclaimer: COMPLIANCE_DISCLAIMER,
    };
  }

  getConfig(): ComplianceConfig { return { ...this.config }; }

  updateConfig(updates: Partial<ComplianceConfig>): ComplianceConfig {
    this.config = { ...this.config, ...updates };
    try {
      ensureDirs();
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch { /* non-fatal */ }
    return { ...this.config };
  }

  shutdown(): void {
    this.saveRegistry();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const complianceEngine = new ComplianceEngine();
