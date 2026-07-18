// Real fixture tests for verify-misc-tasks-open (the MISC-TASKS open-status re-verifier).
// R9: the load-bearing oracle is that a GENUINELY-OPEN wire item is NEVER false-closed.
import test from "node:test";
import assert from "node:assert/strict";

import {
  extractCodeAssets,
  extractUnitIds,
  classifyItem,
  verifyAll,
  buildBasenameIndex,
  outputPaths,
  readGitLogSince,
  ROOT,
} from "./verify-misc-tasks-open.mjs";

test("extractCodeAssets: pulls code basenames, drops wire-targets, dedupes", () => {
  const item = {
    title: "Wire action-triple-sync.mjs PreToolUse hook into settings.json",
    evidence: "action-triple-sync.mjs is NOT yet wired into .claude/settings.json; also touches package.json",
  };
  const assets = extractCodeAssets(item);
  assert.deepEqual(assets, ["action-triple-sync.mjs"], "asset extracted once; settings.json + package.json excluded as targets");
});

test("extractCodeAssets: COMPOUND basenames extract WHOLE (the 2026-06-22 false-ABSENT bug)", () => {
  // scrutiny-ledger.test.mjs must NOT degrade to `test.mjs` (which misses the
  // basename index -> false ABSENT -> false-close in the Ollama arm).
  const r1 = extractCodeAssets({ title: "scrutiny-ledger.test.mjs not in vitest glob", evidence: "" });
  assert.deepEqual(r1, ["scrutiny-ledger.test.mjs"], "double-dot basename extracted whole, not 'test.mjs'");
  // Two separate dotted files on one line must yield two matches, not one greedy run.
  const r2 = extractCodeAssets({ title: "wire a.mjs and refresh-lora.test.mjs", evidence: "" });
  assert.deepEqual(r2, ["a.mjs", "refresh-lora.test.mjs"], "two files, two matches (backtracking anchors each ext)");
  // vitest.config.ts now extracts whole -> matches the wire-target set -> excluded
  // (before the fix it degraded to 'config.ts', escaping the TARGET_BASENAMES filter).
  const r3 = extractCodeAssets({ title: "add the test to vitest.config.ts", evidence: "" });
  assert.deepEqual(r3, [], "vitest.config.ts is a wire-target, correctly excluded once extracted whole");
});

test("extractCodeAssets: edge cases -- empty, null, no code paths", () => {
  assert.deepEqual(extractCodeAssets({}), []);
  assert.deepEqual(extractCodeAssets({ title: null, evidence: undefined }), []);
  assert.deepEqual(extractCodeAssets(null), []);
  assert.deepEqual(extractCodeAssets({ title: "prose with no files", evidence: "nothing.here" }), []);
});

test("classifyItem: looks_completed -> likely-closed (extractor already shipped it)", () => {
  const r = classifyItem({ misc_id: "MISC-001", looks_completed: true, title: "x.mjs", evidence: "wire x.mjs" }, { settingsText: "", basenameExists: () => true });
  assert.equal(r.status, "likely-closed");
  assert.equal(r.signal, "looks_completed");
});

test("extractUnitIds: pulls U-XXX and MS#/U-XXX tokens from title+evidence+milestone id", () => {
  const ids = extractUnitIds({ title: "Complete U-CAM-HM-SKILLS-WIRE-01 in CAM-EXHAUST-MS0", evidence: "next is U-PPL-B2", milestone_or_unit_id: "MS-PRINT-LOOP/U-PPL-B2" });
  assert.ok(ids.includes("U-CAM-HM-SKILLS-WIRE-01"), "long U-XXX extracted");
  assert.ok(ids.includes("U-PPL-B2"), "short U-XXX extracted");
  assert.ok(ids.some((i) => i.includes("MS0")), "MS# milestone id extracted");
});

test("classifyItem: shipped-in-git -> likely-closed (unit-id now in a post-scan commit)", () => {
  const item = { misc_id: "MISC-007", title: "Finish U-PPL-B2 turnkey wiring", evidence: "still needs U-PPL-B2" };
  const gitLogText = "abc123 [MAIN] [CAM]/U-PPL-B2 (slot:foxtrot): wire program_optimize\n";
  const r = classifyItem(item, { gitLogText, basenameExists: () => true });
  assert.equal(r.status, "likely-closed");
  assert.equal(r.signal, "shipped-in-git");
  assert.equal(r.asset, "U-PPL-B2");
});

test("classifyItem: shipped-in-git ORACLE -- unit-id absent from git -> stays needs-review (no false-close)", () => {
  const item = { misc_id: "MISC-008", title: "Finish U-NEVER-SHIPPED-99 wiring", evidence: "unwired" };
  const gitLogText = "abc123 [MAIN] [OTHER]/U-DIFFERENT (slot:x): something else\n";
  const r = classifyItem(item, { gitLogText, basenameExists: () => true });
  assert.equal(r.status, "needs-review", "unit-id absent from git -> not closed");
  assert.notEqual(r.signal, "shipped-in-git");
});

test("classifyItem: shipped-in-git ORACLE -- a SHORT id must NOT substring-match a LONGER commit id (3-of-3 P1)", () => {
  // The open item references U-PPL; the log only contains the unrelated longer id U-PPL-B2.
  // A bare gitLogText.includes("U-PPL") would FALSE-CLOSE it (the regression all 3 arms caught);
  // the whole-token matcher (tokenIn) must keep it needs-review.
  const item = { misc_id: "MISC-SUB", title: "Finish U-PPL wiring", evidence: "U-PPL still open" };
  const gitLogText = "abc123 [MAIN] [CAM]/U-PPL-B2 (slot:foxtrot): wire program_optimize\n"; // longer id ONLY
  const r = classifyItem(item, { gitLogText, basenameExists: () => true });
  assert.equal(r.status, "needs-review", "U-PPL must NOT close off the unrelated longer id U-PPL-B2");
  assert.notEqual(r.signal, "shipped-in-git");
});

test("classifyItem: shipped-in-git -- a WHOLE-TOKEN id still closes (recall preserved after the boundary fix)", () => {
  const item = { misc_id: "MISC-WT", title: "Finish U-PPL-B2 wiring", evidence: "U-PPL-B2 pending" };
  const gitLogText = "abc123 [MAIN] [CAM]/U-PPL-B2 (slot:foxtrot): wire program_optimize\n";
  const r = classifyItem(item, { gitLogText, basenameExists: () => true });
  assert.equal(r.status, "likely-closed", "exact whole-token id in the log still closes");
  assert.equal(r.signal, "shipped-in-git");
  assert.equal(r.asset, "U-PPL-B2");
});

test("classifyItem: now-wired -> likely-closed (settings.json references the asset)", () => {
  const item = { misc_id: "MISC-003", title: "Wire action-triple-sync.mjs PreToolUse hook into settings.json", evidence: "hook is NOT yet wired; activation requires adding it" };
  const settingsText = `{"hooks":{"PreToolUse":[{"command":"node .claude/hooks/action-triple-sync.mjs"}]}}`;
  const r = classifyItem(item, { settingsText, basenameExists: () => true });
  assert.equal(r.status, "likely-closed", "settings now references the asset -> the wiring is done");
  assert.equal(r.signal, "now-wired");
  assert.equal(r.asset, "action-triple-sync.mjs");
});

test("classifyItem: ORACLE -- a GENUINELY-OPEN wire item is NEVER false-closed", () => {
  // The wire-hint matches, but settings.json does NOT reference the asset -> still open.
  const item = { misc_id: "MISC-050", title: "Wire never-wired-hook.mjs into settings.json", evidence: "the hook is unwired; integration pending" };
  const settingsText = `{"hooks":{"PreToolUse":[{"command":"node .claude/hooks/some-other-hook.mjs"}]}}`;
  const r = classifyItem(item, { settingsText, basenameExists: () => true });
  assert.equal(r.status, "needs-review", "a wire item whose target lacks the asset must stay open -- never false-closed");
  assert.notEqual(r.signal, "now-wired");
});

test("classifyItem: P2 regression -- a short stem must NOT substring-false-close (cam.ts vs camDispatcher)", () => {
  const item = { misc_id: "MISC-P2", title: "Wire cam.ts into settings.json", evidence: "cam.ts is unwired; integration pending" };
  const settingsText = `{"command":"node mcp-server/src/tools/dispatchers/camDispatcher.ts"}`;
  const r = classifyItem(item, { settingsText, basenameExists: () => true });
  assert.equal(r.status, "needs-review", "stem 'cam' must NOT substring-match 'camDispatcher' -> item stays open");
});

test("classifyItem: stem as a WHOLE TOKEN still closes (recall preserved)", () => {
  const item = { misc_id: "MISC-T", title: "Wire foo-hook.mjs into settings.json", evidence: "unwired" };
  const settingsText = `{"hook":"foo-hook","enabled":true}`; // bare stem as a delimited token
  const r = classifyItem(item, { settingsText, basenameExists: () => true });
  assert.equal(r.status, "likely-closed");
  assert.equal(r.signal, "now-wired");
});

test("classifyItem: stale-reference -> needs-review (asset absent, ambiguous, NOT auto-closed)", () => {
  const item = { misc_id: "MISC-099", title: "Fix deleted-engine.mjs bug", evidence: "deleted-engine.mjs has a divide-by-zero" };
  const r = classifyItem(item, { settingsText: "", basenameExists: () => false });
  assert.equal(r.status, "needs-review", "a missing asset is ambiguous (renamed/removed/never-made) -- never auto-closed");
  assert.equal(r.signal, "stale-reference");
  assert.equal(r.asset, "deleted-engine.mjs");
});

test("classifyItem: no-deterministic-signal -> needs-review (narrative item, asset present)", () => {
  const item = { misc_id: "MISC-120", title: "Improve foo.ts performance", evidence: "foo.ts is slow under load" };
  const r = classifyItem(item, { settingsText: "", basenameExists: () => true });
  assert.equal(r.status, "needs-review");
  assert.equal(r.signal, "no-deterministic-signal");
});

test("classifyItem: adversarial -- empty/no-asset item never throws, stays needs-review", () => {
  const r1 = classifyItem({ misc_id: "MISC-X", title: "", evidence: "" }, {});
  assert.equal(r1.status, "needs-review");
  assert.equal(r1.asset, null);
  const r2 = classifyItem({}, {});
  assert.equal(r2.status, "needs-review");
  assert.equal(r2.misc_id, null);
});

test("verifyAll: aggregates counts + bySignal across a fixture inventory", () => {
  const inventory = {
    generatedAt: "2026-05-16T00:00:00.000Z",
    items: [
      { misc_id: "A", looks_completed: true, title: "a.mjs", evidence: "" },
      { misc_id: "B", title: "Wire b.mjs into settings.json", evidence: "unwired" },     // now-wired
      { misc_id: "C", title: "Wire c.mjs into settings.json", evidence: "unwired" },     // open
      { misc_id: "D", title: "Improve d.ts", evidence: "d.ts slow" },                    // no-signal
    ],
  };
  const report = verifyAll(inventory, { settingsText: "b.mjs", basenames: new Set(["c.mjs", "d.ts"]) });
  assert.equal(report.total, 4);
  assert.equal(report.counts.likelyClosed, 2, "A (looks_completed) + B (now-wired)");
  assert.equal(report.counts.needsReview, 2, "C (open wire) + D (no-signal)");
  assert.equal(report.inventoryGeneratedAt, "2026-05-16T00:00:00.000Z");
  assert.ok(report.bySignal["now-wired"] === 1 && report.bySignal["looks_completed"] === 1);
});

test("verifyAll: empty / malformed inventory -> zero, never throws", () => {
  assert.equal(verifyAll({}, {}).total, 0);
  assert.equal(verifyAll({ items: null }, {}).total, 0);
  assert.equal(verifyAll(null, {}).total, 0);
});

test("buildBasenameIndex: indexes real repo code dirs (this test file is found)", () => {
  const idx = buildBasenameIndex(ROOT);
  assert.ok(idx.has("verify-misc-tasks-open.mjs"), "the verifier itself must be indexed under scripts/");
  assert.ok(idx.size > 100, "the bounded code dirs hold many files");
});

test("readGitLogSince: falsy sinceISO -> '' and run is NEVER invoked (signal no-ops)", () => {
  let called = false;
  const run = () => { called = true; return "should not reach"; };
  assert.equal(readGitLogSince("", "/repo", run), "");
  assert.equal(readGitLogSince(null, "/repo", run), "");
  assert.equal(readGitLogSince(undefined, "/repo", run), "");
  assert.equal(called, false, "no since date -> skip the git call entirely");
});

test("readGitLogSince: passes --since + -C root and returns output; a throwing run -> '' (fail-soft)", () => {
  let seenArgs = null;
  const okRun = (cmd, args) => { seenArgs = args; assert.equal(cmd, "git"); return "commit subjects here"; };
  assert.equal(readGitLogSince("2026-05-16T00:00:00Z", "/repo", okRun), "commit subjects here");
  assert.ok(seenArgs.includes("log"), "invokes git log");
  assert.ok(seenArgs.includes("--since=2026-05-16T00:00:00Z"), "passes the since flag verbatim");
  assert.ok(seenArgs.includes("-C") && seenArgs.includes("/repo"), "scopes to the repo root via -C");
  const throwRun = () => { throw new Error("git not found"); };
  assert.equal(readGitLogSince("2026-05-16T00:00:00Z", "/repo", throwRun), "", "a git failure fails soft to '' (never throws up)");
});

test("outputPaths: dated history carries the tag; LATEST alias is stable (consumer reads one path)", () => {
  const p = outputPaths("/repo", "2026-06-21");
  assert.ok(p.datedJson.endsWith("MISC-TASKS-VERIFIED-2026-06-21.json"), "dated json carries the date tag");
  assert.ok(p.datedMd.endsWith("MISC-TASKS-VERIFIED-2026-06-21.md"), "dated md carries the date tag");
  assert.ok(p.latestJson.endsWith("MISC-TASKS-VERIFIED-LATEST.json"), "LATEST json has NO date -> stable path");
  assert.ok(p.latestMd.endsWith("MISC-TASKS-VERIFIED-LATEST.md"), "LATEST md has NO date -> stable path");
  // The auto-refresh consumer contract: a fixed string with no calendar drift.
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(p.latestMd), "LATEST must never embed a date (else the consumer path drifts)");
  assert.ok(p.datedJson.includes("state/shared/specs") || p.datedJson.includes("state\\shared\\specs"), "lands under specs");
});
