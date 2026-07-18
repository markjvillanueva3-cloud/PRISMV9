import express, { type Express, type Request, type Response } from "express";

import {
  getOAuthServer,
  type AuthUser,
} from "./auth.js";
import { getAuthConfig, type OAuthRole } from "./authConfig.js";
import { SERVER_DESCRIPTION, SERVER_NAME, SERVER_VERSION } from "../constants.js";
import { log } from "../utils/Logger.js";

const SUPPORTED_SCOPES = ["read", "operate", "program", "admin", "offline_access"];
const DEFAULT_SUB = "prism-local-admin";
const DEFAULT_TENANT = "local-shop";
const DEFAULT_ROLE: OAuthRole = "admin";

function getBaseUrl(req: Request): string {
  const host = req.get("host") || "127.0.0.1:3000";
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol || "http";
  return `${protocol}://${host}`;
}

function readString(
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function sendOAuthError(
  res: Response,
  status: number,
  error: string,
  description: string,
): void {
  res.status(status).json({
    error,
    error_description: description,
  });
}

function resolveDefaultRole(): OAuthRole {
  const requested = process.env.PRISM_AUTH_DEFAULT_ROLE;
  if (
    requested === "viewer" ||
    requested === "operator" ||
    requested === "programmer" ||
    requested === "admin"
  ) {
    return requested;
  }
  return DEFAULT_ROLE;
}

function buildDefaultUser(scope: string): AuthUser {
  return {
    sub: process.env.PRISM_AUTH_DEFAULT_SUB || DEFAULT_SUB,
    role: resolveDefaultRole(),
    scope: scope || "read operate program admin offline_access",
    email: process.env.PRISM_AUTH_DEFAULT_EMAIL || "local-admin@prism.local",
    tenant_id: process.env.PRISM_AUTH_DEFAULT_TENANT || DEFAULT_TENANT,
    display_name: process.env.PRISM_AUTH_DEFAULT_NAME || "PRISM Local Admin",
  };
}

function buildOAuthMetadata(): Record<string, unknown> {
  const config = getAuthConfig();
  const oauthServer = getOAuthServer();

  if (!config.enabled || !oauthServer) {
    return {
      oauth_enabled: false,
      issuer: config.issuer,
    };
  }

  return oauthServer.getServerMetadata();
}

function buildProtectedResourceMetadata(baseUrl: string): Record<string, unknown> {
  const config = getAuthConfig();

  return {
    resource: `${baseUrl}/mcp`,
    resource_name: SERVER_NAME,
    authorization_servers: [`${config.issuer}/.well-known/oauth-authorization-server`],
    bearer_methods_supported: ["header"],
    scopes_supported: SUPPORTED_SCOPES,
    resource_documentation: `${baseUrl}/.well-known/mcp.json`,
  };
}

export function buildMcpDiscoveryDocument(baseUrl: string): Record<string, unknown> {
  const config = getAuthConfig();

  const document: Record<string, unknown> = {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    description: SERVER_DESCRIPTION,
    url: `${baseUrl}/mcp`,
    transport: { type: "streamable-http" },
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
      completions: true,
      logging: true,
    },
  };

  if (config.enabled) {
    document.authentication = {
      type: "oauth2",
      authorizationUrl: `${config.issuer}/oauth/authorize`,
      tokenUrl: `${config.issuer}/oauth/token`,
      revocationUrl: `${config.issuer}/oauth/revoke`,
      discoveryUrl: `${config.issuer}/.well-known/oauth-authorization-server`,
    };
  }

  return document;
}

export function registerOAuthHttpRoutes(app: Express): void {
  const urlencoded = express.urlencoded({ extended: false });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    const config = getAuthConfig();
    if (!config.enabled) {
      sendOAuthError(res, 501, "oauth_disabled", "OAuth is not enabled for this PRISM server.");
      return;
    }

    res.json(buildOAuthMetadata());
  });

  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    const config = getAuthConfig();
    if (!config.enabled) {
      sendOAuthError(res, 501, "oauth_disabled", "OAuth is not enabled for this PRISM server.");
      return;
    }

    res.json(buildProtectedResourceMetadata(getBaseUrl(req)));
  });

  app.get("/oauth/discovery", (_req, res) => {
    const config = getAuthConfig();
    if (!config.enabled) {
      sendOAuthError(res, 501, "oauth_disabled", "OAuth is not enabled for this PRISM server.");
      return;
    }

    res.json(buildOAuthMetadata());
  });

  app.get("/oauth/authorize", async (req, res) => {
    const oauthServer = getOAuthServer();
    if (!oauthServer) {
      sendOAuthError(res, 503, "temporarily_unavailable", "OAuth server is not initialized.");
      return;
    }

    const responseType = readString(req.query as Record<string, unknown>, "response_type");
    const clientId = readString(req.query as Record<string, unknown>, "client_id", "clientId");
    const redirectUri = readString(req.query as Record<string, unknown>, "redirect_uri", "redirectUri");
    const scope = readString(req.query as Record<string, unknown>, "scope") || "read";
    const codeChallenge = readString(req.query as Record<string, unknown>, "code_challenge", "codeChallenge");
    const codeChallengeMethod =
      readString(req.query as Record<string, unknown>, "code_challenge_method", "codeChallengeMethod") ||
      "S256";
    const state = readString(req.query as Record<string, unknown>, "state");

    if (responseType !== "code") {
      sendOAuthError(res, 400, "unsupported_response_type", "Only response_type=code is supported.");
      return;
    }
    if (!clientId || !redirectUri || !codeChallenge) {
      sendOAuthError(
        res,
        400,
        "invalid_request",
        "client_id, redirect_uri, and code_challenge are required.",
      );
      return;
    }
    if (codeChallengeMethod !== "S256") {
      sendOAuthError(
        res,
        400,
        "invalid_request",
        "Only S256 code_challenge_method is supported.",
      );
      return;
    }

    try {
      const user = buildDefaultUser(scope);
      oauthServer.registerUser(user);
      const approval = await oauthServer.generateAuthorizationUrl(
        {
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod: "S256",
          scope,
          state,
        },
        user,
      );

      res.redirect(302, approval.authorization_url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendOAuthError(res, 400, "invalid_request", message);
    }
  });

  app.post("/oauth/token", urlencoded, async (req, res) => {
    const oauthServer = getOAuthServer();
    if (!oauthServer) {
      sendOAuthError(res, 503, "temporarily_unavailable", "OAuth server is not initialized.");
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const grantType = readString(body, "grant_type", "grantType");
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");

    try {
      if (grantType === "authorization_code") {
        const code = readString(body, "code");
        const codeVerifier = readString(body, "code_verifier", "codeVerifier");
        const clientId = readString(body, "client_id", "clientId");
        const redirectUri = readString(body, "redirect_uri", "redirectUri");

        if (!code || !codeVerifier || !clientId || !redirectUri) {
          sendOAuthError(
            res,
            400,
            "invalid_request",
            "code, code_verifier, client_id, and redirect_uri are required for authorization_code.",
          );
          return;
        }

        const tokens = await oauthServer.exchangeCode({
          code,
          codeVerifier,
          clientId,
          redirectUri,
        });
        res.json(tokens);
        return;
      }

      if (grantType === "refresh_token") {
        const refreshToken = readString(body, "refresh_token", "refreshToken");
        const clientId = readString(body, "client_id", "clientId");

        if (!refreshToken) {
          sendOAuthError(
            res,
            400,
            "invalid_request",
            "refresh_token is required for refresh_token grants.",
          );
          return;
        }

        const tokens = await oauthServer.refreshToken({
          refreshToken,
          clientId,
        });
        res.json(tokens);
        return;
      }

      sendOAuthError(
        res,
        400,
        "unsupported_grant_type",
        "Supported grant_type values are authorization_code and refresh_token.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendOAuthError(res, 400, "invalid_grant", message);
    }
  });

  app.post("/oauth/revoke", urlencoded, async (req, res) => {
    const oauthServer = getOAuthServer();
    if (!oauthServer) {
      sendOAuthError(res, 503, "temporarily_unavailable", "OAuth server is not initialized.");
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = readString(body, "token");
    if (!token) {
      sendOAuthError(res, 400, "invalid_request", "token is required.");
      return;
    }

    await oauthServer.revokeToken(token);
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.json({ revoked: true });
  });

  app.post("/oauth/introspect", urlencoded, async (req, res) => {
    const oauthServer = getOAuthServer();
    if (!oauthServer) {
      sendOAuthError(res, 503, "temporarily_unavailable", "OAuth server is not initialized.");
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = readString(body, "token");
    if (!token) {
      sendOAuthError(res, 400, "invalid_request", "token is required.");
      return;
    }

    const result = await oauthServer.validateToken(token);
    if (!result.valid || !result.claims) {
      res.json({ active: false });
      return;
    }

    res.json({
      active: true,
      scope: result.claims.scope,
      sub: result.claims.sub,
      aud: result.claims.aud,
      iss: result.claims.iss,
      exp: result.claims.exp,
      iat: result.claims.iat,
      role: result.claims.role,
      email: result.claims.email,
      tenant_id: result.claims.tenant_id,
      token_type: "Bearer",
    });
  });

  log.info("[MCP Auth] Registered OAuth discovery, authorize, token, revoke, and introspect HTTP routes");
}
