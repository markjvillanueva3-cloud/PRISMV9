// Test -- skill-stage.mjs pure planning core (the PRISM skill write-approval gate).
// Covers the deterministic plan/helper functions (stampMs+seq injected -> no Date impurity).
// Run: node scripts/skill-stage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyManifest, normalizeSkillName, makeStageId, findEntry, pendingEntries,
  planStage, planApprove, planReject, lineDiff, SCHEMA_VERSION,
} from "./skill-stage.mjs";

// ── normalizeSkillName ──
test("normalizeSkillName: accepts a simple slug + strips .md + lowercases", () => {
  assert.equal(normalizeSkillName("My-Skill.md"), "my-skill");
  assert.equal(normalizeSkillName("learn-skill"), "learn-skill");
});
test("normalizeSkillName: accepts ONE namespace segment", () => {
  assert.equal(normalizeSkillName("sparc/ask"), "sparc/ask");
});
test("normalizeSkillName: rejects traversal / leading-slash / double-slash / bad chars", () => {
  for (const bad of ["../evil", "/abs", "a//b", "a/b/c", "has space", "UPPER ONLY!", "", 42, null]) {
    assert.equal(normalizeSkillName(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

// ── makeStageId (deterministic) ──
test("makeStageId: deterministic + slug-safe", () => {
  assert.equal(makeStageId("my/skill", 1000, 3), "stg-my-skill-1000-3");
  assert.equal(makeStageId("a b c", 5, 0), "stg-a-b-c-5-0");
});

// ── planStage ──
test("planStage: appends a pending entry with the deterministic id + new flag", () => {
  const out = planStage(emptyManifest(), { name: "Foo-Bar", liveExists: false, stampMs: 100, seq: 0 });
  assert.equal(out.error, undefined);
  assert.equal(out.manifest.entries.length, 1);
  const e = out.entry;
  assert.equal(e.id, "stg-foo-bar-100-0");
  assert.equal(e.name, "foo-bar");
  assert.equal(e.status, "pending");
  assert.equal(e.overwrite, false);
  assert.equal(e.stagedRel, ".claude/commands-staged/foo-bar.md");
  assert.equal(e.liveRel, ".claude/commands/foo-bar.md");
  assert.equal(out.manifest.schemaVersion, SCHEMA_VERSION);
});
test("planStage: liveExists=true marks the entry as an OVERWRITE", () => {
  const out = planStage(emptyManifest(), { name: "dedup", liveExists: true, stampMs: 1, seq: 0 });
  assert.equal(out.entry.overwrite, true);
});
test("planStage: rejects an invalid name (no fs write planned)", () => {
  const out = planStage(emptyManifest(), { name: "../escape", stampMs: 1, seq: 0 });
  assert.ok(out.error && /invalid skill name/.test(out.error));
  assert.equal(out.entry, undefined);
});
test("planStage: rejects non-numeric stamp / negative seq (adversarial)", () => {
  assert.ok(planStage(emptyManifest(), { name: "x", stampMs: NaN, seq: 0 }).error);
  assert.ok(planStage(emptyManifest(), { name: "x", stampMs: 1, seq: -1 }).error);
  assert.ok(planStage(emptyManifest(), { name: "x", stampMs: 1, seq: 1.5 }).error);
});
test("planStage: preserves prior entries (immutable append)", () => {
  const m1 = planStage(emptyManifest(), { name: "a", stampMs: 1, seq: 0 }).manifest;
  const m2 = planStage(m1, { name: "b", stampMs: 2, seq: 1 }).manifest;
  assert.equal(m2.entries.length, 2);
  assert.equal(m2.entries[0].name, "a");
  assert.equal(m2.entries[1].name, "b");
});

// ── planApprove / planReject (pending guard) ──
function seed() {
  return planStage(emptyManifest(), { name: "cand", liveExists: false, stampMs: 7, seq: 0 });
}
test("planApprove: flips a pending entry to approved", () => {
  const { manifest, entry } = seed();
  const out = planApprove(manifest, entry.id);
  assert.equal(out.error, undefined);
  assert.equal(findEntry(out.manifest, entry.id).status, "approved");
});
test("planReject: flips a pending entry to rejected", () => {
  const { manifest, entry } = seed();
  const out = planReject(manifest, entry.id);
  assert.equal(out.error, undefined);
  assert.equal(findEntry(out.manifest, entry.id).status, "rejected");
});
test("planApprove: errors on unknown id", () => {
  assert.ok(planApprove(emptyManifest(), "stg-nope-1-0").error);
});
test("planApprove: refuses a non-pending entry (no double-approve)", () => {
  const { manifest, entry } = seed();
  const approved = planApprove(manifest, entry.id).manifest;
  const again = planApprove(approved, entry.id);
  assert.ok(again.error && /already approved/.test(again.error));
});
test("planReject: refuses an already-approved entry (only pending can be rejected)", () => {
  const { manifest, entry } = seed();
  const approved = planApprove(manifest, entry.id).manifest;
  const out = planReject(approved, entry.id);
  assert.ok(out.error && /already approved/.test(out.error));
});

// ── pendingEntries / findEntry ──
test("pendingEntries: returns ONLY pending; approved/rejected excluded", () => {
  let { manifest } = planStage(emptyManifest(), { name: "p1", stampMs: 1, seq: 0 });
  manifest = planStage(manifest, { name: "p2", stampMs: 2, seq: 1 }).manifest;
  manifest = planStage(manifest, { name: "p3", stampMs: 3, seq: 2 }).manifest;
  manifest = planApprove(manifest, "stg-p2-2-1").manifest;
  manifest = planReject(manifest, "stg-p3-3-2").manifest;
  const pend = pendingEntries(manifest);
  assert.equal(pend.length, 1);
  assert.equal(pend[0].name, "p1");
});
test("pendingEntries / findEntry: tolerate empty/garbage manifests (never throw)", () => {
  assert.deepEqual(pendingEntries(null), []);
  assert.deepEqual(pendingEntries({}), []);
  assert.equal(findEntry(null, "x"), null);
});

// ── lineDiff ──
test("lineDiff: reports added + removed lines (overwrite review)", () => {
  const d = lineDiff("alpha\nbravo\ncharlie", "alpha\nbravo\ndelta");
  assert.deepEqual(d.added, ["delta"]);
  assert.deepEqual(d.removed, ["charlie"]);
});
test("lineDiff: identical bodies -> no changes", () => {
  const d = lineDiff("same\nlines", "same\nlines");
  assert.deepEqual(d.added, []);
  assert.deepEqual(d.removed, []);
});
