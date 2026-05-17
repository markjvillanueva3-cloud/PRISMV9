// bootstrap-golf.mjs regression suite — CLEANUP-MS0/U-CLEANUP-A6
//
// Run: "H:/.claude/bin/portable-node" --test H:/prism/.claude/helpers/bootstrap-golf.test.mjs
//
// Uses node:test (NOT vitest) per CLAUDE.md HOOK-SYNERGY-MS0 note that
// .claude/helpers/ vitest config is broken; node:test runs hermetically.
//
// Coverage:
//   1. Schema shape lock for each empty-shell function (downstream consumers
//      assume these field names; a rename here breaks G11 / token-budget
//      runtime / golf-cron-scheduler — must fail loud on drift).
//   2. REQUIRED_GITIGNORE_ENTRIES stability (entries are documented in
//      .gitignore lines 130-135 since 2026-05-13 — a reorder is fine, a
//      content change is the failure we want to surface).
//   3. .allowlistRegex of empty owned-paths shell genuinely matches NOTHING
//      (the empty-shell MUST NOT inadvertently allow any path).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  emptyOwnedPathsShell,
  emptyTokenBudgetShell,
  emptyCronRegistryShell,
  REQUIRED_GITIGNORE_ENTRIES,
} from "./bootstrap-golf.mjs";

// ── Schema shapes ────────────────────────────────────────────────────────────

test("emptyOwnedPathsShell — required fields with correct types", () => {
  const o = emptyOwnedPathsShell("2026-01-01T00:00:00.000Z");
  assert.equal(o.schemaVersion, 1);
  assert.equal(o.generatedAt, "2026-01-01T00:00:00.000Z");
  assert.match(o.generator, /bootstrap-golf\.mjs/);
  assert.ok(Array.isArray(o.ownedPaths));
  assert.equal(o.ownedPaths.length, 0);
  assert.equal(typeof o.allowlistRegex, "string");
  assert.ok(Array.isArray(o.discoveredDashboards));
});

test("emptyOwnedPathsShell.allowlistRegex matches NO real paths", () => {
  const o = emptyOwnedPathsShell();
  const re = new RegExp(o.allowlistRegex);
  // A populated regex would match these. The empty shell must reject all.
  for (const candidate of [
    "state/shared/dashboards/foo.md",
    "state/shared/AGENT_CHAT.jsonl",
    "state/shared/golf-owned-paths.json",
    "/etc/passwd",
    "any-path-at-all",
    "",
  ]) {
    assert.equal(re.test(candidate), false, `empty shell allowlist must reject: ${candidate || "<empty>"}`);
  }
});

test("emptyTokenBudgetShell — capacity 800000, consumed 0, day pristine", () => {
  const t = emptyTokenBudgetShell();
  assert.equal(t.schemaVersion, 1);
  assert.equal(t.dayKeyUTC, null);
  assert.equal(t.consumed, 0);
  assert.equal(t.capacity, 800000);
  assert.equal(t.lastReset, null);
  assert.equal(t.resetTimezone, "UTC");
});

test("emptyCronRegistryShell — required fields with empty crons[]", () => {
  const c = emptyCronRegistryShell("2026-01-01T00:00:00.000Z");
  assert.equal(c.schemaVersion, 1);
  assert.equal(c.generatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(c.lockfileDir, ".cron-locks");
  assert.equal(c.timeBasis, "UTC");
  assert.ok(typeof c.notes === "string" && c.notes.length > 0);
  assert.ok(Array.isArray(c.crons));
  assert.equal(c.crons.length, 0);
});

// ── .gitignore entry stability ───────────────────────────────────────────────

test("REQUIRED_GITIGNORE_ENTRIES — 6 stable entries; rebuilds + locks + watchdog + token budget", () => {
  // The Set comparison surfaces both missing-from-required and unexpected-additions.
  // If A6 ever needs a new ignored path, this test fails loud — author updates both.
  const expected = new Set([
    "state/shared/coordination.db",
    "state/shared/coordination.db-wal",
    "state/shared/coordination.db-shm",
    "state/shared/.cron-locks/*.lock",
    "state/shared/.watchdog-last-poll.iso",
    "state/shared/golf-token-budget.json",
  ]);
  const actual = new Set(REQUIRED_GITIGNORE_ENTRIES);
  assert.equal(actual.size, expected.size, "entry count drifted");
  for (const e of expected) assert.ok(actual.has(e), `missing required entry: ${e}`);
  for (const a of actual) assert.ok(expected.has(a), `unexpected new entry: ${a}`);
});

// ── Determinism (same nowIso → same JSON) ────────────────────────────────────

test("emptyOwnedPathsShell — deterministic for fixed nowIso", () => {
  const a = emptyOwnedPathsShell("2026-05-17T00:00:00.000Z");
  const b = emptyOwnedPathsShell("2026-05-17T00:00:00.000Z");
  assert.deepEqual(a, b);
});

test("emptyCronRegistryShell — deterministic for fixed nowIso", () => {
  const a = emptyCronRegistryShell("2026-05-17T00:00:00.000Z");
  const b = emptyCronRegistryShell("2026-05-17T00:00:00.000Z");
  assert.deepEqual(a, b);
});
