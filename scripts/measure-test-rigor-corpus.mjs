#!/usr/bin/env node
// tier: T3
/**
 * measure-test-rigor-corpus.mjs -- calibration harness for the critical-domain
 * test-RIGOR floor (detectShallowCriticalTest in test-legitimacy-core.mjs).
 *
 * WHY: a Stop/PreToolUse gate that false-positives the live corpus gets
 * bypassed and erodes trust (the exact failure mode the presence-only dominance
 * rule was calibrated to avoid). Before the shallow-critical-test rule is wired
 * as a BLOCK, we measure how many EXISTING critical-domain test files would
 * trip it -- and eyeball a sample to confirm they are genuinely happy-path-only
 * (true positives), not legitimate reference-value tests (false positives).
 *
 * USAGE:
 *   node scripts/measure-test-rigor-corpus.mjs            # summary + 25 samples
 *   node scripts/measure-test-rigor-corpus.mjs --list     # every would-block file
 *   node scripts/measure-test-rigor-corpus.mjs --json     # machine-readable
 *
 * Pure read-only. No state writes, no network.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.env.PRISM_REPO_ROOT || "H:/prism";
const ROOTS = ["mcp-server", "web"];
const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".claude"]);
const MAX_BYTES = 400 * 1024;

const core = await import(
  pathToFileURL(join(REPO, ".claude/helpers/lib/test-legitimacy-core.mjs")).href
);

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".claude") {
      if (SKIP_DIRS.has(e.name)) continue;
    }
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (TEST_RE.test(e.name)) {
      out.push(full);
    }
  }
}

const files = [];
for (const r of ROOTS) walk(join(REPO, r), files);

let critical = 0;
const wouldBlock = [];
const histogram = { noFailNoAdv: 0, hasFail: 0, hasAdv: 0, hasBoth: 0 };

for (const f of files) {
  let content;
  try {
    const st = statSync(f);
    if (st.size > MAX_BYTES) {
      content = readFileSync(f, "utf8").slice(0, MAX_BYTES);
    } else {
      content = readFileSync(f, "utf8");
    }
  } catch { continue; }

  const verdict = core.detectShallowCriticalTest({ filePath: f, content });
  if (!verdict.domains || verdict.domains.length === 0) continue;
  critical += 1;

  const r = verdict.rigor || {};
  if (r.hasFailureMode && r.hasAdversarialInput) histogram.hasBoth += 1;
  else if (r.hasFailureMode) histogram.hasFail += 1;
  else if (r.hasAdversarialInput) histogram.hasAdv += 1;
  else histogram.noFailNoAdv += 1;

  if (verdict.advise) {
    wouldBlock.push({
      file: f.replace(REPO + "/", "").replace(/\\/g, "/"),
      domains: verdict.domains.map((d) => d.id).join(","),
      cases: r.caseCount,
      asserts: r.strongAssertions,
    });
  }
}

// --- Thinness bands within the no-fail-no-adv (would-block) set --------------
// The genuine "easy test just to pass" is THIN: few cases AND few assertions.
// A 59-case / 108-assert positive-reference-value test is NOT shallow (it is the
// R9 gold standard). Find a (cases<=C AND asserts<=A) cap whose set is small and
// eyeball-confirmed genuinely thin.
const BANDS = [
  { c: 1, a: 2 }, { c: 2, a: 3 }, { c: 2, a: 4 }, { c: 3, a: 5 }, { c: 3, a: 6 }, { c: 4, a: 8 },
];
console.error("--- thinness bands within would-block set ---");
for (const b of BANDS) {
  const n = wouldBlock.filter((w) => w.cases <= b.c && w.asserts <= b.a).length;
  console.error(`  cases<=${b.c} AND asserts<=${b.a}: ${n}`);
}
const thin = wouldBlock.filter((w) => w.cases <= 3 && w.asserts <= 6).sort((x, y) => (x.cases + x.asserts) - (y.cases + y.asserts));
console.error(`--- thinnest would-block (cases<=3 AND asserts<=6): ${thin.length} ---`);
for (const w of thin.slice(0, 40)) console.error(`  [${w.domains}] c=${w.cases} a=${w.asserts}  ${w.file}`);

const pctBlock = critical ? ((wouldBlock.length / critical) * 100).toFixed(1) : "0";

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    totalTests: files.length,
    criticalDomainTests: critical,
    wouldBlock: wouldBlock.length,
    pctOfCriticalBlocked: Number(pctBlock),
    histogram,
    samples: wouldBlock.slice(0, 50),
  }, null, 2));
} else {
  console.log("=== test-rigor corpus calibration ===");
  console.log(`total test files scanned: ${files.length}`);
  console.log(`critical-domain test files: ${critical}`);
  console.log(`  has failure-mode + adversarial: ${histogram.hasBoth}`);
  console.log(`  has failure-mode only:          ${histogram.hasFail}`);
  console.log(`  has adversarial only:           ${histogram.hasAdv}`);
  console.log(`  has NEITHER (would BLOCK):      ${histogram.noFailNoAdv}`);
  console.log(`would-block: ${wouldBlock.length} (${pctBlock}% of critical-domain tests)`);
  console.log("");
  const sortBy = process.argv.includes("--list") ? wouldBlock : wouldBlock.slice(0, 25);
  console.log(`--- ${sortBy.length} would-block file(s) (cases/asserts) ---`);
  for (const w of sortBy) {
    console.log(`  [${w.domains}] c=${w.cases} a=${w.asserts}  ${w.file}`);
  }
}
