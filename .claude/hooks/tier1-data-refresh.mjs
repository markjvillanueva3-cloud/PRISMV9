#!/usr/bin/env node
// tier: T4
/**
 * tier1-data-refresh.mjs — Refresh Tier-1 data sources before session_start_tier1_bolster
 *
 * Runs two generators if their outputs are stale:
 *   - SVI_TARGET_BREAKDOWN.json (>15 min old → regenerate)
 *   - USER_MODEL_SNAPSHOT.json  (>30 min old → regenerate)
 *
 * Stays silent on stdout (returns empty JSON) because Tier-1 assembly runs
 * AFTER this hook and injects the actual content. This hook's job is just to
 * keep the upstream files fresh.
 *
 * Fails soft: any generator error is logged to stderr but doesn't block the
 * SessionStart chain. Budget is ~2 seconds total (both generators run in
 * parallel via Promise.all).
 *
 * @milestone USSH-OPUS47-BOLSTER U-CTX03+U-CTX04 wiring
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const ROOT = "H:\\prism";
const SCRIPTS = path.join(ROOT, "mcp-server", "scripts");
const SVI_OUT = path.join(ROOT, "state", "shared", "SVI_TARGET_BREAKDOWN.json");
const USER_OUT = path.join(ROOT, "mcp-server", "data", "state", "USER_MODEL_SNAPSHOT.json");

const SVI_STALE_MS = 15 * 60 * 1000;
const USER_STALE_MS = 30 * 60 * 1000;

async function isStale(filePath, maxAgeMs) {
  try {
    const st = await fs.stat(filePath);
    return Date.now() - st.mtimeMs > maxAgeMs;
  } catch {
    return true; // missing = stale
  }
}

function runGenerator(scriptName) {
  return new Promise((resolve) => {
    const scriptPath = path.join(SCRIPTS, scriptName);
    const child = spawn("node", [scriptPath], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "", err = "";
    child.stdout.on("data", (c) => { out += c.toString(); });
    child.stderr.on("data", (c) => { err += c.toString(); });
    const killTimer = setTimeout(() => child.kill("SIGKILL"), 2500);
    child.on("close", (code) => {
      clearTimeout(killTimer);
      resolve({ script: scriptName, code, stdout: out.slice(-500), stderr: err.slice(-500) });
    });
    child.on("error", (e) => {
      clearTimeout(killTimer);
      resolve({ script: scriptName, code: -1, stdout: "", stderr: String(e?.message ?? e) });
    });
  });
}

async function main() {
  const tasks = [];
  if (await isStale(SVI_OUT, SVI_STALE_MS)) tasks.push(runGenerator("generate-svi-target-breakdown.mjs"));
  if (await isStale(USER_OUT, USER_STALE_MS)) tasks.push(runGenerator("generate-user-model-snapshot.mjs"));

  if (tasks.length === 0) {
    process.stdout.write(JSON.stringify({ _meta: { hook: "tier1-data-refresh", status: "fresh" } }));
    return;
  }

  const results = await Promise.all(tasks);
  const errors = results.filter((r) => r.code !== 0);
  if (errors.length > 0) {
    process.stderr.write(`[tier1-refresh] ${errors.length} generator(s) failed: ${errors.map((e) => e.script).join(", ")}\n`);
  }
  process.stdout.write(JSON.stringify({
    _meta: {
      hook: "tier1-data-refresh",
      regenerated: results.map((r) => ({ script: r.script, ok: r.code === 0 })),
    },
  }));
}

main().catch((err) => {
  process.stderr.write(`[tier1-refresh] ${err?.message ?? err}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
});
