#!/usr/bin/env node
// galaxy-brain-read.mjs  (HERMES-ZULU A-06 -- cross-galaxy master-brain compound recall)
//
// Gap (DOMAIN-MASTERY-ASSESSMENT-2026-06-11, hermes-zulu): live injectors read a galaxy's
// LOCAL synthesis but NOT the MASTER brain, so "synergize awareness/memories across ALL
// galaxies" is half-wired. This is the fleet-wide reader: local brain + the master brain's
// galaxy back-pointer + the cross-galaxy edge set, as a token-bounded compound-recall card.
// R12: every path existence-checked, absent reported as absent (never fabricated). prismRoot
// + masterMemoryPath are injectable for the fixture test (real integration, not mocks; R9).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const MASTER_DEFAULT = process.env.PRISM_MASTER_MEMORY ||
  "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";
const DEFAULT_EXCERPT_CHARS = 1200;
const DEFAULT_CARD_CHARS = 1600;
const SYNTH_HEAD_LINES = 6;
const CROSS_GALAXY_SHOWN = 12;

function readIf(p, maxChars) {
  try {
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, "utf8");
    const bytes = Buffer.byteLength(txt, "utf8");
    const excerpt = maxChars && txt.length > maxChars ? txt.slice(0, maxChars) : txt;
    return { path: p, bytes, excerpt };
  } catch { return null; }
}

// Canonical master-index back-pointer row for ONE galaxy:
//   - [galaxy:mill] mcp-server/src/engines/mill/MEMORY.md -- ...
// Anchored on line-start + exact [galaxy:<g>] token so "mill" never matches "pdf-corpus-mill".
export function extractBackPointer(masterText, galaxy) {
  if (typeof masterText !== "string") return null;
  const esc = galaxy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^\\s*-\\s*\\[galaxy:" + esc + "\\].*$", "m");
  const m = masterText.match(re);
  return m ? m[0].trim() : null;
}

// Every [galaxy:*] edge the master brain knows about (the cross-galaxy recall set).
export function extractCrossGalaxy(masterText) {
  if (typeof masterText !== "string") return [];
  const out = [];
  const re = /^\s*-\s*\[galaxy:([a-z0-9-]+)\]/gim;
  let m;
  while ((m = re.exec(masterText)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

// Compound brain for ONE galaxy: its local surfaces PLUS the master brain.
export function readGalaxyBrain(galaxy, opts = {}) {
  const prismRoot = opts.prismRoot || PRISM;
  const masterMemoryPath = opts.masterMemoryPath || MASTER_DEFAULT;
  const includeMaster = opts.includeMaster !== false;
  const exCap = opts.excerptChars || DEFAULT_EXCERPT_CHARS;
  const rel = (r) => path.join(prismRoot, r);

  const local = {
    synthesis: readIf(rel(`knowledge/memories/patterns/${galaxy}_synthesis.md`), exCap),
    claude: readIf(rel(`mcp-server/src/engines/${galaxy}/CLAUDE.md`), exCap),
    memory: readIf(rel(`mcp-server/src/engines/${galaxy}/MEMORY.md`), exCap),
    soul: readIf(rel(`mcp-server/src/engines/${galaxy}/SOUL.md`), exCap),
  };

  let master = null;
  let crossGalaxy = [];
  if (includeMaster) {
    const raw = readIf(masterMemoryPath, 0);
    if (raw) {
      master = { path: masterMemoryPath, present: true, backPointer: extractBackPointer(raw.excerpt, galaxy) };
      crossGalaxy = extractCrossGalaxy(raw.excerpt);
    } else {
      master = { path: masterMemoryPath, present: false, backPointer: null };
    }
  }

  const localPresent = Object.values(local).filter(Boolean).length;
  return { galaxy, local, localPresent, master, crossGalaxy };
}

// Token-bounded compound-recall card -- carries BOTH a local AND a master-brain signal
// (the synergy the gap was missing), char-budgeted.
export function buildCompactBrainCard(brain, opts = {}) {
  const maxChars = opts.maxChars || DEFAULT_CARD_CHARS;
  const L = [];
  L.push(`### galaxy-brain: ${brain.galaxy} (compound recall)`);
  if (brain.master && brain.master.present) {
    L.push(`- MASTER brain: ${brain.master.backPointer || "(no back-pointer row -- run master-index edge wire)"}`);
    if (brain.crossGalaxy.length) {
      const shown = brain.crossGalaxy.slice(0, CROSS_GALAXY_SHOWN).join(", ");
      const more = brain.crossGalaxy.length > CROSS_GALAXY_SHOWN ? " ..." : "";
      L.push(`- fleet knows ${brain.crossGalaxy.length} galaxies (cross-recall): ${shown}${more}`);
    }
  } else {
    L.push(`- MASTER brain: ABSENT at ${brain.master ? brain.master.path : "(includeMaster=false)"}`);
  }
  const syn = brain.local.synthesis;
  if (syn) {
    const head = syn.excerpt.split(/\r?\n/).filter((l) => l.trim()).slice(0, SYNTH_HEAD_LINES).join(" ").slice(0, 600);
    L.push(`- LOCAL synthesis (${syn.bytes}B): ${head}`);
  } else {
    L.push(`- LOCAL synthesis: ABSENT (knowledge/memories/patterns/${brain.galaxy}_synthesis.md)`);
  }
  const present = ["claude", "memory", "soul"].filter((k) => brain.local[k]);
  L.push(`- local brain files present: ${present.length ? present.join(", ") : "none"}`);
  let card = L.join("\n");
  if (card.length > maxChars) card = card.slice(0, maxChars - 3) + "...";
  return card;
}

function main() {
  const galaxy = process.argv[2];
  if (!galaxy) { process.stderr.write("usage: galaxy-brain-read.mjs <galaxy> [--no-master]\n"); process.exit(2); }
  const includeMaster = !process.argv.includes("--no-master");
  const brain = readGalaxyBrain(galaxy, { includeMaster });
  process.stdout.write(buildCompactBrainCard(brain) + "\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
