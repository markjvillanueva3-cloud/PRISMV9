// mcp-route-takeup.test.mjs — pure tests for the TOKEN-SAVINGS-PIVOT iter8
// PostToolUse take-rate measurement hook.

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMcpAction, classifiersTakenBy, extractScriptRoute, eligibleClassifiersFor, _SCRIPT_ROUTE_TO_CLASSIFIERS, _recordTakeup } from "../mcp-route-takeup.mjs";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── extractMcpAction ──────────────────────────────────────────────────────

test("extractMcpAction — happy path: mcp__prism_safe__prism_session + action", () => {
  const r = extractMcpAction("mcp__prism_safe__prism_session", { action: "master_index_query" });
  assert.equal(r, "prism_session:master_index_query");
});

test("extractMcpAction — non-mcp tool: returns null", () => {
  assert.equal(extractMcpAction("Grep", { pattern: "x" }), null);
  assert.equal(extractMcpAction("Bash", { command: "ls" }), null);
});

test("extractMcpAction — mcp tool but no action: returns null", () => {
  assert.equal(extractMcpAction("mcp__prism_safe__prism_session", {}), null);
  assert.equal(extractMcpAction("mcp__prism_safe__prism_dev", { foo: "bar" }), null);
});

test("extractMcpAction — non-prism mcp tool: returns null", () => {
  assert.equal(extractMcpAction("mcp__claude_ai_Google_Drive__list_files", { action: "list" }), null);
});

test("extractMcpAction — null/undefined input: returns null defensively", () => {
  assert.equal(extractMcpAction("mcp__prism_safe__prism_session", null), null);
  assert.equal(extractMcpAction("", { action: "x" }), null);
  assert.equal(extractMcpAction(undefined, undefined), null);
});

// ── classifiersTakenBy ─────────────────────────────────────────────────────

test("classifiersTakenBy — happy path: master_index_query within 60s credits isBroadGrep", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234abcd", now);
  assert.deepEqual(taken, ["isBroadGrep"]);
});

test("classifiersTakenBy — fire OUTSIDE the 600s window: no credit", () => {
  // STALE-TEST FIX (2026-06-18, slot:alpha): the window was extended 60s -> 600s
  // (U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND, 2026-05-26) but this test still seeded a
  // 70s-old fire and asserted no-credit -- 70s is now INSIDE the 600s window, so
  // it had been failing pre-existing. Use 700s (genuinely outside 600s).
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 700_000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, []);
});

test("classifiersTakenBy — fire at 120s (inside 600s, outside old 60s) IS credited", () => {
  // Locks the extended 600s window: a take that lands 2 min after the fire --
  // the realistic Pre->Post latency the extension was built for -- must credit.
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 120_000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, ["isBroadGrep"]);
});

test("classifiersTakenBy — different sessionId: no credit (cross-session leakage prevented)", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "ses99999", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, []);
});

test("classifiersTakenBy — action does not match any classifier: no credit", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isLargeWrite"] },
    ],
  };
  // master_index_query maps to isBroadGrep/isLargeRead/isBroadGlob — not isLargeWrite.
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, []);
});

test("classifiersTakenBy — multiple recent fires: returns dedupe set", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(),  sessionId: "sess1234", classifiers: ["isBroadGrep"] },
      { ts: new Date(now - 10000).toISOString(), sessionId: "sess1234", classifiers: ["isLargeRead"] },
      { ts: new Date(now - 15000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] }, // dup
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.equal(taken.length, 2);
  assert.ok(taken.includes("isBroadGrep"));
  assert.ok(taken.includes("isLargeRead"));
});

test("classifiersTakenBy — file_write action credits only isLargeWrite", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(),  sessionId: "sess1234", classifiers: ["isLargeWrite"] },
      { ts: new Date(now - 10000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] }, // not credited
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_dev:file_write", "sess1234", now);
  assert.deepEqual(taken, ["isLargeWrite"]);
});

test("classifiersTakenBy — unknown action: returns []", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:unknown_action", "sess1234", now);
  assert.deepEqual(taken, []);
});

test("classifiersTakenBy — malformed sidecar/recent entries: fail-soft", () => {
  assert.deepEqual(classifiersTakenBy(null, "prism_session:master_index_query", "x"), []);
  assert.deepEqual(classifiersTakenBy({}, "prism_session:master_index_query", "x"), []);
  assert.deepEqual(classifiersTakenBy({ recent: "not-array" }, "prism_session:master_index_query", "x"), []);
  assert.deepEqual(
    classifiersTakenBy({ recent: [null, "string", { ts: "bad" }, { classifiers: ["x"] }] }, "prism_session:master_index_query", "x"),
    []
  );
});

// ── TOKEN-SAVINGS-PIVOT/U-WEBSEARCH-KB-ROUTE (2026-05-23) ─────────────────
// WebSearch route to prism_knowledge:search now credits isBroadWebSearch.

test("classifiersTakenBy — prism_knowledge:search credits isBroadWebSearch", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadWebSearch"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_knowledge:search", "sess1234", now);
  assert.deepEqual(taken, ["isBroadWebSearch"]);
});

test("classifiersTakenBy — prism_knowledge:cross_query credits isBroadWebSearch", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadWebSearch"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_knowledge:cross_query", "sess1234", now);
  assert.deepEqual(taken, ["isBroadWebSearch"]);
});

test("classifiersTakenBy — master_index_query now also credits isBroadWebSearch", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadWebSearch", "isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.equal(taken.length, 2);
  assert.ok(taken.includes("isBroadWebSearch"));
  assert.ok(taken.includes("isBroadGrep"));
});

test("classifiersTakenBy — prism_knowledge:search does NOT credit unrelated classifiers", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["isLargeWrite", "isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_knowledge:search", "sess1234", now);
  assert.deepEqual(taken, []);
});

test("extractMcpAction — prism_knowledge:search round-trip", () => {
  const r = extractMcpAction("mcp__prism_safe__prism_knowledge", { action: "search" });
  assert.equal(r, "prism_knowledge:search");
});

// ── TOKEN-SAVINGS-PIVOT/U-DOCTRINE-AUDIT-CREDIT (iter21, 2026-05-23) ──────
// backendAuditChain + doctrineSurface now creditable — closes the take-rate
// ceiling where 86% of fires had no MCP route to credit.

test("classifiersTakenBy — master_index_query credits backendAuditChain", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["backendAuditChain"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, ["backendAuditChain"]);
});

test("classifiersTakenBy — code_search credits backendAuditChain", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["backendAuditChain"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_dev:code_search", "sess1234", now);
  assert.deepEqual(taken, ["backendAuditChain"]);
});

test("classifiersTakenBy — dispatcher_map_compact credits doctrineSurface", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["doctrineSurface"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:dispatcher_map_compact", "sess1234", now);
  assert.deepEqual(taken, ["doctrineSurface"]);
});

test("classifiersTakenBy — action_search credits doctrineSurface", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["doctrineSurface"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:action_search", "sess1234", now);
  assert.deepEqual(taken, ["doctrineSurface"]);
});

test("classifiersTakenBy — combined backendAuditChain + isBroadGrep via master_index_query", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(),  sessionId: "sess1234", classifiers: ["backendAuditChain"] },
      { ts: new Date(now - 10000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.equal(taken.length, 2);
  assert.ok(taken.includes("backendAuditChain"));
  assert.ok(taken.includes("isBroadGrep"));
});

test("classifiersTakenBy — file_write does NOT credit backendAuditChain (no semantic overlap)", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(), sessionId: "sess1234", classifiers: ["backendAuditChain"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_dev:file_write", "sess1234", now);
  assert.deepEqual(taken, []);
});

// ── U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (2026-06-18, slot:alpha) ────────────────
// Credit native-script route-takes (the MCP-down fallback) -- the fleet routes
// search-first via `system-viz-query.mjs` and offload via `ask-ollama.mjs`,
// which the MCP-only credit path scored 0 -> artificial "takeup-wiring-broken".

test("extractScriptRoute — system-viz-query.mjs find -> script:master-index", () => {
  assert.equal(extractScriptRoute("Bash", { command: "rtk node scripts/system-viz-query.mjs find GHOST --json" }), "script:master-index");
  assert.equal(extractScriptRoute("Bash", { command: "node H:/prism/scripts/system-viz-query.mjs node-card eng.mill" }), "script:master-index");
});

test("extractScriptRoute — ask-ollama.mjs / ask-hermes.mjs -> script:ollama", () => {
  assert.equal(extractScriptRoute("Bash", { command: "node scripts/ask-ollama.mjs summarize foo.txt" }), "script:ollama");
  assert.equal(extractScriptRoute("Bash", { command: "node scripts/ask-hermes.mjs triage bar" }), "script:ollama");
});

test("extractScriptRoute — PowerShell surface also matches", () => {
  assert.equal(extractScriptRoute("PowerShell", { command: "node scripts/system-viz-query.mjs find x" }), "script:master-index");
});

test("extractScriptRoute — non-routing bash returns null (no over-credit)", () => {
  assert.equal(extractScriptRoute("Bash", { command: "ls -la" }), null);
  assert.equal(extractScriptRoute("Bash", { command: "git status" }), null);
  assert.equal(extractScriptRoute("Bash", { command: "node scripts/other-thing.mjs" }), null);
});

test("extractScriptRoute — bare MENTION / look-alike does NOT credit (anchor guard)", () => {
  // U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR: only an actual `node ... <script>.mjs`
  // invocation credits -- a bare mention or similarly-named file must not.
  assert.equal(extractScriptRoute("Bash", { command: "echo system-viz-query.mjs" }), null, "echo mention is not an invocation");
  assert.equal(extractScriptRoute("Bash", { command: "cat docs/system-viz-query.mjs.md" }), null, "doc file mention, no node");
  assert.equal(extractScriptRoute("Bash", { command: "node my-system-viz-query.mjs run" }), null, "hyphen-prefixed look-alike script");
  assert.equal(extractScriptRoute("Bash", { command: "node ask-ollama.mjs.bak run" }), null, ".bak suffixed look-alike");
  assert.equal(extractScriptRoute("Bash", { command: "grep system-viz-query.mjs *.log" }), null, "grep mention, no node");
  // but the real invocations STILL credit (rtk-prefix + absolute path tolerant)
  assert.equal(extractScriptRoute("Bash", { command: "rtk node scripts/system-viz-query.mjs find x" }), "script:master-index");
  assert.equal(extractScriptRoute("Bash", { command: "node H:/prism/scripts/ask-ollama.mjs summarize y" }), "script:ollama");
});

test("extractScriptRoute — non-bash tool / empty / malformed returns null", () => {
  assert.equal(extractScriptRoute("Grep", { pattern: "x" }), null);
  assert.equal(extractScriptRoute("Read", { file_path: "/x/system-viz-query.mjs" }), null); // not Bash -> not a route-take
  assert.equal(extractScriptRoute("Bash", {}), null);
  assert.equal(extractScriptRoute("Bash", null), null);
  assert.equal(extractScriptRoute(undefined, undefined), null);
});

test("eligibleClassifiersFor — resolves from BOTH maps; null for unknown", () => {
  // MCP map still works (back-compat)
  assert.ok(eligibleClassifiersFor("prism_session:master_index_query").includes("isBroadGrep"));
  // script map resolves
  assert.deepEqual(eligibleClassifiersFor("script:master-index"), _SCRIPT_ROUTE_TO_CLASSIFIERS["script:master-index"]);
  assert.ok(eligibleClassifiersFor("script:ollama").includes("isVerboseBash"));
  // unknown -> null
  assert.equal(eligibleClassifiersFor("script:nonexistent"), null);
  assert.equal(eligibleClassifiersFor("prism_session:unknown"), null);
});

test("classifiersTakenBy — script:master-index credits the search-first classifiers (the 0/99 fix)", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(),  sessionId: "sess1234", classifiers: ["backendAuditChain"] },
      { ts: new Date(now - 10000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
      { ts: new Date(now - 15000).toISOString(), sessionId: "sess1234", classifiers: ["isLargeWrite"] }, // NOT in script:master-index -> not credited
    ],
  };
  const taken = classifiersTakenBy(sidecar, "script:master-index", "sess1234", now);
  assert.ok(taken.includes("backendAuditChain"), "audit-chain nudge taken via system-viz-query");
  assert.ok(taken.includes("isBroadGrep"), "broad-grep nudge taken via the search-first script");
  assert.ok(!taken.includes("isLargeWrite"), "isLargeWrite is not a master-index classifier");
});

test("classifiersTakenBy — script:ollama credits only the offload classifiers", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 5000).toISOString(),  sessionId: "sess1234", classifiers: ["isVerboseBash"] },
      { ts: new Date(now - 10000).toISOString(), sessionId: "sess1234", classifiers: ["backendAuditChain"] }, // not an ollama classifier
    ],
  };
  const taken = classifiersTakenBy(sidecar, "script:ollama", "sess1234", now);
  assert.deepEqual(taken, ["isVerboseBash"]);
});

// ── _recordTakeup evaluation denominator (U-TAKEUP-EVAL-DENOMINATOR) ─────────
// The honest denominator: an evaluation is recorded whenever an eligible route
// is invoked, EVEN WHEN 0 classifiers credit -- so the audit can tell a genuine
// 0 take-rate (path exercised) from a never-exercised credit path.

function _tmpStats(seed = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tk-rec-"));
  const file = join(dir, "mcp-route-suggest-stats.json");
  writeFileSync(file, JSON.stringify({ totalFires: 10, byClassifier: {}, recent: [], ...seed }), "utf8");
  return { dir, file, read: () => JSON.parse(readFileSync(file, "utf8")), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("_recordTakeup — records an evaluation even when 0 classifiers credit (the honest denominator)", () => {
  const t = _tmpStats();
  try {
    const out = _recordTakeup("sess1234", "prism_session:action_search", [], t.file);
    assert.ok(out, "returns the written stats object");
    const s = t.read();
    assert.equal(s.takeupTotals.evaluations, 1, "evaluations bumped on a 0-credit eligible-route check");
    assert.ok(s.lastTakeupCheckAt, "lastTakeupCheckAt stamped");
    assert.equal(s.takeupTotals.byClassifier, undefined, "no credit recorded when 0 classifiers taken");
    assert.equal(s.takeups, undefined, "takeups[] not appended on a 0-credit evaluation");
  } finally { t.cleanup(); }
});

test("_recordTakeup — records BOTH the evaluation and the credits on an in-window match", () => {
  const t = _tmpStats();
  try {
    _recordTakeup("sess1234", "prism_session:action_search", ["isVerboseBash", "doctrineSurface"], t.file);
    const s = t.read();
    assert.equal(s.takeupTotals.evaluations, 1, "evaluation counted");
    assert.equal(s.takeupTotals.totalTakeups, 2, "2 classifiers credited");
    assert.equal(s.takeupTotals.byClassifier.isVerboseBash, 1);
    assert.equal(s.takeupTotals.byClassifier.doctrineSurface, 1);
    assert.equal(s.takeups.length, 1, "one takeup row appended");
    assert.deepEqual(s.takeups[0].creditedClassifiers, ["isVerboseBash", "doctrineSurface"]);
  } finally { t.cleanup(); }
});

test("_recordTakeup — evaluations accumulate across multiple checks", () => {
  const t = _tmpStats();
  try {
    _recordTakeup("a", "prism_session:action_search", [], t.file);
    _recordTakeup("b", "prism_session:dispatcher_map_compact", [], t.file);
    _recordTakeup("c", "prism_session:action_search", ["doctrineSurface"], t.file);
    const s = t.read();
    assert.equal(s.takeupTotals.evaluations, 3, "3 evaluations across 2 zero-credit + 1 credit");
    assert.equal(s.takeupTotals.totalTakeups, 1, "only the in-window check credited");
  } finally { t.cleanup(); }
});

test("_recordTakeup — disabled knob is a no-op (writes nothing)", () => {
  const t = _tmpStats();
  const prev = process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE;
  process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE = "1";
  try {
    const out = _recordTakeup("sess1234", "prism_session:action_search", ["doctrineSurface"], t.file);
    assert.equal(out, null, "no-op returns null when disabled");
    assert.equal(t.read().takeupTotals, undefined, "stats untouched when disabled");
  } finally {
    if (prev === undefined) delete process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE;
    else process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE = prev;
    t.cleanup();
  }
});

test("_recordTakeup — missing sidecar is a safe no-op (never throws)", () => {
  const out = _recordTakeup("sess1234", "prism_session:action_search", [], join(tmpdir(), "does-not-exist-xyz", "stats.json"));
  assert.equal(out, null, "unreadable sidecar -> null, no throw");
});

test("eligibleClassifiersFor — gates the denominator: unmapped prism_*:* action is NOT creditable", () => {
  // main() records an evaluation ONLY for routes with a classifier mapping, so an
  // unmapped MCP action (extractMcpAction returns a key for ANY prism_*:* call)
  // must NOT inflate the `evaluations` denominator.
  assert.equal(eligibleClassifiersFor("prism_cam:toolpath_generate"), null, "unmapped CAM action -> no classifiers -> gated out");
  assert.equal(eligibleClassifiersFor("prism_calc:cutting_force"), null, "unmapped calc action -> gated out");
  assert.ok(Array.isArray(eligibleClassifiersFor("prism_session:action_search")), "mapped action -> creditable");
  assert.ok(Array.isArray(eligibleClassifiersFor("script:master-index")), "script route -> always creditable");
});
