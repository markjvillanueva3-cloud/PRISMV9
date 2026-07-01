#!/usr/bin/env node
/**
 * extract-cadcam-tribal-wiki.mjs
 *
 * Reads state/shared/cadcam-consolidated-corpus.json (iter23) and emits, for
 * each of the cad[] and cam[] arrays:
 *
 *   - state/shared/<domain>-tribal-corpus.jsonl  (one tribal entry per resource)
 *   - knowledge/wiki/training/<domain>-corpus-index.md  (operator index grouped by kind)
 *
 * Tribal entries are advisory; consumers (delta for CAD, kilo for CAM) load
 * them as training references — they do NOT auto-train. The point is to give
 * each downstream slot a per-resource bridge tip that names:
 *   - the AUTOGEN-SPEC to read first
 *   - the source file path
 *   - the bridge engines + dispatchers (cross-ref iter22 pdf-course-bridge)
 *
 * @milestone MIT-COURSE-INTEGRATION/U-CAD-CAM-TRIBAL-WIKI
 * @slot india
 * @iter 24
 * @date 2026-05-24
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PDF_KIND_TO_ENGINES, PDF_KIND_ENRICHES, PDF_KIND_TO_DISPATCHERS,
  COURSE_KIND_TO_ENGINES, COURSE_KIND_ENRICHES, COURSE_KIND_TO_DISPATCHERS,
} from "./generate-pdf-course-bridge-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CORPUS_PATH = path.join(ROOT, "state/shared/cadcam-consolidated-corpus.json");
const CAD_TRIBAL_PATH = path.join(ROOT, "state/shared/cad-tribal-corpus.jsonl");
const CAM_TRIBAL_PATH = path.join(ROOT, "state/shared/cam-tribal-corpus.jsonl");
const WIKI_DIR = path.join(ROOT, "knowledge/wiki/training");
const CAD_WIKI_PATH = path.join(WIKI_DIR, "cad-corpus-index.md");
const CAM_WIKI_PATH = path.join(WIKI_DIR, "cam-corpus-index.md");

export const SCHEMA_VERSION = "1.0.0";

/** Pure: resolve engines + dispatchers a corpus entry feeds. */
export function resolveBridgeTargets(entry) {
  const kind = entry.kind || "other-pdf";
  if (entry.source_type === "pdf") {
    return {
      bridge_engines:    PDF_KIND_TO_ENGINES[kind]    || PDF_KIND_TO_ENGINES["other-pdf"] || [],
      enriches_engines:  PDF_KIND_ENRICHES[kind]      || [],
      bridge_dispatchers:PDF_KIND_TO_DISPATCHERS[kind] || PDF_KIND_TO_DISPATCHERS["other-pdf"] || [],
    };
  }
  // course path
  return {
    bridge_engines:     COURSE_KIND_TO_ENGINES[kind]     || [],
    enriches_engines:   COURSE_KIND_ENRICHES[kind]       || [],
    bridge_dispatchers: COURSE_KIND_TO_DISPATCHERS[kind] || [],
  };
}

/** Pure: shape a single tribal jsonl line for a corpus entry. */
export function entryToTribal(entry, domain, ts) {
  const targets = resolveBridgeTargets(entry);
  const specBaseName = entry.source_type === "pdf"
    ? `AUTOGEN-EXTRACT-SPEC-${entry.slug}.md`
    : `AUTOGEN-SPEC-${entry.slug}.md`;
  const specPath = entry.source_type === "pdf"
    ? `state/shared/resource-pdf-specs/${specBaseName}`
    : `state/shared/college-course-specs/${specBaseName}`;
  return {
    ts,
    schemaVersion: SCHEMA_VERSION,
    domain,
    slug: entry.slug,
    id: entry.id,
    kind: entry.kind,
    source: entry.source,
    source_type: entry.source_type,
    tip: `${domain.toUpperCase()} training reference (kind=${entry.kind}): read ${specBaseName} for extraction plan, then ingest source file. Bridges ${targets.bridge_engines.length} engine(s) + ${targets.bridge_dispatchers.length} dispatcher(s).`,
    consume: {
      spec_md: specPath,
      source_file: entry.source,
      bridge_engines: targets.bridge_engines,
      enriches_engines: targets.enriches_engines,
      bridge_dispatchers: targets.bridge_dispatchers,
    },
    audience: domain === "cad" ? "delta" : "kilo",
    spawned_by: "iter24-cadcam-tribal-wiki",
    must_human_verify: true,
    advisory: true,
  };
}

/** Pure: group corpus entries by kind. */
export function groupByKind(entries) {
  const byKind = {};
  for (const e of entries) {
    (byKind[e.kind] = byKind[e.kind] || []).push(e);
  }
  return byKind;
}

/** Pure: render an operator-view wiki index for a domain's corpus. */
export function renderWikiIndex(domain, entries, generatedAt) {
  const consumer = domain === "cad" ? "delta" : "kilo";
  const byKind = groupByKind(entries);
  const lines = [];
  lines.push(`# ${domain.toUpperCase()} Corpus Training Index`);
  lines.push("");
  lines.push(`> Auto-generated ${generatedAt} by \`scripts/extract-cadcam-tribal-wiki.mjs\` (slot:india iter24).`);
  lines.push(`> Source: \`state/shared/cadcam-consolidated-corpus.json\` (iter23).`);
  lines.push(`> Consumer: **${consumer}** slot — ingest via \`state/shared/${domain}-tribal-corpus.jsonl\` (one entry per resource below).`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- **Total entries**: ${entries.length}`);
  lines.push(`- **Kinds**: ${Object.keys(byKind).sort().join(", ")}`);
  lines.push(`- **Source types**: ${[...new Set(entries.map(e => e.source_type))].sort().join(", ")}`);
  lines.push("");
  lines.push(`## Entries by kind`);
  lines.push("");
  for (const kind of Object.keys(byKind).sort()) {
    const group = byKind[kind];
    const targets = resolveBridgeTargets(group[0]);
    lines.push(`### ${kind} (${group.length})`);
    lines.push("");
    lines.push(`**Bridge engines**: ${targets.bridge_engines.join(", ") || "(none)"}  `);
    lines.push(`**Enriches**: ${targets.enriches_engines.join(", ") || "(none)"}  `);
    lines.push(`**Dispatchers**: ${targets.bridge_dispatchers.join(", ") || "(none)"}`);
    lines.push("");
    for (const e of group.slice(0, 50)) {
      lines.push(`- \`${e.slug}\` — ${e.id}`);
    }
    if (group.length > 50) lines.push(`- _(+${group.length - 50} more — see \`${domain}-tribal-corpus.jsonl\`)_`);
    lines.push("");
  }
  lines.push(`## Ingest`);
  lines.push("");
  lines.push("```bash");
  lines.push(`# Line-delimited tribal entries — one per resource`);
  lines.push(`cat H:/prism/state/shared/${domain}-tribal-corpus.jsonl | while read line; do`);
  lines.push(`  echo "$line" | jq '{slug, kind, consume: .consume.spec_md, engines: .consume.bridge_engines}'`);
  lines.push(`done`);
  lines.push("```");
  lines.push("");
  lines.push("## Audience expectation");
  lines.push("");
  lines.push(`${consumer} reads this index → picks priority kinds → reads each entry's spec_md → ingests source file → trains the named bridge engines. Tribal entries are **advisory** and **must_human_verify** (PRISM blocks stubs; consumer asserts data quality at ingest).`);
  return lines.join("\n");
}

export function main() {
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`FATAL: ${CORPUS_PATH} not found — run consolidate-cadcam-corpus.mjs first`);
    return 1;
  }
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
  const ts = new Date().toISOString();

  // CAD entries: cad[] only (exclude dual-classified to avoid double-training; delta picks the dual set explicitly if needed)
  const cadOnly = corpus.cad.filter(e => !e.classification.cam);
  const camOnly = corpus.cam.filter(e => !e.classification.cad);
  const both    = corpus.both || [];

  // Tribal jsonl writes -- cad gets cadOnly + both; cam gets camOnly + both.
  // GIGO-safe (R9, zulu 2026-06-24): only emit a tribal entry whose source file/dir
  // actually exists on disk. A closed-loop knowledge feeder must NEVER point at a
  // missing source -- broken pointers feed garbage to delta/kilo RAG and any downstream
  // training (58 dead/empty pointers were found in the regenerated CAM corpus before
  // this filter). Empty `source` is dropped too. Directories (JM program folders) keep
  // passing since existsSync is true for them.
  const sourceExists = (e) => Boolean(e.source) && fs.existsSync(e.source);
  const cadAll = [...cadOnly, ...both];
  const camAll = [...camOnly, ...both];
  const cadCorpus = cadAll.filter(sourceExists);
  const camCorpus = camAll.filter(sourceExists);
  const droppedCad = cadAll.length - cadCorpus.length;
  const droppedCam = camAll.length - camCorpus.length;
  if (droppedCad || droppedCam) {
    console.log(`source-existence filter dropped ${droppedCad} cad + ${droppedCam} cam dead/empty pointer(s)`);
  }

  const cadLines = cadCorpus.map(e => JSON.stringify(entryToTribal(e, "cad", ts))).join("\n");
  const camLines = camCorpus.map(e => JSON.stringify(entryToTribal(e, "cam", ts))).join("\n");

  fs.writeFileSync(CAD_TRIBAL_PATH, cadLines + "\n");
  fs.writeFileSync(CAM_TRIBAL_PATH, camLines + "\n");
  console.log(`wrote ${CAD_TRIBAL_PATH} (${cadCorpus.length} entries)`);
  console.log(`wrote ${CAM_TRIBAL_PATH} (${camCorpus.length} entries)`);

  fs.mkdirSync(WIKI_DIR, { recursive: true });
  fs.writeFileSync(CAD_WIKI_PATH, renderWikiIndex("cad", cadCorpus, ts));
  fs.writeFileSync(CAM_WIKI_PATH, renderWikiIndex("cam", camCorpus, ts));
  console.log(`wrote ${CAD_WIKI_PATH}`);
  console.log(`wrote ${CAM_WIKI_PATH}`);

  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
