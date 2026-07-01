#!/usr/bin/env node
/**
 * generate-skills-atomic.mjs — emit every slash-command skill as an atomic
 * L6 child of core.skills, drawing from BOTH:
 *   1. project skills:  .claude/commands/*.md
 *   2. user skills:     ~/.claude/commands/*.md  (also mirrored to .claude/commands)
 *
 * Reads YAML frontmatter (--- name / description / category / model / tools)
 * when present to label nodes. Falls back to filename stem otherwise.
 *
 * Each emitted L6 node:
 *   id     = skill.<scope>.<slug>     scope ∈ {project, user}
 *   parent = core.skills
 *   layer  = L6
 *   subgroup = "skill"
 *
 * Edges:
 *   - core.skills -> skill            (contains)
 *
 * Output: state/shared/system-viz/skills-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const PROJECT_DIR = path.join(ROOT, ".claude", "commands");
const USER_DIR    = path.join(os.homedir(), ".claude", "commands");

function slugify(s) {
  return s.toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function readFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const block = text.slice(3, end);
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function listSkillFiles(dir, scope) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  function walk(d, prefix = "") {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        // Allow one level of subgrouping (e.g. .claude/commands/wedm/wedm-cite.md)
        walk(full, prefix ? `${prefix}/${e.name}` : e.name);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push({ scope, abs: full, rel: prefix ? `${prefix}/${e.name}` : e.name });
      }
    }
  }
  walk(dir);
  return out;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const files = [
    ...listSkillFiles(PROJECT_DIR, "project"),
    ...listSkillFiles(USER_DIR, "user"),
  ];

  const stats = {
    projectScanned: files.filter(f => f.scope === "project").length,
    userScanned:    files.filter(f => f.scope === "user").length,
    nodesEmitted:   0,
    duplicatesAcrossScopes: 0,
    perScope: {},
  };

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const f of files) {
    const stem = f.rel.replace(/\.md$/, "");
    const slug = slugify(stem.replace(/\//g, "_"));
    const id = `skill.${f.scope}.${slug}`;
    if (existingIds.has(id) || seenId.has(id)) {
      stats.duplicatesAcrossScopes++;
      continue;
    }
    seenId.add(id);

    let sizeBytes = 0;
    let label = stem.split("/").pop();
    let description = null;
    let categoryHint = stem.includes("/") ? stem.split("/")[0] : null;
    try {
      sizeBytes = fs.statSync(f.abs).size;
      const text = fs.readFileSync(f.abs, "utf8").slice(0, 4000);
      const fm = readFrontmatter(text);
      if (fm) {
        if (fm.name) label = fm.name;
        if (fm.description) description = fm.description;
        if (fm.category) categoryHint = fm.category;
      }
    } catch { /* noop */ }

    newNodes.push({
      id,
      layer: "L6",
      subgroup: "skill",
      parent: "core.skills",
      label: label.length > 60 ? label.slice(0, 57) + "…" : label,
      status: sizeBytes < 200 ? "stub" : "built",
      color: f.scope === "user" ? "#a855f7" : "#22c55e",
      size: 0.30 + Math.min(0.25, Math.log10(1 + sizeBytes / 1024) * 0.10),
      tier: 0,
      ext: "md",
      sizeBytes,
      file: f.scope === "project"
        ? `.claude/commands/${f.rel}`
        : `~/.claude/commands/${f.rel}`,
      scope: f.scope,
      category: categoryHint,
      description: description?.slice(0, 200),
    });
    stats.nodesEmitted++;
    stats.perScope[f.scope] = (stats.perScope[f.scope] || 0) + 1;
    if (existingIds.has("core.skills")) {
      pushEdge("core.skills", id, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "skills-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  project scanned:    ${result.stats.projectScanned}`);
  console.log(`  user scanned:       ${result.stats.userScanned}`);
  console.log(`  emitted:            ${result.stats.nodesEmitted}`);
  console.log(`  cross-scope dupes:  ${result.stats.duplicatesAcrossScopes}`);
}
