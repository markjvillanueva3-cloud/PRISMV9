/**
 * PRISM Security Dispatcher — Phase 9 (LATHE-PROD-READY-MS0)
 *
 * prism_security — 171 actions for security operations:
 *   - Tenant isolation (U-LPR-SEC01)
 *   - Encryption at rest (U-LPR-SEC02)
 *   - Access control lists (U-LPR-SEC03)
 *   - Audit logging (U-LPR-SEC04)
 *   - Rate limiting (U-LPR-SEC05)
 *   - Session management (U-LPR-SEC06)
 *   - Input sanitization (U-LPR-SEC07)
 *   - CSRF protection (U-LPR-SEC08)
 *   - Security headers / CSP (U-LPR-SEC09)
 *   - Secret management (U-LPR-SEC10)
 *   - PII compliance / GDPR / CCPA (U-LPR-SEC11)
 *   - Zero-trust telemetry / mTLS / SPIFFE (U-LPR-SEC12)
 *   - Incident response / DFIR / LLM red-team (U-LPR-SEC-IR)
 *   - JWT validation
 *   - Attack vector detection
 *   - Cross-tenant access control
 *   - Query security
 *
 * @milestone LATHE-PROD-READY-MS0
 * @phase PHASE-9 (Security + Compliance)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";

// Lazy engine loaders
let _tenantIsolation: any;
let _encryption: any;
let _acl: any;

async function getTenantIsolation(): Promise<any> {
  return _tenantIsolation ??= (
    await import("../../engines/TenantIsolationEngine.js")
  ).tenantIsolationEngine;
}

async function getEncryption(): Promise<any> {
  return _encryption ??= (
    await import("../../engines/EncryptionAtRestEngine.js")
  ).encryptionAtRestEngine;
}

async function getACL(): Promise<any> {
  return _acl ??= (
    await import("../../engines/AccessControlListEngine.js")
  ).accessControlListEngine;
}

let _audit: any;
async function getAudit(): Promise<any> {
  return _audit ??= (
    await import("../../engines/AuditLoggingEngine.js")
  ).auditLoggingEngine;
}

let _rateLimit: any;
async function getRateLimit(): Promise<any> {
  return _rateLimit ??= (
    await import("../../engines/RateLimitingEngine.js")
  ).rateLimitingEngine;
}

let _session: any;
async function getSession(): Promise<any> {
  return _session ??= (
    await import("../../engines/SessionManagementEngine.js")
  ).sessionManagementEngine;
}

let _sanitize: any;
async function getSanitize(): Promise<any> {
  return _sanitize ??= (
    await import("../../engines/InputSanitizationEngine.js")
  ).inputSanitizationEngine;
}

let _csrf: any;
async function getCSRF(): Promise<any> {
  return _csrf ??= (
    await import("../../engines/CSRFProtectionEngine.js")
  ).csrfProtectionEngine;
}

let _secHeaders: any;
async function getSecHeaders(): Promise<any> {
  return _secHeaders ??= (
    await import("../../engines/SecurityHeadersEngine.js")
  ).securityHeadersEngine;
}

let _secrets: any;
async function getSecrets(): Promise<any> {
  return _secrets ??= (
    await import("../../engines/SecretManagementEngine.js")
  ).secretManagementEngine;
}

let _pii: any;
async function getPII(): Promise<any> {
  return _pii ??= (
    await import("../../engines/PIIComplianceEngine.js")
  ).piiComplianceEngine;
}

let _zeroTrust: any;
async function getZeroTrust(): Promise<any> {
  return _zeroTrust ??= (
    await import("../../engines/ZeroTrustTelemetryEngine.js")
  ).zeroTrustTelemetryEngine;
}

let _ir: any;
async function getIR(): Promise<any> {
  return _ir ??= (
    await import("../../engines/IncidentResponseEngine.js")
  ).incidentResponseEngine;
}

let _modelConf: any;
async function getModelConfidentiality(): Promise<any> {
  return _modelConf ??= (
    await import("../../engines/ModelConfidentialityEngine.js")
  ).modelConfidentialityEngine;
}

let _supplyChain: any;
async function getSupplyChain(): Promise<any> {
  return _supplyChain ??= (
    await import("../../engines/SupplyChainIntegrityEngine.js")
  ).supplyChainIntegrityEngine;
}

let _authz: any;
async function getAuthz(): Promise<any> {
  return _authz ??= (
    await import("../../engines/AuthorizationEngine.js")
  ).authorizationEngine;
}

let _legalGate: any;
async function getLegalGate(): Promise<any> {
  return _legalGate ??= (
    await import("../../engines/LegalGateEngine.js")
  ).legalGateEngine;
}

const ACTIONS = [
  // Tenant Isolation (U-LPR-SEC01)
  "validate_jwt",
  "validate_query",
  "validate_input",
  "validate_path",
  "validate_url",
  "scope_query",
  "validate_cross_tenant",
  "get_attack_vectors",
  "run_attack_tests",
  "get_security_stats",
  "isolation_audit",
  "check_injection",
  "check_traversal",
  "check_ssrf",
  "check_privilege_escalation",
  // Encryption At Rest (U-LPR-SEC02)
  "encrypt_data",
  "decrypt_data",
  "rotate_key",
  "get_key_metadata",
  "check_rotation_due",
  "create_envelope_key",
  "revoke_key",
  "get_encryption_stats",
  // Access Control Lists (U-LPR-SEC03)
  "acl_create_rule",
  "acl_update_rule",
  "acl_delete_rule",
  "acl_get_rule",
  "acl_list_rules",
  "acl_check_access",
  "acl_check_multiple",
  "acl_get_effective_permissions",
  "acl_create_hierarchy",
  "acl_get_deny_audit_log",
  "acl_get_stats",
  // Audit Logging (U-LPR-SEC04)
  "audit_log_event",
  "audit_log_auth",
  "audit_log_authz",
  "audit_log_data_access",
  "audit_log_data_mod",
  "audit_log_security_alert",
  "audit_log_config_change",
  "audit_query_events",
  "audit_export",
  "audit_verify_chain",
  "audit_get_stats",
  // Rate Limiting (U-LPR-SEC05)
  "rate_create_config",
  "rate_update_config",
  "rate_delete_config",
  "rate_get_config",
  "rate_list_configs",
  "rate_check_limit",
  "rate_check_sliding",
  "rate_throttle",
  "rate_unthrottle",
  "rate_reset_scope",
  "rate_get_stats",
  // Session Management (U-LPR-SEC06)
  "session_create",
  "session_validate",
  "session_get",
  "session_touch",
  "session_extend",
  "session_revoke",
  "session_revoke_user",
  "session_revoke_tenant",
  "session_list_user",
  "session_list_tenant",
  "session_set_config",
  "session_get_config",
  "session_cleanup",
  "session_get_stats",
  // Input Sanitization (U-LPR-SEC07)
  "sanitize_html",
  "sanitize_javascript",
  "sanitize_sql",
  "sanitize_nosql",
  "sanitize_path",
  "sanitize_command",
  "sanitize_url",
  "sanitize_filename",
  "sanitize_alphanumeric",
  "sanitize_batch",
  "sanitize_validate_email",
  "sanitize_get_stats",
  // CSRF Protection (U-LPR-SEC08)
  "csrf_generate_token",
  "csrf_validate_token",
  "csrf_rotate_token",
  "csrf_revoke_token",
  "csrf_revoke_user_tokens",
  "csrf_get_token_metadata",
  "csrf_generate_cookie",
  "csrf_set_config",
  "csrf_get_config",
  "csrf_cleanup",
  "csrf_get_stats",
  // Security Headers (U-LPR-SEC09)
  "headers_generate",
  "headers_build_csp",
  "headers_parse_csp",
  "headers_validate_csp",
  "headers_add_csp_directive",
  "headers_remove_csp_directive",
  "headers_generate_nonce",
  "headers_get_recommended",
  "headers_merge_csp",
  "headers_set_config",
  "headers_get_config",
  "headers_get_stats",
  // Secret Management (U-LPR-SEC10)
  "secret_create",
  "secret_get",
  "secret_get_metadata",
  "secret_rotate",
  "secret_delete",
  "secret_purge",
  "secret_list",
  "secret_get_rotation_due",
  "secret_get_expired",
  "secret_get_version_history",
  "secret_get_access_log",
  "secret_generate_env_vars",
  "secret_set_config",
  "secret_get_config",
  "secret_get_stats",
  // PII Compliance (U-LPR-SEC11)
  "pii_detect",
  "pii_redact",
  "pii_register_subject",
  "pii_update_consent",
  "pii_set_do_not_sell",
  "pii_set_legal_hold",
  "pii_get_subject",
  "pii_list_subjects",
  "pii_create_request",
  "pii_update_request",
  "pii_get_overdue_requests",
  "pii_record_activity",
  "pii_list_activities",
  "pii_record_breach",
  "pii_update_breach",
  "pii_get_pending_breaches",
  "pii_route_by_residency",
  "pii_check_compliance",
  "pii_set_config",
  "pii_get_config",
  "pii_get_stats",
  // Zero-Trust Telemetry (U-LPR-SEC12)
  "zt_register_identity",
  "zt_rotate_certificate",
  "zt_revoke_identity",
  "zt_get_expiring_identities",
  "zt_list_identities",
  "zt_sign_telemetry",
  "zt_verify_telemetry",
  "zt_register_vlan",
  "zt_validate_vlan_access",
  "zt_register_mtconnect",
  "zt_update_mtconnect_status",
  "zt_validate_mtconnect",
  "zt_list_mtconnect",
  "zt_set_config",
  "zt_get_config",
  "zt_get_stats",
  // Incident Response (U-LPR-SEC-IR)
  "ir_create_incident",
  "ir_get_incident",
  "ir_list_incidents",
  "ir_update_status",
  "ir_assign_incident",
  "ir_add_timeline",
  "ir_set_legal_hold",
  "ir_create_snapshot",
  "ir_add_custody",
  "ir_create_runbook",
  "ir_get_runbook",
  "ir_record_exercise",
  "ir_detect_llm_threat",
  "ir_create_incident_from_llm",
  "ir_set_config",
  "ir_get_config",
  "ir_get_stats",
  // ── Model Confidentiality (SEC10) — 15 actions ──
  "mc_register_watermark",
  "mc_list_watermarks",
  "mc_verify_watermark",
  "mc_scan_egress",
  "mc_list_egress_scans",
  "mc_submit_export",
  "mc_record_approval",
  "mc_get_export",
  "mc_list_exports",
  "mc_grant_jit",
  "mc_revoke_jit",
  "mc_check_access",
  "mc_list_grants",
  "mc_record_access",
  "mc_list_audit",
  "mc_verify_chain",
  "mc_get_stats",
  // ── Supply Chain Integrity (SEC09) — 16 actions ──
  "sc_pin_artifact",
  "sc_rotate_pin",
  "sc_get_pin",
  "sc_list_pins",
  "sc_register_manifest",
  "sc_get_manifest",
  "sc_list_manifests",
  "sc_verify_manifest",
  "sc_record_signature",
  "sc_list_signatures",
  "sc_register_advisory",
  "sc_clear_advisory",
  "sc_list_advisories",
  "sc_verify_artifact",
  "sc_list_verifications",
  "sc_get_stats",
  // ── Authorization / REST-MCP Parity (SEC05) — 14 actions ──
  "authz_register_resource",
  "authz_get_resource",
  "authz_list_resources",
  "authz_register_role",
  "authz_get_role",
  "authz_list_roles",
  "authz_register_policy",
  "authz_remove_policy",
  "authz_list_policies",
  "authz_evaluate",
  "authz_verify_parity",
  "authz_coverage_report",
  "authz_list_decisions",
  "authz_get_stats",
  // ── Legal Compliance Gates (CAM-UIX-INFRA-00/U-LEGAL-GATES01) — 6 actions ──
  "legal_check_consent",
  "legal_check_export",
  "legal_check_patent",
  "legal_check_dmca",
  "legal_check_standard",
  "legal_check_all",
] as const;

const actionEnum = z.enum(ACTIONS);

const ACTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  validate_jwt: z.object({
    token: z.string().describe("JWT token to validate"),
    expected_tenant_id: z.string().optional().describe("Expected tenant_id claim"),
  }),
  validate_query: z.object({
    query: z.string().describe("SQL/NoSQL query template"),
    params: z.array(z.any()).optional().describe("Query parameters"),
    tenant_id: z.string().optional().describe("Tenant context ID"),
  }),
  validate_input: z.object({
    input: z.string().describe("User input to validate"),
    categories: z.array(z.enum([
      "sql_injection", "nosql_injection", "path_traversal",
      "command_injection", "jwt_manipulation", "tenant_confusion",
      "privilege_escalation", "data_exfiltration", "ssrf", "idor",
    ])).optional().describe("Attack categories to check"),
  }),
  validate_path: z.object({
    path: z.string().describe("File path to validate"),
    tenant_id: z.string().describe("Tenant ID for path scoping"),
  }),
  validate_url: z.object({
    url: z.string().describe("URL to validate for SSRF"),
  }),
  scope_query: z.object({
    query: z.string().describe("Query to scope"),
    params: z.array(z.any()).optional().describe("Existing parameters"),
    tenant_id: z.string().describe("Tenant ID to scope to"),
    user_id: z.string().describe("User ID for context"),
  }),
  validate_cross_tenant: z.object({
    source_tenant_id: z.string().describe("Source tenant ID"),
    target_tenant_id: z.string().describe("Target tenant ID"),
    user_id: z.string().describe("User ID"),
    roles: z.array(z.string()).optional().describe("User roles"),
    permissions: z.array(z.string()).optional().describe("User permissions"),
  }),
  get_attack_vectors: z.object({
    category: z.enum([
      "sql_injection", "nosql_injection", "path_traversal",
      "command_injection", "jwt_manipulation", "tenant_confusion",
      "privilege_escalation", "data_exfiltration", "ssrf", "idor",
    ]).optional().describe("Filter by category"),
  }).optional(),
  run_attack_tests: z.object({}).optional(),
  get_security_stats: z.object({}).optional(),
  isolation_audit: z.object({
    tenant_id: z.string().describe("Tenant to audit"),
  }),
  check_injection: z.object({
    input: z.string().describe("Input to check for SQL/NoSQL injection"),
  }),
  check_traversal: z.object({
    path: z.string().describe("Path to check for traversal"),
  }),
  check_ssrf: z.object({
    url: z.string().describe("URL to check for SSRF"),
  }),
  check_privilege_escalation: z.object({
    input: z.string().describe("Input to check for privilege escalation"),
  }),
  // Encryption At Rest (U-LPR-SEC02)
  encrypt_data: z.object({
    plaintext: z.string().describe("Data to encrypt"),
    tenant_id: z.string().describe("Tenant ID for key derivation"),
    aad: z.string().optional().describe("Additional authenticated data"),
  }),
  decrypt_data: z.object({
    ciphertext: z.string().describe("Base64-encoded ciphertext"),
    iv: z.string().describe("Base64-encoded IV"),
    auth_tag: z.string().describe("Base64-encoded auth tag"),
    key_version: z.number().describe("Key version used for encryption"),
    tenant_id: z.string().describe("Tenant ID"),
    aad: z.string().optional().describe("Additional authenticated data"),
  }),
  rotate_key: z.object({
    tenant_id: z.string().describe("Tenant ID to rotate key for"),
    reason: z.string().optional().describe("Reason for rotation"),
  }),
  get_key_metadata: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  check_rotation_due: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  create_envelope_key: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  revoke_key: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    version: z.number().describe("Key version to revoke"),
    reason: z.string().describe("Reason for revocation"),
  }),
  get_encryption_stats: z.object({}).optional(),
  // Access Control Lists (U-LPR-SEC03)
  acl_create_rule: z.object({
    resource_pattern: z.string().describe("Resource path pattern (supports * and **)"),
    subject_type: z.enum(["user", "role", "group", "service"]).describe("Subject type"),
    subject_id: z.string().describe("Subject identifier"),
    tenant_id: z.string().describe("Tenant ID"),
    permissions: z.array(z.enum(["read", "write", "delete", "execute", "admin", "*"])).describe("Permissions"),
    decision: z.enum(["allow", "deny"]).describe("Allow or deny"),
    priority: z.number().describe("Rule priority (higher wins)"),
    created_by: z.string().describe("Creator identifier"),
    expires_at: z.number().optional().describe("Expiration timestamp"),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["eq", "ne", "gt", "lt", "in", "contains", "regex"]),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })).optional().describe("Context conditions"),
  }),
  acl_update_rule: z.object({
    id: z.string().describe("Rule ID"),
    priority: z.number().optional(),
    permissions: z.array(z.enum(["read", "write", "delete", "execute", "admin", "*"])).optional(),
    decision: z.enum(["allow", "deny"]).optional(),
    expires_at: z.number().optional(),
  }),
  acl_delete_rule: z.object({
    id: z.string().describe("Rule ID to delete"),
  }),
  acl_get_rule: z.object({
    id: z.string().describe("Rule ID"),
  }),
  acl_list_rules: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    resource_pattern: z.string().optional().describe("Filter by resource pattern"),
  }),
  acl_check_access: z.object({
    subject_id: z.string().describe("Subject identifier"),
    subject_type: z.enum(["user", "role", "group", "service"]).describe("Subject type"),
    subject_roles: z.array(z.string()).optional().describe("Subject roles"),
    subject_groups: z.array(z.string()).optional().describe("Subject groups"),
    tenant_id: z.string().describe("Tenant ID"),
    resource_path: z.string().describe("Resource path to check"),
    permission: z.enum(["read", "write", "delete", "execute", "admin"]).describe("Permission to check"),
    context: z.record(z.string(), z.unknown()).optional().describe("Context for conditions"),
  }),
  acl_check_multiple: z.object({
    subject_id: z.string().describe("Subject identifier"),
    subject_type: z.enum(["user", "role", "group", "service"]).describe("Subject type"),
    subject_roles: z.array(z.string()).optional(),
    subject_groups: z.array(z.string()).optional(),
    tenant_id: z.string().describe("Tenant ID"),
    resource_path: z.string().describe("Resource path"),
    permissions: z.array(z.enum(["read", "write", "delete", "execute", "admin"])).describe("Permissions to check"),
  }),
  acl_get_effective_permissions: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    subject_id: z.string().describe("Subject identifier"),
    subject_type: z.enum(["user", "role", "group", "service"]).describe("Subject type"),
    resource_path: z.string().describe("Resource path"),
    subject_roles: z.array(z.string()).optional(),
    subject_groups: z.array(z.string()).optional(),
  }),
  acl_create_hierarchy: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    base_path: z.string().describe("Base resource path"),
    owner_user_id: z.string().describe("Owner user ID"),
    created_by: z.string().describe("Creator identifier"),
  }),
  acl_get_deny_audit_log: z.object({
    tenant_id: z.string().optional().describe("Filter by tenant"),
    limit: z.number().optional().describe("Max entries (default 100)"),
  }),
  acl_get_stats: z.object({}).optional(),
  // Audit Logging (U-LPR-SEC04)
  audit_log_event: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    category: z.enum(["authentication", "authorization", "data_access", "data_modification", "configuration", "security_alert", "compliance", "system"]).describe("Event category"),
    severity: z.enum(["debug", "info", "warning", "error", "critical"]).describe("Event severity"),
    action: z.string().describe("Action name"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Action outcome"),
    actor_id: z.string().describe("Actor identifier"),
    actor_type: z.enum(["user", "service", "system"]).describe("Actor type"),
    actor_ip: z.string().optional().describe("Actor IP address"),
    resource_type: z.string().optional().describe("Resource type"),
    resource_id: z.string().optional().describe("Resource ID"),
    resource_path: z.string().optional().describe("Resource path"),
    details: z.record(z.string(), z.unknown()).optional().describe("Additional details"),
  }),
  audit_log_auth: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    actor_id: z.string().describe("User ID"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Auth outcome"),
    method: z.string().describe("Auth method (password, sso, mfa)"),
    ip: z.string().optional().describe("Client IP"),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  audit_log_authz: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    actor_id: z.string().describe("User ID"),
    resource_path: z.string().describe("Resource path"),
    permission: z.string().describe("Permission checked"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Authz outcome"),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  audit_log_data_access: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    actor_id: z.string().describe("User ID"),
    resource_type: z.string().describe("Resource type"),
    resource_id: z.string().describe("Resource ID"),
    operation: z.enum(["read", "list", "export"]).describe("Access operation"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Operation outcome"),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  audit_log_data_mod: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    actor_id: z.string().describe("User ID"),
    resource_type: z.string().describe("Resource type"),
    resource_id: z.string().describe("Resource ID"),
    operation: z.enum(["create", "update", "delete"]).describe("Modification operation"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Operation outcome"),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  audit_log_security_alert: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    alert_type: z.string().describe("Alert type"),
    severity: z.enum(["debug", "info", "warning", "error", "critical"]).describe("Alert severity"),
    actor_id: z.string().describe("Actor involved"),
    details: z.record(z.string(), z.unknown()).describe("Alert details"),
  }),
  audit_log_config_change: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    actor_id: z.string().describe("User making change"),
    config_key: z.string().describe("Config key changed"),
    outcome: z.enum(["success", "failure", "error", "unknown"]).describe("Change outcome"),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  audit_query_events: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    start_time: z.number().optional().describe("Start timestamp"),
    end_time: z.number().optional().describe("End timestamp"),
    categories: z.array(z.enum(["authentication", "authorization", "data_access", "data_modification", "configuration", "security_alert", "compliance", "system"])).optional(),
    severities: z.array(z.enum(["debug", "info", "warning", "error", "critical"])).optional(),
    outcomes: z.array(z.enum(["success", "failure", "error", "unknown"])).optional(),
    actor_id: z.string().optional(),
    resource_id: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  audit_export: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    format: z.enum(["json", "csv", "cef"]).describe("Export format"),
    start_time: z.number().optional(),
    end_time: z.number().optional(),
    categories: z.array(z.enum(["authentication", "authorization", "data_access", "data_modification", "configuration", "security_alert", "compliance", "system"])).optional(),
  }),
  audit_verify_chain: z.object({
    tenant_id: z.string().optional().describe("Tenant to verify (omit for all)"),
  }),
  audit_get_stats: z.object({}).optional(),
  // Rate Limiting (U-LPR-SEC05)
  rate_create_config: z.object({
    scope: z.enum(["tenant", "user", "ip", "endpoint", "global"]).describe("Limit scope"),
    scope_id: z.string().describe("Scope identifier (* for wildcard)"),
    max_requests: z.number().describe("Max requests per window"),
    window_ms: z.number().describe("Window duration in milliseconds"),
    burst_limit: z.number().optional().describe("Burst allowance"),
    refill_rate: z.number().optional().describe("Tokens per second"),
    enabled: z.boolean().describe("Whether limit is active"),
    priority: z.number().describe("Config priority (higher wins)"),
  }),
  rate_update_config: z.object({
    id: z.string().describe("Config ID (scope:scope_id)"),
    max_requests: z.number().optional(),
    window_ms: z.number().optional(),
    burst_limit: z.number().optional(),
    enabled: z.boolean().optional(),
    priority: z.number().optional(),
  }),
  rate_delete_config: z.object({
    id: z.string().describe("Config ID to delete"),
  }),
  rate_get_config: z.object({
    id: z.string().describe("Config ID"),
  }),
  rate_list_configs: z.object({
    scope: z.enum(["tenant", "user", "ip", "endpoint", "global"]).optional().describe("Filter by scope"),
  }),
  rate_check_limit: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    user_id: z.string().optional().describe("User ID"),
    ip: z.string().optional().describe("Client IP"),
    endpoint: z.string().optional().describe("Endpoint path"),
    cost: z.number().optional().describe("Request cost (default 1)"),
  }),
  rate_check_sliding: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    user_id: z.string().optional(),
    ip: z.string().optional(),
    endpoint: z.string().optional(),
    cost: z.number().optional(),
  }),
  rate_throttle: z.object({
    scope_key: z.string().describe("Scope key to throttle"),
    duration_ms: z.number().describe("Throttle duration"),
  }),
  rate_unthrottle: z.object({
    scope_key: z.string().describe("Scope key to unthrottle"),
  }),
  rate_reset_scope: z.object({
    scope_key: z.string().describe("Scope key to reset"),
  }),
  rate_get_stats: z.object({}).optional(),
  // Session Management (U-LPR-SEC06)
  session_create: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    user_id: z.string().describe("User ID"),
    ip_address: z.string().optional().describe("Client IP"),
    user_agent: z.string().optional().describe("User agent string"),
    metadata: z.record(z.string(), z.unknown()).optional().describe("Session metadata"),
  }),
  session_validate: z.object({
    session_id: z.string().describe("Session ID"),
    ip_address: z.string().optional().describe("Client IP for binding check"),
    user_agent: z.string().optional().describe("User agent for binding check"),
    refresh_activity: z.boolean().optional().describe("Whether to refresh activity timestamp"),
  }),
  session_get: z.object({
    session_id: z.string().describe("Session ID"),
  }),
  session_touch: z.object({
    session_id: z.string().describe("Session ID"),
  }),
  session_extend: z.object({
    session_id: z.string().describe("Session ID"),
    additional_ms: z.number().describe("Milliseconds to extend"),
  }),
  session_revoke: z.object({
    session_id: z.string().describe("Session ID"),
    reason: z.string().describe("Revocation reason"),
  }),
  session_revoke_user: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    user_id: z.string().describe("User ID"),
    reason: z.string().describe("Revocation reason"),
  }),
  session_revoke_tenant: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    reason: z.string().describe("Revocation reason"),
  }),
  session_list_user: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    user_id: z.string().describe("User ID"),
  }),
  session_list_tenant: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    include_expired: z.boolean().optional().describe("Include expired sessions"),
  }),
  session_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    idle_timeout_ms: z.number().describe("Idle timeout in ms"),
    absolute_timeout_ms: z.number().describe("Absolute timeout in ms"),
    max_concurrent_sessions: z.number().describe("Max sessions per user"),
    bind_to_ip: z.boolean().describe("Bind session to IP"),
    bind_to_user_agent: z.boolean().describe("Bind session to user agent"),
    renew_on_activity: z.boolean().describe("Refresh session on activity"),
  }),
  session_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  session_cleanup: z.object({}).optional(),
  session_get_stats: z.object({}).optional(),
  // Input Sanitization (U-LPR-SEC07)
  sanitize_html: z.object({
    input: z.string().describe("Input to sanitize"),
    max_length: z.number().optional().describe("Max length after sanitization"),
    strip_null: z.boolean().optional().describe("Strip null bytes (default true)"),
    normalize_unicode: z.boolean().optional().describe("Normalize unicode (default true)"),
  }),
  sanitize_javascript: z.object({
    input: z.string().describe("Input to sanitize for JS context"),
    max_length: z.number().optional().describe("Max length"),
  }),
  sanitize_sql: z.object({
    input: z.string().describe("Input to sanitize for SQL context"),
    max_length: z.number().optional().describe("Max length"),
  }),
  sanitize_nosql: z.object({
    input: z.string().describe("Input to sanitize for NoSQL context"),
    max_length: z.number().optional().describe("Max length"),
  }),
  sanitize_path: z.object({
    input: z.string().describe("Path to sanitize"),
  }),
  sanitize_command: z.object({
    input: z.string().describe("Command argument to sanitize"),
    max_length: z.number().optional().describe("Max length"),
  }),
  sanitize_url: z.object({
    input: z.string().describe("URL to sanitize"),
  }),
  sanitize_filename: z.object({
    input: z.string().describe("Filename to sanitize"),
    max_length: z.number().optional().describe("Max length (default 255)"),
  }),
  sanitize_alphanumeric: z.object({
    input: z.string().describe("Input to convert to alphanumeric"),
    max_length: z.number().optional().describe("Max length"),
  }),
  sanitize_batch: z.object({
    inputs: z.array(z.object({
      value: z.string(),
      type: z.enum(["html", "javascript", "sql", "nosql", "path", "command", "url", "filename", "alphanumeric"]),
      max_length: z.number().optional(),
    })).describe("Array of inputs to sanitize"),
  }),
  sanitize_validate_email: z.object({
    input: z.string().describe("Email to validate"),
  }),
  sanitize_get_stats: z.object({}).optional(),
  // CSRF Protection (U-LPR-SEC08)
  csrf_generate_token: z.object({
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_validate_token: z.object({
    token: z.string().describe("CSRF token to validate"),
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
    method: z.string().describe("HTTP method"),
    origin: z.string().optional().describe("Origin header"),
    referer: z.string().optional().describe("Referer header"),
    cookie_token: z.string().optional().describe("Token from cookie for double-submit"),
  }),
  csrf_rotate_token: z.object({
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_revoke_token: z.object({
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_revoke_user_tokens: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    session_ids: z.array(z.string()).describe("Session IDs to revoke"),
  }),
  csrf_get_token_metadata: z.object({
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_generate_cookie: z.object({
    session_id: z.string().describe("Session ID"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    token_lifetime_ms: z.number().describe("Token lifetime in ms"),
    max_rotations: z.number().describe("Max token rotations"),
    enforce_origin: z.boolean().describe("Enforce origin header"),
    enforce_referer: z.boolean().describe("Enforce referer header"),
    same_site: z.enum(["strict", "lax", "none"]).describe("SameSite cookie attribute"),
    allowed_origins: z.array(z.string()).describe("Allowed origins"),
    double_submit_enabled: z.boolean().describe("Enable double-submit cookie"),
  }),
  csrf_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  csrf_cleanup: z.object({}).optional(),
  csrf_get_stats: z.object({}).optional(),
  // Security Headers (U-LPR-SEC09)
  headers_generate: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  headers_build_csp: z.object({
    directives: z.record(z.string(), z.union([z.array(z.string()), z.boolean()])).describe("CSP directives"),
  }),
  headers_parse_csp: z.object({
    csp_string: z.string().describe("CSP header string to parse"),
  }),
  headers_validate_csp: z.object({
    directives: z.record(z.string(), z.union([z.array(z.string()), z.boolean()])).describe("CSP directives to validate"),
  }),
  headers_add_csp_directive: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    directive: z.string().describe("CSP directive name"),
    value: z.string().describe("Value to add"),
  }),
  headers_remove_csp_directive: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    directive: z.string().describe("CSP directive name"),
    value: z.string().describe("Value to remove"),
  }),
  headers_generate_nonce: z.object({}).optional(),
  headers_get_recommended: z.object({
    level: z.enum(["strict", "moderate", "relaxed"]).describe("Security level"),
  }),
  headers_merge_csp: z.object({
    base: z.record(z.string(), z.union([z.array(z.string()), z.boolean()])).describe("Base CSP"),
    override: z.record(z.string(), z.union([z.array(z.string()), z.boolean()])).describe("Override CSP"),
  }),
  headers_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    csp: z.record(z.string(), z.union([z.array(z.string()), z.boolean()])).optional().describe("CSP directives"),
    frame_options: z.enum(["DENY", "SAMEORIGIN"]).optional().describe("X-Frame-Options"),
    content_type_options: z.boolean().optional().describe("Enable X-Content-Type-Options"),
    hsts_max_age: z.number().optional().describe("HSTS max-age in seconds"),
    hsts_include_subdomains: z.boolean().optional().describe("HSTS includeSubDomains"),
    hsts_preload: z.boolean().optional().describe("HSTS preload"),
    xss_protection: z.enum(["0", "1", "1; mode=block"]).optional().describe("X-XSS-Protection"),
    referrer_policy: z.string().optional().describe("Referrer-Policy"),
    report_only: z.boolean().optional().describe("Use CSP Report-Only mode"),
  }),
  headers_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  headers_get_stats: z.object({}).optional(),
  // Secret Management (U-LPR-SEC10)
  secret_create: z.object({
    name: z.string().describe("Secret name"),
    type: z.enum(["api_key", "password", "token", "certificate", "connection_string", "generic"]).describe("Secret type"),
    value: z.string().describe("Secret value"),
    tenant_id: z.string().describe("Tenant ID"),
    created_by: z.string().describe("Creator identifier"),
    expires_at: z.number().optional().describe("Expiration timestamp"),
    rotate_after: z.number().optional().describe("Rotation due timestamp"),
    metadata: z.record(z.string(), z.string()).optional().describe("Additional metadata"),
    tags: z.array(z.string()).optional().describe("Tags for filtering"),
  }),
  secret_get: z.object({
    secret_id: z.string().describe("Secret ID"),
    accessed_by: z.string().describe("Accessor identifier"),
  }),
  secret_get_metadata: z.object({
    secret_id: z.string().describe("Secret ID"),
  }),
  secret_rotate: z.object({
    secret_id: z.string().describe("Secret ID"),
    new_value: z.string().describe("New secret value"),
    rotated_by: z.string().describe("Rotator identifier"),
  }),
  secret_delete: z.object({
    secret_id: z.string().describe("Secret ID"),
    deleted_by: z.string().describe("Deleter identifier"),
  }),
  secret_purge: z.object({
    secret_id: z.string().describe("Secret ID to permanently remove"),
  }),
  secret_list: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    type: z.enum(["api_key", "password", "token", "certificate", "connection_string", "generic"]).optional(),
    tag: z.string().optional().describe("Filter by tag"),
    include_inactive: z.boolean().optional().describe("Include deactivated secrets"),
  }),
  secret_get_rotation_due: z.object({
    tenant_id: z.string().optional().describe("Filter by tenant"),
  }),
  secret_get_expired: z.object({
    tenant_id: z.string().optional().describe("Filter by tenant"),
  }),
  secret_get_version_history: z.object({
    secret_id: z.string().describe("Secret ID"),
  }),
  secret_get_access_log: z.object({
    secret_id: z.string().describe("Secret ID"),
    limit: z.number().optional().describe("Max entries (default 100)"),
  }),
  secret_generate_env_vars: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    accessed_by: z.string().describe("Accessor identifier"),
    prefix: z.string().optional().describe("Environment variable prefix"),
  }),
  secret_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    default_expiration_ms: z.number().describe("Default expiration in ms"),
    default_rotation_ms: z.number().describe("Default rotation interval in ms"),
    max_versions: z.number().describe("Max versions to retain"),
    require_rotation: z.boolean().describe("Require rotation"),
    audit_access: z.boolean().describe("Audit all access"),
  }),
  secret_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  secret_get_stats: z.object({}).optional(),
  // PII Compliance (U-LPR-SEC11)
  pii_detect: z.object({
    text: z.string().describe("Text to scan for PII"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  pii_redact: z.object({
    text: z.string().describe("Text to redact"),
    tenant_id: z.string().describe("Tenant ID"),
  }),
  pii_register_subject: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    email: z.string().optional().describe("Subject email"),
    name: z.string().optional().describe("Subject name"),
    region: z.enum(["us", "eu", "uk", "ca", "ap", "global"]).optional().describe("Data residency region"),
    consent_given: z.boolean().optional().describe("Consent status"),
    do_not_sell: z.boolean().optional().describe("CCPA do-not-sell flag"),
    data_categories: z.array(z.string()).optional().describe("Categories of data held"),
  }),
  pii_update_consent: z.object({
    subject_id: z.string().describe("Data subject ID"),
    consent_given: z.boolean().describe("New consent status"),
  }),
  pii_set_do_not_sell: z.object({
    subject_id: z.string().describe("Data subject ID"),
    do_not_sell: z.boolean().describe("Do-not-sell flag"),
  }),
  pii_set_legal_hold: z.object({
    subject_id: z.string().describe("Data subject ID"),
    hold: z.boolean().describe("Legal hold status"),
    reason: z.string().optional().describe("Reason for hold"),
  }),
  pii_get_subject: z.object({
    subject_id: z.string().describe("Data subject ID"),
  }),
  pii_list_subjects: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    region: z.enum(["us", "eu", "uk", "ca", "ap", "global"]).optional().describe("Filter by region"),
    with_legal_hold: z.boolean().optional().describe("Filter by legal hold status"),
    do_not_sell: z.boolean().optional().describe("Filter by do-not-sell flag"),
  }),
  pii_create_request: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    subject_id: z.string().describe("Data subject ID"),
    type: z.enum(["access", "rectification", "erasure", "portability", "restriction", "objection"]).describe("DSR type"),
  }),
  pii_update_request: z.object({
    request_id: z.string().describe("DSR ID"),
    status: z.enum(["pending", "in_progress", "completed", "denied"]).optional().describe("New status"),
    response: z.string().optional().describe("Response message"),
    denial_reason: z.string().optional().describe("Reason for denial"),
  }),
  pii_get_overdue_requests: z.object({
    tenant_id: z.string().optional().describe("Tenant ID filter"),
  }),
  pii_record_activity: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    name: z.string().describe("Activity name"),
    purpose: z.string().describe("Processing purpose"),
    legal_basis: z.string().describe("Legal basis (e.g., consent, contract)"),
    data_categories: z.array(z.string()).describe("Categories of data processed"),
    data_subject_categories: z.array(z.string()).describe("Categories of data subjects"),
    recipients: z.array(z.string()).describe("Data recipients"),
    transfers: z.array(z.object({ country: z.string(), safeguard: z.string() })).optional().describe("International transfers"),
    retention_period: z.string().describe("Data retention period"),
    security_measures: z.array(z.string()).describe("Security measures in place"),
  }),
  pii_list_activities: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  pii_record_breach: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    severity: z.enum(["low", "medium", "high", "critical"]).describe("Breach severity"),
    affected_subjects: z.number().describe("Number of affected subjects"),
    data_types: z.array(z.enum(["email", "phone", "ssn", "credit_card", "name", "address", "ip", "date_of_birth", "custom"])).describe("Types of data breached"),
    description: z.string().describe("Breach description"),
    mitigation_steps: z.array(z.string()).describe("Steps taken to mitigate"),
  }),
  pii_update_breach: z.object({
    breach_id: z.string().describe("Breach ID"),
    regulatory_notified: z.boolean().optional().describe("Whether regulators were notified"),
    subjects_notified: z.boolean().optional().describe("Whether subjects were notified"),
  }),
  pii_get_pending_breaches: z.object({
    tenant_id: z.string().optional().describe("Tenant ID filter"),
  }),
  pii_route_by_residency: z.object({
    subject_id: z.string().describe("Data subject ID"),
  }),
  pii_check_compliance: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  pii_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    region: z.enum(["us", "eu", "uk", "ca", "ap", "global"]).describe("Default region"),
    frameworks: z.array(z.enum(["gdpr", "ccpa", "hipaa", "pci_dss", "sox"])).describe("Compliance frameworks"),
    default_retention_days: z.number().describe("Default data retention days"),
    breach_notification_hours: z.number().describe("Hours to notify of breach"),
    dsr_response_days: z.number().describe("Days to respond to DSRs"),
    enable_redaction: z.boolean().describe("Enable PII redaction"),
    enable_audit: z.boolean().describe("Enable audit logging"),
    custom_patterns: z.array(z.object({
      name: z.string(),
      pattern: z.string(),
      type: z.enum(["email", "phone", "ssn", "credit_card", "name", "address", "ip", "date_of_birth", "custom"]),
    })).optional().describe("Custom PII patterns"),
  }),
  pii_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  pii_get_stats: z.object({}).optional(),
  // Zero-Trust Telemetry (U-LPR-SEC12)
  zt_register_identity: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    workload_type: z.enum(["machine", "agent", "service", "gateway"]).describe("Workload type"),
    name: z.string().describe("Workload name"),
    trust_domain: z.string().optional().describe("Trust domain (default: prism.internal)"),
  }),
  zt_rotate_certificate: z.object({
    identity_id: z.string().describe("Workload identity ID"),
  }),
  zt_revoke_identity: z.object({
    identity_id: z.string().describe("Workload identity ID"),
  }),
  zt_get_expiring_identities: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    within_days: z.number().describe("Days until expiration"),
  }),
  zt_list_identities: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    workload_type: z.enum(["machine", "agent", "service", "gateway"]).optional().describe("Filter by type"),
    active_only: z.boolean().optional().describe("Only active identities"),
  }),
  zt_sign_telemetry: z.object({
    source_id: z.string().describe("Source workload identity ID"),
    tenant_id: z.string().describe("Tenant ID"),
    payload: z.record(z.string(), z.unknown()).describe("Telemetry payload"),
  }),
  zt_verify_telemetry: z.object({
    message: z.object({
      id: z.string(),
      source_id: z.string(),
      tenant_id: z.string(),
      timestamp: z.number(),
      payload: z.record(z.string(), z.unknown()),
      signature: z.string(),
      signature_algorithm: z.enum(["hmac-sha256", "rsa-sha256", "ecdsa-sha256"]),
      nonce: z.string(),
      sequence_number: z.number(),
    }).describe("Signed telemetry message"),
  }),
  zt_register_vlan: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    name: z.string().describe("VLAN name"),
    vlan_id: z.number().describe("VLAN ID"),
    cidr: z.string().describe("CIDR notation (e.g., 10.100.0.0/24)"),
    allowed_workloads: z.array(z.string()).optional().describe("Allowed workload IDs"),
    allowed_ports: z.array(z.number()).optional().describe("Allowed ports"),
    trust_level: z.enum(["untrusted", "internal", "trusted", "critical"]).optional().describe("Trust level"),
  }),
  zt_validate_vlan_access: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    ip: z.string().describe("IP address to validate"),
    workload_id: z.string().optional().describe("Workload ID for allowlist check"),
  }),
  zt_register_mtconnect: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    url: z.string().describe("MTConnect endpoint URL"),
    machine_id: z.string().describe("Machine identifier"),
    certificate_fingerprint: z.string().describe("Expected certificate fingerprint"),
  }),
  zt_update_mtconnect_status: z.object({
    endpoint_id: z.string().describe("Endpoint ID"),
    status: z.enum(["online", "offline", "degraded", "untrusted"]).describe("New status"),
    certificate_fingerprint: z.string().optional().describe("Certificate fingerprint for verification"),
  }),
  zt_validate_mtconnect: z.object({
    endpoint_id: z.string().describe("Endpoint ID"),
    presented_fingerprint: z.string().describe("Certificate fingerprint presented"),
  }),
  zt_list_mtconnect: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    status: z.enum(["online", "offline", "degraded", "untrusted"]).optional().describe("Filter by status"),
  }),
  zt_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    trust_domain: z.string().describe("Trust domain"),
    require_mtls: z.boolean().describe("Require mTLS"),
    require_signed_telemetry: z.boolean().describe("Require signed telemetry"),
    certificate_rotation_days: z.number().describe("Days between certificate rotations"),
    max_clock_skew_ms: z.number().describe("Max clock skew in milliseconds"),
    allowed_vlans: z.array(z.number()).describe("Allowed VLAN IDs"),
    trusted_issuers: z.array(z.string()).describe("Trusted certificate issuers"),
    min_trust_score: z.number().describe("Minimum trust score (0-1)"),
  }),
  zt_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  zt_get_stats: z.object({}).optional(),
  // Incident Response (U-LPR-SEC-IR)
  ir_create_incident: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    type: z.enum(["data_breach", "unauthorized_access", "malware", "phishing", "dos_attack", "prompt_injection", "jailbreak_attempt", "pii_extraction", "model_inversion", "data_exfiltration", "insider_threat", "policy_violation", "other"]).describe("Incident type"),
    severity: z.enum(["critical", "high", "medium", "low", "info"]).describe("Severity level"),
    title: z.string().describe("Incident title"),
    description: z.string().describe("Incident description"),
    affected_systems: z.array(z.string()).optional().describe("Affected system identifiers"),
    affected_users: z.number().optional().describe("Number of affected users"),
    indicators: z.array(z.string()).optional().describe("Indicators of compromise"),
  }),
  ir_get_incident: z.object({
    incident_id: z.string().describe("Incident ID"),
  }),
  ir_list_incidents: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    status: z.enum(["detected", "triaged", "investigating", "containing", "eradicating", "recovering", "closed"]).optional().describe("Filter by status"),
    severity: z.enum(["critical", "high", "medium", "low", "info"]).optional().describe("Filter by severity"),
    type: z.enum(["data_breach", "unauthorized_access", "malware", "phishing", "dos_attack", "prompt_injection", "jailbreak_attempt", "pii_extraction", "model_inversion", "data_exfiltration", "insider_threat", "policy_violation", "other"]).optional().describe("Filter by type"),
    active_only: z.boolean().optional().describe("Only show active incidents"),
  }),
  ir_update_status: z.object({
    incident_id: z.string().describe("Incident ID"),
    status: z.enum(["detected", "triaged", "investigating", "containing", "eradicating", "recovering", "closed"]).describe("New status"),
    actor: z.string().describe("Actor making the change"),
    notes: z.string().optional().describe("Status change notes"),
  }),
  ir_assign_incident: z.object({
    incident_id: z.string().describe("Incident ID"),
    assignee: z.string().describe("Assignee identifier"),
    actor: z.string().describe("Actor making assignment"),
  }),
  ir_add_timeline: z.object({
    incident_id: z.string().describe("Incident ID"),
    action: z.string().describe("Timeline action"),
    actor: z.string().describe("Actor"),
    details: z.string().optional().describe("Additional details"),
  }),
  ir_set_legal_hold: z.object({
    incident_id: z.string().describe("Incident ID"),
    active: z.boolean().describe("Legal hold active status"),
    actor: z.string().describe("Actor"),
  }),
  ir_create_snapshot: z.object({
    incident_id: z.string().describe("Incident ID"),
    tenant_id: z.string().describe("Tenant ID"),
    created_by: z.string().describe("Creator"),
    type: z.enum(["ram", "disk", "log_bundle", "llm_context", "full"]).describe("Snapshot type"),
    location: z.string().describe("Storage location"),
    size: z.number().describe("Size in bytes"),
    encrypted: z.boolean().optional().describe("Whether encrypted"),
  }),
  ir_add_custody: z.object({
    incident_id: z.string().describe("Incident ID"),
    evidence_type: z.enum(["log", "memory_dump", "disk_image", "network_capture", "screenshot", "model_output", "prompt_log"]).describe("Evidence type"),
    collected_by: z.string().describe("Collector"),
    location: z.string().describe("Evidence location"),
    notes: z.string().optional().describe("Collection notes"),
  }),
  ir_create_runbook: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    name: z.string().describe("Runbook name"),
    version: z.string().describe("Version string"),
    incident_types: z.array(z.enum(["data_breach", "unauthorized_access", "malware", "phishing", "dos_attack", "prompt_injection", "jailbreak_attempt", "pii_extraction", "model_inversion", "data_exfiltration", "insider_threat", "policy_violation", "other"])).describe("Applicable incident types"),
    steps: z.array(z.object({
      order: z.number(),
      action: z.string(),
      responsible: z.string(),
      accountable: z.string(),
      consulted: z.array(z.string()),
      informed: z.array(z.string()),
      time_limit: z.string().optional(),
      automated: z.boolean(),
    })).describe("Runbook steps with RACI"),
    raci_matrix: z.record(z.string(), z.enum(["responsible", "accountable", "consulted", "informed"])).optional().describe("RACI matrix"),
  }),
  ir_get_runbook: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    type: z.enum(["data_breach", "unauthorized_access", "malware", "phishing", "dos_attack", "prompt_injection", "jailbreak_attempt", "pii_extraction", "model_inversion", "data_exfiltration", "insider_threat", "policy_violation", "other"]).describe("Incident type to get runbook for"),
  }),
  ir_record_exercise: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    runbook_id: z.string().describe("Runbook ID"),
    scenario: z.string().describe("Exercise scenario"),
    participants: z.array(z.string()).describe("Participant list"),
    duration: z.number().describe("Duration in minutes"),
    findings: z.array(z.string()).describe("Exercise findings"),
    improvements: z.array(z.string()).describe("Recommended improvements"),
    next_scheduled: z.number().optional().describe("Next exercise timestamp"),
  }),
  ir_detect_llm_threat: z.object({
    prompt: z.string().describe("Prompt to analyze"),
    response: z.string().optional().describe("Model response to analyze"),
  }),
  ir_create_incident_from_llm: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    prompt: z.string().describe("Prompt that triggered detection"),
    response: z.string().optional().describe("Model response"),
  }),
  ir_set_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
    default_retention_days: z.number().describe("Default evidence retention days"),
    auto_triage_enabled: z.boolean().describe("Auto-triage incidents"),
    llm_monitoring_enabled: z.boolean().describe("Enable LLM threat monitoring"),
    notification_webhooks: z.array(z.string()).describe("Notification webhook URLs"),
    escalation_contacts: z.array(z.object({
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      contacts: z.array(z.string()),
    })).describe("Escalation contacts by severity"),
  }),
  ir_get_config: z.object({
    tenant_id: z.string().describe("Tenant ID"),
  }),
  ir_get_stats: z.object({}).optional(),

  // ── Model Confidentiality (SEC10) ──
  mc_register_watermark: z.object({
    id: z.string().describe("Unique trigger id"),
    prompt: z.string().describe("Secret challenge prompt (hashed before storage)"),
    expected_output: z.string().describe("Expected model response (hashed before storage)"),
    model_family: z.string().describe("Model family this fingerprint targets"),
    note: z.string().optional().describe("Optional human note"),
  }),
  mc_list_watermarks: z.object({
    model_family: z.string().optional().describe("Filter by model family"),
  }),
  mc_verify_watermark: z.object({
    trigger_id: z.string().describe("Trigger id to verify"),
    observed_output: z.string().describe("Raw output from suspect model"),
  }),
  mc_scan_egress: z.object({
    filename: z.string().describe("File name being egressed"),
    magic_hex: z.string().optional().describe("First 16 bytes as hex"),
    bytes: z.number().describe("File size in bytes"),
    mime: z.string().optional().describe("MIME type if known"),
    destination: z.string().describe("Destination URL or path"),
    actor: z.string().describe("Subject performing egress"),
  }),
  mc_list_egress_scans: z.object({
    limit: z.number().int().positive().optional().describe("Max entries (default 100)"),
  }),
  mc_submit_export: z.object({
    id: z.string().describe("Unique request id"),
    requester: z.string().describe("Subject requesting export"),
    artifact_kind: z.enum(["safetensors", "gguf", "bin", "lora_adapter_config", "tokenizer", "checkpoint"]),
    artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/i).describe("SHA-256 digest of artifact"),
    destination_class: z.enum(["internal_share", "partner_sftp", "public_s3", "offline_media"]),
    justification: z.string().min(20).describe("Business justification (≥20 chars required)"),
  }),
  mc_record_approval: z.object({
    request_id: z.string().describe("Export request id"),
    approver: z.string().describe("Approver identity (must differ from requester)"),
    decision: z.enum(["approved", "rejected"]),
    comment: z.string().optional().describe("Approver comment for audit"),
  }),
  mc_get_export: z.object({
    id: z.string().describe("Export request id"),
  }),
  mc_list_exports: z.object({
    status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
  }),
  mc_grant_jit: z.object({
    id: z.string().describe("Unique grant id"),
    subject: z.string().describe("Subject receiving access"),
    scope: z.enum(["read_weights", "copy_weights", "export_weights", "admin_rotate"]),
    granted_by: z.string().describe("Granting authority (must differ from subject)"),
    justification: z.string().min(10).describe("Access justification (≥10 chars)"),
    window_ms: z.number().int().positive().optional().describe("Window in ms (default 4h, max 24h per NIST AC-2(5))"),
  }),
  mc_revoke_jit: z.object({
    id: z.string().describe("Grant id to revoke"),
    revoked_by: z.string().describe("Revoking authority"),
  }),
  mc_check_access: z.object({
    subject: z.string().describe("Subject to check"),
    scope: z.enum(["read_weights", "copy_weights", "export_weights", "admin_rotate"]),
    now: z.number().optional().describe("Override current time (test determinism)"),
  }),
  mc_list_grants: z.object({
    subject: z.string().optional(),
    status: z.enum(["active", "expired", "revoked"]).optional(),
  }),
  mc_record_access: z.object({
    actor: z.string().describe("Subject performing action"),
    action: z.enum(["list", "read", "copy", "export", "rotate_key", "watermark_verify"]),
    artifact_sha256: z.string().optional().describe("SHA-256 digest if applicable"),
    grant_id: z.string().optional().describe("JIT grant id authorizing action"),
    outcome: z.enum(["success", "denied", "error"]).optional(),
    detail: z.string().optional(),
  }),
  mc_list_audit: z.object({
    limit: z.number().int().positive().optional(),
  }),
  mc_verify_chain: z.object({}).optional(),
  mc_get_stats: z.object({}).optional(),

  // ── Supply Chain Integrity (SEC09) ──
  sc_pin_artifact: z.object({
    id: z.string().describe("Unique pin id (e.g. 'qwen2.5-coder-7b/base')"),
    type: z.enum(["base_weights", "lora_adapter", "tokenizer", "training_manifest"]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i).describe("SHA-256 digest of canonical artifact"),
    bytes: z.number().positive().describe("File size in bytes"),
    version: z.string().describe("Release version/tag"),
    source: z.string().describe("Upstream source URL"),
    note: z.string().optional(),
  }),
  sc_rotate_pin: z.object({
    id: z.string().describe("Existing pin id"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    version: z.string(),
    source: z.string().optional(),
    note: z.string().optional(),
  }),
  sc_get_pin: z.object({
    id: z.string(),
  }),
  sc_list_pins: z.object({
    type: z.enum(["base_weights", "lora_adapter", "tokenizer", "training_manifest"]).optional(),
  }),
  sc_register_manifest: z.object({
    id: z.string().describe("Unique manifest id"),
    adapter_id: z.string().describe("Adapter this manifest belongs to"),
    files: z.array(z.object({
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
      bytes: z.number().positive(),
    })).min(1).describe("Sorted-or-not training file list; engine sorts by path"),
    training_seed_hash: z.string().optional(),
  }),
  sc_get_manifest: z.object({
    id: z.string(),
  }),
  sc_list_manifests: z.object({
    adapter_id: z.string().optional(),
  }),
  sc_verify_manifest: z.object({
    manifest_id: z.string(),
    observed_files: z.array(z.object({
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
      bytes: z.number().positive(),
    })),
  }),
  sc_record_signature: z.object({
    id: z.string().describe("Unique signature id"),
    adapter_id: z.string(),
    artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    issuer: z.string().describe("Signer identity (e.g. 'release@shop.corp')"),
    signature: z.string().describe("Cosign/Sigstore signature bytes (base64/hex)"),
    cert_fingerprint: z.string().optional(),
  }),
  sc_list_signatures: z.object({
    adapter_id: z.string(),
  }),
  sc_register_advisory: z.object({
    id: z.string().describe("Local advisory id"),
    advisory_id: z.string().describe("CVE/GHSA/OSV identifier"),
    package: z.string(),
    affected_versions: z.array(z.string()),
    severity: z.enum(["critical", "high", "medium", "low", "none"]),
    summary: z.string(),
  }),
  sc_clear_advisory: z.object({
    id: z.string(),
  }),
  sc_list_advisories: z.object({
    package: z.string().optional(),
    severity: z.enum(["critical", "high", "medium", "low", "none"]).optional(),
  }),
  sc_verify_artifact: z.object({
    artifact_id: z.string().describe("Pin id to verify against"),
    observed_sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    package_name: z.string().describe("Package name for OSV lookup"),
    version: z.string().describe("Version for OSV lookup"),
    trusted_issuers: z.array(z.string()).optional().describe("Whitelist of signer identities; absent = any issuer accepted"),
  }),
  sc_list_verifications: z.object({
    limit: z.number().int().positive().optional(),
  }),
  sc_get_stats: z.object({}).optional(),

  // ── Authorization / REST-MCP Parity (SEC05) ──
  authz_register_resource: z.object({
    type: z.string(),
    id: z.string(),
    tenant_id: z.string(),
    bindings: z.array(z.object({
      surface: z.enum(["rest", "mcp"]),
      method_or_dispatcher: z.string(),
      route_or_action: z.string(),
    })).min(1),
  }),
  authz_get_resource: z.object({
    type: z.string(),
    id: z.string(),
  }),
  authz_list_resources: z.object({
    tenant_id: z.string().optional(),
  }),
  authz_register_role: z.object({
    id: z.string(),
    name: z.string(),
    permissions: z.array(z.object({
      resource_type: z.string(),
      action: z.enum(["read", "create", "update", "delete", "execute", "approve", "export", "admin"]),
    })),
  }),
  authz_get_role: z.object({
    id: z.string(),
  }),
  authz_list_roles: z.object({}).optional(),
  authz_register_policy: z.object({
    id: z.string(),
    subject: z.string(),
    subject_kind: z.enum(["user", "role"]),
    resource_type: z.string(),
    resource_id: z.string(),
    action: z.enum(["read", "create", "update", "delete", "execute", "approve", "export", "admin"]),
    effect: z.enum(["allow", "deny"]),
    tenant_id: z.string(),
    condition: z.string().optional(),
  }),
  authz_remove_policy: z.object({
    id: z.string(),
  }),
  authz_list_policies: z.object({
    tenant_id: z.string().optional(),
    resource_type: z.string().optional(),
  }),
  authz_evaluate: z.object({
    principal: z.object({
      id: z.string(),
      tenant_id: z.string(),
      roles: z.array(z.string()),
    }),
    resource_type: z.string(),
    resource_id: z.string(),
    action: z.enum(["read", "create", "update", "delete", "execute", "approve", "export", "admin"]),
    surface: z.enum(["rest", "mcp"]),
    context: z.record(z.string(), z.any()).optional(),
  }),
  authz_verify_parity: z.object({
    principal: z.object({
      id: z.string(),
      tenant_id: z.string(),
      roles: z.array(z.string()),
    }),
    resource_type: z.string(),
    resource_id: z.string(),
    action: z.enum(["read", "create", "update", "delete", "execute", "approve", "export", "admin"]),
    context: z.record(z.string(), z.any()).optional(),
  }),
  authz_coverage_report: z.object({
    principal: z.object({
      id: z.string(),
      tenant_id: z.string(),
      roles: z.array(z.string()),
    }),
  }),
  authz_list_decisions: z.object({
    limit: z.number().int().positive().optional(),
  }),
  authz_get_stats: z.object({}).optional(),
  // ── Legal Compliance Gates (CAM-UIX-INFRA-00/U-LEGAL-GATES01) ──
  legal_check_consent: z.object({
    customer_id: z.string().describe("Customer identifier (e.g., 'jmdie_internal', 'itw', 'alcoa')"),
    consent_type: z.string().default("ai_training").describe("Type of consent to check (ai_training, anonymized_analytics, benchmarking)"),
  }),
  legal_check_export: z.object({
    customer_id: z.string().describe("Customer identifier to check for ITAR/EAR export controls"),
  }),
  legal_check_patent: z.object({
    feature_name: z.string().describe("Feature or algorithm name to check for patent blocks (e.g., 'iMachining', 'trochoidal')"),
  }),
  legal_check_dmca: z.object({
    source_url: z.string().describe("URL to check for DMCA compliance"),
    content_type: z.string().default("text/html").describe("MIME content type of the source"),
  }),
  legal_check_standard: z.object({
    standard_id: z.string().describe("Standard identifier (e.g., 'ISO_3685_1993', 'DIN_6584_1982')"),
    extraction_type: z.enum(["abstract", "full_text"]).default("abstract").describe("Type of extraction requested"),
  }),
  legal_check_all: z.object({
    customer_id: z.string().optional().describe("Customer identifier (triggers consent + export gates)"),
    source_url: z.string().optional().describe("Source URL (triggers DMCA gate)"),
    content_type: z.string().optional().describe("Content MIME type for DMCA check"),
    feature_name: z.string().optional().describe("Feature name (triggers patent gate)"),
    standard_id: z.string().optional().describe("Standard ID (triggers standards license gate)"),
  }),
};

export function registerSecurityDispatcher(server: McpServer): void {
  server.tool(
    "prism_security",
    `Security operations — tenant isolation, encryption, access control, audit logging, rate limiting, sessions, sanitization.
Tenant isolation (SEC01): validate_jwt (frozen context), validate_query (parameterized), validate_input (55 attack vectors).
Path security: validate_path (traversal prevention), validate_url (SSRF prevention).
Query scoping: scope_query (auto-inject tenant_id), validate_cross_tenant (elevated permission check).
Encryption (SEC02): encrypt_data, decrypt_data (AES-256-GCM per-tenant), rotate_key, revoke_key (break-glass).
Key management: get_key_metadata, check_rotation_due, create_envelope_key.
ACL (SEC03): acl_create_rule, acl_check_access, acl_get_effective_permissions, acl_get_deny_audit_log.
Audit Logging (SEC04): audit_log_event (hash-chained), audit_log_auth/authz/data_access/data_mod, audit_query_events, audit_export.
Rate Limiting (SEC05): rate_create_config (token bucket), rate_check_limit, rate_throttle/unthrottle, rate_get_stats.
Session Management (SEC06): session_create, session_validate (IP/UA binding), session_revoke, session_revoke_user/tenant.
Input Sanitization (SEC07): sanitize_html/javascript/sql/nosql/path/command/url/filename/alphanumeric, sanitize_batch, sanitize_validate_email.
CSRF Protection (SEC08): csrf_generate_token, csrf_validate_token (origin/referer checks), csrf_rotate_token, csrf_generate_cookie (double-submit).
Security Headers (SEC09): headers_generate (CSP/HSTS/XFO), headers_build_csp, headers_validate_csp, headers_get_recommended (strict/moderate/relaxed).
Secret Management (SEC10): secret_create/get/rotate/delete/purge, secret_list, secret_generate_env_vars, secret_get_rotation_due/expired.
PII Compliance (SEC11): pii_detect/redact, pii_register_subject, pii_update_consent, pii_set_do_not_sell/legal_hold, pii_create_request (DSR), pii_record_activity (ROPA), pii_record_breach, pii_check_compliance.
Zero-Trust Telemetry (SEC12): zt_register_identity (SPIFFE), zt_rotate_certificate, zt_sign/verify_telemetry, zt_register_vlan, zt_validate_vlan_access, zt_register_mtconnect, zt_validate_mtconnect.
Model Confidentiality (SEC10): mc_register_watermark (Adi-Shamir trigger), mc_verify_watermark, mc_scan_egress (.safetensors/.gguf DLP), mc_submit_export + mc_record_approval (4-eyes), mc_grant_jit + mc_revoke_jit (time-boxed access), mc_check_access, mc_record_access + mc_verify_chain (hash-chained audit).
Supply Chain Integrity (SEC09): sc_pin_artifact + sc_rotate_pin (pinned SHA-256 per NIST SP 800-161r1), sc_register_manifest + sc_verify_manifest (Merkle-root training manifest), sc_record_signature + sc_list_signatures (cosign/Sigstore), sc_register_advisory + sc_verify_artifact (OSV gate: critical/high blocks release).
Authorization + REST/MCP Parity (SEC05): authz_register_resource (dual-binding), authz_register_role + authz_register_policy (RBAC + ABAC), authz_evaluate (deny-first precedence), authz_verify_parity + authz_coverage_report (CI parity gate).
Stats: get_security_stats, get_encryption_stats, acl_get_stats, audit_get_stats, rate_get_stats, session_get_stats, sanitize_get_stats, csrf_get_stats, headers_get_stats, secret_get_stats, pii_get_stats, zt_get_stats, mc_get_stats.
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_security] action=${action}`);

      const schema = ACTION_SCHEMAS[action];
      if (schema) {
        const validation = validateActionParams(action, params, { [action]: schema });
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_security"
          );
        }
      }

      try {
        const engine = await getTenantIsolation();
        // Shim: earlier IR sessions aliased `params` as `p` at case scope but
        // dropped the assignment. Define once here so every IR case compiles
        // without rewriting the large case bodies.
        const p: any = params;
        void p;

        switch (action) {
          case "validate_jwt": {
            const result = engine.validateJWT(params.token, params.expected_tenant_id);
            return dispatcherResult(result);
          }

          case "validate_query": {
            // Build minimal context if tenant_id provided
            let context = undefined;
            if (params.tenant_id) {
              context = Object.freeze({
                tenant_id: params.tenant_id,
                user_id: "system",
                roles: Object.freeze([]),
                permissions: Object.freeze([]),
                issued_at: Date.now(),
                expires_at: Date.now() + 3600000,
                jwt_id: "system",
                request_id: "query-validation",
                frozen: true as const,
              });
            }
            const result = engine.validateQuery(
              params.query,
              params.params || [],
              context
            );
            return dispatcherResult(result);
          }

          case "validate_input": {
            const result = engine.validateInput(params.input, params.categories);
            return dispatcherResult(result);
          }

          case "validate_path": {
            const result = engine.validatePath(params.path, params.tenant_id);
            return dispatcherResult(result);
          }

          case "validate_url": {
            const result = engine.validateURL(params.url);
            return dispatcherResult(result);
          }

          case "scope_query": {
            const context = Object.freeze({
              tenant_id: params.tenant_id,
              user_id: params.user_id,
              roles: Object.freeze(params.roles || []),
              permissions: Object.freeze(params.permissions || []),
              issued_at: Date.now(),
              expires_at: Date.now() + 3600000,
              jwt_id: "scope",
              request_id: "scope-query",
              frozen: true as const,
            });
            const result = engine.scopeQuery(
              params.query,
              params.params || [],
              context
            );
            return dispatcherResult(result);
          }

          case "validate_cross_tenant": {
            const context = Object.freeze({
              tenant_id: params.source_tenant_id,
              user_id: params.user_id,
              roles: Object.freeze(params.roles || []),
              permissions: Object.freeze(params.permissions || []),
              issued_at: Date.now(),
              expires_at: Date.now() + 3600000,
              jwt_id: "cross-tenant",
              request_id: "cross-tenant-check",
              frozen: true as const,
            });
            const result = engine.validateCrossTenantAccess(context, params.target_tenant_id);
            return dispatcherResult(result);
          }

          case "get_attack_vectors": {
            const catalog = engine.getAttackVectorCatalog();
            if (params?.category) {
              const filtered = catalog.vectors.filter((v: any) => v.category === params.category);
              return dispatcherResult({
                ...catalog,
                vectors: filtered,
                total: filtered.length,
              });
            }
            return dispatcherResult(catalog);
          }

          case "run_attack_tests": {
            const results = engine.runAttackVectorTests();
            return dispatcherResult(results);
          }

          case "get_security_stats": {
            const stats = engine.getStats();
            return dispatcherResult(stats);
          }

          case "isolation_audit": {
            const stats = engine.getStats();
            const catalog = engine.getAttackVectorCatalog();
            return dispatcherResult({
              tenant_id: params.tenant_id,
              attack_vectors_covered: catalog.total,
              categories_covered: Object.keys(catalog.by_category),
              blocked_attempts: stats.blocked_attempts,
              validated_queries: stats.validated_queries,
              context_injections: stats.context_injections,
              compliant: catalog.total >= 50 && stats.blocked_attempts >= 0,
            });
          }

          case "check_injection": {
            const result = engine.validateInput(params.input, ['sql_injection', 'nosql_injection']);
            return dispatcherResult({
              safe: result.valid,
              attack: result.attack,
              categories_checked: ['sql_injection', 'nosql_injection'],
            });
          }

          case "check_traversal": {
            const result = engine.validateInput(params.path, ['path_traversal']);
            return dispatcherResult({
              safe: result.valid,
              attack: result.attack,
              category_checked: 'path_traversal',
            });
          }

          case "check_ssrf": {
            const result = engine.validateURL(params.url);
            return dispatcherResult({
              safe: result.valid,
              attack: result.attack,
              category_checked: 'ssrf',
            });
          }

          case "check_privilege_escalation": {
            const result = engine.validateInput(params.input, ['privilege_escalation']);
            return dispatcherResult({
              safe: result.valid,
              attack: result.attack,
              category_checked: 'privilege_escalation',
            });
          }

          // Encryption At Rest (U-LPR-SEC02)
          case "encrypt_data": {
            const encEngine = await getEncryption();
            const encrypted = encEngine.encrypt(params.plaintext, params.tenant_id, params.aad);
            return dispatcherResult(encrypted);
          }

          case "decrypt_data": {
            const encEngine = await getEncryption();
            const payload = {
              ciphertext: params.ciphertext,
              iv: params.iv,
              authTag: params.auth_tag,
              keyVersion: params.key_version,
              tenantId: params.tenant_id,
              algorithm: 'aes-256-gcm' as const,
              encryptedAt: 0,
            };
            const result = encEngine.decrypt(payload, params.aad);
            return dispatcherResult(result);
          }

          case "rotate_key": {
            const encEngine = await getEncryption();
            const result = encEngine.rotateKey(params.tenant_id, params.reason);
            return dispatcherResult(result);
          }

          case "get_key_metadata": {
            const encEngine = await getEncryption();
            const metadata = encEngine.getKeyMetadata(params.tenant_id);
            return dispatcherResult({ tenant_id: params.tenant_id, keys: metadata });
          }

          case "check_rotation_due": {
            const encEngine = await getEncryption();
            const check = encEngine.isRotationDue(params.tenant_id);
            return dispatcherResult({ tenant_id: params.tenant_id, ...check });
          }

          case "create_envelope_key": {
            const encEngine = await getEncryption();
            const envelope = encEngine.createEnvelopeKey(params.tenant_id);
            return dispatcherResult({ tenant_id: params.tenant_id, envelope });
          }

          case "revoke_key": {
            const encEngine = await getEncryption();
            const revoked = encEngine.revokeKey(params.tenant_id, params.version, params.reason);
            return dispatcherResult({ tenant_id: params.tenant_id, version: params.version, revoked });
          }

          case "get_encryption_stats": {
            const encEngine = await getEncryption();
            const stats = encEngine.getStats();
            return dispatcherResult(stats);
          }

          // Access Control Lists (U-LPR-SEC03)
          case "acl_create_rule": {
            const aclEngine = await getACL();
            const rule = aclEngine.createRule({
              resourcePattern: params.resource_pattern,
              subjectType: params.subject_type,
              subjectId: params.subject_id,
              tenantId: params.tenant_id,
              permissions: params.permissions,
              decision: params.decision,
              priority: params.priority,
              createdBy: params.created_by,
              expiresAt: params.expires_at,
              conditions: params.conditions,
            });
            return dispatcherResult(rule);
          }

          case "acl_update_rule": {
            const aclEngine = await getACL();
            const updated = aclEngine.updateRule(params.id, {
              priority: params.priority,
              permissions: params.permissions,
              decision: params.decision,
              expiresAt: params.expires_at,
            });
            return updated
              ? dispatcherResult(updated)
              : dispatcherError("Rule not found", action, "prism_security");
          }

          case "acl_delete_rule": {
            const aclEngine = await getACL();
            const deleted = aclEngine.deleteRule(params.id);
            return dispatcherResult({ deleted, id: params.id });
          }

          case "acl_get_rule": {
            const aclEngine = await getACL();
            const rule = aclEngine.getRule(params.id);
            return rule
              ? dispatcherResult(rule)
              : dispatcherError("Rule not found", action, "prism_security");
          }

          case "acl_list_rules": {
            const aclEngine = await getACL();
            const rules = aclEngine.listRules(params.tenant_id, params.resource_pattern);
            return dispatcherResult({ rules, count: rules.length });
          }

          case "acl_check_access": {
            const aclEngine = await getACL();
            const decision = aclEngine.checkAccess({
              subjectId: params.subject_id,
              subjectType: params.subject_type,
              subjectRoles: params.subject_roles,
              subjectGroups: params.subject_groups,
              tenantId: params.tenant_id,
              resourcePath: params.resource_path,
              permission: params.permission,
              context: params.context,
            });
            return dispatcherResult(decision);
          }

          case "acl_check_multiple": {
            const aclEngine = await getACL();
            const results = aclEngine.checkMultiplePermissions(
              {
                subjectId: params.subject_id,
                subjectType: params.subject_type,
                subjectRoles: params.subject_roles,
                subjectGroups: params.subject_groups,
                tenantId: params.tenant_id,
                resourcePath: params.resource_path,
              },
              params.permissions
            );
            return dispatcherResult(results);
          }

          case "acl_get_effective_permissions": {
            const aclEngine = await getACL();
            const effective = aclEngine.getEffectivePermissions(
              params.tenant_id,
              params.subject_id,
              params.subject_type,
              params.resource_path,
              params.subject_roles,
              params.subject_groups
            );
            return dispatcherResult(effective);
          }

          case "acl_create_hierarchy": {
            const aclEngine = await getACL();
            const rules = aclEngine.createResourceHierarchyRules(
              params.tenant_id,
              params.base_path,
              params.owner_user_id,
              params.created_by
            );
            return dispatcherResult({ rules, count: rules.length });
          }

          case "acl_get_deny_audit_log": {
            const aclEngine = await getACL();
            const entries = aclEngine.getDenyAuditLog(params.tenant_id, params.limit);
            return dispatcherResult({ entries, count: entries.length });
          }

          case "acl_get_stats": {
            const aclEngine = await getACL();
            const stats = aclEngine.getStats();
            return dispatcherResult(stats);
          }

          // Audit Logging (U-LPR-SEC04)
          case "audit_log_event": {
            const auditEngine = await getAudit();
            const event = auditEngine.logEvent({
              tenantId: params.tenant_id,
              category: params.category,
              severity: params.severity,
              action: params.action,
              outcome: params.outcome,
              actorId: params.actor_id,
              actorType: params.actor_type,
              actorIp: params.actor_ip,
              resourceType: params.resource_type,
              resourceId: params.resource_id,
              resourcePath: params.resource_path,
              details: params.details,
            });
            return dispatcherResult(event);
          }

          case "audit_log_auth": {
            const auditEngine = await getAudit();
            const event = auditEngine.logAuthentication(
              params.tenant_id,
              params.actor_id,
              params.outcome,
              params.method,
              params.ip,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_log_authz": {
            const auditEngine = await getAudit();
            const event = auditEngine.logAuthorization(
              params.tenant_id,
              params.actor_id,
              params.resource_path,
              params.permission,
              params.outcome,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_log_data_access": {
            const auditEngine = await getAudit();
            const event = auditEngine.logDataAccess(
              params.tenant_id,
              params.actor_id,
              params.resource_type,
              params.resource_id,
              params.operation,
              params.outcome,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_log_data_mod": {
            const auditEngine = await getAudit();
            const event = auditEngine.logDataModification(
              params.tenant_id,
              params.actor_id,
              params.resource_type,
              params.resource_id,
              params.operation,
              params.outcome,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_log_security_alert": {
            const auditEngine = await getAudit();
            const event = auditEngine.logSecurityAlert(
              params.tenant_id,
              params.alert_type,
              params.severity,
              params.actor_id,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_log_config_change": {
            const auditEngine = await getAudit();
            const event = auditEngine.logConfigurationChange(
              params.tenant_id,
              params.actor_id,
              params.config_key,
              params.outcome,
              params.details
            );
            return dispatcherResult(event);
          }

          case "audit_query_events": {
            const auditEngine = await getAudit();
            const events = auditEngine.queryEvents({
              tenantId: params.tenant_id,
              startTime: params.start_time,
              endTime: params.end_time,
              categories: params.categories,
              severities: params.severities,
              outcomes: params.outcomes,
              actorId: params.actor_id,
              resourceId: params.resource_id,
              limit: params.limit,
              offset: params.offset,
            });
            return dispatcherResult({ events, count: events.length });
          }

          case "audit_export": {
            const auditEngine = await getAudit();
            const exportData = auditEngine.exportAuditLog(
              {
                tenantId: params.tenant_id,
                startTime: params.start_time,
                endTime: params.end_time,
                categories: params.categories,
              },
              params.format
            );
            return dispatcherResult(exportData);
          }

          case "audit_verify_chain": {
            const auditEngine = await getAudit();
            const result = auditEngine.verifyChainIntegrity(params.tenant_id);
            return dispatcherResult(result);
          }

          case "audit_get_stats": {
            const auditEngine = await getAudit();
            const stats = auditEngine.getStats();
            return dispatcherResult(stats);
          }

          // Rate Limiting (U-LPR-SEC05)
          case "rate_create_config": {
            const rateLimitEngine = await getRateLimit();
            const config = rateLimitEngine.createConfig({
              scope: params.scope,
              scopeId: params.scope_id,
              maxRequests: params.max_requests,
              windowMs: params.window_ms,
              burstLimit: params.burst_limit,
              refillRate: params.refill_rate,
              enabled: params.enabled,
              priority: params.priority,
            });
            return dispatcherResult(config);
          }

          case "rate_update_config": {
            const rateLimitEngine = await getRateLimit();
            const updated = rateLimitEngine.updateConfig(params.id, {
              maxRequests: params.max_requests,
              windowMs: params.window_ms,
              burstLimit: params.burst_limit,
              enabled: params.enabled,
              priority: params.priority,
            });
            return updated
              ? dispatcherResult(updated)
              : dispatcherError("Config not found", action, "prism_security");
          }

          case "rate_delete_config": {
            const rateLimitEngine = await getRateLimit();
            const deleted = rateLimitEngine.deleteConfig(params.id);
            return dispatcherResult({ deleted, id: params.id });
          }

          case "rate_get_config": {
            const rateLimitEngine = await getRateLimit();
            const config = rateLimitEngine.getConfig(params.id);
            return config
              ? dispatcherResult(config)
              : dispatcherError("Config not found", action, "prism_security");
          }

          case "rate_list_configs": {
            const rateLimitEngine = await getRateLimit();
            const configs = rateLimitEngine.listConfigs(params.scope);
            return dispatcherResult({ configs, count: configs.length });
          }

          case "rate_check_limit": {
            const rateLimitEngine = await getRateLimit();
            const result = rateLimitEngine.checkLimit({
              tenantId: params.tenant_id,
              userId: params.user_id,
              ip: params.ip,
              endpoint: params.endpoint,
              cost: params.cost,
            });
            return dispatcherResult(result);
          }

          case "rate_check_sliding": {
            const rateLimitEngine = await getRateLimit();
            const result = rateLimitEngine.checkSlidingWindow({
              tenantId: params.tenant_id,
              userId: params.user_id,
              ip: params.ip,
              endpoint: params.endpoint,
              cost: params.cost,
            });
            return dispatcherResult(result);
          }

          case "rate_throttle": {
            const rateLimitEngine = await getRateLimit();
            rateLimitEngine.throttle(params.scope_key, params.duration_ms);
            return dispatcherResult({ throttled: true, scope_key: params.scope_key, duration_ms: params.duration_ms });
          }

          case "rate_unthrottle": {
            const rateLimitEngine = await getRateLimit();
            const success = rateLimitEngine.unthrottle(params.scope_key);
            return dispatcherResult({ unthrottled: success, scope_key: params.scope_key });
          }

          case "rate_reset_scope": {
            const rateLimitEngine = await getRateLimit();
            rateLimitEngine.resetScope(params.scope_key);
            return dispatcherResult({ reset: true, scope_key: params.scope_key });
          }

          case "rate_get_stats": {
            const rateLimitEngine = await getRateLimit();
            const stats = rateLimitEngine.getStats();
            return dispatcherResult(stats);
          }

          // Session Management (U-LPR-SEC06)
          case "session_create": {
            const sessionEngine = await getSession();
            const session = sessionEngine.createSession({
              tenantId: params.tenant_id,
              userId: params.user_id,
              ipAddress: params.ip_address,
              userAgent: params.user_agent,
              metadata: params.metadata,
            });
            return dispatcherResult(session);
          }

          case "session_validate": {
            const sessionEngine = await getSession();
            const result = sessionEngine.validateSession(params.session_id, {
              ipAddress: params.ip_address,
              userAgent: params.user_agent,
              refreshActivity: params.refresh_activity,
            });
            return dispatcherResult(result);
          }

          case "session_get": {
            const sessionEngine = await getSession();
            const session = sessionEngine.getSession(params.session_id);
            return session
              ? dispatcherResult(session)
              : dispatcherError("Session not found", action, "prism_security");
          }

          case "session_touch": {
            const sessionEngine = await getSession();
            const touched = sessionEngine.touchSession(params.session_id);
            return dispatcherResult({ touched, session_id: params.session_id });
          }

          case "session_extend": {
            const sessionEngine = await getSession();
            const extended = sessionEngine.extendSession(params.session_id, params.additional_ms);
            return dispatcherResult({ extended, session_id: params.session_id, additional_ms: params.additional_ms });
          }

          case "session_revoke": {
            const sessionEngine = await getSession();
            const revoked = sessionEngine.revokeSession(params.session_id, params.reason);
            return dispatcherResult({ revoked, session_id: params.session_id });
          }

          case "session_revoke_user": {
            const sessionEngine = await getSession();
            const count = sessionEngine.revokeUserSessions(params.tenant_id, params.user_id, params.reason);
            return dispatcherResult({ revoked_count: count, tenant_id: params.tenant_id, user_id: params.user_id });
          }

          case "session_revoke_tenant": {
            const sessionEngine = await getSession();
            const count = sessionEngine.revokeTenantSessions(params.tenant_id, params.reason);
            return dispatcherResult({ revoked_count: count, tenant_id: params.tenant_id });
          }

          case "session_list_user": {
            const sessionEngine = await getSession();
            const sessions = sessionEngine.getUserSessions(params.tenant_id, params.user_id);
            return dispatcherResult({ sessions, count: sessions.length });
          }

          case "session_list_tenant": {
            const sessionEngine = await getSession();
            const sessions = sessionEngine.getTenantSessions(params.tenant_id, params.include_expired);
            return dispatcherResult({ sessions, count: sessions.length });
          }

          case "session_set_config": {
            const sessionEngine = await getSession();
            sessionEngine.setConfig({
              tenantId: params.tenant_id,
              idleTimeoutMs: params.idle_timeout_ms,
              absoluteTimeoutMs: params.absolute_timeout_ms,
              maxConcurrentSessions: params.max_concurrent_sessions,
              bindToIp: params.bind_to_ip,
              bindToUserAgent: params.bind_to_user_agent,
              renewOnActivity: params.renew_on_activity,
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "session_get_config": {
            const sessionEngine = await getSession();
            const config = sessionEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "session_cleanup": {
            const sessionEngine = await getSession();
            const result = sessionEngine.cleanup();
            return dispatcherResult(result);
          }

          case "session_get_stats": {
            const sessionEngine = await getSession();
            const stats = sessionEngine.getStats();
            return dispatcherResult(stats);
          }

          // Input Sanitization (U-LPR-SEC07)
          case "sanitize_html": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeHtml(params.input, {
              maxLength: params.max_length,
              stripNull: params.strip_null,
              normalizeUnicode: params.normalize_unicode,
            });
            return dispatcherResult(result);
          }

          case "sanitize_javascript": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeJavaScript(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_sql": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeSql(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_nosql": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeNoSql(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_path": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizePath(params.input);
            return dispatcherResult(result);
          }

          case "sanitize_command": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeCommand(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_url": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeUrl(params.input);
            return dispatcherResult(result);
          }

          case "sanitize_filename": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeFilename(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_alphanumeric": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.sanitizeAlphanumeric(params.input, {
              maxLength: params.max_length,
            });
            return dispatcherResult(result);
          }

          case "sanitize_batch": {
            const sanitizeEngine = await getSanitize();
            const inputs = params.inputs.map((i: any) => ({
              value: i.value,
              type: i.type,
              options: { maxLength: i.max_length },
            }));
            const results = sanitizeEngine.sanitizeBatch(inputs);
            return dispatcherResult({ results, count: results.length });
          }

          case "sanitize_validate_email": {
            const sanitizeEngine = await getSanitize();
            const result = sanitizeEngine.validateEmail(params.input);
            return dispatcherResult(result);
          }

          case "sanitize_get_stats": {
            const sanitizeEngine = await getSanitize();
            const stats = sanitizeEngine.getStats();
            return dispatcherResult(stats);
          }

          // CSRF Protection (U-LPR-SEC08)
          case "csrf_generate_token": {
            const csrfEngine = await getCSRF();
            const token = csrfEngine.generateToken(params.session_id, params.tenant_id);
            return dispatcherResult(token);
          }

          case "csrf_validate_token": {
            const csrfEngine = await getCSRF();
            const result = csrfEngine.validateToken({
              token: params.token,
              sessionId: params.session_id,
              tenantId: params.tenant_id,
              method: params.method,
              origin: params.origin,
              referer: params.referer,
              cookieToken: params.cookie_token,
            });
            return dispatcherResult(result);
          }

          case "csrf_rotate_token": {
            const csrfEngine = await getCSRF();
            const token = csrfEngine.rotateToken(params.session_id, params.tenant_id);
            return dispatcherResult(token);
          }

          case "csrf_revoke_token": {
            const csrfEngine = await getCSRF();
            const revoked = csrfEngine.revokeToken(params.session_id, params.tenant_id);
            return dispatcherResult({ revoked, session_id: params.session_id });
          }

          case "csrf_revoke_user_tokens": {
            const csrfEngine = await getCSRF();
            const count = csrfEngine.revokeUserTokens(params.tenant_id, params.session_ids);
            return dispatcherResult({ revoked_count: count, tenant_id: params.tenant_id });
          }

          case "csrf_get_token_metadata": {
            const csrfEngine = await getCSRF();
            const metadata = csrfEngine.getTokenMetadata(params.session_id, params.tenant_id);
            return metadata
              ? dispatcherResult(metadata)
              : dispatcherError("Token not found", action, "prism_security");
          }

          case "csrf_generate_cookie": {
            const csrfEngine = await getCSRF();
            const token = csrfEngine.generateToken(params.session_id, params.tenant_id);
            const config = csrfEngine.getConfig(params.tenant_id);
            const header = csrfEngine.generateCookieHeader(token, config);
            return dispatcherResult({ token: token.token, cookie_header: header });
          }

          case "csrf_set_config": {
            const csrfEngine = await getCSRF();
            csrfEngine.setConfig({
              tenantId: params.tenant_id,
              tokenLifetimeMs: params.token_lifetime_ms,
              maxRotations: params.max_rotations,
              enforceOrigin: params.enforce_origin,
              enforceReferer: params.enforce_referer,
              sameSite: params.same_site,
              allowedOrigins: params.allowed_origins,
              doubleSubmitEnabled: params.double_submit_enabled,
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "csrf_get_config": {
            const csrfEngine = await getCSRF();
            const config = csrfEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "csrf_cleanup": {
            const csrfEngine = await getCSRF();
            const result = csrfEngine.cleanup();
            return dispatcherResult(result);
          }

          case "csrf_get_stats": {
            const csrfEngine = await getCSRF();
            const stats = csrfEngine.getStats();
            return dispatcherResult(stats);
          }

          // Security Headers (U-LPR-SEC09)
          case "headers_generate": {
            const headersEngine = await getSecHeaders();
            const headers = headersEngine.generateHeaders(params.tenant_id);
            return dispatcherResult(headers);
          }

          case "headers_build_csp": {
            const headersEngine = await getSecHeaders();
            const csp = headersEngine.buildCSP(params.directives);
            return dispatcherResult({ csp });
          }

          case "headers_parse_csp": {
            const headersEngine = await getSecHeaders();
            const directives = headersEngine.parseCSP(params.csp_string);
            return dispatcherResult({ directives });
          }

          case "headers_validate_csp": {
            const headersEngine = await getSecHeaders();
            const result = headersEngine.validateCSP(params.directives);
            return dispatcherResult(result);
          }

          case "headers_add_csp_directive": {
            const headersEngine = await getSecHeaders();
            const updated = headersEngine.addCSPDirective(params.tenant_id, params.directive, params.value);
            return dispatcherResult({ directives: updated });
          }

          case "headers_remove_csp_directive": {
            const headersEngine = await getSecHeaders();
            const updated = headersEngine.removeCSPDirective(params.tenant_id, params.directive, params.value);
            return dispatcherResult({ directives: updated });
          }

          case "headers_generate_nonce": {
            const headersEngine = await getSecHeaders();
            const nonce = headersEngine.generateNonce();
            return dispatcherResult({ nonce });
          }

          case "headers_get_recommended": {
            const headersEngine = await getSecHeaders();
            const config = headersEngine.getRecommendedConfig(params.level);
            return dispatcherResult({ level: params.level, config });
          }

          case "headers_merge_csp": {
            const headersEngine = await getSecHeaders();
            const merged = headersEngine.mergeCSP(params.base, params.override);
            return dispatcherResult({ directives: merged });
          }

          case "headers_set_config": {
            const headersEngine = await getSecHeaders();
            const existing = headersEngine.getConfig(params.tenant_id);
            headersEngine.setConfig({
              tenantId: params.tenant_id,
              csp: params.csp || existing.csp,
              frameOptions: params.frame_options || existing.frameOptions,
              contentTypeOptions: params.content_type_options ?? existing.contentTypeOptions,
              hstsMaxAge: params.hsts_max_age ?? existing.hstsMaxAge,
              hstsIncludeSubdomains: params.hsts_include_subdomains ?? existing.hstsIncludeSubdomains,
              hstsPreload: params.hsts_preload ?? existing.hstsPreload,
              xssProtection: params.xss_protection || existing.xssProtection,
              referrerPolicy: params.referrer_policy || existing.referrerPolicy,
              permissionsPolicy: existing.permissionsPolicy,
              reportOnly: params.report_only ?? existing.reportOnly,
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "headers_get_config": {
            const headersEngine = await getSecHeaders();
            const config = headersEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "headers_get_stats": {
            const headersEngine = await getSecHeaders();
            const stats = headersEngine.getStats();
            return dispatcherResult(stats);
          }

          // Secret Management (U-LPR-SEC10)
          case "secret_create": {
            const secretsEngine = await getSecrets();
            const secret = secretsEngine.createSecret({
              name: params.name,
              type: params.type,
              value: params.value,
              tenantId: params.tenant_id,
              createdBy: params.created_by,
              expiresAt: params.expires_at,
              rotateAfter: params.rotate_after,
              metadata: params.metadata,
              tags: params.tags,
            });
            return dispatcherResult(secret);
          }

          case "secret_get": {
            const secretsEngine = await getSecrets();
            const result = secretsEngine.getSecret(params.secret_id, params.accessed_by);
            return result
              ? dispatcherResult(result)
              : dispatcherError("Secret not found or expired", action, "prism_security");
          }

          case "secret_get_metadata": {
            const secretsEngine = await getSecrets();
            const metadata = secretsEngine.getSecretMetadata(params.secret_id);
            return metadata
              ? dispatcherResult(metadata)
              : dispatcherError("Secret not found", action, "prism_security");
          }

          case "secret_rotate": {
            const secretsEngine = await getSecrets();
            const result = secretsEngine.rotateSecret(params.secret_id, params.new_value, params.rotated_by);
            return result
              ? dispatcherResult(result)
              : dispatcherError("Secret not found or inactive", action, "prism_security");
          }

          case "secret_delete": {
            const secretsEngine = await getSecrets();
            const deleted = secretsEngine.deleteSecret(params.secret_id, params.deleted_by);
            return dispatcherResult({ deleted, secret_id: params.secret_id });
          }

          case "secret_purge": {
            const secretsEngine = await getSecrets();
            const purged = secretsEngine.purgeSecret(params.secret_id);
            return dispatcherResult({ purged, secret_id: params.secret_id });
          }

          case "secret_list": {
            const secretsEngine = await getSecrets();
            const secrets = secretsEngine.listSecrets(params.tenant_id, {
              type: params.type,
              tag: params.tag,
              includeInactive: params.include_inactive,
            });
            return dispatcherResult({ secrets, count: secrets.length });
          }

          case "secret_get_rotation_due": {
            const secretsEngine = await getSecrets();
            const secrets = secretsEngine.getRotationDue(params.tenant_id);
            return dispatcherResult({ secrets, count: secrets.length });
          }

          case "secret_get_expired": {
            const secretsEngine = await getSecrets();
            const secrets = secretsEngine.getExpired(params.tenant_id);
            return dispatcherResult({ secrets, count: secrets.length });
          }

          case "secret_get_version_history": {
            const secretsEngine = await getSecrets();
            const history = secretsEngine.getVersionHistory(params.secret_id);
            return dispatcherResult({ history, count: history.length });
          }

          case "secret_get_access_log": {
            const secretsEngine = await getSecrets();
            const log = secretsEngine.getAccessLog(params.secret_id, params.limit);
            return dispatcherResult({ log, count: log.length });
          }

          case "secret_generate_env_vars": {
            const secretsEngine = await getSecrets();
            const envVars = secretsEngine.generateEnvVars(params.tenant_id, params.accessed_by, params.prefix);
            return dispatcherResult({ env_vars: envVars, count: Object.keys(envVars).length });
          }

          case "secret_set_config": {
            const secretsEngine = await getSecrets();
            secretsEngine.setConfig({
              tenantId: params.tenant_id,
              defaultExpirationMs: params.default_expiration_ms,
              defaultRotationMs: params.default_rotation_ms,
              maxVersions: params.max_versions,
              requireRotation: params.require_rotation,
              auditAccess: params.audit_access,
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "secret_get_config": {
            const secretsEngine = await getSecrets();
            const config = secretsEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "secret_get_stats": {
            const secretsEngine = await getSecrets();
            const stats = secretsEngine.getStats();
            return dispatcherResult(stats);
          }

          // PII Compliance (U-LPR-SEC11)
          case "pii_detect": {
            const piiEngine = await getPII();
            const result = piiEngine.detectPII(params.text, params.tenant_id);
            return dispatcherResult(result);
          }

          case "pii_redact": {
            const piiEngine = await getPII();
            const redacted = piiEngine.redact(params.text, params.tenant_id);
            return dispatcherResult({ redacted });
          }

          case "pii_register_subject": {
            const piiEngine = await getPII();
            const subject = piiEngine.registerDataSubject({
              tenantId: params.tenant_id,
              email: params.email,
              name: params.name,
              region: params.region,
              consentGiven: params.consent_given,
              doNotSell: params.do_not_sell,
              dataCategories: params.data_categories,
            });
            return dispatcherResult(subject);
          }

          case "pii_update_consent": {
            const piiEngine = await getPII();
            const subject = piiEngine.updateConsent(params.subject_id, params.consent_given);
            return subject
              ? dispatcherResult(subject)
              : dispatcherError("Data subject not found", action, "prism_security");
          }

          case "pii_set_do_not_sell": {
            const piiEngine = await getPII();
            const subject = piiEngine.setDoNotSell(params.subject_id, params.do_not_sell);
            return subject
              ? dispatcherResult(subject)
              : dispatcherError("Data subject not found", action, "prism_security");
          }

          case "pii_set_legal_hold": {
            const piiEngine = await getPII();
            const subject = piiEngine.setLegalHold(params.subject_id, params.hold, params.reason);
            return subject
              ? dispatcherResult(subject)
              : dispatcherError("Data subject not found", action, "prism_security");
          }

          case "pii_get_subject": {
            const piiEngine = await getPII();
            const subject = piiEngine.getDataSubject(params.subject_id);
            return subject
              ? dispatcherResult(subject)
              : dispatcherError("Data subject not found", action, "prism_security");
          }

          case "pii_list_subjects": {
            const piiEngine = await getPII();
            const subjects = piiEngine.listDataSubjects(params.tenant_id, {
              region: params.region,
              withLegalHold: params.with_legal_hold,
              doNotSell: params.do_not_sell,
            });
            return dispatcherResult({ subjects, count: subjects.length });
          }

          case "pii_create_request": {
            const piiEngine = await getPII();
            const request = piiEngine.createRequest({
              tenantId: params.tenant_id,
              subjectId: params.subject_id,
              type: params.type,
            });
            return dispatcherResult(request);
          }

          case "pii_update_request": {
            const piiEngine = await getPII();
            const request = piiEngine.updateRequest(params.request_id, {
              status: params.status,
              response: params.response,
              denialReason: params.denial_reason,
            });
            return request
              ? dispatcherResult(request)
              : dispatcherError("DSR not found", action, "prism_security");
          }

          case "pii_get_overdue_requests": {
            const piiEngine = await getPII();
            const overdue = piiEngine.getOverdueRequests(params.tenant_id);
            return dispatcherResult({ overdue, count: overdue.length });
          }

          case "pii_record_activity": {
            const piiEngine = await getPII();
            const activity = piiEngine.recordProcessingActivity({
              tenantId: params.tenant_id,
              name: params.name,
              purpose: params.purpose,
              legalBasis: params.legal_basis,
              dataCategories: params.data_categories,
              dataSubjectCategories: params.data_subject_categories,
              recipients: params.recipients,
              transfers: params.transfers,
              retentionPeriod: params.retention_period,
              securityMeasures: params.security_measures,
            });
            return dispatcherResult(activity);
          }

          case "pii_list_activities": {
            const piiEngine = await getPII();
            const activities = piiEngine.listProcessingActivities(params.tenant_id);
            return dispatcherResult({ activities, count: activities.length });
          }

          case "pii_record_breach": {
            const piiEngine = await getPII();
            const breach = piiEngine.recordBreach({
              tenantId: params.tenant_id,
              severity: params.severity,
              affectedSubjects: params.affected_subjects,
              dataTypes: params.data_types,
              description: params.description,
              mitigationSteps: params.mitigation_steps,
            });
            return dispatcherResult(breach);
          }

          case "pii_update_breach": {
            const piiEngine = await getPII();
            const breach = piiEngine.updateBreach(params.breach_id, {
              regulatoryNotified: params.regulatory_notified,
              subjectsNotified: params.subjects_notified,
            });
            return breach
              ? dispatcherResult(breach)
              : dispatcherError("Breach not found", action, "prism_security");
          }

          case "pii_get_pending_breaches": {
            const piiEngine = await getPII();
            const pending = piiEngine.getPendingBreaches(params.tenant_id);
            return dispatcherResult({ pending, count: pending.length });
          }

          case "pii_route_by_residency": {
            const piiEngine = await getPII();
            const routing = piiEngine.routeByResidency(params.subject_id);
            return routing
              ? dispatcherResult(routing)
              : dispatcherError("Data subject not found", action, "prism_security");
          }

          case "pii_check_compliance": {
            const piiEngine = await getPII();
            const result = piiEngine.checkCompliance(params.tenant_id);
            return dispatcherResult(result);
          }

          case "pii_set_config": {
            const piiEngine = await getPII();
            piiEngine.setConfig({
              tenantId: params.tenant_id,
              region: params.region,
              frameworks: params.frameworks,
              defaultRetentionDays: params.default_retention_days,
              breachNotificationHours: params.breach_notification_hours,
              dsrResponseDays: params.dsr_response_days,
              enableRedaction: params.enable_redaction,
              enableAudit: params.enable_audit,
              customPatterns: params.custom_patterns || [],
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "pii_get_config": {
            const piiEngine = await getPII();
            const config = piiEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "pii_get_stats": {
            const piiEngine = await getPII();
            const stats = piiEngine.getStats();
            return dispatcherResult(stats);
          }

          // Zero-Trust Telemetry (U-LPR-SEC12)
          case "zt_register_identity": {
            const ztEngine = await getZeroTrust();
            const identity = ztEngine.registerWorkloadIdentity({
              tenantId: params.tenant_id,
              workloadType: params.workload_type,
              name: params.name,
              trustDomain: params.trust_domain,
            });
            return dispatcherResult(identity);
          }

          case "zt_rotate_certificate": {
            const ztEngine = await getZeroTrust();
            const identity = ztEngine.rotateCertificate(params.identity_id);
            return identity
              ? dispatcherResult(identity)
              : dispatcherError("Identity not found or revoked", action, "prism_security");
          }

          case "zt_revoke_identity": {
            const ztEngine = await getZeroTrust();
            const revoked = ztEngine.revokeIdentity(params.identity_id);
            return dispatcherResult({ revoked });
          }

          case "zt_get_expiring_identities": {
            const ztEngine = await getZeroTrust();
            const expiring = ztEngine.getExpiringIdentities(params.tenant_id, params.within_days);
            return dispatcherResult({ identities: expiring, count: expiring.length });
          }

          case "zt_list_identities": {
            const ztEngine = await getZeroTrust();
            const identities = ztEngine.listIdentities(params.tenant_id, {
              workloadType: params.workload_type,
              activeOnly: params.active_only,
            });
            return dispatcherResult({ identities, count: identities.length });
          }

          case "zt_sign_telemetry": {
            const ztEngine = await getZeroTrust();
            const message = ztEngine.signTelemetryMessage(params.source_id, params.tenant_id, params.payload);
            return message
              ? dispatcherResult(message)
              : dispatcherError("Source identity not found", action, "prism_security");
          }

          case "zt_verify_telemetry": {
            const ztEngine = await getZeroTrust();
            const result = ztEngine.verifyTelemetryMessage({
              id: params.message.id,
              sourceId: params.message.source_id,
              tenantId: params.message.tenant_id,
              timestamp: params.message.timestamp,
              payload: params.message.payload,
              signature: params.message.signature,
              signatureAlgorithm: params.message.signature_algorithm,
              nonce: params.message.nonce,
              sequenceNumber: params.message.sequence_number,
            });
            return dispatcherResult(result);
          }

          case "zt_register_vlan": {
            const ztEngine = await getZeroTrust();
            const vlan = ztEngine.registerVLANSegment({
              tenantId: params.tenant_id,
              name: params.name,
              vlanId: params.vlan_id,
              cidr: params.cidr,
              allowedWorkloads: params.allowed_workloads,
              allowedPorts: params.allowed_ports,
              trustLevel: params.trust_level,
            });
            return dispatcherResult(vlan);
          }

          case "zt_validate_vlan_access": {
            const ztEngine = await getZeroTrust();
            const result = ztEngine.validateVLANAccess(params.tenant_id, params.ip, params.workload_id);
            return dispatcherResult(result);
          }

          case "zt_register_mtconnect": {
            const ztEngine = await getZeroTrust();
            const endpoint = ztEngine.registerMTConnectEndpoint({
              tenantId: params.tenant_id,
              url: params.url,
              machineId: params.machine_id,
              certificateFingerprint: params.certificate_fingerprint,
            });
            return dispatcherResult(endpoint);
          }

          case "zt_update_mtconnect_status": {
            const ztEngine = await getZeroTrust();
            const endpoint = ztEngine.updateEndpointStatus(
              params.endpoint_id,
              params.status,
              params.certificate_fingerprint
            );
            return endpoint
              ? dispatcherResult(endpoint)
              : dispatcherError("Endpoint not found", action, "prism_security");
          }

          case "zt_validate_mtconnect": {
            const ztEngine = await getZeroTrust();
            const result = ztEngine.validateEndpoint(params.endpoint_id, params.presented_fingerprint);
            return dispatcherResult(result);
          }

          case "zt_list_mtconnect": {
            const ztEngine = await getZeroTrust();
            const endpoints = ztEngine.listEndpoints(params.tenant_id, { status: params.status });
            return dispatcherResult({ endpoints, count: endpoints.length });
          }

          case "zt_set_config": {
            const ztEngine = await getZeroTrust();
            ztEngine.setConfig({
              tenantId: params.tenant_id,
              trustDomain: params.trust_domain,
              requireMTLS: params.require_mtls,
              requireSignedTelemetry: params.require_signed_telemetry,
              certificateRotationDays: params.certificate_rotation_days,
              maxClockSkewMs: params.max_clock_skew_ms,
              allowedVLANs: params.allowed_vlans,
              trustedIssuers: params.trusted_issuers,
              minTrustScore: params.min_trust_score,
            });
            return dispatcherResult({ configured: true, tenant_id: params.tenant_id });
          }

          case "zt_get_config": {
            const ztEngine = await getZeroTrust();
            const config = ztEngine.getConfig(params.tenant_id);
            return dispatcherResult(config);
          }

          case "zt_get_stats": {
            const ztEngine = await getZeroTrust();
            const stats = ztEngine.getStats();
            return dispatcherResult(stats);
          }

          // ====================================================================
          // Incident Response (U-LPR-SEC-IR)
          // ====================================================================

          case "ir_create_incident": {
            const irEngine = await getIR();
            const incident = irEngine.createIncident({
              tenantId: p.tenant_id,
              type: p.type,
              severity: p.severity,
              title: p.title,
              description: p.description,
              affectedSystems: p.affected_systems,
              affectedUsers: p.affected_users,
              indicators: p.indicators,
            });
            return dispatcherResult(incident);
          }

          case "ir_get_incident": {
            const irEngine = await getIR();
            const incident = irEngine.getIncident(p.incident_id);
            if (!incident) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(incident);
          }

          case "ir_list_incidents": {
            const irEngine = await getIR();
            const incidents = irEngine.listIncidents(p.tenant_id, {
              status: p.status,
              severity: p.severity,
              type: p.type,
              activeOnly: p.active_only,
            });
            return dispatcherResult({ incidents, count: incidents.length });
          }

          case "ir_update_status": {
            const irEngine = await getIR();
            const incident = irEngine.updateStatus(p.incident_id, p.status, p.actor, p.notes);
            if (!incident) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(incident);
          }

          case "ir_assign_incident": {
            const irEngine = await getIR();
            const incident = irEngine.assignIncident(p.incident_id, p.assignee, p.actor);
            if (!incident) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(incident);
          }

          case "ir_add_timeline": {
            const irEngine = await getIR();
            const incident = irEngine.addTimelineEntry(p.incident_id, p.action, p.actor, p.details);
            if (!incident) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(incident);
          }

          case "ir_set_legal_hold": {
            const irEngine = await getIR();
            const incident = irEngine.setLegalHold(p.incident_id, p.active, p.actor);
            if (!incident) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(incident);
          }

          case "ir_create_snapshot": {
            const irEngine = await getIR();
            const snapshot = irEngine.createForensicSnapshot({
              incidentId: p.incident_id,
              tenantId: p.tenant_id,
              createdBy: p.created_by,
              type: p.type,
              location: p.location,
              size: p.size,
              encrypted: p.encrypted,
            });
            return dispatcherResult(snapshot);
          }

          case "ir_add_custody": {
            const irEngine = await getIR();
            const entry = irEngine.addChainOfCustody(p.incident_id, {
              evidenceType: p.evidence_type,
              collectedBy: p.collected_by,
              location: p.location,
              notes: p.notes,
            });
            if (!entry) {
              return dispatcherError(`Incident not found: ${p.incident_id}`, action, "prism_security");
            }
            return dispatcherResult(entry);
          }

          case "ir_create_runbook": {
            const irEngine = await getIR();
            const runbook = irEngine.createRunbook({
              tenantId: p.tenant_id,
              name: p.name,
              version: p.version,
              incidentTypes: p.incident_types,
              steps: p.steps.map((s: any) => ({
                order: s.order,
                action: s.action,
                responsible: s.responsible,
                accountable: s.accountable,
                consulted: s.consulted,
                informed: s.informed,
                timeLimit: s.time_limit,
                automated: s.automated,
              })),
              raciMatrix: p.raci_matrix,
            });
            return dispatcherResult(runbook);
          }

          case "ir_get_runbook": {
            const irEngine = await getIR();
            const runbook = irEngine.getRunbookForType(p.tenant_id, p.type);
            if (!runbook) {
              return dispatcherError(`No runbook found for type: ${p.type}`, action, "prism_security");
            }
            return dispatcherResult(runbook);
          }

          case "ir_record_exercise": {
            const irEngine = await getIR();
            const exercise = irEngine.recordExercise({
              tenantId: p.tenant_id,
              runbookId: p.runbook_id,
              scenario: p.scenario,
              participants: p.participants,
              duration: p.duration,
              findings: p.findings,
              improvements: p.improvements,
              nextScheduled: p.next_scheduled,
            });
            return dispatcherResult(exercise);
          }

          case "ir_detect_llm_threat": {
            const irEngine = await getIR();
            const detection = irEngine.detectLLMThreat({
              prompt: p.prompt,
              response: p.response,
            });
            return dispatcherResult(detection);
          }

          case "ir_create_incident_from_llm": {
            const irEngine = await getIR();
            const detection = irEngine.detectLLMThreat({
              prompt: p.prompt,
              response: p.response,
            });
            if (!detection.isAttack) {
              return dispatcherResult({ created: false, reason: "No attack detected" });
            }
            const incident = irEngine.createIncidentFromLLMThreat(p.tenant_id, detection, p.prompt, p.response);
            return dispatcherResult({ created: true, incident });
          }

          case "ir_set_config": {
            const irEngine = await getIR();
            irEngine.setConfig({
              tenantId: p.tenant_id,
              defaultRetentionDays: p.default_retention_days,
              autoTriageEnabled: p.auto_triage_enabled,
              llmMonitoringEnabled: p.llm_monitoring_enabled,
              notificationWebhooks: p.notification_webhooks,
              escalationContacts: p.escalation_contacts,
            });
            return dispatcherResult({ success: true });
          }

          case "ir_get_config": {
            const irEngine = await getIR();
            const config = irEngine.getConfig(p.tenant_id);
            return dispatcherResult(config);
          }

          case "ir_get_stats": {
            const irEngine = await getIR();
            const stats = irEngine.getStats();
            return dispatcherResult(stats);
          }

          // ── Model Confidentiality (SEC10) ──
          case "mc_register_watermark": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.registerWatermarkTrigger({
              id: params.id,
              prompt: params.prompt,
              expected_output: params.expected_output,
              model_family: params.model_family,
              note: params.note,
            }));
          }
          case "mc_list_watermarks": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.listWatermarkTriggers(params.model_family));
          }
          case "mc_verify_watermark": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.verifyWatermark({
              trigger_id: params.trigger_id,
              observed_output: params.observed_output,
            }));
          }
          case "mc_scan_egress": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.scanEgress({
              filename: params.filename,
              magic_hex: params.magic_hex,
              bytes: params.bytes,
              mime: params.mime,
              destination: params.destination,
              actor: params.actor,
            }));
          }
          case "mc_list_egress_scans": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.listEgressScans(params.limit));
          }
          case "mc_submit_export": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.submitExportRequest({
              id: params.id,
              requester: params.requester,
              artifact_kind: params.artifact_kind,
              artifact_sha256: params.artifact_sha256,
              destination_class: params.destination_class,
              justification: params.justification,
            }));
          }
          case "mc_record_approval": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.recordApproval({
              request_id: params.request_id,
              approver: params.approver,
              decision: params.decision,
              comment: params.comment,
            }));
          }
          case "mc_get_export": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.getExportRequest(params.id));
          }
          case "mc_list_exports": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.listExportRequests(params.status));
          }
          case "mc_grant_jit": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.grantJITAccess({
              id: params.id,
              subject: params.subject,
              scope: params.scope,
              granted_by: params.granted_by,
              justification: params.justification,
              window_ms: params.window_ms,
            }));
          }
          case "mc_revoke_jit": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.revokeJITAccess(params.id, params.revoked_by));
          }
          case "mc_check_access": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.checkAccess(params.subject, params.scope, params.now));
          }
          case "mc_list_grants": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.listAccessGrants(params.subject, params.status));
          }
          case "mc_record_access": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.recordAccess({
              actor: params.actor,
              action: params.action,
              artifact_sha256: params.artifact_sha256,
              grant_id: params.grant_id,
              outcome: params.outcome,
              detail: params.detail,
            }));
          }
          case "mc_list_audit": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.listAuditEntries(params.limit));
          }
          case "mc_verify_chain": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.verifyChain());
          }
          case "mc_get_stats": {
            const mc = await getModelConfidentiality();
            return dispatcherResult(mc.getStats());
          }

          // ── Supply Chain Integrity (SEC09) ──
          case "sc_pin_artifact": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.pinArtifact({
              id: params.id,
              type: params.type,
              sha256: params.sha256,
              bytes: params.bytes,
              version: params.version,
              source: params.source,
              note: params.note,
            }));
          }
          case "sc_rotate_pin": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.rotatePin({
              id: params.id,
              sha256: params.sha256,
              version: params.version,
              source: params.source,
              note: params.note,
            }));
          }
          case "sc_get_pin": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.getPin(params.id));
          }
          case "sc_list_pins": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.listPins(params.type));
          }
          case "sc_register_manifest": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.registerTrainingManifest({
              id: params.id,
              adapter_id: params.adapter_id,
              files: params.files,
              training_seed_hash: params.training_seed_hash,
            }));
          }
          case "sc_get_manifest": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.getManifest(params.id));
          }
          case "sc_list_manifests": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.listManifests(params.adapter_id));
          }
          case "sc_verify_manifest": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.verifyManifest({
              manifest_id: params.manifest_id,
              observed_files: params.observed_files,
            }));
          }
          case "sc_record_signature": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.recordAdapterSignature({
              id: params.id,
              adapter_id: params.adapter_id,
              artifact_sha256: params.artifact_sha256,
              issuer: params.issuer,
              signature: params.signature,
              cert_fingerprint: params.cert_fingerprint,
            }));
          }
          case "sc_list_signatures": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.listAdapterSignatures(params.adapter_id));
          }
          case "sc_register_advisory": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.registerAdvisory({
              id: params.id,
              advisory_id: params.advisory_id,
              package: params.package,
              affected_versions: params.affected_versions,
              severity: params.severity,
              summary: params.summary,
            }));
          }
          case "sc_clear_advisory": {
            const sc = await getSupplyChain();
            return dispatcherResult({ cleared: sc.clearAdvisory(params.id) });
          }
          case "sc_list_advisories": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.listAdvisories({
              package: params.package,
              severity: params.severity,
            }));
          }
          case "sc_verify_artifact": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.verifyArtifact({
              artifact_id: params.artifact_id,
              observed_sha256: params.observed_sha256,
              package_name: params.package_name,
              version: params.version,
              trusted_issuers: params.trusted_issuers,
            }));
          }
          case "sc_list_verifications": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.listVerifications(params.limit));
          }
          case "sc_get_stats": {
            const sc = await getSupplyChain();
            return dispatcherResult(sc.getStats());
          }

          // ── Authorization / REST-MCP Parity (SEC05) ──
          case "authz_register_resource": {
            const az = await getAuthz();
            return dispatcherResult(az.registerResource({
              type: params.type,
              id: params.id,
              tenant_id: params.tenant_id,
              bindings: params.bindings,
            }));
          }
          case "authz_get_resource": {
            const az = await getAuthz();
            return dispatcherResult(az.getResource(params.type, params.id));
          }
          case "authz_list_resources": {
            const az = await getAuthz();
            return dispatcherResult(az.listResources(params.tenant_id));
          }
          case "authz_register_role": {
            const az = await getAuthz();
            return dispatcherResult(az.registerRole({
              id: params.id,
              name: params.name,
              permissions: params.permissions,
            }));
          }
          case "authz_get_role": {
            const az = await getAuthz();
            return dispatcherResult(az.getRole(params.id));
          }
          case "authz_list_roles": {
            const az = await getAuthz();
            return dispatcherResult(az.listRoles());
          }
          case "authz_register_policy": {
            const az = await getAuthz();
            return dispatcherResult(az.registerPolicy({
              id: params.id,
              subject: params.subject,
              subject_kind: params.subject_kind,
              resource_type: params.resource_type,
              resource_id: params.resource_id,
              action: params.action,
              effect: params.effect,
              tenant_id: params.tenant_id,
              condition: params.condition,
            }));
          }
          case "authz_remove_policy": {
            const az = await getAuthz();
            return dispatcherResult({ removed: az.removePolicy(params.id) });
          }
          case "authz_list_policies": {
            const az = await getAuthz();
            return dispatcherResult(az.listPolicies({
              tenant_id: params.tenant_id,
              resource_type: params.resource_type,
            }));
          }
          case "authz_evaluate": {
            const az = await getAuthz();
            return dispatcherResult(az.evaluate({
              principal: params.principal,
              resource_type: params.resource_type,
              resource_id: params.resource_id,
              action: params.action,
              surface: params.surface,
              context: params.context,
            }));
          }
          case "authz_verify_parity": {
            const az = await getAuthz();
            return dispatcherResult(az.verifyParity({
              principal: params.principal,
              resource_type: params.resource_type,
              resource_id: params.resource_id,
              action: params.action,
              context: params.context,
            }));
          }
          case "authz_coverage_report": {
            const az = await getAuthz();
            return dispatcherResult(az.parityCoverageReport(params.principal));
          }
          case "authz_list_decisions": {
            const az = await getAuthz();
            return dispatcherResult(az.listDecisions(params.limit));
          }
          case "authz_get_stats": {
            const az = await getAuthz();
            return dispatcherResult(az.getStats());
          }

          // ── Legal Compliance Gates (CAM-UIX-INFRA-00/U-LEGAL-GATES01) ──
          case "legal_check_consent": {
            const lg = await getLegalGate();
            const result = await lg.checkCustomerConsent(params.customer_id, params.consent_type);
            return dispatcherResult(result);
          }
          case "legal_check_export": {
            const lg = await getLegalGate();
            const result = lg.checkExportControl(params.customer_id);
            return dispatcherResult(result);
          }
          case "legal_check_patent": {
            const lg = await getLegalGate();
            const result = lg.checkPatentCleanroom(params.feature_name);
            return dispatcherResult(result);
          }
          case "legal_check_dmca": {
            const lg = await getLegalGate();
            const result = lg.checkDMCACompliance(params.source_url, params.content_type);
            return dispatcherResult(result);
          }
          case "legal_check_standard": {
            const lg = await getLegalGate();
            const result = await lg.checkStandardsLicense(params.standard_id, params.extraction_type);
            return dispatcherResult(result);
          }
          case "legal_check_all": {
            const lg = await getLegalGate();
            const result = await lg.checkAllGates({
              customerId: params.customer_id,
              sourceUrl: params.source_url,
              contentType: params.content_type,
              featureName: params.feature_name,
              standardId: params.standard_id,
            });
            return dispatcherResult(result);
          }

          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_security");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_security");
      }
    }
  );
}
