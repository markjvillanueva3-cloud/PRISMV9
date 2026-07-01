#!/usr/bin/env node
/**
 * cold-script-rank.mjs
 * ====================
 * Re-runnable coldness ranker for the `scripts/` surface.
 * META artifact for AUDIT-DEV-TOOLS-PIPELINES-2026-05-16 finding F5.
 *
 * Problem (audit F5): the scripts/ tree carries hundreds of `.mjs`/`.js`/`.py`
 * files, many of which are no longer invoked by ANY hook, skill, npm script,
 * scheduled-task installer, git hook, or sibling orchestrator — "cold"
 * scripts that are pure dead weight, hide the load-bearing tooling in the
 * noise, and slow every audit that scans scripts/. There was no re-runnable
 * measurement, so the cold count could climb undetected (same silent-
 * regression class the synergy drop F1 caught).
 *
 * What it measures (re-measurable on every run):
 *   For every candidate script under scripts/ (recursive, excluding tests,
 *   _archive/, _completed_utilities/, node_modules, __pycache__) classify it:
 *     wired-strong    — referenced by >=1 STRONG consumer: a hook, a hook
 *                        bundle, a skill (.md), settings.json (C: or H:), a
 *                        package.json scripts entry, a .ps1 scheduled-task
 *                        installer, a non-sample git hook, OR another script
 *                        (cross-script — an orchestrator child / pipeline step).
 *     self-test-only  — referenced ONLY by its own test (scripts/__tests__/,
 *                        scripts/lib/<n>.test.mjs, or sibling <n>.test.mjs).
 *     cold            — ZERO references anywhere (real review/cleanup target).
 *
 * Ranking: cold scripts sorted by LOC descending — the biggest cold files are
 * the highest review/cleanup ROI. Per [[feedback_never_delete_only_disable]]
 * the action on a cold script is archive (`scripts/_archive/`) or wire a
 * consumer, NEVER blind delete — this script only RANKS, never mutates. RO.
 *
 * Conservative bias: a reference inside a comment still counts as "referenced".
 * Over-counting references is the SAFE direction; a false-cold-positive
 * (flagging a load-bearing script dead) is the dangerous direction — the same
 * failure mode the 2026-05-14 validate-unwired-signal regression documented.
 * The extension-anchored needle (`name.mjs`, not bare `name`) prevents
 * stem-collision false-colds.
 *
 * Outputs:
 *   --pretty   human-readable summary + top-N cold table (default)
 *   --json     machine-readable JSON
 *   --top N    rows in the pretty cold table (default 25)
 *
 * Usage:
 *   node scripts/cold-script-rank.mjs
 *   node scripts/cold-script-rank.mjs --json > state/shared/cold-script-baseline.json
 *
 * Verification channel (audit F5):
 *   node scripts/cold-script-rank.mjs --json | jq -r .summary.coldRate
 *     -> a finite number in [0,1].
 *   node scripts/cold-script-rank.mjs --json | jq -r .summary.totalScripts
 *     -> equals the recursive candidate count under scripts/.
 *
 * Exit codes (cron/CI friendly):
 *   0 — ranked OK
 *   2 — internal error (scripts dir missing / no candidates)
 *
 * Author: claude-32a39c0c / /forge-audit-v2 (foxtrot slot, 2026-05-16)
 * Tracking: state/shared/specs/AUDIT-DEV-TOOLS-PIPELINES-2026-05-16.md (F5)
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const CANDIDATE_EXTS = [".mjs", ".js", ".py"];
const EXCLUDE_DIR = new Set([
  "node_modules", ".git", "__pycache__", "__tests__", "_archive",
  "_completed_utilities",
]);

// ---------- safe IO ----------
function readSafe(p, dflt = null) {
  try { return fs.readFileSync(p, "utf8"); } catch { return dflt; }
}
function lsSafe(dir, filter = () => true) {
  try { return fs.readdirSync(dir).filter(filter); } catch { return []; }
}
function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}
function walkFiles(dir, predicate, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIR.has(e.name)) continue;
      walkFiles(path.join(dir, e.name), predicate, acc);
    } else {
      const full = path.join(dir, e.name);
      if (predicate(e.name, full)) acc.push(full);
    }
  }
  return acc;
}

function isTestFile(name) {
  return name.endsWith(".test.mjs") || name.endsWith(".test.js") ||
         name.endsWith("_test.py") || name.endsWith(".spec.mjs");
}

// ---------- pure core (unit-testable, no IO) ----------

/**
 * Classify one script given which corpus buckets reference its basename.
 * @param {{strong:boolean, selfTest:boolean}} refs
 * @returns {"wired-strong"|"self-test-only"|"cold"}
 */
export function classifyScript(refs) {
  if (refs.strong) return "wired-strong";
  if (refs.selfTest) return "self-test-only";
  return "cold";
}

/**
 * Pure ranker. IO injected via resolveRefs so this is fully unit-testable;
 * the real run wires resolveRefs to a corpus scan.
 *
 * @param {Array<{name:string, rel:string, loc:number, sizeBytes:number, ageDays:number}>} scripts
 * @param {(name:string)=>{strong:boolean,selfTest:boolean}} resolveRefs
 */
export function rankScripts(scripts, resolveRefs) {
  const all = scripts.map((sc) => {
    const refs = resolveRefs(sc.name);
    return { ...sc, classification: classifyScript(refs), refs };
  });
  const counts = { "wired-strong": 0, "self-test-only": 0, cold: 0 };
  for (const sc of all) counts[sc.classification]++;
  const total = all.length;
  const cold = all
    .filter((sc) => sc.classification === "cold")
    .sort((a, b) => b.loc - a.loc || b.sizeBytes - a.sizeBytes || a.rel.localeCompare(b.rel));
  return {
    summary: {
      totalScripts: total,
      wiredStrong: counts["wired-strong"],
      selfTestOnly: counts["self-test-only"],
      cold: counts.cold,
      coldRate: total > 0 ? Number((counts.cold / total).toFixed(4)) : 0,
    },
    cold,
    all,
  };
}

// ---------- real-data wiring ----------

function buildCorpus() {
  const scriptsDir = path.join(ROOT, "scripts");
  const hookDir = path.join(ROOT, ".claude/hooks");
  const skillDirs = [
    path.join(ROOT, ".claude/commands"),
    "C:/Users/wompu/.claude/commands",
  ];
  const helperDir = path.join(ROOT, ".claude/helpers");

  const strongFiles = [];
  // hooks + bundles (everything under .claude/hooks)
  for (const f of walkFiles(hookDir, (n) => n.endsWith(".mjs"))) strongFiles.push(f);
  // helpers can also spawn scripts
  for (const f of lsSafe(helperDir, (n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"))) {
    strongFiles.push(path.join(helperDir, f));
  }
  // skills
  for (const d of skillDirs) {
    for (const f of lsSafe(d, (n) => n.endsWith(".md"))) strongFiles.push(path.join(d, f));
  }
  // settings + package manifests
  for (const sp of ["H:/.claude/settings.json", "C:/Users/wompu/.claude/settings.json",
                    path.join(ROOT, "package.json"),
                    path.join(ROOT, "mcp-server/package.json")]) {
    if (statSafe(sp)) strongFiles.push(sp);
  }
  // .ps1 scheduled-task installers (helpers/ + scripts/)
  for (const f of lsSafe(helperDir, (n) => n.endsWith(".ps1"))) strongFiles.push(path.join(helperDir, f));
  for (const f of walkFiles(scriptsDir, (n) => n.endsWith(".ps1"))) strongFiles.push(f);
  // non-sample git hooks
  const gitHookDir = path.join(ROOT, ".git/hooks");
  for (const f of lsSafe(gitHookDir, (n) => !n.endsWith(".sample"))) {
    const full = path.join(gitHookDir, f);
    if (statSafe(full)?.isFile()) strongFiles.push(full);
  }

  // CROSS-SCRIPT corpus: every candidate script (non-test) — an
  // orchestrator/pipeline child reference is a STRONG wiring signal.
  const scriptFiles = walkFiles(
    scriptsDir,
    (n) => CANDIDATE_EXTS.some((x) => n.endsWith(x)) && !isTestFile(n),
  );

  const cat = (files) => {
    let s = "";
    for (const f of files) { const t = readSafe(f); if (t) s += "\n " + f + " \n" + t; }
    return s;
  };
  return {
    strongText: cat(strongFiles),
    scriptFiles,
    scriptsDir,
  };
}

function makeResolver(corpus) {
  // Pre-read every candidate script once, keyed by basename, for the
  // cross-script signal (exclude self when resolving).
  const scriptTexts = corpus.scriptFiles.map((f) => ({
    base: path.basename(f),
    full: f,
    text: readSafe(f, ""),
  }));
  // Index test texts once: scripts/**/__tests__ + sibling *.test.* + lib tests.
  const testFiles = walkFiles(
    corpus.scriptsDir,
    (n) => isTestFile(n),
  );
  const testIndex = testFiles.map((f) => ({ base: path.basename(f), text: readSafe(f, "") }));

  return (name) => {
    const needle = name; // basename incl. extension — collision-proof anchor
    let strong = corpus.strongText.includes(needle);
    if (!strong) {
      for (const st of scriptTexts) {
        if (st.base === name) continue;          // never self
        if (st.text.includes(needle)) { strong = true; break; }
      }
    }
    let selfTest = false;
    if (!strong) {
      const stem = name.replace(/\.(mjs|js|py)$/, "");
      for (const ti of testIndex) {
        // a test "owns" a script if it references the basename AND its own
        // name is derived from the stem (foo.test.mjs / foo_test.py / foo.spec)
        const ownerish =
          ti.base === stem + ".test.mjs" || ti.base === stem + ".test.js" ||
          ti.base === stem + "_test.py" || ti.base === stem + ".spec.mjs" ||
          ti.base.includes(stem);
        if (ownerish && ti.text.includes(needle)) { selfTest = true; break; }
      }
    }
    return { strong, selfTest };
  };
}

function gatherScripts(scriptsDir) {
  const files = walkFiles(
    scriptsDir,
    (n) => CANDIDATE_EXTS.some((x) => n.endsWith(x)) && !isTestFile(n),
  );
  const now = Date.now();
  return files.map((full) => {
    const txt = readSafe(full, "");
    const st = statSafe(full);
    return {
      name: path.basename(full),
      rel: path.relative(scriptsDir, full).replace(/\\/g, "/"),
      loc: txt ? txt.split("\n").length : 0,
      sizeBytes: st ? st.size : 0,
      ageDays: st ? Number(((now - st.mtimeMs) / 86400000).toFixed(1)) : -1,
    };
  });
}

// ---------- main ----------
function main() {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes("--json");
  const topIdx = argv.indexOf("--top");
  const top = topIdx >= 0 && argv[topIdx + 1] ? Math.max(1, parseInt(argv[topIdx + 1], 10) || 25) : 25;

  const scriptsDir = path.join(ROOT, "scripts");
  if (!statSafe(scriptsDir)) {
    const msg = `scripts dir not found: ${scriptsDir}`;
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
    else console.error(`[cold-script-rank] ${msg}`);
    process.exit(2);
  }

  const scripts = gatherScripts(scriptsDir);
  if (scripts.length === 0) {
    const msg = `no candidate scripts under ${scriptsDir}`;
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
    else console.error(`[cold-script-rank] ${msg}`);
    process.exit(2);
  }

  const corpus = buildCorpus();
  const resolver = makeResolver(corpus);
  const ranked = rankScripts(scripts, resolver);
  const out = { ok: true, generatedAt: new Date().toISOString(), ...ranked };

  if (jsonOut) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    process.exit(0);
  }

  const s = ranked.summary;
  console.log(`cold-script-rank — ${out.generatedAt}`);
  console.log(`  total scripts      : ${s.totalScripts}`);
  console.log(`  wired (strong)     : ${s.wiredStrong}`);
  console.log(`  self-test only     : ${s.selfTestOnly}`);
  console.log(`  COLD               : ${s.cold}  (rate ${(s.coldRate * 100).toFixed(1)}%)`);
  if (ranked.cold.length) {
    console.log(`\n  Top ${Math.min(top, ranked.cold.length)} cold scripts by LOC (review ROI — archive, never blind-delete):`);
    console.log(`  ${"LOC".padStart(5)}  ${"age(d)".padStart(7)}  path`);
    for (const c of ranked.cold.slice(0, top)) {
      console.log(`  ${String(c.loc).padStart(5)}  ${String(c.ageDays).padStart(7)}  ${c.rel}`);
    }
    if (ranked.cold.length > top) {
      console.log(`  ... and ${ranked.cold.length - top} more (use --top ${ranked.cold.length} or --json)`);
    }
  }
  if (s.coldRate >= 0.5) {
    console.log(`\n  ADVISORY: cold rate >=50% — over half of scripts/ has no caller.`);
    console.log(`  Triage the top cold scripts: archive to scripts/_archive/ or wire a consumer.`);
  }
  process.exit(0);
}

// Run main only when executed directly (not when imported by the test).
// NTFS is case-insensitive and the shell may hand us `h:\` vs `H:\` or mixed
// slashes — normalise both sides or main() silently never fires (the
// git-add-lane-guard case-sensitivity class, CLAUDE.md regression 2026-05-16).
function isMainModule() {
  if (!process.argv[1]) return false;
  let a, b;
  try { a = fs.realpathSync(process.argv[1]); } catch { a = path.resolve(process.argv[1]); }
  try { b = fs.realpathSync(__filename); } catch { b = __filename; }
  if (process.platform === "win32") {
    a = a.toLowerCase().replace(/\\/g, "/");
    b = b.toLowerCase().replace(/\\/g, "/");
  }
  return a === b;
}
if (isMainModule()) {
  main();
}
