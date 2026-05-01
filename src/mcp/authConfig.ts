/**
 * PRISM MCP Server — OAuth 2.1 + PKCE Configuration
 *
 * Configures issuer, audience, token expiry, CORS origins,
 * and client registration for multi-user shop deployments.
 *
 * All values load from environment variables with sensible defaults.
 */

// ============================================================================
// Types
// ============================================================================

export interface OAuthClientConfig {
  clientId: string;
  clientSecret?: string;           // Confidential clients only; public clients omit
  redirectUris: string[];
  allowedScopes: OAuthScope[];
  clientType: "public" | "confidential";
}

export type OAuthScope =
  | "read"
  | "operate"
  | "program"
  | "admin"
  | "offline_access";

export type OAuthRole = "viewer" | "operator" | "programmer" | "admin";

export interface OAuthConfig {
  /** JWT issuer (iss claim) */
  issuer: string;
  /** JWT audience (aud claim) */
  audience: string;
  /** Access token expiry in seconds (default: 3600 = 1hr) */
  accessTokenExpiry: number;
  /** Refresh token expiry in seconds (default: 604800 = 7 days) */
  refreshTokenExpiry: number;
  /** Authorization code expiry in seconds (default: 300 = 5 min) */
  authCodeExpiry: number;
  /** JWT signing secret — minimum 32 characters */
  jwtSecret: string;
  /** Allowed CORS origins for HTTP transport */
  corsOrigins: string[];
  /** Registered OAuth clients */
  clients: OAuthClientConfig[];
  /** Whether auth is enabled (disabled = all requests pass through) */
  enabled: boolean;
}

// ============================================================================
// Default Clients
// ============================================================================

const DEFAULT_CLIENTS: OAuthClientConfig[] = [
  {
    clientId: "prism-web",
    redirectUris: ["http://localhost:3000/callback", "http://localhost:5173/callback"],
    allowedScopes: ["read", "operate", "program", "admin", "offline_access"],
    clientType: "public",
  },
  {
    clientId: "prism-desktop",
    redirectUris: ["prism://callback", "http://127.0.0.1:19280/callback"],
    allowedScopes: ["read", "operate", "program", "admin", "offline_access"],
    clientType: "public",
  },
  {
    clientId: "prism-cli",
    redirectUris: ["http://127.0.0.1:0/callback"],
    allowedScopes: ["read", "operate", "program", "admin", "offline_access"],
    clientType: "public",
  },
];

// ============================================================================
// Configuration Loader
// ============================================================================

let _config: OAuthConfig | null = null;

function getDefaultIssuer(): string {
  if (process.env.PRISM_AUTH_ISSUER) return process.env.PRISM_AUTH_ISSUER;
  if (process.env.PRISM_PUBLIC_BASE_URL) return process.env.PRISM_PUBLIC_BASE_URL;

  const protocol = process.env.PRISM_AUTH_PROTOCOL || "http";
  const host =
    process.env.PRISM_AUTH_HOST ||
    process.env.PRISM_BIND_HOST ||
    "127.0.0.1";
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  const port = process.env.PRISM_AUTH_PORT || process.env.PORT || "3000";
  return `${protocol}://${normalizedHost}:${port}`;
}

/**
 * Load OAuth configuration from environment variables with defaults.
 * Caches after first call; call `resetAuthConfig()` to force reload.
 */
export function getAuthConfig(): OAuthConfig {
  if (_config) return _config;

  const secret = process.env.PRISM_JWT_SECRET || process.env.JWT_SECRET || "";
  const explicitlyDisabled = process.env.PRISM_AUTH_ENABLED === "false";
  const enabled = !explicitlyDisabled && secret.length >= 32;

  // Warn if auth is off not by choice but by missing secret
  if (!enabled && !explicitlyDisabled && secret.length < 32) {
    console.warn("[PRISM Auth] WARNING: Auth is disabled because no JWT secret (>=32 chars) is configured. Set PRISM_JWT_SECRET or explicitly set PRISM_AUTH_ENABLED=false to silence this warning.");
  }

  // Parse additional clients from PRISM_OAUTH_CLIENTS JSON env var
  let extraClients: OAuthClientConfig[] = [];
  if (process.env.PRISM_OAUTH_CLIENTS) {
    try {
      extraClients = JSON.parse(process.env.PRISM_OAUTH_CLIENTS);
    } catch {
      // Invalid JSON — ignore, use defaults only
    }
  }

  _config = {
    issuer: getDefaultIssuer(),
    audience: process.env.PRISM_AUTH_AUDIENCE || "prism-mcp-server",
    accessTokenExpiry: parseInt(process.env.PRISM_ACCESS_TOKEN_EXPIRY || "3600", 10),
    refreshTokenExpiry: parseInt(process.env.PRISM_REFRESH_TOKEN_EXPIRY || "604800", 10),
    authCodeExpiry: parseInt(process.env.PRISM_AUTH_CODE_EXPIRY || "300", 10),
    jwtSecret: secret,
    corsOrigins: (process.env.PRISM_CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    clients: [...DEFAULT_CLIENTS, ...extraClients],
    enabled,
  };

  return _config;
}

/**
 * Reset cached config (for testing or hot-reload).
 */
export function resetAuthConfig(): void {
  _config = null;
}

/**
 * Scope-to-role mapping. A scope grants the minimum role level.
 * Roles are hierarchical: admin > programmer > operator > viewer.
 */
export const SCOPE_TO_ROLE: Record<OAuthScope, OAuthRole> = {
  read: "viewer",
  operate: "operator",
  program: "programmer",
  admin: "admin",
  offline_access: "viewer", // offline_access doesn't elevate role
};

/**
 * Role hierarchy — higher index = more privilege.
 */
export const ROLE_HIERARCHY: OAuthRole[] = ["viewer", "operator", "programmer", "admin"];

/**
 * Check if `userRole` meets or exceeds `requiredRole`.
 */
export function roleAtLeast(userRole: OAuthRole, requiredRole: OAuthRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
