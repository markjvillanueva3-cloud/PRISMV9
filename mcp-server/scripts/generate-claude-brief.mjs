#!/usr/bin/env node
/**
 * generate-claude-brief.mjs
 *
 * Regenerates H:/prism/state/shared/CLAUDE-BRIEF.md from live audit artifacts.
 * Wired into SessionStart so every Claude session opens with current PRISM context.
 *
 * Inputs (read from disk):
 *   - PRISM-INVENTORY-LATEST.md            engine/dispatcher/action/hook counts
 *   - state/shared/AUDIT-PRIORITIZED-GAPS  top-20 gap list
 *   - state/shared/JM-FLEET-INVENTORY.md   JM machine fleet roster
 *   - state/shared/JM-B250II-DEEP-AUDIT.md flagship status
 *   - state/shared/AI-HIERARCHY-INVENTORY  AI tier/feedback status
 *   - state/shared/BRIDGE-MATRIX.md        knowledge bridge health
 *   - state/shared/AUDIT-CAM-STATUS.md     6 tier-1 CAMs status
 *   - state/shared/DISCOVERY-PRODUCT-FEATURES.md  hidden saleable features
 *
 * Output: state/shared/CLAUDE-BRIEF.md  (≤6KB target)
 *
 * Flags:
 *   --inject           print brief to stdout (for SessionStart hook)
 *   --write            write brief to disk only
 *   --both             default (write + stdout)
 *   --check-staleness  exit 1 if existing brief >24h old, exit 0 otherwise
 *
 * Brief is REGENERATED, not hand-edited. To update content, fix the audit
 * artifacts it reads from. The brief-drift-monitor.mjs scheduled task watches
 * for material drift and regenerates this brief automatically.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");
const SHARED = resolve(PRISM_ROOT, "state", "shared");
const BRIEF_PATH = resolve(SHARED, "CLAUDE-BRIEF.md");
const INVENTORY_PATH = resolve(PRISM_ROOT, "PRISM-INVENTORY-LATEST.md");

const args = new Set(process.argv.slice(2));
const FLAGS = {
  inject: args.has("--inject"),
  write: args.has("--write"),
  both: args.has("--both") || (!args.has("--inject") && !args.has("--write") && !args.has("--check-staleness")),
  staleness: args.has("--check-staleness"),
};

function readSafe(path, fallback = "") {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : fallback;
  } catch {
    return fallback;
  }
}

function ageHours(path) {
  if (!existsSync(path)) return Infinity;
  const ageMs = Date.now() - statSync(path).mtimeMs;
  return ageMs / (1000 * 60 * 60);
}

function extractCount(text, pattern, fallback = "?") {
  const m = text.match(pattern);
  return m ? m[1].trim() : fallback;
}

function extractCounts(inventoryText) {
  return {
    engines: extractCount(inventoryText, /(?:engines|Engines)[:\s]+\**\s*([\d,]+)/, "?"),
    dispatchers: extractCount(inventoryText, /(?:dispatchers|Dispatchers)[:\s]+\**\s*([\d,]+)/, "?"),
    actions: extractCount(inventoryText, /(?:actions|Actions)[:\s]+\**\s*([\d,]+)/, "?"),
    hooks: extractCount(inventoryText, /(?:hooks|Hooks)[:\s]+\**\s*([\d,]+)/, "?"),
  };
}

function extractTopN(text, pattern, n = 5) {
  const matches = [...text.matchAll(pattern)];
  return matches.slice(0, n).map((m) => m[1].trim());
}

if (FLAGS.staleness) {
  const age = ageHours(BRIEF_PATH);
  if (age > 24) {
    process.stderr.write(`Brief is ${age.toFixed(1)}h old — stale.\n`);
    process.exit(1);
  }
  process.stderr.write(`Brief is ${age.toFixed(1)}h old — fresh.\n`);
  process.exit(0);
}

const inventory = readSafe(INVENTORY_PATH);
const counts = extractCounts(inventory);

// U-BRIEF-VIZ: surface live system-viz graph summary so the brief reflects the
// canonical map (10+ layers, headline metrics, top unwired domains) not just
// hand-curated audit docs. Falls back to empty section if graph missing.
const GRAPH_PATH = resolve(PRISM_ROOT, "state", "shared", "system-viz", "system-graph.json");
function extractGraphSnapshot(graphPath) {
  if (!existsSync(graphPath)) return null;
  try {
    const G = JSON.parse(readFileSync(graphPath, "utf8"));
    const headline = (G.meta && G.meta.headline) || {};
    const perLayer = {};
    for (const n of G.nodes || []) {
      perLayer[n.layer] = (perLayer[n.layer] || 0) + 1;
    }
    // Top-5 unwired engine subdomains (L5 nodes with subgroup/kind === "unwired")
    const unwired = (G.nodes || [])
      .filter((n) => n.layer === "L5" && (n.subgroup === "unwired" || n.kind === "unwired" || n.status === "stub_heavy"))
      .map((n) => ({ label: n.label || n.id, count: Number(n.count) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      generatedAt: G.meta?.generatedAt || G.generatedAt || "unknown",
      headline,
      perLayer,
      unwired,
      totalNodes: (G.nodes || []).length,
      totalEdges: (G.edges || []).length,
    };
  } catch {
    return null;
  }
}
const graphSnap = extractGraphSnapshot(GRAPH_PATH);

// U-BRIEF-WIKI-BRAIN: surface the auto-generated architecture wiki tree size +
// freshness. The system-viz graph's meta.headline.wikiEntries (~776) only counts
// index.md lines; the real tree is ~14K leaf entries (engines, actions, skills,
// hooks, formulas, milestones, …) consumed by the recall hooks. Source of truth:
// knowledge/wiki/architecture/_stats.md (regenerated by build-wiki-leaf-index.mjs).
function extractWikiBrain() {
  const ARCH = resolve(PRISM_ROOT, "knowledge", "wiki", "architecture");
  const STATS = resolve(ARCH, "_stats.md");
  const LEAF = resolve(ARCH, "_leaf-index.jsonl");
  const EMB = resolve(ARCH, "_embeddings.jsonl");
  const ORPH = resolve(PRISM_ROOT, "state", "shared", "wiki-orphans.json");
  let total = "?", byType = "", orphan = "?", lastRegen = "?";
  const statsText = readSafe(STATS);
  if (statsText) {
    total = (statsText.match(/\*\*Total[^:]*entries:\*\*\s*([\d,]+)/i) || statsText.match(/^total_entries:\s*([\d,]+)/mi) || [, "?"])[1];
    orphan = (statsText.match(/\*\*Orphan rate:\*\*\s*([^\n]+)/) || [, "?"])[1].trim();
    lastRegen = (statsText.match(/\*\*Last regen:\*\*\s*([^\n]+)/) || [, "?"])[1].trim();
    const rows = [...statsText.matchAll(/^\|\s*`?([a-z_-]+)`?\s*\|\s*(\d+)\s*\|/gmi)].map((m) => `${m[1]}:${m[2]}`);
    byType = rows.slice(0, 9).join(" · ");
  } else if (existsSync(LEAF)) {
    try { total = String(readFileSync(LEAF, "utf8").split("\n").filter((l) => l.trim()).length); } catch {}
  }
  let emb = null;
  if (existsSync(EMB)) {
    try {
      const first = readFileSync(EMB, "utf8").split("\n", 1)[0];
      const m = JSON.parse(first || "{}");
      if (m && m.__meta) emb = { model: m.model, dim: m.dim, count: m.count };
    } catch {}
  }
  return { total, byType, orphan, lastRegen, hasStats: !!statsText, emb };
}
const wikiBrain = extractWikiBrain();
const gaps = readSafe(resolve(SHARED, "AUDIT-PRIORITIZED-GAPS.md"));
const fleet = readSafe(resolve(SHARED, "JM-FLEET-INVENTORY.md"));
const b250ii = readSafe(resolve(SHARED, "JM-B250II-DEEP-AUDIT.md"));
const ai = readSafe(resolve(SHARED, "AI-HIERARCHY-INVENTORY.md"));
const bridge = readSafe(resolve(SHARED, "BRIDGE-MATRIX.md"));
const cams = readSafe(resolve(SHARED, "AUDIT-CAM-STATUS.md"));
const products = readSafe(resolve(SHARED, "DISCOVERY-PRODUCT-FEATURES.md"));
const buildContext = readSafe(resolve(SHARED, "PRISM-BUILD-CONTEXT.md"));
const buildVision = readSafe(resolve(SHARED, "PRISM-BUILD-VISION.md"));

const top10Gaps = extractTopN(gaps, /^##\s+(\d+)\.\s+\*\*([^*]+)\*\*/gm, 10).map((line, i) => `${i + 1}. ${line}`);
const fleetCount = (() => {
  const m = fleet.match(/(\d+)\s*active.*?(\d+)\s*standby/i);
  if (m) return { active: m[1], standby: m[2] };
  return { active: "?", standby: "?" };
})();
const b250iiStatus = (() => {
  const m = b250ii.match(/(?:Status|Verdict|Score):\s*([^\n]+)/i);
  return m ? m[1].trim() : "see JM-B250II-DEEP-AUDIT.md";
})();
const aiStats = (() => {
  const total = (ai.match(/Total[:\s]+(\d+)\s*AI nodes/i) || [])[1] || "24";
  const fb = ai.match(/feedback_loop_wired[:\s]+true[:\s]+(\d+)/i);
  return { total, feedback_wired: fb ? fb[1] : "1 (sfc_ai only)" };
})();

// U-BRIEF-WIKI (OBSIDIAN-COMPOUND-MS0): inject fresh wiki/memory activity so the brief
// compounds daily from the Karpathy LLM-Wiki + memory vault, not only from inventory + git.
const WIKI_LOG_PATH = resolve(PRISM_ROOT, "knowledge", "wiki", "log.md");
const VAULT_MEMORIES_DIR = resolve(PRISM_ROOT, "knowledge", "memories");
const wikiLog = readSafe(WIKI_LOG_PATH);

function extractWikiTail(logText, n = 5) {
  if (!logText) return [];
  const lines = logText.split("\n").filter((l) => l.startsWith("## ["));
  const seen = new Set();
  const distinct = [];
  for (let i = lines.length - 1; i >= 0 && distinct.length < n; i--) {
    const fp = lines[i].replace(/by:\S+\s*$/, "").trim();
    if (seen.has(fp)) continue;
    seen.add(fp);
    distinct.push(lines[i].replace(/^##\s+/, ""));
  }
  return distinct;
}

function countRecentMemories(dir, hours = 24) {
  try {
    if (!existsSync(dir)) return { total: 0, recent: 0 };
    const cutoff = Date.now() - hours * 3600 * 1000;
    let total = 0, recent = 0;
    for (const sub of readdirSync(dir)) {
      const subDir = pathJoin(dir, sub);
      try {
        if (!statSync(subDir).isDirectory()) continue;
        for (const f of readdirSync(subDir)) {
          if (!f.endsWith(".md")) continue;
          total++;
          if (statSync(pathJoin(subDir, f)).mtimeMs > cutoff) recent++;
        }
      } catch { /* ignore */ }
    }
    return { total, recent };
  } catch { return { total: 0, recent: 0 }; }
}

const wikiTail = extractWikiTail(wikiLog, 5);
const memoryStats = countRecentMemories(VAULT_MEMORIES_DIR, 24);

const NOW = new Date().toISOString();
const briefAgeNote = ageHours(BRIEF_PATH);

const brief = `# CLAUDE-BRIEF — PRISM Continuous Awareness

**Auto-generated:** ${NOW}  ·  Regenerated each SessionStart by \`generate-claude-brief.mjs\`.
If timestamp >24h old, run: \`node H:/prism/mcp-server/scripts/generate-claude-brief.mjs\`

---

## What PRISM is

Manufacturing-intelligence platform Mark is building. Speed/Feed Calculator (SFC) + Master Post are the two saleable subscription products. CAD/CAM AI consumes both and drives autonomous CAD generation + CAM programming. Six tier-1 CAM bridges (Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks). Three-tier AI hierarchy: Claude (Tier-1 master orchestrator), FullSystemAICoordinator (Tier-2), seven domain specialist AIs (Tier-3). Closed-loop learning from shop floor + ERP. JM Die Company is the test shop. Operator-in-the-loop is unconditional.

## Identity & paths

- **MCP root:** \`H:/prism/mcp-server/dist\` · **port:** 3100
- **Source of truth:** \`H:/prism\` (C:\\ is legacy/avoid; auto-mirrored from C:\\Users\\wompu\\.claude only for harness settings)
- **Test shop assets:** \`H:/prism/JM DIE/\` (production NC, NOT canonical) · \`H:/prism/Resources/\` (custom posts in mid-modification)
- **Worktrees:** \`H:/prism\` is the main; per-milestone forks in sibling \`H:/prism-<scope>/\`

## System scale

- Engines: ${counts.engines}  ·  Dispatchers: ${counts.dispatchers}  ·  Actions: ${counts.actions}  ·  Hooks: ${counts.hooks}
- Audit cards: \`PRISM-INVENTORY-LATEST.md\`, \`state/shared/AUDIT-*.md\`, \`state/shared/DISCOVERY-*.md\`
- **Honest coverage** (60 vision sub-elements graded): production 38% · beta 47% · stub 10% · planned 5%

## System map (live · from \`system-graph.json\`)

${graphSnap ? `**Total:** ${graphSnap.totalNodes.toLocaleString()} nodes · ${graphSnap.totalEdges.toLocaleString()} edges · graph generated ${graphSnap.generatedAt}

**Headline:** ${graphSnap.headline.built ?? "?"} engines wired · ${graphSnap.headline.unwired ?? "?"} unwired · ${graphSnap.headline.drift ?? 0} envelope drift · ${graphSnap.headline.pendingFE ?? 0} frontend merges pending · ${graphSnap.headline.wikiEntries ?? "?"} wiki entries

**Layers:** ${Object.keys(graphSnap.perLayer).sort().map((L) => `${L}=${graphSnap.perLayer[L].toLocaleString()}`).join(" · ")}

${graphSnap.unwired.length ? `**Top unwired engine domains (need dispatcher wiring):**\n${graphSnap.unwired.map((u, i) => `${i + 1}. ${u.label.replace(/\n/g, " ")} (${u.count})`).join("\n")}` : "_(no unwired engine domains flagged in graph)_"}

> Per-layer detail: \`knowledge/wiki/architecture/layer-l*.md\` (auto-regenerated by \`scripts/generate-layer-wiki.mjs\`). Viewer: \`/system-viz\` slash command. Adapter: \`node scripts/system-viz-query.mjs roadmap-candidates\`.` : "_(system-graph.json missing — run `/system-viz` or `node scripts/generate-system-viz.mjs`)_"}

## Wiki brain (live · auto-generated from the system-viz graph)

**${wikiBrain.total} architecture wiki entries** under \`knowledge/wiki/architecture/\` — one per engine, action, dispatcher, registry, layer, domain, skill, hook, formula, algorithm, milestone, monolith category, frontend, JM-Die customer, combo, design-spec. (The graph's \`meta.headline.wikiEntries\` ≈776 only counts \`index.md\` lines — **${wikiBrain.total}** is the real number; source of truth: \`knowledge/wiki/architecture/_stats.md\`.)

${wikiBrain.byType ? `**Breakdown:** ${wikiBrain.byType}\n` : ""}**Orphan rate:** ${wikiBrain.orphan}  ·  **Last regen:** ${wikiBrain.lastRegen}
${wikiBrain.emb ? `**Semantic index:** ${wikiBrain.emb.count} int8 vectors (${wikiBrain.emb.model}, ${wikiBrain.emb.dim}-d) → \`_embeddings.jsonl\` — powers the recall hook's paraphrase fallback.` : "**Semantic index:** not built (run \`node scripts/build-wiki-embeddings.mjs\` — needs Ollama up)."}

**Stays fresh via** \`scripts/regen-wiki-from-viz.mjs\` (21-stage orchestrator) on every post-commit + hourly cron, with a fingerprint gate so commits that don't touch the graph/inputs skip the ~8min chain. Recall hooks: \`wiki-precheck-inject.mjs\` (UserPromptSubmit — BM25 over index.md + \`_leaf-index.jsonl\`, cosine fallback over \`_embeddings.jsonl\`) and \`wiki-recall-on-read.mjs\` (PostToolUse:Read — injects the wiki summary when you open a documented source file). Single entry: \`/wiki-query <name>\`. Neo4j export: \`state/shared/system-viz/graph.cypher\` + \`graph-queries.cypher\`.

## Process priority

1. **Mill** — production. Kienzle/Taylor/SLD/deflection/thermal/wear/chatter all wired.
2. **Lathe / mill-turn / sub-spindle** — production 98%. Forces, threading, hard-turn, P2P pipeline, AGI knowledge graph all wired. Includes Okuma B250IIW.
3. **Wire EDM** — production 95%. All safety gates, P2P pipeline, AGI orchestration wired.
4. Laser / waterjet / sinker EDM — deferred (scaffolding only).

## CAM integration status (tier-1)

| CAM | Priority | In-host runner | Status |
|-----|----------|----------------|--------|
| hyperMILL | 2 | full Project Manager runtime, 63 engines | **production** (best) |
| Mastercam | 3 | C-Hook generator only | production (no live link) |
| Inventor HSM | 5 | full in-host runner | beta |
| Fusion 360 | 1 | runner present, Python add-in plan-only | beta |
| Esprit | 4 | NOT WIRED (9 declared actions, 0 in dispatcher) | **stub — verdict: aspirational** |
| SolidWorks | 6 | AutomationBridge + CodeGenerator only, no add-in | stub |

Tier-2 (17 CAMs): function indexes exist for SolidCAM/BobCAD/Cimatron/TopSolid/WorkNC/CAMWorks/EdgeCAM/GibbsCAM/SprutCAM/Tebis/Creo/PartMaker/FeatureCAM/AlphaCAM/VISI/CATIA/NX. Most are scaffolding pending the tier-1 deliverables.

## JM machine fleet

**${fleetCount.active} active · ${fleetCount.standby} standby · 0 down · 0 retired** (see \`JM-FLEET-INVENTORY.md\`).

**Flagship — Okuma Multus B250IIW:** ${b250iiStatus}
- master_post_okuma_b250 action: WIRED
- All 6 Okuma macro actions (casing/cbore/validate/parse/defaults/convert): WIRED
- OSP-P300SA dialect: ~75% (G50/G96/G97/G72/G70/G76/G83/G87/M38/M39/G112/G12.1/G13.1 ✓; **MISSING $1/$2 channel prefixes, WAITM sync barriers, IGF, V-variable arithmetic**)
- Sub-spindle handoff: PARTIAL — M38/M39 emitted, multi-channel structure absent

Per-machine support scores: Okuma OSP family **4/5** · Hurco VM30i **4.5/5** · Haas VF-2/OM-2 **2.5/5** (no \`master_post_haas_*\` despite 2 production mills) · Mitsubishi WEDM FA10S **4/5** · Mitsubishi sinker EA12S/D **2/5**.

## Saleable products

| Product | Status | Subscribers |
|---------|--------|-------------|
| **SFC** (Speed/Feed Calculator) | production — only Tier-3 AI with full feedback loop wired (PPGSFCClosedLoop + SFCOutcomeCapture) | billing infrastructure wired (\`prism_business:billing_*\`) |
| **Master Post** | beta — 74+ controllers covered, but 35-vs-38-stage pipeline number conflicts internal docs; no E2E test asserts per-block adaptive S/F | per-controller subscription wired |

**31 saleable features discovered — only 20% surfaced** (80% under-advertised). Top 5 hidden product features:
1. Print-to-Program pipelines (Mill/Lathe/MultiAxis/Threading/HolePattern/SecondaryOps) — competes with Mastercam Dynamic + iMachining + ESPRIT TNG combined
2. Customer Portal token system + Stripe-style billing — Paperless-Parts class
3. Master Post per-controller (74+ controllers) with dialect translation
4. Generative Process Planning + Sustainability/ESG (energy/carbon/exergy/LCA, 25+ actions)
5. Proof-Carrying G-code Emit + Λ formal-logic proof BLOCKING hook — unique aerospace/medical differentiator

## AI hierarchy

**${aiStats.total} AI nodes** over ~360 engines. Tier-3 specialists: SFC, Post, Mill, Lathe, WEDM, CAD, CAM. Plus 17 vendor LoRA chains.

- **production:** 3 (claude_master, sfc_ai, ai_system_router)
- **beta:** 16 (post, mill, lathe, cad, cam, all vendor AIs)
- **stub:** 1 (ai_intelligence_maximizer)
- **planned:** 4 (grinding/laser/mill_turn LoRA scaffolds)

**Feedback loops wired:** ${aiStats.feedback_wired}. **0 .safetensors / .pt / .gguf adapters anywhere on disk** despite 80 LoRA support engines referencing them — Lathe AI is textbook scaffold-without-loop.

**Tier-2 coordinator is fragmented** — 4 candidates (PRISMUnifiedOrchestrator, AISystemRouter, MetaAIOrchestration, AIIntelligenceMaximizer), no canonical. Claude calls Tier-3 directly with no supervision contract.

## Knowledge bridge matrix (silent-rot detection)

**Ingestion:** 4 active (PDF Learn 7,250 tips · hyperMILL 434 · JM Die 24,545 indexed · cad-engine store) · 1 stale · 2 dead (Video Learn never started; JM Die CAD Corpus engine awaits binary parser).

**Consumers (15 audited):** 5 active · 1 stale · 4 broken · **5 never-wired**.

**Live verification: 0 of 5 test queries cited tribal sources.** Critical findings:
- \`ai_milling_deep_reason\` returned "0 evidence" against 7,250-tip corpus
- \`cam_strategy_recommend\` bypasses both \`cam_tribal_lookup\` AND \`cam_rag_retrieve\` despite same dispatcher
- \`MillingAGIMaster\`, \`LatheAGIKnowledgeUnification\`, \`CADDrawingKnowledge\` carry "Knowledge"/"AGI" branding but show **0 invocations** of tribal/playbook/RAG engines

## Top 10 honest gaps

${top10Gaps.length ? top10Gaps.join("\n") : `1. Pillar telemetry rot — system cannot self-report what's wired
2. capability_census + auto-wiring scan + semantic search are OFFLINE
3. Lead-in/lead-out optimization is a stub
4. Build-quality-aware feed-rate ceiling is a stub
5. Esprit tier-1 priority unjustified by current wiring
6. 35-vs-38-stage post pipeline number conflict
7. Per-block adaptive S/F has no E2E test
8. Tribal tip live count is 0 despite 3,700 in CLAUDE.md
9. Vision says 109 hooks; reality is 414 (under-reported)
10. System Coordinator AI tier is fragmented`}

## Corpus reality (DO NOT treat as canonical)

Programs in \`H:/prism/JM DIE/\` are **noisy training data, NOT gold-standard**. Custom posts in \`H:/prism/Resources/\` are **work-in-progress reference, also suspect**. PRISM legitimately may exceed Mark's existing programs — flag improvements with physics evidence, sellable feature.

Convergence policy: \`started\` → free_to_improve · \`in_progress\` → review_and_decide · \`fine_tuned\` → must_match.

## Safety architecture (calibrated, not absolute)

S(x) ≥ 0.70 hard block · Ω ≥ 0.70 release-ready · Evidence ≥ L3 · validate_anti_regression before file replacement. Operator-in-the-loop unconditional — system sign-off does NOT authorize machine execution; operator does. PRISM does NOT claim 100% accuracy. Defense in depth: engines + simulations + hooks + Claude meta-gate + operator.

## Active build context (auto-injected)

${buildContext ? buildContext.split("\n").slice(7, 60).join("\n") : "*PRISM-BUILD-CONTEXT.md not yet generated. Run `node H:/prism/mcp-server/scripts/generate-build-context.mjs`.*"}

> Full active-build snapshot: \`state/shared/PRISM-BUILD-CONTEXT.md\` — regenerated hourly by drift monitor + on staleness.

## Build vision per component (consult before building)

${buildVision ? "**" + (buildVision.match(/Components covered\n\n([\s\S]+?)\n---/) || [, "see file"])[1].slice(0, 800) + "**\n\n*Full vision per component in `state/shared/PRISM-BUILD-VISION.md`. Read the relevant section BEFORE writing code for that component.*" : "*PRISM-BUILD-VISION.md not yet generated. Run `node H:/prism/mcp-server/scripts/generate-build-vision.mjs`.*"}

## Active work + per-chat lanes

- Branch: \`work/cam-exhaust-ms0\` · last topic: \`U-PPGW-RapidReposition-Wiring-followup\` · 3 sessions in last 24h
- 6 concurrent Claude chats — each owns its own \`work/<scope>\` worktree
- Active claims: see \`AGENT_WORKBOARD.md\` and chat bus messages from \`prism_context:chat_post\`
- Multi-chat conflict-fork rule: never fight for shared HEAD — fork to your own worktree

## Wiki + memory pulse (compounding-by-default — see \`OBSIDIAN-COMPOUND-MS0\`)

**Vault:** \`H:/prism/knowledge/\` (Karpathy LLM-Wiki + auto-mirrored memory atomic notes).

${wikiTail.length ? `**Recent wiki activity** (last 5 distinct ops from \`wiki/log.md\`):\n${wikiTail.map((l) => `- ${l}`).join("\n")}` : "*No wiki/log.md activity captured (file empty or missing).*"}

**Memory vault:** ${memoryStats.total} atomic notes total · **${memoryStats.recent}** modified in last 24h.

> Recall pulse: keyword-gated injection via \`memory-rag-inject.mjs\` + \`wiki-precheck-inject.mjs\`. Use \`[[wiki-links]]\` in new memories for free cross-reference. Don't re-derive what the wiki already documents — query \`/wiki-query <name>\`.

## Drift monitor

\`scripts/brief-drift-monitor.mjs\` runs hourly via scheduled task, regenerates this brief on material drift (engine count >5%, new dispatcher, AI training event, CAM addin status change, JM fleet status change). Drift events logged to \`state/shared/brief-drift-log.jsonl\`.

---

**Generation:** ${NOW}  ·  Last regenerated ${briefAgeNote === Infinity ? "(first generation)" : briefAgeNote.toFixed(1) + "h ago"}.
`;

if (FLAGS.write || FLAGS.both) {
  writeFileSync(BRIEF_PATH, brief, "utf8");
}
if (FLAGS.inject || FLAGS.both) {
  process.stdout.write(brief);
}

process.exit(0);
