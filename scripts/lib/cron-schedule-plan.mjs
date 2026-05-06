#!/usr/bin/env node
/**
 * cron-schedule-plan.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U03.
 *
 * Pure-function planner for Windows Task Scheduler installation. The PS1
 * installer (install-cron-schedule.ps1) calls this module via
 * `node cron-schedule-plan.mjs --json` to get a validated, OS-agnostic plan,
 * then translates each task into a `schtasks /Create` invocation.
 *
 * Why split this out: PowerShell parsing logic is hard to unit-test on Linux
 * CI; pure JS planning + JSON contract is portable.
 *
 * Exports for tests:
 *   - DEFAULT_TASKS      → canonical task list
 *   - validateTask(t)    → null | string error
 *   - planForBox(tasks, fsAdapter) → { runnable[], skipped[], errors[] }
 *   - parseSchedule(s)   → { kind, time?, dow?, dom?, valid, reason }
 *   - summarisePlan(p)   → { runnable, skipped, errors, byKind }
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// CANONICAL TASK LIST
// ---------------------------------------------------------------------------
//
// Each task:
//   id          → unique kebab-case id (also used as Task Scheduler name)
//   schedule    → human-friendly grammar: "daily 02:30", "hourly", "weekly mon 03:00"
//   script      → repo-relative path; planForBox skips if file missing on this box
//   purpose     → one-line description for CRON-SCHEDULE.md
//   args        → optional CLI args appended after script path
//   logChannel  → "cron-runs.jsonl" by default; can override
export const DEFAULT_TASKS = [
  {
    id: "prism-mirror-c-to-h-nightly",
    schedule: "daily 02:30",
    script: "scripts/mirror-c-to-h-audit.mjs",
    args: ["--write"],
    purpose: "Mirror new C:\\ writes to H:\\ before they bit-rot. Idempotent audit.",
  },
  {
    id: "prism-inventory-refresh-daily",
    schedule: "daily 06:00",
    script: "scripts/update-prism-inventory.mjs",
    args: [],
    purpose: "Refresh PRISM-INVENTORY-LATEST.md (engines, dispatchers, action counts).",
  },
  {
    id: "prism-docker-audit-daily",
    schedule: "daily 04:00",
    script: "scripts/docker-audit.mjs",
    args: ["--write"],
    purpose: "Re-audit all Dockerfiles + docker-compose.yml; refresh DOCKER-INVENTORY.md.",
  },
  {
    id: "prism-extractor-audit-daily",
    schedule: "daily 04:30",
    script: "scripts/extractor-audit.mjs",
    args: ["--write"],
    purpose: "Re-classify extractor scripts; refresh EXTRACTOR-INVENTORY.md.",
  },
  {
    id: "prism-token-economy-weekly",
    schedule: "weekly mon 03:00",
    script: "scripts/token-economy-benchmark.mjs",
    args: [],
    purpose: "Roll up Ollama offload savings + emit TOKEN-ECONOMY-REPORT.md.",
  },
  {
    id: "prism-ollama-health-hourly",
    schedule: "hourly",
    script: "scripts/intel-stack-bootstrap.mjs",
    args: ["--json"],
    purpose: "Probe Qdrant + Ollama; verify embedding endpoint + 768-dim contract.",
  },
  {
    id: "prism-ollama-offload-dashboard-daily",
    schedule: "daily 23:50",
    script: "scripts/ollama-offload-dashboard.mjs",
    args: [],
    purpose: "Snapshot ollama-offload-stats.json into rolling daily delta log.",
  },
  {
    id: "prism-svi-refresh-daily",
    schedule: "daily 05:00",
    script: "scripts/svi-refresh.mjs",
    args: [],
    purpose: "Refresh SVI watch status (state/shared/SVI-watch-status.md).",
  },
];

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

const VALID_DOW = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parse a schedule string into a structured plan.
 *
 * Accepted grammars:
 *   "daily HH:MM"           → { kind: "daily", time: "HH:MM" }
 *   "hourly"                → { kind: "hourly" }
 *   "weekly <dow> HH:MM"    → { kind: "weekly", dow: "mon", time: "03:00" }
 *   "monthly <dom> HH:MM"   → { kind: "monthly", dom: 15, time: "04:00" } (1-28)
 *
 * Returns { kind, time?, dow?, dom?, valid: boolean, reason?: string }.
 */
export function parseSchedule(s) {
  if (typeof s !== "string" || s.length === 0) {
    return { valid: false, reason: "schedule must be a non-empty string" };
  }
  const tokens = s.trim().toLowerCase().split(/\s+/);
  const kind = tokens[0];

  if (kind === "hourly") {
    if (tokens.length !== 1) return { valid: false, reason: "'hourly' takes no args" };
    return { kind: "hourly", valid: true };
  }

  if (kind === "daily") {
    if (tokens.length !== 2 || !HHMM_RE.test(tokens[1])) {
      return { valid: false, reason: "'daily' requires HH:MM (24-hour)" };
    }
    return { kind: "daily", time: tokens[1], valid: true };
  }

  if (kind === "weekly") {
    if (tokens.length !== 3) {
      return { valid: false, reason: "'weekly' requires <dow> HH:MM" };
    }
    if (!VALID_DOW.has(tokens[1])) {
      return { valid: false, reason: `unknown day-of-week: ${tokens[1]}` };
    }
    if (!HHMM_RE.test(tokens[2])) {
      return { valid: false, reason: "'weekly' time must be HH:MM (24-hour)" };
    }
    return { kind: "weekly", dow: tokens[1], time: tokens[2], valid: true };
  }

  if (kind === "monthly") {
    if (tokens.length !== 3) {
      return { valid: false, reason: "'monthly' requires <dom> HH:MM" };
    }
    const dom = Number(tokens[1]);
    if (!Number.isInteger(dom) || dom < 1 || dom > 28) {
      return { valid: false, reason: "monthly dom must be integer 1..28 (avoid feb edge)" };
    }
    if (!HHMM_RE.test(tokens[2])) {
      return { valid: false, reason: "'monthly' time must be HH:MM (24-hour)" };
    }
    return { kind: "monthly", dom, time: tokens[2], valid: true };
  }

  return { valid: false, reason: `unknown schedule kind: ${kind}` };
}

/**
 * Validate a single task definition. Returns null on success or a descriptive
 * error string.
 */
export function validateTask(t) {
  if (!t || typeof t !== "object") return "task must be an object";
  if (typeof t.id !== "string" || !/^[a-z][a-z0-9-]+$/.test(t.id)) {
    return "id must be kebab-case [a-z][a-z0-9-]+";
  }
  if (typeof t.script !== "string" || t.script.length === 0) {
    return "script (repo-relative path) is required";
  }
  if (typeof t.purpose !== "string" || t.purpose.length === 0) {
    return "purpose is required for CRON-SCHEDULE.md docs";
  }
  if (t.args !== undefined && !Array.isArray(t.args)) {
    return "args must be an array if provided";
  }
  const sched = parseSchedule(t.schedule);
  if (!sched.valid) return `schedule invalid: ${sched.reason}`;
  return null;
}

/**
 * Plan installation for a specific box. Reads the on-disk script paths via
 * the supplied fs adapter (existsSync only), and partitions tasks into
 * runnable / skipped (script missing) / errors (validation failed).
 */
export function planForBox(tasks, repoRoot, fsAdapter) {
  const adapter = fsAdapter || { existsSync: (p) => fs.existsSync(p) };
  const runnable = [];
  const skipped = [];
  const errors = [];
  for (const t of tasks) {
    const err = validateTask(t);
    if (err) {
      errors.push({ id: t?.id ?? "(no-id)", reason: err });
      continue;
    }
    const abs = path.resolve(repoRoot, t.script);
    if (!adapter.existsSync(abs)) {
      skipped.push({ ...t, scriptAbs: abs, reason: "script not present on this box" });
      continue;
    }
    runnable.push({ ...t, scriptAbs: abs, parsedSchedule: parseSchedule(t.schedule) });
  }
  return { runnable, skipped, errors };
}

/**
 * Summarise a plan for short-form reporting.
 */
export function summarisePlan(plan) {
  const byKind = {};
  for (const t of plan.runnable) {
    const k = t.parsedSchedule?.kind ?? "unknown";
    byKind[k] = (byKind[k] || 0) + 1;
  }
  return {
    runnable: plan.runnable.length,
    skipped: plan.skipped.length,
    errors: plan.errors.length,
    byKind,
  };
}

// ---------------------------------------------------------------------------
// CLI ENTRYPOINT (called by install-cron-schedule.ps1)
// ---------------------------------------------------------------------------

import { fileURLToPath, pathToFileURL } from "node:url";

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isMain()) {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const plan = planForBox(DEFAULT_TASKS, repoRoot);
  const summary = summarisePlan(plan);
  if (wantJson) {
    process.stdout.write(JSON.stringify({ plan, summary, repoRoot }, null, 2));
  } else {
    process.stdout.write(`Cron plan for ${repoRoot}\n`);
    process.stdout.write(`  runnable: ${summary.runnable}\n`);
    process.stdout.write(`  skipped : ${summary.skipped}\n`);
    process.stdout.write(`  errors  : ${summary.errors}\n`);
    process.stdout.write(`  by kind : ${JSON.stringify(summary.byKind)}\n`);
    if (plan.skipped.length > 0) {
      process.stdout.write("\nSkipped (script not on this box):\n");
      for (const s of plan.skipped) process.stdout.write(`  - ${s.id}  →  ${s.script}\n`);
    }
    if (plan.errors.length > 0) {
      process.stdout.write("\nErrors:\n");
      for (const e of plan.errors) process.stdout.write(`  - ${e.id}  →  ${e.reason}\n`);
    }
  }
}

// silence unused-import warning when run via dynamic import
void pathToFileURL;
