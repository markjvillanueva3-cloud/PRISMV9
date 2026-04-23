#!/usr/bin/env node
/**
 * capability-manifest-inject.mjs — Token-Efficient System Awareness
 *
 * Injects a compact PRISM capability summary at session start.
 * ~500 tokens covering: what's built, current position, big vision, key domains.
 *
 * Fires on: SessionStart
 */

import { promises as fs } from "node:fs";
import process from "node:process";

const QUICK_REF = "H:/prism/mcp-server/data/quick-ref.json";
const ROADMAP_INDEX = "H:/prism/mcp-server/data/roadmap-index.json";
const BASELINE = "H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json";

async function loadJSON(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  // Load current state
  const [quickRef, baseline] = await Promise.all([
    loadJSON(QUICK_REF),
    loadJSON(BASELINE),
  ]);

  // Build compact manifest (~500 tokens)
  const parts = [];

  parts.push("PRISM SYSTEM MANIFEST:");

  // Inventory counts (compact)
  if (quickRef?.counts) {
    const c = quickRef.counts;
    parts.push(`BUILT: ${c.engines}E/${c.dispatchers}D/${c.actions}A/${c.algorithms}Alg/${c.registries}R`);
  } else if (baseline?.inventory) {
    const inv = baseline.inventory;
    parts.push(`BUILT: ${inv.engines?.files || 1538}E/${inv.dispatchers}D/${inv.actions}A/${inv.algorithms}Alg`);
  }

  // Key asset counts
  if (baseline?.inventory) {
    const inv = baseline.inventory;
    parts.push(`ASSETS: ${inv.materials}mat/${inv.tools}tools/${inv.machines}mach/${inv.tribal_tips}tips`);
  }

  // Knowledge sources
  if (baseline?.knowledge_sources) {
    const ks = baseline.knowledge_sources;
    parts.push(`KNOWLEDGE: ${ks.mit_courses?.total || 225}MIT/${ks.video_transcripts?.total || 69}vid/${ks.jm_die_programs?.total || 36929}prog`);
  }

  // Current position
  parts.push("POSITION: S1-MS2 (Port Core Algorithms)");

  // Roadmap progress
  if (baseline?.roadmap) {
    const r = baseline.roadmap;
    parts.push(`ROADMAP: ${r.complete}/${r.total_milestones}ms (${Math.round(r.units_complete/r.total_units*100)}%)`);
  }

  // Key capabilities (domains)
  parts.push("DOMAINS: force/wear/thermal/chatter/deflection/surface | CAM/post/5axis/EDM | ML/Bayesian/RL | quote/schedule/SPC");

  // Big vision
  parts.push("VISION: MFG platform → Aerospace/Medical/Auto/Energy/Defense/MoldDie/JobShop verticals");

  // Safety reminder
  parts.push("PHYSICS: Import from src/physics/constants.ts. Check ENGINE_DIGEST.md before new engines.");

  // CRITICAL COMMANDS (must always be visible)
  parts.push("COMMANDS: /pdf-learn(docs) /video-learn(videos) /forge-triple(engines) /dedup(CHECK FIRST!) /wire-edm-studio /lathe-studio /quote-to-ship /auto-speed-feed");

  // Output
  const manifest = parts.join(" | ");

  process.stdout.write(JSON.stringify({
    additionalContext: manifest,
  }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
