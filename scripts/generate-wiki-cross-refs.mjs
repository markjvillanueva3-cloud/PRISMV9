#!/usr/bin/env node
/**
 * generate-wiki-cross-refs.mjs — walk knowledge/wiki/ and emit:
 *
 * 1) Per-category atomic nodes for the KNOWLEDGE wiki categories only
 *    (concepts/, decisions/, patterns/, lessons/, trajectories/,
 *     code-tribal/, software-engineering/, ux-design/, entities/).
 *    Auto-generated action/dispatcher/engine wiki entries are SKIPPED
 *    because they're redundant with the L4/L4a/L5 atomic nodes.
 *
 * 2) Cross-ref edges parsed from each entry's frontmatter `related:` list
 *    + body [[wikilinks]] (capped to avoid edge explosion).
 *
 * 3) Wiki → entity edges where the wiki entry's `action_id`, `dispatcher`,
 *    or `engine` frontmatter names a real node in the graph (uses
 *    "documents" edge type).
 *
 * Output: state/shared/system-viz/wiki-cross-refs-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIKI_ROOT = path.join(ROOT, "knowledge", "wiki");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const KNOWLEDGE_CATEGORIES = new Set([
  "concepts", "decisions", "patterns", "lessons", "trajectories",
  "code-tribal", "software-engineering", "ux-design", "entities",
]);

const MAX_DEPTH = 4;
const MAX_BODY_LINKS_PER_ENTRY = 25;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
const RELATED_LINE_RE = /^(?:related|see_also|cross_refs?|references?):\s*(.+)$/im;
const FIELD_RE = (field) => new RegExp(`^${field}\\s*:\\s*(.+)$`, "im");

function slug(s) {
  return s.toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function readFrontmatter(content) {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return null;
  return m[1];
}

function parseListField(fm, fieldRe) {
  const m = fm.match(fieldRe);
  if (!m) return [];
  const raw = m[1].trim();
  // Could be: "[a, b, c]" or "a, b, c" or a multiline list starting with -
  if (raw.startsWith("[")) {
    return raw.replace(/^\[|\]$/g, "").split(",").map(s => s.replace(/['"]/g, "").trim()).filter(Boolean);
  }
  if (raw.startsWith("-")) {
    return raw.split(/\n/).map(s => s.replace(/^[-\s]+/, "").trim()).filter(Boolean);
  }
  if (raw.includes(",")) return raw.split(",").map(s => s.trim()).filter(Boolean);
  return [raw].filter(Boolean);
}

function generate() {
  if (!fs.existsSync(WIKI_ROOT)) return { error: "wiki-missing", stats: {} };
  if (!fs.existsSync(GRAPH))     return { error: "graph-missing", stats: {} };

  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const byId = new Map();
  for (const n of graph.nodes) byId.set(n.id, n);
  // Build slug-based lookup for [[wikilinks]] → existing nodes
  const wikiSlugToIds = new Map();
  for (const n of graph.nodes) {
    if (!n.id) continue;
    const lastSeg = n.id.split(".").pop();
    if (!lastSeg) continue;
    const s = slug(lastSeg);
    if (!wikiSlugToIds.has(s)) wikiSlugToIds.set(s, []);
    wikiSlugToIds.get(s).push(n.id);
    if (n.label) {
      const ls = slug(n.label);
      if (ls && ls !== s) {
        if (!wikiSlugToIds.has(ls)) wikiSlugToIds.set(ls, []);
        wikiSlugToIds.get(ls).push(n.id);
      }
    }
  }

  // Build category roots map
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function addNode(n) {
    if (byId.has(n.id) || seenId.has(n.id)) return false;
    seenId.add(n.id);
    newNodes.push(n);
    return true;
  }
  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  // Parent rollup for the knowledge wiki
  const PARENT = "core.knowledge.wiki";
  if (!byId.has(PARENT)) {
    addNode({
      id: PARENT, layer: "L6",
      subgroup: "wiki_root",
      label: "Knowledge Wiki", status: "built",
      color: "#a78bfa", size: 0.85, tier: 1, synthetic: true,
    });
  }

  const stats = {
    filesScanned: 0,
    knowledgeNodesEmitted: 0,
    crossRefEdges: 0,
    documentsEdges: 0,
    bodyLinkEdges: 0,
    skippedActionWiki: 0,
    perCategory: {},
  };

  // Walk wiki/<category>/...
  function walk(dir, category, depth) {
    if (depth > MAX_DEPTH) return;
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p, category, depth + 1); continue; }
      if (!e.isFile() || !e.name.endsWith(".md")) continue;
      stats.filesScanned++;
      processFile(p, category);
    }
  }

  function processFile(filePath, category) {
    let content;
    try { content = fs.readFileSync(filePath, "utf8"); }
    catch { return; }
    const fm = readFrontmatter(content);
    if (!fm) return;

    const isAutoGen = /generated_by:\s*scripts\//.test(fm);
    const inKnowledge = KNOWLEDGE_CATEGORIES.has(category);
    if (isAutoGen && !inKnowledge) {
      stats.skippedActionWiki++;
    }

    const titleMatch = fm.match(FIELD_RE("title"));
    const typeMatch  = fm.match(FIELD_RE("type"));
    const title = titleMatch ? titleMatch[1].trim().replace(/^['"]|['"]$/g, "") : path.basename(filePath, ".md");

    // Decide if we emit a NEW node (only for knowledge categories OR
    // hand-authored wiki entries).
    const stem = slug(path.basename(filePath, ".md"));
    const wikiId = `wiki.${category}.${stem}`;

    if (inKnowledge && !byId.has(wikiId)) {
      addNode({
        id: wikiId, layer: "L8",
        subgroup: "wiki_knowledge",
        parent: PARENT,
        label: title.slice(0, 60),
        status: "built", color: "#c4b5fd", size: 0.20, tier: 3,
        ext: "md",
        wikiCategory: category,
        wikiType: typeMatch ? typeMatch[1].trim() : null,
        file: path.relative(ROOT, filePath).split(path.sep).join("/"),
      });
      pushEdge(PARENT, wikiId, "contains", "active", 0.18);
      stats.knowledgeNodesEmitted++;
      stats.perCategory[category] = (stats.perCategory[category] || 0) + 1;
    }

    // Source-side id for edges: prefer existing graph node when this wiki
    // describes one. For action wiki, that's the L4a action node.
    let sourceId = inKnowledge ? wikiId : null;
    const actionIdMatch = fm.match(FIELD_RE("action_id"));
    const engineMatch   = fm.match(FIELD_RE("engine"));
    const dispatcherMatch = fm.match(FIELD_RE("dispatcher"));
    if (!sourceId && actionIdMatch) {
      const aid = actionIdMatch[1].trim().replace(/^['"]|['"]$/g, "");
      if (byId.has(aid)) sourceId = aid;
    }
    if (!sourceId && engineMatch) {
      const stem = slug(engineMatch[1].trim().replace(/^['"]|['"]$/g, ""));
      const matches = wikiSlugToIds.get(stem) || [];
      const engineMatch2 = matches.find(id => id.startsWith("eng."));
      if (engineMatch2) sourceId = engineMatch2;
    }
    if (!sourceId && dispatcherMatch) {
      const stem = slug(dispatcherMatch[1].trim().replace(/^['"]|['"]$/g, ""));
      const matches = wikiSlugToIds.get(stem) || [];
      const dispMatch = matches.find(id => id.startsWith("disp."));
      if (dispMatch) sourceId = dispMatch;
    }
    if (!sourceId) return;

    // Cross-refs from frontmatter
    const related = parseListField(fm, RELATED_LINE_RE);
    for (const ref of related) {
      const refSlug = slug(ref);
      const targets = wikiSlugToIds.get(refSlug) || [];
      const target = targets[0];
      if (!target || target === sourceId) continue;
      if (pushEdge(sourceId, target, "wiki_cross_ref", "active", 0.30)) stats.crossRefEdges++;
    }

    // Body wikilinks
    const body = content.slice(content.indexOf("---", 3) + 3);
    WIKILINK_RE.lastIndex = 0;
    let m;
    let bodyHits = 0;
    while ((m = WIKILINK_RE.exec(body)) !== null && bodyHits < MAX_BODY_LINKS_PER_ENTRY) {
      const linkText = m[1].trim();
      const linkSlug = slug(linkText);
      const targets = wikiSlugToIds.get(linkSlug) || [];
      const target = targets[0];
      if (!target || target === sourceId) continue;
      if (pushEdge(sourceId, target, "wiki_link", "active", 0.22)) {
        stats.bodyLinkEdges++;
        bodyHits++;
      }
    }

    // For knowledge nodes, emit a "documents" edge to the entity the wiki
    // describes (if we resolved an entity id above and source was the wiki).
    if (inKnowledge && sourceId === wikiId && (actionIdMatch || engineMatch || dispatcherMatch)) {
      for (const fld of [actionIdMatch, engineMatch, dispatcherMatch]) {
        if (!fld) continue;
        const rawTarget = fld[1].trim().replace(/^['"]|['"]$/g, "");
        const slugged = slug(rawTarget);
        const targets = byId.has(rawTarget) ? [rawTarget] : (wikiSlugToIds.get(slugged) || []);
        if (targets[0]) {
          if (pushEdge(wikiId, targets[0], "documents", "active", 0.40)) stats.documentsEdges++;
        }
      }
    }
  }

  for (const e of fs.readdirSync(WIKI_ROOT, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    walk(path.join(WIKI_ROOT, e.name), e.name, 0);
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "wiki-cross-refs-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  const s = result.stats;
  console.log(`  files scanned:           ${s.filesScanned}`);
  console.log(`  knowledge nodes emitted: ${s.knowledgeNodesEmitted}`);
  console.log(`  cross-ref edges:         ${s.crossRefEdges}`);
  console.log(`  documents edges:         ${s.documentsEdges}`);
  console.log(`  body wikilinks:          ${s.bodyLinkEdges}`);
  console.log(`  skipped auto-gen:        ${s.skippedActionWiki}`);
  console.log(`  total new edges:         ${result.newEdges.length}`);
  console.log(`  ── per knowledge category ──`);
  for (const [c, n] of Object.entries(s.perCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.padEnd(22)} ${n}`);
  }
}
