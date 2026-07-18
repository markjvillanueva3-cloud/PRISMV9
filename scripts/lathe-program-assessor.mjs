#!/usr/bin/env node
/**
 * lathe-program-assessor.mjs — closed-loop ASSESSMENT of JM lathe programs (slot:whiskey)
 *
 * Answers the operator goal "use a workflow to assess all the programs to determine
 * if we really did generate proper programs": for each program, runs the REAL 8-gotcha
 * physics/safety lint (lathe-gcode-lint) → PROPER (lint-clean) verdict; and for each
 * A(original)↔B("enhanced") pair, compares MACHINING content + finding deltas →
 * detects whether B genuinely IMPROVED over A or is an ANNOTATION-ONLY pass-through
 * (the iter261 R12 finding: JMDieLatheProgramUpgraderV2 B-versions were pure annotation
 * pass-through, NOT machining-improving — [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]).
 *
 * REUSE (R8 — orchestrate existing helpers, do not re-implement):
 *   - lintLatheGcode/maxSeverity   ← scripts/lib/lathe-gcode-lint.mjs (the 8-gotcha physics/safety scorer)
 *   - parsePath/groupByPart/pairAB ← scripts/lib/lathe-ab-version-locator.mjs (A/B pairing)
 * DISTINCT from scan-jm-die-ab-pairs.mjs (shallow line/block/g-code counts) — this adds the
 * physics/safety lint + a machining-change verdict, which the line-count scan cannot give.
 *
 * Offline — no MCP, no engine, no dist build (runs when port 3100 is down).
 *
 * USAGE:
 *   node scripts/lathe-program-assessor.mjs --single <file.MIN> [--controller okuma]
 *   node scripts/lathe-program-assessor.mjs --scan "H:/PRISM/JM DIE/CNC LATHE/ALCOA" [--limit 100] [--json]
 *   node scripts/lathe-program-assessor.mjs --scan <root> --upgraded-only --json
 *
 * @milestone CLOSED-LOOP-MS0/U-CL1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintLatheGcode, maxSeverity } from "./lib/lathe-gcode-lint.mjs";
import { parsePath, groupByPart, pairAB } from "./lib/lathe-ab-version-locator.mjs";

const FILE_EXTS = new Set([".min", ".nc", ".pim"]);

/**
 * Comment-stripped, whitespace-normalized MACHINING view of a program — the basis for
 * "did the machining content actually change, or is B just A + annotations?".
 * Strips Fanuc `( … )` + Okuma `[ … ]` comments, drops blank lines, collapses whitespace,
 * uppercases. Two programs with identical machiningCodeOf differ ONLY in comments.
 * @param {string} text
 * @returns {string}
 */
export function machiningCodeOf(text) {
  if (typeof text !== "string") return "";
  return text
    .split(/\r?\n/)
    .map((l) => (l.length > 10000 ? l.slice(0, 10000) : l)
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase())
    .filter((l) => l.length > 0)
    .join("\n");
}

/** True iff A and B have byte-identical machining content (differ only in comments/whitespace). */
export function machiningIdentical(aText, bText) {
  return machiningCodeOf(aText) === machiningCodeOf(bText);
}

/**
 * Assess a single program: PROPER = no ERROR-severity physics/safety finding.
 * @param {string} text  raw program text
 * @param {object} [ctx] {controller, iso_group, material_grade}
 * @returns {{proper:boolean, errorCount:number, warnCount:number, infoCount:number, maxSev:number, ruleSet:string[], findings:object[]}}
 */
export function assessProgram(text, ctx = {}) {
  const findings = lintLatheGcode(text, ctx);
  let errorCount = 0, warnCount = 0, infoCount = 0;
  for (const f of findings) {
    if (f.severity === "ERROR") errorCount++;
    else if (f.severity === "WARN") warnCount++;
    else if (f.severity === "INFO") infoCount++;
  }
  return {
    proper: errorCount === 0,
    errorCount, warnCount, infoCount,
    maxSev: maxSeverity(findings),
    ruleSet: [...new Set(findings.map((f) => f.rule))].sort(),
    findings,
  };
}

/**
 * Assess an A(original)↔B("enhanced") pair: per-program PROPER verdicts + machining-change
 * + finding-delta → a single verdict on whether B is a genuine upgrade.
 * @param {{aText:string, bText:string, ctx?:object}} args
 * @returns {{a:object, b:object, machiningChanged:boolean, fixed:string[], introduced:string[], persisted:string[], verdict:string}}
 */
export function assessABPair({ aText, bText, ctx = {} }) {
  const a = assessProgram(aText, ctx);
  const b = assessProgram(bText, ctx);
  const aRules = new Set(a.ruleSet);
  const bRules = new Set(b.ruleSet);
  const fixed = a.ruleSet.filter((r) => !bRules.has(r));        // present in A, gone in B
  const introduced = b.ruleSet.filter((r) => !aRules.has(r));   // new in B
  const persisted = a.ruleSet.filter((r) => bRules.has(r));     // in both
  const machiningChanged = !machiningIdentical(aText, bText);

  let verdict;
  if (!machiningChanged) {
    verdict = "annotation-passthrough"; // B == A machining; not a real upgrade (iter261 class)
  } else if (introduced.length > 0 && fixed.length === 0) {
    verdict = "regressed";              // B added safety/physics findings, fixed none
  } else if (fixed.length > 0 && introduced.length === 0) {
    verdict = "improved";               // B fixed findings, introduced none
  } else if (fixed.length > 0 && introduced.length > 0) {
    verdict = "mixed";                  // traded some findings for others
  } else {
    verdict = "changed-neutral";        // machining changed, no net finding delta
  }
  return { a, b, machiningChanged, fixed, introduced, persisted, verdict };
}

/**
 * Aggregate a list of single-program assessments + pair assessments into a report.
 * @param {{singles?:object[], pairs?:object[]}} input
 */
export function aggregateAssessment({ singles = [], pairs = [] } = {}) {
  const verdictCounts = {};
  for (const p of pairs) verdictCounts[p.verdict] = (verdictCounts[p.verdict] || 0) + 1;
  const properSingles = singles.filter((s) => s.proper).length;
  const properBs = pairs.filter((p) => p.b.proper).length;
  const ruleFreq = {};
  for (const s of singles) for (const r of s.ruleSet) ruleFreq[r] = (ruleFreq[r] || 0) + 1;
  for (const p of pairs) for (const r of p.b.ruleSet) ruleFreq[r] = (ruleFreq[r] || 0) + 1;
  return {
    singleCount: singles.length,
    pairCount: pairs.length,
    properSingleRate: singles.length ? +(properSingles / singles.length).toFixed(3) : null,
    properBRate: pairs.length ? +(properBs / pairs.length).toFixed(3) : null,
    passthroughRate: pairs.length
      ? +((verdictCounts["annotation-passthrough"] || 0) / pairs.length).toFixed(3) : null,
    verdictCounts,
    topRules: Object.entries(ruleFreq).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([rule, count]) => ({ rule, count })),
  };
}

// ───────────────────────── CLI ─────────────────────────
function walkDir(root, acc) {
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch (e) { process.stderr.write(`[warn] cannot read ${root}: ${e.message}\n`); return; }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) walkDir(full, acc);
    else if (e.isFile() && FILE_EXTS.has(path.extname(e.name).toLowerCase())) acc.push(full);
  }
}

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

function main(argv) {
  const args = argv.slice(2);
  const flag = (name) => args.includes(name);
  const val = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
  const asJson = flag("--json");
  const ctx = { controller: val("--controller", "okuma") };

  if (flag("--single")) {
    const file = val("--single");
    const text = readSafe(file);
    if (text == null) { process.stderr.write(`cannot read ${file}\n`); process.exit(2); }
    const r = assessProgram(text, ctx);
    if (asJson) { process.stdout.write(JSON.stringify({ file, ...r }, null, 2) + "\n"); return; }
    process.stdout.write(`=== ${file} ===\nPROPER: ${r.proper}  (errors=${r.errorCount} warns=${r.warnCount} infos=${r.infoCount})\n`);
    for (const f of r.findings) process.stdout.write(`  ${f.severity}\t[${f.rule}] ${f.msg}\n`);
    return;
  }

  const limit = parseInt(val("--limit", "100"), 10);

  // --pairs-jsonl: assess A/B pairs from a pre-built scan-jm-die-ab-pairs JSONL (avoids the
  // slow full-archive walk; individual a_path/b_path reads are fast even when the walk times out).
  if (flag("--pairs-jsonl")) {
    const jf = val("--pairs-jsonl");
    const raw = readSafe(jf);
    if (raw == null) { process.stderr.write(`cannot read ${jf}\n`); process.exit(2); }
    const recs = raw.split(/\r?\n/).filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.kind === "ab_pair" && r.a_path && r.b_path);
    const fullPairs = [], pairResults = [];
    for (const rec of recs.slice(0, limit)) {
      const aText = readSafe(rec.a_path), bText = readSafe(rec.b_path);
      if (aText == null || bText == null) continue;
      const r = assessABPair({ aText, bText, ctx });
      fullPairs.push(r);
      pairResults.push({ customer: rec.customer, part_num: rec.part_num, verdict: r.verdict,
        machiningChanged: r.machiningChanged, fixed: r.fixed, introduced: r.introduced,
        bProper: r.b.proper, bErrors: r.b.errorCount, aErrors: r.a.errorCount });
    }
    const agg = aggregateAssessment({ pairs: fullPairs });
    if (asJson) { process.stdout.write(JSON.stringify({ source: jf, aggregate: agg, pairs: pairResults }, null, 2) + "\n"); return; }
    process.stdout.write(`\n=== LATHE PROGRAM ASSESSMENT (${jf}) ===\n`);
    process.stdout.write(`pairs assessed: ${agg.pairCount} (of ${recs.length} in file)\n`);
    process.stdout.write(`B "enhanced" PROPER (lint-clean) rate: ${agg.properBRate}\n`);
    process.stdout.write(`annotation-passthrough rate (B == A machining): ${agg.passthroughRate}\n`);
    process.stdout.write(`verdicts: ${JSON.stringify(agg.verdictCounts)}\n`);
    process.stdout.write(`top findings: ${agg.topRules.map((r) => `${r.rule}(${r.count})`).join(", ")}\n`);
    return;
  }

  const root = val("--scan");
  if (!root) { process.stderr.write("usage: --single <file> | --scan <root> [--limit N] [--upgraded-only] [--json] | --pairs-jsonl <file> [--limit N] [--json]\n"); process.exit(2); }
  const upgradedOnly = flag("--upgraded-only");

  const files = [];
  walkDir(root, files);
  process.stderr.write(`scanned ${files.length} program files under ${root}\n`);
  const valid = files.map(parsePath).filter((p) => !p.parse_error);
  const groups = groupByPart(valid);
  const allPairs = pairAB(groups, { includeUnpaired: false })
    .filter((p) => !upgradedOnly || (p.b && p.b.full_path && p.b.full_path.includes("PRISM_UPGRADED")));

  const pairResults = [];
  for (const pair of allPairs.slice(0, limit)) {
    const aText = readSafe(pair.a.full_path), bText = readSafe(pair.b.full_path);
    if (aText == null || bText == null) continue;
    const r = assessABPair({ aText, bText, ctx });
    pairResults.push({ customer: pair.customer, part_num: pair.part_num, verdict: r.verdict,
      machiningChanged: r.machiningChanged, fixed: r.fixed, introduced: r.introduced,
      bProper: r.b.proper, bErrors: r.b.errorCount, aErrors: r.a.errorCount });
  }
  // re-run pure pairs for aggregate (need full objects)
  const fullPairs = [];
  for (const pair of allPairs.slice(0, limit)) {
    const aText = readSafe(pair.a.full_path), bText = readSafe(pair.b.full_path);
    if (aText == null || bText == null) continue;
    fullPairs.push(assessABPair({ aText, bText, ctx }));
  }
  const agg = aggregateAssessment({ pairs: fullPairs });
  if (asJson) { process.stdout.write(JSON.stringify({ root, aggregate: agg, pairs: pairResults }, null, 2) + "\n"); return; }
  process.stdout.write(`\n=== LATHE PROGRAM ASSESSMENT (${root}) ===\n`);
  process.stdout.write(`pairs assessed: ${agg.pairCount}\n`);
  process.stdout.write(`B "enhanced" PROPER (lint-clean) rate: ${agg.properBRate}\n`);
  process.stdout.write(`annotation-passthrough rate (B == A machining): ${agg.passthroughRate}\n`);
  process.stdout.write(`verdicts: ${JSON.stringify(agg.verdictCounts)}\n`);
  process.stdout.write(`top findings: ${agg.topRules.map((r) => `${r.rule}(${r.count})`).join(", ")}\n`);
}

// Run only as CLI (not when imported by tests).
const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
