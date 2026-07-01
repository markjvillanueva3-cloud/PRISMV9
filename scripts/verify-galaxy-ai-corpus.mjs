#!/usr/bin/env node
// scripts/verify-galaxy-ai-corpus.mjs
//
// AI-SYNERGY-VERIFY / U-AI-CORPUS-PROOF (slot:alpha 2026-06-16). The operator /goal
// requires AI systems "synergized with ... memories and wikis across all galaxies."
// That synergy is STRUCTURALLY present (galaxy-reasoning-bridge's RAG corpus draws on
// each galaxy's MEMORY + synthesis memory + resolved [[wiki-links]]), but it was never
// DEMONSTRATED with numbers (R12). This harness proves it: for EVERY galaxy it calls the
// REAL corpus assembly (gatherGalaxyDocs, reused -- R8/R5, so the proof == exactly what
// the AI reasons over) and reports which synergy surfaces actually feed the substrate.
// Flags any galaxy whose AI corpus is NOT fed by its synthesis memory or wiki (a real,
// closable synergy gap). Re-runnable proof asset (so the synergy cannot silently regress).
//
// Run: node H:/prism/scripts/verify-galaxy-ai-corpus.mjs [--json]
// Exit: 0 all galaxies fed by memory+synthesis+wiki; 1 gaps found; 2 harness fault.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const ENGINES = path.join(PRISM, "mcp-server/src/engines");

/** Pure: galaxies = engines/ subdirs that carry a MEMORY.md (the canonical galaxy marker). */
export function listGalaxies(enginesDir) {
  try {
    return fs.readdirSync(enginesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(enginesDir, e.name, "MEMORY.md")))
      .map((e) => e.name).sort();
  } catch { return []; }
}

/**
 * Pure: classify a galaxy's assembled corpus docs ([{source,text}]) into the AI-synergy
 * surfaces the /goal names. Source labels come from gatherGalaxyDocs: `${g}/CLAUDE.md`,
 * `${g}/SOUL.md`, `${g}/MEMORY.md`, `${g}/AWARENESS.md`, `${g}_synthesis.md`, `wiki/<name>`.
 */
export function classifyCorpusSources(docs, galaxy) {
  const list = Array.isArray(docs) ? docs : [];
  const has = (suffix) => list.some((d) => d && d.source === `${galaxy}/${suffix}`);
  const wikiCount = list.filter((d) => d && typeof d.source === "string" && d.source.startsWith("wiki/")).length;
  return {
    claude: has("CLAUDE.md"),
    soul: has("SOUL.md"),
    memory: has("MEMORY.md"),
    awareness: has("AWARENESS.md"),
    synthesis: list.some((d) => d && d.source === `${galaxy}_synthesis.md`),
    wikiCount,
    total: list.length,
  };
}

/** Pure: a galaxy is a synergy GAP if its AI corpus lacks synthesis memory OR draws on no wiki. */
export function isGap(row) {
  return !row.synthesis || row.wikiCount === 0;
}

async function main() {
  const json = process.argv.includes("--json");
  const m = await import(pathToFileURL(path.join(PRISM, "scripts/lib/galaxy-reasoning-bridge.mjs")).href);
  const galaxies = listGalaxies(ENGINES);
  const rows = [];
  for (const g of galaxies) {
    let docs = [];
    try { docs = m.gatherGalaxyDocs(g, PRISM, { includeWiki: true, includeMaster: false }); }
    catch { /* fail-soft: empty corpus -> shows as a total-0 gap row */ }
    rows.push({ galaxy: g, ...classifyCorpusSources(docs, g) });
  }
  const n = rows.length;
  const agg = {
    galaxies: n,
    memoryFed: rows.filter((r) => r.memory).length,
    synthesisFed: rows.filter((r) => r.synthesis).length,
    wikiFed: rows.filter((r) => r.wikiCount > 0).length,
    soulFed: rows.filter((r) => r.soul).length,
    claudeFed: rows.filter((r) => r.claude).length,
    awarenessFed: rows.filter((r) => r.awareness).length,
    wikiBodiesTotal: rows.reduce((s, r) => s + r.wikiCount, 0),
  };
  const gaps = rows.filter(isGap);

  if (json) {
    console.log(JSON.stringify({ aggregate: agg, gaps: gaps.map((r) => r.galaxy), rows }, null, 2));
  } else {
    console.log("galaxy".padEnd(20), "CLA SOU MEM AWA SYN  wiki total");
    for (const r of rows) {
      console.log(
        r.galaxy.padEnd(20),
        r.claude ? " Y " : " . ", r.soul ? " Y " : " . ", r.memory ? " Y " : " . ",
        r.awareness ? " Y " : " . ", r.synthesis ? " Y " : " . ",
        String(r.wikiCount).padStart(4), String(r.total).padStart(5),
        isGap(r) ? "  <- GAP" : "");
    }
    console.log(`\nAI-substrate corpus coverage across ${n} galaxies (what the per-galaxy CAG/RAG actually reasons over):`);
    console.log(`  MEMORY fed:    ${agg.memoryFed}/${n}`);
    console.log(`  synthesis fed: ${agg.synthesisFed}/${n}`);
    console.log(`  wiki fed (>0): ${agg.wikiFed}/${n}  (${agg.wikiBodiesTotal} wiki bodies resolved total)`);
    console.log(`  SOUL fed:      ${agg.soulFed}/${n}   CLAUDE: ${agg.claudeFed}/${n}   AWARENESS: ${agg.awarenessFed}/${n}`);
    if (gaps.length) console.log(`\nSYNERGY GAPS (${gaps.length}): AI substrate not fed by synthesis or wiki -> ${gaps.map((r) => r.galaxy).join(", ")}`);
    else console.log(`\nOK: every galaxy's AI substrate is fed by its memory + synthesis memory + wiki.`);
  }
  process.exitCode = gaps.length ? 1 : 0;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("verify-galaxy-ai-corpus.mjs");
if (isMain) main().catch((e) => { console.error("verify-galaxy-ai-corpus failed:", e?.message || e); process.exit(2); });
