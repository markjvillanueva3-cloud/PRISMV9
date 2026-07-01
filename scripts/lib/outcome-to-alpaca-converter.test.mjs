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
  isSweepRow,
  sweepRowToAlpaca,
  cellIdTokens,
} from "./outcome-to-alpaca-converter.mjs";

// Real-shaped flat sweep rows (from state/outcomes/, verified live 2026-06-30).
const REAL_FULLSWEEP = {
  cell_id: "AISI 1018 Mild Steel::D3::F2::milling::roughing::conventional::flood::cat40::cost_batch",
  domain: "mill", iso: "P", material: "AISI 1018 Mild Steel", tool_material: "carbide",
  tool_diameter_mm: 3, mode: "cost_batch", prism_vc_mpm: 100, baseline_vc_mpm: 220,
  gwizard_vc_mpm: null, hsmadvisor_vc_mpm: null, consensus_vc_mpm: 220,
};
const REAL_ALLAXIS = {
  way: "box_way", workholding: "kurt_vise", tool_holder: "cat40", coolant: "flood",
  iso: "P", tool_material: "carbide", cut_type: "roughing", diameter_mm: 6,
  mode: "prism_optimized", feasible: true, warnings: 7, vc_mpm: 226.4, rpm: 12000,
  feed_mmmin: 7794, mrr_cm3min: 139.39,
};

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

  it("reads the U-OUTCOME-INPUT-CAPTURE extras (iso/tool_material/tool_diameter_mm) the hook now writes", () => {
    const ins = buildInstruction({
      domain: "lathe",
      context: { material: "4140 steel", operation: "turning", iso: "P", tool_material: "carbide", tool_diameter_mm: "12", action: "speed_feed_recommend" },
    });
    assert.match(ins, /iso=P/);
    assert.match(ins, /tool_material=carbide/);
    assert.match(ins, /tool_diameter_mm=12/);
    assert.match(ins, /material=4140 steel/);
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
      { instruction: "a", output: "c" },
    ];
    rows.splice(1, 0, { instruction: "a", output: "b" }); // duplicate of rows[0]
    const { rows: out, duplicates } = dedupRows(rows);
    assert.equal(out.length, 2);
    assert.equal(duplicates, 1);
  });
});

// --- U-OUTCOME-SWEEP-SFT (flat sweep-row schema) ---------------------------

describe("cellIdTokens", () => {
  it("position-independent: extracts operation/strategy tokens from a real cell_id", () => {
    const toks = cellIdTokens(REAL_FULLSWEEP.cell_id);
    assert.ok(toks.includes("milling"));
    assert.ok(toks.includes("roughing"));
    assert.ok(toks.includes("conventional"));
    assert.ok(!toks.includes("cat40")); // a holder code is not an op token
    assert.ok(!toks.includes("d3"));    // a tool code is not an op token
  });
  it("empty / non-string cell_id -> [] (never throws)", () => {
    assert.deepEqual(cellIdTokens(undefined), []);
    assert.deepEqual(cellIdTokens(""), []);
    assert.deepEqual(cellIdTokens(42), []);
  });
});

describe("isSweepRow", () => {
  it("happy: both real sweep schemas qualify", () => {
    assert.equal(isSweepRow(REAL_FULLSWEEP), true);
    assert.equal(isSweepRow(REAL_ALLAXIS), true);
  });
  it("NO-REGRESSION: an outcome-bus envelope event is NOT a sweep row (kind/context/recommended guard)", () => {
    assert.equal(isSweepRow(REAL_SF), false);
    assert.equal(isSweepRow({ kind: "recommendation_emitted", iso: "P", material: "x", vc_mpm: 100 }), false);
    assert.equal(isSweepRow({ context: {}, material: "x", iso: "P", vc_mpm: 100 }), false);
  });
  it("failure: <2 determining inputs -> not a sweep row (no degenerate pair)", () => {
    assert.equal(isSweepRow({ material: "AISI 1018", vc_mpm: 100 }), false); // 1 input only
  });
  it("failure: inputs present but NO finite output param -> not a sweep row", () => {
    assert.equal(isSweepRow({ material: "x", iso: "P", tool_material: "carbide", prism_vc_mpm: null }), false);
  });
  it("adversarial: a random flat object never false-positives", () => {
    assert.equal(isSweepRow({ foo: 1, bar: "baz", qux: true }), false);
    assert.equal(isSweepRow(null), false);
    assert.equal(isSweepRow([1, 2, 3]), false);
  });
});

describe("sweepRowToAlpaca", () => {
  it("happy: fullsweep row -> (inputs incl cell_id op -> prism_vc) pair", () => {
    const pair = sweepRowToAlpaca(REAL_FULLSWEEP);
    assert.ok(pair);
    assert.match(pair.instruction, /material=AISI 1018 Mild Steel/);
    assert.match(pair.instruction, /iso=P/);
    assert.match(pair.instruction, /tool_diameter_mm=3/);
    assert.match(pair.instruction, /mode=cost_batch/);
    assert.match(pair.instruction, /op=milling/);   // enriched from cell_id
    assert.match(pair.instruction, /op=roughing/);
    assert.match(pair.output, /prism_vc_mpm=100/);   // PRISM's recommendation = the target
  });

  it("happy: all-axis row -> (rich inputs -> vc/rpm/feed/mrr) pair", () => {
    const pair = sweepRowToAlpaca(REAL_ALLAXIS);
    assert.ok(pair);
    assert.match(pair.instruction, /way=box_way/);
    assert.match(pair.instruction, /workholding=kurt_vise/);
    assert.match(pair.instruction, /cut_type=roughing/);
    assert.match(pair.instruction, /diameter_mm=6/);
    assert.match(pair.output, /vc_mpm=226.4/);
    assert.match(pair.output, /rpm=12000/);
    assert.match(pair.output, /feed_mmmin=7794/);
    assert.match(pair.output, /mrr_cm3min=139.39/);
  });

  it("adversarial: prism_vc_mpm null falls back to vc_mpm as the target", () => {
    const pair = sweepRowToAlpaca({ material: "x", iso: "P", tool_material: "carbide", prism_vc_mpm: null, vc_mpm: 180 });
    assert.ok(pair);
    assert.match(pair.output, /vc_mpm=180/);
    assert.ok(!/prism_vc_mpm=/.test(pair.output)); // null target omitted, not rendered as "null"
  });

  it("failure: non-sweep / thin row -> null", () => {
    assert.equal(sweepRowToAlpaca({ foo: 1 }), null);
    assert.equal(sweepRowToAlpaca(REAL_SF), null); // envelope event rejected
  });
});

describe("convertJsonlText with sweep rows (integration)", () => {
  it("envelope + sweep rows both convert in one stream; no double-count", () => {
    const text = [
      JSON.stringify(REAL_SF),          // envelope -> converted
      JSON.stringify(REAL_FULLSWEEP),   // sweep    -> converted
      JSON.stringify(REAL_ALLAXIS),     // sweep    -> converted
      JSON.stringify({ foo: 1 }),       // neither  -> skipped
    ].join("\n");
    const { rows, invalid, skipped } = convertJsonlText(text);
    assert.equal(rows.length, 3);
    assert.equal(invalid, 0);
    assert.equal(skipped, 1);
    // the fullsweep pair carries the PRISM Vc target
    assert.ok(rows.some((r) => /prism_vc_mpm=100/.test(r.output)));
  });
});
