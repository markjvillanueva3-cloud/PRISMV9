#!/usr/bin/env node
// scripts/routing-utilization-audit.mjs
//
// ROUTING-GRAPH-COMPLETENESS / U-ROUTING-UTILIZATION-AUDIT (slot:alpha 2026-06-17).
// Operator directive: "do multiple rounds of loops to evaluate all your work everytime
// and ask if we're really utilizing the system to its fullest extent to produce high
// quality work efficiently."
//
// This is the EVALUATION deliverable: it answers "are we using the routing system to
// its fullest?" with NUMBERS, not prose (R12 -- prove with evidence). It consumes the
// three routing artifacts + the task-class policy and computes:
//   - feature coverage: are ALL wired actionable hooks reachable through the per-class
//     + universal projection? (conservation proof -- should be 100% or the catalog lost some)
//   - per-class DENSITY cross-referenced with prompt FREQUENCY: a class you do often
//     (build 39.7%) that is THIN on class-specific features/commands is the real
//     "under-utilized" signal -- not a rare class with few features.
//   - universal-vs-specific skew, knob (mutability) coverage, behavioralKind mix.
//   - a punch list of actionable gaps (e.g. a frequent class with 0 class-specific
//     features whose serving hooks mis-classify -> curate them into TASK_CLASS_POLICY).
// DETERMINISTIC (R5). Fail-loud if an artifact is missing (the audit is meaningless
// without its inputs -- unlike the template, this is an analysis tool, not a live path).
//
// Run:   node H:/prism/scripts/routing-utilization-audit.mjs   [--json]

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const CATALOG = path.join(PRISM, "state/shared/advisory-feature-catalog.json");
const SLASH_PLANS = path.join(PRISM, "state/shared/slash-command-plans.json");
const ROUTE_MAP = path.join(PRISM, "state/shared/operator-prompt-route-map.json");
const OUT = path.join(PRISM, "state/shared/routing-utilization-audit.json");
const SCHEMA_VERSION = 1;
const THIN_FEATURE_FLOOR = 3;   // a class with < this many class-specific actionable features is "thin"
const HIGH_FREQ_PCT = 5;        // a class at >= this % of prompt history is "high-frequency"

// ---- pure, testable core ---------------------------------------------------

/**
 * Pure: prompt frequency per class from the route map -> { cls: { count, pct } }.
 * Empty/malformed map -> {} (the audit degrades to no-frequency, still computes the rest).
 */
export function frequencyByClass(map) {
  const out = {};
  const classes = map && Array.isArray(map.classes) ? map.classes : [];
  for (const c of classes) {
    if (c && c.taskClass) out[c.taskClass] = { count: c.count || 0, pct: c.pct || 0 };
  }
  return out;
}

/**
 * Pure: the heart of the audit. Given the catalog, slash-plans byClass, the
 * per-class frequency, and the full task-class list, compute the utilization metrics
 * + a prioritized punch list. The KEY cross-reference: a HIGH-FREQUENCY class that is
 * THIN on class-specific features OR commands is an under-utilization gap weighted by
 * how often you actually do that work.
 */
export function computeUtilization(catalog, plansByClass, freq, allClasses) {
  const byTaskClass = (catalog && catalog.byTaskClass) || {};
  const universalCount = (catalog && catalog.universalCount) || 0;
  const actionableWired = (catalog && catalog.actionableWired) || 0;
  const classSpecific = (catalog && catalog.classSpecificCount) || 0;
  const byKind = (catalog && catalog.byKind) || {};
  const wired = (catalog && catalog.wired) || 0;
  const withKnob = (catalog && catalog.withKnob) || 0;

  // feature coverage: every wired actionable feature must be in a bucket (conservation).
  const projected = classSpecific + universalCount;
  const featureCoverage = actionableWired > 0 ? projected / actionableWired : 1;

  // per-class density (class-specific actionable features + class-specific commands).
  const perClass = {};
  for (const cls of allClasses) {
    const feats = (byTaskClass[cls] || []).length;
    const gates = (byTaskClass[cls] || []).filter((f) => f.kind === "block-gate").length;
    const cmds = Array.isArray(plansByClass && plansByClass[cls]) ? plansByClass[cls].length : 0;
    const f = freq[cls] || { count: 0, pct: 0 };
    perClass[cls] = { features: feats, gates, commands: cmds, freqCount: f.count, freqPct: f.pct };
  }

  // punch list: prioritize by frequency. A high-freq class that is thin is the worst.
  const punchList = [];
  for (const cls of allClasses) {
    const p = perClass[cls];
    const highFreq = p.freqPct >= HIGH_FREQ_PCT;
    if (p.features === 0) {
      punchList.push({
        severity: highFreq ? "P1" : "P2", cls, issue: "no class-specific actionable features",
        detail: `class '${cls}' (${p.freqPct}% of prompts) relies entirely on the ${universalCount} universal always-on features; its serving hooks mis-classify by name. Curate them into TASK_CLASS_POLICY.${cls}.hooks or strengthen the classifier signals.`,
      });
    } else if (p.features < THIN_FEATURE_FLOOR && highFreq) {
      punchList.push({
        severity: "P2", cls, issue: "high-frequency class is thin on class-specific features",
        detail: `class '${cls}' is ${p.freqPct}% of prompts but has only ${p.features} class-specific feature(s).`,
      });
    }
    if (p.commands === 0) {
      punchList.push({
        severity: highFreq ? "P2" : "P3", cls, issue: "no class-specific slash commands",
        detail: `class '${cls}' has no commands beyond the curated policy set in slash-command-plans.`,
      });
    }
  }
  // sort punch list: P1 < P2 < P3, then by freqPct desc
  const sev = { P1: 0, P2: 1, P3: 2 };
  punchList.sort((a, b) => (sev[a.severity] - sev[b.severity]) || ((perClass[b.cls].freqPct) - (perClass[a.cls].freqPct)));

  // featureCoverage is NOT in the score: it is ~1 BY CONSTRUCTION (the catalog's
  // conservation invariant classSpecific+universal===actionableWired), so it is a
  // pass/fail INTEGRITY check, not a coverage dial -- folding it into the mean would
  // add a self-congratulatory ~constant floor (scrutiny P2). It is reported separately
  // + surfaced as conservationOk (FAIL-LOUD if the upstream catalog ever broke).
  const conservationOk = featureCoverage === 1;
  // knobCoverage must count knobbed AMONG WIRED (catalog.withKnob counts unwired too ->
  // could exceed 1). Derive from features[] when present (correct); else clamp.
  const feats = Array.isArray(catalog && catalog.features) ? catalog.features : null;
  const wiredKnobbed = feats ? feats.filter((f) => f && f.wired && f.knob).length : Math.min(withKnob, wired);
  // the 3 EARNED legs (each a real, variable fraction in [0,1]); clamp defensively.
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const classCoverage = clamp01(allClasses.filter((c) => perClass[c].features > 0).length / allClasses.length);
  const cmdCoverage = clamp01(allClasses.filter((c) => perClass[c].commands > 0).length / allClasses.length);
  const knobCoverage = clamp01(wired > 0 ? wiredKnobbed / wired : 0);
  const utilizationScore = Number(((classCoverage + cmdCoverage + knobCoverage) / 3).toFixed(3));

  return {
    utilizationScore,                                   // mean of the 3 earned legs
    conservationOk,                                     // integrity: catalog lost no feature
    featureCoverage: Number(featureCoverage.toFixed(3)), // the conservation proof (not scored)
    classCoverage: Number(classCoverage.toFixed(3)),
    cmdCoverage: Number(cmdCoverage.toFixed(3)),
    knobCoverage: Number(knobCoverage.toFixed(3)),
    actionableWired, classSpecific, universalCount,
    universalSkew: actionableWired > 0 ? Number((universalCount / actionableWired).toFixed(3)) : 0,
    byKind,
    perClass,
    punchList,
  };
}

/** Pure: render the audit as a readable report. */
export function renderAudit(a) {
  if (!a) return "";
  const L = [];
  L.push(`# ROUTING UTILIZATION AUDIT -- score ${a.utilizationScore} / 1.0 (mean of 3 earned legs)`);
  L.push(`conservation ${a.conservationOk ? "OK" : "BROKEN -- catalog lost features!"} (feature-coverage ${a.featureCoverage}) | class-coverage ${a.classCoverage} | cmd-coverage ${a.cmdCoverage} | knob-coverage ${a.knobCoverage}`);
  L.push(`actionable ${a.actionableWired} = class-specific ${a.classSpecific} + universal ${a.universalCount} (universal skew ${a.universalSkew})`);
  L.push(`hook kinds: ${Object.entries(a.byKind).map(([k, n]) => `${k}:${n}`).join(" ")}`);
  L.push(`\n## per-class (features / gates / commands / prompt-freq%)`);
  const rows = Object.entries(a.perClass).sort((x, y) => y[1].freqPct - x[1].freqPct);
  for (const [cls, p] of rows) {
    L.push(`  ${cls.padEnd(12)} feat ${String(p.features).padStart(3)} | gate ${String(p.gates).padStart(3)} | cmd ${String(p.commands).padStart(3)} | ${p.freqPct}% (${p.freqCount})`);
  }
  L.push(`\n## punch list (${a.punchList.length})`);
  if (!a.punchList.length) L.push(`  (none -- every class has class-specific features + commands)`);
  for (const p of a.punchList) L.push(`  [${p.severity}] ${p.cls}: ${p.issue}\n        ${p.detail}`);
  return L.join("\n");
}

// ---- I/O -------------------------------------------------------------------

function loadJsonOrThrow(p, label) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { throw new Error(`routing-utilization-audit needs ${label} (${p}): ${e.message}`); }
}

async function buildAudit() {
  const graph = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
  const allClasses = graph.taskClasses();
  const catalog = loadJsonOrThrow(CATALOG, "advisory-feature-catalog.json (run build-advisory-feature-catalog.mjs)");
  const plans = loadJsonOrThrow(SLASH_PLANS, "slash-command-plans.json (run build-slash-command-plans.mjs)");
  const map = loadJsonOrThrow(ROUTE_MAP, "operator-prompt-route-map.json (run extract-operator-prompts.mjs)");
  const freq = frequencyByClass(map);
  const a = computeUtilization(catalog, plans.byClass || {}, freq, allClasses);
  return {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    note: "Routing-system utilization audit (U-ROUTING-UTILIZATION-AUDIT). Answers 'are we using the routing graph + catalog + slash-plans to their fullest?' with numbers: feature coverage, per-class density cross-referenced with prompt frequency, and a frequency-weighted punch list of under-served classes.",
    ...a,
  };
}

async function main() {
  const audit = await buildAudit();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(audit, null, 2));
  fs.renameSync(tmp, OUT);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(audit, null, 2)); return; }
  console.log(renderAudit(audit));
  console.log(`\n-> ${OUT}`);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("routing-utilization-audit.mjs");
if (isMain) main().catch((e) => { console.error("routing-utilization-audit failed:", e?.message || e); process.exit(1); });
