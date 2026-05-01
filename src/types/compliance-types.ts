/**
 * PRISM F8: Compliance-as-Code Template Types
 * =============================================
 * 
 * Templates encode regulatory requirements as deployable configurations.
 * Templates are GUIDANCE ONLY — not legal or regulatory advice.
 * 
 * DISCLAIMER: PRISM compliance templates are informational aids that
 * approximate regulatory requirements. They do NOT constitute legal advice,
 * regulatory certification, or guarantee of compliance. Organizations MUST
 * engage qualified regulatory counsel and conduct independent compliance
 * assessments. Template accuracy depends on regulation version dates and
 * may not reflect amendments or jurisdiction-specific interpretations.
 * 
 * @version 1.0.0
 * @feature F8
 * @depends F4 (CertificateEngine), F6 (NLHookEngine)
 */

// ============================================================================
// DISCLAIMER — Embedded in every compliance output
// ============================================================================

export const COMPLIANCE_DISCLAIMER = 
  'DISCLAIMER: PRISM compliance templates are informational guidance only. ' +
  'They do NOT constitute legal advice, regulatory certification, or guarantee ' +
  'of compliance. Organizations MUST engage qualified regulatory counsel. ' +
  'Template version and regulation publication date should be independently verified.';

// ============================================================================
// REGULATORY FRAMEWORK
// ============================================================================

export type RegulatoryFramework =
  | 'ISO_13485'      // Medical devices QMS
  | 'AS9100'         // Aerospace QMS
  | 'ITAR'           // International Traffic in Arms Regulations
  | 'SOC2'           // Service Organization Controls
  | 'HIPAA'          // Health Insurance Portability and Accountability
  | 'FDA_21CFR11';   // Electronic records/signatures

export type RequirementSeverity = 'mandatory' | 'recommended' | 'optional';
export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
export type AuditMode = 'synchronous' | 'cadence' | 'both';

// ============================================================================
// COMPLIANCE REQUIREMENT — Single regulatory clause → PRISM controls
// ============================================================================

export interface ComplianceRequirement {
  readonly id: string;                    // e.g. 'ISO13485-4.2.4'
  readonly regulation_clause: string;     // e.g. 'ISO 13485:2016 §4.2.4'
  readonly title: string;                 // Human-readable
  readonly description: string;           // What the clause requires
  readonly severity: RequirementSeverity;
  readonly hook_spec?: {                  // Auto-provision via F6
    readonly natural_language: string;    // NL description for F6 parser
    readonly phase: string;
    readonly mode: 'block' | 'warning' | 'log';
  };
  readonly audit_policy: {
    readonly mode: AuditMode;            // synchronous for FDA 21 CFR 11
    readonly retain_days: number;         // Minimum retention
    readonly include_in_certificate: boolean;
  };
  readonly certificate_config?: {         // F4 integration
    readonly require_signature: boolean;
    readonly min_safety_score: number;
  };
  readonly access_control?: {
    readonly required_roles: string[];
    readonly deny_roles: string[];
  };
  readonly conflict_priority: number;     // 1=highest, used in strictness lattice
}

// ============================================================================
// COMPLIANCE TEMPLATE — Full regulatory framework package
// ============================================================================

export interface ComplianceTemplate {
  readonly id: string;                    // e.g. 'iso_13485_v2016'
  readonly framework: RegulatoryFramework;
  readonly version: string;               // Regulation version
  readonly publication_date: string;      // When regulation was published
  readonly template_version: string;      // PRISM template version
  readonly title: string;
  readonly description: string;
  readonly requirements: ComplianceRequirement[];
  readonly default_audit_retain_days: number;
  readonly default_certificate_signing: boolean;
  readonly strictness_rank: number;       // Global: 1=most strict. For lattice ordering.
  readonly tags: string[];
  readonly legal_review_required: boolean; // true for ITAR, FDA, HIPAA
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export type ConflictStrategy = 'MAX' | 'MIN' | 'TRUE' | 'INTERSECT' | 'UNION' | 'STRICTEST';

export interface ConflictResolution {
  readonly field: string;
  readonly strategy: ConflictStrategy;
  readonly description: string;
}

/** Default conflict resolution rules */
export const DEFAULT_CONFLICT_RULES: ConflictResolution[] = [
  { field: 'retain_days', strategy: 'MAX', description: 'Longest retention wins' },
  { field: 'require_signature', strategy: 'TRUE', description: 'If any template requires signing, sign' },
  { field: 'min_safety_score', strategy: 'MAX', description: 'Highest safety threshold wins' },
  { field: 'required_roles', strategy: 'INTERSECT', description: 'Only roles allowed by ALL templates' },
  { field: 'deny_roles', strategy: 'UNION', description: 'Deny if ANY template denies' },
  { field: 'mode_block_vs_warn', strategy: 'STRICTEST', description: 'Block > warning > log' },
  { field: 'conflict_priority', strategy: 'MIN', description: 'Lower number = higher priority wins' },
];

// ============================================================================
// AUDIT LOG ENTRY — Append-only, NEVER compacted
// ============================================================================

export interface ComplianceAuditEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly framework: RegulatoryFramework;
  readonly template_id: string;
  readonly requirement_id: string;
  readonly regulation_clause: string;
  readonly status: ComplianceStatus;
  readonly details: string;
  readonly session_id: string;
  readonly dispatcher?: string;
  readonly action?: string;
  readonly certificate_id?: string;       // Link to F4 cert
  readonly hook_id?: string;              // Link to F6 hook
  readonly disclaimer: string;            // ALWAYS present
}

// ============================================================================
// PROVISIONED TEMPLATE RECORD
// ============================================================================

export interface ProvisionedTemplate {
  readonly template_id: string;
  readonly framework: RegulatoryFramework;
  readonly provisioned_at: number;
  readonly provisioned_by: string;
  readonly hook_ids: string[];            // F6 hooks created
  readonly requirement_count: number;
  readonly status: 'active' | 'suspended' | 'removed';
  readonly last_audit_at: number;
  readonly compliance_score: number;      // 0-1, % of requirements passing
  readonly disclaimer_acknowledged: boolean;
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

export interface ComplianceGap {
  readonly requirement_id: string;
  readonly regulation_clause: string;
  readonly title: string;
  readonly severity: RequirementSeverity;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly remediation: string;
}

export interface GapAnalysisResult {
  readonly template_id: string;
  readonly framework: RegulatoryFramework;
  readonly timestamp: number;
  readonly total_requirements: number;
  readonly compliant: number;
  readonly partial: number;
  readonly non_compliant: number;
  readonly not_assessed: number;
  readonly gaps: ComplianceGap[];
  readonly compliance_percentage: number;
  readonly disclaimer: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ComplianceConfig {
  enabled: boolean;
  audit_cadence_calls: number;           // Run auditor every N calls (default 25)
  audit_log_path: string;
  max_templates: number;                 // Max simultaneous templates
  require_disclaimer_ack: boolean;       // Must acknowledge before provisioning
  auto_provision_hooks: boolean;         // Auto-create F6 hooks from requirements
  auto_configure_certs: boolean;         // Auto-configure F4 from requirements
  conflict_rules: ConflictResolution[];
}

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  enabled: true,
  audit_cadence_calls: 25,
  audit_log_path: 'state/compliance/audit.jsonl',
  max_templates: 10,
  require_disclaimer_ack: true,
  auto_provision_hooks: true,
  auto_configure_certs: true,
  conflict_rules: DEFAULT_CONFLICT_RULES,
};
