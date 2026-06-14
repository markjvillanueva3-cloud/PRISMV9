// scripts/lib/outcome-to-alpaca-converter.test.mjs
// Tests for U-OUTCOME-LORA-WIRE: outcome-bus events -> Alpaca training pairs.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  flattenScalars,
  buildInstruction,
  buildOutput,
  outcomeToAlpaca,
  convertJsonlText,
  dedupRows,
} from "./outcome-to-alpaca-converter.mjs";

// Real-shaped speed_feed `calculate` event (from state/outcomes/speed_feed.jsonl).
const REAL_SF = {
  domain: "speed_feed",
  kind: "recommendation_emitted",
  context: { material: "hardened_steel", tool_id: "hss", operation: "turning", engine: "UltimateSpeedFeedEngine", action: "calculate" },
  recommended: {
    summary: { feed_rate: 126, rpm: 2095 },
    raw: { cutting_speed: { value: 83.6, unit: "m/min", confidence: 0.75, source: "lookup" }, spindle_rpm: { value: 2095, unit: "RPM" } },
  },
};

describe("flattenScalars", () => {
  it("collapses a physics {value,unit} node to '<value> <unit>' (drops metadata noise)", () => {
    const leaves = flattenScalars({ cutting_speed: { value: 83.6, unit: "m/min", confidence: 0.75, source: "lookup" } });
    assert.deepEqual(leaves, [["cutting_speed", "83.6 m/min"]]);
  });

  it("extracts plain scalar leaves with dotted key paths", () => {
    const leaves = flattenScalars({ summary: { feed_rate: 126, rpm: 2095 } });
    assert.deepEqual(leaves, [["summary.feed_rate", 126], ["summary.rpm", 2095]]);
  });

  it("caps leaf count (adversarial: a huge object must not explode the output)", () => {
    const big = {};
    for (let i = 0; i < 100; i++) big[`k${i}`] = i;
    const leaves = flattenScalars(big, { maxLeaves: 16 });
    assert.equal(leaves.length, 16);
  });

  it("empty / null input -> no leaves", () => {
    assert.deepEqual(flattenScalars({}), []);
    assert.deepEqual(flattenScalars(null), []);
  });
});

describe("buildInstruction", () => {
  it("happy: composes from material+tool+operation, strips _id suffix", () => {
    const ins = buildInstruction(REAL_SF);
    assert.match(ins, /material=hardened_steel/);
    assert.match(ins, /tool=hss/); // tool_id -> tool
    assert.match(ins, /operation=turning/);
    assert.match(ins, /PRISM speed_feed calculate/);
  });

  it("LEARNABILITY GATE: returns null when context has no determining inputs (sparse event)", () => {
    // The `constrain` events carry only {machine_id, engine, action} -> not learnable.
    const sparse = { domain: "speed_feed", context: { engine: "X", action: "constrain" } };
    assert.equal(buildInstruction(sparse), null);
  });

  it("adversarial: machine_id alone (no material/tool) still yields inputs (machine is a determiner)", () => {
    const ins = buildInstruction({ domain: "mill", context: { machine_id: "haas-vf-2", action: "calculate" } });
    assert.match(ins, /machine=haas-vf-2/);
  });
});

describe("buildOutput", () => {
  it("prefers the non-empty summary subtree", () => {
    const out = buildOutput(REAL_SF);
    assert.match(out, /feed_rate=126/);
    assert.match(out, /rpm=2095/);
  });

  it("falls back to sinker-style nested `recommended`", () => {
    const out = buildOutput({ recommended: { recommended: { current: 20, on_time: 50 } } });
    assert.match(out, /current=20/);
    assert.match(out, /on_time=50/);
  });

  it("reads `actual` for cross_process_stage_complete events", () => {
    const out = buildOutput({ actual: { summary: { operations_count: 3, material_name: "d2" } } });
    assert.match(out, /operations_count=3/);
    assert.match(out, /material_name=d2/);
  });

  it("null when recommended is empty/missing", () => {
    assert.equal(buildOutput({ recommended: { summary: {} } }), null);
    assert.equal(buildOutput({}), null);
  });
});

describe("outcomeToAlpaca", () => {
  it("happy: real speed_feed event -> a learnable pair", () => {
    const pair = outcomeToAlpaca(REAL_SF);
    assert.ok(pair);
    assert.match(pair.instruction, /hardened_steel/);
    assert.match(pair.output, /rpm=2095/);
  });

  it("failure: sparse event (no inputs) -> null, not a degenerate pair", () => {
    assert.equal(outcomeToAlpaca({ domain: "x", context: { action: "constrain" }, recommended: { summary: { rpm: 5000 } } }), null);
  });

  it("adversarial: non-object / null input -> null, never throws", () => {
    assert.doesNotThrow(() => {
      assert.equal(outcomeToAlpaca(null), null);
      assert.equal(outcomeToAlpaca("not-an-object"), null);
      assert.equal(outcomeToAlpaca(42), null);
    });
  });
});

describe("convertJsonlText", () => {
  it("counts converted / invalid / skipped from mixed JSONL", () => {
    const text = [
      JSON.stringify(REAL_SF),                                              // valid -> converted
      "{ not valid json",                                                   // invalid
      JSON.stringify({ domain: "x", context: { action: "constrain" } }),   // skipped (no inputs)
      "",                                                                   // blank -> ignored
    ].join("\n");
    const { rows, invalid, skipped } = convertJsonlText(text);
    assert.equal(rows.length, 1);
    assert.equal(invalid, 1);
    assert.equal(skipped, 1);
  });
});

describe("dedupRows", () => {
  it("collapses identical (instruction,output) pairs (frequency must not skew the corpus)", () => {
    const rows = [
      { instruction: "a", output: "b" },
      { instruction: "a", output: "b" },
      { instruction: "a", output: "c" },
    ];
    const { rows: out, duplicates } = dedupRows(rows);
    assert.equal(out.length, 2);
    assert.equal(duplicates, 1);
  });
});
