import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isToolSurface, extractToolSurfaces, classifyNode, buildReport,
} from "../audit-token-savings-coverage.mjs";

// === isToolSurface ===
test("isToolSurface: hook type → true", () => {
  assert.equal(isToolSurface({ type: "hook", id: "x" }), true);
});
test("isToolSurface: dispatcher type → true", () => {
  assert.equal(isToolSurface({ type: "dispatcher", id: "x" }), true);
});
test("isToolSurface: engine type → false", () => {
  assert.equal(isToolSurface({ type: "engine", id: "MyEngine" }), false);
});
test("isToolSurface: label matches rtk- pattern → true", () => {
  assert.equal(isToolSurface({ type: "unknown", label: "rtk-git-status" }), true);
});
test("isToolSurface: label matches -hook pattern → true", () => {
  assert.equal(isToolSurface({ type: "unknown", label: "pre-tool-hook" }), true);
});
test("isToolSurface: null/undefined → false", () => {
  assert.equal(isToolSurface(null), false);
  assert.equal(isToolSurface(undefined), false);
  assert.equal(isToolSurface({}), false);
});

// === extractToolSurfaces ===
test("extractToolSurfaces: filters nodes correctly", () => {
  const graph = {
    nodes: [
      { id: "h1", type: "hook", label: "my-hook" },
      { id: "e1", type: "engine", label: "MyEngine" },
      { id: "d1", type: "dispatcher", label: "prism_ai" },
      { id: "f1", type: "formula", label: "kc1.1" },
    ],
  };
  const out = extractToolSurfaces(graph);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((n) => n.id).sort(), ["d1", "h1"]);
});
test("extractToolSurfaces: missing nodes array → []", () => {
  assert.deepEqual(extractToolSurfaces({}), []);
  assert.deepEqual(extractToolSurfaces(null), []);
});
test("extractToolSurfaces: nodes lacking id are filtered", () => {
  const out = extractToolSurfaces({ nodes: [{ type: "hook" }, { type: "hook", id: "h1" }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "h1");
});

// === classifyNode ===
const SAMPLE_SOURCES = {
  detectors: new Set(["grep", "read", "bashgit"]),
  rtkWraps: new Set(["git", "npm", "node"]),
  ollamaTargets: new Set(["ollama-summarize"]),
  routeRules: new Set(["prism_session:master_index_query"]),
};
test("classifyNode: detector match → COVERED", () => {
  const r = classifyNode({ id: "grep-broad-warn", label: "grep classifier" }, SAMPLE_SOURCES);
  assert.equal(r, "COVERED");
});
test("classifyNode: RTK wrap match → COVERED", () => {
  const r = classifyNode({ id: "rtk-wrap", label: "git" }, SAMPLE_SOURCES);
  assert.equal(r, "COVERED");
});
test("classifyNode: Ollama target match → COVERED", () => {
  const r = classifyNode({ id: "skill", label: "ollama-summarize" }, SAMPLE_SOURCES);
  assert.equal(r, "COVERED");
});
test("classifyNode: MCP route match → COVERED", () => {
  const r = classifyNode({ id: "prism_session:master_index_query", label: "route" }, SAMPLE_SOURCES);
  assert.equal(r, "COVERED");
});
test("classifyNode: no match → CANDIDATE", () => {
  const r = classifyNode({ id: "novel-hook", label: "no-coverage-yet" }, SAMPLE_SOURCES);
  assert.equal(r, "CANDIDATE");
});

// === buildReport ===
test("buildReport: counts correctly + groups candidates by type", () => {
  const surfaces = [
    { id: "h1", type: "hook", label: "grep-warn" },        // COVERED
    { id: "h2", type: "hook", label: "novel-detector" },    // CANDIDATE
    { id: "d1", type: "dispatcher", label: "prism_session:master_index_query" }, // COVERED
    { id: "d2", type: "dispatcher", label: "new-route" },   // CANDIDATE
    { id: "s1", type: "skill", label: "another-novel" },    // CANDIDATE
  ];
  const r = buildReport(surfaces, SAMPLE_SOURCES);
  assert.equal(r.counts.COVERED, 2);
  assert.equal(r.counts.CANDIDATE, 3);
  assert.equal(r.totalSurfaces, 5);
  assert.equal(r.candidatesByType.get("hook").length, 1);
  assert.equal(r.candidatesByType.get("dispatcher").length, 1);
  assert.equal(r.candidatesByType.get("skill").length, 1);
});
test("buildReport: empty input → zero counts", () => {
  const r = buildReport([], SAMPLE_SOURCES);
  assert.equal(r.totalSurfaces, 0);
  assert.equal(r.counts.COVERED || 0, 0);
  assert.equal(r.counts.CANDIDATE || 0, 0);
});

// === Adversarial / edge cases (≥2 per comprehensive-build enforcement) ===
test("classifyNode: empty label + empty id → CANDIDATE (no match)", () => {
  assert.equal(classifyNode({ id: "", label: "" }, SAMPLE_SOURCES), "CANDIDATE");
});
test("isToolSurface: very large label string → no crash", () => {
  const big = "rtk-" + "x".repeat(10000);
  assert.equal(isToolSurface({ type: "unknown", label: big }), true);
});
