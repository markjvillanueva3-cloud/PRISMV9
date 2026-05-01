/**
 * PRISM F8: Compliance-as-Code Dispatcher (#29)
 * ================================================
 * 
 * prism_compliance — 8 actions for regulatory compliance templates.
 * 
 * @version 1.1.0 (fixed: proper server.tool() registration)
 * @feature F8
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { complianceEngine } from "../../engines/ComplianceEngine.js";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_COMPLIANCE_SCHEMAS } from "../../schemas/complianceActionSchemas.js";

// Lazy-load for LegalComplianceOperatingEngine
let _legalComplianceEngine: any = null;
async function getLegalComplianceEngine() {
  if (!_legalComplianceEngine) {
    const m = await import("../../engines/LegalComplianceOperatingEngine.js");
    _legalComplianceEngine = m.legalComplianceOperatingEngine ?? (m as any).default ?? m;
  }
  return _legalComplianceEngine;
}

/** Registers compliance dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerComplianceDispatcher(server: McpServer): void {
  server.tool(
    "prism_compliance",
    "Compliance-as-Code + Legal Operating Layer. 6 regulatory frameworks + NDA lifecycle, export control (ITAR/EAR), document retention, audit trail, OSHA safety, certification tracking. Actions: apply_template, remove_template, list_templates, audit_status, check_compliance, resolve_conflicts, gap_analysis, config, nda_manage, export_control, document_retention, audit_trail, safety_incident, safety_inspection, osha_300_log, cert_manage, legal_dashboard",
    {
      action: z.enum([
        "apply_template", "remove_template", "list_templates",
        "audit_status", "check_compliance", "resolve_conflicts",
        "gap_analysis", "config",
        "nda_manage", "export_control", "document_retention",
        "audit_trail", "safety_incident", "safety_inspection",
        "osha_300_log", "cert_manage", "legal_dashboard",
      ]).describe("Compliance action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params: rawParams = {} } = args;
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      const validation = validateActionParams(action, params, ACTION_COMPLIANCE_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_compliance"
        );
      }
      try {
        let result: unknown;
        switch (action) {
          case "apply_template":
            result = complianceEngine.applyTemplate(params.template_id, params.provisioned_by, params.disclaimer_acknowledged);
            break;
          case "remove_template":
            result = complianceEngine.removeTemplate(params.template_id);
            break;
          case "list_templates":
            result = { available: complianceEngine.listTemplates(), provisioned: complianceEngine.listTemplates(), stats: complianceEngine.getStats() };
            break;
          case "audit_status":
            result = complianceEngine.runAudit(params.template_id);
            break;
          case "check_compliance":
          case "gap_analysis":
            result = complianceEngine.gapAnalysis(params.template_id);
            break;
          case "resolve_conflicts":
            result = complianceEngine.resolveConflicts();
            break;
          case "config":
            result = params.updates ? complianceEngine.updateConfig(params.updates) : complianceEngine.getConfig();
            break;

          // ── Legal Compliance Operating Engine actions ──
          case "nda_manage": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "create":
                result = lce.createNDA(params);
                break;
              case "list":
                result = lce.listNDAs({ status: params.status, counterparty: params.counterparty });
                break;
              case "get":
                result = lce.getNDA(params.id);
                break;
              case "terminate":
                result = lce.terminateNDA(params.id, params.signed_by ?? "system", params.reason);
                break;
              case "check_expirations":
                result = lce.checkNDAExpirations(params.within_days);
                break;
              default:
                throw new Error(`Unknown nda_manage operation: ${params.operation}`);
            }
            break;
          }
          case "export_control": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "classify":
                result = lce.classifyExport(params);
                break;
              case "screen":
                result = lce.screenDeniedParty(params.entity);
                break;
              case "list":
                result = lce.listExportClassifications({ regime: params.regime, part_number: params.part_number });
                break;
              default:
                throw new Error(`Unknown export_control operation: ${params.operation}`);
            }
            break;
          }
          case "document_retention": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "list_policies":
                result = lce.listRetentionPolicies();
                break;
              case "assign":
                result = lce.assignRetention(params);
                break;
              case "legal_hold":
                result = lce.applyLegalHold(params);
                break;
              case "pending_destructions":
                result = lce.getPendingDestructions();
                break;
              default:
                throw new Error(`Unknown document_retention operation: ${params.operation}`);
            }
            break;
          }
          case "audit_trail": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "query":
                result = lce.queryAuditLog(params);
                break;
              case "summary":
                result = lce.getAuditSummary();
                break;
              case "evidence_package":
                if (!params.entity_id) throw new Error("entity_id is required for evidence_package");
                result = lce.buildEvidencePackage(params);
                break;
              default:
                throw new Error(`Unknown audit_trail operation: ${params.operation}`);
            }
            break;
          }
          case "safety_incident": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "record":
                result = lce.recordIncident(params);
                break;
              case "update":
                result = lce.updateIncident(params);
                break;
              case "list":
                result = { incidents: lce.listSafetyIncidents({ status: params.status, osha_reportable: params.osha_reportable }) };
                break;
              default:
                throw new Error(`Unknown safety_incident operation: ${params.operation}`);
            }
            break;
          }
          case "safety_inspection": {
            const lce = await getLegalComplianceEngine();
            result = lce.recordInspection(params);
            break;
          }
          case "osha_300_log": {
            const lce = await getLegalComplianceEngine();
            result = lce.generateOSHA300Log(params.year);
            break;
          }
          case "cert_manage": {
            const lce = await getLegalComplianceEngine();
            switch (params.operation) {
              case "add":
                result = lce.addCertification(params);
                break;
              case "list":
                result = lce.listCertifications({ status: params.status, standard: params.standard });
                break;
              case "check_expirations":
                result = lce.checkCertificationExpirations(params.within_days);
                break;
              case "record_audit":
                if (!params.cert_id) throw new Error("cert_id is required for record_audit");
                result = lce.recordAuditResult(params);
                break;
              default:
                throw new Error(`Unknown cert_manage operation: ${params.operation}`);
            }
            break;
          }
          case "legal_dashboard": {
            const lce = await getLegalComplianceEngine();
            result = lce.dashboard();
            break;
          }
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_compliance");
      }
    }
  );
}
