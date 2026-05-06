/**
 * awareness-hook-audit.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U01
 *
 * Audits the awareness-related hooks at H:/prism/.claude/hooks/ and
 * classifies each as canonical-keep, redundant-archive, or unknown.
 * Produces AWARENESS-HOOK-CONSOLIDATION.md at this worktree's repo root.
 *
 * NON-DESTRUCTIVE: this audit only generates the migration PLAN. The
 * actual move-to-.deprecated/ pass is gated behind --apply (which still
 * stops short of touching canonical files unless --canonical=PATH is
 * explicitly passed). Default behaviour is plan-only — same pattern as
 * P10-U06 (audit.mjs) and P11-U08 (stop-gate-chain) deferred archival.
 *
 * Pure-function exports for tests:
 *   - CANONICAL_AWARENESS_HOOKS  — single source of truth (3 names per spec)
 *   - listAwarenessHooks(dir, fsAdapter)  → string[] of basenames
 *   - classifyHook(basename)              → "canonical" | "redundant" | "unknown"
 *   - buildMigrationPlan(hooks)           → { keep, move, unknown, summary }
 *   - renderMarkdown(plan)                → string
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P10-U01
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CANONICAL HOOK SET (per the milestone exit_condition)
// ---------------------------------------------------------------------------

export const CANONICAL_AWARENESS_HOOKS = new Set([
  "awareness-snapshot.mjs",
  "awareness-bootstrap.mjs",
  "prism-awareness-cache.mjs",
]);

// Hooks whose names suggest awareness work but are NOT in the canonical
// keep-set. The audit will mark these for archival. The list documents
// our intent; the actual list of files to archive comes from the live
// directory walk so we don't false-positive on hooks that don't exist.
const KNOWN_REDUNDANT_PATTERNS = [
  "ai-command-awareness",
  "cross-session-awareness",
  "multi-computer-awareness",
  "multi-session-awareness",
  "prism-awareness-v2",
  "prism-awareness-bundle",
  "prism-self-awareness",
  "self-awareness",
  "tool-awareness",
  "session-awareness",
  "agent-awareness",
  "context-awareness",
  "awareness-precheck",
  "awareness-check",
  "awareness-inject",
];

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

/**
 * List every awareness-related hook under a directory. Returns basenames
 * (no path prefix) of files matching `*awareness*.mjs` (case-insensitive).
 * Tests inject a mock adapter; production uses node:fs.
 */
export function listAwarenessHooks(dir, fsAdapter) {
  const adapter = fsAdapter || fs;
  if (!adapter.existsSync(dir)) return [];
  const entries = adapter.readdirSync(dir);
  return entries
    .filter((n) => typeof n === "string")
    .filter((n) => /awareness/i.test(n))
    .filter((n) => n.endsWith(".mjs"))
    .sort();
}

/**
 * Classify a hook basename.
 *   - "canonical" — in CANONICAL_AWARENESS_HOOKS
 *   - "redundant" — name suggests awareness but isn't canonical
 *   - "unknown"   — name doesn't fit either bucket, OR is a stop_on_*
 *                    gate (those belong to STOP_GATE_LIST in
 *                    stop-gate-chain.mjs and must NOT be archived even
 *                    if their name contains "awareness")
 */
export function classifyHook(basename) {
  if (typeof basename !== "string" || basename.length === 0) return "unknown";
  if (CANONICAL_AWARENESS_HOOKS.has(basename)) return "canonical";
  // Stop event gates own a separate consolidation pass (P11-U08); leave
  // them for operator review even when their name matches /awareness/.
  if (/^stop_on_/i.test(basename)) return "unknown";
  if (/awareness/i.test(basename) && basename.endsWith(".mjs")) return "redundant";
  return "unknown";
}

/**
 * Partition a list of hook basenames into a migration plan.
 */
export function buildMigrationPlan(hooks) {
  const keep = [];
  const move = [];
  const unknown = [];
  if (!Array.isArray(hooks)) {
    return { keep, move, unknown, summary: { total: 0, keepCount: 0, moveCount: 0, unknownCount: 0 } };
  }
  for (const h of hooks) {
    const cls = classifyHook(h);
    if (cls === "canonical") keep.push(h);
    else if (cls === "redundant") move.push(h);
    else unknown.push(h);
  }
  return {
    keep, move, unknown,
    summary: {
      total: hooks.length,
      keepCount: keep.length,
      moveCount: move.length,
      unknownCount: unknown.length,
    },
  };
}

/**
 * Render the migration plan as Markdown.
 */
export function renderMarkdown(plan) {
  const lines = [];
  lines.push("# AWARENESS-HOOK-CONSOLIDATION — Intel-Ollama-Obsidian P10-U01");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total awareness hooks discovered:** ${plan.summary.total}`);
  lines.push(`- **Keep (canonical):** ${plan.summary.keepCount}`);
  lines.push(`- **Archive (redundant):** ${plan.summary.moveCount}`);
  lines.push(`- **Unknown:** ${plan.summary.unknownCount}`);
  lines.push("");
  lines.push("## Canonical (KEEP — wire in settings.json)");
  lines.push("");
  if (plan.keep.length === 0) {
    lines.push("_(none found — verify canonical hooks are present at H:/prism/.claude/hooks/)_");
  } else {
    for (const h of plan.keep) lines.push(`- \`${h}\``);
  }
  lines.push("");
  lines.push("## Redundant (ARCHIVE — move to .deprecated/, do NOT delete)");
  lines.push("");
  if (plan.move.length === 0) {
    lines.push("_(none — directory already consolidated)_");
  } else {
    for (const h of plan.move) lines.push(`- \`${h}\``);
  }
  lines.push("");
  lines.push("## Unknown (REVIEW before action)");
  lines.push("");
  if (plan.unknown.length === 0) {
    lines.push("_(none)_");
  } else {
    for (const h of plan.unknown) lines.push(`- \`${h}\``);
  }
  lines.push("");
  lines.push("## How to apply");
  lines.push("");
  lines.push("This audit is **non-destructive**. To apply the migration:");
  lines.push("");
  lines.push("1. Verify peer chats aren't actively editing canonical hooks");
  lines.push("2. Back up `H:/prism/.claude/hooks/` before any move");
  lines.push("3. For each entry under \"Redundant\" above:");
  lines.push("   - `mv H:/prism/.claude/hooks/<name> H:/prism/.claude/hooks/.deprecated/<name>`");
  lines.push("4. Edit `H:/.claude/settings.json` so SessionStart wires only the");
  lines.push("   3 canonical hooks (awareness-snapshot, awareness-bootstrap,");
  lines.push("   prism-awareness-cache)");
  lines.push("5. Document the change in `MEMORY.md` per spec exit_condition");
  lines.push("");
  lines.push("Re-run `node scripts/awareness-hook-audit.mjs --write` to refresh");
  lines.push("this report after applying.");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// I/O LAYER
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_DEFAULT = path.resolve(HERE, "..");
const CANONICAL_HOOK_DIR = "H:/prism/.claude/hooks";

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const wantWrite = args.includes("--write");
  const dirArg = args.find((a) => a.startsWith("--dir="));
  const dir = dirArg ? dirArg.slice("--dir=".length) : CANONICAL_HOOK_DIR;
  const outArg = args.find((a) => a.startsWith("--out="));
  const outPath = outArg ? outArg.slice("--out=".length) : path.join(REPO_ROOT_DEFAULT, "AWARENESS-HOOK-CONSOLIDATION.md");

  const hooks = listAwarenessHooks(dir);
  const plan = buildMigrationPlan(hooks);

  if (wantJson) {
    process.stdout.write(JSON.stringify(plan, null, 2));
    return 0;
  }
  if (wantWrite) {
    const md = renderMarkdown(plan);
    fs.writeFileSync(outPath, md, "utf8");
    process.stdout.write(`wrote ${outPath} (${md.length} bytes; ${plan.summary.moveCount} hooks queued for archive, ${plan.summary.keepCount} canonical)\n`);
    return 0;
  }
  process.stdout.write(`Awareness hook audit: ${plan.summary.total} found (keep ${plan.summary.keepCount}, archive ${plan.summary.moveCount}, unknown ${plan.summary.unknownCount})\n`);
  process.stdout.write(`Use --write to render AWARENESS-HOOK-CONSOLIDATION.md, --json for raw plan.\n`);
  return 0;
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}

// silence unused-variable lint
void KNOWN_REDUNDANT_PATTERNS;
