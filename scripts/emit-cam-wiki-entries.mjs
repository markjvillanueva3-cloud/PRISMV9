#!/usr/bin/env node
/**
 * scripts/emit-cam-wiki-entries.mjs — CAM-AI-TRAINING-MS0/U-CAMT-WIKI-EMIT
 *
 * Reads the 106-template JSONL and emits one markdown wiki entry per
 * (op, system) template into state/shared/corpus/wiki/<system>/<op>.md.
 *
 * Each entry has Karpathy-style wiki frontmatter (name/description/type)
 * + a body with: operation purpose, system-specific native-name section,
 * parameter table, and a provenance footer.
 *
 * REAL DATA ONLY (operator constraint 2026-05-25).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS_ROOT = join(REPO_ROOT, "state", "shared", "corpus");
const WIKI_ROOT = join(CORPUS_ROOT, "wiki");
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

function loadTemplates(system) {
  const file = join(CORPUS_ROOT, `cam-templates-${system}.jsonl`);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function paramTable(params) {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return "_No default parameters declared in catalog. Operator supplies all values._\n";
  const rows = ["| Parameter | Default |", "|-----------|---------|"];
  for (const [k, v] of entries) {
    const val = v === null || v === undefined ? "_(none)_" : String(v).replace(/\|/g, "\\|");
    rows.push(`| \`${k}\` | ${val} |`);
  }
  return rows.join("\n") + "\n";
}

function safeFilename(s) {
  return String(s).replace(/[^A-Za-z0-9._-]/g, "_");
}

function buildEntry(t) {
  const op = t.op;
  const system = t.system;
  const nativeName = t.nativeName ?? t.nativeKey ?? op;
  const nativeKey = t.nativeKey ?? "";
  const slug = `${system}-${op}-${safeFilename(nativeKey)}`.toLowerCase();
  const description = `${system} CAM template for ${op} (native: ${nativeName})`;
  const body = [
    "## Purpose",
    "",
    `The **${op}** operation in **${system}** — exposed natively as "${nativeName}" (catalog key \`${nativeKey}\`).`,
    "",
    "## Parameters",
    "",
    paramTable(t.parameters),
    "## System-specific notes",
    "",
    `In ${system}, this operation is reached via its catalog UI under the function family that owns "${nativeName}". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).`,
    "",
    "## Wiring",
    "",
    `- CamOperation id: \`${op}\``,
    `- CAM system: \`${system}\``,
    `- Native catalog key: \`${nativeKey}\``,
    `- Parameter count: ${Object.keys(t.parameters ?? {}).length}`,
    "",
    "## Provenance",
    "",
    `- realDataOnly: ${t.provenance?.realDataOnly ?? true}`,
    `- sourceMilestone: ${t.provenance?.sourceMilestone ?? "CAM-AI-TRAINING-MS0"}`,
    `- sourceSlot: ${t.provenance?.sourceSlot ?? "kilo"}`,
    `- operatorConstraint: ${t.provenance?.operatorConstraint ?? "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)"}`,
  ].join("\n");
  const front = [
    "---",
    `name: ${slug}`,
    `description: ${description}`,
    "metadata:",
    "  type: cam-template",
    `  op: ${op}`,
    `  system: ${system}`,
    `  nativeKey: ${nativeKey}`,
    "---",
    "",
  ].join("\n");
  return { slug, content: front + body + "\n" };
}

function main() {
  let total = 0;
  const perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    const templates = loadTemplates(sys);
    const outDir = join(WIKI_ROOT, sys);
    mkdirSync(outDir, { recursive: true });
    let count = 0;
    for (const t of templates) {
      const { slug, content } = buildEntry(t);
      writeFileSync(join(outDir, `${safeFilename(slug)}.md`), content);
      count++;
    }
    perSystem[sys] = count;
    total += count;
    console.log(`[${sys}] wrote ${count} wiki entries → ${outDir}`);
  }
  mkdirSync(WIKI_ROOT, { recursive: true });
  writeFileSync(
    join(WIKI_ROOT, "_summary.json"),
    JSON.stringify({ totalEntries: total, perSystem, generatedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`\nTotal wiki entries: ${total}`);
}

main();
