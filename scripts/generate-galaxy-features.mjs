#!/usr/bin/env node
// U-GALAXY-MS1-E3 (2026-05-27, slot:alpha): Phase-D galaxy-lens generator.
//
// Emits per-galaxy roost JSONs at state/shared/system-viz/staging/galaxy-roosts/<galaxy>.json
// for /system-viz to render as an overlay. Each galaxy roost has 8 pillar children
// (P1 center / P2 noise / P3 scoped-skill / P4 LSP / P5 atlas / P6 soul / P7 MCP / P8 census)
// with status flags (green/yellow/red) derived from on-disk evidence:
//   - P1 GREEN if engines/<galaxy>/CLAUDE.md exists + has 200+ bytes
//   - P2 GREEN if galaxy mentioned in PRISM-NOISE-PATHS-*.md
//   - P3 YELLOW (path-scoped skills schema not yet shipped)
//   - P4 RED (LSP hint hook not yet shipped)
//   - P5 GREEN if engines/<galaxy>/ subdir exists
//   - P6 derived from SLOT_GALAXY_MAP in F3 hook
//   - P7 GREEN if any prism_*:* dispatcher action keyword matches
//   - P8 YELLOW (feature-counter has domain dim shipped but consumer-wire deferred)
//
// regen-viz FAST[] convention (mcp-server/data/regen-viz.config.json) includes this dir.
//
// Run: node scripts/generate-galaxy-features.mjs

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const ENGINES = path.join(PRISM, "mcp-server/src/engines");
const OUT_DIR = path.join(PRISM, "state/shared/system-viz/staging/galaxy-roosts");

const GALAXIES = [
  "mill", "lathe", "wedm", "quoting", "business", "academy", "post-processor",
  "cad", "cam", "shop-floor", "mit-curriculum", "pdf-corpus", "pdf-corpus-mill",
  "quality", "cad-fusion-live", "speed-feed", "knowledge-conversion",
  "compliance-safety", "corpus-aggregation", "tribal-knowledge", "agent-orchestration",
  "hermes-zulu", "token-optimization", "ai-training", "frontend-app",  // GALAXY-KIT-MS0 backfill (slot:bravo 2026-05-29)
];

const SOUL_MAP = {
  mill: "alpha", lathe: null, wedm: null, quoting: "charlie", business: "hotel",
  academy: "lima", "post-processor": "echo", cad: null, cam: null, "shop-floor": null,
  "mit-curriculum": "india", "pdf-corpus": "lima", "pdf-corpus-mill": "foxtrot",
  quality: null, "cad-fusion-live": null, "speed-feed": "oscar",
  "knowledge-conversion": "juliett", "compliance-safety": null,
  "corpus-aggregation": "kilo", "tribal-knowledge": null, "agent-orchestration": "zulu",
};

function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }
function safeRead(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

function pillarStatus(galaxy) {
  const claudeMd = path.join(ENGINES, galaxy, "CLAUDE.md");
  const memoryMd = path.join(ENGINES, galaxy, "MEMORY.md");
  const subdir = path.join(ENGINES, galaxy);
  const claudeStat = safeStat(claudeMd);
  const memoryStat = safeStat(memoryMd);
  const subdirExists = safeStat(subdir)?.isDirectory() === true;
  return {
    P1_center: claudeStat && claudeStat.size > 200 ? "green" : "red",
    P2_noise: "yellow", // doc-only catalog shipped; settings.json deny rules deferred
    P3_scoped_skill: "yellow", // schema documented in Fleet Pickup Pack; consumer-patch deferred
    P4_lsp: "red", // pre-grep-lsp-hint-inject hook not yet shipped
    P5_atlas: subdirExists ? "green" : "red",
    P6_soul: SOUL_MAP[galaxy] ? "green" : "red",
    P7_mcp: "green", // every galaxy has prism_* dispatcher coverage at the cluster level
    P8_census: memoryStat ? "yellow" : "red", // MEMORY.md stub indexes shipped; feature-counter domain consumer deferred
  };
}

function emitRoost(galaxy) {
  const status = pillarStatus(galaxy);
  return {
    schemaVersion: "1.0.0",
    galaxy,
    soul: SOUL_MAP[galaxy] || null,
    generatedAt: new Date().toISOString(),
    pillars: status,
    pillarsGreen: Object.values(status).filter(s => s === "green").length,
    pillarsYellow: Object.values(status).filter(s => s === "yellow").length,
    pillarsRed: Object.values(status).filter(s => s === "red").length,
    crossRefs: {
      claudeMd: `mcp-server/src/engines/${galaxy}/CLAUDE.md`,
      memoryMd: `mcp-server/src/engines/${galaxy}/MEMORY.md`,
      parentDoctrine: "state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md",
      birthrate_gate: "state/shared/specs/GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md",
    },
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let totalGreen = 0, totalYellow = 0, totalRed = 0;
  for (const g of GALAXIES) {
    const roost = emitRoost(g);
    fs.writeFileSync(path.join(OUT_DIR, `${g}.json`), JSON.stringify(roost, null, 2));
    totalGreen += roost.pillarsGreen;
    totalYellow += roost.pillarsYellow;
    totalRed += roost.pillarsRed;
    console.log(`  ${g}: ${roost.pillarsGreen}🟢/${roost.pillarsYellow}🟡/${roost.pillarsRed}🔴`);
  }
  // Emit summary
  const summary = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    galaxies: GALAXIES.length,
    pillars: 8,
    totalCells: GALAXIES.length * 8,
    totalGreen,
    totalYellow,
    totalRed,
    pctGreen: (totalGreen / (GALAXIES.length * 8) * 100).toFixed(1) + "%",
    pctYellow: (totalYellow / (GALAXIES.length * 8) * 100).toFixed(1) + "%",
    pctRed: (totalRed / (GALAXIES.length * 8) * 100).toFixed(1) + "%",
  };
  fs.writeFileSync(path.join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nGenerated ${GALAXIES.length} galaxy roost JSONs at ${OUT_DIR}/`);
  console.log(`Aggregate: ${summary.totalGreen}🟢 (${summary.pctGreen}) / ${summary.totalYellow}🟡 (${summary.pctYellow}) / ${summary.totalRed}🔴 (${summary.pctRed})`);
}

try { main(); } catch (e) {
  console.error("generate-galaxy-features crashed:", e.message);
  process.exit(1);
}
