#!/usr/bin/env node
/**
 * monitor-mcp-and-reaper.mjs — combined :3100 + reaper tail monitor.
 *
 * Probes /health every 60s and appends to a single dashboard file.
 * Tails fleet-reaper.log for the LATEST sweep verdict + new protect
 * hits (any "errorClass":"protected" line is the U-BRIDGE-PROTECT
 * guard actively saving a bridge — operator wants visibility).
 *
 * Output: H:/prism/state/shared/dashboards/mcp-reaper-monitor.jsonl
 *   one JSONL line per tick: { ts, mcp:{ok,statusCode,upMs}, reaper:{lastTs,reapedOk,protected,memUsedPct,caveatCount} }
 *
 * Run via: node H:/prism/scripts/monitor-mcp-and-reaper.mjs &
 * Or background tool spawn.
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import http from "node:http";

const TICK_MS = 60 * 1000;
const HEALTH_TIMEOUT_MS = 3 * 1000;
const HEALTH_URL = { host: "127.0.0.1", port: 3100, path: "/health" };
const REAPER_LOG = "H:/prism/state/shared/fleet-reaper.log";
const OUT = "H:/prism/state/shared/dashboards/mcp-reaper-monitor.jsonl";

function probeHealth() {
  return new Promise((resolve) => {
    const req = http.request({ ...HEALTH_URL, method: "GET", timeout: HEALTH_TIMEOUT_MS }, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => {
        try {
          const j = JSON.parse(body);
          resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, upMs: (j.uptime_seconds || 0) * 1000, rssMb: j?.memory?.rss_mb || null });
        } catch {
          resolve({ ok: false, statusCode: res.statusCode, upMs: 0, reason: "non-json" });
        }
      });
    });
    req.on("error", (e) => resolve({ ok: false, reason: "connect", code: e.code }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, reason: "timeout" }); });
    req.end();
  });
}

function tailReaper() {
  try {
    const lines = readFileSync(REAPER_LOG, "utf8").trim().split(/\r?\n/);
    if (lines.length === 0) return null;
    const last = JSON.parse(lines[lines.length - 1]);
    return {
      lastTs: last.ts,
      reapedOk: last.reapedOk,
      reapFailed: last.reapFailed,
      protected: (last.reaped || []).filter((r) => r.errorClass === "protected").length,
      memUsedPct: last.memUsedPct,
      caveatCount: (last.caveats || []).length,
    };
  } catch {
    return null;
  }
}

async function tick() {
  const ts = new Date().toISOString();
  const mcp = await probeHealth();
  const reaper = tailReaper();
  const line = JSON.stringify({ ts, mcp, reaper }) + "\n";
  try {
    mkdirSync(dirname(OUT), { recursive: true });
    appendFileSync(OUT, line);
  } catch {}
  // Stdout line for foreground visibility
  console.log(line.trim());
}

async function main() {
  if (process.env.PRISM_MONITOR_DISABLE === "1") {
    console.log("monitor disabled via PRISM_MONITOR_DISABLE=1");
    return;
  }
  // CLI mode: `--once` for scheduled-task callers (single tick, exit clean);
  // default daemon mode for foreground / in-session use (continuous interval).
  const once = process.argv.includes("--once");
  await tick();
  if (once) return;
  const handle = setInterval(tick, TICK_MS);
  process.on("SIGINT", () => { clearInterval(handle); process.exit(0); });
  process.on("SIGTERM", () => { clearInterval(handle); process.exit(0); });
}

main().catch((e) => {
  console.error("monitor fatal:", e.message);
  process.exit(1);
});
