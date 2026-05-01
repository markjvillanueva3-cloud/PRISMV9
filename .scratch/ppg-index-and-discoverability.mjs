#!/usr/bin/env node
// Register 39 PPG-MS milestones in mcp-server/data/roadmap-index.json AND
// create discoverable top-level + state/shared index files so other chats
// can find the PPG roadmap without grepping all 685 milestone IDs.
// Idempotent — re-runs are safe (skip if already registered).

import fs from "node:fs";
import path from "node:path";

const MS_DIR = "H:/prism/mcp-server/data/milestones";
const ROADMAP_INDEX = "H:/prism/mcp-server/data/roadmap-index.json";
const TOP_INDEX = "H:/prism/PPG-ROADMAP-INDEX.md";
const SHARED_INDEX = "H:/prism/state/shared/PPG-ROADMAP-INDEX.md";

const NOW = new Date().toISOString();

// ---------------------------------------------------------------------------
// 1) Read all PPG-MS envelopes
// ---------------------------------------------------------------------------
const ppgFiles = fs
  .readdirSync(MS_DIR)
  .filter((f) => /^PPG-MS\d+\.json$/.test(f))
  .sort((a, b) => {
    const na = parseInt(a.match(/MS(\d+)/)[1], 10);
    const nb = parseInt(b.match(/MS(\d+)/)[1], 10);
    return na - nb;
  });

console.log(`Found ${ppgFiles.length} PPG-MS envelope files`);

const envelopes = ppgFiles.map((f) => ({
  filename: f,
  json: JSON.parse(fs.readFileSync(path.join(MS_DIR, f), "utf8")),
}));

// ---------------------------------------------------------------------------
// 2) Build roadmap-index entries
// ---------------------------------------------------------------------------

// Priority assignment: foundational > novel > equipment-deferred
const HIGH_PRIORITY = new Set([
  "PPG-MS0", "PPG-MS1", "PPG-MS2", "PPG-MS5", "PPG-MS7",
  "PPG-MS14", "PPG-MS18", "PPG-MS27", // foundational + sales
]);
const LOW_PRIORITY = new Set([
  "PPG-MS36", // equipment: sensors/LIBS — deferred
  "PPG-MS38", // equipment: AR/voice (some units defer)
]);

function priorityFor(id) {
  if (HIGH_PRIORITY.has(id)) return "HIGH";
  if (LOW_PRIORITY.has(id)) return "LOW";
  return "MEDIUM";
}

function sessionsEstimate(total_units) {
  // Empirical: ~1.5 sessions per simple unit, ~2.5 per complex
  return {
    p50: Math.max(2, Math.ceil(total_units * 1.5)),
    p90: Math.max(3, Math.ceil(total_units * 2.5)),
  };
}

const newEntries = envelopes.map(({ filename, json }) => {
  const sessions = sessionsEstimate(json.total_units || 0);
  const dependencies = Array.isArray(json.depends_on) ? json.depends_on : [];
  return {
    id: json.id,
    title: json.title || json.id,
    track: "PPG",
    status: json.status || "not_started",
    total_units: json.total_units || (json.units ? json.units.length : 0),
    completed_units: json.completed_units || 0,
    dependencies,
    envelope_path: `milestones/${filename}`,
    priority: priorityFor(json.id),
    sessions_p50: sessions.p50,
    sessions_p90: sessions.p90,
    description: (json.description || "").slice(0, 500),
    version: json.version || "1.0.0",
  };
});

// ---------------------------------------------------------------------------
// 3) Patch roadmap-index.json (idempotent — replace existing PPG entries if any)
// ---------------------------------------------------------------------------
const roadmap = JSON.parse(fs.readFileSync(ROADMAP_INDEX, "utf8"));
const existingPPG = (roadmap.milestones || []).filter((m) => (m.id || "").startsWith("PPG-MS"));
const nonPPG = (roadmap.milestones || []).filter((m) => !(m.id || "").startsWith("PPG-MS"));

console.log(`Existing PPG entries: ${existingPPG.length} (will replace)`);
console.log(`Non-PPG entries preserved: ${nonPPG.length}`);

roadmap.milestones = [...nonPPG, ...newEntries];
roadmap.total_milestones = roadmap.milestones.length;
roadmap.completed_milestones = roadmap.milestones.filter((m) => m.status === "complete").length;
roadmap.last_modified = NOW;
roadmap.updated_at = NOW;

fs.writeFileSync(ROADMAP_INDEX, JSON.stringify(roadmap, null, 2) + "\n");
console.log(`roadmap-index.json: total_milestones=${roadmap.total_milestones} (was ${nonPPG.length + existingPPG.length})`);

// ---------------------------------------------------------------------------
// 4) Generate top-level + state/shared discoverability index
// ---------------------------------------------------------------------------

const indexLines = [];
indexLines.push("# PPG Roadmap — Post Processor Generator Track");
indexLines.push("");
indexLines.push("**Track:** PPG (Post Processor Generator)");
indexLines.push(`**Generated:** ${NOW}`);
indexLines.push(`**Total milestones:** ${envelopes.length} (PPG-MS0 through PPG-MS${envelopes.length - 1})`);
indexLines.push(`**Total units:** ${envelopes.reduce((acc, e) => acc + (e.json.total_units || 0), 0)}`);
indexLines.push("");
indexLines.push("## Where to find things");
indexLines.push("");
indexLines.push("| Resource | Path |");
indexLines.push("|---|---|");
indexLines.push("| **Build phasing plan (sales-first)** | `H:/prism/BUILD_ORDER.md` |");
indexLines.push("| **This index** | `H:/prism/PPG-ROADMAP-INDEX.md` (mirrored: `state/shared/PPG-ROADMAP-INDEX.md`) |");
indexLines.push("| **Per-milestone envelopes** | `mcp-server/data/milestones/PPG-MS<N>.json` |");
indexLines.push("| **Master roadmap registry** | `mcp-server/data/roadmap-index.json` (track:\"PPG\") |");
indexLines.push("| **Parent roadmap** | `H:/prism/PRISM-UNIFIED-ROADMAP-v2.md` |");
indexLines.push("");
indexLines.push("## Cross-chat search keywords");
indexLines.push("");
indexLines.push("If you can't find this with a path lookup, grep any of:");
indexLines.push("- `PPG-MS` (39 envelope IDs)");
indexLines.push("- `track\":\"PPG\"` in `mcp-server/data/roadmap-index.json`");
indexLines.push("- `BUILD_ORDER.md` (phasing plan at repo root)");
indexLines.push("- `PostPhysicsSidecarSchema` (MS0/U-PPGM01 — first unit built, schema lives at `mcp-server/src/schemas/postPhysicsSidecarSchema.ts`)");
indexLines.push("");
indexLines.push("## Milestone catalog");
indexLines.push("");
indexLines.push("| ID | Title | Status | Units | Priority | Depends on |");
indexLines.push("|---|---|---|---|---|---|");
for (const { json } of envelopes) {
  const id = json.id;
  const title = (json.title || id).replace(/\|/g, "\\|").slice(0, 90);
  const status = json.status || "not_started";
  const units = `${json.completed_units || 0}/${json.total_units || 0}`;
  const priority = priorityFor(id);
  const deps = Array.isArray(json.depends_on) && json.depends_on.length > 0 ? json.depends_on.join(", ") : "—";
  indexLines.push(`| [${id}](mcp-server/data/milestones/${id}.json) | ${title} | ${status} | ${units} | ${priority} | ${deps} |`);
}
indexLines.push("");
indexLines.push("## Sprint phasing (BUILD_ORDER.md)");
indexLines.push("");
indexLines.push("- **Sprint 1 (foundation):** MS0 sidecar bridge + MS18 FTO + MS2 sanitization + MS5 dialects");
indexLines.push("- **Sprint 2 (block-by-block S/F):** MS1 + MS7 mill print→program");
indexLines.push("- **Sprint 3 (safety + wizard):** MS14 + MS13");
indexLines.push("- **Sprint 4 (sales infra) [parallel w/3]:** MS27 demo + ROI + LOIs");
indexLines.push("- **Sprint 5 (trust layer):** MS9 AGI gates + MS17 3-tier verifier");
indexLines.push("- **Sprint 6 (WEDM) [parallel w/5]:** MS3");
indexLines.push("- **Sprint 7 (cutover/pilot):** MS11 closed loop + MS12 regression + MS28 + MS31");
indexLines.push("- **Sprint 8 (novel wow):** MS33 causal-counterfactual + MS34 self-healing + MS35 Pareto+genome");
indexLines.push("- **Sprint 9 (federated, no robot/sensor):** MS37 federated + MS38 GD&T probe + adaptive FAI");
indexLines.push("- **DEFERRED — Phase 10 (equipment-dependent):** MS36 sensors/LIBS, MS38 AR/voice, MS37 robot cell");
indexLines.push("");
indexLines.push("## What's been built so far");
indexLines.push("");
indexLines.push("| Sprint | Unit | Status | Files |");
indexLines.push("|---|---|---|---|");
indexLines.push("| 1 | U-PPGM01 PostPhysicsSidecarSchema | ✅ DONE (30/30 tests) | `mcp-server/src/schemas/postPhysicsSidecarSchema.ts`, `mcp-server/src/__tests__/PostPhysicsSidecarSchema.test.ts` |");
indexLines.push("");
indexLines.push("## Patch tag history");
indexLines.push("");
indexLines.push("All envelopes carry a `_patches[]` array logging every modification:");
indexLines.push("- `ppg-leverage-16-2026-04-29` (round-1 leverage agent findings)");
indexLines.push("- `ppg-fixes-round2-2026-04-29` (round-2 scrutiny fixes — patent sanitization, S02 wiring, S09 graph)");
indexLines.push("- `ppg-round3-novel-2026-04-29` (round-3 micro-patch + 6 novel milestones MS33-38)");
indexLines.push("- `ppg-round4-gapfills-2026-04-29` (round-4 gap fills — antitrust, FTO budget, hardware tier split)");
indexLines.push("- `ppg-round5-fixes-2026-04-29` (round-5 cycle break + MS2 regression fix + reciprocity)");
indexLines.push("");

const indexText = indexLines.join("\n") + "\n";
fs.writeFileSync(TOP_INDEX, indexText);
fs.writeFileSync(SHARED_INDEX, indexText);

console.log(`Wrote ${TOP_INDEX} (${indexText.length} bytes)`);
console.log(`Wrote ${SHARED_INDEX} (mirror)`);

// ---------------------------------------------------------------------------
// 5) Summary
// ---------------------------------------------------------------------------
console.log(JSON.stringify({
  patched_at: NOW,
  ppg_envelopes_on_disk: envelopes.length,
  ppg_entries_added_to_roadmap_index: newEntries.length,
  ppg_entries_replaced: existingPPG.length,
  total_milestones_after: roadmap.milestones.length,
  index_files_written: [TOP_INDEX, SHARED_INDEX],
  high_priority_ms: [...HIGH_PRIORITY].sort(),
  low_priority_ms: [...LOW_PRIORITY].sort(),
}, null, 2));
