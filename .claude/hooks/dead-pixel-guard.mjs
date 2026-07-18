#!/usr/bin/env node
// tier: T4
/**
 * dead-pixel-guard.mjs (SessionStart advisory hook)
 *
 * Surfaces frontend "dead pixel" candidates from the live system-viz graph
 * so every chat opens with awareness of any L1 page that lacks inbound
 * dispatcher/transport edges (the "page exists but does nothing" failure
 * mode flagged in CLAUDE-BRIEF).
 *
 * Output: one-line summary on stdout (consumed by the additionalContext
 * surface). Soft-fails silently if the graph is missing or unparseable —
 * SessionStart must never block on this hook.
 *
 * Wiring: add to `H:/.claude/settings.json` SessionStart array, e.g.
 *   { type: "command", command: "node H:/prism/.claude/hooks/dead-pixel-guard.mjs" }
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { readGraphStreaming } from "../../scripts/lib/graph-io.mjs";

const PRISM_ROOT = "H:/prism";
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");

const MAX_PAGES_SHOWN = 5;
// Largest graph this SessionStart hook will parse in-process. Above this the
// full parse risks an OOM under the ~384MB portable-node hook-heap cap, so the
// hook soft-skips rather than crash. [[windows-commit-reservation-hook-heap]]
const MAX_GRAPH_BYTES = 150 * 1024 * 1024;

function emit(line) {
  // SessionStart hook output convention: print plain text.
  process.stdout.write(line);
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    emit("dead-pixel-guard: system-graph.json missing — run `/system-viz` to refresh");
    process.exit(0);
  }
  // Size-gate BEFORE reading: the merged graph (~875MB) blows both the V8 512MiB
  // string cap (old raw utf8 parse) AND the ~384MB hook heap. Soft-skip a too-big
  // graph rather than crash/OOM -- a full-graph dead-pixel sweep belongs in a
  // script, not a SessionStart hook. [[windows-commit-reservation-hook-heap]]
  let sizeBytes = 0;
  try { sizeBytes = statSync(GRAPH_PATH).size; } catch { /* fall through to read */ }
  if (sizeBytes > MAX_GRAPH_BYTES) {
    emit(
      `dead-pixel-guard: graph ${Math.round(sizeBytes / 1048576)}MB exceeds the ` +
        `${Math.round(MAX_GRAPH_BYTES / 1048576)}MB hook-parse ceiling -- soft-skip ` +
        `(run the system-viz dead-pixel sweep script for a full-graph pass)`
    );
    process.exit(0);
  }
  let G;
  try {
    // Cap-safe Buffer-incremental read -- never materializes the graph as one
    // utf8 string, so it cannot hit the V8 512MiB string-cap crash class.
    G = readGraphStreaming(GRAPH_PATH);
  } catch {
    emit("dead-pixel-guard: graph parse failed -- soft-skip");
    process.exit(0);
  }
  const inDegree = new Map();
  for (const e of G.edges || []) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }
  const pages = (G.nodes || []).filter((n) => n.layer === "L1" && (n.kind === "page" || n.subgroup === "page"));
  const deadPixels = pages.filter((p) => (inDegree.get(p.id) || 0) === 0);
  if (deadPixels.length === 0) {
    emit(`✓ dead-pixel-guard: 0 / ${pages.length} L1 pages flagged (all have inbound edges)`);
    process.exit(0);
  }
  const samples = deadPixels.slice(0, MAX_PAGES_SHOWN).map((p) => p.label || p.id).join(", ");
  emit(
    `⚠ dead-pixel-guard: ${deadPixels.length} / ${pages.length} L1 pages have no inbound edges — ` +
      `samples: ${samples}${deadPixels.length > MAX_PAGES_SHOWN ? ` (+${deadPixels.length - MAX_PAGES_SHOWN} more)` : ""}. ` +
      `See knowledge/wiki/architecture/frontends/page/ for per-page detail.`
  );
}

main();
