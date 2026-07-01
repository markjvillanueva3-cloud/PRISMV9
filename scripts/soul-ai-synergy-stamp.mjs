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
// SINGLE SOURCE OF TRUTH for the block + marker + idempotency check (R7: renderGalaxySoul and this
// stamper must never drift -- they previously had separate marker strings, which would double-stamp
// every soul after a generate-galaxy-souls.mjs regen). `hasAiStackBlock` matches the legacy dated
// marker too, so stamping the current (dated) live souls stays idempotent.
import { buildAiStackBlock, hasAiStackBlock } from "./lib/galaxy-soul-render.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");

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
    if (hasAiStackBlock(txt)) {
      skipped++;
      continue;
    }
    fs.writeFileSync(p, txt.replace(/\s*$/, "") + "\n\n" + buildAiStackBlock(g).join("\n") + "\n");
    updated++;
  }
  return { total: galaxies.length, updated, skipped };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const r = stampSouls();
  console.log(`SOUL.md AI-synergy block: updated=${r.updated} skipped=${r.skipped} total=${r.total}`);
}
