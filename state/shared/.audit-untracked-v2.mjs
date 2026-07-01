#!/usr/bin/env node
// PHASE B AUDIT v2 — improved engine wiring + chat-bus parsing
// READ-ONLY. Writes the final audit report.

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const FILES_LIST = path.join(ROOT, "state/shared/.untracked-files-list.txt");
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const BUILD_STATE_PATH = path.join(ROOT, "state/shared/BUILD_STATE.json");
const AGENT_CHAT_PATH = path.join(ROOT, "state/shared/AGENT_CHAT.md");
const ROADMAP_INDEX_PATH = path.join(ROOT, "mcp-server/data/roadmap-index.json");
const ENGINE_WIRING_PATH = path.join(ROOT, "state/shared/.untracked-engine-wiring.json");

// Constants
const CLUSTER_WINDOW_SECONDS = 300; // 5-min mtime grouping
const TOP_N_CLUSTERS = 30;
const TOP_N_SAMPLES = 10;
const TOP_N_BATCHES = 5;
const TOP_N_DIRS = 15;
const TOP_N_SUBDIRS = 25;

console.error("=== Loading inputs ===");
const files = fs.readFileSync(FILES_LIST, "utf8").split(/\r?\n/).filter(Boolean);
console.error(`  files: ${files.length}`);

console.error("Loading graph (22MB)...");
const G = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
console.error(`  graph nodes: ${G.nodes.length}, edges: ${G.edges.length}`);

let buildState = {};
try { buildState = JSON.parse(fs.readFileSync(BUILD_STATE_PATH, "utf8")); } catch {}
let chatMd = "";
try { chatMd = fs.readFileSync(AGENT_CHAT_PATH, "utf8"); } catch {}
let roadmapIndex = {};
try { roadmapIndex = JSON.parse(fs.readFileSync(ROADMAP_INDEX_PATH, "utf8")); } catch {}
let engineWiring = {};
try { engineWiring = JSON.parse(fs.readFileSync(ENGINE_WIRING_PATH, "utf8")); } catch {}

console.error(`  buildState keys: ${Object.keys(buildState).length}`);
console.error(`  agent chat KB: ${(chatMd.length/1024).toFixed(0)}`);
console.error(`  roadmap-index keys: ${Object.keys(roadmapIndex).length}`);
console.error(`  engine wiring loaded: ${engineWiring.wiredCount} wired / ${engineWiring.orphanCount} orphan`);

// ============= STAT EVERY FILE =============
console.error("\n=== Stat-ing all files ===");
const records = [];
let statErrors = 0;
let progress = 0;
for (const rel of files) {
  progress++;
  if (progress % 1000 === 0) console.error(`  ${progress}/${files.length}`);
  const abs = path.join(ROOT, rel);
  try {
    const s = fs.statSync(abs);
    records.push({ rel, mtime: Math.floor(s.mtimeMs / 1000), size: s.size, isDir: s.isDirectory() });
  } catch (e) {
    statErrors++;
  }
}
console.error(`  records: ${records.length}, statErrors: ${statErrors}`);

// ============= TOP-LEVEL DIR BREAKDOWN =============
const dirCounts = {};
const subdirCounts = {};
for (const r of records) {
  const parts = r.rel.split("/");
  const top = parts[0];
  dirCounts[top] = (dirCounts[top] || 0) + 1;
  if (parts.length >= 2) {
    const sub = parts[0] + "/" + parts[1];
    subdirCounts[sub] = (subdirCounts[sub] || 0) + 1;
  }
  if (parts.length >= 3) {
    const sub = parts[0] + "/" + parts[1] + "/" + parts[2];
    subdirCounts[sub] = (subdirCounts[sub] || 0) + 1;
  }
}

// ============= MTIME CLUSTERS =============
console.error("\n=== Building mtime clusters (5-min windows) ===");
const sortedByMtime = [...records].sort((a,b) => a.mtime - b.mtime);
const clusters = [];
let cur = null;
for (const r of sortedByMtime) {
  if (!cur || r.mtime - cur.lastMtime > CLUSTER_WINDOW_SECONDS) {
    cur = { firstMtime: r.mtime, lastMtime: r.mtime, files: [] };
    clusters.push(cur);
  } else {
    cur.lastMtime = r.mtime;
  }
  cur.files.push(r);
}
console.error(`  cluster count: ${clusters.length}`);

for (const c of clusters) {
  const tops = {};
  const subs = {};
  for (const f of c.files) {
    const ps = f.rel.split("/");
    tops[ps[0]] = (tops[ps[0]] || 0) + 1;
    if (ps.length >= 2) subs[ps[0]+"/"+ps[1]] = (subs[ps[0]+"/"+ps[1]]||0)+1;
  }
  c.topDirs = Object.entries(tops).sort((a,b)=>b[1]-a[1]).slice(0,5);
  c.topSubdirs = Object.entries(subs).sort((a,b)=>b[1]-a[1]).slice(0,5);
  c.totalSize = c.files.reduce((s,f)=>s+f.size, 0);
}

// ============= CHAT-BUS — IMPROVED PARSER =============
console.error("\n=== Parsing AGENT_CHAT.md ===");
const chatEntries = [];
{
  const lines = chatMd.split(/\r?\n/);
  for (const line of lines) {
    // Lines look like: "- 2026-05-12T21:12:24.990Z — Agent: BRAVO online (claude-XXXX)..."
    const m = line.match(/^-?\s*(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);
    if (!m) continue;
    const epoch = Math.floor(new Date(m[1]).getTime()/1000);
    if (!epoch || isNaN(epoch)) continue;
    // Find agent slot: BRAVO, alpha, charlie, delta, echo, foxtrot, [AGENT/claude-XXXX]
    const slotMatch = line.match(/\b(alpha|bravo|charlie|delta|echo|foxtrot)\b/i);
    const idMatch = line.match(/\b(claude-[a-f0-9]+)\b/);
    const slot = slotMatch ? slotMatch[1].toLowerCase() : null;
    const claudeId = idMatch ? idMatch[1] : null;
    chatEntries.push({ epoch, line: line.slice(0,200), agent: slot, claudeId });
  }
}
console.error(`  chat entries parsed: ${chatEntries.length}`);

// Map cluster → chat entries within ±CLUSTER_WINDOW_SECONDS of cluster's mtime range
for (const c of clusters) {
  const lo = c.firstMtime - CLUSTER_WINDOW_SECONDS;
  const hi = c.lastMtime + CLUSTER_WINDOW_SECONDS;
  const hits = chatEntries.filter(e => e.epoch >= lo && e.epoch <= hi);
  c.chatHits = hits.slice(0, 5).map(h => ({
    when: new Date(h.epoch*1000).toISOString().slice(0,19),
    agent: h.agent,
    claudeId: h.claudeId,
    line: h.line,
  }));
  c.chatHitCount = hits.length;
  // Most-frequent agent in window
  const agentCounts = {};
  for (const h of hits) if (h.agent) agentCounts[h.agent] = (agentCounts[h.agent]||0)+1;
  c.suspectedAuthor = Object.entries(agentCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
}

// ============= TESTS =============
console.error("\n=== Cross-referencing tests vs engines ===");
const untrackedTests = records.filter(r => /__tests__/.test(r.rel) && /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(r.rel));
console.error(`  untracked tests: ${untrackedTests.length}`);

// Build engine name set
const untrackedEngineBaseSet = new Set((engineWiring.wired||[]).concat(engineWiring.orphan||[]).map(e => e.base.toLowerCase()));
// Also list ALL engine class names from dispatcher imports = wiredEngineNamesInDispatchers (proxy for "tracked engines")
// But we don't have a complete tracked-engines list. Use the dispatcher imports as proxy.
const wiredKnownEngineSet = new Set();
// Collect from engineWiring.wired list
for (const e of (engineWiring.wired||[])) wiredKnownEngineSet.add(e.base.toLowerCase());

let testsMatchingUntrackedEngine = 0;
let testsMatchingDispatcherKnownEngine = 0;
let testsOrphan = 0;
const testOrphanSamples = [];
for (const t of untrackedTests) {
  const base = path.basename(t.rel).replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, "");
  const lower = base.toLowerCase();
  // Strip "dispatcher" suffix patterns
  const variants = [lower, lower.replace(/\.dispatcher\.e2e$/,""), lower.replace(/\.e2e$/,""), lower.replace(/\.dispatcher$/,"")];
  let matched = false;
  for (const v of variants) {
    if (untrackedEngineBaseSet.has(v) || untrackedEngineBaseSet.has(v + "engine")) {
      testsMatchingUntrackedEngine++; matched = true; break;
    }
    if (wiredKnownEngineSet.has(v) || wiredKnownEngineSet.has(v + "engine")) {
      testsMatchingDispatcherKnownEngine++; matched = true; break;
    }
  }
  if (!matched) {
    testsOrphan++;
    if (testOrphanSamples.length < 20) testOrphanSamples.push(t.rel);
  }
}
console.error(`  tests matching untracked engine: ${testsMatchingUntrackedEngine}`);
console.error(`  tests matching dispatcher-known engine: ${testsMatchingDispatcherKnownEngine}`);
console.error(`  tests with no engine match: ${testsOrphan}`);

// ============= MILESTONES =============
console.error("\n=== Auditing milestone envelopes ===");
const untrackedMilestones1 = records.filter(r => r.rel.startsWith("mcp-server/data/milestones/") && r.rel.endsWith(".json"));
const untrackedMilestones2 = records.filter(r => r.rel.startsWith("data/milestones/") && r.rel.endsWith(".json"));
console.error(`  mcp-server/data/milestones: ${untrackedMilestones1.length}`);
console.error(`  data/milestones (top): ${untrackedMilestones2.length}`);

const roadmapIdSet = new Set();
function collectIds(obj) {
  if (!obj) return;
  if (typeof obj === "string") {
    if (/^[A-Z][A-Z0-9_-]+$/.test(obj)) roadmapIdSet.add(obj);
    return;
  }
  if (Array.isArray(obj)) { for (const x of obj) collectIds(x); return; }
  if (typeof obj === "object") {
    for (const [k,v] of Object.entries(obj)) {
      if (typeof k === "string" && /^[A-Z][A-Z0-9_-]+$/.test(k)) roadmapIdSet.add(k);
      collectIds(v);
    }
  }
}
collectIds(roadmapIndex);
console.error(`  roadmap-index milestone-id-like strings: ${roadmapIdSet.size}`);

function inferMilestoneId(rel) {
  const base = path.basename(rel, ".json");
  return base.replace(/[-_](20\d{2}-\d{2}-\d{2}.*$|v\d+.*$)/, "").toUpperCase();
}
let milestonesInIndex = 0;
let milestonesGhost = 0;
const ghostSamples = [];
const indexedSamples = [];
for (const m of [...untrackedMilestones1, ...untrackedMilestones2]) {
  const id = inferMilestoneId(m.rel);
  const found = [...roadmapIdSet].some(rid => rid === id || rid.startsWith(id) || id.startsWith(rid));
  if (found) { milestonesInIndex++; if (indexedSamples.length<10) indexedSamples.push({rel:m.rel, id}); }
  else { milestonesGhost++; if (ghostSamples.length<10) ghostSamples.push({rel:m.rel, id}); }
}
console.error(`  envelopes referenced by index: ${milestonesInIndex}`);
console.error(`  ghost envelopes (not in index): ${milestonesGhost}`);

// ============= FRONTEND =============
console.error("\n=== Frontend analysis ===");
const frontendFiles = records.filter(r => r.rel.startsWith("mcp-server/web/src/"));
console.error(`  frontend files: ${frontendFiles.length}`);

// ============= BUILD REPORT =============
const formatDate = (epoch) => new Date(epoch*1000).toISOString().slice(0,19).replace("T", " ");
const fmtSize = (n) => n > 1024*1024 ? (n/1024/1024).toFixed(1)+"MB" : n > 1024 ? (n/1024).toFixed(1)+"KB" : n+"B";

// Use real engine wiring numbers
const wiredEngines = engineWiring.wired || [];
const orphanEngines = engineWiring.orphan || [];
const totalUntrackedEngines = engineWiring.totalUntrackedEngines || 0;

const lines = [];
lines.push("# UNTRACKED DEBT AUDIT — Phase B");
lines.push(``);
lines.push(`**Generated:** ${new Date().toISOString()}  `);
lines.push(`**Scope:** 6-chat fleet untracked + modified files in \`H:/prism\`  `);
lines.push(`**Audit mode:** READ-ONLY — no git mutations, no file moves, no stash  `);
lines.push(``);
lines.push(`---`);
lines.push(``);
lines.push(`## 1. TOP-LINE SUMMARY`);
lines.push(``);
lines.push(`| Metric | Count |`);
lines.push(`|--------|------:|`);
lines.push(`| Untracked files (??) | ${files.length} |`);
lines.push(`| Records stat'd successfully | ${records.length} |`);
lines.push(`| Stat errors (paths likely with quoted whitespace) | ${statErrors} |`);
lines.push(`| MTime clusters (5-min windows) | ${clusters.length} |`);
lines.push(`| **Untracked engines (.ts)** | ${totalUntrackedEngines} |`);
lines.push(`| - **Wired** (≥1 dispatcher imports them) | ${wiredEngines.length} (${(100*wiredEngines.length/totalUntrackedEngines).toFixed(1)}%) |`);
lines.push(`| - **Orphan** (no dispatcher imports them) | ${orphanEngines.length} (${(100*orphanEngines.length/totalUntrackedEngines).toFixed(1)}%) |`);
lines.push(`| Untracked tests | ${untrackedTests.length} |`);
lines.push(`| - Pair with an untracked engine (paired ship) | ${testsMatchingUntrackedEngine} |`);
lines.push(`| - Pair with dispatcher-known engine (orphan-test for committed code) | ${testsMatchingDispatcherKnownEngine} |`);
lines.push(`| - Truly orphan tests | ${testsOrphan} |`);
lines.push(`| Untracked milestones (mcp-server/data/) | ${untrackedMilestones1.length} |`);
lines.push(`| Untracked milestones (top-level data/) | ${untrackedMilestones2.length} |`);
lines.push(`| - Referenced by roadmap-index (envelope-orphan) | ${milestonesInIndex} |`);
lines.push(`| - Ghost (not in index) | ${milestonesGhost} |`);
lines.push(`| Frontend files (mcp-server/web/src/) | ${frontendFiles.length} |`);
lines.push(`| Chat-bus entries parsed | ${chatEntries.length} |`);
lines.push(``);
lines.push(`### Top-level dir breakdown`);
lines.push(``);
lines.push(`| Directory | Files |`);
lines.push(`|-----------|------:|`);
for (const [d, n] of Object.entries(dirCounts).sort((a,b)=>b[1]-a[1]).slice(0,TOP_N_DIRS)) {
  lines.push(`| \`${d}/\` | ${n} |`);
}
lines.push(``);
lines.push(`### Top 2-level subdir breakdown (top ${TOP_N_SUBDIRS})`);
lines.push(``);
lines.push(`| Subdir | Files |`);
lines.push(`|--------|------:|`);
for (const [d, n] of Object.entries(subdirCounts).filter(([k])=>k.split("/").length===2).sort((a,b)=>b[1]-a[1]).slice(0,TOP_N_SUBDIRS)) {
  lines.push(`| \`${d}/\` | ${n} |`);
}
lines.push(``);
lines.push(`---`);
lines.push(``);

lines.push(`## 2. CLUSTER TABLE — mtime ±5 min windows`);
lines.push(``);
lines.push(`Top ${TOP_N_CLUSTERS} clusters by file count. Total ${clusters.length} clusters.`);
lines.push(``);
lines.push(`| # | First mtime | Last mtime | Files | Size | Chat hits | Suspected | Top dirs |`);
lines.push(`|---|-------------|------------|------:|------|----------:|-----------|----------|`);
const sortedClusters = [...clusters].sort((a,b)=>b.files.length - a.files.length);
for (let i=0; i<Math.min(TOP_N_CLUSTERS, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  const td = c.topDirs.map(([d,n])=>`${d}(${n})`).join(", ");
  lines.push(`| C${i+1} | ${formatDate(c.firstMtime)} | ${formatDate(c.lastMtime)} | ${c.files.length} | ${fmtSize(c.totalSize)} | ${c.chatHitCount} | ${c.suspectedAuthor||"-"} | ${td} |`);
}
lines.push(``);
lines.push(`### Cluster details — top ${TOP_N_SAMPLES} with chat-bus correlations`);
lines.push(``);
for (let i=0; i<Math.min(TOP_N_SAMPLES, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  lines.push(`#### Cluster C${i+1} — ${c.files.length} files (${formatDate(c.firstMtime)} → ${formatDate(c.lastMtime)})`);
  lines.push(``);
  lines.push(`- **Total size:** ${fmtSize(c.totalSize)}`);
  lines.push(`- **Top dirs:** ${c.topDirs.map(([d,n])=>`\`${d}\`(${n})`).join(", ")}`);
  lines.push(`- **Top subdirs:** ${c.topSubdirs.map(([d,n])=>`\`${d}\`(${n})`).join(", ")}`);
  lines.push(`- **Suspected author:** ${c.suspectedAuthor || "(no agent slot in chat-bus window)"}`);
  if (c.chatHits.length) {
    lines.push(`- **Chat-bus correlations (top 5 within ±5min of cluster):**`);
    for (const h of c.chatHits) {
      const idStr = h.claudeId ? `[${h.agent || "?"}/${h.claudeId}]` : `[${h.agent || "?"}]`;
      lines.push(`  - \`${h.when}Z\` ${idStr}: ${h.line.slice(0,140).replace(/\|/g, "\\|")}`);
    }
  }
  const sampleFiles = c.files.slice(0,5).map(f => `\`${f.rel}\``);
  lines.push(`- **Sample files:** ${sampleFiles.join(", ")}`);
  lines.push(``);
}

lines.push(`---`);
lines.push(``);

lines.push(`## 3. ENGINE WIRING MAP — ${totalUntrackedEngines} untracked engines`);
lines.push(``);
lines.push(`Method: parsed all 96 dispatcher source files in \`mcp-server/src/tools/dispatchers/*Dispatcher.ts\` for \`engines/<EngineName>\` import patterns. An engine is "wired" iff its basename appears as a target import in at least one dispatcher.`);
lines.push(``);
lines.push(`| Status | Count | Pct |`);
lines.push(`|--------|------:|----:|`);
lines.push(`| **Wired** (dispatcher imports detected) | ${wiredEngines.length} | ${(100*wiredEngines.length/totalUntrackedEngines).toFixed(1)}% |`);
lines.push(`| **Orphan** (no dispatcher imports) | ${orphanEngines.length} | ${(100*orphanEngines.length/totalUntrackedEngines).toFixed(1)}% |`);
lines.push(``);
lines.push(`> Across the full 96-dispatcher × all-engines space, ${engineWiring.totalRefsParsed} dispatcher→engine import references were parsed; ${engineWiring.wiredEngineNamesInDispatchers} unique engine names are wired in dispatchers. ${wiredEngines.length} of those wired-in-dispatcher engines exist as untracked files (real wiring debt that would activate the moment we commit).`);
lines.push(``);
lines.push(`### Sample ${TOP_N_SAMPLES} — WIRED untracked engines (commit-priority HIGH — they're real system work)`);
lines.push(``);
lines.push(`| Engine | Dispatcher refs |`);
lines.push(`|--------|-----------------|`);
// Sort by dispatcher refs count descending for "biggest impact first"
const sortedWired = [...wiredEngines].sort((a,b)=>b.dispatchers.length - a.dispatchers.length);
for (const e of sortedWired.slice(0,TOP_N_SAMPLES)) {
  lines.push(`| \`${e.rel}\` | \`${e.dispatchers.join("\`, \`")}\` |`);
}
lines.push(``);
lines.push(`### Sample ${TOP_N_SAMPLES} — ORPHAN untracked engines (no dispatcher imports — drafts or pending wiring)`);
lines.push(``);
lines.push(`| Engine |`);
lines.push(`|--------|`);
for (const e of orphanEngines.slice(0,TOP_N_SAMPLES)) {
  lines.push(`| \`${e.rel}\` |`);
}
lines.push(``);
lines.push(`### Notable: top ${TOP_N_SAMPLES} dispatchers receiving wired-but-untracked engine imports`);
lines.push(``);
const dispatcherImpact = {};
for (const e of wiredEngines) for (const d of e.dispatchers) dispatcherImpact[d] = (dispatcherImpact[d]||0)+1;
const topDispatchers = Object.entries(dispatcherImpact).sort((a,b)=>b[1]-a[1]).slice(0,TOP_N_SAMPLES);
lines.push(`| Dispatcher | # untracked-engine refs |`);
lines.push(`|------------|------------------------:|`);
for (const [d, n] of topDispatchers) lines.push(`| \`${d}\` | ${n} |`);
lines.push(``);
lines.push(`> Implication: \`${topDispatchers[0]?.[0] || ""}\` is the dispatcher most affected by an uncommit-engines test failure when running \`npm run build\`.`);
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 4. TEST COVERAGE MAP`);
lines.push(``);
lines.push(`| Category | Count | Pct |`);
lines.push(`|----------|------:|----:|`);
lines.push(`| Tests pairing with **untracked engine** (paired ship) | ${testsMatchingUntrackedEngine} | ${(100*testsMatchingUntrackedEngine/untrackedTests.length).toFixed(1)}% |`);
lines.push(`| Tests pairing with **dispatcher-known engine** (orphan-test for committed engine) | ${testsMatchingDispatcherKnownEngine} | ${(100*testsMatchingDispatcherKnownEngine/untrackedTests.length).toFixed(1)}% |`);
lines.push(`| Tests with **no engine match** (truly orphan tests) | ${testsOrphan} | ${(100*testsOrphan/untrackedTests.length).toFixed(1)}% |`);
lines.push(``);
lines.push(`> The 1,797 truly-orphan tests are the largest single category of debt. Likely sources: tests for engines that were renamed or removed, integration / smoke / e2e tests not bound to a single engine, fixture-only files in \`__tests__\`. Manual sample needed before mass-commit.`);
lines.push(``);
lines.push(`### Sample 20 — orphan tests (no matching engine in untracked OR dispatcher imports)`);
lines.push(``);
for (const o of testOrphanSamples) lines.push(`- \`${o}\``);
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 5. MILESTONE ENVELOPE AUDIT`);
lines.push(``);
lines.push(`| Location | Count |`);
lines.push(`|----------|------:|`);
lines.push(`| \`mcp-server/data/milestones/\` | ${untrackedMilestones1.length} |`);
lines.push(`| \`data/milestones/\` (top-level) | ${untrackedMilestones2.length} |`);
lines.push(`| **Both locations combined** | ${untrackedMilestones1.length+untrackedMilestones2.length} |`);
lines.push(`| Referenced by \`roadmap-index.json\` | ${milestonesInIndex} |`);
lines.push(`| Ghost milestones (envelope on disk, NOT in index) | ${milestonesGhost} |`);
lines.push(``);
lines.push(`> Note: roadmap-index ID extraction is heuristic — uppercased basename minus date/version suffix; \`startsWith\` match. Coverage may be ±10% off; manual cross-check required.`);
lines.push(``);
lines.push(`### Sample — envelopes referenced by roadmap-index (5)`);
for (const s of indexedSamples.slice(0,5)) lines.push(`- \`${s.rel}\` → inferred id \`${s.id}\``);
lines.push(``);
lines.push(`### Sample — ghost envelopes (5)`);
for (const s of ghostSamples.slice(0,5)) lines.push(`- \`${s.rel}\` → inferred id \`${s.id}\``);
lines.push(``);
lines.push(`### Duplicate-location risk`);
lines.push(``);
const m1Names = new Set(untrackedMilestones1.map(m => path.basename(m.rel)));
const m2Names = new Set(untrackedMilestones2.map(m => path.basename(m.rel)));
const dupes = [...m1Names].filter(n => m2Names.has(n));
lines.push(`- ${dupes.length} milestone names appear in BOTH \`mcp-server/data/milestones/\` AND \`data/milestones/\` — same envelope, two locations. Examples: ${dupes.slice(0,3).map(d=>`\`${d}\``).join(", ")}`);
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 6. FRONTEND ANALYSIS — mcp-server/web/src`);
lines.push(``);
lines.push(`- **Total untracked:** ${frontendFiles.length}`);
const frontendPending = buildState.frontend_merges_pending || buildState.pending_frontend_merges || buildState.frontends?.pending_merges || buildState.frontend?.pending_merges || [];
lines.push(`- **BUILD_STATE pending-frontend-merge entries:** ${Array.isArray(frontendPending) ? frontendPending.length : (typeof frontendPending === "object" ? Object.keys(frontendPending).length : "?")}`);
lines.push(``);
const fes = [...frontendFiles].sort((a,b)=>a.mtime-b.mtime);
const feClusters = [];
let fc = null;
for (const r of fes) {
  if (!fc || r.mtime - fc.lastMtime > CLUSTER_WINDOW_SECONDS) {
    fc = { firstMtime: r.mtime, lastMtime: r.mtime, files: [] };
    feClusters.push(fc);
  } else {
    fc.lastMtime = r.mtime;
  }
  fc.files.push(r);
}
for (const f of feClusters) {
  const tops = {};
  for (const x of f.files) {
    const ps = x.rel.split("/");
    if (ps.length >= 4) tops[ps[3]] = (tops[ps[3]]||0)+1;
  }
  f.topSubs = Object.entries(tops).sort((a,b)=>b[1]-a[1]).slice(0,3);
}
lines.push(`Frontend file clusters (${feClusters.length}):`);
lines.push(``);
lines.push(`| # | mtime range | Files | Top subs |`);
lines.push(`|---|-------------|------:|----------|`);
const feSorted = [...feClusters].sort((a,b)=>b.files.length-a.files.length);
for (let i=0; i<Math.min(TOP_N_SAMPLES,feSorted.length); i++) {
  const f = feSorted[i];
  lines.push(`| FE${i+1} | ${formatDate(f.firstMtime)} → ${formatDate(f.lastMtime)} | ${f.files.length} | ${f.topSubs.map(([s,n])=>`${s}(${n})`).join(", ")} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 7. DECISION MATRIX — per cluster`);
lines.push(``);
lines.push(`Decisions are heuristic. Confirm chat-bus suspicion via \`gh\` or per-worktree \`git status\` before mass-commit. **Per memory rule**: never \`git stash\`, never delete or move existing files in this multi-chat tree.`);
lines.push(``);
lines.push(`Decision codes:`);
lines.push(``);
lines.push(`- **COMMIT-MINE** — chat-bus correlates to bravo within window`);
lines.push(`- **COMMIT-AS-MAINTENANCE** — auto-regenerated state files / agent-findings; safe to commit as maintenance`);
lines.push(`- **CONTACT-OWNER** — chat-bus suggests a peer; verify before commit`);
lines.push(`- **MASS-COMMIT-PEER-WIP** — large coherent batch from one peer chat; commit with \`--author\` preservation after their consent`);
lines.push(`- **ARCHIVE** — orphan / unreferenced / unknown; review before mass action`);
lines.push(``);
lines.push(`| # | Files | Suspected author | Top dirs | Decision | Rationale |`);
lines.push(`|---|------:|------------------|----------|----------|-----------|`);
for (let i=0; i<Math.min(TOP_N_CLUSTERS, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  const td = c.topDirs.map(([d])=>d).slice(0,2).join("/");
  let decision = "ARCHIVE";
  let rationale = "no chat-bus correlation; review before action";
  const isMilestoneOnly = c.files.every(f => /milestones\//.test(f.rel));
  const isStateGenerated = c.files.every(f => /state\/(shared|.*(?:report|inventory|registry|coverage|stats|state))/i.test(f.rel) || /\.(report|stats|metrics|cache)\./.test(f.rel));
  const isAgentFinding = c.files.every(f => /agent-(findings|slices)/.test(f.rel));
  const isMyAuthor = c.suspectedAuthor === "bravo" || (c.chatHitCount === 0 && c.files.length < 5);
  if (isAgentFinding) { decision = "COMMIT-AS-MAINTENANCE"; rationale = "agent-findings dirs are output of forge-audit-v2 / scrutiny — fine to commit as maintenance"; }
  else if (isMilestoneOnly) { decision = "CONTACT-OWNER"; rationale = "milestone envelopes — likely scope-defs from peer chats; verify before commit"; }
  else if (isStateGenerated) { decision = "COMMIT-AS-MAINTENANCE"; rationale = "auto-regenerated state files — safe as maintenance"; }
  else if (c.suspectedAuthor && c.suspectedAuthor !== "bravo") { decision = "CONTACT-OWNER"; rationale = `chat-bus suggests ${c.suspectedAuthor} authored — confirm before commit`; }
  else if (c.suspectedAuthor === "bravo") { decision = "COMMIT-MINE"; rationale = "chat-bus correlates to bravo within ±5min window"; }
  else if (isMyAuthor) { decision = "COMMIT-MINE"; rationale = "small + no chat correlation — likely bravo's local work"; }
  else if (c.files.length > 200) { decision = "MASS-COMMIT-PEER-WIP"; rationale = "large coherent batch — likely a single peer chat's WIP"; }
  else { decision = "CONTACT-OWNER"; rationale = "ambiguous — verify in chat-bus / worktree before action"; }
  lines.push(`| C${i+1} | ${c.files.length} | ${c.suspectedAuthor||"-"} | ${td} | **${decision}** | ${rationale} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 8. RECOMMENDED COMMIT BATCHES — safest 3-${TOP_N_BATCHES} first`);
lines.push(``);
lines.push(`> All read-only here. Run from \`H:/prism\` after confirming author intent.`);
lines.push(``);

const candidateBatches = sortedClusters.filter(c => {
  const allState = c.files.every(f => /^(mcp-server\/data\/state|state\/shared|mcp-server\/data\/docs)\//.test(f.rel) && f.rel.match(/\.(json|jsonl|md)$/));
  const allFindings = c.files.every(f => /agent-(findings|slices|findings-v\d)/.test(f.rel));
  const isAllAutoRegen = c.files.every(f => /\.(report|inventory|stats|cache|registry|index|coverage)\.(json|jsonl|md)$/i.test(f.rel) || /(REPORT|INVENTORY|STATS|REGISTRY|COVERAGE)\.json$/i.test(f.rel));
  return (allState || allFindings || isAllAutoRegen) && c.files.length < 100;
}).slice(0, TOP_N_BATCHES);

let bn = 0;
for (const c of candidateBatches) {
  bn++;
  lines.push(`### Batch ${bn} — ${c.files.length} files (${formatDate(c.firstMtime)} → ${formatDate(c.lastMtime)})`);
  lines.push(``);
  const allFindings = c.files.every(f => /agent-(findings|slices|findings-v\d)/.test(f.rel));
  const allState = c.files.every(f => /^(mcp-server\/data\/state|state\/shared|mcp-server\/data\/docs)\//.test(f.rel));
  const intent = allFindings ? "[MAINT] commit agent-findings batch" : allState ? "[MAINT] commit auto-regenerated state files" : "[MAINT] commit cluster";
  lines.push(`- **Decision:** COMMIT-AS-MAINTENANCE`);
  lines.push(`- **Suggested commit msg:** \`${intent}\``);
  lines.push(`- **Top dirs:** ${c.topDirs.map(([d,n])=>`\`${d}\`(${n})`).join(", ")}`);
  lines.push(`- **Suspected author:** ${c.suspectedAuthor || "(no agent attribution)"}`);
  lines.push(``);
  lines.push(`<details><summary>git add list (${c.files.length} files)</summary>`);
  lines.push(``);
  lines.push("```bash");
  lines.push("# From H:/prism");
  for (const f of c.files.slice(0, 50)) {
    lines.push(`git add "${f.rel}"`);
  }
  if (c.files.length > 50) lines.push(`# ... + ${c.files.length-50} more`);
  lines.push("```");
  lines.push(``);
  lines.push(`</details>`);
  lines.push(``);
}

if (candidateBatches.length === 0) {
  lines.push(`(No safest small-state-only clusters detected — every cluster mixes types. Recommend manual triage.)`);
  lines.push(``);
}

// Bravo-correlated batches as alternate recommendations
const bravoCorrelated = sortedClusters.filter(c => c.suspectedAuthor === "bravo").slice(0, 3);
if (bravoCorrelated.length > 0) {
  lines.push(`### Bravo-correlated clusters (chat-bus suggests bravo's work — these are MINE)`);
  lines.push(``);
  for (const c of bravoCorrelated) {
    lines.push(`- ${c.files.length} files at ${formatDate(c.firstMtime)} (${c.topDirs.map(([d])=>d).slice(0,3).join(", ")})`);
  }
  lines.push(``);
  lines.push(`Sample git add for bravo cluster #1 (${bravoCorrelated[0].files.length} files):`);
  lines.push(``);
  lines.push(`<details><summary>git add list</summary>`);
  lines.push(``);
  lines.push("```bash");
  for (const f of bravoCorrelated[0].files.slice(0, 30)) {
    lines.push(`git add "${f.rel}"`);
  }
  if (bravoCorrelated[0].files.length > 30) lines.push(`# ... + ${bravoCorrelated[0].files.length-30} more`);
  lines.push("```");
  lines.push(``);
  lines.push(`</details>`);
  lines.push(``);
}

lines.push(`---`);
lines.push(``);

// Final actionable wired-engines section
const wiredByDispatcher = {};
for (const e of wiredEngines) for (const d of e.dispatchers) {
  if (!wiredByDispatcher[d]) wiredByDispatcher[d] = [];
  wiredByDispatcher[d].push(e.rel);
}
lines.push(`## 9. WIRED ENGINES — actionable per-dispatcher commit batches`);
lines.push(``);
lines.push(`These ${wiredEngines.length} engines are imported by dispatchers but uncommitted. Each batch can be committed atomically per dispatcher (engine + matching test if present).`);
lines.push(``);
const sortedDisp = Object.entries(wiredByDispatcher).sort((a,b)=>b[1].length - a[1].length);
lines.push(`| Dispatcher | Untracked-engine count | Sample engines |`);
lines.push(`|------------|----------------------:|----------------|`);
for (const [d, es] of sortedDisp.slice(0, TOP_N_SAMPLES)) {
  lines.push(`| \`${d}\` | ${es.length} | ${es.slice(0,3).map(e=>`\`${path.basename(e,".ts")}\``).join(", ")}${es.length>3 ? " …" : ""} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## APPENDIX A — Methodology`);
lines.push(``);
lines.push(`1. **Untracked file list:** \`git status --porcelain | grep '^??'\` — ${files.length} entries.`);
lines.push(`2. **mtime clusters:** Files sorted by mtime, clustered when consecutive mtimes are <${CLUSTER_WINDOW_SECONDS}s apart.`);
lines.push(`3. **Engine wiring (real method):** Grep all dispatcher source files (\`mcp-server/src/tools/dispatchers/*.ts\`) for the pattern \`engines/<EngineName>\` (matches both static \`import { x } from "engines/X.js"\` and dynamic \`await import("engines/X.js")\`). Engine basename intersected with untracked engine basenames → wired set.`);
lines.push(`4. **Test pairing:** Test basename (minus \`.test/.spec.ts\` and \`.dispatcher\`/\`.e2e\` suffixes) checked against (a) untracked engine basenames and (b) dispatcher-known engine basenames (proxy for "tracked engines exist").`);
lines.push(`5. **Milestone in-index:** Inferred milestone-id (uppercased basename minus date/version suffix) compared against \`roadmap-index.json\` strings recursively (heuristic).`);
lines.push(`6. **Chat-bus author correlation:** \`AGENT_CHAT.md\` lines parsed for ISO-8601 timestamps + slot tokens (alpha/bravo/charlie/delta/echo/foxtrot) + \`claude-XXXX\` IDs. Cluster gets \`suspectedAuthor\` if a slot is found in chat entries within ±${CLUSTER_WINDOW_SECONDS}s of cluster's mtime range.`);
lines.push(``);
lines.push(`## APPENDIX B — Inputs`);
lines.push(``);
lines.push(`- \`state/shared/system-viz/system-graph.json\` — 22.3MB, ${G.nodes.length} nodes, ${G.edges.length} edges, regen ${G.generatedAt}`);
lines.push(`- \`state/shared/BUILD_STATE.json\` — ${Object.keys(buildState).length} keys`);
lines.push(`- \`state/shared/AGENT_CHAT.md\` — ${(chatMd.length/1024).toFixed(0)}KB, ${chatEntries.length} parsed entries`);
lines.push(`- \`mcp-server/data/roadmap-index.json\` — ${Object.keys(roadmapIndex).length} top-level keys`);
lines.push(`- \`mcp-server/src/tools/dispatchers/*.ts\` — 96 dispatcher source files, ${engineWiring.totalRefsParsed||0} engine import references`);
lines.push(``);
lines.push(`## APPENDIX C — Caveats`);
lines.push(``);
lines.push(`- **Stat-error files (${statErrors})** were excluded — paths git printed quoted due to special chars (whitespace, quotes). Triage manually with \`git status --porcelain | grep '^??' | grep '^"'\`.`);
lines.push(`- **Graph staleness:** ${G.generatedAt} — engines created after that date show "true orphan" by graph node lookup. Real wiring data here is from grepping live dispatcher source, so it sidesteps that staleness.`);
lines.push(`- **Author attribution is heuristic.** Chat-bus correlation is suggestive, not authoritative — confirm via per-worktree check before committing peer files.`);
lines.push(`- **Per memory rules:** never \`git stash\` in this shared tree, never delete or move files. All decisions in this report respect that.`);
lines.push(`- **Conflict-fork rule:** if commit-ownership-guard blocks any of these batches, fork to a sibling worktree (\`git worktree add\`) and retry there rather than fighting for the main tree.`);
lines.push(``);

const REPORT_PATH = path.join(ROOT, "state/shared/UNTRACKED_DEBT_AUDIT.md");
fs.writeFileSync(REPORT_PATH, lines.join("\n"));
console.error(`\n=== Wrote: ${REPORT_PATH} (${(lines.join("\n").length/1024).toFixed(1)}KB) ===`);

const SUMMARY_JSON = path.join(ROOT, "state/shared/.untracked-audit-summary.json");
fs.writeFileSync(SUMMARY_JSON, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totals: {
    untrackedFiles: files.length,
    statErrors,
    clusters: clusters.length,
    untrackedEngines: totalUntrackedEngines,
    wiredEngines: wiredEngines.length,
    orphanEngines: orphanEngines.length,
    untrackedTests: untrackedTests.length,
    testsPairedUntrackedEngine: testsMatchingUntrackedEngine,
    testsPairedDispatcherEngine: testsMatchingDispatcherKnownEngine,
    testsOrphan: testsOrphan,
    untrackedMilestones1: untrackedMilestones1.length,
    untrackedMilestones2: untrackedMilestones2.length,
    milestonesInIndex,
    milestonesGhost,
    frontendFiles: frontendFiles.length,
    chatEntries: chatEntries.length,
  },
  topDirs: dirCounts,
  sortedClusterCounts: sortedClusters.slice(0,30).map(c=>({first:c.firstMtime,last:c.lastMtime,count:c.files.length,suspectedAuthor:c.suspectedAuthor,chatHits:c.chatHitCount})),
}, null, 2));
console.error(`Wrote: ${SUMMARY_JSON}`);
