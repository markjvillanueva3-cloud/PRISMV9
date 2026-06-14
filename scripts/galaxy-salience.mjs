#!/usr/bin/env node
// scripts/galaxy-salience.mjs — CLI for U-GCF-SALIENCE (GALAXY-CONTEXT-FEDERATION-MS0).
// Surfaces the per-galaxy salience scores recorded in galaxy-cards/INDEX.json (computed at card-build
// time) + the live factor-activity honesty (which of recency/impact/access actually contribute).
// ALWAYS exits 0 (fail-soft plumbing). Reads only — never rebuilds (run galaxy-context-card.mjs build).
//
//   node scripts/galaxy-salience.mjs                 # rank galaxies by recorded salience
//   node scripts/galaxy-salience.mjs --galaxy cad    # one galaxy's salience + factors
//   node scripts/galaxy-salience.mjs --factors       # which factors are live (recency/impact/access)
//   node scripts/galaxy-salience.mjs --json
//
// Knob (consumed by the card build): PRISM_GCF_SALIENCE=0 builds cards without salience re-ranking.

import fs from "node:fs";
import { factorsActiveSummary, loadAccessMap, DEFAULT_ACCESS_PATH } from "./lib/galaxy-salience.mjs";
import { DEFAULT_ROOTS } from "./lib/galaxy-context-card.mjs";

const INDEX_PATH = `${DEFAULT_ROOTS.cardsDir}/INDEX.json`;

function parseArgs(argv) {
  const a = { json: false, factors: false, galaxy: "" };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--factors") a.factors = true;
    else if (t === "--galaxy") a.galaxy = argv[++i] || "";
  }
  return a;
}

function readIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); } catch { return null; }
}

function main() {
  const a = parseArgs(process.argv.slice(2));

  if (a.factors) {
    const accessInfo = loadAccessMap();
    const factors = factorsActiveSummary({ accessInfo });
    if (a.json) process.stdout.write(JSON.stringify({ ok: true, factors, accessPath: DEFAULT_ACCESS_PATH }) + "\n");
    else process.stdout.write(
      `Salience factors (live status):\n` +
      `  recency: ${factors.recency ? "LIVE" : "off"} (per-fact dates, always available)\n` +
      `  impact:  ${factors.impact ? "LIVE" : "off"} (per-fact shipped/SHA/test markers, always available)\n` +
      `  access:  ${factors.access ? "LIVE" : "DORMANT"} — ${factors.accessReason}\n`);
    process.exit(0);
  }

  const idx = readIndex();
  if (!idx || !Array.isArray(idx.cards)) {
    const msg = { ok: false, reason: "no-index", indexPath: INDEX_PATH, hint: "run: node scripts/galaxy-context-card.mjs build" };
    process.stdout.write(a.json ? JSON.stringify(msg) + "\n" : `(no INDEX.json — ${msg.hint})\n`);
    process.exit(0);
  }

  const ranked = idx.cards
    .map((c) => ({ galaxy: c.galaxy, salience: Number.isFinite(c.salience) ? c.salience : null, factors: c.salienceFactors || null, factCount: c.factCount }))
    .sort((x, y) => (y.salience ?? -1) - (x.salience ?? -1));

  if (a.galaxy) {
    const one = ranked.find((r) => r.galaxy === a.galaxy);
    const res = one ? { ok: true, ...one } : { ok: false, reason: "galaxy-not-found", galaxy: a.galaxy };
    if (a.json) process.stdout.write(JSON.stringify(res) + "\n");
    else if (one) process.stdout.write(`${one.galaxy}: salience=${one.salience ?? "n/a"} factCount=${one.factCount} factors=${JSON.stringify(one.factors)}\n`);
    else process.stdout.write(`galaxy '${a.galaxy}' not in INDEX\n`);
    process.exit(0);
  }

  if (a.json) {
    process.stdout.write(JSON.stringify({ ok: true, schemaVersion: idx.schemaVersion, salience: idx.salience, accessFactor: idx.accessFactor, ranked }) + "\n");
  } else {
    const head = `Galaxy salience (from INDEX.json, schema ${idx.schemaVersion}; salience-build=${idx.salience}):`;
    const note = idx.accessFactor ? `  access factor: ${idx.accessFactor.populated ? "LIVE" : "DORMANT"} (${idx.accessFactor.withGalaxy ?? 0}/${idx.accessFactor.rows ?? 0} rows join a galaxy)\n` : "";
    const rows = ranked.map((r) => `  ${String(r.salience ?? "n/a").padStart(6)}  ${r.galaxy} (${r.factCount} facts)`).join("\n");
    process.stdout.write(`${head}\n${note}${rows}\n`);
  }
  process.exit(0);
}

main();
