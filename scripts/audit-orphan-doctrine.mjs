#!/usr/bin/env node
/**
 * audit-orphan-doctrine.mjs — find PSN-pattern doctrine orphans.
 *
 * An "orphan doctrine concept" is a heavily-referenced acronym / system name
 * that has NO dedicated memory file matching its slug. The auto-injectors
 * (memory-relevance-inject, wiki-precheck-inject) can't surface it because
 * top-K relevance match requires a file *named* for the concept.
 *
 * Detection signals:
 *   1. ALL-CAPS acronyms (3-6 letters) appearing ≥3× in memories/CLAUDE.md
 *      but never as a memory-file basename component.
 *   2. CLAUDE.md `## SECTION` headers whose slug has no paired memory.
 *   3. `prism_<thing>` dispatcher names cited in skills/CLAUDE.md but lacking
 *      a feedback_<thing>.md doctrine entry.
 *
 * Output: state/shared/orphan-doctrine-audit.json + .md punch-list.
 * Advisory only. Never auto-creates files.
 */

import fs from "node:fs";
import path from "node:path";

const REPO = "H:/prism";
const OUT_JSON = path.join(REPO, "state/shared/orphan-doctrine-audit.json");
const OUT_MD = path.join(REPO, "state/shared/orphan-doctrine-audit.md");

const MEM_DIRS = [
  path.join(REPO, "knowledge/memories/feedback"),
  path.join(REPO, "knowledge/memories/reference"),
  path.join(REPO, "knowledge/memories/project"),
  path.join(REPO, "knowledge/memories/user"),
  path.join(REPO, "knowledge/memories/patterns"),
];

const CLAUDE_MD = path.join(REPO, "CLAUDE.md");

// Common acronyms / words to EXCLUDE (English / generic infra, not PRISM doctrine)
const EXCLUDE = new Set([
  "PRISM", "CLAUDE", "JSON", "YAML", "HTML", "HTTP", "HTTPS", "API", "URL", "URI",
  "CSV", "PDF", "PNG", "JPG", "JPEG", "MD", "TS", "JS", "TSX", "JSX", "MJS",
  "TODO", "NOTE", "FIXME", "WARN", "INFO", "DEBUG", "ERROR", "OK", "OS", "PC",
  "RAM", "CPU", "GPU", "VRAM", "SSD", "HDD", "USB", "SATA", "NVMe",
  "MS0", "MS1", "MS2", "MS3", "MS4", "MS5", "MS6", "MS7", "MS8", "MS9",
  "P0", "P1", "P2", "P3", "R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9",
  "AND", "OR", "NOT", "FOR", "IF", "VS", "PER", "VIA", "AT",
  "ALL", "ANY", "NEW", "OLD", "NO", "YES", "EOF", "BOM", "ASCII", "UTF",
  // PRISM acronyms ALREADY promoted this session
  "PSN", "PSK", "ATCS", "SVI",
  // Common already-doctrine
  "MIT", "OCW", "RTK", "ESM", "CJS", "DSL", "CLI",
  // domain-specific that already have wiki/engine entries
  "MRR", "CSS", "MQTT", "OPC", "FAI", "SPC", "EDM", "CAM", "CAD", "CNC",
  "CMM", "DXF", "STEP", "IGES", "STL", "BOM", "DFM", "DfM", "HSM", "RPM",
  "ISO", "ANSI", "NIST", "GD&T", "JM",
  "AGI", "ML", "AI", "LLM", "GAN", "RNN", "CNN", "GNN", "NN", "RAG", "EMA",
  "ELT", "ETL", "FAQ",
]);

function walkMemoryFiles() {
  const files = [];
  for (const d of MEM_DIRS) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith(".md")) files.push(path.join(d, f));
    }
  }
  return files;
}

function readSafe(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function memoryBasenames(files) {
  return new Set(files.map(f => path.basename(f, ".md").toLowerCase()));
}

// Detect ALL-CAPS acronyms 3-6 letters as standalone tokens
function extractAcronyms(text) {
  const tokens = text.match(/\b[A-Z]{3,6}\b/g) || [];
  return tokens.filter(t => !EXCLUDE.has(t));
}

function detectOrphanAcronyms(memFiles, claudeText) {
  const counts = new Map();
  const allText = claudeText + "\n" + memFiles.map(readSafe).join("\n");
  for (const a of extractAcronyms(allText)) {
    counts.set(a, (counts.get(a) || 0) + 1);
  }
  const basenames = memoryBasenames(memFiles);
  const orphans = [];
  for (const [acronym, count] of counts) {
    if (count < 3) continue;
    const slug = acronym.toLowerCase();
    const hasMemo = [...basenames].some(b => b.includes(slug));
    if (!hasMemo) orphans.push({ acronym, count, hasMemo: false });
  }
  return orphans.sort((a, b) => b.count - a.count).slice(0, 25);
}

function detectClaudeMdSectionOrphans(claudeText, basenames) {
  const headers = (claudeText.match(/^## [A-Z][^\n]{2,60}/gm) || []);
  const orphans = [];
  for (const h of headers) {
    const title = h.replace(/^##\s+/, "").trim();
    // Slugify: alnum + underscore
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);
    if (!slug || slug.length < 4) continue;
    const hasMemo = [...basenames].some(b => b === `feedback_${slug}` || b === `reference_${slug}` || b.endsWith(slug));
    if (!hasMemo) orphans.push({ section: title, slug, hasMemo: false });
  }
  return orphans.slice(0, 30);
}

function detectDispatcherOrphans(memFiles, basenames) {
  const allText = memFiles.map(readSafe).join("\n");
  const dispatcherTokens = allText.match(/prism_[a-z_]{3,30}/g) || [];
  const counts = new Map();
  for (const t of dispatcherTokens) counts.set(t, (counts.get(t) || 0) + 1);
  const orphans = [];
  for (const [tok, count] of counts) {
    if (count < 5) continue;
    const tail = tok.replace(/^prism_/, "");
    const hasMemo = [...basenames].some(b => b.includes(tail));
    if (!hasMemo) orphans.push({ dispatcher: tok, count, hasMemo: false });
  }
  return orphans.sort((a, b) => b.count - a.count).slice(0, 15);
}

function main() {
  const memFiles = walkMemoryFiles();
  const claudeText = readSafe(CLAUDE_MD);
  const basenames = memoryBasenames(memFiles);

  const result = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    advisory_only: true,
    must_human_verify: true,
    note: "Advisory orphan detector — every candidate must be reviewed before promotion.",
    counts: { memory_files: memFiles.length, claude_md_bytes: claudeText.length },
    acronym_orphans: detectOrphanAcronyms(memFiles, claudeText),
    section_header_orphans: detectClaudeMdSectionOrphans(claudeText, basenames),
    dispatcher_orphans: detectDispatcherOrphans(memFiles, basenames),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const md = renderMd(result);
  fs.writeFileSync(OUT_MD, md);

  console.log(`audit-orphan-doctrine: scanned ${memFiles.length} memory files`);
  console.log(`  acronym orphans: ${result.acronym_orphans.length}`);
  console.log(`  section-header orphans: ${result.section_header_orphans.length}`);
  console.log(`  dispatcher orphans: ${result.dispatcher_orphans.length}`);
  console.log(`  wrote ${OUT_JSON} (${fs.statSync(OUT_JSON).size}B) + ${OUT_MD} (${fs.statSync(OUT_MD).size}B)`);
}

function renderMd(r) {
  const lines = [
    `# Orphan-Doctrine Audit — ${r.generated_at}`,
    ``,
    `**Advisory only.** Every candidate must be human-verified before promotion. Detector finds heavily-referenced acronyms/section-headers/dispatchers that lack a dedicated memory file.`,
    ``,
    `Scanned: ${r.counts.memory_files} memory files + CLAUDE.md (${r.counts.claude_md_bytes}B).`,
    ``,
    `## Top acronym orphans (count ≥ 3)`,
    `| Acronym | Refs | Verdict |`,
    `|---|---|---|`,
    ...r.acronym_orphans.map(o => `| ${o.acronym} | ${o.count} | NO dedicated memo |`),
    ``,
    `## CLAUDE.md section orphans (no paired memo)`,
    ...r.section_header_orphans.slice(0, 15).map(o => `- **${o.section}** → slug \`${o.slug}\``),
    ``,
    `## Dispatcher orphans (referenced ≥ 5× without doctrine memo)`,
    `| Dispatcher | Refs | Verdict |`,
    `|---|---|---|`,
    ...r.dispatcher_orphans.map(o => `| \`${o.dispatcher}\` | ${o.count} | NO dedicated memo |`),
    ``,
    `_Regenerate: \`node H:/prism/scripts/audit-orphan-doctrine.mjs\`_`,
  ];
  return lines.join("\n");
}

main();
