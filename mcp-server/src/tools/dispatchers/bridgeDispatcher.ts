/**
 * PRISM F7: Protocol Bridge Dispatcher (#31)
 * =============================================
 * 
 * prism_bridge — 13 actions for multi-protocol API gateway.
 * 
 * @version 1.1.0 (fixed: proper server.tool() registration)
 * @feature F7
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { protocolBridgeEngine } from "../../engines/ProtocolBridgeEngine.js";
import { log } from "../../utils/Logger.js";

export function registerBridgeDispatcher(server: McpServer): void {
  server.tool(
    "prism_bridge",
    "Multi-protocol API gateway for external system integration. REST/gRPC/GraphQL/WebSocket routing to PRISM dispatchers with auth (API key, bearer, mTLS), 3-tier rate limiting (burst/minute/hour), scope-based authorization. Actions: register_endpoint, remove_endpoint, set_status, list_endpoints, create_key, revoke_key, validate_key, list_keys, route, route_map, health, stats, config",
    {
      action: z.enum([
        "register_endpoint", "remove_endpoint", "set_status", "list_endpoints",
        "create_key", "revoke_key", "validate_key", "list_keys",
        "route", "route_map", "health", "stats", "config",
      ]).describe("Bridge action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
      try {
        let result: unknown;
        switch (action) {
          case "register_endpoint":
            result = protocolBridgeEngine.registerEndpoint(params.protocol, params.path, params.dispatcher, params.action, params.auth, params.rate_limit);
            break;
          case "remove_endpoint":
            result = protocolBridgeEngine.removeEndpoint(params.endpoint_id);
            break;
          case "set_status":
            result = protocolBridgeEngine.setEndpointStatus(params.endpoint_id, params.status);
            break;
          case "list_endpoints":
            result = protocolBridgeEngine.listEndpoints(params.protocol, params.status);
            break;
          case "create_key":
            result = protocolBridgeEngine.createApiKey(params.name, params.scopes || ["*"], params.expires_in_days, params.rate_limit);
            break;
          case "revoke_key":
            result = protocolBridgeEngine.revokeApiKey(params.key_id);
            break;
          case "validate_key":
            result = protocolBridgeEngine.validateApiKey(params.key);
            break;
          case "list_keys":
            result = protocolBridgeEngine.listApiKeys();
            break;
          case "route":
            result = protocolBridgeEngine.routeRequest({
              request_id: params.request_id || `req_${Date.now()}`,
              protocol: params.protocol || "rest",
              endpoint_id: params.endpoint_id || "",
              dispatcher: params.dispatcher, action: params.target_action,
              params: params.request_params || {},
              auth: { method: params.auth_method || "none", key_id: params.key_id },
              timestamp: Date.now(), client_ip: params.client_ip,
            });
            break;
          case "route_map":
            result = protocolBridgeEngine.generateRouteMap();
            break;
          case "health": {
            const stats = protocolBridgeEngine.getStats();
            result = { status: "healthy", uptime_ms: Date.now(), endpoints: stats.active_endpoints, keys: stats.active_keys, require_tls: protocolBridgeEngine.getConfig().require_tls };
            break;
          }
          case "stats":
            result = protocolBridgeEngine.getStats();
            break;
          case "config":
            result = params.updates ? protocolBridgeEngine.updateConfig(params.updates) : protocolBridgeEngine.getConfig();
            break;
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: (e as Error).message }) }] };
      }
    }
  );
}
