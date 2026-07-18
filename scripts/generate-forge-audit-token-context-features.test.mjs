/**
 * Tests for generate-forge-audit-token-context-features.mjs (pure-core).
 *
 * Run: node --test scripts/generate-forge-audit-token-context-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, ROOST_ID, PLANNED_PARENT, FINDINGS, SCHEMA_VERSION } from "./generate-forge-audit-token-context-features.mjs";

test("schema version is 1.0.0", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

test("emits the roost node when empty existingNodeIds", () => {
  const { newNodes } = generate([]);
  const roost = newNodes.find((n) => n.id === ROOST_ID);
  assert.ok(roost, "roost emitted");
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, "L8");
  assert.equal(roost.ghost, true);
  assert.equal(roost.kind, "ghost-roost");
});

test("emits one child per finding", () => {
  const { newNodes, stats } = generate([]);
  const children = newNodes.filter((n) => n.kind === "audit-finding");
  assert.equal(children.length, FINDINGS.length, "every finding emits a child node");
  assert.equal(stats.childCount, FINDINGS.length);
  assert.equal(stats.totalFindings, FINDINGS.length);
});

test("emits a parent edge per child", () => {
  const { newEdges } = generate([]);
  const edges = newEdges.filter((e) => e.source === ROOST_ID && e.kind === "contains");
  assert.equal(edges.length, FINDINGS.length, "one contains-edge per finding");
});

test("idempotent — skips nodes already in existingNodeIds", () => {
  const seedIds = new Set([ROOST_ID]);
  for (const f of FINDINGS) seedIds.add(`forge_audit_2026_05_26.${f.id}`);
  const { newNodes, newEdges } = generate(seedIds);
  assert.equal(newNodes.length, 0, "no new nodes when all already present");
  assert.equal(newEdges.length, 0, "no new edges when all already present");
});

test("status is critical for P0, warning for P1, info for P2", () => {
  const { newNodes } = generate([]);
  const byPriority = { P0: 0, P1: 0, P2: 0 };
  for (const f of FINDINGS) byPriority[f.priority]++;
  const critical = newNodes.filter((n) => n.status === "critical");
  const warning = newNodes.filter((n) => n.status === "warning");
  const info = newNodes.filter((n) => n.status === "info");
  assert.equal(critical.length, byPriority.P0, "P0 → critical status");
  assert.equal(warning.length, byPriority.P1, "P1 → warning status");
  assert.equal(info.length, byPriority.P2, "P2 → info status");
});

test("includes all 5 expected P0 unit IDs", () => {
  const p0Ids = FINDINGS.filter((f) => f.priority === "P0").map((f) => f.id);
  assert.ok(p0Ids.includes("ollama-daemon-revive"));
  assert.ok(p0Ids.includes("memory-md-auto-prune"));
  assert.ok(p0Ids.includes("cache-breakpoint-sweeper"));
  assert.ok(p0Ids.includes("agent-team-cost-cap"));
  assert.ok(p0Ids.includes("mcp-route-take-rate-fix"));
});

test("12 total findings (5 P0 + 5 P1 + 2 P2)", () => {
  assert.equal(FINDINGS.length, 12);
  const p0 = FINDINGS.filter((f) => f.priority === "P0").length;
  const p1 = FINDINGS.filter((f) => f.priority === "P1").length;
  const p2 = FINDINGS.filter((f) => f.priority === "P2").length;
  assert.equal(p0, 5, "5 P0 items");
  assert.equal(p1, 5, "5 P1 items");
  assert.equal(p2, 2, "2 P2 items");
});
