// regression-lock-gate.test.mjs -- real-behavior tests for the enforcement keystone.
// node --test scripts/lib/regression-lock-gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { findNewlyAddedRegressions, evaluateRegressionLock, isTestFile } from "./regression-lock-gate.mjs";

// Fixtures in the EXACT format parseRegressionEntries() parses:
//   - YYYY-MM-DD | **desc** | observed-in: <7-40 hex> | ...
const E_OLD = "- 2026-05-20 | **old race fix** | observed-in: aaaa111 | fix: see commit | verify: x";
const E_NEW = "- 2026-06-11 | **new null-deref fix** | observed-in: bbbb222 | fix: see commit | verify: y";
const md = (rows) => `# CLAUDE.md\n\npreamble\n\n## Recent regressions\n${rows.join("\n")}\n\n## ONE-GLANCE CHECKLIST\n- done\n`;

// ---- findNewlyAddedRegressions ----
test("detects an entry present in after but not before", () => {
  const added = findNewlyAddedRegressions(md([E_OLD]), md([E_OLD, E_NEW]));
  assert.equal(added.length, 1);
  assert.equal(added[0].description, "new null-deref fix");
  assert.equal(added[0].sha, "bbbb222");
});

test("returns empty when before === after", () => {
  assert.equal(findNewlyAddedRegressions(md([E_OLD]), md([E_OLD])).length, 0);
});

test("fail-soft: non-string input yields empty", () => {
  assert.deepEqual(findNewlyAddedRegressions(null, undefined), []);
  assert.deepEqual(findNewlyAddedRegressions(42, {}), []);
});

test("before with NO regression section, after adds entries -> all are new", () => {
  const added = findNewlyAddedRegressions("# CLAUDE.md\nno section here\n", md([E_NEW]));
  assert.equal(added.length, 1);
  assert.equal(added[0].sha, "bbbb222");
});

// ---- evaluateRegressionLock ----
const oneEntry = [{ date: "2026-06-11", sha: "bbbb222", description: "new null-deref fix" }];

test("added entry + NO test in change-set -> UNLOCKED, warn (advisory, not blocking)", () => {
  const v = evaluateRegressionLock({ newlyAdded: oneEntry, changedFiles: ["mcp-server/src/engines/Foo.ts"], enforce: false });
  assert.equal(v.hasCompanionTest, false);
  assert.equal(v.unlocked.length, 1);
  assert.equal(v.shouldWarn, true);
  assert.equal(v.shouldBlock, false);
  assert.match(v.message, /Advisory/);
  assert.match(v.message, /bbbb222/);
});

test("added entry + a test file in change-set -> LOCKED (no warn)", () => {
  const v = evaluateRegressionLock({ newlyAdded: oneEntry, changedFiles: ["mcp-server/src/engines/Foo.ts", "mcp-server/src/__tests__/Foo.test.ts"], enforce: false });
  assert.equal(v.hasCompanionTest, true);
  assert.equal(v.unlocked.length, 0);
  assert.equal(v.shouldWarn, false);
  assert.equal(v.message, "");
});

test("enforce=true + unlocked -> shouldBlock and BLOCKED message", () => {
  const v = evaluateRegressionLock({ newlyAdded: oneEntry, changedFiles: ["src/Foo.ts"], enforce: true });
  assert.equal(v.shouldBlock, true);
  assert.match(v.message, /BLOCKED/);
});

test("no newly-added entries -> no warn, empty message", () => {
  const v = evaluateRegressionLock({ newlyAdded: [], changedFiles: ["src/Foo.ts"], enforce: true });
  assert.equal(v.shouldWarn, false);
  assert.equal(v.shouldBlock, false);
  assert.equal(v.message, "");
});

test("ADVERSARIAL: empty/undefined args yield safe defaults", () => {
  const v = evaluateRegressionLock();
  assert.equal(v.addedCount, 0);
  assert.equal(v.shouldWarn, false);
  assert.equal(v.shouldBlock, false);
});

test("ADVERSARIAL: only a non-test source file present keeps entries unlocked", () => {
  const v = evaluateRegressionLock({ newlyAdded: oneEntry, changedFiles: ["scripts/lib/helper.mjs", "docs/notes.md"], enforce: false });
  assert.equal(v.hasCompanionTest, false);
  assert.equal(v.unlocked.length, 1);
});

// ---- isTestFile ----
test("isTestFile recognizes test/spec/__tests__ and rejects plain source", () => {
  assert.equal(isTestFile("a.test.ts"), true);
  assert.equal(isTestFile("a.spec.js"), true);
  assert.equal(isTestFile("a.test.mjs"), true);
  assert.equal(isTestFile("pkg/__tests__/a.mjs"), true);
  assert.equal(isTestFile("mcp-server/src/engines/Foo.ts"), false);
  assert.equal(isTestFile(null), false);
});

// ---- end-to-end integration ----
test("INTEGRATION: new regression row + no test -> warns end-to-end", () => {
  const added = findNewlyAddedRegressions(md([E_OLD]), md([E_OLD, E_NEW]));
  const v = evaluateRegressionLock({ newlyAdded: added, changedFiles: ["mcp-server/src/engines/Bar.ts"], enforce: false });
  assert.equal(v.shouldWarn, true);
  assert.match(v.message, /new null-deref fix/);
});
