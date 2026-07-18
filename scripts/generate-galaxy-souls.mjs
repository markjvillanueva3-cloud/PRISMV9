#!/usr/bin/env node
/**
 * generate-galaxy-souls.mjs -- emit a per-galaxy SOUL.md for every galaxy
 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-SOULS, slot:charlie).
 *
 * The operator /goal asks for "souls.md of each galaxy" synergized with the AI
 * systems. Souls were SLOT-keyed (26) and 0 of the 34 galaxy dirs carried one.
 * This generator SYNTHESIZES a real galaxy soul from: the galaxy's owner-slot soul
 * (voice/role/tone/refuse_list), its CLAUDE.md/MEMORY.md identity, and its LIVE
 * AI-synergy posture from state/shared/specs/AI-SYNERGY-AUDIT.json. The soul is the
 * per-galaxy surface where identity meets AI-synergy (the goal's "souls.md ...
 * synergized with ... prism awareness").
 *
 * Output: mcp-server/src/engines/<galaxy>/SOUL.md (one per galaxy).
 *
 * Usage:
 *   node scripts/generate-galaxy-souls.mjs          # write all SOUL.md
 *   node scripts/generate-galaxy-souls.mjs --dry     # report, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderGalaxySoul, firstHeadline } from "./lib/galaxy-soul-render.mjs";
import { SLOT_GALAXY_MAP } from "./lib/slot-galaxy-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const SLOT_SOULS_DIR = path.join(ROOT, "state/shared/slot-souls");
const AUDIT_JSON = path.join(ROOT, "state/shared/specs/AI-SYNERGY-AUDIT.json");

const argv = new Set(process.argv.slice(2));
const NOW = new Date().toISOString();

function readOptional(p) {
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch {
    /* absent */
  }
  return null;
}

/** Reverse SLOT_GALAXY_MAP -> galaxy -> first owning slot (deterministic by map order). */
function buildGalaxyToSlot() {
  const m = new Map();
  for (const [slot, galaxy] of Object.entries(SLOT_GALAXY_MAP)) {
    if (!m.has(galaxy)) m.set(galaxy, slot);
  }
  return m;
}

/**
 * Light parser for a slot soul's YAML-ish frontmatter (role/voice/tone + refuses).
 * The refuse-list key is spelled BOTH `refuse_list:` (12 slots) and `refuses:` (14
 * slots) across the fleet -- match either, or ~13 galaxies silently ship refuse-less
 * souls (R12 silent-partial). Tolerates a blank line before the first list item.
 * Exported PURE for testing.
 */
export function parseSlotSoul(text) {
  const out = { role: null, voice: null, tone: null, refuseList: [] };
  if (typeof text !== "string" || !text) return out;
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const block = fm ? fm[1] : text;
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^(role|voice|tone):\s*(.+)$/);
    if (kv) {
      out[kv[1]] = kv[2].trim();
      continue;
    }
    if (/^(?:refuse_list|refuses):\s*$/.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s*$/.test(lines[j])) continue; // tolerate a blank line before/among items
        const item = lines[j].match(/^\s+-\s*(.+)$/);
        if (!item) break;
        out.refuseList.push(item[1].trim());
      }
    }
  }
  return out;
}

/** Galaxy dirs that carry a CLAUDE.md (excludes `.claude`). */
function enumerateGalaxies() {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(ENGINES_DIR, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    if (fs.existsSync(path.join(ENGINES_DIR, e.name, "CLAUDE.md"))) out.push(e.name);
  }
  return out.sort();
}

function buildPostureMap() {
  const m = new Map();
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8"));
  } catch {
    return m;
  }
  const galaxies = Array.isArray(report.galaxies) ? report.galaxies : [];
  const ranked = [...galaxies].sort((a, b) => b.score - a.score || a.galaxy.localeCompare(b.galaxy));
  const total = galaxies.length;
  ranked.forEach((r, i) => {
    m.set(r.galaxy, {
      score: r.score,
      band: r.band,
      rank: i + 1,
      total,
      gaps: Array.isArray(r.gaps) ? r.gaps.map((g) => g.dimension) : [],
      topRec: Array.isArray(r.recommendations) && r.recommendations.length ? r.recommendations[0] : null,
      subScores: r.subScores || null,
    });
  });
  return m;
}

function main() {
  const galaxies = enumerateGalaxies();
  const galaxyToSlot = buildGalaxyToSlot();
  const postureMap = buildPostureMap();
  const dry = argv.has("--dry");

  // Domain-specific enrichment (refuses + domain filter + specialist body), minted on the local
  // GPU by generate-galaxy-soul-enrichment.mjs. Optional + fail-soft: absent -> souls render as
  // before (posture-only). This is the fix for the 23 weak souls the quality audit found.
  let enrichMap = {};
  try {
    const raw = readOptional(path.join(ROOT, "state/shared/specs/galaxy-soul-enrichment.json"));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.galaxies && typeof parsed.galaxies === "object") enrichMap = parsed.galaxies;
  } catch {
    /* enrichment optional */
  }

  // Cache slot soul parses (a slot may own >1 galaxy).
  const slotSoulCache = new Map();
  function slotSoul(slot) {
    if (!slot) return { role: null, voice: null, tone: null, refuseList: [] };
    if (slotSoulCache.has(slot)) return slotSoulCache.get(slot);
    const parsed = parseSlotSoul(readOptional(path.join(SLOT_SOULS_DIR, `${slot}.md`)));
    slotSoulCache.set(slot, parsed);
    return parsed;
  }

  let written = 0;
  let slotOwned = 0;
  let withPosture = 0;
  for (const g of galaxies) {
    const gDir = path.join(ENGINES_DIR, g);
    const slot = galaxyToSlot.get(g) || null;
    if (slot) slotOwned += 1;
    const soul = slotSoul(slot);
    const posture = postureMap.get(g) || null;
    if (posture) withPosture += 1;

    const enrich = enrichMap[g] || {};
    const md = renderGalaxySoul({
      galaxy: g,
      slot,
      role: soul.role,
      voice: soul.voice,
      tone: soul.tone,
      refuseList: soul.refuseList,
      domainRefuses: Array.isArray(enrich.refuses) ? enrich.refuses : [],
      domainFilter: enrich.domainFilter || null,
      specialistBody: enrich.specialistBody || null,
      claudeHeadline: firstHeadline(readOptional(path.join(gDir, "CLAUDE.md"))),
      memoryHeadline: firstHeadline(readOptional(path.join(gDir, "MEMORY.md"))),
      posture,
      generatedAt: NOW,
    });

    if (!dry) {
      fs.writeFileSync(path.join(gDir, "SOUL.md"), md + "\n");
      written += 1;
    }
  }

  const verb = dry ? "would write" : "wrote";
  process.stdout.write(
    `galaxy souls: ${verb} ${dry ? galaxies.length : written}/${galaxies.length} SOUL.md ` +
      `(${slotOwned} slot-owned, ${galaxies.length - slotOwned} slotless, ${withPosture} with AI posture)\n`
  );
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
