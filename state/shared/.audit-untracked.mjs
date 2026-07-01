#!/usr/bin/env node
// PHASE B AUDIT — characterize 7,322 untracked files for cleanup decisions
// READ-ONLY. Writes a single audit report.

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const FILES_LIST = path.join(ROOT, "state/shared/.untracked-files-list.txt");
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const BUILD_STATE_PATH = path.join(ROOT, "state/shared/BUILD_STATE.json");
const AGENT_CHAT_PATH = path.join(ROOT, "state/shared/AGENT_CHAT.md");
const ROADMAP_INDEX_PATH = path.join(ROOT, "mcp-server/data/roadmap-index.json");

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

console.error(`  buildState keys: ${Object.keys(buildState).length}`);
console.error(`  agent chat KB: ${(chatMd.length/1024).toFixed(0)}`);
console.error(`  roadmap-index keys: ${Object.keys(roadmapIndex).length}`);

// ============= STAT EVERY FILE =============
console.error("\n=== Stat-ing all files ===");
const records = [];
let statErrors = 0;
let progress = 0;
for (const rel of files) {
  progress++;
  if (progress % 500 === 0) console.error(`  ${progress}/${files.length}`);
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
const CLUSTER_WINDOW = 300; // 5 minutes
const clusters = [];
let cur = null;
for (const r of sortedByMtime) {
  if (!cur || r.mtime - cur.lastMtime > CLUSTER_WINDOW) {
    cur = { firstMtime: r.mtime, lastMtime: r.mtime, files: [] };
    clusters.push(cur);
  } else {
    cur.lastMtime = r.mtime;
  }
  cur.files.push(r);
}
console.error(`  cluster count: ${clusters.length}`);

// Top dirs per cluster
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

// ============= GRAPH NODE LOOKUP — engines =============
console.error("\n=== Cross-referencing graph (engine wiring) ===");
const graphNodeById = new Map();
const graphNodeByLabel = new Map(); // basename of label
for (const n of G.nodes) {
  graphNodeById.set(n.id, n);
  if (n.label) {
    const firstLine = n.label.split("\n")[0].trim();
    graphNodeByLabel.set(firstLine.toLowerCase(), n);
  }
}
const engineNodes = G.nodes.filter(n => n.layer === "L7" || n.layer === "L8" || (n.id && n.id.startsWith("engine:")));
console.error(`  graph engine nodes: ${engineNodes.length}`);

// Edges from dispatcher to engine
const edgesByTarget = new Map();
for (const e of G.edges) {
  if (!edgesByTarget.has(e.to)) edgesByTarget.set(e.to, []);
  edgesByTarget.get(e.to).push(e);
}

// Untracked engines analysis
const untrackedEngines = records.filter(r => /^mcp-server\/src\/engines\/.*\.ts$/.test(r.rel));
console.error(`  untracked engines: ${untrackedEngines.length}`);

const engineWiringResults = [];
for (const eng of untrackedEngines) {
  const basename = path.basename(eng.rel, ".ts");
  const className = basename;
  const idCandidates = [
    `engine:${className}`,
    `engine:${className.charAt(0).toLowerCase()+className.slice(1)}`,
    `Engine:${className}`,
  ];
  let node = null;
  for (const id of idCandidates) {
    if (graphNodeById.has(id)) { node = graphNodeById.get(id); break; }
  }
  if (!node) {
    // Try label match (case-insensitive)
    node = graphNodeByLabel.get(className.toLowerCase());
  }
  // Find dispatcher refs to this engine via edges
  let upstreamDispatchers = [];
  if (node) {
    const incoming = G.edges.filter(e => e.to === node.id);
    upstreamDispatchers = incoming.map(e => {
      const src = graphNodeById.get(e.from);
      return src ? { id: src.id, label: (src.label||"").split("\n")[0], layer: src.layer } : { id: e.from };
    });
  }
  engineWiringResults.push({
    rel: eng.rel,
    basename,
    mtime: eng.mtime,
    size: eng.size,
    inGraph: !!node,
    nodeId: node?.id,
    nodeStatus: node?.status,
    nodeSubgroup: node?.subgroup,
    upstreamDispatcherCount: upstreamDispatchers.length,
    upstreamDispatchers: upstreamDispatchers.slice(0,3),
  });
}

const wiredEngines = engineWiringResults.filter(e => e.upstreamDispatcherCount > 0);
const inGraphButOrphanEngines = engineWiringResults.filter(e => e.inGraph && e.upstreamDispatcherCount === 0);
const trueOrphanEngines = engineWiringResults.filter(e => !e.inGraph);
console.error(`  wired (dispatcher refs): ${wiredEngines.length}`);
console.error(`  inGraph but orphan: ${inGraphButOrphanEngines.length}`);
console.error(`  true orphan (not in graph): ${trueOrphanEngines.length}`);

// ============= TESTS =============
console.error("\n=== Cross-referencing tests vs engines ===");
const untrackedTests = records.filter(r => /__tests__/.test(r.rel) && /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(r.rel));
console.error(`  untracked tests: ${untrackedTests.length}`);

// Build engine basename set (untracked + in-graph)
const untrackedEngineBaseSet = new Set(untrackedEngines.map(e => path.basename(e.rel, ".ts").toLowerCase()));
const graphEngineBaseSet = new Set();
for (const n of engineNodes) {
  if (n.label) graphEngineBaseSet.add(n.label.split("\n")[0].toLowerCase());
  if (n.id) graphEngineBaseSet.add(n.id.replace(/^engine:/i,"").toLowerCase());
}

let testsMatchingUntrackedEngine = 0;
let testsMatchingGraphEngine = 0;
let testsOrphan = 0;
const testOrphanSamples = [];
for (const t of untrackedTests) {
  const base = path.basename(t.rel).replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, "");
  const lower = base.toLowerCase();
  if (untrackedEngineBaseSet.has(lower)) {
    testsMatchingUntrackedEngine++;
  } else if (graphEngineBaseSet.has(lower)) {
    testsMatchingGraphEngine++;
  } else {
    testsOrphan++;
    if (testOrphanSamples.length < 20) testOrphanSamples.push(t.rel);
  }
}
console.error(`  tests matching untracked engine: ${testsMatchingUntrackedEngine}`);
console.error(`  tests matching graph engine: ${testsMatchingGraphEngine}`);
console.error(`  tests with no engine match: ${testsOrphan}`);

// ============= MILESTONES =============
console.error("\n=== Auditing milestone envelopes ===");
const untrackedMilestones1 = records.filter(r => r.rel.startsWith("mcp-server/data/milestones/") && r.rel.endsWith(".json"));
const untrackedMilestones2 = records.filter(r => r.rel.startsWith("data/milestones/") && r.rel.endsWith(".json"));
console.error(`  mcp-server/data/milestones: ${untrackedMilestones1.length}`);
console.error(`  data/milestones (top): ${untrackedMilestones2.length}`);

// roadmap-index references (depth-first scan for any string keys / arrays)
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

// Cross-check
function inferMilestoneId(rel) {
  const base = path.basename(rel, ".json");
  // Strip suffix patterns like -2026-05-12, -v1, etc
  return base.replace(/[-_](20\d{2}-\d{2}-\d{2}.*$|v\d+.*$)/, "").toUpperCase();
}
let milestonesInIndex = 0; // envelope on disk + referenced by index → roadmap-orphan
let milestonesGhost = 0;   // envelope on disk, NOT in index → ghost
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

// ============= CHAT-BUS — last 200 entries, recent week =============
console.error("\n=== Parsing AGENT_CHAT.md for author attribution ===");
// Crude parse: find lines like "## YYYY-MM-DD HH:MM:SS · <chat-id> ..." or similar
const chatEntries = [];
{
  const lines = chatMd.split(/\r?\n/);
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    // Try formats: "## 2026-05-12T16:22:30Z [bravo]" or "[2026-05-12 16:22] @alpha"
    const m1 = line.match(/(20\d{2}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?Z?)/);
    const m2 = line.match(/\b(alpha|bravo|charlie|delta|echo|foxtrot|claude-[a-z0-9]+)\b/i);
    if (m1) {
      const ts = m1[1].replace("T", " ").replace("Z","");
      const epoch = Math.floor(new Date(ts.includes("T")?ts:ts.replace(" ","T")+"Z").getTime()/1000);
      if (epoch && !isNaN(epoch)) {
        chatEntries.push({ epoch, line: line.slice(0,160), agent: m2 ? m2[1].toLowerCase() : null });
      }
    }
  }
}
console.error(`  chat entries parsed: ${chatEntries.length}`);

// For each cluster, find chat entries within ±5min
for (const c of clusters) {
  const lo = c.firstMtime - 300;
  const hi = c.lastMtime + 300;
  const hits = chatEntries.filter(e => e.epoch >= lo && e.epoch <= hi);
  c.chatHits = hits.slice(0, 5).map(h => ({
    when: new Date(h.epoch*1000).toISOString().slice(0,19),
    agent: h.agent,
    line: h.line,
  }));
  c.chatHitCount = hits.length;
  // Most-frequent agent in window
  const agentCounts = {};
  for (const h of hits) if (h.agent) agentCounts[h.agent] = (agentCounts[h.agent]||0)+1;
  c.suspectedAuthor = Object.entries(agentCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
}

// ============= FRONTEND =============
console.error("\n=== Frontend analysis ===");
const frontendFiles = records.filter(r => r.rel.startsWith("mcp-server/web/src/"));
console.error(`  frontend files: ${frontendFiles.length}`);
const frontendPending = buildState.frontend_merges_pending || buildState.pending_frontend_merges || buildState.frontends?.pending_merges || [];

// ============= WIRED ENGINE STATUS COUNT =============
const trulyWiredCount = wiredEngines.length;
console.error(`\n=== Done ===`);
console.error(`Truly wired engines (have dispatcher edge): ${trulyWiredCount}`);

// ============= BUILD REPORT =============
const formatDate = (epoch) => new Date(epoch*1000).toISOString().slice(0,19).replace("T", " ");
const fmtSize = (n) => n > 1024*1024 ? (n/1024/1024).toFixed(1)+"MB" : n > 1024 ? (n/1024).toFixed(1)+"KB" : n+"B";

const lines = [];
lines.push("# UNTRACKED DEBT AUDIT — Phase B");
lines.push(``);
lines.push(`**Generated:** ${new Date().toISOString()}  `);
lines.push(`**Scope:** 6-chat fleet untracked + modified files in \`H:/prism\`  `);
lines.push(`**Audit mode:** READ-ONLY — no git mutations  `);
lines.push(``);
lines.push(`---`);
lines.push(``);
lines.push(`## 1. TOP-LINE SUMMARY`);
lines.push(``);
lines.push(`| Metric | Count |`);
lines.push(`|--------|------:|`);
lines.push(`| Untracked files (??) | ${files.length} |`);
lines.push(`| Records stat'd | ${records.length} |`);
lines.push(`| Stat errors (paths likely with quoted whitespace) | ${statErrors} |`);
lines.push(`| MTime clusters (5-min windows) | ${clusters.length} |`);
lines.push(`| Untracked engines (.ts) | ${untrackedEngines.length} |`);
lines.push(`| - With dispatcher edge in graph (truly wired) | ${wiredEngines.length} |`);
lines.push(`| - In graph but no dispatcher edge | ${inGraphButOrphanEngines.length} |`);
lines.push(`| - Not in graph (true orphans) | ${trueOrphanEngines.length} |`);
lines.push(`| Untracked tests | ${untrackedTests.length} |`);
lines.push(`| - Pair with an untracked engine | ${testsMatchingUntrackedEngine} |`);
lines.push(`| - Pair with a graph-known engine | ${testsMatchingGraphEngine} |`);
lines.push(`| - Orphan tests (no engine match) | ${testsOrphan} |`);
lines.push(`| Untracked milestones (mcp-server/data/) | ${untrackedMilestones1.length} |`);
lines.push(`| Untracked milestones (top-level data/) | ${untrackedMilestones2.length} |`);
lines.push(`| - Referenced by roadmap-index (envelope-orphan) | ${milestonesInIndex} |`);
lines.push(`| - Ghost (not in index) | ${milestonesGhost} |`);
lines.push(`| Frontend files (mcp-server/web/src/) | ${frontendFiles.length} |`);
lines.push(``);
lines.push(`### Top-level dir breakdown`);
lines.push(``);
lines.push(`| Directory | Files |`);
lines.push(`|-----------|------:|`);
for (const [d, n] of Object.entries(dirCounts).sort((a,b)=>b[1]-a[1]).slice(0,15)) {
  lines.push(`| \`${d}/\` | ${n} |`);
}
lines.push(``);
lines.push(`### Top 2-level subdir breakdown (top 25)`);
lines.push(``);
lines.push(`| Subdir | Files |`);
lines.push(`|--------|------:|`);
for (const [d, n] of Object.entries(subdirCounts).filter(([k])=>k.split("/").length===2).sort((a,b)=>b[1]-a[1]).slice(0,25)) {
  lines.push(`| \`${d}/\` | ${n} |`);
}
lines.push(``);
lines.push(`---`);
lines.push(``);

lines.push(`## 2. CLUSTER TABLE — mtime ±5 min windows`);
lines.push(``);
lines.push(`Top 30 clusters by file count. Total ${clusters.length} clusters.`);
lines.push(``);
lines.push(`| # | First mtime | Last mtime | Files | Size | Chat hits | Suspected | Top dirs |`);
lines.push(`|---|-------------|------------|------:|------|-----:|----------|----------|`);
const sortedClusters = [...clusters].sort((a,b)=>b.files.length - a.files.length);
for (let i=0; i<Math.min(30, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  const td = c.topDirs.map(([d,n])=>`${d}(${n})`).join(", ");
  lines.push(`| C${i+1} | ${formatDate(c.firstMtime)} | ${formatDate(c.lastMtime)} | ${c.files.length} | ${fmtSize(c.totalSize)} | ${c.chatHitCount} | ${c.suspectedAuthor||"-"} | ${td} |`);
}
lines.push(``);
lines.push(`### Cluster details — top 10 with chat-bus correlations`);
lines.push(``);
for (let i=0; i<Math.min(10, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  lines.push(`#### Cluster C${i+1} — ${c.files.length} files (${formatDate(c.firstMtime)} → ${formatDate(c.lastMtime)})`);
  lines.push(``);
  lines.push(`- **Total size:** ${fmtSize(c.totalSize)}`);
  lines.push(`- **Top dirs:** ${c.topDirs.map(([d,n])=>`\`${d}\`(${n})`).join(", ")}`);
  lines.push(`- **Top subdirs:** ${c.topSubdirs.map(([d,n])=>`\`${d}\`(${n})`).join(", ")}`);
  lines.push(`- **Suspected author:** ${c.suspectedAuthor || "(no agent in chat-bus window)"}`);
  if (c.chatHits.length) {
    lines.push(`- **Chat-bus correlations (top 5):**`);
    for (const h of c.chatHits) {
      lines.push(`  - \`${h.when}Z\` ${h.agent ? `[${h.agent}]` : "[?]"}: ${h.line.slice(0,120).replace(/\|/g, "\\|")}`);
    }
  }
  // Sample 5 files
  const sampleFiles = c.files.slice(0,5).map(f => `\`${f.rel}\``);
  lines.push(`- **Sample files:** ${sampleFiles.join(", ")}`);
  lines.push(``);
}

lines.push(`---`);
lines.push(``);

lines.push(`## 3. ENGINE WIRING MAP — 622 untracked engines`);
lines.push(``);
lines.push(`| Status | Count | Pct |`);
lines.push(`|--------|------:|----:|`);
lines.push(`| **Truly wired** (≥1 dispatcher edge in graph) | ${wiredEngines.length} | ${(100*wiredEngines.length/untrackedEngines.length).toFixed(1)}% |`);
lines.push(`| **In graph but no edges** (built but not wired) | ${inGraphButOrphanEngines.length} | ${(100*inGraphButOrphanEngines.length/untrackedEngines.length).toFixed(1)}% |`);
lines.push(`| **True orphans** (not in graph at all) | ${trueOrphanEngines.length} | ${(100*trueOrphanEngines.length/untrackedEngines.length).toFixed(1)}% |`);
lines.push(``);
lines.push(`> NOTE: graph was last regenerated ${G.generatedAt}; engines created since then will appear "true orphan" until the graph rebuilds.`);
lines.push(``);
lines.push(`### Sample 10 — TRULY WIRED engines (commit-priority HIGH — they're real system work)`);
lines.push(``);
lines.push(`| Engine | mtime | Size | Dispatcher refs |`);
lines.push(`|--------|-------|-----:|-----------------|`);
for (const e of wiredEngines.slice(0,10)) {
  const d = e.upstreamDispatchers.map(d => `\`${d.label||d.id}\``).join(", ");
  lines.push(`| \`${e.rel}\` | ${formatDate(e.mtime)} | ${fmtSize(e.size)} | ${d} |`);
}
lines.push(``);
lines.push(`### Sample 10 — IN GRAPH BUT ORPHAN engines (built, recognized, never wired)`);
lines.push(``);
lines.push(`| Engine | mtime | Size | Graph status |`);
lines.push(`|--------|-------|-----:|--------------|`);
for (const e of inGraphButOrphanEngines.slice(0,10)) {
  lines.push(`| \`${e.rel}\` | ${formatDate(e.mtime)} | ${fmtSize(e.size)} | ${e.nodeStatus||"-"}/${e.nodeSubgroup||"-"} |`);
}
lines.push(``);
lines.push(`### Sample 10 — TRUE ORPHAN engines (created since last graph regen OR drafts)`);
lines.push(``);
lines.push(`| Engine | mtime | Size |`);
lines.push(`|--------|-------|-----:|`);
for (const e of trueOrphanEngines.slice(0,10)) {
  lines.push(`| \`${e.rel}\` | ${formatDate(e.mtime)} | ${fmtSize(e.size)} |`);
}
lines.push(``);
lines.push(`### Largest 10 untracked engines (any wiring status)`);
lines.push(``);
lines.push(`| Engine | Size | mtime | Wiring |`);
lines.push(`|--------|-----:|-------|--------|`);
const largestEngines = [...engineWiringResults].sort((a,b)=>b.size-a.size).slice(0,10);
for (const e of largestEngines) {
  const wiring = e.upstreamDispatcherCount > 0 ? `WIRED (${e.upstreamDispatcherCount})` : (e.inGraph ? "in-graph orphan" : "true orphan");
  lines.push(`| \`${e.rel}\` | ${fmtSize(e.size)} | ${formatDate(e.mtime)} | ${wiring} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 4. TEST COVERAGE MAP`);
lines.push(``);
lines.push(`| Category | Count | Pct |`);
lines.push(`|----------|------:|----:|`);
lines.push(`| Tests pairing with **untracked engine** (paired ship) | ${testsMatchingUntrackedEngine} | ${(100*testsMatchingUntrackedEngine/untrackedTests.length).toFixed(1)}% |`);
lines.push(`| Tests pairing with **graph-known engine** (orphan-test for committed engine) | ${testsMatchingGraphEngine} | ${(100*testsMatchingGraphEngine/untrackedTests.length).toFixed(1)}% |`);
lines.push(`| Tests with **no engine match** (truly orphan tests) | ${testsOrphan} | ${(100*testsOrphan/untrackedTests.length).toFixed(1)}% |`);
lines.push(``);
lines.push(`### Sample 20 — orphan tests (no matching engine in untracked OR graph)`);
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
lines.push(`| Referenced by \`roadmap-index.json\` (envelope-orphan in index) | ${milestonesInIndex} |`);
lines.push(`| Ghost milestones (envelope on disk, NOT in index) | ${milestonesGhost} |`);
lines.push(``);
lines.push(`> Note: roadmap-index ID extraction is heuristic (uppercased basename minus date/version suffix). Coverage may be ±10%.`);
lines.push(``);
lines.push(`### Sample — envelopes referenced by roadmap-index (5)`);
for (const s of indexedSamples.slice(0,5)) lines.push(`- \`${s.rel}\` → inferred id \`${s.id}\``);
lines.push(``);
lines.push(`### Sample — ghost envelopes (5)`);
for (const s of ghostSamples.slice(0,5)) lines.push(`- \`${s.rel}\` → inferred id \`${s.id}\``);
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 6. FRONTEND ANALYSIS — mcp-server/web/src`);
lines.push(``);
lines.push(`- **Total untracked:** ${frontendFiles.length}`);
lines.push(`- **BUILD_STATE.frontend_merges_pending:** ${Array.isArray(frontendPending) ? frontendPending.length : (typeof frontendPending === "object" ? Object.keys(frontendPending).length : "?")}`);
lines.push(``);
// Frontend cluster analysis
const fes = frontendFiles.sort((a,b)=>a.mtime-b.mtime);
const feClusters = [];
let fc = null;
for (const r of fes) {
  if (!fc || r.mtime - fc.lastMtime > 300) {
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
for (let i=0; i<Math.min(10,feClusters.length); i++) {
  const f = feClusters.sort((a,b)=>b.files.length-a.files.length)[i];
  if (!f) continue;
  lines.push(`| FE${i+1} | ${formatDate(f.firstMtime)} → ${formatDate(f.lastMtime)} | ${f.files.length} | ${f.topSubs.map(([s,n])=>`${s}(${n})`).join(", ")} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 7. DECISION MATRIX — per cluster`);
lines.push(``);
lines.push(`Decisions are heuristic — confirm with the suspected author before mass-commit.`);
lines.push(``);
lines.push(`| # | Files | Suspected author | Top dirs | Decision | Rationale |`);
lines.push(`|---|------:|------------------|----------|----------|-----------|`);
for (let i=0; i<Math.min(30, sortedClusters.length); i++) {
  const c = sortedClusters[i];
  const td = c.topDirs.map(([d])=>d).slice(0,2).join("/");
  // Heuristic decision
  let decision = "ARCHIVE";
  let rationale = "no chat-bus correlation; review before action";
  const allDataState = c.files.every(f => f.rel.startsWith("mcp-server/data/state/") || f.rel.startsWith("state/shared/") || f.rel.match(/\.(json|jsonl)$/));
  const isMilestoneOnly = c.files.every(f => /milestones\//.test(f.rel));
  const isStateGenerated = c.files.every(f => /state\/(shared|.*(?:report|inventory|registry|coverage|stats|state))/i.test(f.rel) || /\.(report|stats|metrics|cache)\./.test(f.rel));
  const isAgentFinding = c.files.every(f => /agent-(findings|slices)/.test(f.rel));
  const isMyAuthor = c.suspectedAuthor === "bravo" || (c.chatHitCount === 0 && c.files.length < 5);
  if (isAgentFinding) { decision = "COMMIT-AS-MAINTENANCE"; rationale = "agent-findings dirs are output of forge-audit-v2 / scrutiny — fine to commit as maintenance"; }
  else if (isMilestoneOnly) { decision = "CONTACT-OWNER"; rationale = "milestone envelopes — likely scope-defs from peer chats; verify before commit"; }
  else if (isStateGenerated) { decision = "COMMIT-AS-MAINTENANCE"; rationale = "auto-regenerated state files — safe to commit as maintenance"; }
  else if (c.suspectedAuthor && c.suspectedAuthor !== "bravo") { decision = "CONTACT-OWNER"; rationale = `chat-bus suggests ${c.suspectedAuthor} authored — confirm before commit`; }
  else if (c.suspectedAuthor === "bravo") { decision = "COMMIT-MINE"; rationale = "chat-bus correlates to bravo within window"; }
  else if (isMyAuthor) { decision = "COMMIT-MINE"; rationale = "small + no chat correlation — likely bravo's local work"; }
  else if (c.files.length > 200) { decision = "MASS-COMMIT-PEER-WIP"; rationale = "large coherent batch — likely a single peer chat's WIP, commit with --author preservation"; }
  else { decision = "CONTACT-OWNER"; rationale = "ambiguous — verify in chat-bus before action"; }
  lines.push(`| C${i+1} | ${c.files.length} | ${c.suspectedAuthor||"-"} | ${td} | **${decision}** | ${rationale} |`);
}
lines.push(``);

lines.push(`---`);
lines.push(``);

lines.push(`## 8. RECOMMENDED COMMIT BATCHES — safest 3-5 first`);
lines.push(``);
lines.push(`> All read-only here. Run from \`H:/prism\` after confirming author intent.`);
lines.push(``);

// Find safest clusters: small + auto-generated state OR small + bravo-correlated
const candidateBatches = sortedClusters.filter(c => {
  const allState = c.files.every(f => /^(mcp-server\/data\/state|state\/shared|mcp-server\/data\/docs)\//.test(f.rel) && f.rel.match(/\.(json|jsonl|md)$/));
  const allFindings = c.files.every(f => /agent-(findings|slices|findings-v\d)/.test(f.rel));
  return allState || allFindings;
}).slice(0, 5);

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
  lines.push(`(No fully-safe state-only clusters found — every cluster mixes auto-generated and source-code files. Recommend manual triage before any batch commit.)`);
  lines.push(``);
}

// Add a fallback bravo-correlated batch
const bravoCorrelated = sortedClusters.filter(c => c.suspectedAuthor === "bravo").slice(0, 3);
if (bravoCorrelated.length > 0) {
  lines.push(`### Bravo-correlated batches (chat-bus suggests these are bravo's work)`);
  lines.push(``);
  for (const c of bravoCorrelated) {
    lines.push(`- ${c.files.length} files at ${formatDate(c.firstMtime)} (${c.topDirs.map(([d])=>d).slice(0,3).join(", ")})`);
  }
  lines.push(``);
}

lines.push(`---`);
lines.push(``);

lines.push(`## APPENDIX A — Methodology`);
lines.push(``);
lines.push(`1. **Untracked file list:** \`git status --porcelain | grep '^??'\` — 7,322 entries.`);
lines.push(`2. **mtime clusters:** Files sorted by mtime, clustered when consecutive mtimes are <5 minutes apart.`);
lines.push(`3. **Engine wiring:** Engine basename → \`engine:<basename>\` lookup in \`system-graph.json\` nodes; outgoing dispatcher refs counted via incoming edges.`);
lines.push(`4. **Test pairing:** Test file's basename (minus \`.test/.spec.ts\`) compared against (a) untracked engine basenames and (b) graph engine labels/IDs.`);
lines.push(`5. **Milestone in-index:** Inferred milestone-id (uppercased basename minus date/version suffix) tested against \`roadmap-index.json\` strings recursively.`);
lines.push(`6. **Chat-bus author correlation:** \`AGENT_CHAT.md\` lines parsed for ISO timestamps + chat-id keywords; cluster gets author if a hit exists within ±5min of cluster's mtime range.`);
lines.push(``);
lines.push(`## APPENDIX B — Inputs`);
lines.push(``);
lines.push(`- \`state/shared/system-viz/system-graph.json\` — 22.3MB, ${G.nodes.length} nodes, ${G.edges.length} edges, regen ${G.generatedAt}`);
lines.push(`- \`state/shared/BUILD_STATE.json\` — ${Object.keys(buildState).length} keys`);
lines.push(`- \`state/shared/AGENT_CHAT.md\` — ${(chatMd.length/1024).toFixed(0)}KB`);
lines.push(`- \`mcp-server/data/roadmap-index.json\` — ${Object.keys(roadmapIndex).length} top-level keys`);
lines.push(``);
lines.push(`## APPENDIX C — Caveats`);
lines.push(``);
lines.push(`- **Stat-error files (${statErrors})** were excluded from analysis — these are paths git printed with quotes due to special chars (whitespace, double-quotes). Review separately.`);
lines.push(`- **Graph staleness:** ${G.generatedAt} — engines created after that show as "true orphan" but may already be wired in source. The 875 unwired-engine count from BUILD_STATE was pre-survey; this audit shows ${wiredEngines.length} of ${untrackedEngines.length} untracked engines have actual dispatcher edges in the graph.`);
lines.push(`- **Author attribution is heuristic.** Chat-bus correlation is suggestive, not authoritative — confirm via worktree check (\`git worktree list\` + per-worktree \`git status\`) before mass-committing.`);
lines.push(`- **Per memory rule:** never \`git stash\` in this shared multi-chat tree, never delete or move files. All decisions in this report respect that.`);
lines.push(``);

const REPORT_PATH = path.join(ROOT, "state/shared/UNTRACKED_DEBT_AUDIT.md");
fs.writeFileSync(REPORT_PATH, lines.join("\n"));
console.error(`\n=== Wrote: ${REPORT_PATH} (${(lines.join("\n").length/1024).toFixed(1)}KB) ===`);

// Emit machine-readable summary too for quick consumption
const SUMMARY_JSON = path.join(ROOT, "state/shared/.untracked-audit-summary.json");
fs.writeFileSync(SUMMARY_JSON, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totals: {
    untrackedFiles: files.length,
    statErrors,
    clusters: clusters.length,
    untrackedEngines: untrackedEngines.length,
    wiredEngines: wiredEngines.length,
    inGraphOrphanEngines: inGraphButOrphanEngines.length,
    trueOrphanEngines: trueOrphanEngines.length,
    untrackedTests: untrackedTests.length,
    testsPairedUntrackedEngine: testsMatchingUntrackedEngine,
    testsPairedGraphEngine: testsMatchingGraphEngine,
    testsOrphan: testsOrphan,
    untrackedMilestones1: untrackedMilestones1.length,
    untrackedMilestones2: untrackedMilestones2.length,
    milestonesInIndex,
    milestonesGhost,
    frontendFiles: frontendFiles.length,
  },
  topDirs: dirCounts,
  sortedClusterCounts: sortedClusters.slice(0,30).map(c=>({first:c.firstMtime,last:c.lastMtime,count:c.files.length,suspectedAuthor:c.suspectedAuthor,chatHits:c.chatHitCount})),
}, null, 2));
console.error(`Wrote: ${SUMMARY_JSON}`);
