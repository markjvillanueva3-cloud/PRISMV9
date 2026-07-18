// WIRE-EXEMPT: Phase 5 of APS-FUSION-CLOUD-MS0 wires this into cadDispatcher
// as actions aps_oauth_status / aps_oauth_begin_3lo / aps_hub_list / etc. Phase
// 2 (this file) ships the engine + 19 unit tests and is exercised directly via
// scripts/aps-smoke-3lo.ts during pre-wire bring-up. Remove this marker when
// the cadDispatcher cases land. See plan: H:/.claude/plans/gleaming-rolling-cascade.md
/**
 * APSOAuthEngine — Autodesk Platform Services OAuth 2.0 client.
 *
 * Supports both flows PRISM needs:
 *
 *   2-legged (client_credentials)
 *     Server-to-server. Used for Model Derivative jobs against buckets we own.
 *     No user consent required. Token has no refresh (re-fetch when expired).
 *
 *   3-legged (authorization_code + PKCE)
 *     Required to access a user's Fusion 360 Team hub via Data Management API.
 *     Opens browser, user grants consent, callback delivers code, code is
 *     exchanged for access_token + refresh_token (14-day).
 *
 * Token persistence:
 *   On-disk JSON at `data/state/aps-tokens.json`, written atomically via
 *   `atomicWriteJson` (write-tmp + rename). On corrupt JSON → delete + force
 *   re-auth (no recovery attempt — refresh_token grants 14-day hub-read access,
 *   so a corrupt-with-partial-data file is more dangerous than starting fresh).
 *
 *   Security model: plaintext-with-user-profile-ACL. If a process can read
 *   user-profile state files, attacker already has full system access. Keytar
 *   / OS-keychain is P2 hardening (native build dep — deferred for first ship).
 *
 * Token refresh:
 *   `getAccessToken('3LO')` checks `expires_at` and auto-refreshes when within
 *   5 minutes of expiry. APS refresh-token rotation honored — the response's
 *   `refresh_token` (if present) replaces the cached one.
 *
 * Browser auto-open:
 *   Best-effort `start <url>` on Windows / `open` on macOS / `xdg-open` on
 *   Linux. Failure to spawn falls back to print-only (URL logged for the
 *   operator to copy/paste).
 *
 * @module engines/APSOAuthEngine
 */

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { URL, URLSearchParams } from "node:url";
import { atomicWriteJson } from "../utils/atomicWrite.js";
import { apiCallWithTimeout } from "../utils/apiTimeout.js";
import { generateCodeVerifier, computeCodeChallenge } from "../mcp/auth.js";
import {
  awaitOAuthCallback,
  OAuthCallbackError,
} from "../utils/loopbackOAuthServer.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const APS_AUTHORIZE_URL = "https://developer.api.autodesk.com/authentication/v2/authorize";
const APS_TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";

const DEFAULT_SCOPES_3LO = "data:read viewables:read offline_access";
const DEFAULT_SCOPES_2LO = "data:read viewables:read";

const TOKEN_REQUEST_TIMEOUT_MS = 15_000;
const BROWSER_AUTH_TIMEOUT_MS = 300_000; // 5 min for user to click "Allow"
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh when <5min from expiry
const TOKEN_CACHE_SCHEMA = "1.0.0";

// Default callback path — must match `/aps-setup` runbook and the redirect URI
// registered in the APS app.
const DEFAULT_CALLBACK_PATH = "/callback";
const DEFAULT_CALLBACK_PORT = 8765;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface APSConfig {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
  callbackPath: string;
  tokenCachePath: string; // absolute or relative-to-cwd path to aps-tokens.json
}

interface TwoLeggedToken {
  access_token: string;
  expires_at: number; // ms since epoch
  scope: string;
}

interface ThreeLeggedToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  obtained_at: number;
}

interface TokenCacheFile {
  schemaVersion: string;
  twoLegged?: TwoLeggedToken;
  threeLegged?: ThreeLeggedToken;
}

export interface APSStatus {
  /** Whether config is loaded (env vars present). */
  configured: boolean;
  /** Has a non-expired 2-legged token. */
  authenticated2LO: boolean;
  /** Has a non-expired 3-legged token OR a refresh token. */
  authenticated3LO: boolean;
  /** Seconds until 2LO token expires (negative = expired, undefined = none). */
  expiresIn2LO?: number;
  /** Seconds until 3LO access_token expires (negative = expired, undefined = none). */
  expiresIn3LO?: number;
  /** 3LO scope, if any. */
  scope3LO?: string;
  /** ISO timestamp of last successful 3LO grant. */
  obtained3LOAt?: string;
  /** Configured callback URL the APS app must use as redirect URI. */
  redirectUri?: string;
}

export type APSAuthMode = "2LO" | "3LO";

export class APSAuthError extends Error {
  public readonly code: string;
  public readonly detail: string | undefined;
  constructor(code: string, message: string, detail?: string) {
    super(message);
    this.name = "APSAuthError";
    this.code = code;
    this.detail = detail;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load APS config from environment variables. Throws APSAuthError if any
 * required variable is missing (R12 — fail loud rather than mysteriously
 * fail at the first network call).
 */
function loadConfigFromEnv(): APSConfig {
  const clientId = process.env.APS_CLIENT_ID;
  const clientSecret = process.env.APS_CLIENT_SECRET;
  if (!clientId) {
    throw new APSAuthError("missing-config", "APS_CLIENT_ID not set in environment (.env)");
  }
  if (!clientSecret) {
    throw new APSAuthError("missing-config", "APS_CLIENT_SECRET not set in environment (.env)");
  }
  const portRaw = process.env.APS_CALLBACK_PORT;
  const port = portRaw ? parseInt(portRaw, 10) : DEFAULT_CALLBACK_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new APSAuthError("missing-config", `APS_CALLBACK_PORT invalid: ${portRaw}`);
  }
  const cachePathRaw = process.env.APS_TOKEN_CACHE_PATH ?? "mcp-server/data/state/aps-tokens.json";
  const cachePath = isAbsolute(cachePathRaw) ? cachePathRaw : join(process.cwd(), cachePathRaw);
  return {
    clientId,
    clientSecret,
    callbackPort: port,
    callbackPath: DEFAULT_CALLBACK_PATH,
    tokenCachePath: cachePath,
  };
}

/** Spawn the OS default-browser handler. Best-effort; failure is non-fatal. */
function openBrowser(url: string): { spawned: boolean; method: string } {
  try {
    if (process.platform === "win32") {
      // `start "" "<url>"` — empty title prevents start from treating the URL as a window title.
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
      return { spawned: true, method: "win32:start" };
    }
    if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
      return { spawned: true, method: "darwin:open" };
    }
    // Assume Linux / other Unix
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    return { spawned: true, method: "linux:xdg-open" };
  } catch {
    return { spawned: false, method: "spawn-failed" };
  }
}

/** Generate a cryptographically random state token for CSRF defense. */
function generateState(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Build the APS authorize URL for 3LO. Caller supplies clientId, redirect URI,
 * scope, state, and code_challenge.
 */
function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL(APS_AUTHORIZE_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("scope", params.scope);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

/** Format APS error JSON into a single human-readable string. */
function formatAPSError(json: unknown): string {
  if (typeof json !== "object" || json === null) return String(json);
  const o = json as Record<string, unknown>;
  const code = typeof o.error === "string" ? o.error : "unknown_error";
  const desc = typeof o.errorMessage === "string" ? o.errorMessage : typeof o.error_description === "string" ? o.error_description : "";
  return desc ? `${code}: ${desc}` : code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class APSOAuthEngine {
  private config: APSConfig | null = null;
  private cache: TokenCacheFile = { schemaVersion: TOKEN_CACHE_SCHEMA };
  private cacheLoaded = false;

  /** Reset internal state — primarily for tests. */
  public reset(): void {
    this.config = null;
    this.cache = { schemaVersion: TOKEN_CACHE_SCHEMA };
    this.cacheLoaded = false;
  }

  /**
   * Load (lazy) config from env. Idempotent — repeat calls are no-ops once
   * config is loaded. Throws APSAuthError if env vars missing.
   */
  public ensureConfig(): APSConfig {
    if (this.config) return this.config;
    this.config = loadConfigFromEnv();
    return this.config;
  }

  /** Inject an explicit config (tests). Overrides env. */
  public setConfig(config: APSConfig): void {
    this.config = config;
  }

  /**
   * Load the token cache from disk. Corrupt JSON → delete + start clean.
   * Missing file → empty cache. Idempotent — subsequent calls reload from disk.
   */
  public async loadCache(): Promise<void> {
    const config = this.ensureConfig();
    try {
      const raw = await fs.readFile(config.tokenCachePath, "utf8");
      const parsed = JSON.parse(raw) as TokenCacheFile;
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("not an object");
      }
      // Schema-version mismatch → treat as fresh-start (forward-only).
      if (parsed.schemaVersion !== TOKEN_CACHE_SCHEMA) {
        this.cache = { schemaVersion: TOKEN_CACHE_SCHEMA };
      } else {
        this.cache = parsed;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        // No cache yet — fresh state.
        this.cache = { schemaVersion: TOKEN_CACHE_SCHEMA };
      } else {
        // Corrupt or unreadable → delete + start clean. Never recover partial.
        try {
          await fs.unlink(config.tokenCachePath);
        } catch {
          // best effort
        }
        this.cache = { schemaVersion: TOKEN_CACHE_SCHEMA };
      }
    }
    this.cacheLoaded = true;
  }

  /** Persist cache to disk atomically. */
  private async saveCache(): Promise<void> {
    const config = this.ensureConfig();
    await fs.mkdir(dirname(config.tokenCachePath), { recursive: true });
    await atomicWriteJson(config.tokenCachePath, this.cache);
  }

  /** Ensure cache has been loaded once this process lifetime. */
  private async ensureCacheLoaded(): Promise<void> {
    if (!this.cacheLoaded) await this.loadCache();
  }

  /** Status summary — never returns the token itself. */
  public async getStatus(): Promise<APSStatus> {
    let configured = false;
    let redirectUri: string | undefined;
    try {
      const cfg = this.ensureConfig();
      configured = true;
      redirectUri = `http://127.0.0.1:${cfg.callbackPort}${cfg.callbackPath}`;
    } catch {
      configured = false;
    }
    if (!configured) {
      return { configured: false, authenticated2LO: false, authenticated3LO: false };
    }
    await this.ensureCacheLoaded();
    const now = Date.now();
    const t2 = this.cache.twoLegged;
    const t3 = this.cache.threeLegged;
    const status: APSStatus = {
      configured: true,
      authenticated2LO: !!t2 && t2.expires_at > now,
      authenticated3LO: !!t3 && (t3.expires_at > now || !!t3.refresh_token),
      redirectUri,
    };
    if (t2) status.expiresIn2LO = Math.floor((t2.expires_at - now) / 1000);
    if (t3) {
      status.expiresIn3LO = Math.floor((t3.expires_at - now) / 1000);
      status.scope3LO = t3.scope;
      status.obtained3LOAt = new Date(t3.obtained_at).toISOString();
    }
    return status;
  }

  /**
   * Acquire a 2-legged (client_credentials) access token. Caches it.
   * @param scopes - space-separated scope string. Default "data:read viewables:read".
   */
  public async begin2LO(opts?: { scopes?: string }): Promise<void> {
    const config = this.ensureConfig();
    await this.ensureCacheLoaded();
    const scope = opts?.scopes ?? DEFAULT_SCOPES_2LO;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    });
    const token = await this.requestToken(body, config);
    this.cache.twoLegged = {
      access_token: token.access_token,
      expires_at: Date.now() + token.expires_in * 1000,
      scope: token.scope ?? scope,
    };
    await this.saveCache();
  }

  /**
   * 3-legged auth: build authorize URL → open browser → wait for callback →
   * exchange code for tokens → persist.
   *
   * @param opts.scopes - default "data:read viewables:read offline_access"
   *                     (offline_access is required to receive a refresh token).
   * @param opts.openBrowser - if false, only prints the URL. Default true.
   * @returns object with `obtained` = "access" | "refresh" indicating what we got
   */
  public async begin3LO(opts?: { scopes?: string; openBrowser?: boolean }): Promise<{ obtained: "access" | "refresh" }> {
    const config = this.ensureConfig();
    await this.ensureCacheLoaded();
    const scope = opts?.scopes ?? DEFAULT_SCOPES_3LO;
    const shouldOpen = opts?.openBrowser ?? true;

    const codeVerifier = generateCodeVerifier(64);
    const codeChallenge = computeCodeChallenge(codeVerifier);
    const state = generateState();
    const redirectUri = `http://127.0.0.1:${config.callbackPort}${config.callbackPath}`;
    const authUrl = buildAuthorizeUrl({
      clientId: config.clientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
    });

    // Print URL unconditionally — operator may want to copy/paste even if browser opens.
    // eslint-disable-next-line no-console
    console.log(`[APS] Open this URL to authorize:\n  ${authUrl}`);

    let browserHint = "URL not opened automatically (printed above)";
    if (shouldOpen) {
      const open = openBrowser(authUrl);
      browserHint = open.spawned ? `Browser opened via ${open.method}` : "Browser open failed — copy URL above";
      // eslint-disable-next-line no-console
      console.log(`[APS] ${browserHint}`);
    }

    // Start loopback server and wait for callback. This blocks until the user
    // clicks "Allow" in the browser (or until BROWSER_AUTH_TIMEOUT_MS elapses).
    let code: string;
    try {
      const cb = await awaitOAuthCallback({
        port: config.callbackPort,
        path: config.callbackPath,
        expectedState: state,
        timeoutMs: BROWSER_AUTH_TIMEOUT_MS,
      });
      code = cb.code;
    } catch (e) {
      if (e instanceof OAuthCallbackError) {
        throw new APSAuthError("callback-failed", `3LO callback failed: ${e.reason}`, e.message);
      }
      throw e;
    }

    // Exchange code for tokens.
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    const token = await this.requestToken(body, config);

    if (!token.refresh_token && scope.includes("offline_access")) {
      // R12 — APS returned no refresh token despite our offline_access request.
      // Continue (access token works) but warn — app config may be wrong.
      // eslint-disable-next-line no-console
      console.warn("[APS] WARNING: requested offline_access but received no refresh_token");
    }

    this.cache.threeLegged = {
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? "",
      expires_at: Date.now() + token.expires_in * 1000,
      scope: token.scope ?? scope,
      obtained_at: Date.now(),
    };
    await this.saveCache();
    return { obtained: token.refresh_token ? "refresh" : "access" };
  }

  /** Refresh the 3-legged access token using the stored refresh_token. */
  public async refresh3LO(): Promise<void> {
    const config = this.ensureConfig();
    await this.ensureCacheLoaded();
    const t3 = this.cache.threeLegged;
    if (!t3 || !t3.refresh_token) {
      throw new APSAuthError("no-refresh-token", "no refresh_token available — run begin3LO() first");
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: t3.refresh_token,
      scope: t3.scope,
    });
    const token = await this.requestToken(body, config);
    this.cache.threeLegged = {
      access_token: token.access_token,
      // APS may rotate refresh tokens; prefer the new one if present.
      refresh_token: token.refresh_token ?? t3.refresh_token,
      expires_at: Date.now() + token.expires_in * 1000,
      scope: token.scope ?? t3.scope,
      obtained_at: t3.obtained_at, // preserve original obtained_at — refresh isn't a new grant
    };
    await this.saveCache();
  }

  /**
   * Return a valid access token for the requested flow. Auto-refreshes 3LO
   * when within REFRESH_THRESHOLD_MS of expiry. Throws if no token is
   * available (caller must run begin2LO/begin3LO first).
   */
  public async getAccessToken(mode: APSAuthMode): Promise<string> {
    await this.ensureCacheLoaded();
    const now = Date.now();
    if (mode === "2LO") {
      const t = this.cache.twoLegged;
      if (!t) {
        throw new APSAuthError("not-authenticated", "no 2LO token cached — run begin2LO() first");
      }
      // 2LO has no refresh — if expired, the caller must explicitly re-acquire.
      // (Auto-refetch is safe but masks misconfiguration; require explicit action.)
      if (t.expires_at <= now) {
        throw new APSAuthError("token-expired", "2LO token expired — call begin2LO() to re-acquire");
      }
      return t.access_token;
    }
    // 3LO
    const t = this.cache.threeLegged;
    if (!t) {
      throw new APSAuthError("not-authenticated", "no 3LO token cached — run begin3LO() first");
    }
    if (t.expires_at - now < REFRESH_THRESHOLD_MS) {
      if (!t.refresh_token) {
        throw new APSAuthError(
          "token-expired",
          "3LO access token near/past expiry and no refresh_token — re-run begin3LO()",
        );
      }
      await this.refresh3LO();
    }
    // Re-read after potential refresh
    const fresh = this.cache.threeLegged;
    if (!fresh) {
      throw new APSAuthError("internal", "3LO cache vanished after refresh — should not happen");
    }
    return fresh.access_token;
  }

  /** Clear cached tokens (logout). Removes the disk cache file. */
  public async clearCache(): Promise<void> {
    const config = this.ensureConfig();
    this.cache = { schemaVersion: TOKEN_CACHE_SCHEMA };
    this.cacheLoaded = true;
    try {
      await fs.unlink(config.tokenCachePath);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw err;
    }
  }

  /**
   * POST the token endpoint with the given grant params, return the parsed
   * response. Handles non-2xx by throwing APSAuthError with the APS error
   * code surfaced.
   */
  private async requestToken(
    body: URLSearchParams,
    config: APSConfig,
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }> {
    // APS supports both Basic-auth (client_secret in header) AND
    // client_secret in form body. Basic-auth is the documented best practice.
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    return apiCallWithTimeout(
      async (signal) => {
        const res = await fetch(APS_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: body.toString(),
          signal,
        });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new APSAuthError(
            "non-json-response",
            `APS token endpoint returned non-JSON (status ${res.status})`,
            text.slice(0, 200),
          );
        }
        if (!res.ok) {
          throw new APSAuthError(
            "token-request-failed",
            `APS token request failed (status ${res.status}): ${formatAPSError(parsed)}`,
            text.slice(0, 500),
          );
        }
        const obj = parsed as Record<string, unknown>;
        const accessToken = obj.access_token;
        const expiresIn = obj.expires_in;
        if (typeof accessToken !== "string" || typeof expiresIn !== "number") {
          throw new APSAuthError(
            "malformed-token-response",
            "APS token response missing access_token or expires_in",
            text.slice(0, 500),
          );
        }
        return {
          access_token: accessToken,
          refresh_token: typeof obj.refresh_token === "string" ? obj.refresh_token : undefined,
          expires_in: expiresIn,
          scope: typeof obj.scope === "string" ? obj.scope : undefined,
        };
      },
      TOKEN_REQUEST_TIMEOUT_MS,
      "APS:token",
    );
  }
}

// Singleton — matches PRISM engine convention.
export const apsOAuthEngine = new APSOAuthEngine();
