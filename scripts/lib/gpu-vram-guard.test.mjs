// gpu-vram-guard.test.mjs - pure-function unit tests for the VRAM admission lib.
//
// R9/R15: reference values + algebraic invariants, happy + >=3 failure modes +
// >=2 adversarial inputs. readGpuVram is tested with an INJECTED runner so no
// live GPU is required (deterministic).
//
// Run: node --test H:/prism/scripts/lib/gpu-vram-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseModelParamB,
  isHeavyInferenceLaunch,
  estimateFootprintMib,
  assessAdmission,
  readGpuVram,
  MIB_PER_BILLION_PARAMS,
  KV_CACHE_PAD_MIB,
  DEFAULT_FLOOR_PCT,
} from "./gpu-vram-guard.mjs";

// --- parseModelParamB --------------------------------------------------------
test("parseModelParamB: happy - single tag", () => {
  assert.equal(parseModelParamB("ollama run gpt-oss:120b"), 120);
});
test("parseModelParamB: returns MAX of multiple tags", () => {
  assert.equal(parseModelParamB("compare :32b vs gpt-oss:120b and :7b"), 120);
});
test("parseModelParamB: no tag -> null", () => {
  assert.equal(parseModelParamB("ollama list"), null);
});
test("parseModelParamB: empty / non-string -> null (failure modes)", () => {
  assert.equal(parseModelParamB(""), null);
  assert.equal(parseModelParamB(null), null);
  assert.equal(parseModelParamB(undefined), null);
  assert.equal(parseModelParamB(123), null);
});
test("parseModelParamB: adversarial - boundary tags", () => {
  assert.equal(parseModelParamB("x:1b"), 1);
  assert.equal(parseModelParamB("x:999b"), 999);
  // not a param tag: must be ":<digits>b" with a word boundary
  assert.equal(parseModelParamB("table:bench"), null);
});

// --- isHeavyInferenceLaunch --------------------------------------------------
test("isHeavyInferenceLaunch: happy - ollama run heavy", () => {
  const r = isHeavyInferenceLaunch("ollama run gpt-oss:120b");
  assert.equal(r.heavy, true);
  assert.equal(r.modelParamB, 120);
});
test("isHeavyInferenceLaunch: happy - curl /api/generate heavy", () => {
  const cmd = `curl -s http://127.0.0.1:11434/api/generate -d '{"model":"gpt-oss:120b"}'`;
  assert.equal(isHeavyInferenceLaunch(cmd).heavy, true);
});
test("isHeavyInferenceLaunch: below heavy floor -> not heavy", () => {
  // 7b model: real inference context, but under the 20b floor.
  assert.equal(isHeavyInferenceLaunch("ollama run qwen2.5-coder:7b").heavy, false);
});
test("isHeavyInferenceLaunch: no inference context -> not heavy (adversarial)", () => {
  // model tag present but NOT an inference launch (a doc / echo).
  assert.equal(isHeavyInferenceLaunch("echo 'see gpt-oss:120b in the readme'").heavy, false);
});
test("isHeavyInferenceLaunch: empty / unrelated -> not heavy (failure modes)", () => {
  assert.equal(isHeavyInferenceLaunch("").heavy, false);
  assert.equal(isHeavyInferenceLaunch("ls -la /tmp").heavy, false);
  assert.equal(isHeavyInferenceLaunch("ollama ps").heavy, false); // context but no model tag
});

// --- estimateFootprintMib ----------------------------------------------------
test("estimateFootprintMib: reference values", () => {
  assert.equal(estimateFootprintMib(120), 120 * MIB_PER_BILLION_PARAMS + KV_CACHE_PAD_MIB); // 80048
  assert.equal(estimateFootprintMib(32), 32 * MIB_PER_BILLION_PARAMS + KV_CACHE_PAD_MIB); // 22848
});
test("estimateFootprintMib: invalid -> null (failure modes)", () => {
  assert.equal(estimateFootprintMib(null), null);
  assert.equal(estimateFootprintMib(0), null);
  assert.equal(estimateFootprintMib(-5), null);
  assert.equal(estimateFootprintMib("32"), null);
});

// --- assessAdmission ---------------------------------------------------------
test("assessAdmission: happy - low pressure + small model fits -> admit", () => {
  const d = assessAdmission({ usedMb: 5000, totalMb: 97887, modelParamB: 32 });
  assert.equal(d.admit, true);
  assert.equal(d.overFloor, false);
  assert.equal(d.wouldExceedFree, false);
});
test("assessAdmission: LIVE case - 88.5% used, 120b load -> warn via wouldExceedFree", () => {
  // The real 2026-06-10 reading: below the 90% floor, but 60GB+ won't fit in 11GB free.
  const d = assessAdmission({ usedMb: 86647, totalMb: 97887, modelParamB: 120 });
  assert.equal(d.overFloor, false, "88.5% is below the 90% floor");
  assert.equal(d.wouldExceedFree, true, "80GB est footprint cannot fit 11GB free");
  assert.equal(d.admit, false);
  assert.equal(d.pressurePct, 88.5);
  assert.equal(d.freeMb, 11240);
});
test("assessAdmission: over pressure floor -> warn (failure mode)", () => {
  const d = assessAdmission({ usedMb: 90000, totalMb: 97887, modelParamB: 32 });
  assert.equal(d.overFloor, true);
  assert.equal(d.admit, false);
});
test("assessAdmission: unknown model size below floor -> admit (footprint check skipped)", () => {
  const d = assessAdmission({ usedMb: 50000, totalMb: 97887, modelParamB: null });
  assert.equal(d.estFootprintMb, null);
  assert.equal(d.wouldExceedFree, false);
  assert.equal(d.admit, true);
});
test("assessAdmission: unknown model size OVER floor -> warn (floor-only path)", () => {
  const d = assessAdmission({ usedMb: 95000, totalMb: 97887, modelParamB: null });
  assert.equal(d.overFloor, true);
  assert.equal(d.admit, false);
});
test("assessAdmission: custom floorPct tightens the gate", () => {
  const d = assessAdmission({ usedMb: 85000, totalMb: 97887, modelParamB: 7, floorPct: 80 });
  assert.equal(d.overFloor, true, "86.8% over the custom 80% floor");
  assert.equal(d.admit, false);
});
test("assessAdmission: invalid VRAM -> fail-open admit (adversarial)", () => {
  assert.equal(assessAdmission({ usedMb: 100, totalMb: 0, modelParamB: 120 }).admit, true);
  assert.equal(assessAdmission({ usedMb: NaN, totalMb: 97887, modelParamB: 120 }).admit, true);
});
test("assessAdmission: default floor is DEFAULT_FLOOR_PCT", () => {
  const d = assessAdmission({ usedMb: 88200, totalMb: 97887, modelParamB: null }); // 90.1%
  assert.ok(d.pressurePct >= DEFAULT_FLOOR_PCT);
  assert.equal(d.admit, false);
});

// --- readGpuVram (injected runner) -------------------------------------------
test("readGpuVram: happy - parses one GPU line", () => {
  const runner = () => ({ status: 0, stdout: "86647, 97887, 14\n", error: null });
  const r = readGpuVram({ runner });
  assert.equal(r.ok, true);
  assert.equal(r.usedMb, 86647);
  assert.equal(r.totalMb, 97887);
  assert.equal(r.freeMb, 11240);
  assert.equal(r.utilPct, 14);
});
test("readGpuVram: multi-GPU picks HIGHEST pressure (most conservative)", () => {
  const runner = () => ({ status: 0, stdout: "1000, 10000, 5\n9000, 10000, 50\n", error: null });
  const r = readGpuVram({ runner });
  assert.equal(r.ok, true);
  assert.equal(r.usedMb, 9000);
});
test("readGpuVram: runner null / error / throw -> ok:false (failure modes)", () => {
  assert.equal(readGpuVram({ runner: () => null }).ok, false);
  assert.equal(readGpuVram({ runner: () => ({ error: { message: "ENOENT" } }) }).ok, false);
  assert.equal(readGpuVram({ runner: () => { throw new Error("boom"); } }).ok, false);
});
test("readGpuVram: garbage / empty stdout -> ok:false (adversarial)", () => {
  assert.equal(readGpuVram({ runner: () => ({ status: 0, stdout: "garbage no commas\n" }) }).ok, false);
  assert.equal(readGpuVram({ runner: () => ({ status: 0, stdout: "" }) }).ok, false);
  assert.equal(readGpuVram({ runner: () => ({ status: 9, stdout: "" }) }).ok, false);
});
