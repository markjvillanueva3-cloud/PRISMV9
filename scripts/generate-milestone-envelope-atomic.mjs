#!/usr/bin/env node
/**
 * generate-milestone-envelope-atomic.mjs — emit a graph node for every
 * milestone envelope JSON under mcp-server/data/milestones/*.json.
 *
 * SYSTEM-VIZ-HIGH-ROI-MS0 — handoff PENDING #2 (sister gap to scripts-lib
 * coverage). ~707 milestone envelopes had no atomic graph node, so
 * /system-viz blast-radius queries and the master-index pre-search could not
 * resolve a milestone by id. This generator gives each envelope file a node.
 *
 * Emits:
 *   core.milestones        — L6 rollup, sibling of core.scripts; created
 *                            ONLY if absent (merge dedups on re-run).
 *   ms-envelope.<slug>     — one per envelope file.
 * Edge model:
 *   core.milestones -> ms-envelope.<slug>   (contains, intensity 0.15)
 *
 * Output: state/shared/system-viz/milestone-envelope-atomic-augmentation.json
 * consumed by merge-augmentations.mjs mergeIndexedAugmentation().
 *
 * generate() takes injected paths so the join is fixture-testable without
 * loading the 405 MB live graph.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

export function slugify(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Collapse an envelope's status (which uses many different strings across the
 * 707 files) to one of the 3 canonical viz statuses. A `completed_at`
 * timestamp is authoritative — it means the milestone closed regardless of
 * what the `status` string says.
 */
export function envelopeStatus(env) {
  if (env && env.completed_at) return "built";
  const raw = String(env && (env.status != null ? env.status : env.claimedStatus) || "").toLowerCase();
  if (/(complete|completed|done|shipped|closed)/.test(raw)) return "built";
  // NB: no bare "started" token — it is a substring of "not_started", which
  // must resolve to pending. The real PRISM envelope enum is
  // not_started / in_progress[_real] / complete.
  if (/(in[_-]?progress|active|building|partial)/.test(raw)) return "building";
  return "pending";
}

/**
 * Read every *.json under milestonesDir. A file that fails to parse is NOT
 * dropped silently — it returns a { file, parseError:true } record so the
 * caller can count it (R12: degrade visibly).
 */
export function readEnvelopes(milestonesDir) {
  const out = [];
  if (!milestonesDir || !fs.existsSync(milestonesDir)) return out;
  let names;
  // Sorted so slug-collision disambiguation (numeric suffix) is deterministic
  // and stable across regens — the same envelope always wins the base id.
  try { names = fs.readdirSync(milestonesDir).sort(); } catch { return out; }
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    const abs = path.join(milestonesDir, name);
    let stat;
    try { stat = fs.statSync(abs); } catch { continue; }
    if (!stat.isFile()) continue;
    let env;
    try { env = JSON.parse(fs.readFileSync(abs, "utf8")); }
    catch { out.push({ file: name, parseError: true }); continue; }
    if (!env || typeof env !== "object" || Array.isArray(env)) {
      out.push({ file: name, parseError: true });
      continue;
    }
    out.push({ file: name, env });
  }
  return out;
}

/**
 * Build the augmentation. graphPath supplies the existing-node set (so we
 * never re-emit an id the graph already has) AND the L6 layer/parent to copy
 * onto core.milestones — the layer is never hard-coded.
 */
export function generate({ graphPath, milestonesDir } = {}) {
  const stats = {
    envelopesScanned: 0, nodesEmitted: 0, parseErrors: 0,
    parentCreated: false, slugCollisions: 0, byStatus: {},
  };
  if (!graphPath || !fs.existsSync(graphPath)) {
    return { error: "graph-missing", newNodes: [], newEdges: [], stats };
  }
  let graph;
  try { graph = readGraphStreaming(graphPath); }  // off-heap Buffer read: JSON.parse(readFileSync utf8) threw Invalid-string-length at >512MiB -> empty augmentation (U-VIZ-READER-CAPSAFE 2026-06-10)
  catch (e) { return { error: `graph-parse-failed: ${e.message}`, newNodes: [], newEdges: [], stats }; }
  const graphNodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
  const existingIds = new Set(graphNodes.map((n) => n && n.id));

  // core.milestones slots into the L6 backbone next to core.scripts /
  // core.tests / core.skills — copy the layer + parent from a real core node
  // rather than guessing.
  const refCore = graphNodes.find((n) => n && n.id === "core.scripts")
    || graphNodes.find((n) => n && typeof n.id === "string" && n.id.startsWith("core."));
  const coreLayer = refCore && refCore.layer ? refCore.layer : "L6";
  const coreParent = refCore && refCore.parent ? refCore.parent : null;

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const PARENT_ID = "core.milestones";

  if (!existingIds.has(PARENT_ID)) {
    const pnode = {
      id: PARENT_ID, layer: coreLayer, subgroup: "core",
      label: "milestones", status: "built", color: "#a78bfa",
      size: 0.4, tier: 0,
    };
    if (coreParent) pnode.parent = coreParent;
    newNodes.push(pnode);
    seenId.add(PARENT_ID);
    stats.parentCreated = true;
  }

  for (const rec of readEnvelopes(milestonesDir)) {
    stats.envelopesScanned++;
    if (rec.parseError) { stats.parseErrors++; continue; }
    const env = rec.env;
    const rawId = env.id || env.milestone || env.milestoneId || rec.file.replace(/\.json$/i, "");
    const slug = slugify(rawId);
    if (!slug) continue;
    // Two envelope files can legitimately slug to the same id (e.g. CPL.json
    // and a milestone whose `id` field is "cpl") — both are real milestones,
    // so disambiguate with a numeric suffix rather than dropping one or
    // throwing. seenId tracks every id claimed this run; the count is
    // surfaced in stats (R12 — visible, not silent). Existing-graph collision
    // = already merged in a prior regen, skip (idempotent).
    let id = `ms-envelope.${slug}`;
    if (seenId.has(id)) {
      let n = 2;
      while (seenId.has(`ms-envelope.${slug}-${n}`)) n++;
      id = `ms-envelope.${slug}-${n}`;
      stats.slugCollisions++;
    }
    seenId.add(id);
    if (existingIds.has(id)) continue;

    const status = envelopeStatus(env);
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    const totalUnits = Number.isFinite(env.total_units) ? env.total_units
      : (Array.isArray(env.units) ? env.units.length : 0);

    newNodes.push({
      id, layer: coreLayer, subgroup: "milestone-envelope", parent: PARENT_ID,
      label: typeof env.title === "string" && env.title ? env.title : String(rawId),
      status,
      color: status === "built" ? "#22c55e" : status === "building" ? "#fbbf24" : "#64748b",
      size: 0.26 + Math.min(0.2, Math.log10(1 + Math.max(0, totalUnits)) * 0.1),
      tier: 0,
      milestoneId: String(rawId),
      track: typeof env.track === "string" ? env.track : null,
      totalUnits,
      file: `mcp-server/data/milestones/${rec.file}`,
    });
    stats.nodesEmitted++;
    newEdges.push({ from: PARENT_ID, to: id, type: "contains", status: "active", intensity: 0.15 });
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    milestonesDir: "mcp-server/data/milestones",
    newNodes,
    newEdges,
    stats,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────
// Gated so a test can `import` the exports without triggering a 405 MB read.
const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const result = generate({
    graphPath: path.join(VIZ_DIR, "system-graph.json"),
    milestonesDir: path.join(ROOT, "mcp-server", "data", "milestones"),
  });
  const outPath = path.join(VIZ_DIR, "milestone-envelope-atomic-augmentation.json");
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
  if (result.error) {
    console.log(`  error: ${result.error}`);
  } else {
    console.log(`  envelopes scanned: ${result.stats.envelopesScanned}`);
    console.log(`  nodes emitted:     ${result.stats.nodesEmitted}`);
    console.log(`  parse errors:      ${result.stats.parseErrors}`);
    console.log(`  parent created:    ${result.stats.parentCreated}`);
    console.log(`  by status:         ${JSON.stringify(result.stats.byStatus)}`);
  }
}
