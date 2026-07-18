#!/usr/bin/env node
/**
 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
 *
 * Layers (top→bottom):
 *   L0 Personas        — 5 user roles
 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator / 7 Tier-3 specialists / Ollama models
 *   L4 Dispatchers     — every dispatcher.ts as its own node (~97)
 *   L5 Engine Domains  — top 40 engine clusters by count (wired + unwired)
 *   L6 Cores           — algorithms / schemas / physics constants / migrations
 *   L7 Registries      — 26 registries + materials/tools/machines/coatings detail
 *   L8 State & Wiki    — wiki subcategories + memory types + state subdirs + JM Die
 *   L9 Filesystem      — top-level H:/prism directories
 *   L10 Vault          — every memory + wiki file as its own node, [[wiki-link]] edges
 *
 * Symmetric concentric-ring layout per layer; sub-category arcs colored by hue.
 *
 * Output: state/shared/system-viz/architecture-graph.json
 *
 * RENAMED 2026-05-17 (U-VIZ-SPLIT-OUT-FILE, /forge-audit-v2 echo):
 * This script and `regen-viz.mjs` previously both wrote `system-graph.json`,
 * silently clobbering each other (last-writer-wins). `regen-viz.mjs` owns the
 * canonical merged ~372K-node graph that all awareness consumers expect
 * (carries `fsCoverage`). This script generates a DIFFERENT product — the
 * ~20K-node architecture-only graph (`schemaVersion 2.1.0`, no fsCoverage) —
 * and now writes to its own path so the two producers no longer fight.
 *
 * If a consumer wants the architecture-only graph, read
 * `state/shared/system-viz/architecture-graph.json`. The merged graph at
 * `system-graph.json` is the default everywhere else.
 *
 * Audit: state/shared/specs/DEV-TOOL-CONFLICT-AUDIT-2026-05-17.md (F1+F11)
 * Regression: CLAUDE.md ## Recent regressions (2026-05-17 entries)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  renderHtmlPage,
  HTML_REPORT_SCHEMA_VERSION,
} from "./lib/html-report-render.mjs";
import { buildAgentOverlay, parseChatJsonl } from "./lib/agent-overlay.mjs";
import { computeDomainCoverage } from "./lib/viz-domain-coverage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "state", "shared", "system-viz");
// U-VIZ-SPLIT-OUT-FILE 2026-05-17 — see top-of-file rationale.
// Was: path.join(OUT_DIR, "system-graph.json") — clobbered the regen-viz merged
// graph. Now distinct: architecture-only graph has its own path.
const OUT_FILE = path.join(OUT_DIR, "architecture-graph.json");
// OBSIDIAN-INTELLIGENCE-MS3/C1: summary HTML lives ALONGSIDE the existing
// graph.html 3D viewer. Different role: summary is info-dense, printable,
// air-gap-safe; graph.html is the interactive WebGL 3D viz.
const OUT_HTML = path.join(OUT_DIR, "system-graph-summary.html");
// OBSIDIAN-INTELLIGENCE-MS3/G2: the agent-status overlay is a SEPARATE sibling
// file, never embedded in system-graph.json — its live, time-varying agent
// state must not churn the canonical structural graph or its consumers.
const OUT_AGENT_OVERLAY = path.join(OUT_DIR, "agent-overlay.json");

const CLI_ARGS = new Set(process.argv.slice(2));
const FLAGS = { html: CLI_ARGS.has("--html") };

// ---------- helpers ----------
function safeReadJson(p, fb = null) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function safeListDir(p, ext = null) {
  try { return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isFile() && (!ext || d.name.endsWith(ext)))
    .map(d => d.name); } catch { return []; }
}
function safeListSub(p) {
  try { return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name); } catch { return []; }
}

// ---------- live inputs ----------
const buildState = safeReadJson(path.join(ROOT, "state", "shared", "BUILD_STATE.json")) ?? {};
const inv = (() => { try { return fs.readFileSync(path.join(ROOT, "PRISM-INVENTORY-LATEST.md"), "utf8"); } catch { return ""; }})();

const dispatcherFiles = safeListDir(path.join(ROOT, "mcp-server", "src", "tools", "dispatchers"), ".ts")
  .filter(f => f.endsWith("Dispatcher.ts") || f.endsWith("Middleware.ts") && !f.includes(".test."))
  .filter(f => !f.includes(".test."));
const registryFiles = safeListDir(path.join(ROOT, "mcp-server", "src", "registries"), ".ts")
  .filter(f => /^[A-Z]/.test(f) && !["base.ts","manager.ts","index.ts"].includes(f));
const webPages = safeListDir(path.join(ROOT, "mcp-server", "web", "src", "pages"), ".tsx");
// Only include subdirs that actually contain files (filter empty directories
// so the graph reflects real wiki/memory content, not stub scaffolding).
function dirHasContent(absPath) {
  if (!fs.existsSync(absPath)) return false;
  try {
    const out = fs.readdirSync(absPath, { withFileTypes: true });
    return out.some(e => e.isFile() && !e.name.startsWith("."));
  } catch { return false; }
}
const wikiDirs = safeListSub(path.join(ROOT, "knowledge", "wiki"))
  .filter(d => dirHasContent(path.join(ROOT, "knowledge", "wiki", d)));
const memoryDirs = safeListSub(path.join(ROOT, "knowledge", "memories"))
  .filter(d => dirHasContent(path.join(ROOT, "knowledge", "memories", d)));
const stateSubdirs = safeListSub(path.join(ROOT, "state"));
const stateSharedFiles = safeListDir(path.join(ROOT, "state", "shared"), ".md").length;
const fsRoots = safeListSub(ROOT).filter(d => !d.startsWith(".") && d !== "node_modules");
// Non-prism subtrees on H: root, accounted for at directory granularity
const hRootSubtrees = safeListSub("H:/").filter(d => !d.startsWith(".") && d !== "node_modules" && d.toLowerCase() !== "prism").slice(0, 24);

function pluck(re, str, fb = 0) { const m = str.match(re); return m ? Number(m[1]) : fb; }
const counts = {
  engines:     pluck(/\*\*Engines\*\*\s*\|\s*(\d+)/, inv, 3173),
  dispatchers: pluck(/\*\*Dispatchers\*\*\s*\|\s*(\d+)/, inv, dispatcherFiles.length || 97),
  actions:     pluck(/\*\*Actions\*\*\s*\|\s*(\d+)/, inv, 7302),
  algorithms:  pluck(/\*\*Algorithms\*\*\s*\|\s*(\d+)/, inv, 53),
  registries:  pluck(/\*\*Registries\*\*\s*\|\s*(\d+)/, inv, registryFiles.length || 26),
  tests:       pluck(/\*\*Tests\*\*\s*\|\s*(\d+)/, inv, 3415),
  srcHooks:    pluck(/\*\*Source Hooks\*\*\s*\|\s*(\d+)/, inv, 54),
  claudeHooks: pluck(/\*\*Claude Hooks\*\*\s*\|\s*(\d+)/, inv, 438),
  scripts:     pluck(/\*\*Scripts\*\*\s*\|\s*(\d+)/, inv, 467),
  slashLocal:  pluck(/Slash Commands \(local\)\*\*\s*\|\s*(\d+)/, inv, 242),
  slashUser:   pluck(/Slash Commands \(user\)\*\*\s*\|\s*(\d+)/, inv, 370),
  formulas:    pluck(/\*\*Formulas\*\*\s*\|\s*(\d+)/, inv, 499),
};
const headline = buildState.headline ?? {};
const built = headline.built_engines ?? 2269;
const unwired = headline.needs_wiring ?? 898;
const pendingFE = headline.needs_frontend_merge_count ?? 2;
const drift = headline.drift_milestones ?? 3;
// wikiEntries = the REAL size of the auto-generated architecture wiki tree
// (~23K: engines/actions/dispatchers/registries/skills/hooks/formulas/algorithms/
// milestones/monolith-modules/courses/tribal/tests/…). The old value (built_with_wiki
// from BUILD_STATE, ~774) only counted index.md lines — 30x understated. Authoritative
// count: knowledge/wiki/architecture/_stats.md's `total_entries`, falling back to a
// direct walk if the stats file is missing.
function countArchitectureWikiEntries() {
  const ARCH = path.join(ROOT, "knowledge", "wiki", "architecture");
  const STATS = path.join(ARCH, "_stats.md");
  try {
    const m = fs.readFileSync(STATS, "utf8").match(/^total_entries:\s*(\d+)/m);
    if (m) return Number(m[1]);
  } catch { /* fall through to walk */ }
  let n = 0;
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".md")) n++;
    }
  })(ARCH);
  return n || (headline.built_with_wiki ?? 774);
}
const wikiEntries = countArchitectureWikiEntries();

// ---------- categorization ----------
function dispatcherCategory(file) {
  const n = file.toLowerCase();
  if (/^(calc|cam|cad|cadautomation|caddrawing|cadregression|camfunction|cncops|edm|fiveaxis|fluidthermal|formingcasting|grinding|holepattern|materialprocessing|mechanicaldesign|mill|multiaxisprogram|secondaryops|thread|threadingpipeline|toolpath|turning|turningprogram|vibrationphysics|weldingjoining|adaptivecontrol|processcontrol|safety|machinekb)/.test(n)) return "manufacturing";
  if (/^(ai|aireasoning|intelligence|knowledge|knowledgeext|machininggkb|machiningknowledge|cad?drawing|machinesetup|machinelive|sp|sm|memory|monitoring|telemetry|guard|validation|ralph|omega|ml|pfp|provenpipeline|diagnosis|feasibility|multiop|scientificmath)/.test(n)) return "ai_intel";
  if (/^(session|context|hook|manus|generator|gsd|dev|infra|integration|l2engine|operatingsystem|nlhook|automation|scheduling|skillscript|atcs|autopilot|autonomous|agent|orchestration|local|cpl|algorithm)/.test(n)) return "system";
  if (/^(business|compliance|industry|partslibrary|inbox|tenant|auth|bridge|export|realtime|product|intake|security)/.test(n)) return "business";
  if (/^(awareness|document|doc|resource|shoppractice|grindersafety)/.test(n)) return "knowledge";
  return "other";
}
const CAT_COLORS = {
  manufacturing: "#22c55e",
  ai_intel:      "#06b6d4",
  system:        "#a78bfa",
  business:      "#f59e0b",
  knowledge:     "#ec4899",
  other:         "#94a3b8",
};

// Group web pages into 15 functional clusters
function pageCluster(name) {
  const n = name.toLowerCase();
  if (/quote|rfq|quoteanalytics|quotebuilder|quotefollowup/.test(n)) return "quoting";
  if (/quote|estimate|costestimator|jobprofitability|tooling/.test(n)) return "quoting";
  if (/lathe/.test(n)) return "lathe";
  if (/mill|milling/.test(n)) return "mill";
  if (/wireedm|edm/.test(n)) return "wedm";
  if (/cad|sfc|speedfeed|threadcalc/.test(n)) return "cad_calc";
  if (/cam|toolpath|postprocessor|setupsheet|proveout/.test(n)) return "cam";
  if (/erp|invoice|payroll|generalledger|purchaseorder|purchasing|customerportal|customers|salespipeline|commission|financialanalysis|machinerates|materialpricing/.test(n)) return "erp";
  if (/quality|spc|fai|cmm|inspect/.test(n)) return "quality";
  if (/hr|employee|timecard|safety|osha|hrcompliance/.test(n)) return "hr_safety";
  if (/shopfloor|kanban|kaizen|valuestream|capacity|scheduling|jobs|jobplanner|programrelease|maintenance|preventivemaintenance/.test(n)) return "shopfloor";
  if (/dashboard|executivedashboard|departmentdashboard|oee|telemetry|machinelive|fleet|reports|optimization|analytics/.test(n)) return "analytics";
  if (/knowledge|courseviewer|learning|aill|coursebrowser/.test(n)) return "learning";
  if (/setting|admin|featuretoggle|integrations|exports|datamanagement|machinedataaudit/.test(n)) return "admin";
  if (/diagnos|rootcause|whatif|stockoptimizer|forming|grinding|injection|sheetmetal|swiss|millturn|secondaryops|capture|pipeline|partslibrary|equipment|inventory|order|receiving|shipping|vendor|stockoptimizer|cncops|weld|vibration|thermal|mechanical|toolpathadvisor|camstrategy|setup|capacity|batch|landing|login|messages|shopprofile|additive|blueprint|printdrop|recovery|cam-ai-dashboard|shellgateway/.test(n)) return "specialty";
  return "specialty";
}

// ---------- node builders ----------
const nodes = [];
const edges = [];
let _id = 0;
function nid(p) { return `${p}.${++_id}`; }
function addNode(n) { nodes.push(n); return n.id; }
function addEdge(from, to, type, status = "active", intensity = 0.6) {
  if (!from || !to) return;
  edges.push({ from, to, type, status, intensity });
}

// ---------- L0 Personas ----------
const personas = [
  { label: "Operator",   info: "Shop floor — runs jobs, scans travelers, reports SPC" },
  { label: "Programmer", info: "Quotes, CAM programming, post-process, prove-out" },
  { label: "Quoter",     info: "Sales — RFQ intake, blueprint→quote, customer portal" },
  { label: "Boss",       info: "Executive dashboard, KPIs, OEE, financials, capacity" },
  { label: "Admin",      info: "Settings, integrations, compliance, data export" },
];
for (const p of personas) {
  addNode({ id: `p.${p.label.toLowerCase()}`, layer: "L0", subgroup: "personas", label: p.label, info: p.info, status: "built", size: 1.2 });
}

// ---------- L1 Frontend ----------
// 4 frontend variants/CLIs
const feVariants = [
  { id: "fe.web", label: "mcp-server/web", info: "144 React pages — primary web UI", status: "built", stack: "Next.js (thin)" },
  { id: "fe.cqask", label: "cqask/ui", info: "PENDING MERGE — Next.js 13 + AntD + Tailwind", status: "pending_merge", stack: "Next.js 13" },
  { id: "fe.cadquery", label: "mcp-cadquery/frontend", info: "PENDING MERGE — Vite + React 19 + Three.js", status: "pending_merge", stack: "Three.js" },
  { id: "fe.cli", label: "Claude / Codex / Gemini CLI", info: "Tier-1 master orchestrator + multi-CLI scrutiny — conceptual surface (no frontend dir)", status: "conceptual", stack: "MCP stdio" },
  { id: "fe.dispatch", label: "Phone / Dispatch", info: "Compact mobile + voice — conceptual surface (no frontend dir)", status: "conceptual", stack: "Mobile" },
];
for (const v of feVariants) addNode({ ...v, layer: "L1", subgroup: "variants", size: 1.1 });

// page clusters
const pageClusters = {};
for (const f of webPages) {
  const c = pageCluster(f.replace(/\.tsx$/, ""));
  pageClusters[c] = (pageClusters[c] || 0) + 1;
}
const clusterMeta = {
  quoting:   { label: "Quoting Suite",     hue: "#fb923c" },
  lathe:     { label: "Lathe Pages",       hue: "#22c55e" },
  mill:      { label: "Mill Pages",        hue: "#34d399" },
  wedm:      { label: "Wire EDM Pages",    hue: "#06b6d4" },
  cad_calc:  { label: "CAD / SFC / Calcs", hue: "#a855f7" },
  cam:       { label: "CAM / Post / Prove",hue: "#8b5cf6" },
  erp:       { label: "ERP Pages",         hue: "#f59e0b" },
  quality:   { label: "Quality / SPC / FAI",hue: "#ef4444" },
  hr_safety: { label: "HR / Safety / OSHA",hue: "#facc15" },
  shopfloor: { label: "Shop-Floor / Sched",hue: "#10b981" },
  analytics: { label: "Dashboards / OEE",  hue: "#3b82f6" },
  learning:  { label: "Knowledge / Learn", hue: "#ec4899" },
  admin:     { label: "Admin / Settings",  hue: "#94a3b8" },
  specialty: { label: "Specialty Pages",   hue: "#64748b" },
};
for (const [k, count] of Object.entries(pageClusters)) {
  const m = clusterMeta[k] ?? { label: k, hue: "#64748b" };
  addNode({
    id: `fe.pages.${k}`, layer: "L1", subgroup: "pages",
    label: `${m.label}\n(${count} pages)`,
    color: m.hue, status: count >= 8 ? "built" : "stub",
    size: 0.7 + Math.sqrt(count) * 0.18,
    info: `${count} React pages in this functional cluster`,
  });
}

// ---------- L2 Transport ----------
const transport = [
  { id: "tr.mcp",   label: "MCP Server :3100", info: "97 dispatchers / 7,302 actions / Node TS", color: "#a78bfa", size: 2.0 },
  { id: "tr.rest",  label: "REST API",         info: "JSON over HTTP", color: "#a78bfa", size: 1.0 },
  { id: "tr.grpc",  label: "gRPC",             info: "Protobuf binary RPC", color: "#a78bfa", size: 0.9 },
  { id: "tr.gql",   label: "GraphQL",          info: "Schema-first query layer", color: "#a78bfa", size: 0.9 },
  { id: "tr.ws",    label: "WebSocket",        info: "Real-time push (WS rooms + broadcast)", color: "#a78bfa", size: 1.1 },
  { id: "tr.auth",  label: "Auth (OAuth/RBAC/MFA)", info: "Token issuance + session + scope auth", color: "#a78bfa", size: 1.1 },
  { id: "tr.rate",  label: "Rate Limiter",     info: "3-tier: burst / minute / hour", color: "#a78bfa", size: 0.9 },
  { id: "tr.tele",  label: "Telemetry / Metrics", info: "Prometheus + Grafana export", color: "#a78bfa", size: 1.0 },
];
for (const t of transport) addNode({ ...t, layer: "L2", subgroup: "transport", status: "built" });

// ---------- L3 AI Hierarchy ----------
const ai = [
  { id: "ai.t1.claude",        label: "Tier-1: Claude\n(master orchestrator)", info: "Anthropic Claude — conversation + planning + dispatch", color: "#7dd3fc", size: 1.8 },
  { id: "ai.t2.coordinator",   label: "Tier-2: FullSystemAICoordinator", info: "Routes intent to domain specialists", color: "#67e8f9", size: 1.4 },
  { id: "ai.t3.mill",          label: "T3: Mill AGI",   info: "MillingAGIMasterEngine", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.lathe",         label: "T3: Lathe AGI",  info: "LatheAGIOrchestrator + KG", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.wedm",          label: "T3: Wire EDM AGI", info: "WEDMAGIOrchestrator", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.cad",           label: "T3: CAD AI",     info: "Autonomous CAD generation", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.cam",           label: "T3: CAM AI",     info: "CAM kernel + 6 tier-1 bridges", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.safety",        label: "T3: Safety AI",  info: "Omega gates + S(x) score", color: "#22d3ee", size: 1.0 },
  { id: "ai.t3.quality",       label: "T3: Quality AI", info: "SPC + Cpk + FAI + tolerance stack", color: "#22d3ee", size: 1.0 },
  { id: "ai.ollama.qwen",      label: "Ollama: qwen2.5-coder",  info: "Local code reasoning (offload)", color: "#a3e635", size: 0.9 },
  { id: "ai.ollama.llama",     label: "Ollama: llama3.2",       info: "Local general LLM (offload)", color: "#a3e635", size: 0.9 },
  { id: "ai.ollama.embed",     label: "Ollama: embeddings",     info: "Vector search backbone", color: "#a3e635", size: 0.9 },
  { id: "ai.ollama.reflect",   label: "Ollama: reflection",     info: "Multi-pass self-critique", color: "#a3e635", size: 0.9 },
];
for (const a of ai) {
  const sub = a.id.startsWith("ai.t1") ? "tier1" : a.id.startsWith("ai.t2") ? "tier2" : a.id.startsWith("ai.t3") ? "tier3" : "ollama";
  addNode({ ...a, layer: "L3", subgroup: sub, status: "built" });
}

// ---------- L4 Dispatchers — every file ----------
const dispatcherCatCount = { manufacturing:0, ai_intel:0, system:0, business:0, knowledge:0, other:0 };
const dispatcherNodes = [];
for (const f of dispatcherFiles.sort()) {
  if (f.includes(".test.") || f === "CLAUDE.md") continue;
  const cat = dispatcherCategory(f);
  dispatcherCatCount[cat]++;
  const id = `disp.${f.replace(".ts","").toLowerCase()}`;
  const label = f.replace("Dispatcher.ts","").replace("Middleware.ts","mw").replace(".ts","");
  const n = {
    id, layer: "L4", subgroup: cat,
    label, color: CAT_COLORS[cat],
    status: "built",
    size: 0.5,
    info: `${f} — category: ${cat}`,
  };
  addNode(n);
  dispatcherNodes.push(n);
}

// ---------- L5 Engine Domains (single-source — VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX) ----------
// Domains + counts come straight from BUILD_STATE.COVERAGE_BY_DOMAIN.rows
// (build-state-snapshot.mjs::computeCoverageByDomain) via the shared
// viz-domain-coverage lib — NOT a hand-edited array. The old `domainsBuiltIn`
// block carried hardcoded engine counts that drifted from BUILD_STATE, so the
// viz headline and BUILD_STATE.json disagreed on the same wired-engine metric.
// The lib surfaces the top-40 domains by engine count + one aggregated "rest"
// bucket; every L5 node sums back to the BUILD_STATE total exactly.
//
// The lib's #1 domain is BUILD_STATE's literal "Other" prefix bucket → node
// id `eng.other`. There is NO separate hand-rolled residual catchall anymore
// (it would collide on that id) — the lib's rest bucket (`eng.miscdomains`)
// is the catchall.
const { top: l5Domains, rest: l5Rest, coverage: l5Coverage } =
  computeDomainCoverage(buildState.COVERAGE_BY_DOMAIN?.rows ?? []);
if (l5Domains.length === 0) {
  // Single-source-of-truth input missing/empty — fail loud (R12) rather than
  // silently render an empty L5 layer + a false "0% wired" headline.
  console.warn(
    "  [L5] BUILD_STATE.COVERAGE_BY_DOMAIN.rows is empty or missing — the L5 "
    + "engine-domain layer will be empty. Regenerate with: node scripts/build-state-snapshot.mjs",
  );
}

function addEngineDomainNode(d, { isRest = false } = {}) {
  const fullyWired = d.unwired === 0;
  addNode({
    id: isRest ? "eng.miscdomains" : `eng.${d.domain.toLowerCase()}`,
    layer: "L5",
    // "unwired" subgroup = domain carries wiring debt — drives the phantom
    // suggestion edges + the phase-2 wire-up roadmap below.
    subgroup: fullyWired ? "wired" : "unwired",
    label: `${isRest ? "Misc Domains" : d.domain}\n(${d.wired}/${d.total})`,
    color: fullyWired ? "#22c55e" : "#f97316",
    status: fullyWired ? "built" : (d.unwired > 50 ? "stub_heavy" : "stub"),
    size: 0.55 + Math.sqrt(d.total) * 0.10,
    count: d.total,
    wired: d.wired,
    unwired: d.unwired,
    coverage_pct: d.coverage_pct,
    domain: isRest ? "MiscDomains" : d.domain,
    info: isRest
      ? `${d.domainCount} smaller domains aggregated — ${d.wired}/${d.total} engines wired (${d.coverage_pct}%)`
      : `${d.domain}: ${d.wired}/${d.total} engines wired (${d.coverage_pct}%)`
        + (d.unwired ? ` — ${d.unwired} need wiring` : ""),
  });
}
for (const d of l5Domains) addEngineDomainNode(d);
if (l5Rest) addEngineDomainNode(l5Rest, { isRest: true });

// ---------- L6 Cores (algorithms / schemas / constants / migrations) ----------
const cores = [
  { id: "core.algos",     label: `Algorithms (${counts.algorithms})`,    info: "Standalone algorithm modules", color: "#fbbf24", size: 1.1 },
  { id: "core.schemas",   label: "Zod Schemas",                          info: "Action-input validation across all dispatchers", color: "#fbbf24", size: 1.0 },
  { id: "core.physics",   label: "Physics Constants",                    info: "src/physics/constants.ts — Kienzle, Taylor, material specs", color: "#fbbf24", size: 1.2 },
  { id: "core.migrations",label: "Migrations",                           info: "Schema migrations N-1 backward compat", color: "#fbbf24", size: 0.7 },
  { id: "core.formulas",  label: `Formulas (${counts.formulas})`,        info: "Dimensioned formulas with uncertainty", color: "#fbbf24", size: 1.1 },
  { id: "core.tests",     label: `Test Suite (${counts.tests.toLocaleString()})`, info: "Vitest — real-behavior assertions", color: "#fbbf24", size: 1.4 },
  { id: "core.hooks_src", label: `Source Hooks (${counts.srcHooks})`,    info: "Engine-level fire/subscribe hooks", color: "#fbbf24", size: 0.9 },
  { id: "core.hooks_cl",  label: `Claude Hooks (${counts.claudeHooks})`, info: "Lifecycle gates: Pre/Post/SessionStart/Stop", color: "#fbbf24", size: 1.3 },
  { id: "core.scripts",   label: `Scripts (${counts.scripts})`,          info: "Maintenance / generation / inventory", color: "#fbbf24", size: 1.0 },
  { id: "core.skills",    label: `Skills (${counts.slashLocal+counts.slashUser})`, info: `${counts.slashLocal} local + ${counts.slashUser} user`, color: "#fbbf24", size: 1.2 },
];
for (const c of cores) addNode({ ...c, layer: "L6", subgroup: "core", status: "built" });

// ---------- L7 Registries ----------
for (const f of registryFiles.sort()) {
  const id = `reg.${f.replace(".ts","").toLowerCase()}`;
  const label = f.replace(".ts","").replace("Registry","");
  addNode({
    id, layer: "L7", subgroup: "registry",
    label, color: "#f97316", status: "built", size: 0.6,
    info: `${f} — registry module`,
  });
}
// add 4 high-value catalog summaries
addNode({ id: "reg.materials_cnt", layer: "L7", subgroup: "catalog", label: "Materials (live)", info: "Live material entries across registries", color: "#fb923c", size: 1.1, status: "built" });
addNode({ id: "reg.tools_cnt",     layer: "L7", subgroup: "catalog", label: "Tools (live)", info: "Live tool entries", color: "#fb923c", size: 1.1, status: "built" });
addNode({ id: "reg.machines_cnt",  layer: "L7", subgroup: "catalog", label: "Machines (live)", info: "Live machine profiles", color: "#fb923c", size: 1.0, status: "built" });
addNode({ id: "reg.tribal_tips",   layer: "L7", subgroup: "catalog", label: "Tribal Tips", info: "Shop-floor tribal knowledge", color: "#fb923c", size: 1.1, status: "built" });

// ---------- L8 State / Wiki / Knowledge ----------
for (const w of wikiDirs) {
  addNode({ id: `wiki.${w}`, layer: "L8", subgroup: "wiki",
    label: `wiki/${w}`, color: "#ec4899", status: "built", size: 0.65,
    info: `Wiki sub-category: ${w}` });
}
for (const m of memoryDirs) {
  addNode({ id: `mem.${m}`, layer: "L8", subgroup: "memory",
    label: `mem/${m}`, color: "#a855f7", status: "built", size: 0.6,
    info: `Memory category: ${m}` });
}
for (const s of stateSubdirs) {
  addNode({ id: `state.${s}`, layer: "L8", subgroup: "state",
    label: `state/${s}`, color: "#3b82f6", status: "built", size: 0.6,
    info: `State directory: ${s}` });
}
addNode({ id: "kn.jmdie",   layer: "L8", subgroup: "corpus", label: "JM Die Corpus\n24,545 NC files", info: "Production NC programs / 100+ customers", color: "#0ea5e9", status: "built", size: 1.4 });
addNode({ id: "kn.shared",  layer: "L8", subgroup: "state",  label: `state/shared\n${stateSharedFiles}+ md files`, info: "Cross-agent coordination state", color: "#3b82f6", status: "built", size: 1.0 });
addNode({ id: "kn.wikiidx", layer: "L8", subgroup: "wiki",   label: `wiki index\n${wikiEntries} entries`, info: "Karpathy LLM-Wiki index", color: "#ec4899", status: "built", size: 1.0 });

// ---------- L9 Filesystem (complete enumeration — no slice cap) ----------
const fsRootList = (fsRoots.length > 0 ? fsRoots : [
  "mcp-server","state","knowledge","JM DIE","scripts","data","docs","artifacts","backups","Resources","cad-engine","fusion-bridge","extracted","autonomous-tasks","_PROJECT_FILES"
]);
for (const r of fsRootList.sort()) {
  addNode({ id: `fs.${r.replace(/\s+/g,'_').toLowerCase()}`, layer: "L9", subgroup: "prism",
    label: `H:/prism/${r}/`, color: "#94a3b8", status: "built", size: 0.7,
    info: `prism/ subdirectory: ${r}` });
}
// Non-prism subtrees on H:/ — accounted for at directory granularity so the
// graph reflects the entire H: drive layout, not just the prism subtree.
for (const r of hRootSubtrees.sort()) {
  const id = `fs.h.${r.replace(/\s+/g,'_').toLowerCase()}`;
  addNode({ id, layer: "L9", subgroup: "h_root",
    label: `H:/${r}/`, color: "#475569", status: "built", size: 0.55,
    info: `Non-prism subtree on H:/ — ${r}` });
}

// ---------- L9 Git Worktrees (live `git worktree list` via audit-worktrees.mjs) ----------
// Worktrees are filesystem siblings of H:/prism, so they live in L9 — a dedicated
// `worktrees` subgroup, no new layer (zero viewer/tier changes). Reuses
// scripts/audit-worktrees.mjs as a READ-ONLY subprocess: it is the single source
// of truth for worktree enumeration + KEEP/MERGE/PRUNE/INVESTIGATE classification,
// so no git logic is duplicated here. Graph regen must NEVER fail because the
// audit hiccupped — every failure path degrades cleanly to "no worktree nodes".
const WORKTREE_VERDICT_COLOR = {
  KEEP:        "#22c55e", // active dev / live owner — green
  MERGE:       "#3b82f6", // settled, clean, unowned — ready to land — blue
  PRUNE:       "#94a3b8", // 0 ahead, tracked-clean — safe to remove — gray
  INVESTIGATE: "#f59e0b", // locked / detached / too-big / contradiction — amber
  // U-VIZ-WORKTREE-MAP-EXT (2026-05-15) — ghost verdicts for archived history.
  // Drained/parked worktrees are removed from the live fleet but the archive tag
  // + (optional) WIP-patch are the recoverability anchors. Surfacing them as
  // ghost nodes keeps the drain history visible in /system-viz.
  DRAINED:     "#7c3aed", // worktree removed + branch deleted; archive tag = SHA pin — purple
  PARKED:      "#475569", // worktree removed but branch survives on origin; merge candidate — slate
};
/**
 * Enumerate `archive/slot-worktree-ms0-{drain,park}-*` git tags and pair each
 * with its (optional) WIP-patch artifact on disk. Returns a Map keyed by the
 * worktree base name (last segment of the tag) so the worktree emit loop can
 * fold in `archive_tag` + `archive_status` + `wip_patch_*` on live entries AND
 * emit ghost nodes for entries that have no live worktree any more.
 *
 * Fail-soft: any git/fs failure returns an empty Map so the graph build is
 * never blocked by archive enumeration hiccups.
 */
function loadWorktreeArchiveIndex() {
  const index = new Map();
  // git tag -l — list archive tags only. The pattern is intentionally narrow:
  // the SLOT-WORKTREE-MS0 archive convention is `archive/slot-worktree-ms0-{drain,park}-<date>/<base>`.
  let raw = "";
  try {
    raw = execFileSync("git", ["tag", "-l", "archive/slot-worktree-ms0-*"], {
      cwd: ROOT, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
  } catch {
    return index;
  }
  const tags = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // Patch directories live under state/shared/archive-patches/<archive-name>/<base>.diff.
  // Walk every direct subdir once and key by `${dirName}::${base}` so a base name
  // shared across drain + park directories doesn't collide.
  const patchRoot = path.join(ROOT, "state", "shared", "archive-patches");
  const patchIndex = new Map(); // key: `${archiveName}::${base}` -> { path, bytes }
  if (fs.existsSync(patchRoot)) {
    let dirs = [];
    try { dirs = fs.readdirSync(patchRoot); } catch { dirs = []; }
    for (const d of dirs) {
      const dPath = path.join(patchRoot, d);
      let stat;
      try { stat = fs.statSync(dPath); } catch { continue; }
      if (!stat.isDirectory()) continue;
      let entries = [];
      try { entries = fs.readdirSync(dPath); } catch { entries = []; }
      for (const f of entries) {
        if (!f.endsWith(".diff")) continue;
        const base = f.replace(/\.diff$/, "");
        let fStat;
        try { fStat = fs.statSync(path.join(dPath, f)); } catch { continue; }
        patchIndex.set(`${d}::${base}`, {
          path: path.posix.join("state", "shared", "archive-patches", d, f),
          bytes: fStat.size,
        });
      }
    }
  }
  for (const tag of tags) {
    // tag shape: archive/slot-worktree-ms0-{drain|park}-<date>/<base>
    const m = tag.match(/^archive\/slot-worktree-ms0-(drain|park)-(\d{4}-\d{2}-\d{2})\/(.+)$/);
    if (!m) continue;
    const [, kind, date, base] = m;
    const archiveDir = `slot-worktree-ms0-${kind}-${date}`;
    const status = kind === "park" ? "PARKED" : "DRAINED";
    const patch = patchIndex.get(`${archiveDir}::${base}`) || null;
    // Resolve the tagged SHA (best-effort; no fatal if it fails).
    let sha = null;
    try {
      sha = execFileSync("git", ["rev-list", "-n", "1", tag], {
        cwd: ROOT, encoding: "utf8", timeout: 10_000, windowsHide: true,
      }).trim() || null;
    } catch { /* leave sha null */ }
    // If the same base appears under both drain and park (shouldn't happen but
    // defensively): drain wins because its tag implies the branch is gone.
    const existing = index.get(base);
    if (existing && existing.status === "DRAINED") continue;
    index.set(base, {
      tag,
      status,
      archive_date: date,
      sha,
      wip_patch_path: patch ? patch.path : null,
      wip_patch_bytes: patch ? patch.bytes : 0,
    });
  }
  return index;
}
function loadWorktreeAudit() {
  const auditScript = path.join(ROOT, "scripts", "audit-worktrees.mjs");
  if (!fs.existsSync(auditScript)) return null;
  let stdout = "";
  try {
    stdout = execFileSync(process.execPath, [auditScript, "--json", "--no-write"], {
      cwd: ROOT, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
  } catch (err) {
    // audit-worktrees exits 1 when git reports a problem but STILL prints valid
    // JSON to stdout — recover it from the thrown error before giving up.
    stdout = (err && typeof err.stdout === "string") ? err.stdout : "";
    if (!stdout.trim()) return null;
  }
  try {
    const parsed = JSON.parse(stdout);
    return (parsed && Array.isArray(parsed.worktrees)) ? parsed : null;
  } catch {
    return null;
  }
}
const worktreeAudit = loadWorktreeAudit();
// U-VIZ-WORKTREE-MAP-EXT (2026-05-15) — archive index is filesystem+git state,
// not part of the live audit. Loaded once and used both to enrich live nodes and
// to emit ghost nodes for tags whose worktree has been removed.
const worktreeArchive = loadWorktreeArchiveIndex();
let worktreeSummary = {
  total: 0, KEEP: 0, MERGE: 0, PRUNE: 0, INVESTIGATE: 0,
  DRAINED: 0, PARKED: 0, archived_total: 0,
  base: null, generatedAt: null,
};
if (worktreeAudit) {
  const wc = worktreeAudit.counts || {};
  worktreeSummary = {
    total: worktreeAudit.worktrees.length,
    KEEP: wc.KEEP ?? 0, MERGE: wc.MERGE ?? 0, PRUNE: wc.PRUNE ?? 0, INVESTIGATE: wc.INVESTIGATE ?? 0,
    DRAINED: 0, PARKED: 0, archived_total: 0,
    base: worktreeAudit.base ?? null,
    generatedAt: worktreeAudit.generatedAt ?? null,
  };
  // Hub anchor so the worktree fleet renders as one cluster in L9.
  addNode({
    id: "wt.root", layer: "L9", subgroup: "worktrees",
    label: `Git Worktrees\n${worktreeSummary.total} live · ${worktreeArchive.size} archived`,
    color: "#64748b", status: "built", size: 1.2,
    info: `git worktree fleet — KEEP ${worktreeSummary.KEEP} · MERGE ${worktreeSummary.MERGE} · ` +
          `PRUNE ${worktreeSummary.PRUNE} · INVESTIGATE ${worktreeSummary.INVESTIGATE} · ` +
          `archived ${worktreeArchive.size} (P2-DRAIN) · base ${worktreeSummary.base ?? "?"}`,
  });
  const seenWtIds = new Set(["wt.root"]);
  // Track which archive-index entries got folded into a LIVE worktree node so
  // the ghost-emit pass below only fires for the remainder (drained+parked).
  const liveBaseHits = new Set();
  for (const wt of worktreeAudit.worktrees) {
    const base = String(wt.path || "").replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "unknown";
    const idSafe = base.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    let wtId = `wt.${idSafe}`;
    let dupN = 2;
    while (seenWtIds.has(wtId)) { wtId = `wt.${idSafe}.${dupN++}`; }
    seenWtIds.add(wtId);
    const verdict = wt.verdict || "INVESTIGATE";
    const ahead = Number.isFinite(wt.ahead) ? wt.ahead : null;
    const behind = Number.isFinite(wt.behind) ? wt.behind : null;
    // log-scaled size by commits-ahead so a hot branch visibly grows; clamp 0.5..1.4
    const size = Math.min(1.4, Math.max(0.5, 0.5 + Math.log10((ahead ?? 0) + 1) * 0.35));
    const lastCommit = wt.lastCommitIso ? String(wt.lastCommitIso).slice(0, 10) : "—";
    const ownerNote = wt.owner ? ` · owner ${wt.owner.slot}${wt.owner.alive ? " ⚠ALIVE" : ""}` : "";
    // U-VIZ-WORKTREE-MAP-EXT — fold archive metadata into the live node if the
    // base name happens to match a known archive tag. The expected case is rare
    // (a worktree archive-tagged but not removed) — when it hits, the operator
    // can see both the live state AND the recoverability anchor.
    const archive = worktreeArchive.get(base) || null;
    if (archive) liveBaseHits.add(base);
    const archiveNote = archive
      ? ` · 📦${archive.status.toLowerCase()} ${archive.archive_date}${archive.wip_patch_bytes ? ` (+${archive.wip_patch_bytes}b WIP)` : ""}`
      : "";
    addNode({
      id: wtId, layer: "L9", subgroup: "worktrees",
      label: `${base}\n${wt.branch || "(detached)"}`,
      color: WORKTREE_VERDICT_COLOR[verdict] || WORKTREE_VERDICT_COLOR.INVESTIGATE,
      status: "built", size,
      info: `${wt.path} · ${wt.branch || "(detached)"} · +${ahead ?? "?"}/-${behind ?? "?"} · ` +
            `last ${lastCommit} · ${verdict}${ownerNote}` +
            (wt.dirtyCount ? ` · dirty:${wt.dirtyCount}` : "") +
            archiveNote,
      verdict,
      branch: wt.branch || null,
      ahead, behind,
      worktreePath: wt.path,
      lastCommitIso: wt.lastCommitIso ?? null,
      dirtyCount: Number.isFinite(wt.dirtyCount) ? wt.dirtyCount : null,
      locked: !!wt.locked,
      detached: !!wt.detached,
      owner: wt.owner ? { slot: wt.owner.slot, alive: !!wt.owner.alive } : null,
      reasons: Array.isArray(wt.reasons) ? wt.reasons.slice(0, 6) : [],
      archive_tag: archive ? archive.tag : null,
      archive_status: archive ? archive.status : null,
      archive_date: archive ? archive.archive_date : null,
      archive_sha: archive ? archive.sha : null,
      wip_patch_path: archive ? archive.wip_patch_path : null,
      wip_patch_bytes: archive ? archive.wip_patch_bytes : 0,
    });
    addEdge(wtId, "wt.root", "worktree", "active", 0.4);
  }
  // ---- Ghost archive nodes (drained + parked) ----
  // For each archive-tag whose base name didn't match a live worktree, emit a
  // ghost L9 node so the drain history is part of the visual index. These
  // represent recoverable history that isn't currently checked out anywhere.
  for (const [base, archive] of worktreeArchive.entries()) {
    if (liveBaseHits.has(base)) continue; // already folded into a live node
    const idSafe = base.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    let ghostId = `wt.archived.${idSafe}.${archive.status.toLowerCase()}`;
    let dupN = 2;
    while (seenWtIds.has(ghostId)) { ghostId = `wt.archived.${idSafe}.${archive.status.toLowerCase()}.${dupN++}`; }
    seenWtIds.add(ghostId);
    const verdict = archive.status; // "DRAINED" | "PARKED"
    const wipNote = archive.wip_patch_bytes
      ? ` · WIP ${archive.wip_patch_bytes}b @ ${archive.wip_patch_path}`
      : " · no WIP-patch (clean drain)";
    addNode({
      id: ghostId, layer: "L9", subgroup: "worktrees",
      label: `${base}\n(${verdict.toLowerCase()})`,
      color: WORKTREE_VERDICT_COLOR[verdict],
      status: "built", size: 0.55,
      info: `[archived ${verdict.toLowerCase()} ${archive.archive_date}] ` +
            `tag ${archive.tag}` +
            (archive.sha ? ` · sha ${archive.sha.slice(0, 8)}` : "") +
            wipNote +
            ` · recover: git checkout ${archive.tag}`,
      verdict,
      branch: null,
      ahead: null, behind: null,
      worktreePath: null,
      lastCommitIso: null,
      dirtyCount: null,
      locked: false,
      detached: false,
      owner: null,
      reasons: [verdict === "DRAINED"
        ? "Worktree removed + branch deleted; archive tag is the SHA pin."
        : "Worktree removed but branch survives on origin — merge candidate."],
      archive_tag: archive.tag,
      archive_status: archive.status,
      archive_date: archive.archive_date,
      archive_sha: archive.sha,
      wip_patch_path: archive.wip_patch_path,
      wip_patch_bytes: archive.wip_patch_bytes,
      ghost: true,
    });
    addEdge(ghostId, "wt.root", "worktree-archived", "archived", 0.25);
    if (verdict === "DRAINED") worktreeSummary.DRAINED++;
    else if (verdict === "PARKED") worktreeSummary.PARKED++;
    worktreeSummary.archived_total++;
  }
}

// ---------- L10 Vault (per-file memory + wiki nodes + wiki-link edges) ----------
function enumerateMarkdownFiles(rootAbs) {
  const out = [];
  function walk(dir, subgroup) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, subgroup === null ? e.name : subgroup);
      else if (e.isFile() && e.name.endsWith(".md")) {
        const rel = path.relative(rootAbs, full).replace(/\\/g, "/");
        out.push({ subgroup: subgroup ?? "_root", rel, full });
      }
    }
  }
  walk(rootAbs, null);
  return out;
}
const vaultMemory = enumerateMarkdownFiles(path.join(ROOT, "knowledge", "memories"));
const vaultWiki = enumerateMarkdownFiles(path.join(ROOT, "knowledge", "wiki"));

// Recall counts for L10 sizing — written by recall-counter-track.mjs hook on Read events
const recallState = safeReadJson(path.join(ROOT, "mcp-server", "data", "state", "wiki-recall-counts.json"));
const recallByKey = (recallState?.entries && typeof recallState.entries === "object")
  ? Object.fromEntries(Object.entries(recallState.entries).map(([k, e]) => [k, e?.count ?? 0]))
  : {};
function recallKeyFor(rootKey, subgroup, rel) {
  // Mirror of recall-counter-track.mjs deriveKey() format: <kind>/<category>/<stem>
  const stem = path.basename(rel, ".md");
  const kind = rootKey === "mem" ? "memory" : "wiki";
  return `${kind}/${subgroup}/${stem}`;
}
function recallSize(count) {
  // Logarithmic scale so a single re-read doesn't double the dot, but a hot
  // entry visibly grows. Base 0.35 (matches L10 default). Cap at ~1.5.
  const c = Number.isFinite(count) ? Math.max(0, count) : 0;
  return Math.min(1.5, 0.35 + Math.log10(c + 1) * 0.18);
}

const VAULT_SUBGROUP_COLORS = {
  feedback: "#a855f7", reference: "#3b82f6", project: "#22c55e",
  user: "#f59e0b", uncategorized: "#94a3b8", memories: "#a855f7",
  _index: "#64748b", _root: "#64748b",
  canonical: "#ec4899", lessons: "#facc15", consensus: "#06b6d4",
  architecture: "#fb923c", entities: "#10b981", wiki: "#ec4899",
};

function vaultIdFor(rootKey, subgroup, rel) {
  const stem = rel.replace(/\.md$/i, "").replace(/[\\/]/g, ".").toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_");
  return `vault.${rootKey}.${stem}`;
}
function normalizeWikiLabel(s) {
  return s.toLowerCase()
    .replace(/^(feedback|reference|project|user|mistake|mistakes|pattern|patterns|lesson|lessons|decision|decisions)_/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Build [[wiki-link]] target index — keys are lowercased filename stems and normalized variants
const vaultLabelMap = new Map();
function emitVaultNodes(files, rootKey, defaultColor) {
  for (const f of files) {
    const id = vaultIdFor(rootKey, f.subgroup, f.rel);
    const stem = path.basename(f.rel, ".md");
    const label = stem.length > 32 ? stem.slice(0, 29) + "..." : stem;
    const recall = recallByKey[recallKeyFor(rootKey, f.subgroup, f.rel)] ?? 0;
    addNode({
      id, layer: "L10", subgroup: f.subgroup,
      label, color: VAULT_SUBGROUP_COLORS[f.subgroup] ?? defaultColor,
      status: "built", size: recallSize(recall),
      info: `${rootKey}/${f.subgroup}/${stem}${recall > 0 ? ` · ${recall} recall(s)` : ""}`,
      recall,
    });
    const lower = stem.toLowerCase();
    if (!vaultLabelMap.has(lower)) vaultLabelMap.set(lower, id);
    const norm = normalizeWikiLabel(stem);
    if (norm && !vaultLabelMap.has(norm)) vaultLabelMap.set(norm, id);
  }
}
emitVaultNodes(vaultMemory, "mem", "#a855f7");
emitVaultNodes(vaultWiki, "wiki", "#ec4899");

const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;
let wikiLinkEdgeCount = 0;
let wikiLinkBrokenCount = 0;
function mineWikiLinks(files, rootKey) {
  for (const f of files) {
    let body;
    try { body = fs.readFileSync(f.full, "utf8"); } catch { continue; }
    const fromId = vaultIdFor(rootKey, f.subgroup, f.rel);
    const seen = new Set();
    let m;
    while ((m = WIKI_LINK_RE.exec(body)) !== null) {
      const raw = m[1].trim();
      const target = vaultLabelMap.get(raw.toLowerCase())
        ?? vaultLabelMap.get(normalizeWikiLabel(raw));
      if (!target) { wikiLinkBrokenCount++; continue; }
      if (target === fromId || seen.has(target)) continue;
      seen.add(target);
      addEdge(fromId, target, "wiki_link", "active", 0.5);
      wikiLinkEdgeCount++;
    }
  }
}
mineWikiLinks(vaultMemory, "mem");
mineWikiLinks(vaultWiki, "wiki");

// L8 category buckets contain the individual L10 files
for (const f of vaultMemory) {
  const childId = vaultIdFor("mem", f.subgroup, f.rel);
  const catId = `mem.${f.subgroup}`;
  if (nodes.find(n => n.id === catId)) addEdge(catId, childId, "contains", "active", 0.2);
}
for (const f of vaultWiki) {
  const childId = vaultIdFor("wiki", f.subgroup, f.rel);
  const catId = `wiki.${f.subgroup}`;
  if (nodes.find(n => n.id === catId)) addEdge(catId, childId, "contains", "active", 0.2);
}

// ---------- EDGES ----------
// L0 -> L1
for (const p of personas) {
  const id = `p.${p.label.toLowerCase()}`;
  // each persona reaches the most-relevant page clusters
  const pmap = {
    operator:   ["fe.pages.shopfloor","fe.pages.quality","fe.pages.hr_safety","fe.pages.specialty"],
    programmer: ["fe.pages.cam","fe.pages.cad_calc","fe.pages.lathe","fe.pages.mill","fe.pages.wedm","fe.web"],
    quoter:     ["fe.pages.quoting","fe.pages.erp","fe.pages.specialty"],
    boss:       ["fe.pages.analytics","fe.pages.erp","fe.pages.quality"],
    admin:      ["fe.pages.admin","fe.pages.learning"],
  };
  for (const t of (pmap[p.label.toLowerCase()] ?? [])) {
    addEdge(id, t, "uses", "active", 0.5);
  }
  // every persona hits the main web app
  addEdge(id, "fe.web", "uses", "active", 0.7);
}

// L1 -> L2
for (const v of feVariants) {
  const status = v.status === "pending_merge" ? "pending" : "active";
  addEdge(v.id, "tr.mcp", "http", status, 0.8);
  if (v.id === "fe.cli") addEdge(v.id, "tr.mcp", "stdio", "active", 1.0);
  addEdge(v.id, "tr.ws", "ws", status, 0.4);
}
// page clusters all flow through MCP via REST
for (const k of Object.keys(pageClusters)) {
  addEdge(`fe.pages.${k}`, "tr.rest", "http", "active", 0.5);
  addEdge(`fe.pages.${k}`, "fe.web", "embedded", "active", 0.4);
}
// Transport internal
addEdge("tr.rest","tr.mcp","internal","active",0.7);
addEdge("tr.grpc","tr.mcp","internal","active",0.4);
addEdge("tr.gql","tr.mcp","internal","active",0.4);
addEdge("tr.ws","tr.mcp","internal","active",0.6);
addEdge("tr.auth","tr.mcp","gate","active",0.7);
addEdge("tr.rate","tr.mcp","gate","active",0.5);
addEdge("tr.tele","tr.mcp","observe","active",0.4);

// L2 -> L3 (MCP routes through Tier-1 Claude for natural language; Tier-1 fans to T2/T3)
addEdge("tr.mcp", "ai.t1.claude", "intent", "active", 0.9);
addEdge("ai.t1.claude", "ai.t2.coordinator", "delegate", "active", 0.8);
for (const t3 of ["mill","lathe","wedm","cad","cam","safety","quality"]) {
  addEdge("ai.t2.coordinator", `ai.t3.${t3}`, "delegate", "active", 0.6);
}
// Ollama models receive offloaded work from Claude
for (const o of ["qwen","llama","embed","reflect"]) {
  addEdge("ai.t1.claude", `ai.ollama.${o}`, "offload", "active", 0.4);
}

// L3 -> L4 (each Tier-3 specialist routes to its dispatcher cluster)
const t3map = {
  mill:    ["disp.milldispatcher","disp.machininggkbdispatcher"],
  lathe:   ["disp.turningdispatcher","disp.turningprogramdispatcher"],
  wedm:    ["disp.edmdispatcher"],
  cad:     ["disp.caddispatcher","disp.cadautomationdispatcher"],
  cam:     ["disp.camdispatcher","disp.camfunctiondispatcher","disp.toolpathdispatcher"],
  safety:  ["disp.safetydispatcher","disp.omegadispatcher","disp.guarddispatcher","disp.validationdispatcher"],
  quality: ["disp.qualitydispatcher"],
};
for (const [t3, ds] of Object.entries(t3map)) {
  for (const d of ds) {
    if (nodes.find(n => n.id === d)) addEdge(`ai.t3.${t3}`, d, "route", "active", 0.7);
  }
}
// every dispatcher pulls from MCP transport too (auth check)
for (const d of dispatcherNodes) {
  addEdge("tr.mcp", d.id, "register", "active", 0.2);
}

// L4 -> L5 (dispatcher → engine domain — heuristic mapping)
function dispatcherToDomains(name) {
  const n = name.toLowerCase();
  const d = [];
  if (/mill/.test(n)) d.push("mill");
  if (/lathe|turning/.test(n)) d.push("lathe","turning");
  if (/cad/.test(n)) d.push("cad");
  if (/cam|toolpath/.test(n)) d.push("cam","toolpath","tool");
  if (/edm|wedm/.test(n)) d.push("wedm");
  if (/safety|omega|guard|validation/.test(n)) d.push("safety");
  if (/quality/.test(n)) d.push("quality");
  if (/cost|business/.test(n)) d.push("cost","erp");
  if (/material/.test(n)) d.push("material");
  if (/adaptive/.test(n)) d.push("adaptive");
  if (/memory/.test(n)) d.push("memory");
  if (/hook|nlhook/.test(n)) d.push("hook");
  if (/probe/.test(n)) d.push("probe");
  if (/knowledge/.test(n)) d.push("knowledge");
  if (/session/.test(n)) d.push("session");
  if (/calibration/.test(n)) d.push("calibration");
  if (/^ai/.test(n)) d.push("ai");
  if (/twin/.test(n)) d.push("twin");
  if (/forge/.test(n)) d.push("forge");
  if (/network/.test(n)) d.push("network");
  if (/inspect|feasibility/.test(n)) d.push("inspect");
  if (/calc|physics|vibration|fluid|forming|welding|mechanical/.test(n)) d.push("physics");
  return d;
}
// VIZ-COVERAGE-MS0: L5 is now BUILD_STATE's first-capword-prefix taxonomy
// (Other, Lathe, Mill, Tool...), NOT the old hand-curated semantic domains.
// dispatcherToDomains() still emits semantic tokens (cad, cam, wedm, safety,
// ai...). A token with no matching L5 node is COUNTED and WARNED — never
// silently dropped (R12). Re-aligning the heuristic to the prefix taxonomy
// is a documented follow-up (see the VIZ-COVERAGE-MS0 envelope).
const l5IdSet = new Set(nodes.filter(n => n.layer === "L5").map(n => n.id));
const unresolvedL5Targets = new Set();
for (const d of dispatcherNodes) {
  for (const dom of dispatcherToDomains(d.id)) {
    const targetId = `eng.${dom}`;
    if (l5IdSet.has(targetId)) addEdge(d.id, targetId, "lazy_import", "active", 0.4);
    else unresolvedL5Targets.add(dom);
  }
}
if (unresolvedL5Targets.size > 0) {
  console.warn(
    `  [L4->L5] ${unresolvedL5Targets.size} dispatcher domain token(s) have no L5 node `
    + `(dispatcherToDomains heuristic predates the BUILD_STATE prefix taxonomy): `
    + [...unresolvedL5Targets].sort().join(", "),
  );
}

// L5 -> L6 (engines depend on cores)
const allEngineDomNodes = nodes.filter(n => n.layer === "L5");
for (const e of allEngineDomNodes) {
  addEdge(e.id, "core.tests",     "tested_by",  "active", 0.3);
  addEdge(e.id, "core.physics",   "import",     "active", 0.5);
  addEdge(e.id, "core.formulas",  "use",        "active", 0.4);
  addEdge(e.id, "core.algos",     "use",        "active", 0.3);
  addEdge(e.id, "core.schemas",   "validate",   "active", 0.3);
  addEdge(e.id, "core.hooks_src", "fire",       "active", 0.3);
}

// L6 -> L7 (cores read registries)
addEdge("core.physics", "reg.materialregistry", "read", "active", 0.6);
addEdge("core.formulas", "reg.formularegistry", "read", "active", 0.6);
addEdge("core.algos", "reg.algorithmregistry", "read", "active", 0.5);
for (const r of registryFiles) {
  const rid = `reg.${r.replace(".ts","").toLowerCase()}`;
  if (nodes.find(n => n.id === rid)) {
    addEdge("core.schemas", rid, "validate", "active", 0.2);
  }
}

// L7 -> L8 (registries persist to wiki/state)
const regNodes = nodes.filter(n => n.layer === "L7");
for (const r of regNodes) {
  addEdge(r.id, "kn.shared", "persist", "active", 0.2);
}
addEdge("reg.materialregistry", "kn.jmdie", "reference", "active", 0.5);
addEdge("reg.toolregistry", "kn.jmdie", "reference", "active", 0.5);
addEdge("reg.machineregistry", "kn.jmdie", "reference", "active", 0.5);

// L8 -> L9 (knowledge persists to filesystem)
for (const w of wikiDirs) addEdge(`wiki.${w}`, "fs.knowledge", "fs", "active", 0.3);
for (const m of memoryDirs) addEdge(`mem.${m}`, "fs.knowledge", "fs", "active", 0.3);
for (const s of stateSubdirs) addEdge(`state.${s}`, "fs.state", "fs", "active", 0.3);
addEdge("kn.jmdie", "fs.jm_die", "fs", "active", 0.7);

// ---------- ATOMIC-TIER assignment (build order 0=foundation -> 6=user) ----------
// The atomic-first principle: build deepest first, layers above depend on layers below.
// Tier 0 = physics constants, formulas, algorithms — pure data + math, no deps
// Tier 1 = engines (consume cores)
// Tier 2 = dispatchers + AI hierarchy (consume engines)
// Tier 3 = transport (consumes dispatchers)
// Tier 4 = frontend (consumes transport)
// Tier 5 = personas (consume frontend)
const TIER_BY_LAYER = {
  L10: 0,                        // vault files — atomic content, deepest knowledge layer
  L9: 0, L8: 0, L7: 0, L6: 0,   // filesystem + state + registries + cores all "atomic foundation"
  L5: 1,                         // engines
  L4: 2, L3: 2,                  // dispatchers + AI hierarchy
  L2: 3,                         // transport
  L1: 4,                         // frontend
  L0: 5,                         // personas
};
for (const n of nodes) {
  n.tier = TIER_BY_LAYER[n.layer] ?? 1;
}

// ---------- WIRING SUGGESTIONS for unwired engine domains ----------
// For each unwired domain, propose 1-3 dispatcher candidates by name pattern.
function suggestDispatchersForDomain(domain) {
  const d = domain.toLowerCase();
  const candidates = [];
  for (const dispNode of dispatcherNodes) {
    const dn = dispNode.id.replace("disp.","").toLowerCase();
    if (dn.includes(d) || d.includes(dn.replace("dispatcher",""))) {
      candidates.push(dispNode.id);
    }
  }
  // Domain-specific fallbacks
  const fallbacks = {
    other:    ["disp.algorithmdispatcher","disp.intelligencedispatcher","disp.contextdispatcher"],
    lathe:    ["disp.turningdispatcher","disp.turningprogramdispatcher"],
    machine:  ["disp.machinelivedispatcher","disp.machinesetupdispatcher"],
    multi:    ["disp.multiopdispatcher","disp.multiaxisprogramdispatcher"],
    turning:  ["disp.turningdispatcher","disp.turningprogramdispatcher"],
    tool:     ["disp.toolpathdispatcher","disp.machininggkbdispatcher"],
    five:     ["disp.fiveaxisdispatcher","disp.multiaxisprogramdispatcher"],
    shop:     ["disp.shoppracticedispatcher","disp.businessdispatcher"],
    hyper:    ["disp.camdispatcher","disp.camfunctiondispatcher"],
    milling:  ["disp.milldispatcher","disp.machininggkbdispatcher"],
    fusion:   ["disp.cadautomationdispatcher","disp.caddispatcher"],
    wet:      ["disp.diagnosisdispatcher","disp.feasibilitydispatcher"],
    session:  ["disp.sessiondispatcher","disp.contextdispatcher"],
    process:  ["disp.processcontroldispatcher","disp.adaptivecontroldispatcher"],
    print:    ["disp.documentdispatcher","disp.documentlearningdispatcher"],
    swiss:    ["disp.turningdispatcher","disp.cncopsdispatcher"],
  };
  if (fallbacks[d]) {
    for (const fb of fallbacks[d]) {
      if (!candidates.includes(fb) && nodes.find(n => n.id === fb)) candidates.push(fb);
    }
  }
  return candidates.slice(0, 3);
}

// Annotate each unwired L5 node with suggestions and emit "phantom" edges
const suggestionEdges = [];
for (const n of nodes.filter(x => x.layer === "L5" && x.subgroup === "unwired")) {
  const targets = suggestDispatchersForDomain(n.domain ?? n.label.split('\n')[0]);
  n.suggestedDispatchers = targets;
  // Compute "unlocks" cascade: how many engines wire-up + downstream gain.
  // The wire-up backlog is the domain's UNWIRED count (n.unwired), not its
  // total engine count — an L5 node now carries both wired + unwired.
  const wireBacklog = n.unwired ?? n.count ?? 0;
  n.unlocks = {
    engines: wireBacklog,
    dispatchersGain: targets.length,
    downstreamHops: 2, // engines -> dispatchers -> frontends
    leverageScore: wireBacklog * targets.length, // simple ROI proxy
  };
  for (const t of targets) {
    suggestionEdges.push({ from: n.id, to: t, type: "suggested_wire", status: "phantom", intensity: 0.5 });
  }
}

// ---------- BUILD-ORDER ROADMAP (atomic-first) ----------
const roadmap = {
  principle: "Build atomic-first. Tier 0 (cores/data) → Tier 1 (engines) → Tier 2 (dispatchers/AI) → Tier 3 (transport) → Tier 4 (frontend) → Tier 5 (users). Never start higher tier work that depends on missing lower-tier blocks.",
  // Phase 0 — drift fix (envelope/git mismatches block planning visibility)
  phases: [
    {
      phase: 0,
      name: "Reality reconciliation",
      reason: "Fix milestone envelope drift so planning has accurate ground truth.",
      items: [
        { kind: "drift", count: drift, action: "Run /envelope-sync, accept proposed status flips" },
      ],
    },
    {
      phase: 1,
      name: "Atomic foundation gaps (Tier 0)",
      reason: "Cores, registries, schemas, formulas — no upstream deps; everything builds on these.",
      items: nodes.filter(n => n.tier === 0 && n.status !== "built").map(n => ({
        kind: "atomic", id: n.id, label: n.label.split('\n')[0],
      })),
    },
    {
      phase: 2,
      name: "Engine wire-up (Tier 1, highest leverage)",
      reason: `${l5Coverage.unwired} unwired engines = ${100 - l5Coverage.coverage_pct}% of code orphaned. Wiring is cheap, capability gain is huge.`,
      items: nodes.filter(n => n.layer === "L5" && n.subgroup === "unwired")
        .sort((a, b) => (b.unlocks?.leverageScore ?? 0) - (a.unlocks?.leverageScore ?? 0))
        .slice(0, 10)
        .map(n => ({
          kind: "wire-up",
          domain: n.domain,
          engineCount: n.unwired ?? n.count, // wire-up backlog = unwired count
          suggestedDispatchers: n.suggestedDispatchers,
          leverageScore: n.unlocks.leverageScore,
        })),
    },
    {
      phase: 3,
      name: "Pending frontend merge (Tier 4)",
      reason: "Already-built UI work waiting; merging unlocks features without writing new code.",
      items: nodes.filter(n => n.status === "pending_merge").map(n => ({
        kind: "frontend-merge", id: n.id, label: n.label.split('\n')[0], stack: n.stack,
      })),
    },
    {
      phase: 4,
      name: "New build (only after 1-3 stable)",
      reason: `Don't add new engines/pages while ${100 - l5Coverage.coverage_pct}% of existing engines are unwired. YAGNI.`,
      items: [{ kind: "policy", note: "Defer net-new feature work until Phase 1-3 are < 10% gap" }],
    },
  ],
};

// ---------- output ----------
const meta = {
  counts,
  headline: { built, unwired, pendingFE, drift, wikiEntries },
  // Single-source engine-domain coverage (VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX).
  // Aggregated straight from BUILD_STATE.COVERAGE_BY_DOMAIN.rows — equals the
  // sum of every L5 domain node. The viz headline can no longer disagree with
  // BUILD_STATE.json on the wired/total/% metric.
  coverage: l5Coverage,
  dispatcherCatCount,
  pageClusters,
  totals: { nodes: nodes.length, edges: edges.length + suggestionEdges.length, layers: 11 },
  vault: { memories: vaultMemory.length, wiki: vaultWiki.length, wikiLinkEdges: wikiLinkEdgeCount, brokenWikiLinks: wikiLinkBrokenCount },
  worktrees: worktreeSummary,
  roadmap,
};
const layers = [
  { id: "L0", name: "User Personas",      y:  9.0, color: "#fde68a" },
  { id: "L1", name: "Frontend",           y:  7.0, color: "#7dd3fc" },
  { id: "L2", name: "Transport / API",    y:  5.0, color: "#a78bfa" },
  { id: "L3", name: "AI Hierarchy",       y:  3.0, color: "#22d3ee" },
  { id: "L4", name: "Dispatchers (97)",   y:  1.0, color: "#34d399" },
  { id: "L5", name: "Engine Domains",     y: -1.0, color: "#fbbf24" },
  { id: "L6", name: "Cores",              y: -3.0, color: "#fb923c" },
  { id: "L7", name: "Registries",         y: -5.0, color: "#f97316" },
  { id: "L8", name: "State / Wiki / Knowledge", y: -7.0, color: "#ec4899" },
  { id: "L9", name: "Filesystem",         y: -9.0, color: "#94a3b8" },
  { id: "L10", name: `Vault (${vaultMemory.length} mem + ${vaultWiki.length} wiki)`, y: -11.0, color: "#a855f7" },
];
const out = {
  schemaVersion: "2.1.0",
  generatedAt: new Date().toISOString(),
  meta,
  layers,
  nodes,
  edges: [...edges, ...suggestionEdges],
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(`generated: ${OUT_FILE}`);
console.log(`  layers: ${layers.length}  nodes: ${nodes.length}  edges: ${edges.length + suggestionEdges.length}  (incl ${suggestionEdges.length} phantom suggestion edges)`);
console.log(`  built engines: ${built}/${counts.engines} (${Math.round(100*built/counts.engines)}%)`);
console.log(`  dispatchers wired: ${dispatcherFiles.length} files`);
console.log(`  vault: ${vaultMemory.length} memories + ${vaultWiki.length} wiki = ${vaultMemory.length + vaultWiki.length} L10 nodes; ${wikiLinkEdgeCount} [[wiki-link]] edges (${wikiLinkBrokenCount} broken refs)`);
console.log(`  roadmap phases: ${roadmap.phases.length}; phase 2 wire-up candidates: ${roadmap.phases[2].items.length}`);

// OBSIDIAN-INTELLIGENCE-MS3/G2: agent-status overlay layer. Classifies every
// occupied chat slot (typing|parsing|idle|errored) from chat-slots.json
// heartbeat age + AGENT_CHAT.jsonl, and writes it to its OWN sibling file
// (agent-overlay.json) — see OUT_AGENT_OVERLAY above for why it is not folded
// into system-graph.json. The agent-overlay.js viewer renders it.
{
  const chatSlots = safeReadJson(path.join(ROOT, "state", "shared", "chat-slots.json"), null);
  let chatEntries = [];
  try {
    const jsonlPath = path.join(ROOT, "state", "shared", "AGENT_CHAT.jsonl");
    if (fs.existsSync(jsonlPath)) {
      // tail-bounded — the append-only log can grow large; recent lines carry
      // the freshest per-slot state.
      chatEntries = parseChatJsonl(fs.readFileSync(jsonlPath, "utf8"), 500);
    }
  } catch {
    /* AGENT_CHAT.jsonl is best-effort — the overlay still builds from slots */
  }
  try {
    const agentOverlay = buildAgentOverlay({ chatSlots, chatEntries });
    fs.writeFileSync(OUT_AGENT_OVERLAY, JSON.stringify(agentOverlay, null, 2));
    const ac = agentOverlay.counts;
    console.log(
      `  agent overlay: ${OUT_AGENT_OVERLAY}  (${ac.occupied} active — ` +
        `${ac.typing} typing · ${ac.parsing} parsing · ${ac.idle} idle · ${ac.errored} errored)`
    );
  } catch (err) {
    // The overlay is a best-effort additive layer — system-graph.json is
    // already on disk, so an overlay failure must never abort the generator.
    console.warn(`  agent overlay: SKIPPED — ${err && err.message ? err.message : err}`);
  }
}

// OBSIDIAN-INTELLIGENCE-MS3/C1: emit a summary HTML report when --html is
// set. Standalone, no CDN refs; complements (does NOT replace) the
// existing 3D graph.html WebGL viewer.
if (FLAGS.html) {
  const sections = [];

  const totalEdges = edges.length + suggestionEdges.length;
  sections.push({
    kind: "headline",
    cards: [
      { label: "Total nodes", value: nodes.length.toLocaleString(), status: "info" },
      { label: "Total edges", value: totalEdges.toLocaleString(), status: "info" },
      { label: "Engines built", value: `${built}/${counts.engines}`, status: "ok" },
      { label: "Engines unwired", value: String(unwired), status: unwired > 0 ? "warn" : "ok" },
      { label: "Frontend pending", value: String(pendingFE), status: pendingFE > 0 ? "warn" : "ok" },
      { label: "Envelope drift", value: String(drift), status: drift > 0 ? "warn" : "ok" },
      { label: "Wiki entries", value: String(wikiEntries), status: "info" },
      { label: "Layers", value: String(layers.length), status: "info" },
    ],
  });

  // Per-layer node counts (sorted L0..L10)
  const layerCounts = {};
  for (const n of nodes) layerCounts[n.layer] = (layerCounts[n.layer] || 0) + 1;
  const layerRows = layers.map((L) => [
    L.id,
    L.name,
    { value: (layerCounts[L.id] || 0).toLocaleString(), right: true },
  ]);
  sections.push({
    kind: "table",
    caption: "Nodes per layer (L0=personas → L10=vault)",
    headers: ["ID", "Name", "Nodes"],
    rows: layerRows,
  });

  // Vault summary
  sections.push({
    kind: "kv",
    title: "Vault (L10) breakdown",
    pairs: [
      { key: "memory atomic notes", value: vaultMemory.length.toLocaleString() },
      { key: "wiki entries", value: vaultWiki.length.toLocaleString() },
      { key: "[[wiki-link]] edges", value: String(wikiLinkEdgeCount) },
      {
        key: "broken wiki refs",
        value: String(wikiLinkBrokenCount),
        status: wikiLinkBrokenCount > 0 ? "warn" : "ok",
      },
    ],
  });

  // Roadmap phase 2 wire-up candidates (most actionable)
  const phase2 = roadmap.phases.find((p) => p.phase === 2);
  if (phase2 && Array.isArray(phase2.items) && phase2.items.length > 0) {
    sections.push({
      kind: "barchart",
      label: "Phase 2 wire-up candidates (top 10, by engine count)",
      data: phase2.items.slice(0, 10).map((it) => ({
        label: String(it.domain || "unknown"),
        value: Number(it.engineCount) || 0,
        status: "warn",
      })),
    });
  }

  // Dispatcher category distribution
  const dispatcherCatRows = Object.entries(dispatcherCatCount || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([cat, n]) => [cat, { value: String(n), right: true }]);
  if (dispatcherCatRows.length > 0) {
    sections.push({
      kind: "table",
      caption: `Dispatcher categories (top 15 of ${Object.keys(dispatcherCatCount || {}).length})`,
      headers: ["Category", "Count"],
      rows: dispatcherCatRows,
    });
  }

  // Worktree summary — `worktreeSummary` is an OBJECT (per the
  // worktree-audit shape), not an array of paths. The earlier
  // `Array.isArray` guard was dead code; render the categorized counts
  // via a kv section instead, mirroring the Vault breakdown above.
  if (worktreeSummary && typeof worktreeSummary === "object" && worktreeSummary.total > 0) {
    sections.push({
      kind: "kv",
      title: `Worktree fleet (${worktreeSummary.total} live)`,
      pairs: [
        { key: "KEEP", value: String(worktreeSummary.KEEP || 0), status: "ok" },
        { key: "MERGE", value: String(worktreeSummary.MERGE || 0), status: (worktreeSummary.MERGE || 0) > 0 ? "warn" : "ok" },
        { key: "PRUNE", value: String(worktreeSummary.PRUNE || 0), status: (worktreeSummary.PRUNE || 0) > 0 ? "warn" : "ok" },
        { key: "INVESTIGATE", value: String(worktreeSummary.INVESTIGATE || 0), status: (worktreeSummary.INVESTIGATE || 0) > 0 ? "warn" : "ok" },
        { key: "DRAINED", value: String(worktreeSummary.DRAINED || 0) },
        { key: "PARKED", value: String(worktreeSummary.PARKED || 0) },
        { key: "archived", value: String(worktreeSummary.archived_total || 0) },
        { key: "base", value: worktreeSummary.base ?? "?" },
      ],
    });
  }

  const html = renderHtmlPage({
    title: "PRISM — System Map Summary",
    subtitle: "Atomic 10-layer graph snapshot · companion to the 3D viewer at /system-viz",
    generatedAt: out.generatedAt,
    sections,
    note: `Source JSON: state/shared/system-viz/architecture-graph.json (architecture-only ~20K nodes; for merged ~372K-node graph use system-graph.json from regen-viz.mjs) · 3D viewer: state/shared/system-viz/graph.html · render schema ${HTML_REPORT_SCHEMA_VERSION}`,
  });
  fs.writeFileSync(OUT_HTML, html);
  console.log(`  summary: ${OUT_HTML}`);
}
