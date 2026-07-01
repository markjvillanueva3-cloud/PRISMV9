#!/usr/bin/env node
/**
 * One-shot bulk mechanical edit script for U-CK11 Phase 2B+2C.
 * Phase 2B: templatize hardcoded counts that rot daily.
 * Phase 2C: drop hardcoded H:/prism/ paths from commands that EXECUTE the path
 *           (slot-worktree-portability — paths break in H:/prism-slot-<nato>).
 *
 * Each edit is idempotent: re-running after the patterns are gone is a no-op.
 * Run from repo root: node scripts/u-ck11-phase2bc-edits.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const edits = [
  // ── Phase 2C — slot-worktree-portability path fixes ────────────────────
  { file: ".claude/commands/rgs-sync.md",
    from: /H:\\prism\\\.claude\\helpers\\roadmap-sync\.mjs/g,
    to:   ".claude/helpers/roadmap-sync.mjs" },

  { file: ".claude/commands/forge-audit.md",
    from: /node H:\/prism\/\.claude\/scripts\//g,
    to:   "node .claude/scripts/" },

  { file: ".claude/commands/forge-audit.md",
    from: /node H:\/prism\/scripts\//g,
    to:   "node scripts/" },

  { file: ".claude/commands/forge-audit.md",
    from: /Then read `H:\/prism\/PRISM-INVENTORY-LATEST\.md`/g,
    to:   "Then read `PRISM-INVENTORY-LATEST.md`" },

  { file: ".claude/commands/close-out.md",
    from: /node H:\/prism\/scripts\/close-out-milestone\.mjs/g,
    to:   "node scripts/close-out-milestone.mjs" },

  { file: ".claude/commands/big-blob-hunt.md",
    from: /git -C H:\/prism /g,
    to:   "git " },

  { file: ".claude/commands/envelope-sync.md",
    from: /require\("H:\/prism\/state\/shared\/MILESTONE_PROGRESS\.json"\)/g,
    to:   'require("./state/shared/MILESTONE_PROGRESS.json")' },

  { file: ".claude/commands/dedup.md",
    from: /H:\/prism\/mcp-server\/data\/docs\/ENGINE_DIGEST\.md/g,
    to:   "mcp-server/data/docs/ENGINE_DIGEST.md" },

  // ── Phase 2B — count templating (rot-prone baked counts) ────────────────
  { file: ".claude/commands/continue-roadmap.md",
    from: /79 dispatchers, 3,310\+ actions/g,
    to:   "all dispatchers + actions (live count from PRISM-INVENTORY-LATEST.md)" },

  { file: ".claude/commands/generate-roadmap.md",
    from: /79 dispatchers, 3,310\+ actions/g,
    to:   "live counts from PRISM-INVENTORY-LATEST.md" },

  { file: ".claude/commands/rgs.md",
    from: /Search 576\+ MCP actions/g,
    to:   "Search the full MCP action surface" },

  { file: ".claude/commands/rgs.md",
    from: /the MCP server's full 576\+ actions/g,
    to:   "the MCP server's full action surface (live count: PRISM-INVENTORY-LATEST.md)" },

  { file: ".claude/commands/rgs.md",
    from: /Discover all 79 dispatchers, 3,310\+ actions \(live count\)/g,
    to:   "Discover all dispatchers + actions (live count via PRISM-INVENTORY-LATEST.md)" },

  { file: ".claude/commands/rgs.md",
    from: /ENGINE_DIGEST\.md \(1,304\+ engines\), DISPATCHER_DIGEST\.md \(79 dispatchers\)/g,
    to:   "ENGINE_DIGEST.md (engines), DISPATCHER_DIGEST.md (dispatchers) — live counts in PRISM-INVENTORY-LATEST.md" },
];

let total = 0;
const stats = {};
const misses = [];
for (const e of edits) {
  if (!existsSync(e.file)) {
    misses.push({ file: e.file, reason: "file-missing" });
    continue;
  }
  const before = readFileSync(e.file, "utf8");
  const matches = (before.match(e.from) || []).length;
  if (matches === 0) {
    misses.push({ file: e.file, reason: "no-match", pattern: e.from.source.slice(0, 60) });
    continue;
  }
  const after = before.replace(e.from, e.to);
  writeFileSync(e.file, after);
  stats[e.file] = (stats[e.file] || 0) + matches;
  total += matches;
}
console.log(`[u-ck11-phase2bc] total replacements: ${total}`);
for (const [f, n] of Object.entries(stats)) console.log(`  ${f}: ${n}`);
if (misses.length) {
  console.log("[u-ck11-phase2bc] misses (idempotent re-run OK):");
  for (const m of misses) console.log(`  ${m.file} — ${m.reason}${m.pattern ? " (pattern: " + m.pattern + ")" : ""}`);
}
