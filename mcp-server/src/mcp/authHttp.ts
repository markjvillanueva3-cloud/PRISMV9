/**
 * MCP OAuth HTTP Routes — Discovery and OAuth endpoints
 * @module mcp/authHttp
 */

import type { Express } from "express";
import { log } from "../utils/Logger.js";
import { getAuthConfig } from "./authConfig.js";

/** Build MCP discovery document for .well-known/mcp.json */
export function buildMcpDiscoveryDocument(): Record<string, unknown> {
  const config = getAuthConfig();
  return {
    name: "prism-mcp-server",
    version: "1.0.0",
    description: "PRISM Manufacturing Intelligence MCP Server",
    oauth: {
      // Mirror the canonical discovery contract in auth.ts (issuer + standard
      // OAuth 2.1 paths registered under PUBLIC_PREFIXES "/oauth/"). OAuthConfig
      // has no authorizationUrl/tokenUrl/scopes fields -- derive them here.
      authorization_endpoint: `${config.issuer}/oauth/authorize`,
      token_endpoint: `${config.issuer}/oauth/token`,
      // Union of every registered client's allowed scopes (real config, not a
      // hardcoded list that would drift from authConfig DEFAULT_CLIENTS).
      scopes: [...new Set(config.clients.flatMap((c) => c.allowedScopes))],
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
