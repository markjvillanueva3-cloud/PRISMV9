#!/usr/bin/env node
/**
 * emit-node-memory-pointer.mjs (pure library)
 *
 * For each wiki entry that documents a graph node (engine, algorithm, formula,
 * action, skill, hook, milestone, registry, test, dispatcher, frontend, layer,
 * domain, monolith-module, course, tribal-category), emit a lightweight
 * memory-vault pointer at
 *   knowledge/memories/reference/node_<kind>_<slug>.md
 *
 * The pointer is a 5-line frontmatter + 3-line body — discoverable by the
 * memory-relevance-inject hook + master-index searches, and serves as the
 * `node → memory` index the operator asked for ("memories that can be indexed
 * by nodes for all engines, algorithms, formulas, mathematical concepts").
 *
 * Idempotent: writes only when content would change (preserves mtime on no-op),
 * fail-soft on missing/corrupt inputs, never throws on per-entry errors.
 *
 * Pure helpers (no side-effects) exported for tests:
 *   - sanitizeSlug
 *   - renderPointer
 *   - planEmissions       (returns array of {outPath, content, mode})
 *
 * The driver `applyEmissions` does the FS write — wrap callers in `if (!dry)`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

export const AUTO_START = "<!-- AUTO-NODE-MEMORY-POINTER-START -->";
export const AUTO_END = "<!-- AUTO-NODE-MEMORY-POINTER-END -->";

// Wiki sub-dirs we walk to derive memory pointers, mapped to their canonical kind.
// Order matches the audit/orchestrator's "kind" vocabulary.
export const WIKI_KINDS = [
  { dir: "architecture/engines", kind: "engine" },
  { dir: "architecture/algorithms", kind: "algorithm" },
  { dir: "architecture/formulas", kind: "formula" },
  { dir: "architecture/actions", kind: "action" },
  { dir: "architecture/skills", kind: "skill" },
  { dir: "architecture/hooks", kind: "hook" },
  { dir: "architecture/milestones", kind: "milestone" },
  { dir: "architecture/registries", kind: "registry" },
  { dir: "architecture/tests", kind: "test" },
  { dir: "architecture/dispatchers", kind: "dispatcher" },
  { dir: "architecture/frontend", kind: "frontend" },
  { dir: "architecture/layers", kind: "layer" },
  { dir: "architecture/domains", kind: "domain" },
  { dir: "architecture/monolith", kind: "monolith_module" },
  { dir: "architecture/courses", kind: "course" },
  { dir: "code-tribal", kind: "tribal" },
];

export function sanitizeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 96);
}

/**
 * renderPointer({kind, slug, wikiRelPath, generatedAt, nodeId})
 * Returns a 12-line memory-vault pointer markdown. AUTO-START/END markers let
 * humans append free-text below without losing it on re-emit.
 */
export function renderPointer({ kind, slug, wikiRelPath, generatedAt, nodeId, label }) {
  const cleanKind = String(kind || "node").replace(/[^a-z0-9_-]/gi, "");
  const cleanSlug = sanitizeSlug(slug);
  const safeLabel = String(label || cleanSlug).replace(/\n/g, " ").slice(0, 120);
  const id = nodeId || `${cleanKind}.${cleanSlug}`;
  return `---
name: node-${cleanKind}-${cleanSlug}
description: Node-indexed pointer — ${cleanKind} ${safeLabel} → wiki ${wikiRelPath}
metadata:
  type: reference
  node_kind: ${cleanKind}
  node_id: ${id}
  wiki_path: ${wikiRelPath}
  generated_at: ${generatedAt}
  generator: scripts/lib/emit-node-memory-pointer.mjs
---

# Node pointer — ${cleanKind}/${cleanSlug}

${AUTO_START}

> Indexed pointer for graph node \`${id}\`. The authoritative documentation is in the wiki entry below — this file exists so that semantic memory searches resolve the node directly.

- **Kind:** ${cleanKind}
- **Wiki:** [[${cleanSlug}]] · \`${wikiRelPath}\`
- **Graph node id:** \`${id}\`
- **Last regenerated:** ${generatedAt}

${AUTO_END}

## Human notes

(Append free-text below — re-emit preserves anything outside the AUTO-NODE-MEMORY-POINTER markers.)
`;
}

/**
 * preserveHuman(existing, fresh) — replace only the AUTO-NODE-MEMORY-POINTER block.
 * Returns the merged content, or `fresh` if no markers exist in either side.
 */
export function preserveHuman(existing, fresh) {
  if (!existing) return fresh;
  const sStart = existing.indexOf(AUTO_START);
  const sEnd = existing.indexOf(AUTO_END);
  const nStart = fresh.indexOf(AUTO_START);
  const nEnd = fresh.indexOf(AUTO_END);
  if (sStart === -1 || sEnd === -1 || nStart === -1 || nEnd === -1) return fresh;
  return (
    existing.slice(0, sStart) +
    fresh.slice(nStart, nEnd + AUTO_END.length) +
    existing.slice(sEnd + AUTO_END.length)
  );
}

/**
 * planEmissions({prismRoot, wikiRoot, memoryRoot, generatedAt, limit?, since?})
 *   Returns array of { outPath, content, kind, slug, wikiRelPath, mode }
 *   - mode: "create" | "update" | "skip"
 *   - since (ms epoch) optional — only consider wiki files newer than this
 *   - limit optional — cap per-kind for incremental runs (default 0 = no cap)
 *
 * Read-only. Pure. Tests can call this directly.
 */
export function planEmissions({ prismRoot, generatedAt, since = 0, limit = 0, kinds = WIKI_KINDS }) {
  const wikiRoot = resolve(prismRoot, "knowledge/wiki");
  const memoryRoot = resolve(prismRoot, "knowledge/memories/reference");
  const plans = [];

  for (const { dir, kind } of kinds) {
    const wikiDir = resolve(wikiRoot, dir);
    if (!existsSync(wikiDir)) continue;
    let files;
    try {
      files = readdirSync(wikiDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    let countThisKind = 0;
    for (const f of files) {
      const wikiPath = join(wikiDir, f);
      let st;
      try { st = statSync(wikiPath); } catch { continue; }
      if (since && st.mtimeMs < since) continue;

      const slug = f.replace(/\.md$/, "");
      const wikiRelPath = `knowledge/wiki/${dir}/${f}`;
      const outName = `node_${kind}_${sanitizeSlug(slug)}.md`;
      const outPath = resolve(memoryRoot, outName);

      // Pull the title/label out of the wiki frontmatter for nicer pointer text.
      let label = slug;
      try {
        const head = readFileSync(wikiPath, "utf8").slice(0, 1024);
        const m = head.match(/^title:\s*(.+)$/m);
        if (m) label = m[1].trim();
      } catch {}

      const fresh = renderPointer({ kind, slug, wikiRelPath, generatedAt, label });
      let mode = "create";
      let content = fresh;
      if (existsSync(outPath)) {
        let existing = "";
        try { existing = readFileSync(outPath, "utf8"); } catch {}
        content = preserveHuman(existing, fresh);
        mode = content === existing ? "skip" : "update";
      }

      plans.push({ outPath, content, kind, slug, wikiRelPath, mode });
      countThisKind++;
      if (limit && countThisKind >= limit) break;
    }
  }
  return plans;
}

/**
 * applyEmissions(plans, { dryRun }) — does the FS write. Returns {created, updated, skipped, errors}.
 */
export function applyEmissions(plans, { dryRun = false } = {}) {
  let created = 0, updated = 0, skipped = 0, errors = 0;
  for (const p of plans) {
    if (p.mode === "skip") { skipped++; continue; }
    if (dryRun) {
      if (p.mode === "create") created++;
      else updated++;
      continue;
    }
    try {
      const parent = dirname(p.outPath);
      if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
      writeFileSync(p.outPath, p.content, "utf8");
      if (p.mode === "create") created++;
      else updated++;
    } catch {
      errors++;
    }
  }
  return { created, updated, skipped, errors, total: plans.length };
}
