/**
 * ObsidianRestBridgeEngine — live Obsidian vault client over the Local REST API.
 * =============================================================================
 *
 * Part of the Hermes/Zulu fleet-orchestrator galaxy
 * (mcp-server/src/engines/hermes-zulu). Gives PRISM an IN-SESSION read path into
 * a *running* Obsidian vault (the "live brain"), complementing the one-way
 * Stop-time file feed (scripts/obsidian-memory-sync.mjs → H:/prism/knowledge).
 *
 * The Obsidian "Local REST API" community plugin serves the vault at
 * https://127.0.0.1:27123 (self-signed TLS) behind a bearer API key. Its GET /
 * info endpoint returns { authenticated: true|false } — "usable" means reachable
 * AND authenticated, not merely reachable.
 *
 * DESIGN — fail-soft, NOT throw. An optional external dependency that is usually
 * DOWN must never throw, hang, or burn a long timeout on the hot path (the exact
 * failure mode of the dead-Ollama hooks that spent 8s per prompt). Every method
 * returns a typed { ok, reason? } result; the failure reason is always SURFACED
 * (R12 — never silently swallowed) but never thrown. Mirrors the canonical PRISM
 * I/O-bridge pattern in scripts/ollama-prism-bridge.mjs (`mcpCallStreamable`).
 * The injected `transport` makes every method unit-testable with no live vault.
 *
 * SECURITY — this engine feeds an OUTWARD-FACING Telegram bridge on an
 * internal-only system, so it is fail-CLOSED on host:
 *  - cert verification is only relaxed for loopback hosts (the self-signed local
 *    plugin); any other host keeps full TLS verification on.
 *  - a non-loopback PRISM_OBSIDIAN_URL is REFUSED ({ ok:false, reason:
 *    "non-loopback-url" }, no socket, no bearer key sent) unless the operator
 *    explicitly opts in with PRISM_OBSIDIAN_ALLOW_REMOTE=1.
 *
 * v1 is READ-ONLY (status / read / search / activeNote). No write method exists —
 * the write surface is never reachable from the Telegram bridge.
 *
 * Knobs:
 *   PRISM_OBSIDIAN_URL           base URL (default https://127.0.0.1:27123)
 *   PRISM_OBSIDIAN_API_KEY       bearer key; absent => fall back to reading the
 *                                Local REST API plugin's own data.json (below);
 *                                neither present => { ok:false, reason:"no-key" }
 *                                with NO socket opened.
 *   PRISM_OBSIDIAN_VAULT         vault root for the plugin-config fallback
 *                                (default H:/prism/knowledge).
 *   PRISM_OBSIDIAN_ALLOW_REMOTE  "1" to permit a non-loopback URL (off by default).
 *
 * KEY FALLBACK (U-OBS-KEY-PLUGIN-FALLBACK, slot:zulu 2026-06-10): the env-var-only
 * key resolution silently failed under the SYSTEM-run "PRISM MCP Server" scheduled
 * task -- the supervised child never saw mcp-server/.env (dotenv is cwd-relative and
 * the SYSTEM launch context differs from user-context launches; a user-context
 * instance with identical spawn shape authenticated fine while the SYSTEM child
 * returned no-key all night). The plugin's own config at
 * <vault>/.obsidian/plugins/obsidian-local-rest-api/data.json carries the SAME
 * apiKey the plugin serves with -- it IS the single source of truth, so read it
 * directly when the env var is absent. Env var (when set) still wins, preserving
 * operator override. Cached with a short TTL; fail-soft "" on any read error
 * (engine then surfaces reason:"no-key" exactly as before -- never throws).
 */
import { z } from "zod";
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_URL = "https://127.0.0.1:27123";
const PROBE_TIMEOUT_MS = 2000; // health probe — short, hot-path
const CALL_TIMEOUT_MS = 4000; // read/search — slightly longer
const HEALTH_TTL_MS = 10_000; // cache the reachable/authenticated verdict
const MAX_RESULT_CHARS = 8 * 1024; // cap raw note bodies (mirror MCP_RESULT_MAX_CHARS)
const MAX_SEARCH_HITS = 25;

export interface ObsidianResult<T = string> {
  ok: boolean;
  /** Surfaced failure reason (never thrown). undefined on success. */
  reason?: string;
  /** HTTP status when a response actually came back. */
  status?: number;
  data?: T;
}

export interface RawResponse {
  status: number;
  text: string;
}

/**
 * Injectable transport. Real callers use the default node-http(s) implementation;
 * tests pass a fake so every path runs with no live vault. The optional `body` +
 * `contentType` carry a request payload for the control surface (PUT/POST/DELETE
 * writes + command exec, ObsidianControlBridgeEngine); read methods omit them.
 */
export type ObsidianTransport = (args: {
  method: string;
  url: string;
  path: string;
  apiKey: string;
  accept?: string;
  timeoutMs: number;
  body?: string;
  contentType?: string;
}) => Promise<RawResponse>;

const ReadPathSchema = z.string().min(1).max(1024);
const QuerySchema = z.string().min(1).max(512);

function baseUrl(): string {
  return process.env.PRISM_OBSIDIAN_URL || DEFAULT_URL;
}

/** Plugin-config key fallback cache (see KEY FALLBACK header note). */
const PLUGIN_KEY_TTL_MS = 60_000;
let _pluginKeyCache: { ts: number; key: string } = { ts: 0, key: "" };

/**
 * Read the Local REST API plugin's own apiKey from the vault's plugin config.
 * Fail-soft: any miss (no vault, no plugin, malformed JSON, non-string key)
 * returns "" so the caller surfaces the existing reason:"no-key" path.
 * Exported for tests (cache injectable via _resetPluginKeyCache).
 */
export function readPluginApiKey(
  vaultRoot = process.env.PRISM_OBSIDIAN_VAULT || "H:/prism/knowledge",
  readImpl: (p: string) => string = (p) => readFileSync(p, "utf8"),
  now: () => number = Date.now,
): string {
  const t = now();
  if (t - _pluginKeyCache.ts < PLUGIN_KEY_TTL_MS) return _pluginKeyCache.key;
  let key = "";
  try {
    const raw = readImpl(join(vaultRoot, ".obsidian/plugins/obsidian-local-rest-api/data.json"));
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
      key = parsed.apiKey.trim();
    }
  } catch {
    key = ""; // fail-soft -- engine reports no-key, never throws (header contract)
  }
  _pluginKeyCache = { ts: t, key };
  return key;
}

/** Test hook: clear the plugin-key cache so TTL behavior is assertable. */
export function _resetPluginKeyCache(): void {
  _pluginKeyCache = { ts: 0, key: "" };
}

function apiKey(): string {
  return process.env.PRISM_OBSIDIAN_API_KEY || readPluginApiKey();
}
/**
 * Default-DENY capability gate for the CONTROL surface (writes + command exec).
 * The read engine is consumed by the OUTWARD-FACING Telegram bridge, which must
 * NEVER mutate the vault or run a command -- so the entire control surface is OFF
 * unless the operator explicitly opts in IN-PROCESS with PRISM_OBSIDIAN_WRITE=1.
 * The Telegram bridge never sets it, so a mutation is impossible from that path
 * (defense in depth: the bridge also only calls the read engine's read methods).
 */
function writeAllowed(): boolean {
  return process.env.PRISM_OBSIDIAN_WRITE === "1";
}
function cap(s: string): string {
  return s.length > MAX_RESULT_CHARS ? s.slice(0, MAX_RESULT_CHARS) + "\n…[truncated]" : s;
}
/**
 * Loopback hosts whose self-signed cert is expected and safe to accept.
 * The 127.0.0.0/8 arm matches ONLY a strict dotted-quad — NOT a `127.`-prefixed
 * FQDN like "127.0.0.1.evil.com" (a publicly-resolvable foreign host that DNS
 * would send off-box). A prefix test there would reopen the bearer-key exfil
 * vector this engine is fail-closed against.
 */
function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "localhost") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  return octets[0] === 127 && octets.every((n) => n <= 255);
}
/**
 * Resolve + authorize the base URL. Fail-CLOSED: a non-loopback URL is refused
 * (no socket, no key sent) unless PRISM_OBSIDIAN_ALLOW_REMOTE=1. This is the
 * single choke point that bounds host-injection / SSRF / MITM concerns.
 */
function urlAllowed(): { ok: true; url: string } | { ok: false; reason: string } {
  const url = baseUrl();
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, reason: "bad-url" };
  }
  if (!isLoopbackHost(host) && process.env.PRISM_OBSIDIAN_ALLOW_REMOTE !== "1") {
    return { ok: false, reason: "non-loopback-url" };
  }
  return { ok: true, url };
}
/** Reject path traversal / absolute / scheme — defensive even though v1 is read-only. */
function safeVaultPath(p: string): boolean {
  if (p.includes("..")) return false;
  if (p.startsWith("/") || p.startsWith("\\")) return false;
  if (/^[a-z]+:\/\//i.test(p)) return false;
  return true;
}

/**
 * Default transport: node http(s), timeout enforced via req.destroy. Cert
 * verification is relaxed ONLY for loopback hosts (the self-signed local plugin);
 * any other host keeps full TLS verification on. Rejects on network error /
 * timeout so the caller's try/catch surfaces a structured reason.
 */
const defaultTransport: ObsidianTransport = ({ method, url, path, apiKey, accept, timeoutMs, body, contentType }) =>
  new Promise<RawResponse>((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(path, url);
    } catch {
      reject(new Error("bad-url"));
      return;
    }
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;
    const hasBody = typeof body === "string";
    const req = lib.request(
      u,
      {
        method,
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(accept ? { Accept: accept } : {}),
          // Content headers only on a write body (PUT/POST/PATCH from the control surface).
          ...(hasBody ? { "Content-Type": contentType || "text/markdown", "Content-Length": Buffer.byteLength(body) } : {}),
        },
        // Relax cert verification ONLY for the loopback self-signed plugin cert.
        ...(isHttps ? { rejectUnauthorized: !isLoopbackHost(u.hostname) } : {}),
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => {
          if (text.length < MAX_RESULT_CHARS * 2) text += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, text }));
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("AbortTimeout"));
    });
    req.on("error", (e) => reject(e));
    if (hasBody) req.write(body);
    req.end();
  });

function failReason(e: unknown, timeoutMs: number): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg === "AbortTimeout" ? `timeout-${timeoutMs}ms` : `unreachable: ${msg}`;
}

interface ProbeResult {
  reachable: boolean;
  authenticated: boolean;
  status?: number;
  reason?: string;
}

export class ObsidianRestBridgeEngine {
  /** Module-static health verdict cache, keyed on the URL it was probed against. */
  private static health: { at: number; url: string; reachable: boolean; authenticated: boolean } | null = null;

  /**
   * GET / and classify: reachable = HTTP 200..499 (server is up), authenticated =
   * a 2xx body with { authenticated:true }. Assumes the caller already passed the
   * no-key + url-allowed gates. Never throws.
   */
  private static async probe(url: string, transport: ObsidianTransport): Promise<ProbeResult> {
    try {
      const res = await transport({
        method: "GET",
        url,
        path: "/",
        apiKey: apiKey(),
        accept: "application/json",
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      const reachable = res.status >= 200 && res.status < 500;
      let authenticated = false;
      if (res.status >= 200 && res.status < 300) {
        try {
          authenticated = (JSON.parse(res.text) as { authenticated?: unknown })?.authenticated === true;
        } catch {
          authenticated = false;
        }
      }
      return { reachable, authenticated, status: res.status };
    } catch (e) {
      return { reachable: false, authenticated: false, reason: failReason(e, PROBE_TIMEOUT_MS) };
    }
  }

  /**
   * Is the vault reachable AND authenticated (i.e. usable for reads)?
   * Returns false IMMEDIATELY (no socket, no timeout burned) when no API key is
   * configured or the URL is non-loopback (and remote not opted in). Caches the
   * verdict for HEALTH_TTL_MS, keyed on the probed URL.
   *
   * @param transport injected for tests; defaults to node http(s)
   */
  static async isLive(transport: ObsidianTransport = defaultTransport): Promise<boolean> {
    if (!apiKey()) return false;
    const ua = urlAllowed();
    if (!ua.ok) return false;
    const now = Date.now();
    if (this.health && this.health.url === ua.url && now - this.health.at < HEALTH_TTL_MS) {
      return this.health.reachable && this.health.authenticated;
    }
    const p = await this.probe(ua.url, transport);
    this.health = { at: now, url: ua.url, reachable: p.reachable, authenticated: p.authenticated };
    return p.reachable && p.authenticated;
  }

  /**
   * Structured status for the `prism_session:obsidian_status` action.
   * `ok` means USABLE (reachable AND authenticated); `data.live` is mere
   * reachability; a reachable-but-unauthenticated vault reports reason
   * "unauthorized". Never throws.
   */
  static async status(
    transport: ObsidianTransport = defaultTransport,
  ): Promise<ObsidianResult<{ live: boolean; authenticated: boolean; url: string }>> {
    if (!apiKey()) return { ok: false, reason: "no-key", data: { live: false, authenticated: false, url: baseUrl() } };
    const ua = urlAllowed();
    if (!ua.ok) return { ok: false, reason: ua.reason, data: { live: false, authenticated: false, url: baseUrl() } };
    const p = await this.probe(ua.url, transport);
    this.health = { at: Date.now(), url: ua.url, reachable: p.reachable, authenticated: p.authenticated };
    const ok = p.reachable && p.authenticated;
    const reason = !p.reachable ? (p.reason ?? `http-${p.status}`) : p.authenticated ? undefined : "unauthorized";
    return { ok, status: p.status, reason, data: { live: p.reachable, authenticated: p.authenticated, url: ua.url } };
  }

  /**
   * Read a vault note (GET /vault/{path}). Read-only; path traversal rejected.
   * @param notePath vault-relative path, e.g. "memories/reference/foo.md"
   */
  static async read(notePath: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<string>> {
    if (!ReadPathSchema.safeParse(notePath).success) return { ok: false, reason: "invalid-path" };
    if (!safeVaultPath(notePath)) return { ok: false, reason: "unsafe-path" };
    if (!apiKey()) return { ok: false, reason: "no-key" };
    const ua = urlAllowed();
    if (!ua.ok) return { ok: false, reason: ua.reason };
    try {
      const enc = notePath.split("/").map(encodeURIComponent).join("/");
      const res = await transport({
        method: "GET",
        url: ua.url,
        path: `/vault/${enc}`,
        apiKey: apiKey(),
        accept: "text/markdown",
        timeoutMs: CALL_TIMEOUT_MS,
      });
      if (res.status === 404) return { ok: false, status: 404, reason: "not-found" };
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status, data: cap(res.text) };
    } catch (e) {
      return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) };
    }
  }

  /**
   * Simple full-text search of the LIVE vault (POST /search/simple/?query=).
   * Scoped to the running vault only — does NOT re-index the static
   * knowledge/memories tree (the ollama-prism-bridge already covers that).
   */
  static async search(
    query: string,
    transport: ObsidianTransport = defaultTransport,
  ): Promise<ObsidianResult<Array<{ filename: string; score?: number }>>> {
    if (!QuerySchema.safeParse(query).success) return { ok: false, reason: "invalid-query" };
    if (!apiKey()) return { ok: false, reason: "no-key" };
    const ua = urlAllowed();
    if (!ua.ok) return { ok: false, reason: ua.reason };
    try {
      const res = await transport({
        method: "POST",
        url: ua.url,
        path: `/search/simple/?query=${encodeURIComponent(query)}`,
        apiKey: apiKey(),
        accept: "application/json",
        timeoutMs: CALL_TIMEOUT_MS,
      });
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      let arr: unknown;
      try {
        arr = JSON.parse(res.text);
      } catch {
        return { ok: false, reason: "bad-json" };
      }
      const toHit = (h: unknown): { filename: string; score?: number } => {
        const o = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
        return {
          filename: String(o.filename ?? ""),
          score: typeof o.score === "number" ? o.score : undefined,
        };
      };
      const hits = Array.isArray(arr) ? arr.slice(0, MAX_SEARCH_HITS).map(toHit) : [];
      return { ok: true, status: res.status, data: hits };
    } catch (e) {
      return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) };
    }
  }

  /**
   * The note the operator currently has open in Obsidian (GET /active/).
   * Useful context for the Zulu orchestrator's live-brain read.
   */
  static async activeNote(transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<string>> {
    if (!apiKey()) return { ok: false, reason: "no-key" };
    const ua = urlAllowed();
    if (!ua.ok) return { ok: false, reason: ua.reason };
    try {
      const res = await transport({
        method: "GET",
        url: ua.url,
        path: "/active/",
        apiKey: apiKey(),
        accept: "text/markdown",
        timeoutMs: CALL_TIMEOUT_MS,
      });
      if (res.status === 404) return { ok: false, status: 404, reason: "no-active-note" };
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status, data: cap(res.text) };
    } catch (e) {
      return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) };
    }
  }

  /** Test-only: clear the module-static health cache between cases. */
  static _resetHealthCache(): void {
    this.health = null;
  }
}

// ===========================================================================
// CONTROL SURFACE -- the live "every button and function" client.
// ===========================================================================
/**
 * ObsidianControlBridgeEngine -- the WRITE + COMMAND-EXEC surface over the same
 * Local REST API the read engine uses. Kept a SEPARATE class (not added to the
 * read engine) so `ObsidianRestBridgeEngine` stays provably read-only for its
 * outward-facing Telegram consumer; this class is the in-session control path.
 *
 * Every MUTATING method (runCommand / create / append / deleteNote / open) is
 * behind `writeAllowed()` (PRISM_OBSIDIAN_WRITE=1, default OFF) AND the same
 * fail-closed gates as the read engine (loopback-only URL, api key required,
 * vault path traversal rejected) -- all of which short-circuit with NO socket
 * opened. Pure-read helpers (listCommands / list / periodic) are NOT write-gated.
 *
 * The plugin endpoints wrapped:
 *   GET  /commands/            -> listCommands  (enumerate every command/button)
 *   POST /commands/{id}/       -> runCommand    (execute any command/button)
 *   GET  /vault/{dir}/         -> list          (browse a folder)
 *   PUT  /vault/{path}         -> create        (create or overwrite a note)
 *   POST /vault/{path}         -> append        (append to a note)
 *   DELETE /vault/{path}       -> deleteNote    (delete a note)
 *   POST /open/{path}          -> open          (open a note in the GUI)
 *   GET  /periodic/{period}/   -> periodic      (read the current daily/periodic note)
 *
 * NOT YET wrapped: PATCH /vault (heading/block-targeted insert) needs per-request
 * Operation/Target headers the shared transport does not carry -- a documented
 * future addition, not a silent gap. LIVE-VALIDATION is deferred: the Obsidian GUI
 * must be running with the plugin enabled (:27123) to exercise these for real;
 * the unit tests prove request shaping + the gates with an injected transport.
 */
export type ObsidianCommand = { id: string; name: string };

const PERIODS = new Set(["daily", "weekly", "monthly", "quarterly", "yearly"]);

export class ObsidianControlBridgeEngine {
  /** Encode a vault-relative path segment-by-segment (preserve the `/` separators). */
  private static encPath(p: string): string {
    return p.split("/").map(encodeURIComponent).join("/");
  }

  /** Shared pre-flight for a READ control call: key + url gates (no write gate). */
  private static readGate(): { ok: true; url: string } | { ok: false; reason: string } {
    if (!apiKey()) return { ok: false, reason: "no-key" };
    const ua = urlAllowed();
    if (!ua.ok) return { ok: false, reason: ua.reason };
    return { ok: true, url: ua.url };
  }

  /** Shared pre-flight for a WRITE/COMMAND call: write-gate FIRST, then key + url. */
  private static writeGate(): { ok: true; url: string } | { ok: false; reason: string } {
    if (!writeAllowed()) return { ok: false, reason: "write-disabled" };
    return this.readGate();
  }

  /** GET /commands/ -> the full command palette (id + display name). Read-only. */
  static async listCommands(transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<ObsidianCommand[]>> {
    const g = this.readGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method: "GET", url: g.url, path: "/commands/", apiKey: apiKey(), accept: "application/json", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      let parsed: unknown;
      try { parsed = JSON.parse(res.text); } catch { return { ok: false, reason: "bad-json" }; }
      const raw = (parsed && typeof parsed === "object" && Array.isArray((parsed as { commands?: unknown }).commands))
        ? (parsed as { commands: unknown[] }).commands
        : [];
      const cmds = raw.slice(0, 2000).map((c): ObsidianCommand => {
        const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        return { id: String(o.id ?? ""), name: String(o.name ?? "") };
      }).filter((c) => c.id);
      return { ok: true, status: res.status, data: cmds };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** POST /commands/{id}/ -> execute any Obsidian command/button. WRITE-gated. */
  static async runCommand(commandId: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<void>> {
    if (typeof commandId !== "string" || !/^[\w.:-]{1,128}$/.test(commandId)) return { ok: false, reason: "invalid-command-id" };
    const g = this.writeGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method: "POST", url: g.url, path: `/commands/${encodeURIComponent(commandId)}/`, apiKey: apiKey(), accept: "application/json", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** GET /vault/{dir}/ -> list the files in a vault folder. Read-only. */
  static async list(dir: string = "", transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<string[]>> {
    if (dir && !safeVaultPath(dir)) return { ok: false, reason: "unsafe-path" };
    const g = this.readGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const clean = dir.replace(/^\/+|\/+$/g, "");
      const path = clean ? `/vault/${this.encPath(clean)}/` : "/vault/";
      const res = await transport({ method: "GET", url: g.url, path, apiKey: apiKey(), accept: "application/json", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status === 404) return { ok: false, status: 404, reason: "not-found" };
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      let parsed: unknown;
      try { parsed = JSON.parse(res.text); } catch { return { ok: false, reason: "bad-json" }; }
      const files = (parsed && typeof parsed === "object" && Array.isArray((parsed as { files?: unknown }).files))
        ? (parsed as { files: unknown[] }).files.map((f) => String(f)).slice(0, 1000)
        : [];
      return { ok: true, status: res.status, data: files };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** PUT /vault/{path} -> create or overwrite a note. WRITE-gated. */
  static async create(notePath: string, content: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<void>> {
    return this.writeBody("PUT", notePath, content, transport);
  }

  /** POST /vault/{path} -> append to a note. WRITE-gated. */
  static async append(notePath: string, content: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<void>> {
    return this.writeBody("POST", notePath, content, transport);
  }

  /** Shared PUT/POST body write with the full gate chain. */
  private static async writeBody(method: "PUT" | "POST", notePath: string, content: string, transport: ObsidianTransport): Promise<ObsidianResult<void>> {
    if (!ReadPathSchema.safeParse(notePath).success) return { ok: false, reason: "invalid-path" };
    if (!safeVaultPath(notePath)) return { ok: false, reason: "unsafe-path" };
    if (typeof content !== "string") return { ok: false, reason: "invalid-content" };
    const g = this.writeGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method, url: g.url, path: `/vault/${this.encPath(notePath)}`, apiKey: apiKey(), accept: "application/json", contentType: "text/markdown", body: content, timeoutMs: CALL_TIMEOUT_MS });
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** DELETE /vault/{path} -> delete a note. WRITE-gated. */
  static async deleteNote(notePath: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<void>> {
    if (!ReadPathSchema.safeParse(notePath).success) return { ok: false, reason: "invalid-path" };
    if (!safeVaultPath(notePath)) return { ok: false, reason: "unsafe-path" };
    const g = this.writeGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method: "DELETE", url: g.url, path: `/vault/${this.encPath(notePath)}`, apiKey: apiKey(), accept: "application/json", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status === 404) return { ok: false, status: 404, reason: "not-found" };
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** POST /open/{path} -> open a note in the running Obsidian GUI. WRITE-gated (GUI state). */
  static async open(notePath: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<void>> {
    if (!ReadPathSchema.safeParse(notePath).success) return { ok: false, reason: "invalid-path" };
    if (!safeVaultPath(notePath)) return { ok: false, reason: "unsafe-path" };
    const g = this.writeGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method: "POST", url: g.url, path: `/open/${this.encPath(notePath)}`, apiKey: apiKey(), accept: "application/json", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }

  /** GET /periodic/{period}/ -> read the current daily/periodic note. Read-only. */
  static async periodic(period: string, transport: ObsidianTransport = defaultTransport): Promise<ObsidianResult<string>> {
    if (!PERIODS.has(period)) return { ok: false, reason: "invalid-period" };
    const g = this.readGate();
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      const res = await transport({ method: "GET", url: g.url, path: `/periodic/${period}/`, apiKey: apiKey(), accept: "text/markdown", timeoutMs: CALL_TIMEOUT_MS });
      if (res.status === 404) return { ok: false, status: 404, reason: "not-found" };
      if (res.status < 200 || res.status >= 300) return { ok: false, status: res.status, reason: `http-${res.status}` };
      return { ok: true, status: res.status, data: cap(res.text) };
    } catch (e) { return { ok: false, reason: failReason(e, CALL_TIMEOUT_MS) }; }
  }
}

export const obsidianControlBridgeEngine = ObsidianControlBridgeEngine;
