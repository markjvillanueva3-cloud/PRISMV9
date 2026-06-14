// mcp-route-takeup.test.mjs — pure tests for the TOKEN-SAVINGS-PIVOT iter8
// PostToolUse take-rate measurement hook.

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMcpAction, classifiersTakenBy } from "../mcp-route-takeup.mjs";

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

test("classifiersTakenBy — fire OUTSIDE 60s window: no credit", () => {
  const now = 1_700_000_000_000;
  const sidecar = {
    recent: [
      { ts: new Date(now - 70_000).toISOString(), sessionId: "sess1234", classifiers: ["isBroadGrep"] },
    ],
  };
  const taken = classifiersTakenBy(sidecar, "prism_session:master_index_query", "sess1234", now);
  assert.deepEqual(taken, []);
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
