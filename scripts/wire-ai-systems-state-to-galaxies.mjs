#!/usr/bin/env node
// scripts/wire-ai-systems-state-to-galaxies.mjs
// Wire the AI-systems-state synergy pointer into EVERY galaxy's MEMORY.md (2026-06-11, slot:zulu).
//
// GOAL (operator /goal): "improve ai systems ... synergized with ... memories ... across ALL
// galaxies." U-AIS01 built the fleet AI-systems-state note (knowledge/memories/patterns/
// ai-systems-fleet-state.md); this closes the all-galaxy DOCUMENT-LEVEL half: every galaxy's
// MEMORY.md (the brain it reads at context-regain) gets a marked pointer to that note, so each
// galaxy is explicitly aware of the live NN/GNN/LoRA/RAG/CAG/octopus state -- not just the
// reasoning-bridge consuming it implicitly.
//
// DETERMINISTIC + IDEMPOTENT (R5): one marked block per MEMORY.md, replaced in place on re-run
// (no duplication). A script, not 34 hand-edits (R15(d) apply-to-all-galaxies). Atomic write.
//
// CLI:  node scripts/wire-ai-systems-state-to-galaxies.mjs [--dry-run]

import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "H:/prism";
const ENGINES = join(ROOT, "mcp-server/src/engines");
const BEGIN = "<!-- AI-SYSTEMS-STATE:BEGIN -->";
const END = "<!-- AI-SYSTEMS-STATE:END -->";

const BLOCK_BODY = [
  BEGIN,
  "## AI-systems fleet state (synergy pointer)",
  "> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama",
  "> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`",
  "> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:",
  "> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]",
  "> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].",
  END,
].join("\n");

// ---- pure core (exported for test) -----------------------------------------

/** Idempotently insert/replace a marked block in `content`. If both markers are present the
 *  region between them (inclusive) is replaced; otherwise the block is appended with a leading
 *  blank line. Returns the new content. Never duplicates the block. */
export function upsertMarkedBlock(content, begin, end, blockBody) {
  const text = typeof content === "string" ? content : "";
  const bi = text.indexOf(begin);
  const ei = text.indexOf(end);
  if (bi !== -1 && ei !== -1 && ei > bi) {
    const before = text.slice(0, bi);
    const after = text.slice(ei + end.length);
    return before + blockBody + after;
  }
  const sep = text.endsWith("\n") ? "\n" : "\n\n";
  return text + sep + blockBody + "\n";
}

const SLOT_SOULS = join(ROOT, "state/shared/slot-souls");

/** A named per-galaxy file under each engines/<galaxy>/ dir (MEMORY.md or CLAUDE.md). */
function listGalaxyFiles(name, enginesRoot = ENGINES) {
  if (!existsSync(enginesRoot)) return [];
  return readdirSync(enginesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(enginesRoot, d.name, name))
    .filter((p) => existsSync(p));
}

/** All per-galaxy MEMORY.md (the knowledge brain). */
export function listGalaxyMemories(enginesRoot = ENGINES) {
  return listGalaxyFiles("MEMORY.md", enginesRoot);
}

/** All per-galaxy CLAUDE.md sentinels (the doctrine surface). */
export function listGalaxyClaudeMds(enginesRoot = ENGINES) {
  return listGalaxyFiles("CLAUDE.md", enginesRoot);
}

/** All slot-soul files. The block appends to EOF (after the persona body) -- the YAML
 *  frontmatter at the top is never touched, so soul parsing is unaffected. */
export function listSlotSouls(soulsDir = SLOT_SOULS) {
  if (!existsSync(soulsDir)) return [];
  return readdirSync(soulsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(soulsDir, f));
}

// ---- runner ----------------------------------------------------------------

/** Wire the marked block into one set of files; returns {total,wired,alreadyCurrent,missing}. */
function wireFiles(files, dryRun) {
  const r = { total: files.length, wired: 0, alreadyCurrent: 0, missing: 0 };
  for (const f of files) {
    let content;
    try {
      content = readFileSync(f, "utf8");
    } catch {
      r.missing++;
      continue;
    }
    const next = upsertMarkedBlock(content, BEGIN, END, BLOCK_BODY);
    if (next !== content) {
      if (!dryRun) {
        const tmp = `${f}.tmp`;
        writeFileSync(tmp, next);
        renameSync(tmp, f);
      }
      r.wired++;
    } else {
      r.alreadyCurrent++;
    }
  }
  return r;
}

/** Wire all four document surfaces (memories + claude.md + souls; wiki is a single fleet
 *  entry, not per-galaxy, so it is created separately). Returns per-surface results. */
export function wireAll({ dryRun = false } = {}) {
  const surfaces = {
    memories: wireFiles(listGalaxyMemories(), dryRun),
    claudeMds: wireFiles(listGalaxyClaudeMds(), dryRun),
    souls: wireFiles(listSlotSouls(), dryRun),
  };
  const total = Object.values(surfaces).reduce((a, s) => a + s.total, 0);
  const wired = Object.values(surfaces).reduce((a, s) => a + s.wired, 0);
  const alreadyCurrent = Object.values(surfaces).reduce((a, s) => a + s.alreadyCurrent, 0);
  return { total, wired, alreadyCurrent, surfaces };
}

function isMain() {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

if (isMain()) {
  const dryRun = process.argv.includes("--dry-run");
  const r = wireAll({ dryRun });
  const s = r.surfaces;
  console.log(`AI-systems-state synergy wiring${dryRun ? " (DRY-RUN)" : ""}:`);
  console.log(`  memories  (MEMORY.md): ${s.memories.total} | wired ${s.memories.wired} | current ${s.memories.alreadyCurrent}`);
  console.log(`  claude.md (sentinels): ${s.claudeMds.total} | wired ${s.claudeMds.wired} | current ${s.claudeMds.alreadyCurrent}`);
  console.log(`  souls.md  (personas):  ${s.souls.total} | wired ${s.souls.wired} | current ${s.souls.alreadyCurrent}`);
  console.log(`  TOTAL: ${r.total} surfaces | wired ${r.wired} | already-current ${r.alreadyCurrent}`);
  process.exit(0);
}
