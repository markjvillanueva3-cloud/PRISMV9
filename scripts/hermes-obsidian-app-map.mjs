#!/usr/bin/env node
// scripts/hermes-obsidian-app-map.mjs
//
// BLIND-MAPPING observability surface for the two desktop apps PRISM drives —
// the Nous Hermes agent app and the Obsidian vault app. Lets an operator (or a
// bravo chat) SEE the live internal state of both apps on demand, without
// relaying screenshots: gateway state, config-version drift, active sessions,
// the model the last conversation turn used, the freshest error, Obsidian REST
// reachability + the currently-open note, and process/port liveness.
//
// WHY: when a Hermes message "does nothing", the failure is INSIDE the app
// (a non-retryable 400, a stopped gateway, a config-version gap). The desktop
// GUI hides it; the only ground truth is the app's own status API + its logs.
// This script reads those REAL surfaces (verified live 2026-06-08):
//   - Hermes  :9120/api/status   (open, no auth) — version, config_version vs
//     latest_config_version, gateway_running/pid/state, active_sessions, auth.
//   - Hermes  logs/{agent,desktop,errors}.log — last conversation turn's
//     model/provider + the freshest non-retryable error.
//   - Obsidian:27123 (REST API plugin) — / reachability + /active/ (open note);
//     authed with the plugin's apiKey from its data.json (NEVER printed).
//   - Sync lock state (.obsidian-memory-sync.lock) — is the 3-min feed mid-write.
//
// SAFETY: read-only. Never prints secrets — the Obsidian apiKey, OAuth tokens,
// and .env contents are used for auth headers / liveness only and are redacted
// in all output. Fail-soft: an unreachable app yields a "DOWN" line, never a
// throw. No app process is started, stopped, or mutated.
//
// Usage:
//   node scripts/hermes-obsidian-app-map.mjs            # human-readable map
//   node scripts/hermes-obsidian-app-map.mjs --json     # machine JSON
//
// Pure exports (unit-tested): summarizeHermesStatus, extractLastTurn,
// extractFreshestError, classifyConfigDrift, redactSecret, buildMapReport.
//
// @module hermes-obsidian-app-map

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const HERMES_DIR = process.env.HERMES_DIR || "C:/Users/wompu/AppData/Local/hermes";
const HERMES_WEBUI = process.env.HERMES_WEBUI || "http://127.0.0.1:9120";
const OBSIDIAN_URL = process.env.PRISM_OBSIDIAN_URL || "https://127.0.0.1:27123";
const OBSIDIAN_VAULT = process.env.PRISM_OBSIDIAN_VAULT || "H:/prism/knowledge";
const REST_PLUGIN_DATA = path.join(OBSIDIAN_VAULT, ".obsidian", "plugins", "obsidian-local-rest-api", "data.json");
const SYNC_LOCK = path.join(OBSIDIAN_VAULT, ".obsidian-memory-sync.lock");

// ---------- pure helpers (testable, no I/O) ----------

/**
 * Redact a secret to a non-reversible fingerprint: keep a 4-char prefix + length.
 * Used so a status report can confirm "a key is present" without ever leaking it.
 * @param {string|null|undefined} s
 * @returns {string}
 */
export function redactSecret(s) {
  if (s == null || s === "") return "(absent)";
  const str = String(s);
  return `${str.slice(0, 4)}…(${str.length} chars, redacted)`;
}

/**
 * Summarize the Hermes /api/status payload into the operator-relevant fields.
 * Pure: takes the parsed object, returns a flat summary. Tolerates missing keys.
 * @param {Record<string, unknown>|null} status
 * @returns {{reachable:boolean, version?:string, gatewayRunning?:boolean, gatewayState?:string|null, activeSessions?:number, authRequired?:boolean, configVersion?:number, latestConfigVersion?:number}}
 */
export function summarizeHermesStatus(status) {
  if (!status || typeof status !== "object") return { reachable: false };
  return {
    reachable: true,
    version: status.version,
    gatewayRunning: status.gateway_running === true,
    gatewayState: status.gateway_state ?? null,
    gatewayPid: status.gateway_pid ?? null,
    gatewayExitReason: status.gateway_exit_reason ?? null,
    activeSessions: typeof status.active_sessions === "number" ? status.active_sessions : undefined,
    authRequired: status.auth_required === true,
    configVersion: typeof status.config_version === "number" ? status.config_version : undefined,
    latestConfigVersion: typeof status.latest_config_version === "number" ? status.latest_config_version : undefined,
  };
}

/**
 * Classify config-version drift. A config far behind `latest` is a real risk —
 * the app may ignore new keys (e.g. a model/provider block) until migrated.
 * @param {number|undefined} current
 * @param {number|undefined} latest
 * @returns {{ok:boolean, drift:number, severity:"ok"|"behind"|"unknown", note:string}}
 */
export function classifyConfigDrift(current, latest) {
  if (typeof current !== "number" || typeof latest !== "number") {
    return { ok: false, drift: 0, severity: "unknown", note: "config version not reported" };
  }
  const drift = latest - current;
  if (drift <= 0) return { ok: true, drift: 0, severity: "ok", note: "config current" };
  return {
    ok: false,
    drift,
    severity: "behind",
    note: `config v${current} is ${drift} version(s) behind latest v${latest} — new config keys may be ignored until migrated`,
  };
}

/**
 * Extract the most recent conversation turn from agent.log lines: the model +
 * provider Hermes actually used (the line shape is
 * "... conversation turn: session=... model=X provider=Y ... msg='...'").
 * Pure: takes the log text, returns the last match or null.
 * @param {string} logText
 * @returns {{model:string, provider:string, msg:string}|null}
 */
export function extractLastTurn(logText) {
  if (typeof logText !== "string" || !logText) return null;
  const re = /conversation turn:.*?model=(\S+)\s+provider=(\S+).*?msg='([^']*)'/g;
  let last = null;
  let m;
  while ((m = re.exec(logText)) !== null) {
    last = { model: m[1], provider: m[2], msg: m[3] };
  }
  return last;
}

/**
 * Extract the freshest error from a log's lines — the last line carrying an
 * ERROR/WARNING with an HTTP status or "error_type". Pure.
 * @param {string} logText
 * @returns {{line:string, http?:number, kind?:string}|null}
 */
export function extractFreshestError(logText) {
  if (typeof logText !== "string" || !logText) return null;
  const lines = logText.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = lines[i];
    if (/\b(ERROR|error_type=|HTTP \d{3}|Error code: \d{3}|Non-retryable)\b/.test(ln)) {
      const http = (ln.match(/(?:HTTP |Error code: )(\d{3})/) || [])[1];
      const kind = (ln.match(/error_type=(\S+)/) || [])[1];
      return {
        line: ln.trim().slice(0, 280),
        ...(http ? { http: Number(http) } : {}),
        ...(kind ? { kind } : {}),
      };
    }
  }
  return null;
}

/**
 * Assemble the final report object from already-gathered parts. Pure — the CLI
 * gathers (I/O) then calls this so the assembly is unit-testable.
 * @param {object} parts
 * @returns {object}
 */
export function buildMapReport({ hermes, obsidian, processes, stampIso }) {
  const drift = classifyConfigDrift(hermes?.status?.configVersion, hermes?.status?.latestConfigVersion);
  const blockers = [];
  // A down app must read as a BLOCKER, never as silent-healthy — when :9120 is
  // unreachable we can't probe gateway/config, so emit this FIRST and skip the
  // reachable-only checks below (they'd be vacuously false on a down app).
  if (!hermes?.status?.reachable) {
    blockers.push("Hermes app is UNREACHABLE (:9120 status API down) — the app is not running or its GUI launcher is mid-boot / awaiting interaction. No conversation can succeed until it is up.");
  }
  if (hermes?.status?.reachable && hermes.status.gatewayRunning === false) {
    blockers.push("Hermes messaging GATEWAY is not running (gateway_running=false) — desktop chat may work but platform integrations are dark.");
  }
  if (!drift.ok && drift.severity === "behind") {
    blockers.push(`Hermes ${drift.note}.`);
  }
  if (hermes?.lastError?.http === 400 && /extra usage|not your plan/i.test(hermes.lastError.line)) {
    blockers.push("Last Hermes turn hit HTTP 400 (third-party extra-usage) — Claude-via-OAuth is blocked unless extra-usage billing is enabled. Flip model.default to a local model OR enable billing.");
  }
  if (hermes?.lastError?.http === 429) {
    blockers.push("Last Hermes turn hit HTTP 429 (rate-limited) — shared Claude pool exhausted; expect local-fallback or wait.");
  }
  if (obsidian && obsidian.reachable === false) {
    blockers.push("Obsidian REST API (:27123) is DOWN — the Obsidian app is closed or the Local REST API plugin is off; vault round-trips via REST unavailable (PRISM :3100 dispatchers still read the vault).");
  }
  return { stampIso: stampIso ?? null, hermes, obsidian, processes, configDrift: drift, blockers };
}

// ---------- I/O ----------

function fetchJson(url, { headers = {}, timeoutMs = 4000, rejectUnauthorized = true } = {}) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch { resolve({ ok: false, reason: "bad-url" }); return; }
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "GET", headers, timeout: timeoutMs, rejectUnauthorized },
      (res) => {
        let s = "";
        res.on("data", (d) => (s += d));
        res.on("end", () => {
          let json = null;
          try { json = JSON.parse(s); } catch { /* not json */ }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, raw: s.slice(0, 200) });
        });
      }
    );
    req.on("error", (e) => resolve({ ok: false, reason: e && e.code }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, reason: "timeout" }); });
    req.end();
  });
}

function tailFile(file, maxBytes = 16384) {
  try {
    const st = fs.statSync(file);
    const start = Math.max(0, st.size - maxBytes);
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(st.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString("utf8");
  } catch { return ""; }
}

function readObsidianApiKey() {
  try {
    const j = JSON.parse(fs.readFileSync(REST_PLUGIN_DATA, "utf8"));
    return j.apiKey || null;
  } catch { return null; }
}

async function gatherHermes() {
  const statusRes = await fetchJson(`${HERMES_WEBUI}/api/status`);
  const status = summarizeHermesStatus(statusRes.json);
  const agentLog = tailFile(path.join(HERMES_DIR, "logs", "agent.log"));
  const errorsLog = tailFile(path.join(HERMES_DIR, "logs", "errors.log"));
  const lastTurn = extractLastTurn(agentLog);
  // freshest error across both logs — take whichever appears; errors.log is curated
  const lastError = extractFreshestError(errorsLog) || extractFreshestError(agentLog);
  return { status, lastTurn, lastError };
}

async function gatherObsidian() {
  const key = readObsidianApiKey();
  const root = await fetchJson(`${OBSIDIAN_URL}/`, { rejectUnauthorized: false });
  if (!root.ok && root.reason) {
    return { reachable: false, reason: root.reason, apiKey: redactSecret(key), syncLock: fs.existsSync(SYNC_LOCK) };
  }
  const active = key
    ? await fetchJson(`${OBSIDIAN_URL}/active/`, { headers: { Authorization: `Bearer ${key}` }, rejectUnauthorized: false })
    : { ok: false, reason: "no-api-key" };
  return {
    reachable: true,
    apiKey: redactSecret(key),
    activeNoteStatus: active.status ?? null,
    activeNoteReadable: active.ok === true,
    syncLock: fs.existsSync(SYNC_LOCK),
  };
}

async function main() {
  const json = process.argv.includes("--json");
  const hermes = await gatherHermes();
  const obsidian = await gatherObsidian();
  const report = buildMapReport({ hermes, obsidian, processes: null, stampIso: null });

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  const L = [];
  L.push("═══ HERMES + OBSIDIAN APP MAP (blind-mapping observability) ═══");
  L.push("");
  L.push("── HERMES ──");
  if (!hermes.status.reachable) {
    L.push("  :9120 status API UNREACHABLE — Hermes app is not running (or still booting).");
  } else {
    L.push(`  version: ${hermes.status.version}  ·  auth_required: ${hermes.status.authRequired}`);
    L.push(`  gateway_running: ${hermes.status.gatewayRunning}  ·  state: ${hermes.status.gatewayState ?? "(none)"}  ·  pid: ${hermes.status.gatewayPid ?? "(none)"}`);
    L.push(`  active_sessions: ${hermes.status.activeSessions}`);
    L.push(`  config_version: ${hermes.status.configVersion}  /  latest: ${hermes.status.latestConfigVersion}  → ${report.configDrift.note}`);
  }
  if (hermes.lastTurn) {
    L.push(`  last conversation turn: model=${hermes.lastTurn.model} provider=${hermes.lastTurn.provider}`);
    L.push(`     msg: "${hermes.lastTurn.msg.slice(0, 80)}"`);
  } else {
    L.push("  last conversation turn: (none logged since last boot)");
  }
  if (hermes.lastError) {
    L.push(`  ⚠ freshest error${hermes.lastError.http ? ` [HTTP ${hermes.lastError.http}]` : ""}${hermes.lastError.kind ? ` [${hermes.lastError.kind}]` : ""}:`);
    L.push(`     ${hermes.lastError.line.slice(0, 180)}`);
  } else {
    L.push("  freshest error: (none in recent logs)");
  }
  L.push("");
  L.push("── OBSIDIAN ──");
  if (!obsidian.reachable) {
    L.push(`  :27123 REST API DOWN (${obsidian.reason}) — Obsidian app closed or Local REST API plugin off.`);
    L.push(`  REST apiKey on disk: ${obsidian.apiKey}`);
  } else {
    L.push(`  :27123 REST API UP  ·  apiKey: ${obsidian.apiKey}`);
    L.push(`  active note readable: ${obsidian.activeNoteReadable} (HTTP ${obsidian.activeNoteStatus})`);
  }
  L.push(`  sync-lock held (.obsidian-memory-sync.lock): ${obsidian.syncLock}`);
  L.push("");
  if (report.blockers.length) {
    L.push("── BLOCKERS / WHAT'S WRONG ──");
    for (const b of report.blockers) L.push(`  • ${b}`);
  } else {
    L.push("── No blockers detected — both apps appear healthy. ──");
  }
  process.stdout.write(L.join("\n") + "\n");
}

const __direct = (() => { try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("hermes-obsidian-app-map.mjs"); } catch { return false; } })();
if (__direct) main().catch((e) => { process.stderr.write(`fatal: ${e.message}\n`); process.exit(1); });
