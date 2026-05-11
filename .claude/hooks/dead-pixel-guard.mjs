#!/usr/bin/env node
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
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PRISM_ROOT = "H:/prism";
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");

const MAX_PAGES_SHOWN = 5;

function emit(line) {
  // SessionStart hook output convention: print plain text.
  process.stdout.write(line);
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    emit("dead-pixel-guard: system-graph.json missing — run `/system-viz` to refresh");
    process.exit(0);
  }
  let G;
  try {
    G = JSON.parse(readFileSync(GRAPH_PATH, "utf8"));
  } catch {
    emit("dead-pixel-guard: graph parse failed — soft-skip");
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
