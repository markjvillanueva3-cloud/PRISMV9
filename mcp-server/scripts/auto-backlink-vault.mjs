#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U03 — auto-backlink-vault driver.
 *
 * Reads ENGINE_DIGEST.md / DISPATCHER_DIGEST.md (and optionally a skills
 * directory) into BacklinkCandidate corpora, then iterates over every
 * markdown file in the Obsidian vault under a target dir (default
 * `knowledge/ingested/`) and appends a deterministic "## Related PRISM"
 * section per file.
 *
 * Idempotent: if a file already has a "## Related PRISM" section,
 * everything from that header to the next top-level header (or EOF) is
 * replaced. Re-runs that produce the same backlinks emit no diff.
 *
 * Usage:
 *   node scripts/auto-backlink-vault.mjs \
 *     --vault H:/prism/knowledge/ingested \
 *     --engine-digest H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md \
 *     --dispatcher-digest H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md \
 *     --skills-dir H:/.claude/commands \
 *     --top-k 5 \
 *     --min-score 0.05 \
 *     [--dry-run]   # print what would change, write nothing
 *
 * Output (stdout): JSON summary { ok, vault, files_visited, files_changed, files_skipped, errors }.
 *
 * @module scripts/auto-backlink-vault
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const RELATED_HEADER = "## Related PRISM";
const RELATED_SECTION_RE = /\n## Related PRISM\b[\s\S]*?(?=\n## |\n$|$)/;

function parseArgs(argv) {
  const out = {
    vault: "H:/prism/knowledge/ingested",
    engineDigest: "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md",
    dispatcherDigest: "H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md",
    skillsDir: "",     // optional — empty means skip
    topK: 5,
    minScore: 0.05,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--vault") out.vault = argv[++i] ?? out.vault;
    else if (a === "--engine-digest") out.engineDigest = argv[++i] ?? out.engineDigest;
    else if (a === "--dispatcher-digest") out.dispatcherDigest = argv[++i] ?? out.dispatcherDigest;
    else if (a === "--skills-dir") out.skillsDir = argv[++i] ?? out.skillsDir;
    else if (a === "--top-k") out.topK = Number.parseInt(argv[++i] ?? "5", 10);
    else if (a === "--min-score") out.minScore = Number.parseFloat(argv[++i] ?? "0.05");
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

/**
 * Read a digest file and parse it via VaultBacklinkEngine.parseDigest.
 * Returns [] if the file is missing (so partial runs still work).
 */
async function loadDigest(filepath, kind, engine) {
  if (!filepath || !fs.existsSync(filepath)) return [];
  const text = fs.readFileSync(filepath, "utf-8");
  return engine.parseDigest(text, kind);
}

/**
 * Read all *.md files in a directory and parse each as { id, description }
 * using the first markdown heading as id and the first non-heading line
 * as description. Returns [] if dir missing.
 */
function loadSkillsDir(skillsDir) {
  if (!skillsDir || !fs.existsSync(skillsDir)) return [];
  let entries = [];
  try { entries = fs.readdirSync(skillsDir).filter((f) => f.toLowerCase().endsWith(".md")); }
  catch { return []; }
  const out = [];
  for (const filename of entries) {
    const fullPath = path.join(skillsDir, filename);
    let raw = "";
    try { raw = fs.readFileSync(fullPath, "utf-8"); }
    catch { continue; }
    const id = "/" + filename.replace(/\.md$/i, "");
    // First non-empty line that doesn't start with # or --- is the description
    const lines = raw.split(/\r?\n/);
    let description = "";
    let inFrontmatter = false;
    for (const l of lines) {
      const t = l.trim();
      if (t === "---") { inFrontmatter = !inFrontmatter; continue; }
      if (inFrontmatter) continue;
      if (t.startsWith("#") || t.length === 0) continue;
      description = t.slice(0, 500);
      break;
    }
    if (description.length > 0) out.push({ id, kind: "skill", description });
  }
  return out;
}

/**
 * Replace or append the "## Related PRISM" section.
 * Existing section ends at the next "## " heading or EOF.
 */
function applyBacklinkSection(originalText, renderedSection) {
  if (renderedSection.length === 0 && !RELATED_SECTION_RE.test(originalText)) {
    // Nothing to do.
    return originalText;
  }
  const stripped = originalText.replace(RELATED_SECTION_RE, "");
  const trimmed = stripped.replace(/\s+$/, "");
  if (renderedSection.length === 0) {
    // Existing section was removed because no current backlinks. Don't append.
    return trimmed + "\n";
  }
  return trimmed + "\n" + renderedSection.replace(/^\n+/, "") + "\n";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Lazy-import the engine via the compiled dist OR the TS entry. We look for
  // the compiled location first; if absent, the script can't run since the
  // TS source needs to be built.
  let engineModulePath;
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "VaultBacklinkEngine.js");
  if (fs.existsSync(distPath)) {
    engineModulePath = distPath;
  } else {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `VaultBacklinkEngine compiled artifact not found at ${distPath}. Run \`npm run build:fast\` first.`,
    }, null, 2));
    process.exit(2);
  }
  const { vaultBacklinkEngine } = await import(pathToFileURL(engineModulePath).href);

  const candidatesEngine = await loadDigest(args.engineDigest, "engine", vaultBacklinkEngine);
  const candidatesAction = await loadDigest(args.dispatcherDigest, "dispatcher_action", vaultBacklinkEngine);
  const candidatesSkill = loadSkillsDir(args.skillsDir);

  if (!fs.existsSync(args.vault)) {
    console.log(JSON.stringify({
      ok: false,
      error: "vault-not-found",
      message: `Vault directory does not exist: ${args.vault}`,
    }, null, 2));
    process.exit(2);
  }

  const summary = {
    ok: true,
    vault: args.vault,
    corpora: {
      engines: candidatesEngine.length,
      dispatcher_actions: candidatesAction.length,
      skills: candidatesSkill.length,
    },
    files_visited: 0,
    files_changed: 0,
    files_skipped: 0,
    dryRun: args.dryRun,
    errors: [],
  };

  // Walk the vault for *.md files. Single-level depth — Obsidian topic pages
  // typically sit at the root of `knowledge/ingested/` with one file per
  // chunk or topic.
  let entries = [];
  try { entries = fs.readdirSync(args.vault, { withFileTypes: true }); }
  catch (err) {
    summary.ok = false;
    summary.errors.push({ phase: "list-vault", message: String(err?.message ?? err) });
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) {
      summary.files_skipped++;
      continue;
    }
    const fullPath = path.join(args.vault, ent.name);
    summary.files_visited++;
    let raw = "";
    try { raw = fs.readFileSync(fullPath, "utf-8"); }
    catch (err) {
      summary.errors.push({ phase: "read", file: ent.name, message: String(err?.message ?? err) });
      continue;
    }
    // Strip any prior "## Related PRISM" section before computing new
    // backlinks so repeat runs don't feed their own backlinks back into
    // the score.
    const prePrior = raw.replace(RELATED_SECTION_RE, "");
    let backlinks;
    try {
      backlinks = vaultBacklinkEngine.findBacklinksForChunk(prePrior, {
        topK: args.topK,
        minScore: args.minScore,
        candidatesEngine,
        candidatesAction,
        candidatesSkill,
      });
    } catch (err) {
      summary.errors.push({ phase: "score", file: ent.name, message: String(err?.message ?? err) });
      continue;
    }
    const section = vaultBacklinkEngine.renderBacklinksMarkdown(backlinks);
    const updated = applyBacklinkSection(raw, section);
    if (updated === raw) {
      // No-op (idempotent): skip.
      continue;
    }
    if (args.dryRun) {
      summary.files_changed++;
      continue;
    }
    try { fs.writeFileSync(fullPath, updated); }
    catch (err) {
      summary.errors.push({ phase: "write", file: ent.name, message: String(err?.message ?? err) });
      continue;
    }
    summary.files_changed++;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: "unhandled",
    message: String(err?.message ?? err),
    stack: String(err?.stack ?? "").slice(0, 2000),
  }, null, 2));
  process.exit(1);
});
