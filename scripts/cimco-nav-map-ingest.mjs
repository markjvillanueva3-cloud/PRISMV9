// cimco-nav-map-ingest.mjs — ingest a cimco-blind-nav-plot Workflow output → state/shared/cimco/nav-map.json.
//
// The blind-navigation surface map is extracted by a multi-agent Workflow (the agents read the 154
// decompiled CHM pages and return structured fragments). This script is the one-shot ETL that turns
// a Workflow's return value into the durable, query-API-backed artifact `nav-map.json`. It dedups
// surfaces by id, recomputes channel/area distributions, and prints a compact summary.
//
// Usage:  node scripts/cimco-nav-map-ingest.mjs <workflow-output.json> [--out <nav-map.json>]
// Regen:  re-run the cimco-blind-nav-plot Workflow (scriptPath persisted under the session dir),
//         then point this at its output file. The produced nav-map.json is validated by
//         scripts/cimco-nav-map.test.mjs (surface count, channel set, critical-path navigability).
//
// Robust to the Workflow output envelope (the result may be nested/string-wrapped) — it recursively
// locates the node carrying `surfaces`. Wiki: [[cimco-verification-simulation-integration]].

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SRC = process.argv[2];
const outFlag = process.argv.indexOf("--out");
const OUT = outFlag >= 0 ? process.argv[outFlag + 1] : resolve(REPO, "state/shared/cimco/nav-map.json");

if (!SRC) {
  process.stderr.write("usage: cimco-nav-map-ingest.mjs <workflow-output.json> [--out <nav-map.json>]\n");
  process.exit(2);
}

const raw = readFileSync(SRC, "utf8");
let top;
try {
  top = JSON.parse(raw);
} catch {
  const i = raw.indexOf("{"), j = raw.lastIndexOf("}");
  if (i < 0 || j < 0) { process.stderr.write("no JSON object in input\n"); process.exit(1); }
  top = JSON.parse(raw.slice(i, j + 1));
}

/** Recursively find the node carrying a `surfaces` array (the workflow return object). */
function findResult(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 6) return null;
  if (Array.isArray(o.surfaces)) return o;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "string" && v.includes('"surfaces"')) {
      try { const p = findResult(JSON.parse(v), depth + 1); if (p) return p; } catch { /* not JSON */ }
    }
    const r = findResult(v, depth + 1);
    if (r) return r;
  }
  return null;
}

const data = findResult(top) || top;
const surfaces = Array.isArray(data.surfaces) ? data.surfaces : [];
const fragments = Array.isArray(data.fragments) ? data.fragments : [];
const verdicts = Array.isArray(data.verdicts) ? data.verdicts : [];
const synthesis = data.synthesis || {};

// dedup by id (keep first)
const seen = new Map();
let dupes = 0;
for (const s of surfaces) {
  if (!s || !s.id) continue;
  if (seen.has(s.id)) { dupes++; continue; }
  seen.set(s.id, s);
}
const merged = [...seen.values()];

const byChannel = {};
for (const s of merged) byChannel[s.channel || "?"] = (byChannel[s.channel || "?"] || 0) + 1;
const proofRelevant = merged.filter((s) => s.postProvingRelevance).length;

const navMap = {
  schemaVersion: "1.0.0",
  generatedBy: "cimco-blind-nav-plot Workflow (wf_ffa343d5) — 11/12 plot clusters + 5 verify + 1 synth",
  generatedFrom: "resources/cimco-2026/_extracted/edit_us (154 decompiled CHM pages, CIMCO Edit 2026.01.10)",
  generatedAt: process.env.NAVMAP_DATE || "2026-06-03",
  note: "Blind-navigation surface map: every CIMCO menu/dialog/tab/shortcut/setup screen an agent can drive without screenshots, keyed by automation channel (file>sql/dnc-api>cli>uia). window-help-misc cluster failed StructuredOutput — re-extractable.",
  surfaceCount: merged.length,
  duplicateIdsDropped: dupes,
  channelDistribution: byChannel,
  proofRelevantCount: proofRelevant,
  clusters: fragments.map((f) => ({ cluster: f.cluster, pagesRead: f.pagesRead, count: f.count, gaps: f.gaps, postProvingNotes: f.postProvingNotes })),
  criticalPathVerdicts: verdicts,
  synthesis,
  surfaces: merged.sort((a, b) => String(a.id).localeCompare(String(b.id))),
};

writeFileSync(OUT, JSON.stringify(navMap, null, 2));
process.stdout.write(
  `nav-map ingested: ${merged.length} surfaces (${dupes} dupes dropped, ${proofRelevant} proof-relevant), ` +
    `${fragments.length} clusters, ${verdicts.length} critical-path verdicts → ${OUT}\n`,
);
