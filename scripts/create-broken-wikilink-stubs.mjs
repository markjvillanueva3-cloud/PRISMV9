#!/usr/bin/env node
/**
 * create-broken-wikilink-stubs.mjs — one-shot U-SAF-C2 drain tool.
 *
 * Reads the latest SAF baseline, takes category-3 (broken-wikilink) findings,
 * and creates stub wiki/memory files for each so future audits don't re-flag.
 * Idempotent: existing files are not overwritten (skip-with-log).
 *
 * Each stub carries `status: stub-placeholder` frontmatter so the next-pass
 * audit can detect them, AND a grep-discoverable header so a future drain
 * pass can find what context to fill in. The stub creation does NOT delete
 * or rewrite the source documents that referenced these links — preserves
 * the original author intent per never-delete-only-disable doctrine.
 *
 * Usage:
 *   node scripts/create-broken-wikilink-stubs.mjs            # dry-run
 *   node scripts/create-broken-wikilink-stubs.mjs --apply    # write files
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = "H:/prism";
const BASELINE_DIR = REPO_ROOT + "/state/shared";
const BASELINE_PREFIX = "SYSTEM-AWARENESS-FRESHNESS-BASELINE-";
const AUTO_MEMORY_DIR = "C:/Users/wompu/.claude/projects/H--PRISM/memory";
const WIKI_ARCH_DIR = REPO_ROOT + "/knowledge/wiki/architecture";
const TODAY = new Date().toISOString().slice(0, 10);
const SLOT_OWNER = "golf";
const CHAT_ID = "claude-e20e2b52";

function pickLatestBaseline() {
  const entries = readdirSync(BASELINE_DIR)
    .filter((n) => n.startsWith(BASELINE_PREFIX) && n.endsWith(".json"))
    .sort();
  return entries.length > 0 ? join(BASELINE_DIR, entries[entries.length - 1]) : null;
}

/**
 * Heuristic classification per stem name.
 * Returns { kind, isMemory, targetDir, filename }.
 */
function classify(stem) {
  // Memory file (reference-*) → C: auto-memory dir, frontmatter w/ name+description+type.
  if (stem.startsWith("reference-")) {
    const slug = stem.replace(/^reference-/, "").replace(/-/g, "_");
    return {
      kind: "reference-memory",
      isMemory: true,
      targetDir: AUTO_MEMORY_DIR,
      filename: "reference_" + slug + ".md",
    };
  }
  // Heuristic for kind label only (doesn't change location).
  let kind = "feature";
  if (/-ms\d+/.test(stem) || /^u-/.test(stem)) kind = "milestone";
  if (stem.endsWith("engine")) kind = "engine";
  if (stem.endsWith("-watch") || stem.endsWith("-rank")) kind = "script";
  if (stem.includes("syscall") || stem.includes("record")) kind = "action";
  if (stem.endsWith("-spec")) kind = "unit-spec";
  return {
    kind,
    isMemory: false,
    targetDir: WIKI_ARCH_DIR,
    filename: stem + ".md",
  };
}

function buildMemoryStub(stem) {
  const slug = stem.replace(/-/g, "_");
  return [
    "---",
    "name: " + stem,
    "description: Stub auto-created " + TODAY + " by U-SAF-C2 to resolve a broken wikilink. Content pending from owning slot.",
    "metadata:",
    "  type: reference",
    "  status: stub-placeholder",
    "  created_by: " + SLOT_OWNER + " (" + CHAT_ID + ") U-SAF-C2",
    "---",
    "",
    "# " + stem,
    "",
    "**Status:** stub-placeholder. Auto-created " + TODAY + " by U-SAF-C2 to resolve a broken `[[" + stem + "]]` wikilink found in the awareness baseline audit.",
    "",
    "## Pending content",
    "",
    "A drain pass should expand this entry with the actual reference detail it was meant to point to. To find what context belongs here, search for citations:",
    "",
    "```",
    "grep -rn '\\[\\[" + stem + "\\]\\]' H:/prism --include='*.md'",
    "```",
    "",
    "## See also",
    "",
    "- Spec: `state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md`",
    "- Baseline: latest `state/shared/" + BASELINE_PREFIX + "*.json`",
    "- Audit tool: `scripts/system-awareness-freshness-audit.mjs`",
    "",
  ].join("\n");
}

function buildWikiStub(stem, kind) {
  return [
    "---",
    "title: " + stem,
    "type: " + kind,
    "status: stub-placeholder",
    "created_at: " + TODAY,
    "created_by: " + SLOT_OWNER + "-saf-c2-drain (" + CHAT_ID + ")",
    "---",
    "",
    "# " + stem,
    "",
    "**Status:** stub-placeholder. Auto-created " + TODAY + " by U-SAF-C2 (SYSTEM-AWARENESS-FRESHNESS-MS0 Phase 2) to resolve a broken `[[" + stem + "]]` wikilink found in the awareness baseline audit.",
    "",
    "## Pending content",
    "",
    "This entry classified as type `" + kind + "`. The owning slot (or any chat working in this domain) should expand this stub with:",
    "",
    "- Purpose / problem statement",
    "- Key APIs / files / commit references",
    "- Cross-references to related wiki entries",
    "- Knobs + acceptance criteria (if applicable)",
    "",
    "## Why this stub exists",
    "",
    "The U-SAF-C2 drain creates stub files for every broken wikilink rather than rewriting the source documents to remove links. This preserves the original author's intent (they referenced this for a reason) and surfaces the gap durably. Once content lands here, flip `status:` to `shipped` and the next audit pass will count this as resolved.",
    "",
    "## Find me referenced",
    "",
    "```",
    "grep -rn '\\[\\[" + stem + "\\]\\]' H:/prism --include='*.md' --include='*.mjs' --include='*.ts'",
    "```",
    "",
    "Every doc that points here is the context for what this entry should contain.",
    "",
    "## See also",
    "",
    "- Spec: `state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md`",
    "- Baseline: latest `state/shared/" + BASELINE_PREFIX + "*.json`",
    "- Audit tool: `scripts/system-awareness-freshness-audit.mjs`",
    "",
  ].join("\n");
}

function main() {
  const apply = process.argv.includes("--apply");
  const baselinePath = pickLatestBaseline();
  if (!baselinePath) {
    process.stderr.write("create-broken-wikilink-stubs: no baseline found in " + BASELINE_DIR + "\n");
    return 2;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
  const cat3 = baseline.findings.filter((f) => f.category === 3);
  process.stderr.write("create-broken-wikilink-stubs: " + cat3.length + " broken wikilinks in " + baselinePath + "\n\n");

  let created = 0, skipped = 0;
  const seen = new Set();
  for (const f of cat3) {
    const stem = (f.link || "").trim();
    if (!stem || seen.has(stem)) continue;
    seen.add(stem);
    const c = classify(stem);
    const fullPath = join(c.targetDir, c.filename);
    if (existsSync(fullPath)) {
      process.stderr.write("  SKIP exists: " + fullPath + "\n");
      skipped++;
      continue;
    }
    const body = c.isMemory ? buildMemoryStub(stem) : buildWikiStub(stem, c.kind);
    if (apply) {
      mkdirSync(c.targetDir, { recursive: true });
      writeFileSync(fullPath, body, "utf-8");
      process.stderr.write("  WROTE: " + fullPath + "\n");
    } else {
      process.stderr.write("  WOULD-WRITE: " + fullPath + " (kind=" + c.kind + ", isMemory=" + c.isMemory + ")\n");
    }
    created++;
  }
  process.stderr.write("\n  " + (apply ? "wrote" : "would-write") + ": " + created + ", skipped: " + skipped + "\n");
  return 0;
}

process.exit(main());
