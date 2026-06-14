#!/usr/bin/env node
/**
 * soul-ai-synergy-stamp.mjs -- stamp a consistent AI-synergy "AI Stack" awareness
 * block into every galaxy SOUL.md (U-FLOR-SOUL-SYNERGY, slot:tango 2026-06-11).
 *
 * The /goal names "souls.md of each galaxy" as a synergy surface. This makes each
 * galaxy's SOUL.md DECLARE its active AI stack: the galaxy-reasoning-bridge (PSN leg
 * #10) with hybrid RAG + CAG + LoRA-emit, reading the galaxy's own doctrine. Idempotent
 * (skips a soul already carrying the marker), additive (append-only -- never alters
 * existing soul content), clone-not-fork (byte-identical block across all 34, per R15).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const MARKER = "<!-- AI-SYNERGY-STACK:tango-2026-06-11 -->";

function blockFor(g) {
  return [
    "",
    "",
    MARKER,
    "## AI Stack (synergized -- fleet-wide, 2026-06-11)",
    `This galaxy reasons over its OWN doctrine (this SOUL.md + CLAUDE.md + MEMORY.md + AWARENESS.md + the \`${g}_synthesis.md\` Obsidian vault brain) through the **galaxy-reasoning-bridge** (PSN leg #10):`,
    `\`node scripts/lib/galaxy-reasoning-bridge.mjs ${g} "<question>"\` -- $0, local Ollama.`,
    "",
    "Active stack: **hybrid RAG** (sparse + nomic-embed dense rerank, ON by default; opt-out `PRISM_GALAXY_RAG_DENSE=0`), **CAG** answer-cache (content-invalidated), and **LoRA** self-improvement emit (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1` -> the fleet training corpus `state/shared/lora/fleet-lora-combined.jsonl`).",
    "Cross-substrate: this soul + its synthesis brain feed the GNN node-features + the LoRA dataset. Clone-not-fork: identical across all 34 galaxy souls (R15 apply-to-all).",
    "",
  ].join("\n");
}

export function stampSouls(engDir = ENG_DIR) {
  const galaxies = fs
    .readdirSync(engDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(engDir, d.name, "SOUL.md")))
    .map((d) => d.name)
    .sort();
  let updated = 0;
  let skipped = 0;
  for (const g of galaxies) {
    const p = path.join(engDir, g, "SOUL.md");
    const txt = fs.readFileSync(p, "utf8");
    if (txt.includes(MARKER)) {
      skipped++;
      continue;
    }
    fs.writeFileSync(p, txt.replace(/\s*$/, "") + blockFor(g) + "\n");
    updated++;
  }
  return { total: galaxies.length, updated, skipped };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const r = stampSouls();
  console.log(`SOUL.md AI-synergy block: updated=${r.updated} skipped=${r.skipped} total=${r.total}`);
}
