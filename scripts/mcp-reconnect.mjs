#!/usr/bin/env node
// scripts/mcp-reconnect.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION CLI (alpha, 2026-05-31).
//
// Probe the shared MCP daemon and, if down, single-flight a detached reconnect (see
// scripts/lib/mcp-reconnect-action.mjs). Directly runnable by any chat / scheduled task; the
// per-turn enforcement path is the connectivity hook calling maybeReconnect() (golf patch-sibling
// HOOK-PATCH-MCP-AUTORECONNECT.md). ALWAYS exits 0 — this is reliability plumbing, never a gate.
//
//   node scripts/mcp-reconnect.mjs              # probe + reconnect-if-down, human output
//   node scripts/mcp-reconnect.mjs --json       # machine-readable
//   node scripts/mcp-reconnect.mjs --probe-only  # just report up/down, no reconnect
//
// Knobs: PRISM_MCP_URL, PRISM_MCP_AUTORECONNECT_DISABLE=1, PRISM_MCP_AUTORECONNECT_TTL_MS,
//        PRISM_MCP_DAEMON_HELPER.

import { probeDaemon, maybeReconnect, renderReconnectLine } from "./lib/mcp-reconnect-action.mjs";

async function main() {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const probeOnly = args.has("--probe-only");

  const probe = await probeDaemon();

  if (probeOnly) {
    if (asJson) { process.stdout.write(JSON.stringify({ ...probe, action: "probe-only" }) + "\n"); }
    else { process.stdout.write(`MCP daemon: ${probe.up ? "UP" : "DOWN"} (status ${probe.status ?? "—"}${probe.error ? ", " + probe.error : ""})\n`); }
    return;
  }

  const result = maybeReconnect({ up: probe.up });
  if (asJson) {
    process.stdout.write(JSON.stringify({ probe, ...result }) + "\n");
    return;
  }
  const line = renderReconnectLine(result);
  if (probe.up) process.stdout.write(`MCP daemon: UP — nothing to do.\n`);
  else process.stdout.write(`MCP daemon: DOWN → ${result.action} (${result.reason}).\n${line ? line + "\n" : ""}`);
}

main()
  .catch((e) => {
    // Fail-soft: surface to stderr but never non-zero exit (a cron/hook caller must not see a failure).
    try { process.stderr.write(`[mcp-reconnect] ${e && e.message ? e.message : e}\n`); } catch { /* */ }
    process.stdout.write(JSON.stringify({ ok: false, action: "error", reason: String(e && e.message ? e.message : e) }) + "\n");
  });
