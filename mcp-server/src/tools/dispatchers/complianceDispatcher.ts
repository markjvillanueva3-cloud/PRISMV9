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

export function registerComplianceDispatcher(server: McpServer): void {
  server.tool(
    "prism_compliance",
    "Compliance-as-Code regulatory templates. 6 frameworks (ISO 13485, AS9100, ITAR, SOC2, HIPAA, FDA 21 CFR Part 11). Auto-provisions hooks via F6, strictness lattice conflict resolution, append-only audit logs. Actions: apply_template, remove_template, list_templates, audit_status, check_compliance, resolve_conflicts, gap_analysis, config",
    {
      action: z.enum([
        "apply_template", "remove_template", "list_templates",
        "audit_status", "check_compliance", "resolve_conflicts",
        "gap_analysis", "config",
      ]).describe("Compliance action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
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
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: (e as Error).message }) }] };
      }
    }
  );
}
