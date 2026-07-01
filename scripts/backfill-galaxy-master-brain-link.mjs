#!/usr/bin/env node
// scripts/backfill-galaxy-master-brain-link.mjs
//
// U-GBA07 — backfill the `## Master-brain link` header into every galaxy
// MEMORY.md that lacks it, so all 34 galaxies are wired to the master brain
// (operator directive 2026-05-29: "they all need to wire to the master brain").
//
// The master-SIDE discovery edge (`[galaxy:X]` row in the master MEMORY.md) is
// already 34/34 (golf U-GBA06). This closes the galaxy-SIDE half: each galaxy's
// MEMORY.md must open with the 4-axis master-brain link (UP / DOWN / master-index
// back-pointer / Last-master-sync) per the PER-SLOT-GALAXY-BUILD-KIT template.
//
// Idempotent: skips any MEMORY.md that already has `## Master-brain link`.
// Additive: inserts the section before the first `## ` heading (or after the H1
// title block if no section exists) — never rewrites existing content.
// Default = DRY-RUN (prints plan). Pass --apply to write.
//
// Security: no shell, no network; pure fs read/write on a fixed glob root.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES = path.join(ROOT, "mcp-server/src/engines");
const APPLY = process.argv.includes("--apply");
const SYNC_DATE = "2026-05-29";

// Derive recall keywords from the galaxy dir name (kebab → space-joined words).
function keywordsFor(galaxy) {
  return galaxy.replace(/[-_]/g, " ");
}

function masterBrainSection(galaxy) {
  return [
    "## Master-brain link",
    `- **UP (pull):** \`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md\` — recall: \`prism_memory:semantic_search query="${keywordsFor(galaxy)}" topK=20\``,
    `- **DOWN (push):** write \`<type>_<slot>_<topic>.md\` → master memory dir → auto-fed to \`knowledge/memories/<type>/\` by \`stop-obsidian-memory-feed.mjs\``,
    `- **MASTER-INDEX edge:** master \`MEMORY.md\` carries the \`[galaxy:${galaxy}]\` back-pointer (discovery edge wired ${SYNC_DATE})`,
    `- **Last master-sync:** ${SYNC_DATE}`,
    "",
  ].join("\n");
}

// Insert the section before the first `## ` heading; if none, after the H1
// title + any immediately-following blockquote/blank lines; else append.
function insertSection(content, section) {
  const lines = content.split("\n");
  const firstH2 = lines.findIndex((l) => /^## /.test(l));
  if (firstH2 !== -1) {
    lines.splice(firstH2, 0, section);
    return lines.join("\n");
  }
  // No `## ` heading — insert after the H1 title block.
  const h1 = lines.findIndex((l) => /^# /.test(l));
  if (h1 !== -1) {
    let i = h1 + 1;
    while (i < lines.length && (lines[i].trim() === "" || lines[i].startsWith(">"))) i++;
    lines.splice(i, 0, "", section);
    return lines.join("\n");
  }
  return content.replace(/\s*$/, "\n\n") + section; // fallback: append
}

function main() {
  if (!fs.existsSync(ENGINES)) {
    console.error(`engines dir not found: ${ENGINES}`);
    process.exit(1);
  }
  const galaxies = fs
    .readdirSync(ENGINES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((g) => fs.existsSync(path.join(ENGINES, g, "MEMORY.md")))
    .sort();

  const report = { mode: APPLY ? "apply" : "dry-run", total: galaxies.length, already: [], backfilled: [], errors: [] };

  for (const g of galaxies) {
    const file = path.join(ENGINES, g, "MEMORY.md");
    try {
      const content = fs.readFileSync(file, "utf8");
      if (/^## Master-brain link/m.test(content)) {
        report.already.push(g);
        continue;
      }
      const updated = insertSection(content, masterBrainSection(g));
      if (APPLY) fs.writeFileSync(file, updated, "utf8");
      report.backfilled.push(g);
    } catch (e) {
      report.errors.push({ galaxy: g, error: String(e && e.message || e) });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(
    `\n${report.mode}: ${report.total} galaxies · ${report.already.length} already linked · ${report.backfilled.length} ${APPLY ? "backfilled" : "to backfill"} · ${report.errors.length} errors`
  );
}

main();
