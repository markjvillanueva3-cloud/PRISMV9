// Hermetic tests for U-LATHE-G76-THREAD-VALIDATOR
// Design memo: reference_lathe_g76_thread_validator_design_2026_05_27
//
// Test scaffold ships BEFORE the validator engine — defines the contract first.
// Next-session task: implement validateG76Thread to make these pass.
//
// Run: node --test scripts/lib/lathe-g76-thread-validator.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateG76Thread } from "./lathe-g76-thread-validator.mjs";

const PARSED_OK_FANUC_60DEG = {
  controller: "fanuc",
  blocks: [
    { idx: 0, text: "G50 S3200", g: "G50" },
    { idx: 1, text: "T0303 M06" },
    { idx: 2, text: "G96 S180 M03" },
    { idx: 3, text: "G00 X32.0 Z2.0" },
    { idx: 4, text: "G76 P020060 Q50 R0.003", g: "G76", p: "020060", q: 50, r: 0.003 },
    { idx: 5, text: "G76 X28.0 Z-25.0 P1300 Q300 F2.0", g: "G76", x: 28.0, z: -25.0, p: 1300, q: 300, f: 2.0 },
    { idx: 6, text: "G00 X100.0 Z100.0" }
  ]
};

const PARSED_BAD_DEPTH_GT_PITCH = {
  controller: "fanuc",
  blocks: [
    { idx: 0, text: "G50 S3200", g: "G50" },
    { idx: 1, text: "G96 S180 M03" },
    { idx: 2, text: "G76 P020060 Q50 R0.003", g: "G76", p: "020060", q: 50, r: 0.003 },
    { idx: 3, text: "G76 X28.0 Z-25.0 P3000 Q300 F2.0", g: "G76", x: 28.0, z: -25.0, p: 3000, q: 300, f: 2.0 }
  ]
};

const PARSED_NO_G50_ON_G96 = {
  controller: "fanuc",
  blocks: [
    { idx: 0, text: "G96 S180 M03" },
    { idx: 1, text: "G76 X28.0 Z-25.0 P1300 Q300 F2.0", g: "G76", x: 28.0, z: -25.0, p: 1300, q: 300, f: 2.0 }
  ]
};

const PARSED_FEED_PER_MIN_ON_THREAD = {
  controller: "haas",
  blocks: [
    { idx: 0, text: "G50 S3200", g: "G50" },
    { idx: 1, text: "G98", g: "G98" },
    { idx: 2, text: "G76 X28.0 Z-25.0 P1300 Q300 F2.0", g: "G76" }
  ]
};

const PARSED_DEPRECATED_G92 = {
  controller: "fanuc",
  blocks: [
    { idx: 0, text: "G50 S3200", g: "G50" },
    { idx: 1, text: "G99", g: "G99" },
    { idx: 2, text: "G92 X28.0 Z-25.0 F2.0", g: "G92" }
  ]
};

const CTX_STEEL = { iso_group: "P", controller: "fanuc", material_grade: "AISI-1045" };
const CTX_STAINLESS = { iso_group: "M", controller: "fanuc", material_grade: "AISI-304" };
const CTX_HAAS_NGC = { iso_group: "P", controller: "haas", material_grade: "AISI-1045" };

describe("validateG76Thread (per reference_lathe_g76_thread_validator_design_2026_05_27)", () => {
  it("passes a clean Fanuc G76 60° thread on steel", () => {
    const r = validateG76Thread(PARSED_OK_FANUC_60DEG, CTX_STEEL);
    assert.equal(r.all_passed, true, "clean thread should pass all 7 rules");
    assert.equal(r.thread_block_count, 1, "one full thread (paired 2-line G76)");
    assert.equal(r.issues.length, 0);
  });

  it("rule 1: flags depth > pitch as P0 critical", () => {
    const r = validateG76Thread(PARSED_BAD_DEPTH_GT_PITCH, CTX_STEEL);
    const p0 = r.issues.filter(i => i.severity === "P0");
    assert.ok(p0.length >= 1, "depth > pitch must surface P0");
    assert.ok(p0.some(i => /depth/i.test(i.rule)), "rule name should reference depth");
  });

  it("rule 7: flags G98 (feed/min) while threading as P0", () => {
    const r = validateG76Thread(PARSED_FEED_PER_MIN_ON_THREAD, CTX_HAAS_NGC);
    const p0 = r.issues.filter(i => i.severity === "P0");
    assert.ok(p0.length >= 1, "G98 + G76 must surface P0");
    assert.ok(p0.some(i => /feed.?mode|G98|G99/i.test(i.rule)));
  });

  it("rule 6: flags G92 thread as P1 deprecated (works but amateur)", () => {
    const r = validateG76Thread(PARSED_DEPRECATED_G92, CTX_STEEL);
    const p1 = r.issues.filter(i => i.severity === "P1");
    assert.ok(p1.length >= 1, "G92 thread when G76 available should be P1");
    assert.ok(p1.some(i => /G92/i.test(i.rule)));
  });

  it("missing G50 alongside G96 with thread → independent rule (validatePhysics' job, not this validator)", () => {
    // This validator focuses on thread-specific defects.
    // Missing G50 is caught by validatePhysics in the outer pipeline.
    const r = validateG76Thread(PARSED_NO_G50_ON_G96, CTX_STEEL);
    // No assertion about G50 here — but the validator must still run and not throw.
    assert.ok(Array.isArray(r.issues));
    assert.equal(typeof r.all_passed, "boolean");
  });

  it("issue shape contract: each issue carries severity/rule/block_index/message/suggestion", () => {
    const r = validateG76Thread(PARSED_BAD_DEPTH_GT_PITCH, CTX_STEEL);
    for (const issue of r.issues) {
      assert.ok(["P0", "P1", "P2"].includes(issue.severity), "severity must be P0|P1|P2");
      assert.equal(typeof issue.rule, "string");
      assert.equal(typeof issue.block_index, "number");
      assert.equal(typeof issue.message, "string");
      assert.equal(typeof issue.suggestion, "string", "every issue must have a controller-aware concrete fix");
    }
  });

  it("zero-thread program returns thread_block_count=0 + all_passed=true (vacuously)", () => {
    const r = validateG76Thread({ controller: "fanuc", blocks: [{ idx: 0, text: "G00 X10 Z0" }] }, CTX_STEEL);
    assert.equal(r.thread_block_count, 0);
    assert.equal(r.all_passed, true);
    assert.equal(r.issues.length, 0);
  });
});
