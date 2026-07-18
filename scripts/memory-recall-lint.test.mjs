// Tests for memory-recall-lint.mjs — per-galaxy recall-readiness analyzer.
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  analyzeRecallReadiness, renderMarkdown, THIN_BRAIN_CHARS, RECALL_BLIND_OPENING,
} from "./memory-recall-lint.mjs";

const richBrain = { namespace: "galaxies", name: "mill", description: "Mill galaxy brain", opening: "x".repeat(200) };
const thinBrain = { namespace: "galaxies", name: "lathe", description: "", opening: "turning" }; // 7 chars
const goodMemo = { namespace: "reference", name: "a", description: "a well described memory", opening: "body" };
const noDescMemo = { namespace: "reference", name: "b", description: "", opening: "x".repeat(40) };       // has opening
const blindMemo = { namespace: "feedback", name: "c", description: "", opening: "" };                     // recall-blind
const supersededDescMemo = { namespace: "feedback", name: "old", description: "[SUPERSEDED 2026-01-01 → [[new]]] stale", opening: "" };

describe("analyzeRecallReadiness", () => {
  it("counts totals + missing-description + recall-blind correctly", () => {
    const r = analyzeRecallReadiness([goodMemo, noDescMemo, blindMemo], ["mill"]);
    assert.equal(r.total, 3);
    assert.equal(r.missingDescription, 2);   // noDescMemo + blindMemo
    assert.equal(r.recallBlind, 1);          // only blindMemo (no desc AND no opening)
  });

  it("flags missing + thin galaxy brains; passes rich ones", () => {
    const r = analyzeRecallReadiness([richBrain, thinBrain], ["mill", "lathe", "cad"]);
    assert.deepEqual(r.missingBrains, ["cad"]);          // no record for cad
    assert.deepEqual(r.thinBrains, ["lathe"]);           // present but signal < THIN_BRAIN_CHARS
    const mill = r.galaxyScores.find((g) => g.galaxy === "mill");
    assert.equal(mill.thin, false);                      // 200+ char opening
  });

  it("dedupes the galaxy list (slot-galaxy-map has shared galaxies)", () => {
    const r = analyzeRecallReadiness([richBrain], ["mill", "mill", "lathe"]);
    assert.equal(r.galaxyCount, 2);
  });

  it("surfaces a superseded marker leaked into the sidecar (should be 0 in prod)", () => {
    const r = analyzeRecallReadiness([goodMemo, supersededDescMemo], ["mill"]);
    assert.equal(r.supersededLeaked, 1);
  });

  it("per-namespace breakdown is populated", () => {
    const r = analyzeRecallReadiness([goodMemo, noDescMemo, blindMemo], []);
    assert.equal(r.byNamespace.reference.total, 2);
    assert.equal(r.byNamespace.reference.missingDescription, 1);
    assert.equal(r.byNamespace.feedback.recallBlind, 1);
  });

  it("is null/empty-safe", () => {
    const r = analyzeRecallReadiness(null, null);
    assert.equal(r.total, 0);
    assert.equal(r.galaxyCount, 0);
    assert.deepEqual(r.missingBrains, []);
  });

  it("exposes sane thresholds", () => {
    assert.equal(THIN_BRAIN_CHARS, 80);
    assert.equal(RECALL_BLIND_OPENING, 20);
  });
});

describe("renderMarkdown", () => {
  it("renders a scorecard with the galaxy table + namespace table", () => {
    const r = analyzeRecallReadiness([richBrain, thinBrain, blindMemo], ["mill", "lathe", "cad"]);
    const md = renderMarkdown(r, { builtAt: "2026-06-01T00:00:00Z" });
    assert.ok(md.includes("# Memory recall-readiness scorecard"));
    assert.ok(md.includes("Missing brains"));
    assert.ok(md.includes("cad"));        // the missing brain is named
    assert.ok(md.includes("lathe"));      // the thin brain is named
    assert.ok(md.includes("| namespace | total"));
  });
});
