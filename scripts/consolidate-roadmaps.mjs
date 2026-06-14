#!/usr/bin/env node
/**
 * consolidate-roadmaps.mjs — unify every PRISM roadmap into one inventory.
 *
 * Spec: ROADMAP-CONSOLIDATION (slot juliett, forge7, 2026-05-16).
 *
 * PRISM's planned work is scattered across uncoordinated sources. This script
 * merges them into a single consolidated inventory + a bridge/synergy layer:
 *
 *   STRUCTURED sources (deterministic):
 *     - state/shared/MILESTONE_PROGRESS.json   680 ms / 5128 units (shipped flag)
 *     - mcp-server/data/roadmap-index.json     750 milestones (status)
 *     - mcp-server/data/milestones/*.json      694 envelopes (per-unit ids)
 *     - state/shared/BUILD_STATE.json          NEEDS_WIRING domain rollup
 *     - state/shared/specs/MISC-TASKS-INVENTORY.json   318 orphaned tasks
 *   PROSE sources (pre-extracted by 6 agents → roadmap-consolidation-scan/):
 *     - REVENUE v7.6, BACKEND-DEVTOOLS-MEGA, UNIFIED-v2, prism-stabilization,
 *       GIT-TREE-REMEDIATION-MS0, OBSIDIAN-INTELLIGENCE-MS3
 *
 * OUTPUT: state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}
 *   - milestones[]          every milestone, unified, with shipped/pending
 *   - pending_units[]       every un-shipped unit (the master remaining-work set)
 *   - unconsolidated_prose[] prose-roadmap units with NO milestone envelope
 *   - bridge_units          wiring (domain-grouped) + deep-integration synergy
 *
 * Advisory only — never mutates a roadmap or envelope.
 *
 * Usage:  node scripts/consolidate-roadmaps.mjs [--json]
 * Exit:   0 ok · 1 validation error · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const PROSE_AGENT_COUNT = 6;

// ─── deep-integration bridge units (curated from PRISM's documented galaxy) ──
// Each names two BUILT subsystems that should be connected for the platform to
// function as one organism. Source: CLAUDE-BRIEF galaxy description.
export const DEEP_INTEGRATION_BRIDGES = [
  { id: "U-BRIDGE-SFC-FUSION", title: "SFC speeds/feeds → Fusion 360 toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_fusion bridge", intent: "Physics-backed speeds/feeds flow directly into Fusion 360 toolpath generation." },
  { id: "U-BRIDGE-SFC-HYPERMILL", title: "SFC speeds/feeds → hyperMILL toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_hypermill bridge", intent: "SFC output drives hyperMILL cycle parameters." },
  { id: "U-BRIDGE-SFC-MASTERCAM", title: "SFC speeds/feeds → Mastercam toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_mastercam bridge", intent: "SFC output drives Mastercam operation parameters." },
  { id: "U-BRIDGE-SFC-ESPRIT", title: "SFC speeds/feeds → Esprit toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_esprit bridge", intent: "SFC output drives Esprit toolpath parameters." },
  { id: "U-BRIDGE-SFC-INVENTORHSM", title: "SFC speeds/feeds → Inventor HSM toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_inventor_hsm bridge", intent: "SFC output drives Inventor HSM cycle parameters." },
  { id: "U-BRIDGE-SFC-SOLIDWORKS", title: "SFC speeds/feeds → SolidWorks CAM toolpath bridge", from: "SpeedFeedOrchestrator", to: "cam_solidworks bridge", intent: "SFC output drives SolidWorks CAM parameters." },
  { id: "U-BRIDGE-MASTERPOST-CAM", title: "Master Post → 6 CAM bridges post-output unification", from: "MasterPost", to: "all 6 CAM bridges", intent: "One post-processor surface emits controller-correct NC for every CAM bridge." },
  { id: "U-BRIDGE-CAD-CAM-HANDOFF", title: "CAD AI → CAM AI autonomous handoff", from: "CAD generation AI", to: "CAM programming AI", intent: "Autonomously-generated CAD geometry flows into CAM programming without a manual step." },
  { id: "U-BRIDGE-AI-TIER1-TIER2", title: "Tier-1 Claude → Tier-2 FullSystemAICoordinator command path", from: "Claude orchestrator", to: "FullSystemAICoordinator", intent: "Master orchestrator delegates cleanly to the Tier-2 coordinator." },
  { id: "U-BRIDGE-AI-TIER2-TIER3", title: "Tier-2 coordinator → 7 Tier-3 domain-specialist AI fan-out", from: "FullSystemAICoordinator", to: "7 domain specialist AIs", intent: "Tier-2 routes domain work to each Tier-3 specialist and merges results." },
  { id: "U-BRIDGE-SHOPFLOOR-LEARN", title: "Shop-floor telemetry → closed-loop learning ingestion", from: "shop-floor / MTConnect", to: "learning engines", intent: "Real machine telemetry feeds the closed-loop learning layer." },
  { id: "U-BRIDGE-LEARN-SFC", title: "Closed-loop learning → SFC parameter refinement", from: "learning engines", to: "SpeedFeedOrchestrator", intent: "Learned outcomes refine SFC's physics parameters over time." },
  { id: "U-BRIDGE-LEARN-CAM", title: "Closed-loop learning → CAM strategy refinement", from: "learning engines", to: "CAM strategy selectors", intent: "Learned outcomes refine CAM toolpath strategy selection." },
  { id: "U-BRIDGE-ERP-SCHED", title: "ERP ↔ scheduling / capacity planning", from: "ERP integration", to: "scheduling + capacity engines", intent: "ERP work orders drive machine scheduling and capacity planning." },
  { id: "U-BRIDGE-ERP-QUOTE", title: "ERP ↔ quoting / cost estimation", from: "ERP integration", to: "quoting + cost engines", intent: "Quoting and should-cost analysis read from and write to ERP." },
  { id: "U-BRIDGE-OPERATOR-GATES", title: "Operator-in-the-loop approval gates across CAD/CAM/post", from: "operator approval layer", to: "CAD + CAM + post pipelines", intent: "Unconditional operator review gates wired at every autonomous-output boundary." },
];

// ─── io helpers ──────────────────────────────────────────────────────────

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { throw new Error(`failed to parse ${p}: ${e.message}`); }
}
function readJsonSafe(p) { try { return readJson(p); } catch { return null; } }

export function loadEnvelopes(dir) {
  const out = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")); } catch { return out; }
  for (const f of files) { const j = readJsonSafe(path.join(dir, f)); if (j) out.push(j); }
  return out;
}

export function loadProseAgents(scanDir) {
  const out = [];
  for (let n = 1; n <= PROSE_AGENT_COUNT; n++) {
    const p = path.join(scanDir, `agent-${n}.json`);
    if (!fs.existsSync(p)) throw new Error(`missing prose agent output agent-${n}.json`);
    const j = readJson(p);
    if (!Array.isArray(j.units)) throw new Error(`agent-${n}.json has no units[]`);
    out.push(j);
  }
  return out;
}

// ─── pure consolidation ──────────────────────────────────────────────────

export function normId(s) { return typeof s === "string" ? s.trim().toUpperCase() : ""; }

/** Unify milestones from MILESTONE_PROGRESS + roadmap-index + envelopes. */
export function consolidateMilestones({ milestoneProgress, roadmapIndex, envelopes }) {
  const byId = new Map();
  const ensure = (id) => {
    const k = normId(id);
    if (!k) return null;
    if (!byId.has(k)) byId.set(k, { id: k, title: "", source_roadmaps: [], total: 0, shipped: 0, pending: 0, claimedStatus: "", derivedStatus: "", drift: "" });
    return byId.get(k);
  };
  const mp = milestoneProgress && milestoneProgress.milestones ? Object.values(milestoneProgress.milestones) : [];
  for (const ms of mp) {
    const m = ensure(ms.id);
    if (!m) continue;
    m.title = ms.title || m.title;
    m.total = ms.total ?? m.total;
    m.shipped = ms.shipped ?? m.shipped;
    m.pending = ms.pending ?? m.pending;
    m.claimedStatus = ms.claimedStatus || m.claimedStatus;
    m.derivedStatus = ms.derivedStatus || m.derivedStatus;
    m.drift = ms.drift || m.drift;
    if (!m.source_roadmaps.includes("MILESTONE_PROGRESS")) m.source_roadmaps.push("MILESTONE_PROGRESS");
  }
  for (const ms of (roadmapIndex && Array.isArray(roadmapIndex.milestones) ? roadmapIndex.milestones : [])) {
    const m = ensure(ms.id);
    if (!m) continue;
    if (!m.title) m.title = ms.title || "";
    if (!m.claimedStatus) m.claimedStatus = ms.status || "";
    if (!m.source_roadmaps.includes("roadmap-index")) m.source_roadmaps.push("roadmap-index");
  }
  for (const env of envelopes || []) {
    const m = ensure(env && env.id);
    if (!m) continue;
    if (!m.title) m.title = env.title || "";
    if (!m.source_roadmaps.includes("envelope")) m.source_roadmaps.push("envelope");
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Every un-shipped unit from MILESTONE_PROGRESS — the master remaining-work set. */
export function collectPendingUnits(milestoneProgress) {
  const out = [];
  const mp = milestoneProgress && milestoneProgress.milestones ? Object.values(milestoneProgress.milestones) : [];
  for (const ms of mp) {
    for (const u of (Array.isArray(ms.units) ? ms.units : [])) {
      if (u && !u.shipped) {
        out.push({
          unit_id: u.id || null,
          milestone: ms.id,
          title: u.title || "",
          status: (u.status || "pending"),
          consolidated: true,
          source: "MILESTONE_PROGRESS",
        });
      }
    }
  }
  return out;
}

/** Build the set of every unit-id already in an envelope or MILESTONE_PROGRESS. */
export function buildKnownUnitIds({ milestoneProgress, envelopes }) {
  const ids = new Set();
  const mp = milestoneProgress && milestoneProgress.milestones ? Object.values(milestoneProgress.milestones) : [];
  for (const ms of mp) for (const u of (Array.isArray(ms.units) ? ms.units : [])) if (u && u.id) ids.add(normId(u.id));
  for (const env of (Array.isArray(envelopes) ? envelopes : [])) for (const u of (Array.isArray(env.units) ? env.units : [])) if (u && u.id) ids.add(normId(u.id));
  return ids;
}

/** Prose-roadmap units whose unit-id is in NO envelope / MILESTONE_PROGRESS. */
export function crossRefProse(proseAgents, knownUnitIds) {
  const unconsolidated = [];
  const seen = new Set();
  let totalProse = 0;
  for (const agent of proseAgents) {
    for (const u of (agent.units || [])) {
      totalProse++;
      const id = normId(u.unit_id);
      // Units with no id, or an id not known to any envelope/MP → un-consolidated.
      if (id && knownUnitIds.has(id)) continue;
      const key = id || ("T:" + String(u.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
      if (seen.has(key)) continue;
      seen.add(key);
      unconsolidated.push({
        unit_id: u.unit_id || null,
        milestone: u.milestone || null,
        title: u.title || "",
        intent: u.intent || "",
        source_roadmap: agent.source_roadmap || "unknown",
        status: u.status || "unknown",
      });
    }
  }
  return { unconsolidated, totalProse };
}

/**
 * Domain-grouped wiring bridge units from BUILD_STATE NEEDS_WIRING.top_domains,
 * plus a long-tail catch-all so the wiring layer covers EVERY unwired engine —
 * `top_domains` is only the top-25 by count; the total is in `summary`.
 */
export function buildWiringUnits(buildState) {
  const nw = buildState && buildState.NEEDS_WIRING;
  const domains = nw && Array.isArray(nw.top_domains) ? nw.top_domains : [];
  const units = domains.map((d) => ({
    id: "U-BRIDGE-WIRE-" + String(d.domain || "OTHER").toUpperCase().replace(/[^A-Z0-9]+/g, ""),
    title: `Wire ${d.count} unwired ${d.domain} engine(s) to their dispatcher(s)`,
    domain: d.domain || "Other",
    engine_count: d.count || 0,
    intent: `Connect the ${d.count} built-but-unwired ${d.domain}-domain engines into their natural MCP dispatcher(s) so the capability is reachable.`,
  }));
  // Long-tail: total unwired (from summary) minus the top-domains already covered.
  const totalMatch = nw && typeof nw.summary === "string" ? nw.summary.match(/(\d+)\s+engines/) : null;
  const total = totalMatch ? Number(totalMatch[1]) : 0;
  const covered = units.reduce((s, u) => s + (u.engine_count || 0), 0);
  if (total > covered) {
    units.push({
      id: "U-BRIDGE-WIRE-LONGTAIL",
      title: `Wire ${total - covered} unwired engine(s) in long-tail domains to their dispatcher(s)`,
      domain: "Long-tail (domains outside the top 25)",
      engine_count: total - covered,
      intent: `Connect the remaining ${total - covered} built-but-unwired engines (small/misc domains beyond the top 25) into their MCP dispatchers.`,
    });
  }
  return units;
}

/** Full pipeline. Returns the consolidated inventory object. */
export function consolidate(sources) {
  const { milestoneProgress, roadmapIndex, envelopes, proseAgents, miscInventory, buildState } = sources;

  const milestones = consolidateMilestones({ milestoneProgress, roadmapIndex, envelopes });
  const pendingUnits = collectPendingUnits(milestoneProgress);
  const knownUnitIds = buildKnownUnitIds({ milestoneProgress, envelopes });
  const { unconsolidated, totalProse } = crossRefProse(proseAgents, knownUnitIds);
  const wiringUnits = buildWiringUnits(buildState);
  const miscCount = miscInventory && Array.isArray(miscInventory.items) ? miscInventory.items.length : 0;

  const wiringEngineTotal = wiringUnits.reduce((s, u) => s + (u.engine_count || 0), 0);
  const milestonesWithPending = milestones.filter((m) => (m.pending || 0) > 0).length;
  const shippedUnits = pendingUnits.length
    ? milestones.reduce((s, m) => s + (m.shipped || 0), 0)
    : 0;

  const stats = {
    totalMilestones: milestones.length,
    milestonesWithPending,
    pendingUnits: pendingUnits.length,
    shippedUnits,
    proseUnitsExtracted: totalProse,
    proseUnconsolidated: unconsolidated.length,
    miscOrphans: miscCount,
    bridgeWiringUnits: wiringUnits.length,
    bridgeWiringEngines: wiringEngineTotal,
    deepIntegrationUnits: DEEP_INTEGRATION_BRIDGES.length,
    grandTotalRemaining:
      pendingUnits.length + unconsolidated.length + miscCount +
      wiringUnits.length + DEEP_INTEGRATION_BRIDGES.length,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      method: "deterministic consolidation of MILESTONE_PROGRESS + roadmap-index + 694 envelopes + BUILD_STATE + MISC-TASKS-INVENTORY + 6-agent prose-roadmap extraction",
      proseSources: proseAgents.map((a) => a.source_roadmap),
      advisoryOnly: true,
      mustHumanVerify: true,
      nextPhase: "Execute the remaining units (separate /loop or milestone passes). Bridge units wire/synergize the built galaxy.",
    },
    stats,
    milestones,
    pending_units: pendingUnits,
    unconsolidated_prose: unconsolidated,
    bridge_units: { wiring: wiringUnits, deep_integration: DEEP_INTEGRATION_BRIDGES },
  };
}

// ─── rendering ───────────────────────────────────────────────────────────

export function renderMarkdown(inv) {
  const s = inv.stats;
  const L = [];
  L.push("# PRISM ROADMAP — Consolidated Inventory");
  L.push("");
  L.push(`> Generated ${inv.generatedAt} · schemaVersion ${inv.schemaVersion} · **advisory, human-verify**`);
  L.push("> Every roadmap unified: what is left to do + the bridge layer that synergizes the galaxy.");
  L.push("");
  L.push("## Headline");
  L.push("");
  L.push(`- Milestones: **${s.totalMilestones}** (${s.milestonesWithPending} with pending work)`);
  L.push(`- **Pending units (master remaining-work set): ${s.pendingUnits}**`);
  L.push(`- Prose-roadmap units extracted: ${s.proseUnitsExtracted} · **un-consolidated (no envelope): ${s.proseUnconsolidated}**`);
  L.push(`- Misc orphaned tasks (MISC-TASKS-INVENTORY): ${s.miscOrphans}`);
  L.push(`- Bridge layer: **${s.bridgeWiringUnits} wiring units** (${s.bridgeWiringEngines} engines) + **${s.deepIntegrationUnits} deep-integration units**`);
  L.push(`- **Grand total remaining work items: ${s.grandTotalRemaining}**`);
  L.push("");
  L.push("## Bridge layer — wire + synergize the galaxy");
  L.push("");
  L.push("### Wiring units (domain-grouped — 836 built-but-unwired engines)");
  L.push("");
  L.push("| Unit | Domain | Engines | Intent |");
  L.push("|------|--------|---------|--------|");
  for (const u of inv.bridge_units.wiring) {
    L.push(`| ${u.id} | ${u.domain} | ${u.engine_count} | ${u.intent.replace(/\|/g, "\\|")} |`);
  }
  L.push("");
  L.push("### Deep-integration units (cross-subsystem synergy)");
  L.push("");
  L.push("| Unit | From → To | Intent |");
  L.push("|------|-----------|--------|");
  for (const u of inv.bridge_units.deep_integration) {
    L.push(`| ${u.id} | ${u.from} → ${u.to} | ${u.intent.replace(/\|/g, "\\|")} |`);
  }
  L.push("");
  L.push("## Un-consolidated prose-roadmap units (work in a roadmap doc with NO envelope)");
  L.push("");
  L.push("| Unit ID | Roadmap | Title |");
  L.push("|---------|---------|-------|");
  for (const u of inv.unconsolidated_prose) {
    L.push(`| ${u.unit_id || "—"} | ${u.source_roadmap} | ${String(u.title).replace(/\|/g, "\\|").slice(0, 90)} |`);
  }
  L.push("");
  L.push("## Milestone rollup (pending work per milestone)");
  L.push("");
  L.push("| Milestone | Shipped/Total | Pending | Status | Roadmaps |");
  L.push("|-----------|---------------|---------|--------|----------|");
  for (const m of inv.milestones) {
    if ((m.pending || 0) === 0 && (m.total || 0) === 0) continue;
    L.push(`| ${m.id} | ${m.shipped || 0}/${m.total || 0} | ${m.pending || 0} | ${m.derivedStatus || m.claimedStatus || "?"} | ${m.source_roadmaps.join(",")} |`);
  }
  L.push("");
  L.push("_Per-unit detail (all " + s.pendingUnits + " pending units): ROADMAP-CONSOLIDATED.json `pending_units[]`._");
  L.push("");
  return L.join("\n");
}

export function renderHtml(inv) {
  const s = inv.stats;
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const wRows = inv.bridge_units.wiring.map((u) => `<tr><td>${esc(u.id)}</td><td>${esc(u.domain)}</td><td>${u.engine_count}</td><td>${esc(u.intent)}</td></tr>`).join("\n");
  const dRows = inv.bridge_units.deep_integration.map((u) => `<tr><td>${esc(u.id)}</td><td>${esc(u.from)} → ${esc(u.to)}</td><td>${esc(u.intent)}</td></tr>`).join("\n");
  const mRows = inv.milestones.filter((m) => (m.pending || 0) > 0 || (m.total || 0) > 0)
    .map((m) => `<tr><td>${esc(m.id)}</td><td>${m.shipped || 0}/${m.total || 0}</td><td>${m.pending || 0}</td><td>${esc(m.derivedStatus || m.claimedStatus || "?")}</td></tr>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PRISM Roadmap — Consolidated</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;margin:2rem;background:#0f172a;color:#e2e8f0}
h1,h2{color:#38bdf8}.stat{display:inline-block;background:#1e293b;padding:.4rem .8rem;margin:.2rem;border-radius:6px}
table{border-collapse:collapse;width:100%;margin:.6rem 0}th,td{border:1px solid #334155;padding:.35rem .6rem;text-align:left}
th{background:#1e293b}tr:nth-child(even){background:#1e293b55}
.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem;top:1rem;background:#0ea5e9;color:#fff;padding:.4rem .8rem;border-radius:4px}
</style></head><body>
<a href="#content" class="skip-link">Skip to content</a>
<main id="content" role="main">
<h1 id="title">PRISM Roadmap — Consolidated Inventory</h1>
<p>Generated ${esc(inv.generatedAt)} · schemaVersion ${esc(inv.schemaVersion)} · <b>advisory — human-verify</b></p>
<div>
<span class="stat">milestones ${s.totalMilestones}</span><span class="stat">pending units ${s.pendingUnits}</span>
<span class="stat">prose un-consolidated ${s.proseUnconsolidated}</span><span class="stat">misc orphans ${s.miscOrphans}</span>
<span class="stat">wiring units ${s.bridgeWiringUnits}</span><span class="stat">deep-integration ${s.deepIntegrationUnits}</span>
<span class="stat" style="background:#0369a1">grand total ${s.grandTotalRemaining}</span>
</div>
<h2 id="wiring">Bridge layer — wiring units</h2>
<table><thead><tr><th>Unit</th><th>Domain</th><th>Engines</th><th>Intent</th></tr></thead><tbody>${wRows}</tbody></table>
<h2 id="deep-integration">Bridge layer — deep-integration units</h2>
<table><thead><tr><th>Unit</th><th>From → To</th><th>Intent</th></tr></thead><tbody>${dRows}</tbody></table>
<h2 id="rollup">Milestone rollup</h2>
<table><thead><tr><th>Milestone</th><th>Shipped/Total</th><th>Pending</th><th>Status</th></tr></thead><tbody>${mRows}</tbody></table>
</main></body></html>`;
}

// ─── entrypoint ──────────────────────────────────────────────────────────

export function main(argv = process.argv.slice(2)) {
  const useJson = argv.includes("--json");
  const specsDir = path.join(ROOT, "state/shared/specs");
  const scanDir = path.join(specsDir, "roadmap-consolidation-scan");

  let sources;
  try {
    const milestoneProgress = readJson(path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json"));
    const roadmapIndex = readJson(path.join(ROOT, "mcp-server/data/roadmap-index.json"));
    const envelopes = loadEnvelopes(path.join(ROOT, "mcp-server/data/milestones"));
    const proseAgents = loadProseAgents(scanDir);
    const miscInventory = readJsonSafe(path.join(specsDir, "MISC-TASKS-INVENTORY.json"));
    const buildState = readJson(path.join(ROOT, "state/shared/BUILD_STATE.json"));
    sources = { milestoneProgress, roadmapIndex, envelopes, proseAgents, miscInventory, buildState };
  } catch (e) {
    console.error(`FATAL: source load failed — ${e.message}`);
    return e.message.includes("missing prose agent") ? 1 : 2;
  }

  let inventory;
  try { inventory = consolidate(sources); }
  catch (e) { console.error(`FATAL: consolidate failed — ${e.message}`); return 2; }

  try {
    fs.writeFileSync(path.join(specsDir, "ROADMAP-CONSOLIDATED.json"), JSON.stringify(inventory, null, 2));
    fs.writeFileSync(path.join(specsDir, "ROADMAP-CONSOLIDATED.md"), renderMarkdown(inventory));
    fs.writeFileSync(path.join(specsDir, "ROADMAP-CONSOLIDATED.html"), renderHtml(inventory));
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  const s = inventory.stats;
  if (useJson) {
    console.log(JSON.stringify({ ok: true, ...s }, null, 2));
  } else {
    console.log("ROADMAP consolidation complete:");
    console.log(`  milestones ${s.totalMilestones} (${s.milestonesWithPending} pending)`);
    console.log(`  pending units ${s.pendingUnits} · prose un-consolidated ${s.proseUnconsolidated} · misc orphans ${s.miscOrphans}`);
    console.log(`  bridge: ${s.bridgeWiringUnits} wiring (${s.bridgeWiringEngines} engines) + ${s.deepIntegrationUnits} deep-integration`);
    console.log(`  GRAND TOTAL remaining: ${s.grandTotalRemaining}`);
    console.log(`  wrote ROADMAP-CONSOLIDATED.{json,md,html}`);
  }
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
