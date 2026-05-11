#!/usr/bin/env node
/**
 * inject-wiki-crosslinks.mjs
 *
 * Attacks the wiki orphan-rate problem at the root. Generated wiki entries
 * link OUT (each engine → its domain, each domain → its layer) but parents
 * never link back DOWN to their members — so the leaf entries (engine, action,
 * skill, hook) have zero inbound [[links]] and the orphan linter reports ~98%.
 *
 * This pass appends a "## Members" block (between XLINK markers) at the end
 * of each parent entry, listing [[wiki-link]] references to every child:
 *
 *   layer-l5            → every domain-<d>           (38 links)
 *   layer-l4            → every dispatcher-<d>       (97 links)
 *   layer-l7            → every registry-<id>        (64 links)
 *   layer-l1            → every frontend page entry  (146 links)
 *   layer-l8            → every milestone-<id>       (306 links)
 *   domain-<d>          → every engine entry in that domain
 *   dispatcher-<d>      → every action entry for that dispatcher
 *   layer-stack-overview → all 13 layer entries
 *
 * Idempotent: the XLINK block is fully replaced on each run. Human content
 * outside the markers is untouched.
 *
 * Flags:
 *   --dry-run   report what would change without writing
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");

const args = new Set(process.argv.slice(2));
const FLAGS = { dryRun: args.has("--dry-run") };

const XLINK_START = "<!-- XLINK-START — injected by inject-wiki-crosslinks.mjs -->";
const XLINK_END = "<!-- XLINK-END -->";

function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function fileExists(p) { return existsSync(p); }

/** Replace or append the XLINK block at the end of an entry. */
function setXlinkBlock(content, blockBody) {
  const block = `${XLINK_START}\n\n${blockBody}\n\n${XLINK_END}`;
  if (content.includes(XLINK_START) && content.includes(XLINK_END)) {
    return content.replace(
      new RegExp(`${escapeRe(XLINK_START)}[\\s\\S]*?${escapeRe(XLINK_END)}`, "m"),
      block
    );
  }
  return content.trimEnd() + "\n\n" + block + "\n";
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Apply a members-block to a parent entry file, returning true if changed. */
function applyToEntry(parentPath, title, links) {
  if (!fileExists(parentPath)) return { ok: false, reason: "missing" };
  const content = readFileSync(parentPath, "utf8");
  const body = [
    `## ${title} (${links.length})`,
    "",
    ...links.map((l) => `- [[${l}]]`),
  ].join("\n");
  const next = setXlinkBlock(content, body);
  if (next === content) return { ok: true, changed: false };
  if (!FLAGS.dryRun) writeFileSync(parentPath, next, "utf8");
  return { ok: true, changed: true, links: links.length };
}

function listActionSlugsForDispatcher(G, dispLabel, dispId, nodeById, outFrom) {
  // Match generate-action-wiki.mjs file naming: it parses `disp.<d>.action.<name>`
  // and writes `<slug(name)>.md` where <name> is the ID tail, NOT the label.
  const out = [];
  const edges = outFrom.get(dispId) || [];
  for (const toId of edges) {
    const node = nodeById.get(toId);
    if (!node || node.layer !== "L4a") continue;
    const m = /^disp\.[a-z0-9_]+\.action\.(.+)$/i.exec(node.id);
    const actionName = m ? m[1] : node.label || node.id.split(".").pop();
    out.push(slug(actionName));
  }
  return out;
}

function main() {
  if (!existsSync(GRAPH_PATH)) { console.error("graph missing"); process.exit(2); }
  const G = readJson(GRAPH_PATH);
  const nodeById = new Map(G.nodes.map((n) => [n.id, n]));
  const outFrom = new Map();
  for (const e of G.edges) {
    const arr = outFrom.get(e.from) || [];
    arr.push(e.to);
    outFrom.set(e.from, arr);
  }

  let entriesTouched = 0;
  let linksInjected = 0;
  const t0 = Date.now();

  // --- layer-l5 → domains ---
  const domains = new Set();
  for (const n of G.nodes) {
    if (n.layer !== "L5") continue;
    const m = /^eng\.([a-z0-9_]+)$/.exec(n.id);
    if (m) domains.add(m[1]);
  }
  {
    const links = [...domains].sort().map((d) => `domain-${slug(d)}`).filter((l) => fileExists(join(ARCH_DIR, `${l}.md`)));
    const r = applyToEntry(join(ARCH_DIR, "layer-l5.md"), "Engine domains", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-l4 → dispatchers ---
  {
    const links = G.nodes
      .filter((n) => n.layer === "L4")
      .map((n) => `dispatcher-${slug(n.label || n.id)}`)
      .filter((l) => fileExists(join(ARCH_DIR, `${l}.md`)))
      .sort();
    const r = applyToEntry(join(ARCH_DIR, "layer-l4.md"), "Dispatchers", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-l7 → registries ---
  {
    const links = G.nodes
      .filter((n) => n.layer === "L7")
      .map((n) => `registry-${slug(n.id)}`)
      .filter((l) => fileExists(join(ARCH_DIR, "registries", `${l}.md`)))
      .sort();
    const r = applyToEntry(join(ARCH_DIR, "layer-l7.md"), "Registries & catalogs", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-l8 milestones + ensemble formulas handled together below (single XLINK region) ---

  // --- layer-l1 → frontend pages ---
  {
    const links = G.nodes
      .filter((n) => n.layer === "L1" && (n.kind === "page" || n.subgroup === "page"))
      .map((n) => slug(n.id))
      .filter((l) => fileExists(join(ARCH_DIR, "frontends", "page", `${l}.md`)))
      .sort();
    const r = applyToEntry(join(ARCH_DIR, "layer-l1.md"), "Frontend pages", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-stack-overview links handled below (merged layers + diagrams block) ---

  // --- layer-l6 → skills + hooks + algorithms + L6 formulas (the "core" leaf entries) ---
  {
    const links = [];
    for (const sub of ["skills/project", "skills/user", "hooks/runtime", "hooks/engine", "algorithms"]) {
      const dir = join(ARCH_DIR, sub);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (f.endsWith(".md")) links.push(f.replace(/\.md$/, ""));
      }
    }
    // L6 formulas (constants/types)
    for (const n of G.nodes) {
      if (n.layer !== "L6") continue;
      if (!(n.id || "").startsWith("formula.")) continue;
      const fl = `formula-${slug(n.id)}`;
      if (fileExists(join(ARCH_DIR, "formulas", `${fl}.md`))) links.push(fl);
    }
    const r = applyToEntry(join(ARCH_DIR, "layer-l6.md"), "Core leaf entries (skills, hooks, algorithms, formulas)", [...new Set(links)].sort());
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-l8 → L8 novel_formula entries (ensemble formulas live in the knowledge layer) ---
  {
    const links = G.nodes
      .filter((n) => n.layer === "L8" && (n.id || "").startsWith("formula."))
      .map((n) => `formula-${slug(n.id)}`)
      .filter((l) => fileExists(join(ARCH_DIR, "formulas", `${l}.md`)))
      .sort();
    // layer-l8 already has a Milestones block via applyToEntry above; setXlinkBlock
    // replaces the WHOLE XLINK region, so merge milestones + formulas here.
    const msLinks = G.nodes
      .filter((n) => n.layer === "L8" && (n.kind || n.subgroup) === "milestone")
      .map((n) => `milestone-${slug(n.id)}`)
      .filter((l) => fileExists(join(ARCH_DIR, "milestones", `${l}.md`)))
      .sort();
    const parentPath = join(ARCH_DIR, "layer-l8.md");
    if (fileExists(parentPath)) {
      const content = readFileSync(parentPath, "utf8");
      const body = [
        `## Milestones (${msLinks.length})`, "",
        ...msLinks.map((l) => `- [[${l}]]`),
        "",
        `## Ensemble formulas (${links.length})`, "",
        ...links.map((l) => `- [[${l}]]`),
      ].join("\n");
      const next = setXlinkBlock(content, body);
      if (next !== content) {
        if (!FLAGS.dryRun) writeFileSync(parentPath, next, "utf8");
        entriesTouched++; linksInjected += msLinks.length + links.length;
      }
    }
  }

  // --- domain-<d> → engine entries in domain + Mermaid sub-diagram ---
  // Iterate EVERY domain that has an engines/ subdir, not just graph rollup domains —
  // generate-engine-wiki.mjs writes engines/<domain>/ for ~77 domains but only ~38
  // have an eng.<domain> rollup node. Without this, ~40 domains' engines stay orphans.
  const enginesRoot = join(ARCH_DIR, "engines");
  const engineDomains = existsSync(enginesRoot)
    ? readdirSync(enginesRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  for (const d of engineDomains) {
    const dDir = join(enginesRoot, d);
    const engSlugs = readdirSync(dDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
    const diagramSlug = `${slug(d)}-flow`;
    const hasDiagram = fileExists(join(ARCH_DIR, "diagrams", `${diagramSlug}.md`));
    if (!engSlugs.length && !hasDiagram) continue;
    const links = [];
    if (hasDiagram) links.push(diagramSlug);
    links.push(...engSlugs);
    // domain-<d> wiki may not exist if the domain has no rollup node — skip silently then
    const domainEntry = join(ARCH_DIR, `domain-${slug(d)}.md`);
    if (!fileExists(domainEntry)) continue;
    const r = applyToEntry(domainEntry, "Engines in this domain + flow diagram", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- layer-stack-overview also links all Mermaid sub-diagrams + tribal index ---
  {
    const diagDir = join(ARCH_DIR, "diagrams");
    const links = [];
    if (existsSync(diagDir)) {
      for (const f of readdirSync(diagDir)) if (f.endsWith(".md")) links.push(f.replace(/\.md$/, ""));
    }
    if (fileExists(join(ARCH_DIR, "tribal-knowledge-index.md"))) links.push("tribal-knowledge-index");
    if (fileExists(join(ARCH_DIR, "system-viz.md"))) links.push("system-viz");
    if (links.length) {
      const parentPath = join(ARCH_DIR, "layer-stack-overview.md");
      const content = readFileSync(parentPath, "utf8");
      // layer-stack-overview already has an "All layers" XLINK block; merge.
      const layerLinks = ["l0", "l1", "l2", "l3", "l4", "l4a", "l5", "l6", "l7", "l8", "l9", "l10", "l11"]
        .map((l) => `layer-${l}`)
        .filter((l) => fileExists(join(ARCH_DIR, `${l}.md`)));
      const body = [
        `## All layers (${layerLinks.length})`, "",
        ...layerLinks.map((l) => `- [[${l}]]`),
        "",
        `## Diagrams & indexes (${links.length})`, "",
        ...links.map((l) => `- [[${l}]]`),
      ].join("\n");
      const next = setXlinkBlock(content, body);
      if (next !== content) {
        if (!FLAGS.dryRun) writeFileSync(parentPath, next, "utf8");
        entriesTouched++; linksInjected += layerLinks.length + links.length;
      }
    }
  }

  // --- dispatcher-<d> → action entries for dispatcher ---
  for (const n of G.nodes) {
    if (n.layer !== "L4") continue;
    const dispLabel = n.label || n.id;
    const slugs = listActionSlugsForDispatcher(G, dispLabel, n.id, nodeById, outFrom)
      .filter((s) => fileExists(join(ARCH_DIR, "actions", slug(dispLabel), `${s}.md`)));
    if (!slugs.length) continue;
    const r = applyToEntry(join(ARCH_DIR, `dispatcher-${slug(dispLabel)}.md`), "Actions", slugs);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  console.log(
    `crosslinks: ${entriesTouched} parent entries updated · ${linksInjected} [[links]] injected · ${Date.now() - t0}ms${FLAGS.dryRun ? " (dry-run)" : ""}`
  );
}

main();
