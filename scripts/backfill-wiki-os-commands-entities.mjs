#!/usr/bin/env node
/**
 * backfill-wiki-os-commands-entities.mjs
 *
 * COMMAND-KERNEL-MS0/U-CK11 Phase 2 — corpus-wide wiki entity backfill.
 *
 * Generates `knowledge/wiki/os/commands/<slug>.md` stubs for every command
 * in `.claude/commands/*.md` that doesn't already have one. Closes the
 * single largest exit-condition gap surfaced by U-CK11 Phase 1: the
 * scrutiny pass found `knowledge/wiki/os/commands/` contained 1/302
 * commands registered (only `.gitkeep` + `checkin.md`).
 *
 * Idempotent: existing wiki entities are skipped (no clobber). Re-running
 * after new commands are added is safe.
 *
 * Each stub carries the canonical frontmatter:
 *   ---
 *   kind: command
 *   slug: <filename-without-md>
 *   status: stub
 *   generated_at: <ISO>
 *   generator: scripts/backfill-wiki-os-commands-entities.mjs
 *   source: .claude/commands/<filename>
 *   description: <extracted from source frontmatter, or 1-line synth>
 *   ---
 *   # /<slug>
 *
 *   <description body>
 *
 *   ## Source command
 *
 *   See `.claude/commands/<filename>` for the live executable surface.
 *
 *   ## Status
 *
 *   This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
 *   composes_with chain, invocation examples, related skills) lands in a
 *   later phase per the U-CK11 verdicts doc remediation queue.
 *
 * Flags:
 *   --dry-run        list what would be created (DEFAULT)
 *   --apply          actually write files
 *   --commands-dir   override .claude/commands/ source dir
 *   --wiki-dir       override knowledge/wiki/os/commands/ target dir
 *
 * Exit codes:
 *   0 success
 *   1 partial failure (some files failed to write)
 *   2 fatal (source dir missing, etc.)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_COMMANDS_DIR = join(REPO_ROOT, ".claude", "commands");
const DEFAULT_WIKI_DIR = join(REPO_ROOT, "knowledge", "wiki", "os", "commands");

export function slugFromFilename(filename) {
  return basename(filename, ".md").toLowerCase();
}

export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { hasFrontmatter: false, fields: {}, body: text };
  let i = 1;
  const fields = {};
  while (i < lines.length && lines[i].trim() !== "---") {
    const m = lines[i].match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (m) {
      const [, key, val] = m;
      fields[key] = val.trim();
    }
    i++;
  }
  if (i >= lines.length) return { hasFrontmatter: false, fields: {}, body: text };
  const body = lines.slice(i + 1).join("\n");
  return { hasFrontmatter: true, fields, body };
}

export function synthDescription(slug, body) {
  // First non-empty, non-heading line of body, skipping content inside code
  // fences (between paired ``` markers).
  const lines = body.split(/\r?\n/);
  let inFence = false;
  for (const ln of lines) {
    const t = ln.trim();
    if (t.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!t) continue;
    if (t.startsWith("#")) continue;
    if (t.startsWith("<!--")) continue;
    // Strip markdown emphasis
    return t.replace(/^[*_>-]+\s*/, "").slice(0, 240);
  }
  // Fallback: filename-based
  return `Slash command /${slug} — see source for details.`;
}

export function renderStub(slug, sourceFilename, description, generatedAt) {
  const safeDesc = (description || "").replace(/\r?\n/g, " ").trim() || `Slash command /${slug}.`;
  return `---
kind: command
slug: ${slug}
status: stub
generated_at: ${generatedAt}
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/${sourceFilename}
description: ${JSON.stringify(safeDesc)}
---

# /${slug}

${safeDesc}

## Source command

See \`.claude/commands/${sourceFilename}\` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
`;
}

export function planBackfill({ commandsDir, wikiDir }) {
  if (!existsSync(commandsDir) || !statSync(commandsDir).isDirectory()) {
    throw new Error(`commands dir missing: ${commandsDir}`);
  }
  const sourceFiles = readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
  const plan = [];
  const generatedAt = new Date().toISOString();
  for (const src of sourceFiles) {
    const slug = slugFromFilename(src);
    const target = join(wikiDir, `${slug}.md`);
    if (existsSync(target)) {
      plan.push({ src, slug, target, action: "skip-exists" });
      continue;
    }
    let description;
    try {
      const text = readFileSync(join(commandsDir, src), "utf8");
      const { fields, body } = parseFrontmatter(text);
      description = fields.description || synthDescription(slug, body);
    } catch (e) {
      description = `Slash command /${slug} — source read failed: ${e.message}`;
    }
    plan.push({ src, slug, target, action: "create", description, generatedAt });
  }
  return plan;
}

export function applyBackfill(plan, { wikiDir }) {
  if (!existsSync(wikiDir)) mkdirSync(wikiDir, { recursive: true });
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  for (const entry of plan) {
    if (entry.action === "skip-exists") {
      skipped++;
      continue;
    }
    try {
      const content = renderStub(entry.slug, entry.src, entry.description, entry.generatedAt);
      writeFileSync(entry.target, content);
      created++;
    } catch (e) {
      failed++;
      failures.push({ slug: entry.slug, error: e.message });
    }
  }
  return { created, skipped, failed, failures };
}

function parseCli(argv) {
  const opts = {
    apply: argv.includes("--apply"),
    commandsDir: DEFAULT_COMMANDS_DIR,
    wikiDir: DEFAULT_WIKI_DIR,
  };
  const cIdx = argv.indexOf("--commands-dir");
  if (cIdx >= 0 && argv[cIdx + 1]) opts.commandsDir = resolve(argv[cIdx + 1]);
  const wIdx = argv.indexOf("--wiki-dir");
  if (wIdx >= 0 && argv[wIdx + 1]) opts.wikiDir = resolve(argv[wIdx + 1]);
  return opts;
}

function main() {
  const opts = parseCli(process.argv.slice(2));
  console.error(`[backfill-wiki-os-commands] mode=${opts.apply ? "APPLY" : "DRY-RUN"}`);
  console.error(`[backfill-wiki-os-commands] commands-dir=${opts.commandsDir}`);
  console.error(`[backfill-wiki-os-commands] wiki-dir=${opts.wikiDir}`);
  let plan;
  try {
    plan = planBackfill(opts);
  } catch (e) {
    console.error(`[backfill-wiki-os-commands] FATAL: ${e.message}`);
    process.exit(2);
  }
  const wouldCreate = plan.filter((p) => p.action === "create").length;
  const wouldSkip = plan.filter((p) => p.action === "skip-exists").length;
  console.error(`[backfill-wiki-os-commands] plan: create=${wouldCreate} skip-exists=${wouldSkip} total=${plan.length}`);
  if (!opts.apply) {
    console.error(`[backfill-wiki-os-commands] DRY-RUN complete; re-run with --apply to write files`);
    process.exit(0);
  }
  const result = applyBackfill(plan, opts);
  console.error(`[backfill-wiki-os-commands] APPLY result: created=${result.created} skipped=${result.skipped} failed=${result.failed}`);
  if (result.failures.length) {
    console.error("[backfill-wiki-os-commands] failures:");
    for (const f of result.failures.slice(0, 20)) console.error(`  ${f.slug}: ${f.error}`);
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
