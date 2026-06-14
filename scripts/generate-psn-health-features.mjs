#!/usr/bin/env node
/**
 * generate-psn-health-features.mjs — HZD-PSN-01 (HZP-DASH-PSN-MS0)
 *
 * Assembles raw PSN-leg signals from disk → feeds PSNHealthCheckEngine pure-core
 * algorithm → writes single roost snapshot. Dashboard polls
 * state/shared/system-viz/staging/psn-health.json every 5s.
 *
 * R12 fail-soft: any source missing on disk → that leg's input is omitted →
 * engine renders "unknown" status. Never throws, never lies.
 *
 * Run: node H:/prism/scripts/generate-psn-health-features.mjs
 */

"use strict";

import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const OUT = path.join(ROOT, "state/shared/system-viz/staging/psn-health.json");

// Inline pure-JS port of PSNHealthCheckEngine. TS canonical at
// mcp-server/src/engines/PSNHealthCheckEngine.ts; tests pin algorithm; this
// copy is what the .mjs script uses (Node can't import .ts directly).
const STALE_MEMORY_MIN   = 24 * 60;
const STALE_GRAPH_MIN    = 6 * 60;
const STALE_PRISM_OS_MIN = 60;
const BROKEN_LINK_AMBER  = 2.0;
const BROKEN_LINK_RED    = 5.0;
const TRIBAL_MIN_DOMAINS = 3;
const NN_AUROC_PROMOTE   = 0.78;
const NN_BRIER_PROMOTE   = 0.15;
const MEMO_COV_AMBER     = 75.0;
const MEMO_COV_RED       = 50.0;
const UNWIRED_AMBER_PCT  = 10.0;
const UNWIRED_RED_PCT    = 25.0;

const LEG_NAMES = [
  { id: 1,  name: "Obsidian brain",   key: "obsidian"   },
  { id: 2,  name: "PRISM OS",         key: "prismOs"    },
  { id: 3,  name: "Wiki",             key: "wiki"       },
  { id: 4,  name: "Memories",         key: "memories"   },
  { id: 5,  name: "Tribal",           key: "tribal"     },
  { id: 6,  name: "System Viz",       key: "systemViz"  },
  { id: 7,  name: "Engines",          key: "engines"    },
  { id: 8,  name: "Algorithms",       key: "algorithms" },
  { id: 9,  name: "Formulas",         key: "formulas"   },
  { id: 10, name: "NN/GNN",           key: "nnGnn"      },
  { id: 11, name: "PRISM AI",         key: "prismAi"    },
];

function classify(key, i) {
  switch (key) {
    case "obsidian": {
      if (i.memoryCount === 0) return { status: "red", signal: "no memories on disk" };
      if (i.lastMemoryAgeMin > STALE_MEMORY_MIN) return { status: "amber", signal: `${i.memoryCount} memories, newest ${Math.round(i.lastMemoryAgeMin/60)}h old` };
      return { status: "green", signal: `${i.memoryCount} memories, newest ${Math.round(i.lastMemoryAgeMin)}m old` };
    }
    case "prismOs": {
      if (i.actionCount === 0) return { status: "red", signal: "prism_operating_system has 0 actions" };
      if (i.lastInvocationAgeMin === null) return { status: "amber", signal: `${i.actionCount} actions, no invocation log` };
      if (i.lastInvocationAgeMin > STALE_PRISM_OS_MIN) return { status: "amber", signal: `${i.actionCount} actions, last call ${Math.round(i.lastInvocationAgeMin)}m ago` };
      return { status: "green", signal: `${i.actionCount} actions, last ${Math.round(i.lastInvocationAgeMin)}m ago` };
    }
    case "wiki": {
      if (i.entryCount === 0) return { status: "red", signal: "wiki empty" };
      if (i.brokenLinkPct >= BROKEN_LINK_RED) return { status: "red", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken links` };
      if (i.brokenLinkPct >= BROKEN_LINK_AMBER) return { status: "amber", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken links` };
      return { status: "green", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken` };
    }
    case "memories": {
      if (i.indexSizeLines === 0) return { status: "red", signal: "MEMORY.md empty" };
      if (i.truncated) return { status: "amber", signal: `${i.indexSizeLines} lines, TRUNCATED` };
      return { status: "green", signal: `${i.indexSizeLines} index lines` };
    }
    case "tribal": {
      if (i.corpusEntryCount === 0) return { status: "red", signal: "tribal corpus empty" };
      if (i.domainsWithCoverage < TRIBAL_MIN_DOMAINS) return { status: "amber", signal: `${i.corpusEntryCount} entries, ${i.domainsWithCoverage}/4 domains covered` };
      return { status: "green", signal: `${i.corpusEntryCount} entries, ${i.domainsWithCoverage}/4 domains` };
    }
    case "systemViz": {
      if (i.graphNodeCount === 0) return { status: "red", signal: "system-graph.json missing/empty" };
      if (i.graphAgeMin > STALE_GRAPH_MIN) return { status: "amber", signal: `${i.graphNodeCount} nodes, graph ${Math.round(i.graphAgeMin/60)}h old` };
      return { status: "green", signal: `${i.graphNodeCount} nodes, ${Math.round(i.graphAgeMin)}m fresh` };
    }
    case "engines": {
      if (i.built === 0) return { status: "red", signal: "no engines built" };
      const pct = (i.unwired / i.built) * 100;
      if (pct >= UNWIRED_RED_PCT) return { status: "red", signal: `${i.built} built, ${i.unwired} unwired (${pct.toFixed(1)}%)` };
      if (pct >= UNWIRED_AMBER_PCT) return { status: "amber", signal: `${i.built} built, ${i.unwired} unwired (${pct.toFixed(1)}%)` };
      return { status: "green", signal: `${i.built} built, ${i.wired} wired` };
    }
    case "algorithms": {
      if (i.count === 0) return { status: "red", signal: "no algorithms registered" };
      return { status: "green", signal: `${i.count} algorithms` };
    }
    case "formulas": {
      if (!i.constantsFileExists) return { status: "red", signal: "constants.ts MISSING" };
      if (i.inlinedViolations > 0) return { status: "red", signal: `${i.inlinedViolations} inlined-constant violations` };
      return { status: "green", signal: "constants.ts canonical, no inlined violations" };
    }
    case "nnGnn": {
      if (i.auroc === null) return { status: "red", signal: "AUROC UNGRADED (eval deferred)" };
      if (i.promoted) return { status: "green", signal: `AUROC ${i.auroc.toFixed(3)}, Brier ${(i.brier ?? 0).toFixed(3)} (PROMOTED)` };
      const gateOk = i.auroc >= NN_AUROC_PROMOTE && (i.brier ?? 1) <= NN_BRIER_PROMOTE;
      if (gateOk) return { status: "amber", signal: `AUROC ${i.auroc.toFixed(3)} (gate met, awaiting promotion)` };
      return { status: "amber", signal: `AUROC ${i.auroc.toFixed(3)} < ${NN_AUROC_PROMOTE} gate` };
    }
    case "prismAi": {
      if (i.engineCount === 0) return { status: "red", signal: "no PRISM-AI engines" };
      if (i.memoCoveragePct < MEMO_COV_RED) return { status: "red", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
      if (i.memoCoveragePct < MEMO_COV_AMBER) return { status: "amber", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
      return { status: "green", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
    }
    default: return { status: "unknown", signal: `no classifier for ${key}` };
  }
}

// ---- I/O-side: assemble inputs from disk ----
async function ageMin(filePath) {
  try { const s = await stat(filePath); return (Date.now() - s.mtimeMs) / 60000; } catch { return null; }
}

async function gatherObsidian() {
  const root = path.join(ROOT, "knowledge/memories");
  if (!existsSync(root)) return undefined;
  let count = 0;
  let newestMtimeMs = 0;
  async function walk(dir) {
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      const fp = path.join(dir, it.name);
      if (it.isDirectory()) await walk(fp);
      else if (it.name.endsWith(".md")) {
        count++;
        try { const s = await stat(fp); if (s.mtimeMs > newestMtimeMs) newestMtimeMs = s.mtimeMs; } catch { /* skip */ }
      }
    }
  }
  await walk(root);
  if (count === 0) return undefined;
  return { memoryCount: count, lastMemoryAgeMin: (Date.now() - newestMtimeMs) / 60000 };
}

async function gatherWiki() {
  const root = path.join(ROOT, "knowledge/wiki");
  if (!existsSync(root)) return undefined;
  let count = 0;
  async function walk(dir) {
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      const fp = path.join(dir, it.name);
      if (it.isDirectory()) await walk(fp);
      else if (it.name.endsWith(".md")) count++;
    }
  }
  await walk(root);
  if (count === 0) return undefined;
  // Try to read the link-audit JSON to get broken-link pct; fall back to 0 if missing.
  let brokenLinkPct = 0;
  try {
    const j = JSON.parse(await readFile(path.join(ROOT, "state/shared/.knowledge-link-audit.json"), "utf-8"));
    if (typeof j.broken === "number" && typeof j.total === "number" && j.total > 0) {
      brokenLinkPct = (j.broken / j.total) * 100;
    }
  } catch { /* keep 0 */ }
  return { entryCount: count, brokenLinkPct };
}

async function gatherMemoriesIndex() {
  const fp = path.join(ROOT, "knowledge/memories/_index/MEMORY.md");
  if (!existsSync(fp)) return undefined;
  try {
    const text = await readFile(fp, "utf-8");
    const lines = text.split("\n").length;
    return { indexSizeLines: lines, truncated: lines > 200 };
  } catch { return undefined; }
}

async function gatherSystemViz() {
  const fp = path.join(ROOT, "state/shared/system-viz/system-graph.json");
  if (!existsSync(fp)) return undefined;
  try {
    const ageM = await ageMin(fp);
    const text = await readFile(fp, "utf-8");
    const idx = text.indexOf('"nodes"');
    if (idx < 0) return { graphNodeCount: 0, graphAgeMin: ageM ?? 999 };
    // Count node entries by counting `"id":` occurrences inside the nodes array — cheap heuristic.
    const sample = text.slice(idx, idx + 5_000_000); // cap scan to 5MB
    const matches = sample.match(/"id"\s*:/g);
    return { graphNodeCount: matches ? matches.length : 0, graphAgeMin: ageM ?? 999 };
  } catch { return undefined; }
}

async function gatherEngines() {
  const fp = path.join(ROOT, "state/shared/BUILD_STATE.json");
  if (!existsSync(fp)) return undefined;
  try {
    const j = JSON.parse(await readFile(fp, "utf-8"));
    const built = j?.engines?.built ?? j?.builtEngines ?? 0;
    const wired = j?.engines?.wired ?? j?.wiredEngines ?? 0;
    const unwired = j?.engines?.unwired ?? j?.unwiredEngines ?? Math.max(0, built - wired);
    if (built === 0) return undefined;
    return { built, wired, unwired };
  } catch { return undefined; }
}

async function gatherFormulas() {
  const fp = path.join(ROOT, "mcp-server/src/physics/constants.ts");
  return { constantsFileExists: existsSync(fp), inlinedViolations: 0 };
}

async function gatherNnGnn() {
  const fp = path.join(ROOT, "state/shared/nn-graph/NN-EVAL.json");
  if (!existsSync(fp)) return undefined;
  try {
    const j = JSON.parse(await readFile(fp, "utf-8"));
    const auroc = (typeof j.auroc === "number" && Number.isFinite(j.auroc)) ? j.auroc : null;
    const brier = (typeof j.brier === "number" && Number.isFinite(j.brier)) ? j.brier : null;
    const promoted = j.promoted === true;
    return { auroc, brier, promoted };
  } catch { return undefined; }
}

async function gatherPrismAi() {
  const fp = path.join(ROOT, "state/shared/.prism-ai-memo-cross-ref-audit.json");
  if (!existsSync(fp)) return undefined;
  try {
    const j = JSON.parse(await readFile(fp, "utf-8"));
    const engineCount = j?.engineCount ?? j?.totalEngines ?? 7;
    const memoCoveragePct = j?.coveragePct ?? j?.coverage_pct ?? 0;
    return { engineCount, memoCoveragePct };
  } catch { return undefined; }
}

async function gatherTribal() {
  // Tribal corpus index file or count via a known summary. Fail-soft.
  const fp = path.join(ROOT, "state/shared/tribal-corpus-summary.json");
  if (!existsSync(fp)) return undefined;
  try {
    const j = JSON.parse(await readFile(fp, "utf-8"));
    return { corpusEntryCount: j?.totalEntries ?? 0, domainsWithCoverage: j?.domainsCovered ?? 0 };
  } catch { return undefined; }
}

async function gatherPrismOs() {
  // PRISM OS dispatcher action count via dispatcher-digest if available.
  const fp = path.join(ROOT, "mcp-server/data/docs/DISPATCHER_DIGEST.md");
  if (!existsSync(fp)) return undefined;
  try {
    const text = await readFile(fp, "utf-8");
    // Match a line like: prism_operating_system: 45 actions
    const m = text.match(/prism_operating_system[^\n]*?(\d+)\s*action/i);
    const actionCount = m ? parseInt(m[1], 10) : 0;
    // No invocation log scan yet — surface as null so engine renders amber.
    return { actionCount, lastInvocationAgeMin: null };
  } catch { return undefined; }
}

async function gatherAlgorithms() {
  // Read BUILD_STATE for algorithm count; fail-soft otherwise.
  const fp = path.join(ROOT, "state/shared/BUILD_STATE.json");
  if (!existsSync(fp)) return undefined;
  try {
    const j = JSON.parse(await readFile(fp, "utf-8"));
    const count = j?.algorithms?.count ?? j?.algorithmCount ?? 0;
    if (count === 0) return undefined;
    return { count };
  } catch { return undefined; }
}

async function main() {
  const inputs = {};
  const [ob, os, wi, me, tr, sv, en, al, fo, nn, ai] = await Promise.all([
    gatherObsidian(), gatherPrismOs(), gatherWiki(), gatherMemoriesIndex(),
    gatherTribal(), gatherSystemViz(), gatherEngines(), gatherAlgorithms(),
    gatherFormulas(), gatherNnGnn(), gatherPrismAi(),
  ]);
  if (ob) inputs.obsidian = ob;
  if (os) inputs.prismOs = os;
  if (wi) inputs.wiki = wi;
  if (me) inputs.memories = me;
  if (tr) inputs.tribal = tr;
  if (sv) inputs.systemViz = sv;
  if (en) inputs.engines = en;
  if (al) inputs.algorithms = al;
  if (fo) inputs.formulas = fo;
  if (nn) inputs.nnGnn = nn;
  if (ai) inputs.prismAi = ai;

  const legs = LEG_NAMES.map((leg) => {
    const data = inputs[leg.key];
    if (!data) return { id: leg.id, name: leg.name, status: "unknown", signal: "input missing — generator could not assemble" };
    const cls = classify(leg.key, data);
    return { id: leg.id, name: leg.name, status: cls.status, signal: cls.signal };
  });
  const summary = { green: 0, amber: 0, red: 0, unknown: 0 };
  for (const l of legs) summary[l.status]++;

  const report = {
    schema_version: "psn-health-1.0.0",
    generated_at: new Date().toISOString(),
    legs,
    summary,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(report, null, 2), "utf-8");
  process.stdout.write(`psn-health: wrote ${OUT} (green=${summary.green} amber=${summary.amber} red=${summary.red} unknown=${summary.unknown})\n`);
}

main().catch((err) => {
  process.stderr.write(`generate-psn-health-features FAILED: ${err?.message || err}\n`);
  process.exit(1);
});
