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

function listEngineSlugsForDomain(G, domain) {
  const out = [];
  const re = new RegExp(`^eng\\.${domain}\\.`);
  for (const n of G.nodes) {
    if (n.layer !== "L5") continue;
    if ((n.subgroup || n.kind) !== "atomic_engine") continue;
    if (!re.test(n.id)) continue;
    out.push(slug(n.label || n.id.split(".").pop()));
  }
  return out;
}

function listActionSlugsForDispatcher(G, dispLabel, dispId, nodeById, outFrom) {
  const out = [];
  const edges = outFrom.get(dispId) || [];
  for (const toId of edges) {
    const node = nodeById.get(toId);
    if (node && node.layer === "L4a") out.push(slug(node.label || node.id.split(".").pop()));
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

  // --- layer-l8 → milestones ---
  {
    const links = G.nodes
      .filter((n) => n.layer === "L8" && (n.kind || n.subgroup) === "milestone")
      .map((n) => `milestone-${slug(n.id)}`)
      .filter((l) => fileExists(join(ARCH_DIR, "milestones", `${l}.md`)))
      .sort();
    const r = applyToEntry(join(ARCH_DIR, "layer-l8.md"), "Milestones", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

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

  // --- layer-stack-overview → all layer entries ---
  {
    const links = ["l0", "l1", "l2", "l3", "l4", "l4a", "l5", "l6", "l7", "l8", "l9", "l10", "l11"]
      .map((l) => `layer-${l}`)
      .filter((l) => fileExists(join(ARCH_DIR, `${l}.md`)));
    const r = applyToEntry(join(ARCH_DIR, "layer-stack-overview.md"), "All layers", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
  }

  // --- domain-<d> → engine entries in domain ---
  for (const d of domains) {
    const slugs = listEngineSlugsForDomain(G, d).filter((s) => fileExists(join(ARCH_DIR, "engines", d, `${s}.md`)));
    if (!slugs.length) continue;
    const links = slugs.map((s) => `${s}`); // engine entries are basename'd by slug
    const r = applyToEntry(join(ARCH_DIR, `domain-${slug(d)}.md`), "Engines in this domain", links);
    if (r.ok && r.changed) { entriesTouched++; linksInjected += r.links; }
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
