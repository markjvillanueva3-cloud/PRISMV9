/**
 * eval-wedm-passschedule.mjs — Regimen #3 gate #1: DETERMINISTIC cascade-correctness
 * eval over a pass-schedule JSONL (per WEDM-TRAINING-REGIMENS-2026-05-31.md §3.2 eval).
 *
 * This is the LOAD-BEARING, code-checkable gate (the other 3 — safety/reward/reasoning
 * — reuse existing WEDMLoRA* engines). It grades each item's `output` schedule with the
 * cascade-correctness harness: AP003 strictly-decreasing offsets (2-axis) / taper-zero
 * (4-axis), via parse + checkMonotonicCascade. A single AP003 in an item => that item
 * FAILS (per spec: "single AP003 = FAIL", 100% required on the invariant battery).
 *
 * Use it two ways:
 *   1. Corpus self-check (default): grade the generated test corpus — oracle outputs
 *      must be ~100% valid (a drop flags a generator regression).
 *   2. Model-generation grading: feed a JSONL of {input, output:<model generation>, meta}
 *      to score a trained adapter's emitted schedules.
 *
 *   node scripts/eval-wedm-passschedule.mjs [path-to.jsonl]
 *
 * Pure graders exported for tests; reuses scripts/lib/wedm-cascade-correctness.mjs.
 * No ${...} template literals (scripts/ security hook).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseScheduleText, checkMonotonicCascade } from "./lib/wedm-cascade-correctness.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_JSONL = path.join(REPO_ROOT, "mcp-server/data/training/wedm-passschedule/wedm_passschedule_test.jsonl");

/** Heuristic: does this item's output carry a multi-pass schedule worth cascade-grading? */
export function isScheduleItem(item) {
  const kind = item && item.meta && item.meta.kind;
  if (kind === "tech_select" || kind === "tech_pass" || kind === "tech_trim") return false; // not full cascades
  const parsed = parseScheduleText(item && item.output);
  return parsed.length >= 2;
}

/** True when the schedule is a taper (4-axis): the input/output names taper/UV and H=0. */
export function isTaper(item) {
  const t = ((item && item.input) || "") + " " + ((item && item.output) || "");
  return /\btaper\b|\buv\b|4-?axis/i.test(t);
}

/**
 * Grade one item's output schedule. Returns { graded, valid, violations, ap003, taper }.
 * `graded:false` => not a schedule item (skipped, not counted as pass or fail).
 */
export function gradeItem(item) {
  if (!isScheduleItem(item)) return { graded: false };
  const taper = isTaper(item);
  const passes = parseScheduleText(item.output);
  const violations = checkMonotonicCascade(passes, { taper });
  return {
    graded: true,
    valid: violations.length === 0,
    violations,
    ap003: violations.some((v) => v.rule === "monotonic_decrease_AP003"),
    taper,
  };
}

/** Aggregate grades over a list of items. */
export function gradeAll(items) {
  let graded = 0, valid = 0, ap003 = 0, taperViol = 0;
  const failures = [];
  for (const it of items) {
    const r = gradeItem(it);
    if (!r.graded) continue;
    graded += 1;
    if (r.valid) valid += 1;
    else {
      if (r.ap003) ap003 += 1;
      if (r.violations.some((v) => v.rule === "taper_zero")) taperViol += 1;
      failures.push({ id: it.meta && it.meta.id, kind: it.meta && it.meta.kind, violations: r.violations });
    }
  }
  return {
    graded,
    valid,
    valid_rate: graded === 0 ? 0 : Math.round((valid / graded) * 1000) / 1000,
    ap003_failures: ap003,
    taper_failures: taperViol,
    failures,
  };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function main() {
  const file = process.argv[2] || DEFAULT_JSONL;
  const items = readJsonl(file);
  if (items.length === 0) {
    console.error("[eval-passsched] no items at " + file.replace(/\\/g, "/"));
    process.exit(2);
  }
  const report = gradeAll(items);
  console.log("=== WEDM PASS-SCHEDULE CASCADE-CORRECTNESS EVAL ===");
  console.log("file: " + file.replace(/\\/g, "/") + " (" + items.length + " items, " + report.graded + " schedule items graded)");
  console.log(JSON.stringify({ valid_rate: report.valid_rate, valid: report.valid, graded: report.graded, ap003_failures: report.ap003_failures, taper_failures: report.taper_failures }, null, 2));
  if (report.failures.length) {
    console.log("FAILURES:");
    for (const f of report.failures.slice(0, 10)) console.log("  " + f.id + " (" + f.kind + "): " + f.violations.map((v) => v.rule).join(","));
  }
  // Gate: corpus self-check must be 100% (oracle outputs); a drop = generator regression.
  if (report.graded === 0) {
    console.log("[eval-passsched] N/A — no full-schedule items in this split (tech_select/pass/trim are not cascades). Grade the train split or model generations.");
  } else {
    console.log("[eval-passsched] " + (report.valid_rate >= 1 ? "PASS (100% cascade-valid)" : "REVIEW (valid_rate " + report.valid_rate + " < 1.0 — inspect failures)"));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
