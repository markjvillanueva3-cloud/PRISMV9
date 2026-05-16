#!/usr/bin/env node
/**
 * backfill-memory-provenance.mjs — one-shot enrichment of legacy memos.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-PROVENANCE-LAYER (D1).
 *
 * Walks H:/prism/knowledge/memories/{category}/*.md, and for every file
 * that LACKS a `provenance:` frontmatter block, derives one from:
 *   - agent: best-effort from `git log` (most recent committer of the file)
 *   - sessionId: derived from the agent id (`claude-<8hex>` → `<8hex>`)
 *   - writeEvent: "backfill" (one-shot identity)
 *   - writtenAt: file mtime (ISO 8601)
 *   - category: subdirectory name
 *   - machine: hostname when available
 *
 * Idempotent — files with existing provenance are skipped. Atomic write
 * via tmp + rename so a crashed run never half-writes.
 *
 * CLI flags:
 *   --dry-run   List what would change but don't write
 *   --root <d>  Override the memory vault root (default: H:/prism/knowledge/memories)
 *   --limit N   Stop after N files (useful for incremental backfill)
 *   --verbose   Print per-file status
 *
 * Returns:
 *   exit 0 on success (including 0 files needing backfill)
 *   exit 1 only when a file is encountered the schema cannot validate after
 *          derivation — surfaces the bad memo to the operator (Karpathy R12)
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import { dirname, join, basename, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";

import {
  MEMORY_PROVENANCE_SCHEMA_VERSION,
  MemoryProvenanceSchema,
  formatProvenanceFrontmatter,
  extractProvenanceFromFrontmatter,
  buildProvenanceFromHookInput,
} from "../mcp-server/src/schemas/memoryProvenanceSchema.ts";

// D2 — OBSIDIAN-INTELLIGENCE-MS3 / U-ONTOLOGY-LAYER. Backfill also injects
// inferred ontology blocks for memos lacking one. Idempotent: memos with
// an existing valid ontology block are skipped.
import {
  MEMORY_ONTOLOGY_SCHEMA_VERSION,
  classifyFromFilename,
  extractOntologyFromFrontmatter,
  mergeIntoExistingFrontmatter,
} from "../mcp-server/src/schemas/memoryOntologySchema.ts";

// Default fallback agent for files where git log produces nothing usable
// (file not tracked, repo unavailable, etc). Matches the AgentIdSchema regex.
const FALLBACK_AGENT = "backfill-00000000";
const FALLBACK_SESSION_ID = "00000000";

const DEFAULT_ROOT = "H:/prism/knowledge/memories";

// Valid category dirs (must match VaultCategorySchema in the schema file).
const VALID_CATEGORIES = new Set([
  "feedback",
  "project",
  "reference",
  "user",
  "lessons",
  "decisions",
  "mistakes",
  "patterns",
  "inbox",
  "uncategorized",
  "_index",
]);

// ─── Pure helpers (exported for testability) ──────────────────────────

/**
 * Categorize a filename via the same prefix rules the live hook uses. Used
 * as a fallback when the file is in a subdir we don't recognize.
 */
export function categorizeByPrefix(filename) {
  if (typeof filename !== "string") return "uncategorized";
  const base = filename.toLowerCase();
  if (base === "memory.md") return "_index";
  const PREFIX_MAP = {
    feedback_: "feedback",
    project_: "project",
    user_: "user",
    reference_: "reference",
    mistakes_: "mistakes",
    mistake_: "mistakes",
    patterns_: "patterns",
    pattern_: "patterns",
    lesson_: "lessons",
    lessons_: "lessons",
    decision_: "decisions",
    decisions_: "decisions",
    inbox_: "inbox",
  };
  for (const [prefix, cat] of Object.entries(PREFIX_MAP)) {
    if (base.startsWith(prefix)) return cat;
  }
  return "uncategorized";
}

/**
 * Derive the agent id from a `git log -n 1 --pretty=%an` author name. The
 * author name in commits is typically a real human or "claude-flow"/etc.
 * Returns null when nothing usable is found.
 *
 * For tests, you can inject `spawnImpl` to avoid forking git.
 */
export function deriveAgentFromGitLog(filePath, opts = {}) {
  const spawnImpl = opts.spawnImpl || defaultGitSpawn;
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  let r;
  try {
    r = spawnImpl(filePath);
  } catch {
    return null;
  }
  if (!r || r.status !== 0) return null;
  const author = String(r.stdout || "").trim();
  if (!author) return null;
  // Heuristic: only accept author names that look like our agent-id pattern.
  // Real commits by humans (e.g. "Mark Villanueva") won't match — that's
  // intentional, we fall back to FALLBACK_AGENT for those.
  if (/^claude-[0-9a-f]{8}$/.test(author)) return author;
  // Allow `claude-<8hex>` even when wrapped (some bots commit as
  // "claude-flow: claude-<8hex>" — extract the inner id).
  const inner = author.match(/\bclaude-[0-9a-f]{8}\b/);
  if (inner) return inner[0];
  return null;
}

function defaultGitSpawn(filePath) {
  return spawnSync(
    "git",
    ["-C", "H:/prism", "log", "-n", "1", "--pretty=%an", "--", filePath],
    { encoding: "utf8", timeout: 5_000 },
  );
}

/**
 * Build a provenance object for a file. Pure: takes everything it needs as
 * inputs so it's deterministic in tests.
 */
export function buildProvenanceForFile({
  filePath,
  mtimeIso,
  category,
  agentFromGit,
  host,
}) {
  let agent = agentFromGit;
  let sessionId;
  if (agent && /^claude-[0-9a-f]{8}$/.test(agent)) {
    sessionId = agent.slice("claude-".length);
  } else {
    agent = FALLBACK_AGENT;
    sessionId = FALLBACK_SESSION_ID;
  }
  return buildProvenanceFromHookInput({
    agent,
    sessionId,
    writeEvent: "backfill",
    writtenAt: mtimeIso,
    category: VALID_CATEGORIES.has(category) ? category : "uncategorized",
    sourceTool: "backfill-memory-provenance",
    machine: host || undefined,
  });
}

/**
 * Inject a provenance frontmatter block at the START of a markdown body.
 * If the body already has YAML frontmatter (---...---), MERGE the
 * provenance under the existing block. Otherwise prepend a new fence.
 */
export function injectProvenanceFrontmatter(body, provenance) {
  if (typeof body !== "string") return formatProvenanceFrontmatter(provenance);
  // Preserve any UTF-8 BOM on the input so the on-disk byte representation
  // doesn't silently change across backfill runs (Arm B P1 finding).
  const hasBom = /^﻿/.test(body);
  const norm = body.replace(/^﻿/, "");
  const block = formatProvenanceFrontmatter(provenance);
  const bom = hasBom ? "﻿" : "";
  if (!/^---\s*\n/.test(norm)) {
    // No existing frontmatter — prepend a fresh block + original body.
    return bom + block + norm;
  }
  // Existing frontmatter — inject `provenance:` sub-block before the
  // closing fence, preserving every other top-level field.
  const endIdx = norm.indexOf("\n---", 4);
  if (endIdx === -1) {
    // Malformed existing frontmatter — surface by prepending fresh block.
    return bom + block + norm;
  }
  const head = norm.slice(0, endIdx + 1); // includes opening fence + content up to closing
  const tail = norm.slice(endIdx + 1); // starts with "---"
  // Strip outer fences from emitted block (skip leading "---", skip trailing "---" + "")
  const innerLines = block.split("\n").slice(1, -2);
  return bom + head + innerLines.join("\n") + "\n" + tail;
}

/**
 * Walk a root directory, returning every .md file's absolute path. Skips
 * dotfiles + non-md. Bounded to depth 3 so we don't recurse into pathological
 * symlink loops.
 *
 * `fsImpl` injectable for tests.
 */
export function walkMemoryVault(root, fsImpl, depth = 0, opts = {}) {
  const fs = fsImpl || {
    readdirSync: readdirSync,
    statSync: statSync,
    // lstatSync used to REJECT symlinks (a symlinked subdir could escape the
    // vault — see Arm A P1 finding). When fsImpl is injected (tests), the
    // injected statSync is used as a stand-in for lstatSync; tests don't
    // exercise symlinks so the behavior is equivalent.
    lstatSync: (p) => statSync(p),
    existsSync: existsSync,
  };
  const MAX_DEPTH = 3;
  const out = [];
  if (depth > MAX_DEPTH) return out;
  if (!fs.existsSync(root)) return out;
  let entries;
  try {
    entries = fs.readdirSync(root);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = join(root, name);
    let st;
    try {
      // Use lstat (NOT stat) so symlinks don't get followed. A symlinked
      // subdir pointing outside the vault would otherwise be walked + its
      // files rewritten — denied by design.
      st = fs.lstatSync ? fs.lstatSync(full) : fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink && st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      out.push(...walkMemoryVault(full, fs, depth + 1, opts));
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

// ─── CLI main (impure) ────────────────────────────────────────────────

function atomicWrite(target, content) {
  mkdirSync(dirname(target), { recursive: true });
  const tmp =
    target + ".tmp." + process.pid + "." + randomBytes(6).toString("hex");
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, target);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    const code = err && err.code ? ` (${err.code})` : "";
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`atomicWrite rename failed${code}: ${msg}`);
  }
}

function deriveCategoryFromPath(filePath, root) {
  const rel = relative(root, filePath).split(sep);
  if (rel.length >= 2) {
    const subdir = rel[0];
    if (VALID_CATEGORIES.has(subdir)) return subdir;
  }
  return categorizeByPrefix(basename(filePath));
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isVerbose = args.includes("--verbose");
  const rootIdx = args.indexOf("--root");
  const root = rootIdx !== -1 ? args[rootIdx + 1] : DEFAULT_ROOT;
  const limitIdx = args.indexOf("--limit");
  const limit =
    limitIdx !== -1 ? Math.max(0, Number.parseInt(args[limitIdx + 1], 10)) : 0;
  const rootAbs = resolve(root);

  if (!existsSync(rootAbs)) {
    process.stderr.write(`backfill: root not found: ${rootAbs}\n`);
    process.exit(1);
  }

  const files = walkMemoryVault(rootAbs);
  const host = hostname();
  const counts = { total: files.length, alreadyOk: 0, enriched: 0, errors: 0 };

  for (const filePath of files) {
    if (limit > 0 && counts.enriched + counts.errors >= limit) break;
    let content;
    try {
      content = readFileSync(filePath, "utf8");
    } catch (err) {
      counts.errors++;
      process.stderr.write(
        `backfill: read failed ${filePath}: ${err && err.message ? err.message : err}\n`,
      );
      continue;
    }
    let alreadyHasProvenance = false;
    try {
      const existing = extractProvenanceFromFrontmatter(content);
      if (existing) alreadyHasProvenance = true;
    } catch (err) {
      // Existing provenance present but invalid — surface, do NOT enrich
      // (we'd just paper over the corruption). Include the first 200 chars
      // of the bad frontmatter block so the operator can act without
      // opening the file (Arm B P1 finding).
      counts.errors++;
      const fmEnd = content.indexOf("\n---", 4);
      const snippet =
        fmEnd === -1
          ? content.slice(0, 200)
          : content.slice(0, Math.min(fmEnd + 4, 200));
      process.stderr.write(
        `backfill: existing provenance invalid in ${filePath}: ${err && err.message ? err.message : err}\n  block(first 200 chars): ${snippet.replace(/\n/g, "\\n")}\n`,
      );
      continue;
    }
    // D2 ontology check (independent of provenance — a file can have
    // provenance but no ontology, or vice versa).
    let alreadyHasOntology = false;
    try {
      const existingOnt = extractOntologyFromFrontmatter(content);
      if (existingOnt) alreadyHasOntology = true;
    } catch (err) {
      // Symmetric error reporting with D1: include the first 200 chars of
      // the bad frontmatter so the operator can fix without opening the file.
      counts.errors++;
      const fmEnd = content.indexOf("\n---", 4);
      const snippet =
        fmEnd === -1
          ? content.slice(0, 200)
          : content.slice(0, Math.min(fmEnd + 4, 200));
      process.stderr.write(
        `backfill: existing ontology invalid in ${filePath}: ${err && err.message ? err.message : err}\n  block(first 200 chars): ${snippet.replace(/\n/g, "\\n")}\n`,
      );
      continue;
    }

    if (alreadyHasProvenance && alreadyHasOntology) {
      counts.alreadyOk++;
      if (isVerbose) process.stdout.write(`SKIP   ${filePath} (already provenanced + ontology)\n`);
      continue;
    }

    let enriched = content;
    const fileName = basename(filePath);

    // Inject provenance if missing.
    if (!alreadyHasProvenance) {
      const st = statSync(filePath);
      const mtimeIso = new Date(st.mtimeMs).toISOString();
      const category = deriveCategoryFromPath(filePath, rootAbs);
      const agentFromGit = deriveAgentFromGitLog(filePath);
      const provenance = buildProvenanceForFile({
        filePath,
        mtimeIso,
        category,
        agentFromGit,
        host,
      });
      enriched = injectProvenanceFrontmatter(enriched, provenance);
    }

    // Inject ontology if missing (heuristic classification by filename+body).
    // Defense-in-depth: if classifyFromFilename or merge throws on this file,
    // count it as an error + continue rather than aborting the whole loop
    // (Arm A P1: keep loop atomicity invariant).
    if (!alreadyHasOntology) {
      try {
        const ontology = classifyFromFilename(fileName, enriched);
        enriched = mergeIntoExistingFrontmatter(enriched, ontology);
      } catch (err) {
        counts.errors++;
        process.stderr.write(
          `backfill: ontology inject failed for ${filePath}: ${err && err.message ? err.message : err}\n`,
        );
        continue;
      }
    }

    if (isDryRun) {
      counts.enriched++;
      const provTag = alreadyHasProvenance ? "" : " +prov";
      const ontTag = alreadyHasOntology ? "" : " +ont";
      process.stdout.write(`WOULD  ${filePath}${provTag}${ontTag}\n`);
      continue;
    }
    try {
      atomicWrite(filePath, enriched);
      counts.enriched++;
      if (isVerbose) {
        const provTag = alreadyHasProvenance ? "" : " +prov";
        const ontTag = alreadyHasOntology ? "" : " +ont";
        process.stdout.write(`WROTE  ${filePath}${provTag}${ontTag}\n`);
      }
    } catch (err) {
      counts.errors++;
      process.stderr.write(
        `backfill: write failed ${filePath}: ${err && err.message ? err.message : err}\n`,
      );
    }
  }

  process.stdout.write(
    JSON.stringify({
      schemaVersion: MEMORY_PROVENANCE_SCHEMA_VERSION,
      root: rootAbs,
      dryRun: isDryRun,
      counts,
    }) + "\n",
  );
  process.exit(counts.errors > 0 ? 1 : 0);
}

const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  /backfill-memory-provenance\.mjs$/.test(
    process.argv[1].replace(/\\/g, "/"),
  );

if (isMain) {
  try {
    main();
  } catch (err) {
    process.stderr.write(
      `backfill: ${err && err.message ? err.message : err}\n`,
    );
    process.exit(1);
  }
}
