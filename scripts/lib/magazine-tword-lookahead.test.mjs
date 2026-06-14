/**
 * magazine-tword-lookahead.test.mjs — concrete-value tests for the
 * T-word look-ahead emit-position optimizer.
 *
 * Hand-checked physics:
 *   30-slot magazine, slot 1 → slot 8: circDist = min(7, 23) = 7
 *   30-slot, slot 1 → slot 20:        circDist = min(19, 11) = 11
 *   30-slot, slot 1 → slot 16:        circDist = min(15, 15) = 15 (worst)
 *   30-slot, slot 30 → slot 1:        circDist = min(29, 1) = 1 (wrap)
 *
 *   Rotation time @ 0.5 sec/slot:
 *     dist=7  → 3.5 s
 *     dist=15 → 7.5 s
 *
 * Hand-checked savings (chain magazine, 3 ops [T1:30s, T8:20s, T16:15s]):
 *   op1 → next T8, dist 1→8 = 7, rotTime 3.5s, saved = min(3.5, 30) = 3.5s
 *   op2 → next T16, dist 8→16 = 8, rotTime 4.0s, saved = min(4.0, 20) = 4.0s
 *   op3 → last-op, saved = 0
 *   total saved = 7.5s
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-MAGAZINE-TSP-T-WORD-ORDER
 * @slot echo · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAGAZINE_TWORD_SCHEMA_VERSION,
  DEFAULT_ROTATION_TIME_PER_SLOT_SEC,
  DEFAULT_TWIN_ARM_SWAP_TIME_SEC,
  SUPPORTED_MAGAZINE_TYPES,
  SUPPORTED_DIALECTS,
  circularDistance,
  estimateRotationTimeSec,
  decideLookAheadPosition,
  buildToolChangePlan,
  emitTWordSequence,
  magazineTWordOrder,
} from "./magazine-tword-lookahead.mjs";

// Note: all hand-checked savings are integer-representable floats
// (3.5, 4.0, 7.5) — strict equality is exact, no epsilon needed.

describe("constants", () => {
  it("MAGAZINE_TWORD_SCHEMA_VERSION = 1", () => {
    assert.equal(MAGAZINE_TWORD_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_ROTATION_TIME_PER_SLOT_SEC = 0.5", () => {
    assert.equal(DEFAULT_ROTATION_TIME_PER_SLOT_SEC, 0.5);
  });
  it("DEFAULT_TWIN_ARM_SWAP_TIME_SEC = 2.0", () => {
    assert.equal(DEFAULT_TWIN_ARM_SWAP_TIME_SEC, 2.0);
  });
  it("SUPPORTED_MAGAZINE_TYPES has 4 entries", () => {
    assert.equal(SUPPORTED_MAGAZINE_TYPES.length, 4);
    assert.equal(SUPPORTED_MAGAZINE_TYPES.includes("chain"), true);
    assert.equal(SUPPORTED_MAGAZINE_TYPES.includes("umbrella"), true);
    assert.equal(SUPPORTED_MAGAZINE_TYPES.includes("twin-arm"), true);
    assert.equal(SUPPORTED_MAGAZINE_TYPES.includes("random-access"), true);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.equal(SUPPORTED_DIALECTS.length, 5);
  });
});

describe("circularDistance", () => {
  it("slot 1 → 8 in 30-slot magazine → 7", () => {
    assert.equal(circularDistance(1, 8, 30), 7);
  });
  it("slot 1 → 20 in 30-slot → 11 (wrap shorter than direct)", () => {
    assert.equal(circularDistance(1, 20, 30), 11);
  });
  it("slot 1 → 16 in 30-slot → 15 (worst case, equidistant)", () => {
    assert.equal(circularDistance(1, 16, 30), 15);
  });
  it("slot 30 → 1 in 30-slot → 1 (wrap-around)", () => {
    assert.equal(circularDistance(30, 1, 30), 1);
  });
  it("slot 15 → 16 → 1 (adjacent)", () => {
    assert.equal(circularDistance(15, 16, 30), 1);
  });
  it("slot 1 → 1 → 0 (same slot)", () => {
    assert.equal(circularDistance(1, 1, 30), 0);
  });
  it("21-slot magazine (Haas Mini-Mill): slot 1 → 11 → 10", () => {
    assert.equal(circularDistance(1, 11, 21), 10);
  });
  it("magazineSize=0 → null", () => {
    assert.equal(circularDistance(1, 8, 0), null);
  });
  it("magazineSize<0 → null", () => {
    assert.equal(circularDistance(1, 8, -30), null);
  });
  it("fromSlot out of range → null", () => {
    assert.equal(circularDistance(35, 8, 30), null);
    assert.equal(circularDistance(0, 8, 30), null);
  });
  it("toSlot out of range → null", () => {
    assert.equal(circularDistance(1, 35, 30), null);
  });
  it("NaN inputs → null", () => {
    assert.equal(circularDistance(NaN, 8, 30), null);
    assert.equal(circularDistance(1, NaN, 30), null);
    assert.equal(circularDistance(1, 8, NaN), null);
  });
});

describe("estimateRotationTimeSec", () => {
  it("circDist=7 @ 0.5 sec/slot → 3.5", () => {
    assert.equal(estimateRotationTimeSec(7, 0.5), 3.5);
  });
  it("circDist=15 @ 0.5 → 7.5", () => {
    assert.equal(estimateRotationTimeSec(15, 0.5), 7.5);
  });
  it("circDist=0 → 0", () => {
    assert.equal(estimateRotationTimeSec(0, 0.5), 0);
  });
  it("rotPerSlot=0 → 0 (free rotation, theoretical)", () => {
    assert.equal(estimateRotationTimeSec(7, 0), 0);
  });
  it("circDist negative → null", () => {
    assert.equal(estimateRotationTimeSec(-1, 0.5), null);
  });
  it("rotPerSlot negative → null", () => {
    assert.equal(estimateRotationTimeSec(7, -0.5), null);
  });
  it("NaN circDist → null", () => {
    assert.equal(estimateRotationTimeSec(NaN, 0.5), null);
  });
});

describe("decideLookAheadPosition", () => {
  it("chain + T1→T8 → decision=true, reason mentions 'chain'", () => {
    const r = decideLookAheadPosition({ currentTool: 1, nextTool: 8, magazineType: "chain" });
    assert.equal(r.decision, true);
    assert.equal(r.reason.includes("chain"), true);
  });
  it("umbrella + T1→T8 → decision=true, reason mentions 'umbrella'", () => {
    const r = decideLookAheadPosition({ currentTool: "T1", nextTool: "T8", magazineType: "umbrella" });
    assert.equal(r.decision, true);
    assert.equal(r.reason.includes("umbrella"), true);
  });
  it("twin-arm + T1→T8 → decision=true", () => {
    const r = decideLookAheadPosition({ currentTool: "T1", nextTool: "T8", magazineType: "twin-arm" });
    assert.equal(r.decision, true);
  });
  it("random-access + T1→T8 → decision=false, reason mentions 'random-access'", () => {
    const r = decideLookAheadPosition({ currentTool: "T1", nextTool: "T8", magazineType: "random-access" });
    assert.equal(r.decision, false);
    assert.equal(r.reason.includes("random-access"), true);
  });
  it("chain + T1→T1 (same tool) → decision=false, reason='same-tool-no-swap'", () => {
    const r = decideLookAheadPosition({ currentTool: "T1", nextTool: "T1", magazineType: "chain" });
    assert.equal(r.decision, false);
    assert.equal(r.reason, "same-tool-no-swap");
  });
  it("unknown magazine type → null", () => {
    assert.equal(decideLookAheadPosition({ currentTool: "T1", nextTool: "T8", magazineType: "mazak-pmc" }), null);
  });
  it("missing currentTool → null", () => {
    assert.equal(decideLookAheadPosition({ nextTool: "T8", magazineType: "chain" }), null);
  });
  it("missing nextTool → null", () => {
    assert.equal(decideLookAheadPosition({ currentTool: "T1", magazineType: "chain" }), null);
  });
});

describe("buildToolChangePlan", () => {
  const baseReq = {
    operations: [
      { id: "op1", tool: 1, durationSec: 30 },
      { id: "op2", tool: 8, durationSec: 20 },
      { id: "op3", tool: 16, durationSec: 15 },
    ],
    slotAssignments: { 1: 1, 8: 8, 16: 16 },
    magazineType: "chain",
    magazineSize: 30,
    rotationTimePerSlotSec: 0.5,
  };

  it("3 ops → 3 plan entries", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.ops.length, 3);
  });

  it("op1 → look-ahead T8 (chain prefetch), saved = 3.5s", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.ops[0].lookAhead.decision, true);
    assert.equal(r.ops[0].nextTool, 8);
    assert.equal(r.ops[0].circDist, 7);
    assert.equal(r.ops[0].rotationTimeSec, 3.5);
    assert.equal(r.ops[0].savedSec, 3.5);
  });

  it("op2 → look-ahead T16 (T8 slot 8 → T16 slot 16, dist 8), saved = 4.0s", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.ops[1].lookAhead.decision, true);
    assert.equal(r.ops[1].nextTool, 16);
    assert.equal(r.ops[1].circDist, 8);
    assert.equal(r.ops[1].rotationTimeSec, 4.0);
    assert.equal(r.ops[1].savedSec, 4.0);
  });

  it("op3 (last) → no look-ahead, savedSec=0, reason='last-op-no-next'", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.ops[2].lookAhead.decision, false);
    assert.equal(r.ops[2].lookAhead.reason, "last-op-no-next");
    assert.equal(r.ops[2].savedSec, 0);
  });

  it("summary.totalSavedSec = 7.5 (hand-checked)", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.summary.totalSavedSec, 7.5);
  });

  it("summary.lookAheadEmitCount = 2 (op1 + op2)", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.summary.lookAheadEmitCount, 2);
  });

  it("summary.inlineEmitCount = 1 (op3 last)", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.summary.inlineEmitCount, 1);
  });

  it("summary.schemaVersion = 1", () => {
    const r = buildToolChangePlan(baseReq);
    assert.equal(r.summary.schemaVersion, 1);
  });

  it("default rotationTimePerSlotSec applies (0.5) when not provided", () => {
    const { rotationTimePerSlotSec: _, ...withoutRot } = baseReq;
    const r = buildToolChangePlan(withoutRot);
    assert.equal(r.summary.rotationTimePerSlotSec, 0.5);
  });

  it("random-access magazine → NO look-ahead anywhere, totalSaved=0", () => {
    const r = buildToolChangePlan({ ...baseReq, magazineType: "random-access" });
    assert.equal(r.summary.lookAheadEmitCount, 0);
    assert.equal(r.summary.totalSavedSec, 0);
    assert.equal(r.ops[0].lookAhead.decision, false);
    assert.equal(r.ops[0].lookAhead.reason.includes("random-access"), true);
  });

  it("savings cap: short op duration (5s) limits saved to 5s even if rotTime=7.5s", () => {
    const r = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 1, durationSec: 5 },
        { id: "op2", tool: 16, durationSec: 10 },
      ],
      slotAssignments: { 1: 1, 16: 16 },
      magazineType: "chain",
      magazineSize: 30,
      rotationTimePerSlotSec: 0.5,
    });
    // dist 1→16 = 15, rotTime = 7.5s, but op1 only lasts 5s → saved = min(7.5, 5) = 5
    assert.equal(r.ops[0].rotationTimeSec, 7.5);
    assert.equal(r.ops[0].savedSec, 5);
  });

  it("same-tool consecutive ops → no look-ahead, no savings", () => {
    const r = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 1, durationSec: 30 },
        { id: "op2", tool: 1, durationSec: 20 },
      ],
      slotAssignments: { 1: 1 },
      magazineType: "chain",
      magazineSize: 30,
    });
    assert.equal(r.ops[0].lookAhead.decision, false);
    assert.equal(r.ops[0].lookAhead.reason, "same-tool-no-swap");
    assert.equal(r.ops[0].savedSec, 0);
  });

  it("missing tool assignment → op flagged 'tool-not-in-magazine'", () => {
    const r = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 1, durationSec: 30 },
        { id: "op2", tool: 99, durationSec: 20 },
      ],
      slotAssignments: { 1: 1 }, // T99 missing
      magazineType: "chain",
      magazineSize: 30,
    });
    assert.equal(r.ops[1].error, "tool-not-in-magazine");
  });

  it("next tool missing slot → 'next-tool-not-in-magazine' flag", () => {
    const r = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 1, durationSec: 30 },
        { id: "op2", tool: 99, durationSec: 20 },
      ],
      slotAssignments: { 1: 1 },
      magazineType: "chain",
      magazineSize: 30,
    });
    assert.equal(r.ops[0].error, "next-tool-not-in-magazine");
  });

  it("3 different magazine types produce 3 different savings", () => {
    const chainPlan = buildToolChangePlan(baseReq);
    const umbrellaPlan = buildToolChangePlan({ ...baseReq, magazineType: "umbrella" });
    const randomPlan = buildToolChangePlan({ ...baseReq, magazineType: "random-access" });
    // chain & umbrella both look-ahead (same physics in our model):
    assert.equal(chainPlan.summary.totalSavedSec, 7.5);
    assert.equal(umbrellaPlan.summary.totalSavedSec, 7.5);
    // random-access: no savings:
    assert.equal(randomPlan.summary.totalSavedSec, 0);
  });

  it("operations=[] → null", () => {
    assert.equal(buildToolChangePlan({ ...baseReq, operations: [] }), null);
  });

  it("magazineType unknown → null", () => {
    assert.equal(buildToolChangePlan({ ...baseReq, magazineType: "alien" }), null);
  });

  it("magazineSize=0 → null", () => {
    assert.equal(buildToolChangePlan({ ...baseReq, magazineSize: 0 }), null);
  });

  it("null req → null", () => {
    assert.equal(buildToolChangePlan(null), null);
  });

  it("missing slotAssignments → null", () => {
    const { slotAssignments: _, ...withoutSlots } = baseReq;
    assert.equal(buildToolChangePlan(withoutSlots), null);
  });
});

describe("emitTWordSequence", () => {
  const basePlan = buildToolChangePlan({
    operations: [
      { id: "op1", tool: 1, durationSec: 30 },
      { id: "op2", tool: 8, durationSec: 20 },
      { id: "op3", tool: 16, durationSec: 15 },
    ],
    slotAssignments: { 1: 1, 8: 8, 16: 16 },
    magazineType: "chain",
    magazineSize: 30,
  });

  it("fanuc dialect → first line is op1 N-sequence comment", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "fanuc" });
    assert.equal(lines[0].startsWith("N100 ( op op1 tool T1 slot 1 )"), true);
  });

  it("fanuc op1 emits T1 M06 swap (first tool needs swap from null)", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "fanuc" });
    const text = lines.join("\n");
    assert.equal(text.includes("T1 M06"), true);
  });

  it("fanuc op1 emits LOOK-AHEAD T8 annotation with savings", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "fanuc" });
    const text = lines.join("\n");
    assert.equal(text.includes("T8 ( LOOK-AHEAD slot 8 circDist=7 saves 3.50s )"), true);
  });

  it("fanuc op3 (last) has NO LOOK-AHEAD line", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "fanuc" });
    // count LOOK-AHEAD occurrences = 2 (after op1 & op2 only)
    const count = lines.filter((l) => l.includes("LOOK-AHEAD")).length;
    assert.equal(count, 2);
  });

  it("heidenhain dialect → 'TOOL CALL 1 Z' for first swap", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "heidenhain" });
    const text = lines.join("\n");
    assert.equal(text.includes("TOOL CALL 1 Z"), true);
  });

  it("heidenhain → 'TOOL DEF 8' look-ahead syntax", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "heidenhain" });
    const text = lines.join("\n");
    assert.equal(text.includes("TOOL DEF 8"), true);
  });

  it("siemens → 'T=1; M6' swap syntax", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "siemens" });
    const text = lines.join("\n");
    assert.equal(text.includes("T=1; M6"), true);
  });

  it("siemens look-ahead → 'T=8' line (no M6 on prefetch)", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "siemens" });
    // Find a line starting with "T=8 ;" (look-ahead, no M6)
    const lookahead = lines.find((l) => l.startsWith("T=8 ;"));
    assert.notEqual(lookahead, undefined);
  });

  it("haas dialect (Fanuc-like) → 'N{seq} T1 M06' pattern", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "haas" });
    const text = lines.join("\n");
    assert.equal(text.includes("T1 M06"), true);
  });

  it("mitsubishi dialect (Fanuc-like) → same pattern", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "mitsubishi" });
    const text = lines.join("\n");
    assert.equal(text.includes("T1 M06"), true);
  });

  it("error op → emits '( ERROR: ... )' line", () => {
    const errPlan = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 99, durationSec: 30 },
      ],
      slotAssignments: { 1: 1 },
      magazineType: "chain",
      magazineSize: 30,
    });
    const lines = emitTWordSequence({ plan: errPlan, dialect: "fanuc" });
    assert.equal(lines[0].includes("ERROR: op op1 tool-not-in-magazine"), true);
  });

  it("custom startSeq=500 → first Fanuc line N500", () => {
    const lines = emitTWordSequence({ plan: basePlan, dialect: "fanuc", startSeq: 500 });
    assert.equal(lines[0].startsWith("N500 "), true);
  });

  it("unknown dialect → null", () => {
    assert.equal(emitTWordSequence({ plan: basePlan, dialect: "mazak" }), null);
  });

  it("null plan → null", () => {
    assert.equal(emitTWordSequence({ dialect: "fanuc" }), null);
  });

  it("same-tool consecutive: no M06 between, no LOOK-AHEAD either", () => {
    const samePlan = buildToolChangePlan({
      operations: [
        { id: "op1", tool: 1, durationSec: 30 },
        { id: "op2", tool: 1, durationSec: 20 },
      ],
      slotAssignments: { 1: 1 },
      magazineType: "chain",
      magazineSize: 30,
    });
    const lines = emitTWordSequence({ plan: samePlan, dialect: "fanuc" });
    const text = lines.join("\n");
    // op1 has 1 swap (T1 M06), op2 has NONE (same tool):
    const swapCount = (text.match(/T1 M06/g) || []).length;
    assert.equal(swapCount, 1);
    assert.equal(text.includes("LOOK-AHEAD"), false);
  });
});

describe("magazineTWordOrder (end-to-end)", () => {
  const baseReq = {
    operations: [
      { id: "op1", tool: 1, durationSec: 30 },
      { id: "op2", tool: 8, durationSec: 20 },
      { id: "op3", tool: 16, durationSec: 15 },
    ],
    slotAssignments: { 1: 1, 8: 8, 16: 16 },
    magazineType: "chain",
    magazineSize: 30,
    rotationTimePerSlotSec: 0.5,
    dialect: "fanuc",
  };

  it("happy path → returns { plan, lines } both populated", () => {
    const r = magazineTWordOrder(baseReq);
    assert.notEqual(r, null);
    assert.equal(r.plan.ops.length, 3);
    assert.equal(r.plan.summary.totalSavedSec, 7.5);
    assert.equal(r.lines.length > 0, true);
  });

  it("E2E totalSavedSec = 7.5 in summary", () => {
    const r = magazineTWordOrder(baseReq);
    assert.equal(r.plan.summary.totalSavedSec, 7.5);
  });

  it("E2E line text contains LOOK-AHEAD with hand-checked savings 3.50s + 4.00s", () => {
    const r = magazineTWordOrder(baseReq);
    const text = r.lines.join("\n");
    assert.equal(text.includes("saves 3.50s"), true);
    assert.equal(text.includes("saves 4.00s"), true);
  });

  it("E2E dialect parity: chain mag with 3 dialects all emit non-null", () => {
    for (const dia of ["fanuc", "heidenhain", "siemens"]) {
      const r = magazineTWordOrder({ ...baseReq, dialect: dia });
      assert.notEqual(r, null);
      assert.equal(r.plan.summary.totalSavedSec, 7.5);
    }
  });

  it("E2E random-access mag → 0 lookahead → 0 saved", () => {
    const r = magazineTWordOrder({ ...baseReq, magazineType: "random-access" });
    assert.equal(r.plan.summary.totalSavedSec, 0);
    assert.equal(r.plan.summary.lookAheadEmitCount, 0);
  });

  it("E2E invalid dialect → null", () => {
    assert.equal(magazineTWordOrder({ ...baseReq, dialect: "mazak" }), null);
  });

  it("E2E invalid magazineType → null", () => {
    assert.equal(magazineTWordOrder({ ...baseReq, magazineType: "alien" }), null);
  });

  it("E2E null req → null", () => {
    assert.equal(magazineTWordOrder(null), null);
  });
});

describe("REGRESSION: circular-magazine symmetry — circDist(a,b) == circDist(b,a)", () => {
  for (const [a, b, n] of [[1, 8, 30], [3, 25, 30], [1, 16, 30], [10, 11, 21]]) {
    it(`symmetry holds for slot ${a} ↔ ${b} in ${n}-slot magazine`, () => {
      assert.equal(circularDistance(a, b, n), circularDistance(b, a, n));
    });
  }
});

describe("REGRESSION: savings monotonicity — longer ops cannot REDUCE savings", () => {
  it("op duration 5s → 30s: saved increases or stays same", () => {
    const baseOps = [
      { id: "op1", tool: 1, durationSec: 5 },
      { id: "op2", tool: 16, durationSec: 10 },
    ];
    const shortReq = {
      operations: baseOps,
      slotAssignments: { 1: 1, 16: 16 },
      magazineType: "chain",
      magazineSize: 30,
      rotationTimePerSlotSec: 0.5,
    };
    const longReq = {
      ...shortReq,
      operations: [
        { id: "op1", tool: 1, durationSec: 30 },
        { id: "op2", tool: 16, durationSec: 10 },
      ],
    };
    const short = buildToolChangePlan(shortReq);
    const long = buildToolChangePlan(longReq);
    assert.equal(long.ops[0].savedSec >= short.ops[0].savedSec, true);
  });
});
