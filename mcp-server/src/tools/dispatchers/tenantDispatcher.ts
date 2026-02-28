/**
 * PRISM F5: Multi-Tenant Dispatcher (#30)
 * ==========================================
 * 
 * prism_tenant — 15 actions for tenant lifecycle, SLB, resource limits.
 * 
 * @version 1.1.0 (fixed: proper server.tool() registration)
 * @feature F5
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { multiTenantEngine } from "../../engines/MultiTenantEngine.js";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

export function registerTenantDispatcher(server: McpServer): void {
  (server as any).tool(
    "prism_tenant",
    "Multi-tenant isolation with Shared Learning Bus. Tenant namespace isolation (state/{tenant_id}/), per-tenant resource limits, anonymized cross-tenant pattern sharing (0.5x external weight), 2-phase deletion. Actions: create, get, list, suspend, reactivate, delete, get_context, check_limit, publish_pattern, consume_patterns, promote_pattern, quarantine_pattern, slb_stats, stats, config",
    {
      action: z.enum([
        "create", "get", "list", "suspend", "reactivate", "delete",
        "get_context", "check_limit", "publish_pattern", "consume_patterns",
        "promote_pattern", "quarantine_pattern", "slb_stats", "stats", "config",
      ]).describe("Tenant action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params: rawParams = {} } = args;
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      try {
        let result: unknown;
        switch (action) {
          case "create":
            result = multiTenantEngine.createTenant(params.name, params.created_by, params.config);
            break;
          case "get":
            result = multiTenantEngine.getTenant(params.tenant_id);
            break;
          case "list":
            result = multiTenantEngine.listTenants(params.status);
            break;
          case "suspend":
            result = multiTenantEngine.suspendTenant(params.tenant_id);
            break;
          case "reactivate":
            result = multiTenantEngine.reactivateTenant(params.tenant_id);
            break;
          case "delete":
            result = multiTenantEngine.deleteTenant(params.tenant_id, params.deleted_by);
            break;
          case "get_context":
            result = multiTenantEngine.getTenantContext(params.tenant_id);
            break;
          case "check_limit":
            result = multiTenantEngine.checkResourceLimit(params.tenant_id, params.resource);
            break;
          case "publish_pattern":
            result = multiTenantEngine.publishPattern(params.tenant_id, params.type, params.data || {}, params.confidence ?? 0.7);
            break;
          case "consume_patterns":
            result = multiTenantEngine.consumePatterns(params.tenant_id, params.type, params.limit);
            break;
          case "promote_pattern":
            if (!params.tenant_id) throw new Error("tenant_id required for promote_pattern (M-003 auth fix)");
            result = multiTenantEngine.promotePattern(params.pattern_id);
            break;
          case "quarantine_pattern":
            if (!params.tenant_id) throw new Error("tenant_id required for quarantine_pattern (M-003 auth fix)");
            result = multiTenantEngine.quarantinePattern(params.pattern_id);
            break;
          case "slb_stats":
            result = multiTenantEngine.getSLBStats();
            break;
          case "stats":
            result = multiTenantEngine.getStats();
            break;
          case "config":
            result = params.updates ? multiTenantEngine.updateConfig(params.updates) : multiTenantEngine.getConfig();
            break;
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_tenant");
      }
    }
  );
}
