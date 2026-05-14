#!/usr/bin/env node
/**
 * generate-untracked-files-atomic.mjs — surface every untracked source file
 * under mcp-server/{src,web/src} as its own node in the system-viz graph.
 *
 * Per user directive 2026-05-14: "/system-viz is the live indexer and
 * visualizer for every bit of data contained in the H drive which is the
 * PRISM Obsidian OS" — untracked files are data too, and an operator must
 * be able to navigate them in the 3D viz alongside everything else.
 *
 * Source of truth: scripts/audit-untracked-refs.mjs --json (re-run live each
 * regen so the layer always reflects the CURRENT untracked surface — after a
 * restoration commit the count drops; after new uncommitted Codex work it
 * rises). The generator spawns the audit rather than reading a stale JSON so
 * the viz never shows yesterday's untracked set.
 *
 * Emitted hierarchy (3 levels):
 *   untracked                          (L0 root rollup)
 *   └─ untracked.<classification>      (L1 — keep | test | ambiguous | orphan)
 *      └─ untracked.file.<slug>        (L11 — one per file, full metadata)
 *
 * Each file node carries: classification, loc, bytes, valueScore,
 * inboundTracked, inboundUntracked, outbound, entryPointType, lastGitCommit,
 * lastDeletionCommit, mtimeIso — the same schema as untracked-files.json so
 * the HUD can render the per-file dossier inline.
 *
 * Edges:
 *   - root → classification rollup     (contains, intensity 0.3)
 *   - classification rollup → file     (contains, intensity 0.25)
 *
 * Import edges (untracked-file → tracked importer) are intentionally NOT
 * emitted here — mapping a file path to its graph node id is fragile across
 * the atomic generators; the inboundTracked count + sampleImporters in the
 * node payload give the operator the linkage without the edge-id guessing.
 *
 * Output: state/shared/system-viz/untracked-files-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const AUDIT_SCRIPT = path.join(ROOT, "scripts", "audit-untracked-refs.mjs");
const OUT_PATH = path.join(VIZ_DIR, "untracked-files-augmentation.json");

// classification → hue (matches the PRISM status palette: cyan=info,
// emerald=success/keep, violet=pending, amber=warning, red=error/orphan)
const CLASS_HUE = {
  KEEP: "#34d399",       // emerald — system imports it, restore-safe
  TEST: "#06b6d4",       // cyan — test surface
  AMBIGUOUS: "#a855f7",  // violet — transitive dep, needs context
  ORPHAN: "#f59e0b",     // amber — no inbound, review candidate
};

const CLASS_ORDER = ["KEEP", "TEST", "AMBIGUOUS", "ORPHAN"];

function slugify(p) {
  return p.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function loadAudit() {
  // Spawn the audit in --json mode. If it fails we still emit a well-formed
  // (empty) augmentation so the merge step + regen pipeline never break.
  try {
    const out = execFileSync(
      process.execPath,
      [AUDIT_SCRIPT, "--json"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    return JSON.parse(out);
  } catch (e) {
    process.stderr.write(`[untracked-viz] audit spawn failed: ${e.message}\n`);
    return null;
  }
}

function generate() {
  const audit = loadAudit();
  if (!audit) {
    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      error: "audit-spawn-failed",
      newNodes: [],
      newEdges: [],
      stats: {},
    };
  }

  // The audit JSON shape: { summary, KEEP[], TEST[], AMBIGUOUS[], ORPHAN[] }
  // Each row already carries the per-file metadata we want on the node.
  const buckets = {
    KEEP: audit.KEEP ?? [],
    TEST: audit.TEST ?? [],
    AMBIGUOUS: audit.AMBIGUOUS ?? [],
    ORPHAN: audit.ORPHAN ?? [],
  };

  const newNodes = [];
  const newEdges = [];
  const seenEdge = new Set();
  const stats = { total: 0, perClass: {} };

  function pushEdge(from, to, type, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status: "active", intensity });
  }

  // L0 root rollup
  const rootId = "untracked";
  newNodes.push({
    id: rootId,
    layer: "L0",
    subgroup: "untracked-root",
    label: "Untracked Files",
    color: "#94a3b8",
    status: "info",
    size: 1.0,
    tier: 0,
    desc: "Source files on disk under mcp-server/{src,web/src} that git does not track. Live-indexed by scripts/audit-untracked-refs.mjs.",
  });

  for (const cls of CLASS_ORDER) {
    const rows = buckets[cls];
    const classId = `untracked.${cls.toLowerCase()}`;
    const hue = CLASS_HUE[cls];
    // L1 classification rollup
    newNodes.push({
      id: classId,
      layer: "L1",
      subgroup: "untracked-class",
      parent: rootId,
      label: `${cls} (${rows.length})`,
      color: hue,
      status: cls === "ORPHAN" ? "stub" : "built",
      size: 0.6 + Math.min(0.35, Math.log10(1 + rows.length) * 0.18),
      tier: 1,
      classification: cls,
      fileCount: rows.length,
    });
    pushEdge(rootId, classId, "contains", 0.30);
    stats.perClass[cls] = rows.length;

    for (const r of rows) {
      const fileId = `untracked.file.${slugify(r.file)}`;
      const loc = r.loc ?? 0;
      newNodes.push({
        id: fileId,
        layer: "L11",
        subgroup: "untracked-file",
        parent: classId,
        label: r.file.split("/").pop(),
        color: hue,
        status: cls === "KEEP" || cls === "TEST" ? "built" : (cls === "ORPHAN" ? "stub" : "beta"),
        size: 0.25 + Math.min(0.45, Math.log10(1 + loc) * 0.12),
        tier: 4,
        file: r.file,
        classification: cls,
        loc,
        bytes: r.bytes ?? 0,
        mtimeIso: r.mtimeIso ?? null,
        valueScore: r.valueScore ?? 0,
        inboundTracked: r.inboundTracked ?? 0,
        inboundUntracked: r.inboundUntracked ?? 0,
        outbound: r.outbound ?? 0,
        entryPointType: r.entryPointType ?? null,
        lastGitCommit: r.lastGitCommit ?? null,
        lastDeletionCommit: r.lastDeletionCommit ?? null,
        sampleImporters: r.sampleImporters ?? [],
      });
      pushEdge(classId, fileId, "contains", 0.25);
      stats.total++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "scripts/audit-untracked-refs.mjs --json",
    roots: audit.summary?.roots ?? ["mcp-server/src", "mcp-server/web/src"],
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
fs.mkdirSync(VIZ_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
console.log(`wrote ${OUT_PATH}`);
if (result.error) {
  console.log(`  error: ${result.error}`);
} else {
  console.log(`  untracked file nodes: ${result.stats.total}`);
  for (const cls of CLASS_ORDER) {
    console.log(`    ${cls.padEnd(10)} ${result.stats.perClass[cls] ?? 0}`);
  }
  console.log(`  total nodes: ${result.newNodes.length}  edges: ${result.newEdges.length}`);
}
