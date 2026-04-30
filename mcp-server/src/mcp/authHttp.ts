/**
 * MCP OAuth HTTP Routes — Discovery and OAuth endpoints
 * @module mcp/authHttp
 */

import type { Express } from "express";
import { log } from "../utils/Logger.js";
import { getAuthConfig } from "./authConfig.js";

/**
 * Build MCP discovery document for .well-known/mcp.json. The optional
 * `_baseUrl` is accepted (and ignored) so callers that compute it from the
 * inbound request can pass it without a type error.
 */
export function buildMcpDiscoveryDocument(_baseUrl?: string): {
  name: string;
  version: string;
  description: string;
  oauth: { authorization_endpoint: string; token_endpoint: string; scopes: string[] };
  authentication?: Record<string, unknown>;
} {
  const config = getAuthConfig();
  // Discovery endpoints derived from issuer (RFC 8414 well-known pattern).
  const issuer = config.issuer.replace(/\/$/, "");
  return {
    name: "prism-mcp-server",
    version: "1.0.0",
    description: "PRISM Manufacturing Intelligence MCP Server",
    oauth: {
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      scopes: ["read", "write", "execute", "machine", "program", "admin", "offline_access"],
    },
  };
}

/** Register OAuth HTTP routes on Express app */
export function registerOAuthHttpRoutes(app: Express): void {
  log.debug("[authHttp] Registering OAuth HTTP routes");

  // /.well-known/mcp.json discovery endpoint
  app.get("/.well-known/mcp.json", (_req, res) => {
    res.json(buildMcpDiscoveryDocument());
  });
}
