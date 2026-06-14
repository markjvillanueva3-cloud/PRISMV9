#!/usr/bin/env node
/**
 * remove-dangling-hook-refs.mjs
 *
 * Removes settings.json hook entries whose command points at a hook .mjs file
 * that no longer exists at the referenced path. These produce a
 * "Cannot find module 'H:\\prism\\.claude\\hooks\\<name>.mjs'" error every time
 * the event fires (SessionStart / Stop / UserPromptSubmit).
 *
 * Verified-missing targets (2026-06-08):
 *   - linear-roadmap-sync.mjs   (moved to .claude/hooks/_disabled/, ref never updated)
 *   - supabase-state-sync.mjs   (moved to .claude/hooks/_disabled/, ref never updated)
 *   - stop-mcp-server-heal.mjs  (gone entirely)
 *   - zebra-advisory-inject.mjs (gone entirely)
 *
 * Asset-preservation note (CLAUDE.md "never delete only disable"): the two hooks
 * that still exist live in _disabled/ and are intentionally NOT run; we remove
 * only their DEAD WIRING, not the logic. The other two have no file at all.
 *
 * Edits C: (canonical) only; the c-to-h-mirror hook replicates to H:.
 *
 * Usage:  node scripts/remove-dangling-hook-refs.mjs --dry
 *         node scripts/remove-dangling-hook-refs.mjs --apply
 */
import fs from "node:fs";

const SETTINGS = "C:/Users/wompu/.claude/settings.json";
const TARGETS = [
  "linear-roadmap-sync.mjs",
  "stop-mcp-server-heal.mjs",
  "supabase-state-sync.mjs",
  "zebra-advisory-inject.mjs",
];

const mode = process.argv[2] || "--dry";
const raw = fs.readFileSync(SETTINGS, "utf8");
const s = JSON.parse(raw);

let removed = 0;
const removedList = [];
for (const ev of Object.keys(s.hooks || {})) {
  for (const matcher of s.hooks[ev] || []) {
    if (!Array.isArray(matcher.hooks)) continue;
    const before = matcher.hooks.length;
    matcher.hooks = matcher.hooks.filter((h) => {
      const dead = h.command && TARGETS.some((t) => h.command.includes(t));
      if (dead) removedList.push(`${ev}: ${TARGETS.find((t) => h.command.includes(t))}`);
      return !dead;
    });
    removed += before - matcher.hooks.length;
  }
}

console.log(`dangling hook entries found: ${removed}`);
for (const r of removedList) console.log("  - " + r);

if (mode === "--apply") {
  if (removed === 0) {
    console.log("nothing to remove (already clean).");
    process.exit(0);
  }
  fs.copyFileSync(SETTINGS, SETTINGS + ".bak-dangling-" + Date.now());
  // Preserve 2-space indentation + trailing newline (match the file convention).
  fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + "\n");
  console.log(`APPLIED — removed ${removed} entries from ${SETTINGS} (backup written).`);
} else {
  console.log("(dry run — pass --apply to write)");
}
