/**
 * loopbackOAuthServer — one-shot HTTP server that receives an OAuth 2.0
 * authorization-code callback on 127.0.0.1, validates state, and shuts down.
 *
 * Used by 3-legged OAuth flows (e.g. APS authorization_code + PKCE) where the
 * authorization server redirects the user's browser back to a loopback URL.
 *
 * Lifecycle:
 *   1. Caller invokes `awaitOAuthCallback({ port, expectedState, timeoutMs })`
 *   2. This starts a single-use HTTP server on 127.0.0.1:<port>
 *   3. Browser hits `GET /callback?code=...&state=...`
 *   4. Server validates state matches `expectedState` (CSRF defense)
 *   5. On success: returns the code; closes the server
 *   6. On error / state-mismatch / timeout / abort: throws; closes the server
 *
 * Single-use by design — the server accepts ONE callback then shuts down.
 * Concurrent OAuth flows must use different ports.
 *
 * Security:
 *   - Bind 127.0.0.1 only (NOT 0.0.0.0) — refuses cross-machine requests
 *   - State parameter is the CSRF token; mismatch → reject with 400 + log
 *   - The OAuth code itself is single-use, short-lived (~5min) per RFC 6749;
 *     even so, never log the code at info level (use debug if needed)
 *
 * @module utils/loopbackOAuthServer
 */

import * as http from "node:http";
import { URL } from "node:url";

/** Options for awaitOAuthCallback. */
export interface OAuthCallbackOptions {
  /** Port to listen on (must match the registered redirect URI). */
  port: number;
  /** Expected `state` parameter value — validated for CSRF. Required. */
  expectedState: string;
  /** Hard timeout in ms before giving up. Default 300000 (5 min). */
  timeoutMs?: number;
  /** Optional AbortSignal — cancels the wait. */
  signal?: AbortSignal;
  /** Path the redirect URI uses. Default "/callback". */
  path?: string;
  /**
   * Optional host header (e.g. "127.0.0.1") used to construct the URL parser
   * base. Has no effect on bind address — we always bind 127.0.0.1.
   */
  host?: string;
}

/** Result of a successful callback: the authorization code (and echoed state for caller logging). */
export interface OAuthCallbackResult {
  code: string;
  state: string;
}

/** Failure reasons surfaced via OAuthCallbackError. */
export type OAuthCallbackFailureReason =
  | "timeout"
  | "aborted"
  | "state-mismatch"
  | "missing-code"
  | "oauth-error" // remote server returned ?error=...
  | "port-in-use"
  | "server-error";

/** Error thrown on any non-success path. Carries reason + optional details. */
export class OAuthCallbackError extends Error {
  public readonly reason: OAuthCallbackFailureReason;
  public readonly details: Record<string, string> | undefined;

  constructor(reason: OAuthCallbackFailureReason, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "OAuthCallbackError";
    this.reason = reason;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes
const DEFAULT_PATH = "/callback";
const SUCCESS_HTML = `<!doctype html>
<html><head><title>PRISM — OAuth complete</title>
<style>body{font-family:system-ui;padding:2em;text-align:center;color:#0a0}</style>
</head><body>
<h1>✓ Authorization received</h1>
<p>You can close this window. PRISM is exchanging the code for tokens.</p>
</body></html>`;

function errorHtml(reason: string, detail: string): string {
  // Escape user-influenced values to prevent reflected XSS.
  const safeReason = reason.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const safeDetail = detail.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html><head><title>PRISM — OAuth error</title>
<style>body{font-family:system-ui;padding:2em;text-align:center;color:#c00}</style>
</head><body>
<h1>✗ ${safeReason}</h1>
<p>${safeDetail}</p>
<p>Check the PRISM terminal for details. You can close this window.</p>
</body></html>`;
}

/**
 * Start a one-shot loopback OAuth callback server and resolve with the
 * authorization code when the browser hits the callback URL.
 *
 * @param options - callback parameters
 * @returns the authorization code + echoed state on success
 * @throws OAuthCallbackError on timeout, abort, state-mismatch, port-in-use,
 *         remote OAuth error, or missing code
 */
export function awaitOAuthCallback(options: OAuthCallbackOptions): Promise<OAuthCallbackResult> {
  const port = options.port;
  const expectedState = options.expectedState;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = options.signal;
  const callbackPath = options.path ?? DEFAULT_PATH;
  const host = options.host ?? "127.0.0.1";

  // Validate inputs — fail loud before binding any sockets.
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return Promise.reject(new OAuthCallbackError("server-error", `invalid port: ${port}`));
  }
  if (!expectedState || typeof expectedState !== "string") {
    return Promise.reject(new OAuthCallbackError("server-error", "expectedState is required"));
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    return Promise.reject(new OAuthCallbackError("server-error", `invalid timeoutMs: ${timeoutMs}`));
  }
  if (!callbackPath.startsWith("/")) {
    return Promise.reject(new OAuthCallbackError("server-error", `path must start with /: ${callbackPath}`));
  }

  return new Promise<OAuthCallbackResult>((resolve, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    let abortListener: (() => void) | undefined;

    const server = http.createServer((req, res) => {
      // Defensive: reject anything that isn't a GET on the callback path.
      const url = new URL(req.url ?? "/", `http://${host}:${port}`);
      if (req.method !== "GET" || url.pathname !== callbackPath) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const oauthError = url.searchParams.get("error");
      const oauthErrorDescription = url.searchParams.get("error_description");

      // OAuth server returned an explicit error (user denied, invalid_scope, etc.)
      if (oauthError) {
        const detail = oauthErrorDescription ?? oauthError;
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml(`OAuth error: ${oauthError}`, detail));
        finish(
          new OAuthCallbackError("oauth-error", `OAuth server returned error: ${oauthError}`, {
            error: oauthError,
            error_description: detail,
          }),
        );
        return;
      }

      // State mismatch — CSRF defense
      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml("State mismatch", "Possible CSRF or stale callback. Aborting."));
        finish(
          new OAuthCallbackError("state-mismatch", "callback state did not match expectedState"),
        );
        return;
      }

      // Missing code on an otherwise valid callback — protocol violation
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml("Missing code", "Authorization server returned no code parameter."));
        finish(new OAuthCallbackError("missing-code", "no code parameter in callback"));
        return;
      }

      // Success path
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(SUCCESS_HTML);
      finish(null, { code, state });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        finish(
          new OAuthCallbackError(
            "port-in-use",
            `port ${port} is already in use — close the other process or change APS_CALLBACK_PORT (and the registered redirect URI)`,
          ),
        );
      } else {
        finish(new OAuthCallbackError("server-error", err.message));
      }
    });

    // Hard timeout
    timer = setTimeout(() => {
      finish(
        new OAuthCallbackError(
          "timeout",
          `no callback received within ${timeoutMs}ms — did you complete the browser authorization?`,
        ),
      );
    }, timeoutMs);

    // Optional abort
    if (signal) {
      if (signal.aborted) {
        finish(new OAuthCallbackError("aborted", "signal was already aborted at entry"));
        return;
      }
      abortListener = () => finish(new OAuthCallbackError("aborted", "aborted via signal"));
      signal.addEventListener("abort", abortListener, { once: true });
    }

    // Bind loopback ONLY — never 0.0.0.0
    server.listen(port, "127.0.0.1");

    // Internal: settle exactly once, clean up timer + listener + server.
    function finish(err: OAuthCallbackError | null, value?: OAuthCallbackResult): void {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (signal && abortListener) {
        signal.removeEventListener("abort", abortListener);
        abortListener = undefined;
      }
      // Close the server — best-effort; existing connections finish naturally.
      try {
        server.close();
      } catch {
        // ignore close errors — we're already done
      }
      if (err) reject(err);
      else if (value) resolve(value);
      else reject(new OAuthCallbackError("server-error", "internal: finish() called with no err or value"));
    }
  });
}
