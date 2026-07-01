// R9 coverage for the stop_on_failing_tests HARD-BLOCK Stop gate.
// First-ever tests for this safety-critical fail-closed gate (TEST-INTEGRITY,
// slot:alpha 2026-06-24). Verifies the pure helpers the main-guard now exposes:
//   - normalizeReport: vitest + legacy + garbage report shapes
//   - isFresh: fresh / stale / missing timestamp
//   - pickStaleTestFromStatus: the stale-GREEN decision, PINNING the intentional
//     fail-safe over-block (tracked-modified AND untracked-peer tests both block;
//     non-test + older files do not). A future "fix" that exempts untracked files
//     to reduce cross-tree friction would FLIP a pin red -- by design.
// Run: node .claude/hooks/__tests__/stop_on_failing_tests.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReport, isFresh, pickStaleTestFromStatus, isInVitestScope, collectStaleTestsFromStatus, pickOwnStaleTest } from "../stop_on_failing_tests.mjs";

// ---- normalizeReport ----
test("normalizeReport: vitest green shape", () => {
  const t = 1_700_000_000_000;
  const r = normalizeReport({ numTotalTests: 100, numPassedTests: 100, numFailedTests: 0, endTime: t, success: true });
  assert.equal(r.failing, 0);
  assert.equal(r.passing, 100);
  assert.equal(r.total, 100);
  assert.equal(r.success, true);
  assert.equal(r.ts_ms, t);
});

test("normalizeReport: vitest red shape -> failing>0, success:false", () => {
  const r = normalizeReport({ numTotalTests: 100, numPassedTests: 95, numFailedTests: 5, startTime: 42, success: false });
  assert.equal(r.failing, 5);
  assert.equal(r.passing, 95);
  assert.equal(r.success, false);
  assert.equal(r.ts_ms, 42); // falls back to startTime when endTime absent
});

test("normalizeReport: legacy shape with ISO timestamp", () => {
  const r = normalizeReport({ failing: 0, passing: 50, total: 50, timestamp: "2026-06-24T00:00:00.000Z" });
  assert.equal(r.failing, 0);
  assert.equal(r.passing, 50);
  assert.equal(r.total, 50);
  assert.equal(r.success, true); // legacy success derived from failing===0
  assert.equal(r.ts_ms, Date.parse("2026-06-24T00:00:00.000Z"));
});

test("normalizeReport: garbage report -> ts_ms null, NaN counts (caller's finite-checks catch)", () => {
  const r = normalizeReport({});
  assert.equal(r.ts_ms, null);
  assert.ok(Number.isNaN(r.passing));
  assert.ok(Number.isNaN(r.total));
});

test("normalizeReport: preserves hookError sentinel (both shapes)", () => {
  assert.equal(normalizeReport({ numTotalTests: 1, _hookError: "boom" }).hookError, "boom");
  assert.equal(normalizeReport({ failing: 0, _hookError: "boom" }).hookError, "boom");
});

// ---- isFresh ----
test("isFresh: now is fresh; long-ago is stale; null/0 ts are stale (fail-closed)", () => {
  assert.equal(isFresh({ ts_ms: Date.now() }), true);
  assert.equal(isFresh({ ts_ms: Date.now() - 100 * 60 * 60 * 1000 }), false); // 100h ago, beyond any sane MAX_AGE
  assert.equal(isFresh({ ts_ms: null }), false);
  assert.equal(isFresh({ ts_ms: 0 }), false);
});

// ---- pickStaleTestFromStatus (the stale-GREEN decision) ----
const REPORT = 10_000;          // report timestamp
const NEWER = 20_000;           // mtime clearly past report+slack
const OLDER = 2_000;            // mtime before report

test("BLOCK: tracked-modified test newer than report is flagged", () => {
  const out = " M mcp-server/src/__tests__/Foo.test.ts";
  assert.equal(pickStaleTestFromStatus(out, REPORT, () => NEWER), "mcp-server/src/__tests__/Foo.test.ts");
});

test("FAIL-SAFE PIN: an UNTRACKED (??) test newer than report STILL blocks (a slot's own new failing test must not slip through)", () => {
  // The pure fn blocks on ANY newer test in its input -- correct: a slot's OWN
  // brand-new untracked test could be failing and must not slip through.
  // The known concurrent-fleet THRASH (a PEER slot's untracked test blocking THIS
  // slot's Stop -- ref memory reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24)
  // is fixed at the CALLER layer, by scoping which files reach this fn to the
  // current slot's own changes (per-slot report shard / session-file attribution) --
  // NOT by exempting '??' here. So this pin stays valid through that infra-lane fix.
  const out = "?? mcp-server/src/__tests__/PeerCreated.test.ts";
  assert.equal(pickStaleTestFromStatus(out, REPORT, () => NEWER), "mcp-server/src/__tests__/PeerCreated.test.ts");
});

test("NO BLOCK: a non-test file newer than report is ignored", () => {
  assert.equal(pickStaleTestFromStatus(" M mcp-server/src/index.ts", REPORT, () => NEWER), null);
});

test("NO BLOCK: a test OLDER than the report is not stale", () => {
  assert.equal(pickStaleTestFromStatus(" M mcp-server/a/Foo.test.ts", REPORT, () => OLDER), null);
});

test("write-race slack: mtime within REPORT_WRITE_SLACK_MS of report is tolerated (no block)", () => {
  // default slack is 1000ms; report+500 must NOT block
  assert.equal(pickStaleTestFromStatus(" M mcp-server/a/Foo.test.ts", REPORT, () => REPORT + 500), null);
  // report+2000 (> slack) DOES block
  assert.equal(pickStaleTestFromStatus(" M mcp-server/a/Foo.test.ts", REPORT, () => REPORT + 2000), "mcp-server/a/Foo.test.ts");
});

test("returns the FIRST stale test when several files changed (older one skipped)", () => {
  const out = " M mcp-server/a/Older.test.ts\n M mcp-server/b/Newer.spec.ts";
  const mt = (rel) => (rel === "mcp-server/a/Older.test.ts" ? OLDER : NEWER);
  assert.equal(pickStaleTestFromStatus(out, REPORT, mt), "mcp-server/b/Newer.spec.ts");
});

test(".spec. and mjs/tsx test extensions are recognized", () => {
  assert.equal(pickStaleTestFromStatus(" M mcp-server/a/X.spec.tsx", REPORT, () => NEWER), "mcp-server/a/X.spec.tsx");
  assert.equal(pickStaleTestFromStatus(" M mcp-server/a/Y.test.mjs", REPORT, () => NEWER), "mcp-server/a/Y.test.mjs");
});

test("git-quoted path (spaces) is unquoted before lookup", () => {
  const out = '?? "mcp-server/a/b c/Spaced.test.ts"';
  let lookedUp = null;
  const mt = (rel) => { lookedUp = rel; return NEWER; };
  assert.equal(pickStaleTestFromStatus(out, REPORT, mt), "mcp-server/a/b c/Spaced.test.ts");
  assert.equal(lookedUp, "mcp-server/a/b c/Spaced.test.ts"); // resolver received the UNQUOTED path
});

test("stat failure (deleted/renamed mid-scan) is skipped, not thrown", () => {
  const out = " M mcp-server/a/Gone.test.ts";
  assert.equal(pickStaleTestFromStatus(out, REPORT, () => { throw new Error("ENOENT"); }), null);
});

// ---- VITEST-SCOPE GUARD (papa, fixes the node:test false-positive in the concurrent-fleet thrash) ----
test("isInVitestScope: only mcp-server/ paths are in the vitest report's scope", () => {
  assert.equal(isInVitestScope("mcp-server/src/__tests__/Foo.test.ts"), true);
  assert.equal(isInVitestScope("scripts/embed-pdf-tribal-tips-into-index.test.mjs"), false); // node:test, repo-root
  assert.equal(isInVitestScope(".claude/hooks/__tests__/stop_on_failing_tests.test.mjs"), false); // node:test
  assert.equal(isInVitestScope("mcp-server\\src\\__tests__\\Bar.test.ts"), true); // backslash normalized
});
test("NO BLOCK: a repo-root scripts/*.test.mjs (node:test, NOT in vitest) does not stale the vitest report", () => {
  // THE FIX: my own scripts/extract-catalog-cutting-params.test.mjs edit must not block on the vitest gate.
  assert.equal(pickStaleTestFromStatus(" M scripts/extract-catalog-cutting-params.test.mjs", REPORT, () => NEWER), null);
  assert.equal(pickStaleTestFromStatus("?? scripts/embed-pdf-tribal-tips-into-index.test.mjs", REPORT, () => NEWER), null);
});
test("BLOCK still fires for a real mcp-server vitest test edited after the report (protection intact)", () => {
  assert.equal(pickStaleTestFromStatus(" M mcp-server/src/__tests__/Real.test.ts", REPORT, () => NEWER), "mcp-server/src/__tests__/Real.test.ts");
});

test("empty / null porcelain output -> null", () => {
  assert.equal(pickStaleTestFromStatus("", REPORT, () => NEWER), null);
  assert.equal(pickStaleTestFromStatus(null, REPORT, () => NEWER), null);
  assert.equal(pickStaleTestFromStatus(undefined, REPORT, () => NEWER), null);
});

test("guard: reportMs of 0 / null disables the check (returns null)", () => {
  assert.equal(pickStaleTestFromStatus(" M a/Foo.test.ts", 0, () => NEWER), null);
  assert.equal(pickStaleTestFromStatus(" M a/Foo.test.ts", null, () => NEWER), null);
});

// ---- collectStaleTestsFromStatus (array form -- feeds the session-attribution layer) ----
test("collectStaleTestsFromStatus returns ALL stale tests (not just the first)", () => {
  const out = " M mcp-server/a/One.test.ts\n M mcp-server/b/Two.spec.ts\n M mcp-server/c/Three.test.ts";
  assert.deepEqual(collectStaleTestsFromStatus(out, REPORT, () => NEWER), [
    "mcp-server/a/One.test.ts", "mcp-server/b/Two.spec.ts", "mcp-server/c/Three.test.ts",
  ]);
});
test("collectStaleTestsFromStatus excludes older + out-of-scope files; first element == pickStaleTestFromStatus", () => {
  const out = " M scripts/Node.test.mjs\n M mcp-server/a/Old.test.ts\n M mcp-server/b/New.test.ts";
  const mt = (rel) => (rel === "mcp-server/a/Old.test.ts" ? OLDER : NEWER);
  const all = collectStaleTestsFromStatus(out, REPORT, mt);
  assert.deepEqual(all, ["mcp-server/b/New.test.ts"]); // scripts/ out-of-scope, Old too old
  assert.equal(pickStaleTestFromStatus(out, REPORT, mt), all[0], "first-match contract intact after refactor");
});

// ---- pickOwnStaleTest (SESSION ATTRIBUTION -- the concurrent-fleet thrash fix) ----
const OWN_LINE = (p) => JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Edit", input: { file_path: p } }] } });

test("THRASH FIX: a PEER's stale test (NOT in this session's transcript) -> NO block (null)", () => {
  // This is THE bug: a peer edited RFQToOrderOrchestratorEngine.test.ts; my transcript only shows
  // a scripts/ edit. The candidate must be filtered out -> my innocent Stop is no longer blocked.
  const candidates = ["mcp-server/src/__tests__/RFQToOrderOrchestratorEngine.test.ts"];
  const myTranscript = OWN_LINE("H:/prism/scripts/extract-catalog-cutting-params.mjs");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), null);
});
test("PROTECTION INTACT: a stale test THIS session edited STILL blocks", () => {
  const candidates = ["mcp-server/src/__tests__/Mine.test.ts"];
  const myTranscript = OWN_LINE("H:\\prism\\mcp-server\\src\\__tests__\\Mine.test.ts");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), "mcp-server/src/__tests__/Mine.test.ts");
});
test("worktree edit attributes to a main-tree git-status candidate (cross-tree match)", () => {
  const candidates = ["mcp-server/a/W.test.ts"];
  const myTranscript = OWN_LINE("H:/prism-slot-papa/mcp-server/a/W.test.ts");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), "mcp-server/a/W.test.ts");
});
test("NEVER-UNDER-BLOCK: unreadable transcript (null/empty) -> conservative fallback (block candidate[0])", () => {
  const candidates = ["mcp-server/a/X.test.ts", "mcp-server/b/Y.test.ts"];
  assert.equal(pickOwnStaleTest(candidates, null), "mcp-server/a/X.test.ts");
  assert.equal(pickOwnStaleTest(candidates, ""), "mcp-server/a/X.test.ts");
});
test("readable transcript with NO edits (session edited nothing) -> no block (null)", () => {
  // A valid, non-empty transcript that contains zero edit tool_use blocks: the session is
  // provably not the author of any stale test -> trust it, do NOT block.
  const candidates = ["mcp-server/a/Peer.test.ts"];
  const noEdits = JSON.stringify({ type: "user", message: { role: "user", content: "hello" } });
  assert.equal(pickOwnStaleTest(candidates, noEdits), null);
});
test("empty candidate list -> null regardless of transcript", () => {
  assert.equal(pickOwnStaleTest([], OWN_LINE("mcp-server/a/Z.test.ts")), null);
  assert.equal(pickOwnStaleTest([], null), null);
});
test("multi-candidate mix: only the OWN one blocks, peer ones drop", () => {
  const candidates = ["mcp-server/a/Peer1.test.ts", "mcp-server/b/Mine.test.ts", "mcp-server/c/Peer2.test.ts"];
  const myTranscript = OWN_LINE("H:/prism/mcp-server/b/Mine.test.ts");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), "mcp-server/b/Mine.test.ts");
});

// ---- git RENAME/COPY decomposition (adversarial-review P1: composite "old -> new" under-block) ----
test("RENAME line decomposes to the DESTINATION path (not the composite 'old -> new')", () => {
  const out = "R  mcp-server/a/Old.test.ts -> mcp-server/b/New.test.ts";
  assert.deepEqual(collectStaleTestsFromStatus(out, REPORT, () => NEWER), ["mcp-server/b/New.test.ts"]);
});
test("quoted RENAME destination (spaces) is unquoted to the destination path", () => {
  const out = 'R  "mcp-server/a/Old Name.test.ts" -> "mcp-server/b/New Name.test.ts"';
  assert.deepEqual(collectStaleTestsFromStatus(out, REPORT, () => NEWER), ["mcp-server/b/New Name.test.ts"]);
});
test("RENAME protection intact: a session that WROTE the rename destination still BLOCKS (no under-block)", () => {
  // The P1 the adversarial review caught: pre-fix the composite candidate never matched the
  // session's transcript edit -> null -> a renaming session slipped a stale-green report through.
  const candidates = collectStaleTestsFromStatus("R  mcp-server/a/Old.test.ts -> mcp-server/b/New.test.ts", REPORT, () => NEWER);
  const myTranscript = OWN_LINE("H:/prism/mcp-server/b/New.test.ts");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), "mcp-server/b/New.test.ts");
});
test("RENAME thrash-fix: a PEER's rename destination (not in my transcript) -> no block", () => {
  const candidates = collectStaleTestsFromStatus("R  mcp-server/a/Old.test.ts -> mcp-server/b/Peer.test.ts", REPORT, () => NEWER);
  const myTranscript = OWN_LINE("H:/prism/scripts/unrelated.mjs");
  assert.equal(pickOwnStaleTest(candidates, myTranscript), null);
});
test("read-only session (transcript has only Bash/Read tool_use, no edits) -> no block (full call stack)", () => {
  // Defends the never-re-block invariant against a regression that adds a non-edit tool to
  // EDIT_TOOL_NAMES: a session that only ran Bash/Read is provably not the author of any test.
  const candidates = ["mcp-server/a/Peer.test.ts"];
  const readOnly = [
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Bash", input: { command: "git status" } }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Read", input: { file_path: "mcp-server/a/Peer.test.ts" } }] } }),
  ].join("\n");
  assert.equal(pickOwnStaleTest(candidates, readOnly), null);
});
