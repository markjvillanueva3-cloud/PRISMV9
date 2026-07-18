#!/usr/bin/env node
/**
 * generate-slot-touch-augmentation.mjs — system-viz augmentation: per-slot
 * 7-day FILE ACTIVITY heat map.
 *
 * SYSTEM-VIZ-HIGH-ROI-MS0 — G6 (post fleet-expansion to 26).
 *
 * Sister to scripts/generate-slot-synergy-features.mjs (which maps slots to
 * SUBSYSTEMS as a static doctrine view). G6 covers the complementary dynamic
 * signal: which filesystem regions each slot is *actively touching this week*.
 *
 * Emits:
 *   ghost.slot_activity              — L8 rollup roost (created only if absent;
 *                                       sibling of ghost.slot_synergy).
 *   slot.activity.<name>             — one per slot with touches in the window.
 *                                       Distinct id from ghost.slot_synergy.slot.<name>
 *                                       so no collision.
 *   (slot.activity.<name>) → (fs.deep.<dir>)  — edge type "touched-fs", with
 *                                       intensity log10(count+1)*0.1, count,
 *                                       last_touch_sha.
 *
 * Operator value (from audit): selecting one slot highlights its 7d region;
 * selecting two surfaces overlap = peer-claim hazard zone BEFORE /pick-unit.
 *
 * Author identification: PRISM commits all share a single GitHub user, so
 * `--author=` is useless. Slot ownership lives in commit-subject pattern
 * `(slot:<nato>)` AND `[<NATO>]` per CLAUDE.md §`/checkin-<nato> /loop`
 * §6. The CLI runs `git log --since=7d --grep='slot:<slot>' -i` per slot.
 *
 * Architecture (R8 — read first):
 *   - Pure `generate({ graph, slotCommits, slotNames })` — no git, no fs.
 *     `slotCommits` is `Record<slot, Array<{ sha, files: string[] }>>`.
 *     Tested with fixtures, NO git subprocess required.
 *   - `resolveFsNodeId(filePath, existingIds)` — climbs path from leaf dir up
 *     until a real `fs.deep.<slug>` node is found in `existingIds`; returns
 *     null if no ancestor is in the graph (R12 — degrade visibly, never
 *     invent ids).
 *   - CLI gathers slotCommits via execFileSync('git', ['log', ...]) per slot.
 *
 * Output: state/shared/system-viz/slot-touch-augmentation.json
 * consumed by merge-augmentations.mjs mergeIndexedAugmentation().
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH_PATH = path.join(VIZ_DIR, "system-graph.json");

// Mirror slugify from generate-fs-deep-inventory.mjs so fs.deep.* lookups hit.
// MUST stay byte-equal to the inventory rule or we silently miss every node.
export function slugify(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Strip drive letter + normalize slashes. Matches pathSegments() in
// generate-fs-deep-inventory.mjs at the bytes that matter for id derivation.
export function normalizeRel(filePath) {
  if (filePath == null) return "";
  let p = String(filePath).replace(/\\/g, "/");
  // Strip leading H:/prism/ or H:/ or /prism/ — git log emits repo-relative
  // paths under H:/prism, so the canonical fs.deep.* prefix is "prism_".
  p = p.replace(/^[a-zA-Z]:\//, "");
  // git log paths are already relative to repo root (no leading "/").
  if (p.startsWith("/")) p = p.slice(1);
  return p;
}

/**
 * Given a git-log file path (repo-relative, e.g. "mcp-server/src/cam/foo.ts"),
 * climb from the LEAF DIRECTORY (parent of the file) up the tree, returning
 * the deepest `fs.deep.<slug>` id that exists in `existingIds`. Returns null
 * if no ancestor is in the graph — R12 NEVER invent ids.
 *
 * The fs.deep.* convention from generate-fs-deep-inventory.mjs is
 *   fs.deep.<slug-of-full-path-without-drive>
 * where path segments are slugified + joined with "_". Repo-relative paths
 * under H:/prism get prefixed with the literal "prism" segment, so a touched
 * "mcp-server/src/cam/foo.ts" tries:
 *   fs.deep.prism_mcp-server_src_cam   (parent dir)
 *   fs.deep.prism_mcp-server_src       (grandparent)
 *   fs.deep.prism_mcp-server           (top-level)
 * The deepest hit wins. We do NOT climb to the bare `fs.deep.prism` root —
 * every touch would resolve there, producing false fleet-overlap signal in
 * the heat map. A touch that can only match the repo root counts as
 * UNRESOLVED so operators see "this slot has many touches outside known
 * dirs" rather than fake-overlap noise.
 */
export function resolveFsNodeId(filePath, existingIds) {
  const rel = normalizeRel(filePath);
  if (!rel) return null;
  const segs = rel.split("/").filter(Boolean);
  if (segs.length < 2) return null; // need at least one parent dir
  // Drop the FILE name → only directory segments
  const dirSegs = segs.slice(0, -1);
  // Climb leaf → top-level (stopping ABOVE bare prism root; i >= 1 keeps at
  // least one dir under prism in every match).
  for (let i = dirSegs.length; i >= 1; i--) {
    const sub = ["prism", ...dirSegs.slice(0, i)].map(slugify).filter(Boolean);
    if (sub.length === 0) continue;
    const cand = `fs.deep.${sub.join("_")}`;
    if (existingIds.has(cand)) return cand;
  }
  return null;
}

/**
 * Build the augmentation.
 *   graph        — { nodes: [...] } source-of-truth for existingIds + refRoost
 *                  (layer/parent copied from ghost.slot_synergy if present,
 *                   else ghost.priority_queue, else fallback L8/null).
 *   slotCommits  — Record<slot, Array<{ sha, files: string[] }>>.
 *                  Iteration order over slots is the iteration order of
 *                  slotNames so output is deterministic.
 *   slotNames    — string[]. The fleet roster (read from chat-slots.mjs by
 *                  the CLI; injected here for testability). Slots missing from
 *                  slotCommits are silently skipped (no activity → no node).
 */
export function generate({ graph, slotCommits, slotNames } = {}) {
  const stats = {
    slotsScanned: 0, slotsEmitted: 0,
    commitsScanned: 0, touchesScanned: 0,
    touchesResolved: 0, touchesUnresolved: 0,
    edgesEmitted: 0, parentCreated: false,
    byCount: {},  // slot -> # of resolved edges (operator-visible distribution)
  };
  if (!graph || !Array.isArray(graph.nodes)) {
    return { error: "graph-missing-or-malformed", newNodes: [], newEdges: [], stats };
  }
  if (!slotCommits || typeof slotCommits !== "object") {
    return { error: "slot-commits-missing", newNodes: [], newEdges: [], stats };
  }
  if (!Array.isArray(slotNames) || slotNames.length === 0) {
    return { error: "slot-names-missing", newNodes: [], newEdges: [], stats };
  }

  const existingIds = new Set(graph.nodes.map((n) => n && n.id));

  // Roost: ghost.slot_activity, modeled on ghost.slot_synergy / ghost.priority_queue.
  const refRoost = graph.nodes.find((n) => n && n.id === "ghost.slot_synergy")
    || graph.nodes.find((n) => n && n.id === "ghost.priority_queue")
    || graph.nodes.find((n) => n && typeof n.id === "string" && n.id.startsWith("ghost."));
  const roostLayer = refRoost && refRoost.layer ? refRoost.layer : "L8";
  const roostParent = refRoost && refRoost.parent ? refRoost.parent : null;
  const slotLayer = refRoost && refRoost.id === "ghost.slot_synergy" && refRoost.layer ? refRoost.layer : "L9";

  const newNodes = [];
  const newEdges = [];
  const seenSlotIds = new Set();
  const ROOST_ID = "ghost.slot_activity";

  if (!existingIds.has(ROOST_ID)) {
    const rnode = {
      id: ROOST_ID, layer: roostLayer, subgroup: "ghost",
      kind: "ghost-roost",
      label: "slot 7d activity",
      status: "ghost",
      color: "#a78bfa",
      size: 0.45, tier: 0,
      info: "Per-slot 7-day file-touch heat map — selecting two slots surfaces overlap (peer-claim hazard zone)",
    };
    if (roostParent) rnode.parent = roostParent;
    newNodes.push(rnode);
    seenSlotIds.add(ROOST_ID);
    stats.parentCreated = true;
  }

  for (const slot of slotNames) {
    stats.slotsScanned++;
    const commits = Array.isArray(slotCommits[slot]) ? slotCommits[slot] : null;
    if (!commits || commits.length === 0) continue;

    // Aggregate per-dir touches for THIS slot.
    const dirHits = new Map(); // fs.deep.<id> -> { count, lastSha }
    let slotCommitCount = 0;
    let slotTouchCount = 0;
    let slotResolved = 0;
    let slotUnresolved = 0;
    for (const c of commits) {
      slotCommitCount++;
      stats.commitsScanned++;
      const sha = typeof c.sha === "string" ? c.sha : "";
      const files = Array.isArray(c.files) ? c.files : [];
      for (const f of files) {
        slotTouchCount++;
        stats.touchesScanned++;
        const fsId = resolveFsNodeId(f, existingIds);
        if (!fsId) { slotUnresolved++; stats.touchesUnresolved++; continue; }
        slotResolved++;
        stats.touchesResolved++;
        const prev = dirHits.get(fsId);
        if (prev) {
          prev.count++;
          // last-touch sha wins (commits arrive newest-first from git log).
          // Keep the FIRST sha seen for this dir (newest at top of git-log output).
          if (!prev.lastSha) prev.lastSha = sha;
        } else {
          dirHits.set(fsId, { count: 1, lastSha: sha });
        }
      }
    }

    if (dirHits.size === 0) continue;

    const slotId = `slot.activity.${slot}`;
    if (existingIds.has(slotId)) continue; // already merged in prior regen
    if (seenSlotIds.has(slotId)) continue;
    seenSlotIds.add(slotId);

    newNodes.push({
      id: slotId, layer: slotLayer, subgroup: "slot-activity",
      parent: ROOST_ID,
      kind: "slot-activity-node",
      label: `${slot.toUpperCase()} — ${dirHits.size} dir(s) · ${slotResolved} touch(es) · 7d`,
      status: "ghost",
      color: "#3b82f6",
      size: 0.3 + Math.min(0.25, Math.log10(1 + dirHits.size) * 0.12),
      tier: 0,
      slot,
      commits: slotCommitCount,
      touchesResolved: slotResolved,
      touchesUnresolved: slotUnresolved,
      dirCount: dirHits.size,
      info: `[${slot}] 7d activity · ${slotCommitCount} commit(s) · ${slotTouchCount} touch(es) (${slotResolved} resolved → fs.deep.*; ${slotUnresolved} ancestor-miss)`,
    });
    stats.slotsEmitted++;
    stats.byCount[slot] = dirHits.size;

    // Deterministic edge order: sort by fsId so re-runs produce identical JSON.
    const sortedHits = [...dirHits.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    for (const [fsId, hit] of sortedHits) {
      const intensity = Math.max(0.05, Math.min(0.5, Math.log10(1 + hit.count) * 0.1));
      newEdges.push({
        from: slotId, to: fsId,
        type: "touched-fs",
        status: "active",
        intensity,
        count: hit.count,
        lastSha: hit.lastSha || null,
      });
      stats.edgesEmitted++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    newNodes,
    newEdges,
    stats,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────
// Gated so a test can `import` the exports without triggering a git subprocess
// or a 405 MB graph load.
const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  // SLOT_NAMES authoritative source: chat-slots.mjs (per [[feedback_fleet_design_10_chats]]).
  // Resolve dynamically so a future expansion 26→N+ picks up automatically.
  const slotsHelperUrl = new URL("../.claude/helpers/chat-slots.mjs", import.meta.url).href;
  const { SLOT_NAMES } = await import(slotsHelperUrl);
  if (!Array.isArray(SLOT_NAMES) || SLOT_NAMES.length === 0) {
    console.error("ERROR: SLOT_NAMES import from chat-slots.mjs is missing or empty");
    process.exit(2);
  }

  // Load graph for existingIds lookup.
  if (!fs.existsSync(GRAPH_PATH)) {
    console.error(`ERROR: ${GRAPH_PATH} missing — run scripts/regen-viz.mjs first`);
    process.exit(2);
  }
  let graph;
  try { graph = readGraphStreaming(GRAPH_PATH); } // streaming read — see scripts/lib/graph-io.mjs
  catch (e) { console.error(`ERROR: graph parse: ${e.message}`); process.exit(2); }

  // Per-slot git log (--since=7d, slot-tagged commits).
  // Format: %x01<sha>%x02<subject>%x01<files...>%x01 (control-char delim).
  const slotCommits = {};
  const SINCE = "7 days ago";
  const GIT_TIMEOUT_MS = 30000;
  for (const slot of SLOT_NAMES) {
    let raw = "";
    try {
      raw = execFileSync("git", [
        "log",
        `--since=${SINCE}`,
        `--grep=slot:${slot}`,
        "-i",
        "--pretty=format:%x01%H%x02%s",
        "--name-only",
      ], { cwd: ROOT, encoding: "utf8", timeout: GIT_TIMEOUT_MS, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    } catch {
      raw = "";
    }
    const commits = [];
    // Split on \x01 — each non-empty chunk is "<sha>\x02<subject>\n<file>\n<file>..."
    const chunks = raw.split("\x01").filter((c) => c.length > 0);
    for (const chunk of chunks) {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const headParts = lines[0].split("\x02");
      const sha = headParts[0] || "";
      if (!sha) continue;
      const files = lines.slice(1);
      commits.push({ sha, files });
    }
    if (commits.length > 0) slotCommits[slot] = commits;
  }

  const result = generate({ graph, slotCommits, slotNames: [...SLOT_NAMES] });
  const outPath = path.join(VIZ_DIR, "slot-touch-augmentation.json");
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
  if (result.error) {
    console.log(`  error: ${result.error}`);
  } else {
    console.log(`  slots scanned:       ${result.stats.slotsScanned}`);
    console.log(`  slots emitted:       ${result.stats.slotsEmitted}`);
    console.log(`  commits scanned:     ${result.stats.commitsScanned}`);
    console.log(`  touches scanned:     ${result.stats.touchesScanned}`);
    console.log(`  touches resolved:    ${result.stats.touchesResolved}`);
    console.log(`  touches unresolved:  ${result.stats.touchesUnresolved}`);
    console.log(`  edges emitted:       ${result.stats.edgesEmitted}`);
    console.log(`  parent created:      ${result.stats.parentCreated}`);
    console.log(`  per-slot dir count:  ${JSON.stringify(result.stats.byCount)}`);
  }
}
