/**
 * roadmap-terminal-status.test.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-DRIFT-SKIP-VOCAB
 * Real reference-value tests for isSkippable: every terminal status -> true, every
 * genuinely-open status -> false (no over-suppression), + adversarial (null/garbage/
 * case/whitespace/variant). Pure function, no fixtures.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSkippable, SKIP_STATUSES } from "./roadmap-terminal-status.mjs";

describe("isSkippable -- terminal statuses (skip the drift audit)", () => {
  for (const s of ["complete", "completed", "done", "shipped", "superseded", "consolidated", "deprecated"]) {
    it(`"${s}" -> true`, () => assert.equal(isSkippable(s), true));
  }
  it('case-insensitive: "Completed"/"SHIPPED" -> true', () => {
    assert.equal(isSkippable("Completed"), true);
    assert.equal(isSkippable("SHIPPED"), true);
  });
  it('variant: "shipped-research-only" -> true (startsWith shipped)', () => {
    assert.equal(isSkippable("shipped-research-only"), true);
  });
  it('variant: "complete-with-notes" -> true (startsWith complete)', () => {
    assert.equal(isSkippable("complete-with-notes"), true);
  });
  it("whitespace is trimmed", () => {
    assert.equal(isSkippable("  complete  "), true);
  });
});

describe("isSkippable -- genuinely-open statuses (MUST stay auditable, no over-suppression)", () => {
  for (const s of ["in_progress", "ready", "ready_for_merge", "not_started", "not-started", "deferred", "planned", "blocked"]) {
    it(`"${s}" -> false`, () => assert.equal(isSkippable(s), false));
  }
});

describe("isSkippable -- adversarial (total function, never throws)", () => {
  it("null / undefined / empty -> false", () => {
    assert.equal(isSkippable(null), false);
    assert.equal(isSkippable(undefined), false);
    assert.equal(isSkippable(""), false);
    assert.equal(isSkippable("   "), false);
  });
  it("non-string garbage -> false (no throw)", () => {
    assert.equal(isSkippable(42), false);
    assert.equal(isSkippable({}), false);
    assert.equal(isSkippable([]), false);
    assert.equal(isSkippable(true), false);
  });
});

describe("SKIP_STATUSES set", () => {
  it("contains the canonical terminal-done + resolved vocabulary", () => {
    for (const s of ["complete", "completed", "shipped", "done", "superseded", "consolidated", "deprecated"]) {
      assert.ok(SKIP_STATUSES.has(s), `${s} present`);
    }
  });
  it("does NOT contain open statuses", () => {
    for (const s of ["in_progress", "not_started", "deferred", "ready"]) {
      assert.ok(!SKIP_STATUSES.has(s), `${s} absent`);
    }
  });
});
