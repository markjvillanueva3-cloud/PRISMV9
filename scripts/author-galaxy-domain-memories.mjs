#!/usr/bin/env node
// scripts/author-galaxy-domain-memories.mjs
//
// Author REAL, grounded per-galaxy domain reference memories for sparse galaxies
// whose memory corpus sits below the completeness floor. Every memory is grounded
// in a REAL engine listed in the galaxy's PATHS.md (cited to its file) — this is
// knowledge CAPTURE of engines that genuinely exist, NOT fabrication. (operator
// /goal 2026-06-09: "fill the gaps further … memories properly mapped to their
// individual galaxies … each chat slot full context of their domain".)
//
// DISCIPLINE: deterministic extraction from PATHS.md (engine name + its real
// 1-line description). NO invented facts, NO invented engine names — only what
// PATHS.md (the galaxy's own file map) already asserts. Writes to
// knowledge/memories/reference/ with galaxy-keyword filenames so they are mapped
// to the galaxy + auto-feed to Obsidian.
//
// Usage:
//   node scripts/author-galaxy-domain-memories.mjs --galaxy shop-floor --count 8
//   node scripts/author-galaxy-domain-memories.mjs --galaxy shop-floor --count 8 --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ENG = path.join(REPO, "mcp-server", "src", "engines");
const MEM_REF = path.join(REPO, "knowledge", "memories", "reference");

const DIGEST = path.join(REPO, "mcp-server", "data", "docs", "ENGINE_DIGEST.md");

// Build a real EngineName → 1-line-description map from the canonical ENGINE_DIGEST.
export function loadDigestDescriptions() {
  const map = new Map();
  let txt;
  try { txt = fs.readFileSync(DIGEST, "utf8"); } catch { return map; }
  for (const line of txt.split("\n")) {
    // Digest lines are "- **EngineName**: desc" (markdown bold + colon). The
    // canonical form; matches 3061 engines. (A prior `[—:–-]` char-class formed an
    // unintended `:`-to-en-dash range and matched nothing — fixed to a plain colon.)
    let m = line.match(/\*\*([A-Za-z0-9_]+Engine)\*\*:\s*(.+)/);
    if (!m) m = line.match(/`([A-Za-z0-9_]+Engine)`\s*[-:]\s*(.+)/); // fallback: backtick form
    if (m && !map.has(m[1])) map.set(m[1], m[2].replace(/[`*]/g, "").trim().slice(0, 220));
  }
  return map;
}

// Parse PATHS.md engine paths "`mcp-server/src/engines/SomeEngine.ts`" → real names;
// join the canonical description from ENGINE_DIGEST. Only real, cited entries.
export function parseEngines(pathsMd, descMap) {
  const out = [];
  if (!pathsMd) return out;
  for (const line of pathsMd.split("\n")) {
    const m = line.match(/`(?:[^`]*\/)?([A-Za-z0-9_]+Engine)\.ts`/);
    if (m) {
      const engine = m[1];
      const desc = descMap.get(engine) || "";
      if (!out.some((e) => e.engine === engine)) out.push({ engine, desc });
    }
  }
  // Prefer engines that HAVE a canonical description (richer grounded memories).
  // Stable tiebreaker — V8 Array.sort isn't stable across equal-keyed (empty-desc)
  // engines, so a re-run after a PATHS change could silently re-point engine_N at a
  // different engine under the same filename. localeCompare pins a deterministic order.
  return out.sort((a, b) => ((b.desc.length > 0 ? 1 : 0) - (a.desc.length > 0 ? 1 : 0)) || a.engine.localeCompare(b.engine));
}

// A grounded reference memory body — only asserts what PATHS already states.
function memoryBody(galaxy, slot, item, idx) {
  const descLine = item.desc && item.desc.length > 8
    ? item.desc
    : `a ${galaxy}-domain engine (role per its source; description not in PATHS — read the file).`;
  return `---
name: reference_${galaxy.replace(/-/g, "_")}_engine_${idx}_2026_06_09
description: "[${galaxy} domain] ${item.engine} — ${descLine.slice(0, 90)}"
metadata:
  type: reference
  galaxy: ${galaxy}
  grounded: PATHS.md
---

# ${galaxy} domain — ${item.engine}

**Galaxy:** \`${galaxy}\` (slot ${slot || "—"}) · **Source:** \`mcp-server/src/engines/${item.engine}.ts\` (per \`engines/${galaxy}/PATHS.md\`).

${descLine}

> Grounded domain-context memory authored 2026-06-09 from the galaxy's own PATHS.md engine inventory — captures a real engine so the ${galaxy} slot has it in recall. Verify the engine's current API against its source before relying on specifics.
`;
}

const SLOT = { "shop-floor": null, "cad-fusion-live": null }; // unowned infra

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const gIdx = args.indexOf("--galaxy");
  const galaxy = gIdx >= 0 ? args[gIdx + 1] : null;
  const cIdx = args.indexOf("--count");
  const count = cIdx >= 0 ? parseInt(args[cIdx + 1], 10) : 8;
  if (!galaxy) { console.error("--galaxy required"); process.exit(1); }

  const pathsMd = (() => { try { return fs.readFileSync(path.join(ENG, galaxy, "PATHS.md"), "utf8"); } catch { return null; } })();
  const descMap = loadDigestDescriptions();
  const engines = parseEngines(pathsMd, descMap);
  if (engines.length === 0) {
    console.log(`${galaxy}: NO parseable engines in PATHS.md — cannot author grounded memories (won't fabricate).`);
    return;
  }
  // Refuse galaxies whose PATHS.md self-flags as an unverified atlas — the engine list
  // there is name-inferred (plausibly mis-attributed from a sibling galaxy), so authoring
  // "grounded" memories off it produces thin, possibly-wrong padding (the exact defect
  // that put 20 stub memories into shop-floor + cad-fusion-live). Won't pad.
  if (pathsMd && /NOT a hand-verified atlas|Honest baseline — NOT/i.test(pathsMd)) {
    console.log(`${galaxy}: PATHS.md is self-flagged as NOT hand-verified — refusing to author off an unverified atlas.`);
    return;
  }
  const pick = engines.slice(0, count);
  console.log(apply ? "=== APPLY ===" : "=== DRY-RUN ===");
  console.log(`${galaxy}: ${engines.length} real engines in PATHS; authoring ${pick.length} grounded memories.`);
  let written = 0;
  for (let i = 0; i < pick.length; i++) {
    const body = memoryBody(galaxy, SLOT[galaxy], pick[i], i + 1);
    const fname = `reference_${galaxy.replace(/-/g, "_")}_engine_${i + 1}_2026_06_09.md`;
    const fpath = path.join(MEM_REF, fname);
    if (apply) {
      if (fs.existsSync(fpath)) { console.log(`  skip (exists): ${fname}`); continue; }
      fs.writeFileSync(fpath, body, "utf8"); written++;
    }
    console.log(`  ${apply ? "wrote" : "would write"}: ${fname} (${pick[i].engine})`);
  }
  console.log(`\n  ${apply ? "wrote" : "would write"} ${apply ? written : pick.length} grounded memories for ${galaxy}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
