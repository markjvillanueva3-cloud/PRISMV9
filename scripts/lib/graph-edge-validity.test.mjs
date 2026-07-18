/**
 * graph-edge-validity.test.mjs — pins the canonical edge-degree predicate and
 * the cross-file tripwire that keeps MasterIndexEngine's inline copy in step.
 * U-SIERRA-MASTERINDEX-SIDECAR-ROBUSTNESS (2026-07-05).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isValidEdge, CANONICAL_EDGE_VALIDITY_PREDICATE } from "./graph-edge-validity.mjs";

test("isValidEdge: counts an edge iff from AND to are both strings", () => {
  assert.equal(isValidEdge({ from: "a", to: "b" }), true);
  assert.equal(isValidEdge({ from: "a", to: "a" }), true, "self-loop is valid");
  assert.equal(isValidEdge({ from: "a", to: "b", type: "calls", intensity: 0 }), true, "extra fields ignored");
});

test("isValidEdge: rejects null / missing / non-string endpoints", () => {
  assert.equal(isValidEdge(null), false);
  assert.equal(isValidEdge(undefined), false);
  assert.equal(isValidEdge({}), false);
  assert.equal(isValidEdge({ from: "a" }), false, "missing to");
  assert.equal(isValidEdge({ to: "b" }), false, "missing from");
  assert.equal(isValidEdge({ from: 5, to: "b" }), false, "non-string from");
  assert.equal(isValidEdge({ from: "a", to: 9 }), false, "non-string to");
  assert.equal(isValidEdge("edge"), false, "primitive");
});

// The .ts build boundary blocks MasterIndexEngine.ts from importing this .mjs, so
// it keeps an inline copy of the predicate. This tripwire FAILS the moment that
// copy drifts from the canonical text — the loud signal the audit found missing
// (the old round-trip test used a 4th hand-copy that could drift silently).
test("tripwire: MasterIndexEngine.buildGraphCache inline edge guard is byte-identical to the canonical predicate", () => {
  const enginePath = fileURLToPath(
    new URL("../../mcp-server/src/engines/MasterIndexEngine.ts", import.meta.url),
  );
  const src = readFileSync(enginePath, "utf8");
  // Normalize whitespace so indentation differences don't false-trip.
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const normSrc = normalize(src);
  const pred = normalize(CANONICAL_EDGE_VALIDITY_PREDICATE);
  // Assert EXACTLY ONE occurrence, not just presence: 0 = the guard drifted (or was
  // removed); ≥2 = a stray copy (e.g. left in a comment) that could let the real
  // guard drift while a comment keeps this test green. Either is a failure.
  const occurrences = normSrc.split(pred).length - 1;
  assert.equal(
    occurrences, 1,
    `MasterIndexEngine must contain the canonical edge-validity predicate EXACTLY once ` +
      `(found ${occurrences}); if you changed the degree edge-validity rule, update ` +
      `graph-edge-validity.mjs AND MasterIndexEngine.ts's inline guard together`,
  );
});
