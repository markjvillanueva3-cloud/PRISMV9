import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scanPlaybookSource } from "../stop-playbook-corpus-drift-advisory.mjs";

// Tests for scanPlaybookSource — the pure static-parse core of the playbook
// corpus-drift advisory Stop hook. Uses synthetic source fixtures so tests
// are deterministic, fast, and don't depend on the 5900-line real engine.

describe("scanPlaybookSource", () => {
  it("returns empty findings for a clean two-rule fixture", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "milling", related_rules: ["R-2"] },
  { id: "R-2", category: "milling", related_rules: ["R-1"] },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.duplicateIds, []);
    assert.deepEqual(out.unresolvedRefs, []);
    assert.equal(out.totalIds, 2);
  });

  it("flags a single duplicate id", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-DUP", category: "milling" },
  { id: "R-OK", category: "milling" },
  { id: "R-DUP", category: "milling" },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.duplicateIds, ["R-DUP"]);
    assert.deepEqual(out.unresolvedRefs, []);
    assert.equal(out.totalIds, 3);
  });

  it("returns duplicate ids sorted for deterministic output", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "Z", category: "x" },
  { id: "A", category: "x" },
  { id: "Z", category: "x" },
  { id: "A", category: "x" },
  { id: "M", category: "x" },
  { id: "M", category: "x" },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.duplicateIds, ["A", "M", "Z"]);
  });

  it("flags an unresolved related_rules reference and names the source rule", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x", related_rules: ["R-DOES-NOT-EXIST"] },
  { id: "R-2", category: "x" },
];
`;
    const out = scanPlaybookSource(src);
    assert.equal(out.unresolvedRefs.length, 1);
    assert.equal(out.unresolvedRefs[0].fromId, "R-1");
    assert.equal(out.unresolvedRefs[0].missingId, "R-DOES-NOT-EXIST");
  });

  it("collects multiple unresolved refs across multiple rules", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x", related_rules: ["MISSING-1", "R-2"] },
  { id: "R-2", category: "x", related_rules: ["MISSING-2"] },
];
`;
    const out = scanPlaybookSource(src);
    assert.equal(out.unresolvedRefs.length, 2);
    const ids = out.unresolvedRefs.map((r) => r.missingId).sort();
    assert.deepEqual(ids, ["MISSING-1", "MISSING-2"]);
  });

  it("allows self-reference at the static-scan tier (engine auditIntegrity flags it semantically)", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-SELF", category: "x", related_rules: ["R-SELF"] },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.unresolvedRefs, []);
    assert.deepEqual(out.duplicateIds, []);
  });

  it("handles an empty related_rules array without false positives", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x", related_rules: [] },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.unresolvedRefs, []);
  });

  it("ignores 'id:' occurrences before PLAYBOOK_RULES declaration (type defs, comments)", () => {
    // The region slice starts at the PLAYBOOK_RULES anchor, so id-mentions
    // in TypeScript interface declarations above must not pollute the set.
    const src = `
export interface PlaybookRule {
  id: string;
  category: string;
}
// Sample: { id: "DOC-EXAMPLE-IGNORED" }
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x" },
];
`;
    const out = scanPlaybookSource(src);
    assert.equal(out.totalIds, 1);
    assert.deepEqual(out.duplicateIds, []);
  });

  it("returns empty findings on completely empty input", () => {
    const out = scanPlaybookSource("");
    assert.deepEqual(out.duplicateIds, []);
    assert.deepEqual(out.unresolvedRefs, []);
    assert.equal(out.totalIds, 0);
  });

  it("handles single-quoted id strings as well as double-quoted", () => {
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: 'R-SINGLE', category: 'x' },
  { id: "R-DOUBLE", category: "x" },
  { id: 'R-SINGLE', category: 'x' },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.duplicateIds, ["R-SINGLE"]);
    assert.equal(out.totalIds, 3);
  });

  it("tolerates malformed related_rules (non-string entries are simply not extracted)", () => {
    // The regex only captures quoted strings; numbers / unquoted tokens
    // inside the brackets are skipped, never crash.
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x", related_rules: [123, "R-2", null] },
  { id: "R-2", category: "x" },
];
`;
    const out = scanPlaybookSource(src);
    assert.deepEqual(out.unresolvedRefs, []);
  });

  it("flags many unresolved refs but caller controls display truncation", () => {
    // The scanner returns the full list; the calling hook decides whether
    // to truncate via PRISM_PLAYBOOK_DRIFT_MAX_LIST. Scanner contract is
    // complete data; presentation is the consumer's responsibility.
    const ids = Array.from({ length: 20 }, (_, i) => `MISS-${i}`);
    const refsBlock = ids.map((id) => `"${id}"`).join(", ");
    const src = `
PLAYBOOK_RULES: PlaybookRule[] = [
  { id: "R-1", category: "x", related_rules: [${refsBlock}] },
];
`;
    const out = scanPlaybookSource(src);
    assert.equal(out.unresolvedRefs.length, 20);
  });
});
