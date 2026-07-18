#!/usr/bin/env node
// apply-harness-optimization.mjs -- HARNESS-EFFICIENCY-MS0 Phase 1 transform (2026-07-02).
//
// Applies the curated change set from state/shared/specs/HOOK-WIRING-DEDUP-2026-07-02.md:
//   A. TIMEOUTS: settings hook "timeout" is SECONDS per Claude Code docs, but every value
//      in this fleet was written as MILLISECONDS (~1000x intent; a hung hook stalls its
//      event for the 600s default instead of 2-10s). Convert v -> max(3, ceil(v/1000)).
//   B. DOUBLE-RUNS: remove standalone wires of hooks that ALSO run inside a wired bundle
//      (verified against the bundles' real SUB_HOOKS lists, not comment mentions).
//   C. TOMBSTONES: remove `node -e "/* comment */ exit 0"` entries that spawn a process
//      per event only to exit.
// Every removal is coverage-proven: the same hook file still runs via a bundle or a
// surviving wire. Hook FILES on disk are never touched (never-delete-only-disable).
//
// Safety: timestamped backup checkpoints; fail-loud spec matching (exact counts);
// invariant verification (no env/plugin/top-level key loss, coverage resolution);
// explicit C: -> H:/.claude mirror copy + byte verify (the c-to-h-mirror hook only
// fires on Edit/Write TOOL calls, not scripted writes).
//
// Modes: --dry-run (default) prints the plan; --apply writes.

import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const USER_C = "C:/Users/wompu/.claude/settings.json";
const MIRROR_H = "H:/.claude/settings.json";
const PROJECT = "H:/prism/.claude/settings.json";
const BUNDLES_DIR = "H:/prism/.claude/hooks/bundles";
const STAMP = "2026-07-02-pre-harness-opt";
const MIN_TIMEOUT_S = 3;      // floor: measured warm hook runtimes are 0.3-0.9s; cold multi-chat spawns need margin
const MAX_TIMEOUT_S = 200;    // sanity ceiling post-conversion (largest intended budget is 130s)
const DEFAULT_TIMEOUT_S = 10; // entries with no timeout inherited the 600s default; pin a sane budget

// ---------------- curated removal spec ----------------
// base = script basename to remove; kind:"tombstone" removes node -e entries.
// matcher must match the group's matcher EXACTLY (undefined = any group in event).
// expect = exact number of entries this row must remove across the file (fail loud otherwise).
const REMOVALS = {
  userC: [
    { event: "Stop", base: "stop-consensus-drain.mjs", expect: 1, coveredBy: "stop-bundle.mjs" },
    // no matcher constraint: this row's group is the one MATCHER_WIDEN just renamed (base is unique in the event)
    { event: "PreToolUse", base: "auto-consensus-critical-edit.mjs", expect: 1, coveredBy: "edit-bundle.mjs" },
    { event: "PreToolUse", matcher: "Edit|Write|MultiEdit|NotebookEdit", base: "main-tree-write-block.mjs", expect: 1, coveredBy: "edit-bundle.mjs (matcher widened to NotebookEdit in this same transform)" },
    { event: "UserPromptSubmit", base: "sierra-graph-health-inject.mjs", expect: 1, coveredBy: "ups-domain-bundle.mjs" },
    { event: "PostToolUse", kind: "tombstone", expect: 1, coveredBy: "n/a (no-op spawn)" },
  ],
  project: [
    ...["stop-auto-wire.mjs", "stop-consensus-drain.mjs", "output-cache-capture.mjs", "roadmap-checkpoint.mjs",
        "session-end-peer-share.mjs", "duplication-guard-stop.mjs", "stop-mark-completed-tasks.mjs",
        "claim-registry-release.mjs", "stop-obsidian-memory-extract.mjs", "session-consolidate-graph.mjs",
        "stop_close_prism_nodes_v2.mjs"].map((b) => ({ event: "Stop", base: b, expect: 1, coveredBy: "stop-bundle.mjs" })),
    ...["stop_on_orphan_children.mjs", "stop_on_c_drive_write.mjs", "stop_on_unwired_assets.mjs",
        "stop_on_skill_unwired.mjs", "stop_on_failing_tests.mjs", "stop_on_build_error.mjs",
        "stop_on_duplicate_created.mjs", "stop_on_svi_regression.mjs", "stop_on_broken_imports.mjs",
        "stop_on_hook_unregistration.mjs"].map((b) => ({ event: "Stop", base: b, expect: 1, coveredBy: "stop-regression-bundle.mjs" })),
    { event: "Stop", base: "git-sync-stop.mjs", expect: 1, coveredBy: "userC direct Stop wire (async-enqueue copy double-runs it)" },
    { event: "Stop", kind: "tombstone", expect: 1, coveredBy: "n/a (no-op spawn)" },
    ...["code-completeness-gate.mjs", "settings-json-addonly-guard.mjs", "master-index-search-gate.mjs",
        "test-coverage-enforcer.mjs", "test-legitimacy.mjs", "api-contract-enforcer.mjs",
        "anti-pattern-detector.mjs", "asset-deletion-block.mjs"].map((b) => (
        { event: "PreToolUse", matcher: "^(Edit|Write|MultiEdit|NotebookEdit)$", base: b, expect: 1, coveredBy: "edit-bundle.mjs" })),
    { event: "PreToolUse", matcher: "Glob|Grep", base: "search-optimizer.mjs", expect: 1, coveredBy: "grep-glob-bundle.mjs" },
    { event: "PreToolUse", matcher: "Glob|Grep", base: "grep-index-first.mjs", expect: 1, coveredBy: "grep-glob-bundle.mjs" },
    { event: "PreToolUse", matcher: "Glob", base: "glob-narrow-path.mjs", expect: 1, coveredBy: "grep-glob-bundle.mjs" },
    ...["directive-summary-refresh-iooms.mjs", "inventory-on-write.mjs", "c-to-h-mirror.mjs",
        "edit-multiedit-suggest.mjs", "auto-lint-post-edit.mjs", "dispatcher-import-validator.mjs",
        "jm-die-provenance-guard.mjs", "ingestion-cache-root-guard.mjs", "physics-canonical-constants-guard.mjs",
        "write-tracker.mjs", "write-import-check.mjs", "edit-batch-detector.mjs", "memory-mirror-to-vault.mjs",
        "tribal-autowire.mjs", "unified-edit-tap.mjs"].map((b) => (
        { event: "PostToolUse", matcher: "Edit|Write|MultiEdit", base: b, expect: 1, coveredBy: "posttool-edit-bundle.mjs" })),
    { event: "PostToolUse", matcher: "Write|Edit|MultiEdit", base: "recall-counter-track.mjs", expect: 1, coveredBy: "posttool-edit-bundle.mjs" },
    ...["posttooluse-compressor.mjs", "dsl-output-compressor.mjs", "loop-detector.mjs", "tsc-error-dedup.mjs",
        "context-pressure-tracker.mjs", "git-output-condenser.mjs", "vitest-output-condenser.mjs",
        "npm-output-condenser.mjs", "path-shortener.mjs", "context-economy-v2.mjs",
        "posttool-error-explain.mjs"].map((b) => (
        { event: "PostToolUse", matcher: "Bash", base: b, expect: 1, coveredBy: "posttool-bash-read-bundle.mjs" })),
    { event: "PostToolUse", kind: "tombstone", expect: 7, coveredBy: "n/a (no-op spawns; the 4 TIER3d-retired hooks actually LIVE inside posttool-bash-read-bundle)" },
  ],
};

// widen the C: edit-bundle group matcher so main-tree-write-block's NotebookEdit coverage survives
const MATCHER_WIDEN = { file: "userC", event: "PreToolUse", from: "Edit|Write|MultiEdit", mustContain: "bundles/edit-bundle.mjs", to: "Edit|Write|MultiEdit|NotebookEdit" };

// ---------------- helpers ----------------
function tokenize(cmd) {
  const toks = [];
  for (const m of String(cmd).matchAll(/"([^"]*)"|(\S+)/g)) toks.push(m[1] ?? m[2]);
  return toks;
}

function normBase(cmd) {
  let s = String(cmd || "").trim();
  while (/^[A-Z_][A-Z0-9_]*=\S+\s+/.test(s)) s = s.replace(/^[A-Z_][A-Z0-9_]*=\S+\s+/, "");
  const toks = tokenize(s);
  let i = 0;
  const r0 = (toks[0] || "").toLowerCase();
  if (r0.endsWith("portable-node") || r0 === "node" || r0.endsWith("/node.exe")) i = 1;
  if (toks[i] === "-e") return { kind: "tombstone", base: null };
  const p = (toks[i] || "").replace(/\\/g, "/");
  let base = p ? p.slice(p.lastIndexOf("/") + 1).toLowerCase() : null;
  // async-hook-enqueue wraps a real hook: the wrapped target is the identity
  if (base === "async-hook-enqueue.mjs") {
    const hi = toks.indexOf("--hook");
    if (hi > -1 && toks[hi + 1]) {
      const t = toks[hi + 1].replace(/\\/g, "/");
      base = t.slice(t.lastIndexOf("/") + 1).toLowerCase();
    }
  }
  return { kind: "script", base };
}

// real SUB_HOOKS members only: lines that declare a path property (never comment mentions)
function realBundleMembers() {
  const members = new Set();
  for (const bf of readdirSync(BUNDLES_DIR).filter((f) => f.endsWith(".mjs") && f !== "smoke-test.mjs")) {
    const src = readFileSync(path.join(BUNDLES_DIR, bf), "utf-8");
    for (const line of src.split("\n")) {
      const m = line.match(/^\s*\{?\s*"?path"?\s*:\s*[`"']([^`"']+\.mjs)/);
      if (m) members.add(m[1].replace(/\\/g, "/").split("/").pop().toLowerCase());
    }
  }
  return members;
}

function forEachHookEntry(settings, fn) {
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const list = group?.hooks;
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) fn({ event, group, list, i, entry: list[i] });
    }
  }
}

function countHooks(settings) {
  let n = 0;
  forEachHookEntry(settings, () => n++);
  return n;
}

function applyRemovals(settings, spec, fileLabel, log) {
  let removedTotal = 0;
  for (const row of spec) {
    let removed = 0;
    for (const [event, groups] of Object.entries(settings.hooks || {})) {
      if (event !== row.event || !Array.isArray(groups)) continue;
      for (const group of groups) {
        if (row.matcher !== undefined && (group?.matcher ?? "") !== row.matcher) continue;
        const list = group?.hooks;
        if (!Array.isArray(list)) continue;
        for (let i = list.length - 1; i >= 0; i--) {
          const n = normBase(list[i]?.command);
          const hit = row.kind === "tombstone" ? n.kind === "tombstone" : n.base === row.base;
          if (hit) { list.splice(i, 1); removed++; }
        }
      }
    }
    if (removed !== row.expect) {
      throw new Error(`SPEC MISMATCH [${fileLabel}] ${row.event}/${row.matcher ?? "*"}/${row.base ?? "tombstone"}: expected ${row.expect}, matched ${removed} -- aborting (no partial writes)`);
    }
    removedTotal += removed;
    log.push(`removed ${removed}x ${row.base ?? "tombstone"} (${row.event}) -- covered by ${row.coveredBy}`);
  }
  return removedTotal;
}

function recalibrateTimeouts(settings) {
  let converted = 0, defaulted = 0;
  forEachHookEntry(settings, ({ entry }) => {
    if (typeof entry.timeout === "number") {
      if (entry.timeout >= 500) { entry.timeout = Math.max(MIN_TIMEOUT_S, Math.ceil(entry.timeout / 1000)); converted++; }
      // values < 500 are assumed already-seconds (none exist pre-transform; guard for reruns)
    } else if (entry.command) {
      entry.timeout = DEFAULT_TIMEOUT_S; defaulted++;
    }
  });
  return { converted, defaulted };
}

function verifyInvariants(before, after, fileLabel, expectedRemovals, bundleMembers, otherLayerAfter) {
  const errs = [];
  const bCount = countHooks(before), aCount = countHooks(after);
  if (bCount - aCount !== expectedRemovals) errs.push(`hook count delta ${bCount - aCount} != expected ${expectedRemovals}`);
  for (const k of Object.keys(before)) if (!(k in after)) errs.push(`top-level key lost: ${k}`);
  for (const k of Object.keys(before.env || {})) if ((after.env || {})[k] === undefined) errs.push(`env key lost: ${k}`);
  for (const k of Object.keys(before.enabledPlugins || {})) if (!(k in (after.enabledPlugins || {}))) errs.push(`plugin key lost: ${k}`);
  // coverage: every hook base present BEFORE must still resolve to a bundle member or a surviving wire in either layer
  const surviving = new Set();
  for (const s of [after, otherLayerAfter]) if (s) forEachHookEntry(s, ({ entry }) => { const n = normBase(entry.command); if (n.base) surviving.add(n.base); });
  forEachHookEntry(before, ({ entry }) => {
    const n = normBase(entry.command);
    if (!n.base) return;
    if (!surviving.has(n.base) && !bundleMembers.has(n.base)) errs.push(`coverage lost for removed hook: ${n.base}`);
  });
  forEachHookEntry(after, ({ entry, event }) => {
    if (typeof entry.timeout === "number" && (entry.timeout < 1 || entry.timeout > MAX_TIMEOUT_S)) {
      errs.push(`suspect timeout ${entry.timeout}s on ${event}:${normBase(entry.command).base}`);
    }
  });
  if (errs.length) throw new Error(`INVARIANT FAIL [${fileLabel}]:\n  - ` + errs.join("\n  - "));
}

function perEventCounts(settings) {
  const out = {};
  forEachHookEntry(settings, ({ event }) => { out[event] = (out[event] || 0) + 1; });
  return out;
}

// ---------------- main ----------------
function main() {
  const files = { userC: USER_C, project: PROJECT };
  const originals = {}, transformed = {}, logs = { userC: [], project: [] };
  for (const [label, file] of Object.entries(files)) {
    originals[label] = JSON.parse(readFileSync(file, "utf-8"));
    transformed[label] = JSON.parse(readFileSync(file, "utf-8"));
  }
  const bundleMembers = realBundleMembers();

  // matcher widen first, so main-tree-write-block's coverage proof holds at verify time
  {
    const s = transformed[MATCHER_WIDEN.file];
    const groups = s.hooks?.[MATCHER_WIDEN.event] || [];
    const g = groups.find((gr) => (gr?.matcher ?? "") === MATCHER_WIDEN.from &&
      (gr?.hooks || []).some((h) => String(h.command).includes(MATCHER_WIDEN.mustContain)));
    if (!g) throw new Error("MATCHER_WIDEN target group not found -- aborting");
    g.matcher = MATCHER_WIDEN.to;
    logs[MATCHER_WIDEN.file].push(`widened matcher '${MATCHER_WIDEN.from}' -> '${MATCHER_WIDEN.to}' (edit-bundle group; preserves NotebookEdit coverage)`);
  }

  const removedCounts = {};
  for (const label of ["userC", "project"]) {
    removedCounts[label] = applyRemovals(transformed[label], REMOVALS[label], label, logs[label]);
    const t = recalibrateTimeouts(transformed[label]);
    logs[label].push(`timeouts: ${t.converted} converted ms->s (max(${MIN_TIMEOUT_S}, ceil(v/1000))), ${t.defaulted} missing -> ${DEFAULT_TIMEOUT_S}s explicit`);
  }
  for (const label of ["userC", "project"]) {
    verifyInvariants(originals[label], transformed[label], label, removedCounts[label], bundleMembers,
      transformed[label === "userC" ? "project" : "userC"]);
  }

  const report = {
    apply: APPLY,
    removed: removedCounts,
    perEventBefore: { userC: perEventCounts(originals.userC), project: perEventCounts(originals.project) },
    perEventAfter: { userC: perEventCounts(transformed.userC), project: perEventCounts(transformed.project) },
    logs,
  };

  if (APPLY) {
    for (const [label, file] of Object.entries(files)) {
      // never clobber a pristine pre-transform checkpoint on rerun (scrutiny arm-A P2)
      if (!existsSync(`${file}.checkpoint-${STAMP}.json`)) copyFileSync(file, `${file}.checkpoint-${STAMP}.json`);
      writeFileSync(file, JSON.stringify(transformed[label], null, 2) + "\n");
      JSON.parse(readFileSync(file, "utf-8")); // parse-back sanity
    }
    // mirror C: -> H:/.claude (scripted writes bypass the c-to-h-mirror PostToolUse hook)
    if (!existsSync(`${MIRROR_H}.checkpoint-${STAMP}.json`)) copyFileSync(MIRROR_H, `${MIRROR_H}.checkpoint-${STAMP}.json`);
    copyFileSync(USER_C, MIRROR_H);
    const same = readFileSync(USER_C, "utf-8") === readFileSync(MIRROR_H, "utf-8");
    if (!same) throw new Error("MIRROR VERIFY FAIL: H:/.claude/settings.json != C: after copy");
    report.mirrorSynced = true;
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
