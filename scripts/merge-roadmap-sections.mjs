#!/usr/bin/env node
/**
 * merge-roadmap-sections.mjs — Compose REVENUE-ROADMAP-vN.md from per-section drafts.
 *
 * Each round-N spec-revision agent emits a *-section.md draft in
 * state/shared/audit-findings/revenue-roadmap/round{N}/.
 *
 * This script reads the per-section drafts in stable order, prepends a
 * generated header (provenance, source-round, mtime, section list), and
 * writes a single merged spec at the target path.
 *
 * Re-runnable: idempotent.
 *
 * Usage:
 *   node scripts/merge-roadmap-sections.mjs --round 4 --version 7.1
 *   node scripts/merge-roadmap-sections.mjs --round 4 --version 7.1 --output state/shared/specs/REVENUE-ROADMAP-v7.1.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MAX_AGENT_INDEX = 10;
const AGENT_FILE_NUM_WIDTH = 2;

function parseArgs() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const key = a[i].slice(2);
      const next = a[i + 1];
      if (next && !next.startsWith("--")) { out[key] = next; i++; }
      else { out[key] = true; }
    }
  }
  return out;
}

const args = parseArgs();
const ROUND = String(args.round ?? "4");
const VERSION = String(args.version ?? "7.1");
const SCOPE = String(args.scope ?? "revenue-roadmap");
const DIR = path.join(ROOT, "state/shared/audit-findings", SCOPE, `round${ROUND}`);
const DEFAULT_OUT = path.join(ROOT, "state/shared/specs", `REVENUE-ROADMAP-v${VERSION}.md`);
const OUT = args.output ? path.join(ROOT, String(args.output)) : DEFAULT_OUT;

if (!fs.existsSync(DIR)) {
  process.stderr.write(`No round directory: ${DIR}\n`);
  process.exit(2);
}

const sectionFiles = fs.readdirSync(DIR)
  .filter(f => /^\d+-.*-section\.md$/.test(f))
  .sort();

if (sectionFiles.length === 0) {
  process.stderr.write(`No *-section.md files in ${DIR}\n`);
  process.exit(2);
}

const sections = [];
for (let n = 1; n <= MAX_AGENT_INDEX; n++) {
  const prefix = String(n).padStart(AGENT_FILE_NUM_WIDTH, "0") + "-";
  const file = sectionFiles.find(f => f.startsWith(prefix));
  if (!file) continue;
  const body = fs.readFileSync(path.join(DIR, file), "utf8");
  const stat = fs.statSync(path.join(DIR, file));
  sections.push({ n, file, body, mtime: stat.mtime.toISOString() });
}

const header = [
  `# PRISM Revenue Roadmap — v${VERSION}`,
  "",
  `**Generated:** ${new Date().toISOString()}`,
  `**Source round:** ${ROUND}`,
  `**Sections merged:** ${sections.length}`,
  `**Owner:** claude-99eca613 (revenue lane)`,
  "",
  "## Provenance",
  "",
  "This file is auto-assembled from per-section drafts emitted by parallel spec-revision subagents.",
  "Do NOT edit by hand — edit the underlying section drafts and re-run:",
  "",
  "```",
  `node scripts/merge-roadmap-sections.mjs --round ${ROUND} --version ${VERSION}`,
  "```",
  "",
  "## Section index",
  "",
  ...sections.map(s => `- \`${s.file}\` (mtime ${s.mtime})`),
  "",
  "---",
  "",
].join("\n");

const body = sections.map(s => `${s.body.trimEnd()}\n\n---\n\n`).join("");

const out = header + body + `\n_End of REVENUE-ROADMAP-v${VERSION}.md (assembled from round ${ROUND} sections)._\n`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);

process.stdout.write(JSON.stringify({
  schemaVersion: "1.0.0",
  output: path.relative(ROOT, OUT),
  bytes: out.length,
  sections_merged: sections.length,
  sections: sections.map(s => ({ n: s.n, file: s.file, mtime: s.mtime })),
}, null, 2) + "\n");
