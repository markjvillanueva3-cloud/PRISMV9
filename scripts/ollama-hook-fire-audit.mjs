#!/usr/bin/env node
/**
 * ollama-hook-fire-audit.mjs — META artifact for
 * OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18 / Finding F1.
 *
 * Confirms the 2026-05-16 finding [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]]:
 * "88% of the Ollama hook surface is unwired despite OLLAMA-PIPELINE-MS0
 * shipping 4 weeks ago" — but with measurable, re-runnable telemetry per the
 * Boris-discipline verification-feedback pattern.
 *
 * What it does:
 *   1. Enumerate every .mjs in .claude/hooks/ whose name OR body references
 *      Ollama / qwen / deepseek / llama / nim.
 *   2. Cross-reference against settings.json hook wirings (BOTH C: source-of-
 *      truth AND H: mirror — they should agree post c-to-h-mirror).
 *   3. Cross-reference against hook-fire-counts.jsonl for actual telemetry.
 *      (Note: the ledger has SELECTION BIAS per [[reference_hook_fire_counts_selection_bias_2026_05_18]] —
 *      a 0-fire here means "didn't telemetrize itself", not "didn't fire" —
 *      so the audit treats "wired AND telemetrizes" as the only reliable
 *      activated-bucket signal.)
 *   4. Emit a 4-bucket dashboard: WIRED_FIRING / WIRED_SILENT /
 *      UNWIRED_ON_DISK / WIRED_BUT_FILE_MISSING.
 *
 * Usage:
 *   node scripts/ollama-hook-fire-audit.mjs           # text dashboard
 *   node scripts/ollama-hook-fire-audit.mjs --json    # machine-readable
 *   node scripts/ollama-hook-fire-audit.mjs --diff    # diff C: vs H: settings
 *
 * Exit codes:
 *   0 — audit ran cleanly (regardless of findings)
 *   2 — input failure (missing settings.json or hooks dir)
 *
 * Knobs:
 *   PRISM_OLLAMA_HOOK_AUDIT_SETTINGS_C   override path to C: settings.json
 *   PRISM_OLLAMA_HOOK_AUDIT_SETTINGS_H   override path to H: settings.json
 *   PRISM_OLLAMA_HOOK_AUDIT_LEDGER       override path to hook-fire-counts.jsonl
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, basename, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, "..");

const HOOKS_DIR = pathResolve(REPO_ROOT, ".claude/hooks");
const SETTINGS_C = process.env.PRISM_OLLAMA_HOOK_AUDIT_SETTINGS_C
  || "C:/Users/Mark Villanueva/.claude/settings.json";
const SETTINGS_H = process.env.PRISM_OLLAMA_HOOK_AUDIT_SETTINGS_H
  || "H:/.claude/settings.json";
const LEDGER = process.env.PRISM_OLLAMA_HOOK_AUDIT_LEDGER
  || pathResolve(REPO_ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");

// Tokens whose presence in a filename OR body classifies a hook as
// "Ollama-routing related" for audit purposes. NOTE: no `\b` boundaries —
// hook bodies routinely contain identifiers like `qwen2.5-coder:7b` where
// the digit immediately follows the token (no word boundary inserts there).
// These tokens are rare-domain enough that substring match is the right
// screening signal — precision tradeoff justified by recall.
const OLLAMA_TOKENS = /(ollama|qwen|deepseek|llama|nim|qdrant|nomic)/i;

// ─── pure helpers (exported for tests) ──────────────────────────────────

/** Extract every hook-script filename referenced by a settings.json content blob.
 *  Returns a Set of basenames (no .mjs ext) so it matches the disk-walk format. */
export function extractWiredHooks(settingsJsonText) {
  const out = new Set();
  if (typeof settingsJsonText !== "string" || settingsJsonText.length === 0) return out;
  // Regex over the raw text — robust to schema variants. Captures any
  // ".../<name>.mjs" referenced in a "command" string.
  const re = /([A-Za-z0-9_\-]+)\.mjs/g;
  let m;
  while ((m = re.exec(settingsJsonText)) !== null) {
    out.add(m[1]);
  }
  return out;
}

/** Classify a hook file into the 4 audit buckets given the wired-set
 *  and a "telemetrizes-to-ledger" predicate. Pure. */
export function classifyHook({ hookBaseName, wiredInC, wiredInH, firedInLedger, existsOnDisk }) {
  const wired = wiredInC || wiredInH;
  if (!existsOnDisk && wired) return "WIRED_BUT_FILE_MISSING";
  if (!existsOnDisk) return "ABSENT";
  if (!wired) return "UNWIRED_ON_DISK";
  if (firedInLedger) return "WIRED_FIRING";
  return "WIRED_SILENT";
}

/** Read a hook file's body to confirm it actually references Ollama tokens
 *  (filename-only match could be a false positive). Pure. */
export function bodyMatchesOllama(text) {
  if (typeof text !== "string" || text.length === 0) return false;
  return OLLAMA_TOKENS.test(text);
}

/** Parse the hook-fire-counts.jsonl ledger and return a Set of hooks that
 *  fired at least once in the observation window. Pure (over text). */
export function parseFireLedger(jsonlText) {
  const out = new Set();
  if (typeof jsonlText !== "string") return out;
  for (const line of jsonlText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      const name = ev?.hook || ev?.name || ev?.hookName;
      if (typeof name === "string" && name.length > 0) out.add(name);
    } catch { /* skip malformed */ }
  }
  return out;
}

// ─── I/O wrappers ───────────────────────────────────────────────────────

function safeRead(filePath) {
  try { return readFileSync(filePath, "utf8"); }
  catch { return null; }
}

function listOllamaHooksOnDisk() {
  let entries;
  try { entries = readdirSync(HOOKS_DIR); }
  catch { return []; }
  const out = [];
  for (const f of entries) {
    if (!f.endsWith(".mjs")) continue;
    if (f.endsWith(".test.mjs")) continue;
    const name = f.replace(/\.mjs$/, "");
    if (OLLAMA_TOKENS.test(name)) {
      out.push(name);
      continue;
    }
    // Fall back to body inspection.
    const body = safeRead(pathResolve(HOOKS_DIR, f));
    if (body && bodyMatchesOllama(body)) out.push(name);
  }
  return out;
}

// ─── audit runner ───────────────────────────────────────────────────────

function runAudit() {
  const cText = safeRead(SETTINGS_C) || "";
  const hText = safeRead(SETTINGS_H) || "";
  const ledgerText = safeRead(LEDGER) || "";

  const wiredC = extractWiredHooks(cText);
  const wiredH = extractWiredHooks(hText);
  const firedSet = parseFireLedger(ledgerText);
  const ollamaHooks = listOllamaHooksOnDisk();

  // Drift: any hook wired in C but not H, or vice versa, is c-to-h-mirror lag.
  const onlyInC = [...wiredC].filter(h => OLLAMA_TOKENS.test(h) && !wiredH.has(h));
  const onlyInH = [...wiredH].filter(h => OLLAMA_TOKENS.test(h) && !wiredC.has(h));

  const buckets = {
    WIRED_FIRING: [],
    WIRED_SILENT: [],
    UNWIRED_ON_DISK: [],
    WIRED_BUT_FILE_MISSING: [],
  };

  // Walk every Ollama hook found on disk
  const onDiskSet = new Set(ollamaHooks);
  for (const name of ollamaHooks) {
    const c = classifyHook({
      hookBaseName: name,
      wiredInC: wiredC.has(name),
      wiredInH: wiredH.has(name),
      firedInLedger: firedSet.has(name),
      existsOnDisk: true,
    });
    buckets[c].push(name);
  }
  // Walk hooks wired in settings but missing from disk
  for (const name of wiredC) {
    if (!OLLAMA_TOKENS.test(name)) continue;
    if (!onDiskSet.has(name)) buckets.WIRED_BUT_FILE_MISSING.push(name);
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    settingsCPath: SETTINGS_C,
    settingsHPath: SETTINGS_H,
    ledgerPath: LEDGER,
    totals: {
      onDisk: ollamaHooks.length,
      wiredInC: [...wiredC].filter(h => OLLAMA_TOKENS.test(h)).length,
      wiredInH: [...wiredH].filter(h => OLLAMA_TOKENS.test(h)).length,
      firingTelemetry: [...firedSet].filter(h => OLLAMA_TOKENS.test(h)).length,
    },
    drift: { onlyInC, onlyInH },
    buckets,
    activatedRatio: ollamaHooks.length > 0
      ? Number((buckets.WIRED_FIRING.length / ollamaHooks.length).toFixed(3))
      : 0,
  };
}

function renderText(report) {
  const lines = [
    "┌─ Ollama Hook Fire Audit ─────────────────────────────────────",
    `│ generated: ${report.generatedAt}`,
    `│ on-disk Ollama hooks:     ${report.totals.onDisk}`,
    `│ wired in C: settings:      ${report.totals.wiredInC}`,
    `│ wired in H: settings:      ${report.totals.wiredInH}`,
    `│ firing per telemetry:      ${report.totals.firingTelemetry}`,
    `│ activated ratio:           ${(report.activatedRatio * 100).toFixed(1)}%`,
    "├─ buckets ───────────────────────────────────────────────────",
  ];
  for (const [bucket, names] of Object.entries(report.buckets)) {
    lines.push(`│ ${bucket} (${names.length}):`);
    for (const n of names.slice(0, 10)) lines.push(`│   • ${n}`);
    if (names.length > 10) lines.push(`│   … and ${names.length - 10} more`);
  }
  if (report.drift.onlyInC.length || report.drift.onlyInH.length) {
    lines.push("├─ c-to-h-mirror drift (Ollama subset) ──────────────────────");
    if (report.drift.onlyInC.length) lines.push(`│ only in C: ${report.drift.onlyInC.join(", ")}`);
    if (report.drift.onlyInH.length) lines.push(`│ only in H: ${report.drift.onlyInH.join(", ")}`);
  }
  lines.push("├─ R12 honest caveat ────────────────────────────────────────");
  lines.push(`│ The hook-fire-counts ledger has SELECTION BIAS — a 0 in`);
  lines.push(`│ 'firing telemetry' means the hook does not emit fire-count`);
  lines.push(`│ events to the ledger, NOT that it didn't run. Critical hooks`);
  lines.push(`│ like ollama-pipeline-injector + ollama-route-pretooluse DO`);
  lines.push(`│ fire (verified by system-reminders this session) but may not`);
  lines.push(`│ telemetrize. Treat WIRED_FIRING as a LOWER BOUND.`);
  lines.push("└─────────────────────────────────────────────────────────────");
  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes("--json");
  const diffMode = argv.includes("--diff");

  if (!existsSync(HOOKS_DIR)) {
    process.stderr.write(`ollama-hook-fire-audit: hooks dir missing: ${HOOKS_DIR}\n`);
    process.exit(2);
  }

  const report = runAudit();

  if (diffMode) {
    process.stdout.write(JSON.stringify({ drift: report.drift }, null, 2) + "\n");
  } else if (jsonMode) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(report) + "\n");
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("ollama-hook-fire-audit.mjs");
if (invokedDirectly) main();
