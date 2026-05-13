#!/usr/bin/env node
// tier: T4
/**
 * node-orphan-cleaner.mjs - Stop hook closeout orchestrator.
 *
 * This is intentionally a thin wrapper.  Dedup found older process cleaners in
 * the hook/helper tree, so the Stop hook delegates to the safer PRISM/Codex
 * cleanup helpers instead of carrying a second process-killing implementation.
 *
 * Scope:
 * - clean stale .claude hook/helper node processes
 * - clean transient PRISM/Codex node workers left by tests, evals, and CLIs
 * - preserve protected services, app-owned processes, and current parent chain
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = "H:/PRISM";
const STATE_DIR = "H:/prism/state/shared";
const LOG_FILE = `${STATE_DIR}/node-stop-closeout.log`;
const DRY_RUN = process.argv.includes("--dry-run");

const CLOSEOUT_STEPS = [
  {
    name: "hook-helper-janitor",
    script: `${__dirname}/node-process-janitor.mjs`,
    args: [],
    timeoutMs: 4000,
    skipOnDryRun: true,
  },
  {
    name: "prism-codex-orphan-cleaner",
    script: `${REPO_ROOT}/.claude/helpers/node-orphan-cleaner.mjs`,
    args: ["--force", "--reason=stop-hook", "--min-age=3", ...(DRY_RUN ? ["--dry-run"] : [])],
    timeoutMs: 5000,
  },
];

function log(message) {
  try {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Logging is best-effort; Stop hooks should not fail because of telemetry.
  }
}

function parseAdditionalContext(output) {
  const text = String(output || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return typeof parsed.additionalContext === "string" ? parsed.additionalContext : "";
  } catch {
    return text.length < 400 ? text : "";
  }
}

function runStep(step) {
  if (DRY_RUN && step.skipOnDryRun) {
    const message = `${step.name}: dry-run skipped mutating janitor`;
    log(message);
    return { ok: true, message };
  }

  if (!existsSync(step.script)) {
    const message = `${step.name}: skipped missing script ${step.script}`;
    log(message);
    return { ok: false, message };
  }

  try {
    const output = execFileSync(process.execPath, [step.script, ...step.args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: step.timeoutMs,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const context = parseAdditionalContext(output);
    log(`${step.name}: complete${context ? ` | ${context}` : ""}`);
    return { ok: true, message: context };
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    const message = `${step.name}: failed best-effort${stderr ? ` | ${stderr.slice(0, 300)}` : ""}`;
    log(message);
    return { ok: false, message };
  }
}

function main() {
  // Drain hook input so Claude/Codex hook callers never hang on stdin.
  try {
    readFileSync(0, "utf8");
  } catch {
    // No stdin is fine.
  }

  const messages = [];
  for (const step of CLOSEOUT_STEPS) {
    const result = runStep(step);
    if (result.message) messages.push(result.message);
  }

  if (messages.length > 0) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `Node closeout stop hook: ${messages.join(" | ")}`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
