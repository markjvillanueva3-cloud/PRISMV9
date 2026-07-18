#!/usr/bin/env node
/**
 * tag-lora-corpus-galaxies.mjs -- recover DROPPED galaxy attribution in the fleet LoRA combined
 * corpus (slot:india 2026-06-18). The per-galaxy "<512 pairs/galaxy" LoRA blocker is largely a
 * TAGGING-LOSS bug, not data scarcity: 917/1336 rows in state/shared/lora/fleet-lora-combined.jsonl
 * carry NO galaxy field, and ~322 of those are galaxy-SPECIFIC pairs whose producer dropped the tag
 * at the combined sink -- so per-galaxy training cannot use them.
 *
 * The galaxy IS deterministically recoverable (NO synthesis, NO Ollama, NO quality risk -- these are
 * REAL pairs, we only restore the tag the source already implied):
 *   - bridge-reasoning-lora: instruction = "Answer this question about the PRISM <galaxy> galaxy ..."
 *   - cad-* sources (cad-ground-truth/fix/dimension/geometry): galaxy = "cad"
 *   - outcome-bus-recommendations: instruction = "PRISM <dispatcher> <action> ..." -> dispatcher->galaxy
 *   - vault-feedback-lora / wiki-canonical-pairs: genuinely CROSS-CUTTING doctrine -> left UNTAGGED
 *     (NOT a forced galaxy; the assembler deliberately routes untagged rows to its _unclassified track)
 *
 * NON-DESTRUCTIVE by default (--out <file>); --apply rewrites in place after a .bak backup. Reports
 * the before/after per-galaxy distribution. Root-cause follow-on: the bridge + cad PRODUCERS should
 * emit the galaxy tag at generation (this post-processor fixes the existing sink + is idempotent).
 *
 * Run: node scripts/tag-lora-corpus-galaxies.mjs            (dry: report what WOULD tag)
 *      node scripts/tag-lora-corpus-galaxies.mjs --out state/shared/lora/.fleet-lora-tagged.jsonl
 *      node scripts/tag-lora-corpus-galaxies.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CORPUS = path.join(ROOT, "state", "shared", "lora", "fleet-lora-combined.jsonl");

// Dispatcher token (in "PRISM <dispatcher> <action> ...") -> galaxy slug. Only the ones that
// actually appear in outcome-bus rows + obvious siblings; unknown -> null (leave untagged, honest).
const DISPATCHER_GALAXY = {
  speed_feed: "speed-feed", speedfeed: "speed-feed",
  cam: "cam", cad: "cad", mill: "mill", turning: "lathe", lathe: "lathe",
  wedm: "wedm", wire_edm: "wedm", quote: "quoting", quoting: "quoting",
  business: "business", erp: "business",
};

/**
 * Derive a GALAXY-SPECIFIC slug for a LoRA row, or null if not a recoverable galaxy-specific row.
 * Deterministic, leak-free (reads only the row's own source + instruction). Pure.
 *
 * Returns null for genuinely CROSS-CUTTING doctrine (vault-feedback / wiki-canonical): the assembler
 * contract deliberately leaves those UNTAGGED so the per-galaxy splitter routes them to its
 * `_unclassified` track (they are fleet-wide, not galaxy-specific). We recover ONLY the
 * galaxy-specific tags that producers dropped (bridge / cad / outcome-bus). (R7/R8: respect the
 * established untagged-cross-cutting contract rather than forcing a "fleet" pseudo-galaxy.)
 */
export function deriveGalaxy(row) {
  if (!row || typeof row !== "object") return null;
  const src = typeof row.source === "string" ? row.source : "";
  const instr = typeof row.instruction === "string" ? row.instruction : "";
  // 1. bridge-reasoning: the galaxy is named verbatim in the instruction.
  const m = instr.match(/about the PRISM ([a-z0-9][a-z0-9-]*) galaxy/i);
  if (m) return m[1].toLowerCase();
  // 2. cad-* sources are CAD-galaxy by construction.
  if (src.startsWith("cad-")) return "cad";
  // 3. outcome-bus / dispatcher-prefixed instructions -> dispatcher->galaxy map.
  const d = instr.match(/^PRISM ([a-z_]+)\b/i);
  if (d) {
    const g = DISPATCHER_GALAXY[d[1].toLowerCase()];
    if (g) return g;
  }
  // Cross-cutting doctrine + unknown -> null (leave UNTAGGED, per the assembler's _unclassified
  // contract; R12: never guess a galaxy for fleet-wide doctrine).
  return null;
}

/** Distribution of galaxy tags across rows (untagged counted under "(untagged)"). Pure. */
export function galaxyDistribution(rows) {
  const dist = new Map();
  for (const r of rows) {
    const g = (r && (r.galaxy || r.domain)) || "(untagged)";
    dist.set(g, (dist.get(g) || 0) + 1);
  }
  return dist;
}

function parseRows(text) {
  const rows = [];
  let malformed = 0;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { malformed++; }
  }
  return { rows, malformed };
}

function main(argv) {
  const corpus = (argv.find((a) => a.startsWith("--corpus=")) || "").split("=")[1] || DEFAULT_CORPUS;
  const out = (argv.find((a) => a.startsWith("--out=")) || "").split("=")[1] || null;
  const apply = argv.includes("--apply");
  if (!fs.existsSync(corpus)) { console.error(`corpus missing: ${corpus}`); return 1; }

  const { rows, malformed } = parseRows(fs.readFileSync(corpus, "utf8"));
  // R12: a write path that silently drops malformed lines is data loss. Refuse to write if any
  // line failed to parse (the rewrite would emit only the parsed rows). Dry-run still reports.
  if ((apply || out) && malformed > 0) {
    console.error(`REFUSING to write: ${malformed} malformed line(s) would be silently dropped -- fix the corpus first (R12).`);
    return 1;
  }
  const before = galaxyDistribution(rows);
  let tagged = 0, alreadyTagged = 0, stillUnknown = 0;
  const tagCounts = new Map();
  for (const r of rows) {
    if (r.galaxy || r.domain) { alreadyTagged++; continue; }
    const g = deriveGalaxy(r);
    if (g) { r.galaxy = g; tagged++; tagCounts.set(g, (tagCounts.get(g) || 0) + 1); }
    else stillUnknown++;
  }
  const after = galaxyDistribution(rows);

  console.log(`fleet-lora corpus: ${rows.length} rows | already-tagged ${alreadyTagged} | NEWLY tagged ${tagged} | still-untagged ${stillUnknown}`);
  console.log("newly-tagged breakdown:");
  [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([g, n]) => console.log(`  ${g}: +${n}`));
  // Per-galaxy-specific buckets (exclude the untagged bucket) before vs after. Cross-cutting rows
  // stay untagged (deriveGalaxy returns null for them), so there is no "fleet" bucket to exclude.
  const specBefore = [...before.entries()].filter(([k]) => k !== "(untagged)").length;
  const specAfter = [...after.entries()].filter(([k]) => k !== "(untagged)").length;
  console.log(`galaxy-specific buckets: ${specBefore} -> ${specAfter}; untagged ${before.get("(untagged)") || 0} -> ${after.get("(untagged)") || 0}`);

  if (apply) {
    if (tagged === 0) { console.log("no rows changed -- skipping rewrite + backup (idempotent no-op)."); return 0; }
    fs.copyFileSync(corpus, corpus + ".bak");
    fs.writeFileSync(corpus, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    console.log(`APPLIED in place (backup: ${path.basename(corpus)}.bak)`);
  } else if (out) {
    fs.writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    console.log(`wrote tagged corpus -> ${path.relative(ROOT, out)} (non-destructive; --apply to rewrite in place)`);
  } else {
    console.log("(dry run -- pass --out=<file> or --apply to write)");
  }
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
