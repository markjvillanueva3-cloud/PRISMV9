import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderUnwiredEngine } from "./generate-unwired-engine-wiki.mjs";

// Tests for renderUnwiredEngine — the pure markdown-rendering core of the
// unwired-engine wiki generator. Hermetic fixtures, no filesystem dependency
// beyond guessSourcePath (which gracefully falls back when source not found).

describe("renderUnwiredEngine", () => {
  const DATE = "2026-05-23";

  it("renders a complete stub for a typical audit entry", () => {
    const entry = {
      engine: "ExampleUnwiredEngine",
      mtime: "2026-03-06T13:23:06.000Z",
      size_kb: 7,
      suggestedDispatcher: "prism_calc",
    };
    const md = renderUnwiredEngine(entry, DATE);
    assert.match(md, /^---/);
    assert.match(md, /title: ExampleUnwiredEngine/);
    assert.match(md, /type: engine/);
    assert.match(md, /status: unwired/);
    assert.match(md, /parent_layer: L13/);
    assert.match(md, /ghost_node_kind: ghost\.unwired-engine/);
    assert.match(md, /last_modified_source: 2026-03-06/);
    assert.match(md, /size_kb: 7/);
    assert.match(md, /# ExampleUnwiredEngine — UNWIRED/);
    assert.match(md, /`prism_calc` \(suggested — verify before wiring\)/);
    assert.match(md, /<!-- AUTO-START/);
    assert.match(md, /<!-- AUTO-END -->/);
  });

  it("renders 'needs manual review' for UNKNOWN suggested dispatcher", () => {
    const entry = {
      engine: "MysteryEngine",
      mtime: "2026-05-01T00:00:00.000Z",
      size_kb: 12,
      suggestedDispatcher: "UNKNOWN — review manually",
    };
    const md = renderUnwiredEngine(entry, DATE);
    assert.match(md, /needs manual review — no dispatcher suggested/);
    assert.doesNotMatch(md, /\(suggested — verify before wiring\)/);
  });

  it("falls back to 'unknown' mtime when missing", () => {
    const entry = { engine: "NoMtimeEngine", size_kb: 4 };
    const md = renderUnwiredEngine(entry, DATE);
    assert.match(md, /last_modified_source: unknown/);
  });

  it("clamps mtime to date-only (YYYY-MM-DD)", () => {
    const entry = {
      engine: "Clamp",
      mtime: "2026-03-06T13:23:06.123Z",
      size_kb: 1,
    };
    const md = renderUnwiredEngine(entry, DATE);
    assert.match(md, /last_modified_source: 2026-03-06\n/);
    assert.doesNotMatch(md, /last_modified_source: 2026-03-06T/);
  });

  it("handles missing engine name gracefully (empty title slot)", () => {
    const md = renderUnwiredEngine({ mtime: "2026-01-01" }, DATE);
    assert.match(md, /title: /);
    assert.match(md, /# {1,2}— UNWIRED/);
  });

  it("includes wiring next-steps + WIRE-TO-ALL-SOURCES doctrine reference", () => {
    const md = renderUnwiredEngine({ engine: "X" }, DATE);
    assert.match(md, /Wiring next steps/);
    assert.match(md, /WIRE-TO-ALL-SOURCES/);
    assert.match(md, /lazy import/);
    assert.match(md, /round-trip test/);
  });

  it("uses generation date in last_verified", () => {
    const md = renderUnwiredEngine({ engine: "X" }, "2099-12-31");
    assert.match(md, /last_verified: 2099-12-31/);
  });

  it("serializes suggestedDispatcher as JSON-encoded string (handles dashes + spaces)", () => {
    const md = renderUnwiredEngine({
      engine: "Quoted",
      suggestedDispatcher: "UNKNOWN — review manually",
    }, DATE);
    assert.match(md, /suggested_dispatcher: "UNKNOWN — review manually"/);
  });

  it("tags array includes the core unwired-engine markers", () => {
    const md = renderUnwiredEngine({ engine: "TagTest" }, DATE);
    assert.match(md, /tags: \[engine, unwired, ghost, needs-wiring, atomic\]/);
  });

  it("AUTO-START and AUTO-END markers appear exactly once for idempotent regen", () => {
    const md = renderUnwiredEngine({ engine: "Idem" }, DATE);
    const starts = (md.match(/<!-- AUTO-START/g) || []).length;
    const ends = (md.match(/<!-- AUTO-END -->/g) || []).length;
    assert.equal(starts, 1);
    assert.equal(ends, 1);
  });

  it("status table contains the explicit 'unwired' marker", () => {
    const md = renderUnwiredEngine({ engine: "Z" }, DATE);
    assert.match(md, /\| Status \| \*\*unwired\*\* \|/);
  });

  it("preserves the engine name verbatim — no slug mangling in title/body", () => {
    const entry = { engine: "MixedCASE_With-Special_Chars" };
    const md = renderUnwiredEngine(entry, DATE);
    assert.match(md, /title: MixedCASE_With-Special_Chars/);
    assert.match(md, /# MixedCASE_With-Special_Chars — UNWIRED/);
    assert.match(md, /`MixedCASE_With-Special_Chars`/);
  });
});
