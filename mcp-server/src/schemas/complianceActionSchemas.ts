/**
 * Zod action schemas for prism_compliance dispatcher (8 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - Mark optional params with `.optional()`
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const apply_template = z.object({
  template_id: z.string().describe("Compliance template ID (e.g. ISO_13485, AS9100)"),
  provisioned_by: z.string().optional().describe("Who provisioned this template"),
  disclaimer_acknowledged: z.boolean().optional().describe("Whether disclaimer was acknowledged"),
}).passthrough();

const remove_template = z.object({
  template_id: z.string().describe("Compliance template ID to remove"),
}).passthrough();

const list_templates = z.object({}).passthrough();

const audit_status = z.object({
  template_id: z.string().optional().describe("Template ID to audit (optional — audits all if omitted)"),
}).passthrough();

const check_compliance = z.object({
  template_id: z.string().optional().describe("Template ID to check compliance for"),
}).passthrough();

const resolve_conflicts = z.object({}).passthrough();

const gap_analysis = z.object({
  template_id: z.string().optional().describe("Template ID for gap analysis"),
}).passthrough();

const config = z.object({
  updates: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Config updates — omit for read-only"),
}).passthrough();

// ── Legal Compliance Operating Engine actions ──

const nda_manage = z.object({
  operation: z.enum(["create", "list", "get", "terminate", "check_expirations"]).describe("NDA operation"),
  id: z.string().optional().describe("NDA ID (for get/terminate)"),
  counterparty: z.string().optional().describe("Counterparty name (for create/filter)"),
  type: z.enum(["mutual", "unilateral_inbound", "unilateral_outbound"]).optional().describe("NDA type"),
  effective_date: z.string().optional().describe("Effective date ISO (for create)"),
  expiration_date: z.string().optional().describe("Expiration date ISO (for create)"),
  auto_renew: z.boolean().optional().describe("Auto-renew flag"),
  scope: z.string().optional().describe("NDA scope description"),
  signed_by: z.string().optional().describe("Signer name"),
  status: z.string().optional().describe("Filter by status (active/expired/terminated/pending)"),
  reason: z.string().optional().describe("Termination reason"),
  within_days: z.number().optional().describe("Days ahead for expiration check (default 90)"),
}).passthrough();

const export_control = z.object({
  operation: z.enum(["classify", "screen", "list"]).describe("Export control operation"),
  part_number: z.string().optional().describe("Part number to classify"),
  description: z.string().optional().describe("Part description"),
  regime: z.enum(["ITAR", "EAR"]).optional().describe("Export control regime"),
  classification: z.string().optional().describe("USML category or ECCN"),
  jurisdiction: z.string().optional().describe("Jurisdiction (default US)"),
  license_required: z.boolean().optional().describe("Whether export license is required"),
  license_number: z.string().optional().describe("Export license number"),
  license_expiry: z.string().optional().describe("License expiry date ISO"),
  reviewed_by: z.string().optional().describe("Reviewer name"),
  entity: z.string().optional().describe("Entity name for denied-party screening"),
}).passthrough();

const document_retention = z.object({
  operation: z.enum(["list_policies", "assign", "legal_hold", "pending_destructions"]).describe("Retention operation"),
  document_id: z.string().optional().describe("Document ID to assign retention"),
  document_type: z.string().optional().describe("Document type (quality_records, contract_records, etc.)"),
  created_date: z.string().optional().describe("Document creation date ISO"),
  assigned_by: z.string().optional().describe("Who assigned the retention"),
  record_id: z.string().optional().describe("Retention record ID for hold"),
  reason: z.string().optional().describe("Legal hold reason"),
  applied_by: z.string().optional().describe("Who applied the hold"),
}).passthrough();

const audit_trail = z.object({
  operation: z.enum(["query", "summary", "evidence_package"]).describe("Audit trail operation"),
  domain: z.string().optional().describe("Filter by domain (nda/export/retention/safety/certification)"),
  severity: z.string().optional().describe("Filter by severity (info/warning/critical)"),
  actor: z.string().optional().describe("Filter by actor"),
  from_date: z.string().optional().describe("Start date ISO for filtering"),
  to_date: z.string().optional().describe("End date ISO for filtering"),
  limit: z.number().optional().describe("Max entries to return"),
  entity_id: z.string().optional().describe("Entity ID (REQUIRED for evidence_package)"),
}).passthrough();

const safety_incident = z.object({
  operation: z.enum(["record", "update", "list"]).describe("Safety incident operation"),
  id: z.string().optional().describe("Incident ID (for update)"),
  date: z.string().optional().describe("Incident date ISO"),
  type: z.enum(["injury", "illness", "near_miss", "property_damage"]).optional().describe("Incident type"),
  severity: z.enum(["first_aid", "recordable", "lost_time", "fatality"]).optional().describe("Incident severity"),
  location: z.string().optional().describe("Incident location"),
  description: z.string().optional().describe("Incident description"),
  employee_id: z.string().optional().describe("Employee ID"),
  reported_by: z.string().optional().describe("Reporter name"),
  root_cause: z.string().optional().describe("Root cause (for update)"),
  corrective_action: z.string().optional().describe("Corrective action (for update)"),
  days_away: z.number().optional().describe("Days away from work"),
  days_restricted: z.number().optional().describe("Days on restricted duty"),
  status: z.enum(["open", "investigating", "closed"]).optional().describe("Incident status"),
  updated_by: z.string().optional().describe("Updater name"),
}).passthrough();

const safety_inspection = z.object({
  date: z.string().optional().describe("Inspection date ISO"),
  inspector: z.string().describe("Inspector name"),
  area: z.string().describe("Area inspected"),
  findings: z.array(z.object({
    item: z.string().describe("Inspection item"),
    status: z.enum(["pass", "fail", "warning"]).describe("Item status"),
    note: z.string().optional().describe("Additional notes"),
  })).describe("Inspection findings"),
  next_inspection_date: z.string().describe("Next scheduled inspection date ISO"),
}).passthrough();

const osha_300_log = z.object({
  year: z.number().optional().describe("Year for OSHA 300 log (default current year)"),
}).passthrough();

const cert_manage = z.object({
  operation: z.enum(["add", "list", "check_expirations", "record_audit"]).describe("Certification operation"),
  standard: z.string().optional().describe("Standard name (AS9100D, ISO 13485:2016, etc.)"),
  scope: z.string().optional().describe("Certification scope"),
  certifying_body: z.string().optional().describe("Certifying body name"),
  issue_date: z.string().optional().describe("Issue date ISO"),
  expiry_date: z.string().optional().describe("Expiry date ISO"),
  surveillance_dates: z.array(z.string()).optional().describe("Surveillance audit dates"),
  added_by: z.string().optional().describe("Who added the certification"),
  cert_id: z.string().optional().describe("Certification ID (for record_audit)"),
  audit_date: z.string().optional().describe("Audit date ISO"),
  nonconformances_found: z.number().optional().describe("Number of NCs found in audit"),
  audited_by: z.string().optional().describe("Auditor name"),
  status: z.string().optional().describe("Filter by status"),
  within_days: z.number().optional().describe("Days ahead for expiration check (default 90)"),
}).passthrough();

const legal_dashboard = z.object({}).passthrough();

export const ACTION_COMPLIANCE_SCHEMAS: ActionSchemaMap = {
  apply_template,
  remove_template,
  list_templates,
  audit_status,
  check_compliance,
  resolve_conflicts,
  gap_analysis,
  config,
  nda_manage,
  export_control,
  document_retention,
  audit_trail,
  safety_incident,
  safety_inspection,
  osha_300_log,
  cert_manage,
  legal_dashboard,
};
