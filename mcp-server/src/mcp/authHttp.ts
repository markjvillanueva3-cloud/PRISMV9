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
      authorization_endpoint: config.authorizationUrl,
      token_endpoint: config.tokenUrl,
      scopes: config.scopes,
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
