#!/usr/bin/env node
/*
 * cad-gen-overnight-loop.mjs -- resumable, $0-Claude CAD-generation overnight loop
 * (DELTA-CAD-COMPLETION / U-CAD-GEN-OVERNIGHT-LOOP, slot:delta 2026-06-26).
 *
 * For each text part-spec in a worklist, drives scripts/cad-text-to-cadquery.mjs (qwen2.5-coder:32b
 * via local Ollama -> validated CadQuery -> staged STEP) and records gen success/defer/error. This is
 * the GEN half of the operator's "test cad model and print generation" goal: it grinds a corpus of
 * specs into staged CAD models overnight, $0 Claude tokens, no live-Fusion dependency (CadQuery STEP,
 * so it cannot wedge on the :18365 app), resumable across reaper kills + reboots.
 *
 * Resumable: per-spec processed-cursor.jsonl (re-gen=0 on resume). --until-complete fast-exits when
 * the worklist is drained. Fail-soft per item (one bad spec never stops the run). windowsHide on spawn
 * (2026-06-23 console-window regression class).
 *
 * Usage:
 *   node scripts/cad-gen-overnight-loop.mjs                              # default worklist, all items
 *   node scripts/cad-gen-overnight-loop.mjs --worklist <file> --limit N  # custom worklist, cap N this run
 *   node scripts/cad-gen-overnight-loop.mjs --until-complete             # fast-exit if already drained
 *   node scripts/cad-gen-overnight-loop.mjs --dry-run                    # plan only, no gen
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const GEN_CLI = path.join(ROOT, "scripts", "cad-text-to-cadquery.mjs");
const NODE = process.execPath;
const OUT_DIR = path.join(ROOT, "state", "shared", "cad-gen-loop");
const CURSOR = path.join(OUT_DIR, "processed-cursor.jsonl");
const RESULTS = path.join(OUT_DIR, "results.jsonl");
const REPORT = path.join(OUT_DIR, "report.json");
const DEFAULT_WORKLIST = path.join(OUT_DIR, "worklist.txt");
const PER_GEN_TIMEOUT_MS = 300000; // 5 min ceiling per single cad-text-to-cadquery call

// ---- worklist + cursor (pure, testable) --------------------------------------------------------

/* Parse a worklist file: one spec per non-empty, non-comment (#) line. */
export function parseWorklist(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/* Read the set of already-processed spec keys from the cursor jsonl (fail-soft). */
export function readCursorDone(cursorText) {
  const done = new Set();
  for (const line of (cursorText || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { const o = JSON.parse(t); if (o && o.key) done.add(o.key); } catch { /* skip torn line */ }
  }
  return done;
}

/* Stable key for a spec (so the cursor survives reorder/edit of the worklist). */
export function specKey(spec) {
  let h = 5381;
  for (let i = 0; i < spec.length; i++) h = ((h * 33) ^ spec.charCodeAt(i)) >>> 0;
  return "s" + h.toString(36);
}

/* Items still to do = worklist minus cursor-done. */
export function remainingItems(specs, done) {
  return specs.map((spec) => ({ spec, key: specKey(spec) })).filter((it) => !done.has(it.key));
}

// ---- one gen (injectable runner for tests) -----------------------------------------------------

export function defaultGenRunner(spec, { kernelValidate = false } = {}) {
  try {
    // --kernel-validate (opt-in): each generation also grades its KERNEL-bbox dimensional accuracy when
    // Fusion :18362 is up + the spec states explicit dims -> the auto-learning signal becomes authoritative.
    // Fail-soft in the generator (no-op when Fusion down), so a headless run is unaffected.
    const argvGen = [GEN_CLI, spec, "--json", ...(kernelValidate ? ["--kernel-validate"] : [])];
    const out = execFileSync(NODE, argvGen, {
      encoding: "utf8", windowsHide: true, timeout: PER_GEN_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: typeof e.status === "number" ? e.status : 1, out: (e.stdout || "").toString(), err: (e.stderr || e.message || "").toString() };
  }
}

/* Classify a gen runner result. cad-text-to-cadquery exit 0 = staged ok; executed:true OR a staged
 * dir/stepPath = a real STEP was produced ("staged"); exit 0 with neither = honest-defer ("ok"). */
export function classifyGen(spec, key, res) {
  let staged = null, executed = false;
  try {
    const j = JSON.parse((res.out || "").trim().split(/\r?\n/).filter(Boolean).pop() || "{}");
    staged = j.stagedDir || j.staged || j.outDir || j.dir || j.stepPath || null;
    executed = j.executed === true;
  } catch { /* non-json */ }
  let status;
  if (res.code === 0) status = (executed || staged) ? "staged" : "ok";
  else if (res.code === 2) status = "usage-error";
  else status = "error";
  return { key, spec, status, staged, executed, code: res.code };
}

/* Transient errors (exit 4 = Ollama/GPU contention timeout) must RETRY next run, so they are NOT
 * cursored. Successful gens + permanent usage-errors (bad spec) are cursored (done). */
export function shouldCursor(status) { return status !== "error"; }

// ---- main loop ---------------------------------------------------------------------------------

export function runLoop({ specs, done, genRunner, limit, log }) {
  const remaining = remainingItems(specs, done);
  const slice = limit && limit > 0 ? remaining.slice(0, limit) : remaining;
  const out = [];
  for (let i = 0; i < slice.length; i++) {
    const it = slice[i];
    log(`[${i + 1}/${slice.length}] gen: ${it.spec.slice(0, 70)}`);
    const rec = classifyGen(it.spec, it.key, genRunner(it.spec));
    out.push(rec);
  }
  return out;
}

export function summarize(allResults) {
  const by = (s) => allResults.filter((r) => r.status === s).length;
  return {
    total: allResults.length,
    staged: by("staged"),
    ok: by("ok"),
    errors: by("error") + by("usage-error"),
    genSuccessRate: allResults.length ? +((by("staged") + by("ok")) / allResults.length).toFixed(3) : 0,
  };
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def; };
  const worklistPath = flag("--worklist", DEFAULT_WORKLIST);
  const limit = Number.parseInt(flag("--limit", "0"), 10) || 0;
  const dryRun = argv.includes("--dry-run");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(worklistPath)) { process.stderr.write(`no worklist at ${worklistPath}\n`); process.exit(2); }
  const specs = parseWorklist(fs.readFileSync(worklistPath, "utf8"));
  const done = readCursorDone(fs.existsSync(CURSOR) ? fs.readFileSync(CURSOR, "utf8") : "");
  const remaining = remainingItems(specs, done);

  if (argv.includes("--until-complete") && remaining.length === 0) {
    process.stdout.write(`[until-complete] worklist DRAINED -- ${specs.length} spec(s) all cursored. Fast-exit.\n`);
    process.exit(0);
  }
  if (dryRun) {
    process.stdout.write(`DRY-RUN: ${specs.length} specs, ${done.size} done, ${remaining.length} remaining (limit=${limit || "all"})\n`);
    process.exit(0);
  }

  const log = (m) => process.stdout.write(m + "\n");
  const kernelValidate = argv.includes("--kernel-validate");
  log(`cad-gen-overnight-loop: ${specs.length} specs, ${done.size} already done, ${remaining.length} remaining${kernelValidate ? " [kernel-validate ON: each gen graded vs Fusion :18362, fail-soft]" : ""}`);
  const results = runLoop({ specs, done, genRunner: (spec) => defaultGenRunner(spec, { kernelValidate }), limit, log });

  // durable append: results BEFORE cursor (a torn write loses a cursor row, not a result; re-gen is safe)
  for (const r of results) {
    fs.appendFileSync(RESULTS, JSON.stringify({ ...r, at: new Date().toISOString() }) + "\n");
    if (shouldCursor(r.status)) fs.appendFileSync(CURSOR, JSON.stringify({ key: r.key, status: r.status }) + "\n");
  }
  const allCursorDone = readCursorDone(fs.readFileSync(CURSOR, "utf8")).size;
  const sum = { ...summarize(results), worklistTotal: specs.length, cursorDone: allCursorDone, generatedAt: new Date().toISOString() };
  fs.writeFileSync(REPORT, JSON.stringify(sum, null, 2));
  log(`DONE this run: staged=${sum.staged} ok=${sum.ok} errors=${sum.errors} genSuccessRate=${sum.genSuccessRate} | corpus ${allCursorDone}/${specs.length}`);
}
