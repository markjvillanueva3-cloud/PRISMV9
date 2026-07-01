#!/usr/bin/env node
/**
 * migrate-posttool-edit-bundle.mjs — one-shot, idempotent settings.json migration.
 *
 * Wires the new posttool-edit-bundle.mjs: the 18 PostToolUse Edit|Write|MultiEdit
 * sub-hooks + the lone Write|Edit|MultiEdit recall-counter-track entry are switched
 * to `exit 0` shell no-ops (≈20ms each, no node cold-start) and one bundle entry
 * is APPENDED that runs all 19 at concurrency 6 — so a single Edit/Write tool call
 * cold-starts ~7 node processes instead of ~22, ×6 chats = ~42 instead of ~132,
 * which is the difference between the Windows process table being fine and thrashing.
 *
 * Add-only invariant: total hook count goes 140 → 141 (one bundle entry added; the
 * 19 command-value changes don't change the count) — so settings-json-addonly-guard
 * permits this even though it semantically *consolidates*.
 *
 * IDEMPOTENT: re-running aborts cleanly if already migrated (0 sub-hooks left to
 * no-op, or the bundle group already present).
 *
 * Targets the C: settings.json (the live one; c-to-h-mirror replicates to H:).
 * Backs up first; restores + aborts on any validation failure.
 *
 * Usage: node migrate-posttool-edit-bundle.mjs            (apply)
 *        node migrate-posttool-edit-bundle.mjs --dry-run  (show plan, don't write)
 *        node migrate-posttool-edit-bundle.mjs --revert <backup-path>
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const SETTINGS = "C:/Users/Mark Villanueva/.claude/settings.json";
const NOOP_CMD = "exit 0";
const BUNDLE_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/posttool-edit-bundle.mjs';
const BUNDLE_TIMEOUT = 15000;
const BUNDLE_MATCHER = "Edit|Write|MultiEdit";

// The 19 script basenames the bundle absorbs (must match posttool-edit-bundle.mjs's SUB_HOOKS).
const ABSORBED = new Set([
  "directive-summary-refresh-iooms.mjs", "inventory-on-write.mjs", "c-to-h-mirror.mjs",
  "edit-multiedit-suggest.mjs", "auto-lint-post-edit.mjs", "build-cache-manager.mjs",
  "build-tracker.mjs", "dispatcher-import-validator.mjs", "jm-die-provenance-guard.mjs",
  "ingestion-cache-root-guard.mjs", "physics-canonical-constants-guard.mjs", "token-economy-hook.mjs",
  "write-tracker.mjs", "write-import-check.mjs", "edit-batch-detector.mjs",
  "memory-mirror-to-vault.mjs", "tribal-autowire.mjs", "unified-edit-tap.mjs",
  "recall-counter-track.mjs",
]);
// Matcher groups that hold those 19 entries.
const ABSORBED_MATCHERS = new Set(["Edit|Write|MultiEdit", "Write|Edit|MultiEdit"]);

function totalHooks(s) {
  let n = 0;
  for (const ev of Object.values(s.hooks || {})) if (Array.isArray(ev)) for (const g of ev) n += (g.hooks || []).length;
  return n;
}
function refsAbsorbed(cmd) {
  const m = String(cmd || "").match(/([\w.-]+\.mjs)/g);
  return m ? m.some((b) => ABSORBED.has(b)) : false;
}
function bundleAlreadyPresent(s) {
  for (const g of s.hooks?.PostToolUse || []) {
    if (g.matcher === BUNDLE_MATCHER && (g.hooks || []).some((h) => String(h.command || "").includes("posttool-edit-bundle.mjs"))) return true;
  }
  return false;
}

const args = process.argv.slice(2);
if (args[0] === "--revert") {
  const bak = args[1];
  if (!bak || !existsSync(bak)) { console.error("revert: backup path missing/not found"); process.exit(1); }
  copyFileSync(bak, SETTINGS);
  console.log(`reverted ${SETTINGS} ← ${bak}`);
  process.exit(0);
}
const DRY = args.includes("--dry-run");

const raw = readFileSync(SETTINGS, "utf-8");
let s;
try { s = JSON.parse(raw); } catch (e) { console.error("settings.json does not parse — aborting:", e.message); process.exit(1); }

const before = totalHooks(s);
if (bundleAlreadyPresent(s)) { console.log(`ALREADY MIGRATED (posttool-edit-bundle entry present). Hooks=${before}. No change.`); process.exit(0); }

// No-op the 19 absorbed entries.
let changed = 0;
const changedNames = [];
for (const g of s.hooks?.PostToolUse || []) {
  if (!ABSORBED_MATCHERS.has(g.matcher)) continue;
  for (const h of g.hooks || []) {
    if (refsAbsorbed(h.command)) {
      changedNames.push((String(h.command).match(/([\w.-]+\.mjs)/) || [, "?"])[1]);
      if (!DRY) { h.command = NOOP_CMD; delete h.timeout; }
      changed++;
    }
  }
}
if (changed !== 19) { console.error(`Expected to no-op exactly 19 sub-hook entries, found ${changed} (${changedNames.join(", ")}) — settings.json layout has drifted. Aborting (no write).`); process.exit(1); }

// Append the bundle group.
if (!DRY) {
  s.hooks.PostToolUse.push({ matcher: BUNDLE_MATCHER, hooks: [{ type: "command", command: BUNDLE_CMD, timeout: BUNDLE_TIMEOUT }] });
}
const after = DRY ? before + 1 : totalHooks(s);
if (after !== before + 1) { console.error(`Hook count sanity failed: ${before} → ${after} (expected +1). Aborting.`); process.exit(1); }

if (DRY) {
  console.log(`[DRY RUN] would no-op 19 entries: ${changedNames.join(", ")}`);
  console.log(`[DRY RUN] would append PostToolUse group {matcher:"${BUNDLE_MATCHER}", hooks:[posttool-edit-bundle.mjs t=${BUNDLE_TIMEOUT}]}`);
  console.log(`[DRY RUN] hook count ${before} → ${after}`);
  process.exit(0);
}

const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
const bak = `${SETTINGS}.bak-posttoolbundle-${ts}`;
copyFileSync(SETTINGS, bak);
writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + "\n", "utf-8");

// Validate the written file.
try {
  const reparsed = JSON.parse(readFileSync(SETTINGS, "utf-8"));
  const n = totalHooks(reparsed);
  if (n !== before + 1) throw new Error(`post-write hook count ${n} != ${before + 1}`);
  if (!bundleAlreadyPresent(reparsed)) throw new Error("post-write: bundle entry not found");
} catch (e) {
  copyFileSync(bak, SETTINGS);
  console.error(`POST-WRITE VALIDATION FAILED (${e.message}) — restored from ${bak}. Aborted.`);
  process.exit(1);
}

console.log(`MIGRATED. Hooks ${before} → ${after}. No-op'd 19, appended posttool-edit-bundle.mjs group. Backup: ${bak}`);
console.log(`Revert: node ${import.meta.dirname}/migrate-posttool-edit-bundle.mjs --revert "${bak}"`);
