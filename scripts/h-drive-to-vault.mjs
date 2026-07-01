#!/usr/bin/env node
/**
 * h-drive-to-vault.mjs -- the H-drive -> Obsidian vault CATEGORIZATION layer
 * (H-DRIVE-VAULT-SYNERGY/U-1, slot:papa).
 *
 * The system-viz graph already represents every file STRUCTURALLY (L11/L12 via
 * expand-system-viz-l12-files.mjs). What the Obsidian 2nd brain lacks is a
 * SEMANTIC categorization layer: which folders are galaxy-engine vs knowledge-
 * corpus vs build-config, plus a single master map proving every H: domain is
 * categorized + discoverable. This indexer adds exactly that, reusing the
 * filesystem walker (walkDir) + worktree dedupe + skip-set from the L12 script
 * (R8 -- do not duplicate regen-viz) and the taxonomy SSOT in
 * scripts/lib/h-drive-taxonomy.mjs.
 *
 * It indexes two scopes (folder granularity):
 *   A) H:/ top-level domains       -> whole-drive map (junk skipped, clones deduped)
 *   B) H:/prism depth-1 subdirs    -> codebase map (mcp-server, knowledge, ...)
 * For each it emits a categorized row in state/shared/H-DRIVE-COVERAGE.{md,json}
 * (every folder discoverable), plus a per-domain vault note
 * knowledge/memories/reference/reference_hdrive_<slug>.md for SUBSTANTIVE domains
 * (knowledge/code), which auto-graph (generate-memories-atomic) + index
 * (build-memory-index-sidecar) -- the recall path proven by U-DB-VAULT.
 *
 *   node scripts/h-drive-to-vault.mjs                      # write map + notes
 *   node scripts/h-drive-to-vault.mjs --json               # report only
 *   node scripts/h-drive-to-vault.mjs --dry-run            # walk, no writes
 *   node scripts/h-drive-to-vault.mjs --root H:/prism/scripts  # index ONE dir
 *   node scripts/h-drive-to-vault.mjs --max-files 40000    # per-domain walk cap
 *
 * Env: PRISM_HDRIVE_VAULT_FROZEN_TIME=<iso> pins generatedAt for diff-stable output.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY  @unit U-1  slot:papa
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { walkDir } from "./expand-system-viz-l12-files.mjs";
import {
  classifyTopLevel,
  classifyPath,
  normPath,
} from "./lib/h-drive-taxonomy.mjs";

const H_ROOT = "H:/";
const PRISM_ROOT = "H:/prism";
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const VAULT_DIR = path.join(REPO_ROOT, "knowledge", "memories", "reference");
const MAP_MD = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-COVERAGE.md");
const MAP_JSON = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-COVERAGE.json");
const DEFAULT_MAX_FILES = 20000;
const SCHEMA_VERSION = "1.0.0";
const SIDECAR_REINDEX_TIMEOUT_MS = 120000; // 2 min cap for the --reindex sidecar rebuild

function nowIso() {
  return process.env.PRISM_HDRIVE_VAULT_FROZEN_TIME || new Date().toISOString();
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "root";
}

/**
 * Aggregate a walkDir() result for one domain into a pure record.
 * @param {string} name domain label (e.g. "mcp-server", "OBSIDIAN")
 * @param {string} cls  top-level class from classifyTopLevel (or "subdir")
 * @param {{files:Array, stats:object}} walked walkDir output ({} if not walked)
 * @returns {object} domain record (pure, JSON-safe)
 */
export function indexDomain(name, cls, walked) {
  const files = (walked && walked.files) || [];
  const truncated = !!(walked && walked.stats && walked.stats.truncated);
  const extCount = new Map();
  const catCount = new Map();
  const subdirCount = new Map();
  const galaxies = new Set();
  for (const f of files) {
    const ext = f.ext || "(none)";
    extCount.set(ext, (extCount.get(ext) || 0) + 1);
    // Classify the FULL path (f.abs) so location-based rules (scripts/, engines/,
    // knowledge/) fire correctly regardless of which root walkDir was given.
    const c = classifyPath(f.abs || f.rel || f.name || "");
    catCount.set(c.category, (catCount.get(c.category) || 0) + 1);
    if (c.galaxy) galaxies.add(c.galaxy);
    // top-level subdir of this domain (first path segment of rel)
    const rel = normPath(f.rel || "");
    const seg = rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : "(root)";
    subdirCount.set(seg, (subdirCount.get(seg) || 0) + 1);
  }
  const topN = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
  const cats = topN(catCount, 99);
  const dominantCategory = cats.length ? cats[0].k : (cls === "worktree-clone" ? "worktree-clone" : "empty");
  return {
    name,
    class: cls,
    fileCount: files.length,
    truncated,
    dominantCategory,
    categories: cats,
    exts: topN(extCount, 8),
    topSubdirs: topN(subdirCount, 10),
    galaxies: [...galaxies].sort(),
  };
}

/** Decide whether a domain warrants its own vault note (vs map-row only). */
export function shouldEmitNote(rec) {
  if (rec.class === "skip-junk") return false;
  if (rec.class === "worktree-clone") return false; // covered by the aggregate note
  if (rec.fileCount === 0) return false;
  return true;
}

/** Build the per-domain categorized vault index note (pure). */
export function buildDomainNote(rec, scopeLabel, generatedAt) {
  const catLines = rec.categories.map((c) => `- \`${c.k}\`: ${c.v}`).join("\n") || "- (none)";
  const extLines = rec.exts.map((e) => `\`${e.k}\` ${e.v}`).join(" · ") || "(none)";
  const subLines = rec.topSubdirs.map((s) => `\`${s.k}\` (${s.v})`).join(" · ") || "(flat)";
  const gal = rec.galaxies.length ? rec.galaxies.join(", ") : "(none)";
  const trunc = rec.truncated ? ` (walk capped -- count is a floor, R12)` : "";
  return `---
name: reference_hdrive_${slugify(scopeLabel + "-" + rec.name)}
description: "H-drive ${scopeLabel} folder ${rec.name} -- class ${rec.class}, ${rec.fileCount} files, dominant category ${rec.dominantCategory}"
metadata:
  type: reference
  node_type: memory
---

# H-drive folder: ${rec.name} (${scopeLabel}) -- CATEGORIZED INDEX

> Auto-generated by \`scripts/h-drive-to-vault.mjs\` (H-DRIVE-VAULT-SYNERGY/U-1, slot:papa). Re-run to refresh.
> generatedAt: ${generatedAt}  ·  class: **${rec.class}**  ·  files: **${rec.fileCount}**${trunc}

## What it is
Top-level class **${rec.class}**; dominant category **${rec.dominantCategory}**. Galaxies touched: ${gal}.

## Category breakdown
${catLines}

## File types
${extLines}

## Top subfolders
${subLines}

## How to find it in the brain
Semantic-search "${rec.name} folder" or \`/system-viz find ${rec.name}\`; structural file nodes live in the system-viz graph L11/L12 (\`expand-system-viz-l12-files.mjs\`). Master map: \`state/shared/H-DRIVE-COVERAGE.md\`. Related: [[feedback_never_assume_data_file_contents]].
`;
}

/** Build the master coverage map (md + json), pure. */
export function buildCoverageMap(scopes, generatedAt, cloneAggregate) {
  const allRecs = scopes.flatMap((s) => s.records.map((r) => ({ scope: s.label, ...r })));
  const totalFiles = allRecs.reduce((a, r) => a + r.fileCount, 0);
  const noteCount = allRecs.filter(shouldEmitNote).length;
  const json = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    totalDomains: allRecs.length,
    totalFilesIndexed: totalFiles,
    vaultNotes: noteCount,
    cloneAggregate,
    domains: allRecs.map((r) => ({
      scope: r.scope, name: r.name, class: r.class, fileCount: r.fileCount,
      dominantCategory: r.dominantCategory, truncated: r.truncated,
      hasNote: shouldEmitNote(r), galaxies: r.galaxies,
    })),
  };
  const rowsByScope = scopes.map((s) => {
    const rows = s.records
      .slice()
      .sort((a, b) => b.fileCount - a.fileCount)
      .map((r) => `| ${r.name} | ${r.class} | ${r.dominantCategory} | ${r.fileCount}${r.truncated ? "+" : ""} | ${shouldEmitNote(r) ? "yes" : "map-only"} | ${r.galaxies.join(",") || "-"} |`)
      .join("\n");
    return `### Scope: ${s.label}\n\n| folder | class | dominant category | files | vault note | galaxies |\n|--------|-------|-------------------|-------|-----------|----------|\n${rows}`;
  }).join("\n\n");
  const md = `# H-DRIVE -> OBSIDIAN VAULT COVERAGE MAP

> Auto-generated by \`scripts/h-drive-to-vault.mjs\` (H-DRIVE-VAULT-SYNERGY/U-1, slot:papa). generatedAt: ${generatedAt}
> ${allRecs.length} folders categorized · ${totalFiles.toLocaleString()} files indexed · ${noteCount} per-domain vault notes.
> Every folder below is CATEGORIZED + DISCOVERABLE in the 2nd brain. Junk (caches/venvs/recovery) is skipped by the taxonomy skip-set. Worktree clones are deduped to one aggregate note: ${cloneAggregate.count} clones of \`prism\`.
> Spec: \`state/shared/specs/H-DRIVE-VAULT-SYNERGY-PLAN-2026-06-14.md\`. Taxonomy SSOT: \`scripts/lib/h-drive-taxonomy.mjs\`.

${rowsByScope}

## Worktree clones (deduped)
${cloneAggregate.count} \`prism-*\` worktree/milestone clones share the canonical \`H:/prism\` tree (collapsed by \`canonicalRel\`): ${cloneAggregate.names.slice(0, 40).map((n) => `\`${n}\``).join(", ")}${cloneAggregate.names.length > 40 ? " ..." : ""}.

## Doctrine
Refresh: \`node scripts/h-drive-to-vault.mjs\` (cron U-2). The graph side (every file structurally) is owned by \`expand-system-viz-l12-files.mjs\`; this map owns the SEMANTIC categorization + vault discoverability. Backlog U-2..U-8 in the spec.
`;
  return { md, json };
}

// -- live orchestration -----------------------------------------------------

function listTopLevelDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true }).filter((e) => {
      try { return e.isDirectory(); } catch { return false; }
    }).map((e) => e.name);
  } catch { return []; }
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOnly = argv.includes("--json");
  const dryRun = argv.includes("--dry-run");
  const maxIdx = argv.indexOf("--max-files");
  const maxFiles = maxIdx >= 0 ? Number(argv[maxIdx + 1]) || DEFAULT_MAX_FILES : DEFAULT_MAX_FILES;
  const rootIdx = argv.indexOf("--root");
  const singleRoot = rootIdx >= 0 ? argv[rootIdx + 1] : null;
  const generatedAt = nowIso();
  const walkOpts = { maxFiles };

  const scopes = [];
  const cloneNames = [];

  if (singleRoot) {
    // Targeted single-dir index (used by tests + ad-hoc).
    const name = path.basename(normPath(singleRoot));
    const walked = walkDir(singleRoot, walkOpts);
    scopes.push({ label: "targeted", records: [indexDomain(name, "subdir", walked)] });
  } else {
    // Scope A: H:/ top-level domains.
    const aRecs = [];
    for (const name of listTopLevelDirs(H_ROOT)) {
      const cls = classifyTopLevel(name);
      if (cls.skip) continue;
      if (cls.class === "worktree-clone") { cloneNames.push(name); continue; }
      const walked = walkDir(path.join(H_ROOT, name), walkOpts);
      aRecs.push(indexDomain(name, cls.class, walked));
    }
    scopes.push({ label: "H:/ top-level", records: aRecs });

    // Scope B: H:/prism depth-1 subdirs (the codebase map).
    const bRecs = [];
    for (const name of listTopLevelDirs(PRISM_ROOT)) {
      // reuse the same skip-set: classifyTopLevel covers dot-caches/venvs/junk
      const cls = classifyTopLevel(name);
      if (cls.skip) continue;
      const walked = walkDir(path.join(PRISM_ROOT, name), walkOpts);
      bRecs.push(indexDomain(name, "repo-subdir", walked));
    }
    scopes.push({ label: "H:/prism subdirs", records: bRecs });
  }

  const cloneAggregate = { count: cloneNames.length, names: cloneNames.sort() };
  const { md, json } = buildCoverageMap(scopes, generatedAt, cloneAggregate);

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
    return;
  }

  let notesWritten = 0;
  if (!dryRun) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    for (const s of scopes) {
      for (const rec of s.records) {
        if (!shouldEmitNote(rec)) continue;
        const note = buildDomainNote(rec, s.label, generatedAt);
        fs.writeFileSync(path.join(VAULT_DIR, `reference_hdrive_${slugify(s.label + "-" + rec.name)}.md`), note, "utf8");
        notesWritten++;
      }
    }
    fs.mkdirSync(path.dirname(MAP_MD), { recursive: true });
    fs.writeFileSync(MAP_MD, md, "utf8");
    fs.writeFileSync(MAP_JSON, JSON.stringify(json, null, 2), "utf8");
  }

  // --reindex: after writing notes, refresh the searchable memory sidecar so the
  // new index notes are immediately recallable (used by the daily cron, U-2).
  // Fail-soft: a sidecar-rebuild failure never fails the index run (R12 -- the
  // notes + map are already written; recall just lags until the next rebuild).
  let reindexed = "skipped";
  if (!dryRun && !jsonOnly && argv.includes("--reindex")) {
    const sidecar = path.join(REPO_ROOT, "scripts", "build-memory-index-sidecar.mjs");
    try {
      const r = spawnSync(process.execPath, [sidecar], { cwd: REPO_ROOT, timeout: SIDECAR_REINDEX_TIMEOUT_MS, encoding: "utf8" });
      reindexed = r.status === 0 ? "ok" : `failed(status=${r.status})`;
    } catch (e) {
      reindexed = `error(${e && e.message ? e.message : "spawn"})`;
    }
  }

  process.stdout.write(
    `[hdrive-vault] ${dryRun ? "(dry-run) " : ""}${json.totalDomains} folders | ${json.totalFilesIndexed.toLocaleString()} files | ${cloneAggregate.count} clones deduped\n` +
    scopes.map((s) => `  scope ${s.label}: ${s.records.length} folders`).join("\n") + "\n" +
    (dryRun ? "" : `[hdrive-vault] wrote ${notesWritten} notes -> ${path.relative(REPO_ROOT, VAULT_DIR)}/ + map -> ${path.relative(REPO_ROOT, MAP_MD)} | sidecar reindex: ${reindexed}\n`),
  );
}

// Entrypoint guard: importing this module (the test does) must NOT write the live vault.
const __isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (__isCli) main();
