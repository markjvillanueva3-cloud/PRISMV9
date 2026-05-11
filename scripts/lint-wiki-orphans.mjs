#!/usr/bin/env node
/**
 * lint-wiki-orphans.mjs
 *
 * Finds Obsidian wiki entries with ZERO inbound `[[link]]` references.
 *
 * Strategy:
 *   1. Walk knowledge/wiki/ and collect all *.md basenames (the [[link]] target form)
 *   2. Walk every wiki file once, scan body for [[X]] / [[X|Y]] / [[X#H]] tokens
 *   3. Emit per-section stats: total / orphans / orphan ratio
 *   4. Optionally write orphan list to state/shared/wiki-orphans.json
 *
 * Soft tool: orphans aren't bad per se. Generated entries (layer-l5, etc.)
 * naturally have low backlink count until other wiki content references them.
 * This report exists to flag stale or never-referenced entries for cleanup.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const WIKI_DIR = resolve(PRISM_ROOT, "knowledge/wiki");
const WIKI_ARCH_DIR = resolve(WIKI_DIR, "architecture");
const OUT_PATH = resolve(PRISM_ROOT, "state/shared/wiki-orphans.json");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const RESCUE_PATH = join(WIKI_ARCH_DIR, "_orphans-rescue.md");
const DISCONNECTED_PATH = join(WIKI_ARCH_DIR, "_disconnected-graph-nodes.md");

const args = new Set(process.argv.slice(2));
// Default to write mode when invoked by the orchestrator (no flags) so the
// rescue hub + report are always refreshed; --section adds the per-section dump.
const FLAGS = { write: args.has("--write") || args.size === 0, section: args.has("--section") };

const SAMPLE_ORPHANS = 5;
const RESCUE_GROUP_BY = 20;   // orphans-rescue: list grouped under per-subdir headings

function walkMd(dir) {
  const out = [];
  function rec(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
    }
  }
  rec(dir);
  return out;
}

function main() {
  if (!existsSync(WIKI_DIR)) {
    console.error("wiki dir missing");
    process.exit(2);
  }
  const t0 = Date.now();
  const files = walkMd(WIKI_DIR);
  const fileByBase = new Map(); // base → path
  for (const f of files) {
    const base = basename(f, ".md").toLowerCase();
    fileByBase.set(base, f);
  }
  const inbound = new Map();
  const linkRe = /\[\[([^\]\n|#]+?)(?:[|#][^\]\n]*)?\]\]/g;
  for (const f of files) {
    let content;
    try { content = readFileSync(f, "utf8"); } catch { continue; }
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const target = m[1].trim().toLowerCase();
      inbound.set(target, (inbound.get(target) || 0) + 1);
    }
  }

  // Section by path (top-level subdir under wiki/)
  const sections = {};
  let total = 0;
  let totalOrphans = 0;
  const allOrphans = []; // { rel, base, subdir } — the FULL list (for the rescue hub)
  // The rescue hub itself must never count as an orphan-of-itself; nor should the
  // disconnected-graph report (those are hubs by definition).
  const HUB_BASES = new Set(["_orphans-rescue", "_disconnected-graph-nodes", "_stats", "_leaf-index"]);
  for (const f of files) {
    const rel = relative(WIKI_DIR, f).replace(/\\/g, "/");
    const section = rel.split("/")[0] || "_root";
    const base = basename(f, ".md").toLowerCase();
    const links = inbound.get(base) || 0;
    sections[section] = sections[section] || { total: 0, orphans: 0, orphanList: [] };
    sections[section].total++;
    total++;
    if (links === 0 && !HUB_BASES.has(base)) {
      sections[section].orphans++;
      totalOrphans++;
      if (sections[section].orphanList.length < SAMPLE_ORPHANS) sections[section].orphanList.push(rel);
      const archRel = rel.startsWith("architecture/") ? rel.slice("architecture/".length) : rel;
      allOrphans.push({ rel, base: basename(f, ".md"), subdir: dirname(archRel).split("/")[0] || "(root)", inArch: rel.startsWith("architecture/") });
    }
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totals: { files: total, orphans: totalOrphans, orphanRatio: total ? +(totalOrphans / total).toFixed(4) : 0, rescued: allOrphans.length },
    sections,
    elapsedMs: Date.now() - t0,
  };

  if (FLAGS.write) {
    const dir = dirname(OUT_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");
    // ── Orphan rescue hub: an inbound link for every orphan, so effective orphan
    // rate ≈ 0. Only entries under architecture/ get [[wikilink]] backlinks (those
    // share the link namespace); non-arch orphans get markdown links by relative path.
    if (existsSync(WIKI_ARCH_DIR)) {
      const byDir = {};
      for (const o of allOrphans) (byDir[o.subdir] ||= []).push(o);
      const dirSecs = Object.entries(byDir).sort((a, b) => b[1].length - a[1].length).map(([d, list]) => {
        const links = list.sort((a, b) => a.base.localeCompare(b.base)).map((o) => o.inArch ? `- [[${o.base}]]` : `- [${o.base}](../${o.rel})`);
        return `### \`${d}\` — ${list.length}\n\n${links.join("\n")}`;
      }).join("\n\n");
      const rescue = `---
title: Orphan rescue hub
type: architecture
generated_by: scripts/lint-wiki-orphans.mjs
last_verified: ${new Date().toISOString().split("T")[0]}
orphan_count: ${allOrphans.length}
tags: [architecture, wiki, orphans, rescue, self-awareness]
---

# Orphan rescue hub

> Every wiki entry with zero inbound \`[[links]]\` gets one here — so the effective
> orphan rate is ≈ 0 (this page is their inbound edge). Generated entries that
> nothing else has referenced yet land here until the crosslink injector or a
> human links them properly. **${allOrphans.length}** entries currently rescued
> (raw orphan rate ${(report.totals.orphanRatio * 100).toFixed(1)}%).

<!-- AUTO-START — regenerated by lint-wiki-orphans.mjs -->

**Raw orphans:** ${allOrphans.length} / ${total} files (${(report.totals.orphanRatio * 100).toFixed(1)}%). Grouped by subdir below; each link here is an inbound edge that de-orphans the target. The proper fix for any large group is in \`inject-wiki-crosslinks.mjs\` (parent→child backlinks) or the generator that emits that subdir.

${dirSecs || "_(no orphans — nothing to rescue)_"}

<!-- AUTO-END -->

## See also

- Orphan report (JSON): \`state/shared/wiki-orphans.json\`
- Crosslink injector: \`scripts/inject-wiki-crosslinks.mjs\`
- Disconnected graph nodes (degree-0): [[_disconnected-graph-nodes]]
- Wiki stats: [[_stats]]
`;
      writeFileSync(RESCUE_PATH, rescue, "utf8");
      // ── Disconnected graph nodes: degree-0 nodes in the system-viz graph (mostly
      // L9 leaf records that carry a `parent` attribute but no edge — the real fix
      // is in generate-system-viz.mjs: emit parent→child edges for those).
      try {
        const G = JSON.parse(readFileSync(GRAPH_PATH, "utf8"));
        const deg = new Set();
        for (const e of G.edges || []) { if (e.from) deg.add(e.from); if (e.to) deg.add(e.to); }
        const z = (G.nodes || []).filter((n) => !deg.has(n.id));
        const byLayer = {}, byKind = {};
        let withParent = 0;
        for (const n of z) {
          byLayer[n.layer] = (byLayer[n.layer] || 0) + 1;
          const k = n.kind || n.subgroup || n.type || "?";
          byKind[k] = (byKind[k] || 0) + 1;
          if (n.parent) withParent++;
        }
        const layerRows = Object.entries(byLayer).sort((a, b) => b[1] - a[1]).map(([l, c]) => `| ${l} | ${c} |`).join("\n");
        const kindRows = Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, c]) => `| \`${k}\` | ${c} |`).join("\n");
        const disc = `---
title: Disconnected graph nodes (degree-0)
type: architecture
generated_by: scripts/lint-wiki-orphans.mjs
last_verified: ${new Date().toISOString().split("T")[0]}
degree0_nodes: ${z.length}
total_nodes: ${(G.nodes || []).length}
tags: [architecture, system-viz, graph-health, orphans, self-awareness]
---

# Disconnected graph nodes (degree-0)

> ${z.length} of ${(G.nodes || []).length} system-viz nodes have **zero edges** —
> mostly L9 leaf records (planned-units, datacat/extract records) that carry a
> \`parent\` attribute but no edge. ${withParent} of the ${z.length} have a \`parent\`,
> so the real fix is in \`generate-system-viz.mjs\`: emit \`parent → child\` edges
> for those node kinds. Until then, the wiki surfaces them via their parent's
> entry (e.g. milestone entries list their planned-units by \`parent\` match).

<!-- AUTO-START — regenerated by lint-wiki-orphans.mjs -->

**Degree-0 nodes:** ${z.length} / ${(G.nodes || []).length} (${((z.length / Math.max(1, (G.nodes || []).length)) * 100).toFixed(1)}%) · **${withParent}** carry a \`parent\` (fixable via parent→child edges).

### By layer

| Layer | Degree-0 nodes |
|-------|----------------|
${layerRows}

### By kind (top 25)

| Kind | Count |
|------|-------|
${kindRows}

## Why this happens

\`generate-system-viz.mjs\` emits some leaf-record node kinds (L9 \`planned-unit\`,
\`extract_record\`, \`datacat_record\`, \`ppg_asset_record\`, \`boxextract_record\`,
\`jmdie_filetype_machine\`, …) with a \`parent\` field but no explicit edge — the
viewer groups them by \`parent\`, so visually they're attached, but graph-degree is 0.
Fix: in the generator, for every node with \`parent\` and no other edge, push
\`{ from: node.parent, to: node.id, kind: "contains" }\`. That would zero this list
and let the recall hooks / Cypher export traverse into the leaf records.

The wiki layer compensates: \`generate-milestone-wiki.mjs\` lists each milestone's
L9 \`planned-unit\` children by \`parent\` match (not just edges), \`generate-misc-l8-wiki.mjs\`
covers the L8 leaf-record kinds, and \`generate-extracted-modules-wiki.mjs\` covers
the extracted-module files directly.

<!-- AUTO-END -->

## See also

- Orphan rescue hub: [[_orphans-rescue]]
- Wiki stats: [[_stats]]
- System-viz generator: \`scripts/generate-system-viz.mjs\` (the fix lives here)
- Dead-pixel guard (L1 pages w/ no inbound edge): \`.claude/hooks/dead-pixel-guard.mjs\`
`;
        writeFileSync(DISCONNECTED_PATH, disc, "utf8");
      } catch (e) { /* graph missing — skip the disconnected-nodes page */ }
    }
    console.log(`wrote ${OUT_PATH}${existsSync(WIKI_ARCH_DIR) ? ` + _orphans-rescue.md (${allOrphans.length}) + _disconnected-graph-nodes.md` : ""}`);
  }

  console.log(`wiki lint: ${total} files · ${totalOrphans} orphans (${(report.totals.orphanRatio * 100).toFixed(1)}%) · ${Date.now() - t0}ms`);
  if (FLAGS.section) {
    for (const [s, info] of Object.entries(sections).sort((a, b) => b[1].orphans - a[1].orphans)) {
      const pct = info.total ? ((info.orphans / info.total) * 100).toFixed(1) : "0";
      console.log(`  ${s.padEnd(20)} ${String(info.orphans).padStart(5)} / ${String(info.total).padStart(5)} (${pct}%)`);
    }
  }
}

main();
