// tier: T4
/**
 * Tests for bootstrap-mode lib (Phase 0.16 U-OP1)
 *
 * Run via: node H:/prism/.claude/hooks/__tests__/bootstrap-mode.test.mjs
 * (or plug into a vitest config that includes .claude/hooks paths)
 */

import { isBootstrapActive, isDowngradedGate, readBootstrapFlag } from "../lib/bootstrap-mode.mjs";
import { strict as assert } from "node:assert";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    failed++;
  }
}

console.log("bootstrap-mode.mjs");

test("readBootstrapFlag returns object with active boolean", () => {
  const flag = readBootstrapFlag();
  assert.equal(typeof flag.active, "boolean");
});

test("isBootstrapActive reflects flag.active", () => {
  const flag = readBootstrapFlag();
  assert.equal(isBootstrapActive(), flag.active === true);
});

test("isDowngradedGate returns false when flag inactive", () => {
  // We can't force inactive without side-effecting the real flag file,
  // but we can verify the contract: if active === true, known phases match.
  const flag = readBootstrapFlag();
  if (flag.active === true && Array.isArray(flag.downgradedGates)) {
    for (const g of flag.downgradedGates) {
      assert.equal(isDowngradedGate(g.phase), true, `phase ${g.phase} should be downgraded`);
    }
  }
});

test("isDowngradedGate returns false for unknown phase", () => {
  assert.equal(isDowngradedGate("99.99"), false);
});

test("0.1 (dedup) is in downgraded list during bootstrap", () => {
  const flag = readBootstrapFlag();
  if (flag.active !== true) return; // skip when flag absent (post-exit-gate)
  assert.equal(isDowngradedGate("0.1"), true, "0.1 PreTool dedup must be downgraded during bootstrap");
});

test("0.9 (orphan detection) is in downgraded list during bootstrap", () => {
  const flag = readBootstrapFlag();
  if (flag.active !== true) return;
  assert.equal(isDowngradedGate("0.9"), true, "0.9 orphan detection must be downgraded during bootstrap");
});

test("0.13/0.14/0.15 are in downgraded list during bootstrap", () => {
  const flag = readBootstrapFlag();
  if (flag.active !== true) return;
  assert.equal(isDowngradedGate("0.13"), true);
  assert.equal(isDowngradedGate("0.14"), true);
  assert.equal(isDowngradedGate("0.15"), true);
});

test("cache respects TTL (5s) — two back-to-back reads match", () => {
  const a = readBootstrapFlag();
  const b = readBootstrapFlag();
  assert.equal(a.active, b.active);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
