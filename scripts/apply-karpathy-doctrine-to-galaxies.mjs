#!/usr/bin/env node
// apply-karpathy-doctrine-to-galaxies.mjs — append a consistent pointer to the
// Karpathy agent-discipline doctrine card into every galaxy brain
// (mcp-server/src/engines/<domain>/MEMORY.md). Operator directive 2026-06-02:
// "apply this to all galaxies" (the two Karpathy framework cards from
// x.com/NainsiDwiv50980/status/2061783825659679047). Full card:
// knowledge/wiki/architecture/karpathy-agent-discipline.md
//
// Idempotent (skip-if-marker-present), additive (append at EOF), deterministic.
// The pointer is DRY by design — full doctrine lives in ONE wiki card; each brain
// carries a lean few-line reference (Photo-2's "stay consistent / don't scatter",
// Photo-1's "Simplicity First / Minimal Impact"). Re-run safely any time a galaxy
// is added.
//
// Usage:
//   node apply-karpathy-doctrine-to-galaxies.mjs            # apply
//   node apply-karpathy-doctrine-to-galaxies.mjs --dry-run  # report only, no writes
//   node apply-karpathy-doctrine-to-galaxies.mjs --root <repoRoot>
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const rootIdx = argv.indexOf("--root");
const ROOT = rootIdx >= 0 ? argv[rootIdx + 1] : join(HERE, "..");
const ENGINES_DIR = join(ROOT, "mcp-server", "src", "engines");

export const MARKER = "## Karpathy agent discipline";

// The consistent pointer block appended to each galaxy brain. Lean by design —
// full doctrine is one [[karpathy-agent-discipline]] hop away.
export const POINTER_BLOCK = `
${MARKER} (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (\`knowledge/wiki/architecture/karpathy-agent-discipline.md\`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._
`;

// Pure: decide the next content for one brain (append block iff marker absent).
export function applyToContent(content) {
  const text = String(content == null ? "" : content);
  if (text.includes(MARKER)) return { changed: false, next: text };
  const sep = text.endsWith("\n") ? "" : "\n";
  return { changed: true, next: text + sep + POINTER_BLOCK };
}

export function listGalaxyBrains(enginesDir, listDir = readdirSync, exists = existsSync) {
  let dirs;
  try {
    dirs = listDir(enginesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  return dirs
    .map((name) => join(enginesDir, name, "MEMORY.md"))
    .filter((p) => exists(p))
    .sort();
}

function main() {
  const brains = listGalaxyBrains(ENGINES_DIR);
  if (!brains.length) {
    console.error(`No galaxy brains found under ${ENGINES_DIR}`);
    process.exit(2);
  }
  const applied = [], skipped = [];
  for (const path of brains) {
    let content = "";
    try { content = readFileSync(path, "utf8"); } catch { continue; }
    const { changed, next } = applyToContent(content);
    const galaxy = path.replace(/\\/g, "/").replace(/.*\/engines\//, "").replace(/\/MEMORY\.md$/, "");
    if (!changed) { skipped.push(galaxy); continue; }
    if (!DRY) writeFileSync(path, next, "utf8");
    applied.push(galaxy);
  }
  console.log(JSON.stringify({
    mode: DRY ? "dry-run" : "applied",
    total: brains.length,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    applied,
    skipped,
  }, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith("apply-karpathy-doctrine-to-galaxies.mjs")) main();
