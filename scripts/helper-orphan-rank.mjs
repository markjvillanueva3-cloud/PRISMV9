#!/usr/bin/env node
/**
 * helper-orphan-rank.mjs
 * ======================
 * Re-runnable orphan ranker for the `.claude/helpers/*.mjs` surface.
 * META artifact for AUDIT-DEV-TOOLS-PIPELINES-2026-05-16 finding F6.
 *
 * Problem (audit F6, reviewer-surfaced): the helpers/ tree had grown to
 * ~187 files, of which ~85% are not referenced by ANY hook, skill, script,
 * settings.json entry, or git hook — pure dead weight that inflates the
 * dev-tool surface, slows orphan scans, and hides genuinely-load-bearing
 * helpers in the noise. There was no re-runnable measurement, so the rate
 * could climb indefinitely undetected (same silent-regression class as the
 * synergy drop F1 caught).
 *
 * What it measures (re-measurable on every run):
 *   For every `.claude/helpers/*.mjs` (excluding `*.test.mjs`), search the
 *   whole consumer corpus for a reference to the helper's basename and
 *   classify it:
 *     wired-strong       — referenced by >=1 STRONG consumer: a hook, a
 *                           hook bundle, settings.json (C: or H:), a skill
 *                           (.md), a script, or a non-sample git hook.
 *     cross-helper-only  — referenced ONLY by other helpers (a helper that
 *                           is a dependency of another helper but has no
 *                           strong entry point of its own).
 *     self-test-only     — referenced ONLY by its own `<name>.test.mjs`.
 *     orphan             — ZERO references anywhere (real cleanup target).
 *
 * Ranking: orphans sorted by LOC descending — the biggest dead files are
 * the highest cleanup ROI. (Per [[feedback_never_delete_only_disable]] the
 * action on an orphan is archive/disable, never blind delete — this script
 * only RANKS, it never mutates anything. Read-only.)
 *
 * Conservative bias: a reference inside a comment still counts as
 * "referenced". Over-counting references is the SAFE direction — a
 * false-orphan-positive (flagging a load-bearing helper as dead) is the
 * dangerous direction, exactly the failure mode the 2026-05-14
 * validate-unwired-signal regression documented for the engine surface.
 *
 * Outputs:
 *   --pretty   human-readable summary + top-N orphan table (default)
 *   --json     machine-readable JSON
 *   --top N    rows in the pretty orphan table (default 25)
 *
 * Usage:
 *   node scripts/helper-orphan-rank.mjs
 *   node scripts/helper-orphan-rank.mjs --json > state/shared/helper-orphan-baseline.json
 *
 * Verification channel (audit F6):
 *   node scripts/helper-orphan-rank.mjs --json | jq -r .summary.orphanRate
 *     -> a finite number in [0,1]; F6 baseline ~0.85 on 2026-05-16.
 *   node scripts/helper-orphan-rank.mjs --json | jq -r .summary.totalHelpers
 *     -> equals `ls .claude/helpers/*.mjs | grep -v test | wc -l`.
 *
 * Exit codes (cron/CI friendly):
 *   0 — ranked OK
 *   2 — internal error (helpers dir missing / unreadable)
 *
 * Author: claude-32a39c0c / /forge-audit-v2 (foxtrot slot, 2026-05-16)
 * Tracking: state/shared/specs/AUDIT-DEV-TOOLS-PIPELINES-2026-05-16.md (F6)
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

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
function walkFiles(dir, exts, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walkFiles(full, exts, acc);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      acc.push(full);
    }
  }
  return acc;
}

// ---------- pure core (unit-testable, no IO) ----------

/**
 * Classify a single helper given which corpus buckets reference its basename.
 * @param {{strong:boolean, crossHelper:boolean, selfTest:boolean}} refs
 * @returns {"wired-strong"|"cross-helper-only"|"self-test-only"|"orphan"}
 */
export function classifyHelper(refs) {
  if (refs.strong) return "wired-strong";
  if (refs.crossHelper) return "cross-helper-only";
  if (refs.selfTest) return "self-test-only";
  return "orphan";
}

/**
 * Pure ranker. Given helper metadata + a reference resolver, produce the
 * full classification + ranked orphan list. IO is injected so this is
 * fully unit-testable; the real run wires `resolveRefs` to a corpus scan.
 *
 * @param {Array<{name:string, loc:number, sizeBytes:number, ageDays:number}>} helpers
 * @param {(name:string)=>{strong:boolean,crossHelper:boolean,selfTest:boolean}} resolveRefs
 */
export function rankHelpers(helpers, resolveRefs) {
  const all = helpers.map((h) => {
    const refs = resolveRefs(h.name);
    return { ...h, classification: classifyHelper(refs), refs };
  });
  const counts = {
    "wired-strong": 0,
    "cross-helper-only": 0,
    "self-test-only": 0,
    orphan: 0,
  };
  for (const h of all) counts[h.classification]++;
  const total = all.length;
  const orphans = all
    .filter((h) => h.classification === "orphan")
    .sort((a, b) => b.loc - a.loc || b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name));
  return {
    summary: {
      totalHelpers: total,
      wiredStrong: counts["wired-strong"],
      crossHelperOnly: counts["cross-helper-only"],
      selfTestOnly: counts["self-test-only"],
      orphan: counts.orphan,
      orphanRate: total > 0 ? Number((counts.orphan / total).toFixed(4)) : 0,
    },
    orphans,
    all,
  };
}

// ---------- real-data wiring ----------

function buildCorpus() {
  const hookDir = path.join(ROOT, ".claude/hooks");
  const bundleDir = path.join(hookDir, "bundles");
  const skillDirs = [
    path.join(ROOT, ".claude/commands"),
    "C:/Users/wompu/.claude/commands",
  ];
  const scriptsDir = path.join(ROOT, "scripts");
  const helperDir = path.join(ROOT, ".claude/helpers");

  // STRONG consumers: hooks, bundles, skills, scripts, settings, git hooks.
  const strongFiles = [];
  for (const f of walkFiles(hookDir, [".mjs"])) {
    // bundles dir lives under hookDir; both are strong — keep all.
    strongFiles.push(f);
  }
  for (const d of skillDirs) {
    for (const f of lsSafe(d, (n) => n.endsWith(".md"))) strongFiles.push(path.join(d, f));
  }
  for (const f of walkFiles(scriptsDir, [".mjs", ".js"])) strongFiles.push(f);
  for (const sp of ["H:/.claude/settings.json", "C:/Users/wompu/.claude/settings.json",
                    path.join(ROOT, "package.json"),
                    path.join(ROOT, "mcp-server/package.json")]) {
    if (statSafe(sp)) strongFiles.push(sp);
  }
  const gitHookDir = path.join(ROOT, ".git/hooks");
  for (const f of lsSafe(gitHookDir, (n) => !n.endsWith(".sample"))) {
    const full = path.join(gitHookDir, f);
    if (statSafe(full)?.isFile()) strongFiles.push(full);
  }

  // CROSS-HELPER corpus: every helper file (non-test).
  const helperFiles = lsSafe(helperDir, (n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"))
    .map((n) => path.join(helperDir, n));

  // Concatenate each bucket once (basename substring match is robust to
  // path-variance: H:/ vs relative vs C:/ vs forward/back slash all contain
  // the bare `foo-bar.mjs` token).
  const cat = (files) => {
    let s = "";
    for (const f of files) { const t = readSafe(f); if (t) s += "\n " + f + " \n" + t; }
    return s;
  };
  return {
    strongText: cat(strongFiles),
    helperFiles, // per-file so we can exclude self
    helperDir,
  };
}

function makeResolver(corpus) {
  // Pre-read helper file texts once, keyed by their own path.
  const helperTexts = corpus.helperFiles.map((f) => ({
    base: path.basename(f),
    text: readSafe(f, ""),
  }));
  return (name) => {
    const needle = name; // exact basename incl. ".mjs"
    const strong = corpus.strongText.includes(needle);
    // cross-helper: any OTHER helper's text mentions this name.
    let crossHelper = false;
    for (const ht of helperTexts) {
      if (ht.base === name) continue;
      if (ht.text.includes(needle)) { crossHelper = true; break; }
    }
    // self-test: a sibling `<stem>.test.mjs` references it.
    const stem = name.replace(/\.mjs$/, "");
    const testPath = path.join(corpus.helperDir, stem + ".test.mjs");
    const selfTest = (readSafe(testPath, "") || "").includes(needle);
    return { strong, crossHelper, selfTest };
  };
}

function gatherHelpers(helperDir) {
  const names = lsSafe(helperDir, (n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"));
  const now = Date.now();
  return names.map((name) => {
    const full = path.join(helperDir, name);
    const txt = readSafe(full, "");
    const st = statSafe(full);
    return {
      name,
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

  const helperDir = path.join(ROOT, ".claude/helpers");
  if (!statSafe(helperDir)) {
    const msg = `helpers dir not found: ${helperDir}`;
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
    else console.error(`[helper-orphan-rank] ${msg}`);
    process.exit(2);
  }

  const helpers = gatherHelpers(helperDir);
  if (helpers.length === 0) {
    const msg = `no helper .mjs files under ${helperDir}`;
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
    else console.error(`[helper-orphan-rank] ${msg}`);
    process.exit(2);
  }

  const corpus = buildCorpus();
  const resolver = makeResolver(corpus);
  const ranked = rankHelpers(helpers, resolver);
  const out = { ok: true, generatedAt: new Date().toISOString(), ...ranked };

  if (jsonOut) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    process.exit(0);
  }

  const s = ranked.summary;
  console.log(`helper-orphan-rank — ${out.generatedAt}`);
  console.log(`  total helpers      : ${s.totalHelpers}`);
  console.log(`  wired (strong)     : ${s.wiredStrong}`);
  console.log(`  cross-helper only  : ${s.crossHelperOnly}`);
  console.log(`  self-test only     : ${s.selfTestOnly}`);
  console.log(`  ORPHAN             : ${s.orphan}  (rate ${(s.orphanRate * 100).toFixed(1)}%)`);
  if (ranked.orphans.length) {
    console.log(`\n  Top ${Math.min(top, ranked.orphans.length)} orphans by LOC (cleanup ROI — archive, never blind-delete):`);
    console.log(`  ${"LOC".padStart(5)}  ${"age(d)".padStart(7)}  name`);
    for (const o of ranked.orphans.slice(0, top)) {
      console.log(`  ${String(o.loc).padStart(5)}  ${String(o.ageDays).padStart(7)}  ${o.name}`);
    }
    if (ranked.orphans.length > top) {
      console.log(`  ... and ${ranked.orphans.length - top} more (use --top ${ranked.orphans.length} or --json)`);
    }
  }
  if (s.orphanRate >= 0.75) {
    console.log(`\n  ADVISORY: orphan rate >=75% — the helpers/ surface is mostly dead weight.`);
    console.log(`  Triage the top orphans: archive (<name>.archive.<date>) or wire a consumer.`);
  }
  process.exit(0);
}

// Only run main when executed directly (not when imported by the test).
// NTFS is case-insensitive and the shell may hand us `h:\` vs `H:\` or
// mixed slashes — normalise both sides before comparing, or `main()`
// silently never fires (the git-add-lane-guard case-sensitivity class,
// CLAUDE.md regression 2026-05-16).
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
