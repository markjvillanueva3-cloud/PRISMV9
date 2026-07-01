/**
 * Tests for measure-action-surface-separability.mjs pure helpers (slot:india 2026-06-21).
 * The embed/IO + the measurement itself are validated by running the harness (live, 0
 * failures); these pin the two pure transforms that shape the comparison (R9).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { humanizeEngineName, groupByClass } from "./measure-action-surface-separability.mjs";

test("humanizeEngineName: camel/Pascal/acronym -> lowercased spaced words", () => {
  assert.equal(humanizeEngineName("KienzleEngine"), "kienzle engine");
  assert.equal(humanizeEngineName("SpeedFeedNineAxisOrchestratorEngine"), "speed feed nine axis orchestrator engine");
  assert.equal(humanizeEngineName("GraphSAGETrainerEngine"), "graph sage trainer engine"); // acronym boundary
  assert.equal(humanizeEngineName("PDF_BlueprintEngine"), "pdf blueprint engine");          // underscore -> space
  assert.equal(humanizeEngineName(""), "");
  assert.equal(humanizeEngineName(null), "");
});

test("groupByClass: buckets rows by dispatcher, drops rows without a vec", () => {
  const rows = [
    { dispatcher: "prism_calc", vec: [1, 0] },
    { dispatcher: "prism_calc", vec: [0, 1] },
    { dispatcher: "prism_cam", vec: [1, 1] },
    { dispatcher: "prism_calc", vec: null }, // dropped (no vec)
    null,                                     // dropped (no row)
  ];
  const m = groupByClass(rows);
  assert.equal(m.get("prism_calc").length, 2);
  assert.equal(m.get("prism_cam").length, 1);
  assert.equal(m.size, 2);
  // shape is what classSeparability consumes: Map<class, vec[]>
  assert.ok(Array.isArray(m.get("prism_calc")));
});
