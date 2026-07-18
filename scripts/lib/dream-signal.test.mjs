// scripts/lib/dream-signal.test.mjs
// node --test scripts/lib/dream-signal.test.mjs
//
// Real-value tests for the dream-signal helpers (HSE06 wire). Happy path +
// >=3 failure modes + >=2 adversarial per the comprehensive-build floor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  collectRecentCorrections,
  readSoulRefuseList,
  aggregateErrorPatterns,
  enumerateSoulSlots,
  buildProposalRequest,
  buildDreamDoc,
  hasProposals,
} from "./dream-signal.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "dream-signal-"));
}

// ---------------------------------------------------------------- collectRecentCorrections
test("collectRecentCorrections: happy -- recent feedback memory description", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "feedback_x.md"), "---\ndescription: always check units first\n---\nbody");
    const out = collectRecentCorrections({ memoryDir: dir, horizonMs: 60_000, now: Date.now() });
    assert.equal(out.length, 1);
    assert.equal(out[0].text, "always check units first");
    assert.equal(out[0].source, "feedback_x.md");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("collectRecentCorrections: failure -- file older than horizon excluded", () => {
  const dir = tmp();
  try {
    const f = join(dir, "feedback_old.md");
    writeFileSync(f, "description: stale correction\n");
    const past = new Date("2020-01-01T00:00:00Z");
    utimesSync(f, past, past);
    const out = collectRecentCorrections({ memoryDir: dir, horizonMs: 1000, now: Date.now() });
    assert.equal(out.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("collectRecentCorrections: failure -- missing dir returns []", () => {
  assert.deepEqual(collectRecentCorrections({ memoryDir: join(tmpdir(), "no-such-dir-xyz"), horizonMs: 60_000 }), []);
});

test("collectRecentCorrections: failure -- non-md and no-description files skipped", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "notes.txt"), "description: ignored (not md)");
    writeFileSync(join(dir, "feedback_nodesc.md"), "# heading only, no description line");
    const out = collectRecentCorrections({ memoryDir: dir, horizonMs: 60_000, now: Date.now() });
    assert.equal(out.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- readSoulRefuseList
test("readSoulRefuseList: happy -- parses frontmatter refuse_list", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "bravo.md"), "---\nslot: bravo\nrefuse_list:\n  - stub-engine-creation\n  - weak-test-assertions\npreferred_subagent_type: reviewer\n---\nbody");
    const out = readSoulRefuseList({ soulsDir: dir, slot: "bravo" });
    assert.deepEqual(out, ["stub-engine-creation", "weak-test-assertions"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readSoulRefuseList: failure -- missing soul returns []", () => {
  const dir = tmp();
  try {
    assert.deepEqual(readSoulRefuseList({ soulsDir: dir, slot: "ghost" }), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readSoulRefuseList: failure -- soul without refuse_list returns []", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "x.md"), "---\nslot: x\nrole: builder\n---\nbody");
    assert.deepEqual(readSoulRefuseList({ soulsDir: dir, slot: "x" }), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- aggregateErrorPatterns
test("aggregateErrorPatterns: happy -- counts by trigger, sorted desc", () => {
  const dir = tmp();
  try {
    const f = join(dir, "ledger.jsonl");
    writeFileSync(f, [
      JSON.stringify({ trigger: "git-lock-contention", error_class: "tool_error" }),
      JSON.stringify({ trigger: "git-lock-contention", error_class: "tool_error" }),
      JSON.stringify({ trigger: "test-fail", error_class: "test_fail" }),
    ].join("\n") + "\n");
    const out = aggregateErrorPatterns({ ledgerPath: f, minCount: 1 });
    assert.deepEqual(out, [
      { pattern: "git-lock-contention", count: 2 },
      { pattern: "test-fail", count: 1 },
    ]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("aggregateErrorPatterns: error_class fallback when trigger missing", () => {
  const dir = tmp();
  try {
    const f = join(dir, "ledger.jsonl");
    writeFileSync(f, [
      JSON.stringify({ error_class: "tsc" }),
      JSON.stringify({ trigger: "", error_class: "tsc" }),
    ].join("\n") + "\n");
    const out = aggregateErrorPatterns({ ledgerPath: f, minCount: 1 });
    assert.deepEqual(out, [{ pattern: "tsc", count: 2 }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("aggregateErrorPatterns: failure -- minCount drops one-offs", () => {
  const dir = tmp();
  try {
    const f = join(dir, "ledger.jsonl");
    writeFileSync(f, [
      JSON.stringify({ trigger: "rare" }),
      JSON.stringify({ trigger: "common" }),
      JSON.stringify({ trigger: "common" }),
    ].join("\n") + "\n");
    const out = aggregateErrorPatterns({ ledgerPath: f, minCount: 2 });
    assert.deepEqual(out, [{ pattern: "common", count: 2 }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("aggregateErrorPatterns: adversarial -- bad json + blank lines + no-pattern skipped", () => {
  const dir = tmp();
  try {
    const f = join(dir, "ledger.jsonl");
    writeFileSync(f, [
      "not json at all",
      "",
      JSON.stringify({ snippet: "no trigger no class" }),
      JSON.stringify({ trigger: "real" }),
      "   ",
    ].join("\n") + "\n");
    const out = aggregateErrorPatterns({ ledgerPath: f, minCount: 1 });
    assert.deepEqual(out, [{ pattern: "real", count: 1 }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("aggregateErrorPatterns: adversarial -- limit caps and keeps highest counts", () => {
  const dir = tmp();
  try {
    const f = join(dir, "ledger.jsonl");
    const lines = [];
    for (let i = 0; i < 3; i++) lines.push(JSON.stringify({ trigger: "high" }));
    lines.push(JSON.stringify({ trigger: "low" }));
    writeFileSync(f, lines.join("\n") + "\n");
    const out = aggregateErrorPatterns({ ledgerPath: f, minCount: 1, limit: 1 });
    assert.equal(out.length, 1);
    assert.equal(out[0].pattern, "high");
    assert.equal(out[0].count, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("aggregateErrorPatterns: failure -- missing ledger returns []", () => {
  assert.deepEqual(aggregateErrorPatterns({ ledgerPath: join(tmpdir(), "no-ledger-xyz.jsonl") }), []);
});

// ---------------------------------------------------------------- enumerateSoulSlots
test("enumerateSoulSlots: happy -- excludes README and .draft.md, sorts", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "bravo.md"), "x");
    writeFileSync(join(dir, "alpha.md"), "x");
    writeFileSync(join(dir, "README.md"), "x");
    writeFileSync(join(dir, "alpha.draft.md"), "x");
    writeFileSync(join(dir, "alpha.html"), "x");
    const out = enumerateSoulSlots({ soulsDir: dir });
    assert.deepEqual(out, ["alpha", "bravo"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("enumerateSoulSlots: failure -- missing dir returns []", () => {
  assert.deepEqual(enumerateSoulSlots({ soulsDir: join(tmpdir(), "no-souls-xyz") }), []);
});

// ---------------------------------------------------------------- buildProposalRequest
test("buildProposalRequest: clamps source>60, drops empty text, keeps shape", () => {
  const longSource = "f".repeat(120);
  const req = buildProposalRequest({
    slot: "bravo",
    corrections: [
      { text: "valid correction", source: longSource },
      { text: "", source: "empty.md" },
    ],
    errorPatterns: [{ pattern: "p", count: 5 }],
    refuseList: ["a", "b"],
  });
  assert.equal(req.slot, "bravo");
  assert.equal(req.corrections.length, 1, "empty-text correction dropped");
  assert.equal(req.corrections[0].source.length, 60, "source clamped to 60");
  assert.deepEqual(req.current_refuse_list, ["a", "b"]);
});

test("buildProposalRequest: adversarial -- NaN/oversize counts normalized", () => {
  const req = buildProposalRequest({
    slot: "x",
    corrections: [],
    errorPatterns: [
      { pattern: "nan", count: NaN },
      { pattern: "huge", count: 999999 },
      { pattern: "frac", count: 0.4 },
      { pattern: "", count: 5 },
    ],
  });
  const byPat = Object.fromEntries(req.error_patterns.map((e) => [e.pattern, e.count]));
  assert.equal(byPat["nan"], 1, "NaN -> 1");
  assert.equal(byPat["huge"], 10_000, "oversize -> 10000 cap");
  assert.equal(byPat["frac"], 1, "0.4 rounds to 0 then floored to min 1");
  assert.equal(byPat[""], undefined, "empty pattern dropped");
});

test("buildProposalRequest: adversarial -- >200 corrections and >40 refuse clamped", () => {
  const corrections = Array.from({ length: 250 }, (_, i) => ({ text: `c${i}`, source: "s.md" }));
  const refuseList = Array.from({ length: 60 }, (_, i) => `r${i}`);
  const req = buildProposalRequest({ slot: "x", corrections, errorPatterns: [], refuseList });
  assert.equal(req.corrections.length, 200);
  assert.equal(req.current_refuse_list.length, 40);
});

test("buildProposalRequest: min_repetitions clamped to [1,20]", () => {
  assert.equal(buildProposalRequest({ slot: "x", corrections: [], errorPatterns: [], refuseList: [], minRepetitions: 99 }).min_repetitions, 20);
  assert.equal(buildProposalRequest({ slot: "x", corrections: [], errorPatterns: [], refuseList: [], minRepetitions: 0 }).min_repetitions, 1);
});

// ---------------------------------------------------------------- buildDreamDoc / hasProposals
test("buildDreamDoc: maps engine batch into surfaced doc shape", () => {
  const batch = { slot: "bravo", refuse_rules: [{ rule: "r", observed_count: 3 }], skills: [], filtered_correction_count: 4 };
  const doc = buildDreamDoc({ batch, date: "2026-06-10", now: "2026-06-10T00:00:00Z" });
  assert.equal(doc.slot, "bravo");
  assert.equal(doc.date, "2026-06-10");
  assert.equal(doc.schemaVersion, "1.0.0");
  assert.equal(doc.batch.refuse_rules[0].rule, "r");
  assert.equal(doc.batch.filtered_correction_count, 4);
});

test("buildDreamDoc: defaults missing batch fields", () => {
  const doc = buildDreamDoc({ batch: { slot: "x" }, date: "2026-06-10" });
  assert.deepEqual(doc.batch.refuse_rules, []);
  assert.deepEqual(doc.batch.skills, []);
  assert.equal(doc.batch.filtered_correction_count, 0);
});

test("hasProposals: true when refuse_rules or skills present, false when empty", () => {
  assert.equal(hasProposals({ refuse_rules: [{ rule: "r" }], skills: [] }), true);
  assert.equal(hasProposals({ refuse_rules: [], skills: [{ name: "s" }] }), true);
  assert.equal(hasProposals({ refuse_rules: [], skills: [] }), false);
  assert.equal(hasProposals(undefined), false);
});
