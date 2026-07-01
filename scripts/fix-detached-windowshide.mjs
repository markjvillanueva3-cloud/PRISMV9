#!/usr/bin/env node
/**
 * fix-detached-windowshide.mjs -- remediation companion to audit-windows-hide.mjs.
 *
 * On Windows, `spawn(..., { detached: true })` WITHOUT `windowsHide: true` opens a
 * VISIBLE console window for the detached child and that window PERSISTS for the
 * life of the child (unlike a sync spawn, which only flashes). Across the
 * interactively-fired hook/helper/script layer (Stop hooks, UserPromptSubmit
 * injectors, autostarts) this manifests as "a bunch of terminal windows opening"
 * during a normal session -- the operator-reported symptom.
 *
 * This script adds `windowsHide: true` to the detached spawn options object at every
 * confirmed popper site. The transform is a guarded, idempotent text replace:
 *   `detached: true`  ->  `detached: true, windowsHide: true`
 * applied ONLY when not already immediately followed by `, windowsHide` (so re-runs
 * are no-ops). It anchors on the `detached: true` literal, NOT a spawn-function name,
 * so it also covers the auditor's blind spots (`_spawn(`, `spawnImpl(`, and options
 * objects whose `detached` falls past the auditor's snippet window).
 *
 * The TARGETS list is an explicit allowlist: every entry was confirmed via
 * `audit-windows-hide.mjs` + an exhaustive grep to (a) contain a real detached
 * spawn in CODE (never a doc comment) and (b) lack windowsHide. Files that set
 * `windowsHide: false` on purpose (cimco/winmax CAM-sim drivers that NEED a visible
 * window) are deliberately excluded.
 *
 * Usage:
 *   node scripts/fix-detached-windowshide.mjs            # dry-run: show what would change
 *   node scripts/fix-detached-windowshide.mjs --apply    # write the changes
 *   node scripts/fix-detached-windowshide.mjs --verify   # exit 1 if any target still bare
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "H:/prism";

// Explicit allowlist of confirmed detached-spawn poppers in the interactive layer.
export const TARGETS = [
  "scripts/system-viz-on-commit.mjs",
  "scripts/self-compact.mjs",
  "scripts/lib/system-viz-graph.mjs",
  ".claude/hooks/awareness-snapshot-inject.mjs",
  ".claude/hooks/cad-coverage-auto-refresh.mjs",
  ".claude/hooks/cag-cold-cache-anchor.mjs",
  ".claude/hooks/directive-summary-refresh.mjs",
  ".claude/hooks/extraction-intake-trigger.mjs",
  ".claude/hooks/injection-budget-snapshot-refresh.mjs",
  ".claude/hooks/obsidian-viz-edge-autosync.mjs",
  ".claude/hooks/prism-http-autostart.mjs",
  ".claude/hooks/stop-auto-wire.mjs",
  ".claude/hooks/stop-brain-refresh.mjs",
  ".claude/hooks/stop-extraction-intake-drain.mjs",
  ".claude/hooks/stop-graph-staleness-backstop.mjs",
  ".claude/hooks/stop-tab-blink.mjs",
  ".claude/hooks/stop-wiki-from-nodes-autopopulate.mjs",
  ".claude/hooks/wiki-precheck-inject.mjs",
  ".claude/helpers/mcp-server-daemon.mjs",
];

// Match `detached: true` (or `detached:true`) NOT already followed by `, windowsHide`.
// The negative lookahead makes the transform idempotent.
const DETACHED_RE = /detached:\s*true(?!\s*,\s*windowsHide)/g;

/**
 * Pure: apply the guarded transform to a source string.
 * Returns { next, count } where count is the number of insertions made.
 */
export function fixSource(text) {
  let count = 0;
  const next = text.replace(DETACHED_RE, (m) => {
    count++;
    return m + ", windowsHide: true";
  });
  return { next, count };
}

/** Pure: count detached spawn sites still lacking windowsHide (for --verify). */
export function countBare(text) {
  const m = text.match(DETACHED_RE);
  return m ? m.length : 0;
}

function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const verify = argv.includes("--verify");

  let totalSites = 0;
  let filesChanged = 0;
  let bareRemaining = 0;
  const report = [];

  for (const rel of TARGETS) {
    const abs = join(ROOT, rel);
    let text;
    try { text = readFileSync(abs, "utf8"); }
    catch (e) { report.push(`  SKIP (read failed): ${rel} -- ${e.message}`); continue; }

    if (verify) {
      const bare = countBare(text);
      bareRemaining += bare;
      if (bare > 0) report.push(`  BARE x${bare}: ${rel}`);
      continue;
    }

    const { next, count } = fixSource(text);
    if (count === 0) { report.push(`  ok (already hidden): ${rel}`); continue; }
    totalSites += count;
    filesChanged++;
    report.push(`  ${apply ? "FIXED" : "would fix"} x${count}: ${rel}`);
    if (apply) writeFileSync(abs, next);
  }

  if (verify) {
    process.stdout.write(`fix-detached-windowshide --verify: ${bareRemaining} bare detached site(s) remaining\n`);
    if (report.length) process.stdout.write(report.join("\n") + "\n");
    process.exit(bareRemaining === 0 ? 0 : 1);
  }

  process.stdout.write(
    `fix-detached-windowshide ${apply ? "(APPLIED)" : "(dry-run)"}: ` +
    `${filesChanged} file(s), ${totalSites} site(s)\n`,
  );
  process.stdout.write(report.join("\n") + "\n");
  if (!apply) process.stdout.write("\nRe-run with --apply to write the changes.\n");
}

// Robust run-as-main detection (Windows `file:///` vs `file://` gotcha): compare
// against pathToFileURL, which always emits the same `file:///<drive>:/...` form
// as import.meta.url. Importing the module (e.g. from the test) leaves main() inert.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
