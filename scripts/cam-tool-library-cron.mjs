#!/usr/bin/env node
/**
 * cam-tool-library-cron.mjs -- nightly orchestrator: REGENERATE -> VALIDATE -> DELIVER the
 * per-brand CAM tool libraries, end to end, so the seats always carry fresh, validated tools.
 *
 * WHY (slot:romeo, 2026-06-19): the operator asked for "harnesses, loops and crons". This is the
 * cron body: one command a Windows scheduled task runs nightly. It chains the harness
 * (emit + structural-validate all 3 formats) and, only if every library is valid, the placement
 * (deliver into the Fusion / hyperMILL / Mastercam seats). It appends one JSONL audit line per run
 * and exits non-zero on any failure so the scheduler surfaces a bad night.
 *
 * Install the schedule: .claude/helpers/install-cam-tool-library-cron.ps1
 *
 * Usage:
 *   node --experimental-sqlite scripts/cam-tool-library-cron.mjs [--no-place] [--self-test]
 *   (the --experimental-sqlite flag is needed for the hyperMILL .hmt binary build during placement)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runHarness } from "./cam-tool-library-harness.mjs";
import { placeLibraries } from "./place-cam-tool-libraries.mjs";
import { buildIndex } from "./build-brand-tool-catalog-index.mjs";
import { loadBrandCatalog } from "./lib/brand-tool-catalog.mjs";
import { emitRegistryJson } from "./emit-brand-catalog-registry-json.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(HERE, "../state/shared/tool-libraries");
const LOG = path.join(OUT_ROOT, "CRON-LOG.jsonl");
const INDEX_OUT = path.join(OUT_ROOT, "brand-tool-catalog-index.json");

/** Run the full regen -> validate -> place cycle. Returns a structured run record. */
export async function runCron({ place = true, nowIso } = {}) {
  const startedAt = nowIso || new Date().toISOString();
  const harness = runHarness({ outDir: OUT_ROOT, emit: true });

  const record = {
    startedAt,
    valid: harness.allValid,
    perFormat: Object.fromEntries(Object.entries(harness.formats).map(([k, v]) => [k, { files: v.files, validFiles: v.validFiles, tools: v.totalTools, failures: v.failures.length }])),
    placed: null,
    ok: false,
  };

  if (!harness.allValid) {
    record.ok = false; // never deliver an invalid library set
    return record;
  }
  // load the canonical corpus ONCE, reuse for both the index + the registry shards.
  const catalog = loadBrandCatalog();
  // refresh the app-consumable catalog index alongside the libraries (no stale index)
  try {
    const idx = buildIndex(catalog);
    fs.writeFileSync(INDEX_OUT, JSON.stringify(idx, null, 2));
    record.indexTools = idx.totals.tools;
  } catch (e) {
    record.indexError = e.message;
  }
  // refresh the app's tool-search registry shards (BRAND-CATALOG-APP-WIRING, slot:romeo 2026-06-19):
  // emit the 72K corpus as tracked CuttingTool JSON into data/tools so the EXISTING POST /tool/search
  // route + frontend serve it -- no route/registry/frontend edit. Keeps the registry fresh with the lanes.
  try {
    const reg = emitRegistryJson({ records: catalog, stampedAt: startedAt });
    record.registryShards = reg.brands;
    record.registryTools = reg.totalTools;
  } catch (e) {
    record.registryError = e.message;
  }
  if (place) {
    const placement = await placeLibraries({ apply: true });
    record.placed = Object.fromEntries(Object.entries(placement.seats).map(([k, v]) => [k, { placed: v.placed, toolsBuilt: v.toolsBuilt, seatExists: v.seatExists, errors: v.errors.length, errorMessages: v.errors.slice(0, 3) }]));
    record.ok = Object.values(placement.seats).every((s) => s.errors.length === 0);
  } else {
    record.ok = true;
  }
  return record;
}

function appendLog(record) {
  try { fs.appendFileSync(LOG, JSON.stringify(record) + "\n"); } catch { /* out dir absent */ }
}

/**
 * Render a run record to console lines. Pure (no I/O) so the R12 surfacing is unit-testable.
 * A FAILED run MUST list every seat's error reason -- never a silent fail.
 */
export function formatCronReport(record) {
  const lines = [`CAM tool-library cron @ ${record.startedAt}: ${record.ok ? "OK" : "FAILED"}`];
  for (const [fmt, v] of Object.entries(record.perFormat || {})) {
    const p = record.placed?.[fmt];
    lines.push(`  ${fmt.padEnd(18)} ${v.failures ? "FAIL" : "OK"}  ${v.validFiles}/${v.files} files | ${v.tools} tools` +
      (p ? ` | placed ${p.placed}${p.toolsBuilt ? ` (${p.toolsBuilt} .hmt tools)` : ""}${p.errors ? ` | ${p.errors} ERR` : ""}` : ""));
  }
  // R12 -- surface an index-build failure on the console even on an otherwise-OK run (it lived only in JSONL before).
  if (record.indexError) lines.push(`  index ERROR: ${record.indexError}`);
  // R12 -- surface the registry-shard emit (the app /tool/search wire) on every run, success or fail.
  if (record.registryError) lines.push(`  registry ERROR: ${record.registryError}`);
  else if (record.registryTools !== undefined) lines.push(`  registry  OK  ${record.registryTools} tools -> ${record.registryShards} shards (app /tool/search)`);
  if (!record.ok) {
    for (const [fmt, p] of Object.entries(record.placed || {})) {
      for (const msg of p.errorMessages || []) lines.push(`  FAIL ${fmt}: ${msg}`);
      // R12 -- errorMessages is capped at 3; never silently drop the rest -- surface the remaining count.
      const shown = (p.errorMessages || []).length;
      if ((p.errors || 0) > shown) lines.push(`  FAIL ${fmt}: ... (+${p.errors - shown} more)`);
    }
  }
  return lines;
}

/** True iff this process can build .hmt binaries (node:sqlite imports -- needs --experimental-sqlite). */
export async function sqliteAvailable() {
  try { await import("node:sqlite"); return true; }
  catch { return false; }
}

/**
 * Placement builds hyperMILL .hmt binaries via node:sqlite, which needs --experimental-sqlite.
 * If this process lacks the flag, re-exec ONCE with it so the natural
 * `node scripts/cam-tool-library-cron.mjs` invocation just works -- and the scheduled task stays
 * robust even if its action is ever edited to drop the flag. Guarded by PRISM_CAM_CRON_REEXEC=1
 * against an infinite loop; if we have already re-exec'd, fall through and let placement fail loud
 * (with the now-surfaced seat error). Returns false when no re-exec happened.
 */
async function reexecWithSqliteIfNeeded() {
  if (await sqliteAvailable()) return false;
  if (process.env.PRISM_CAM_CRON_REEXEC === "1") return false;
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath,
    ["--experimental-sqlite", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, PRISM_CAM_CRON_REEXEC: "1" } });
  process.exit(r.status ?? 1);
}

// ## Self-test (validate-only cycle -- no placement, no native binding needed)
async function selfTest() {
  const checks = [];
  const ok = (n, c) => checks.push({ name: n, ok: !!c });
  const rec = await runCron({ place: false, nowIso: "2026-06-19T00:00:00.000Z" });
  ok("cron record has startedAt", rec.startedAt === "2026-06-19T00:00:00.000Z");
  ok("cron validated all formats", rec.valid === true);
  ok("cron ok when valid + no-place", rec.ok === true);
  ok("perFormat carries tool counts", rec.perFormat.fusion && rec.perFormat.fusion.tools > 0);
  ok("placed null when --no-place", rec.placed === null);
  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  return passed === checks.length;
}

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit((await selfTest()) ? 0 : 1);
  const place = !args.includes("--no-place");
  if (place) await reexecWithSqliteIfNeeded(); // self-reexec with --experimental-sqlite for the .hmt build
  const record = await runCron({ place });
  appendLog(record);
  for (const line of formatCronReport(record)) console.log(line);
  process.exit(record.ok ? 0 : 1);
}
