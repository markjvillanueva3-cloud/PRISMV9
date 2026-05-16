#!/usr/bin/env node
/**
 * extract-supplementary-dsl-codes.test.mjs — tests for SYSTEM-VIZ-DSL-MS0/U-DSL-SUPP-EXTRACT
 *
 * Hermetic — passes synthetic source strings to pure extractors + uses tmp dirs
 * for walk tests. Real-value assertions throughout.
 *
 * Run: node --test scripts/extract-supplementary-dsl-codes.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractActionsFromDispatcherSource,
  extractFormulasFromPhysicsSource,
  walkDir,
  extractAllActions,
  extractAllSkills,
  extractAllFormulas,
} from "./extract-supplementary-dsl-codes.mjs";

describe("extractActionsFromDispatcherSource — pure parser", () => {
  test("simple case statements → action names", () => {
    const src = `
switch (action) {
  case "calc_force": return foo;
  case "calc_deflection": return bar;
}`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 2);
    assert.ok(r.has("calc_force"));
    assert.ok(r.has("calc_deflection"));
  });

  test("single + double quote variants", () => {
    const src = `case "double_quoted": return; case 'single_quoted': return;`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 2);
    assert.ok(r.has("double_quoted"));
    assert.ok(r.has("single_quoted"));
  });

  test("strips // comments — no false positive on commented case", () => {
    const src = `
// case "fake_action": never reachable
case "real_action": return;
`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 1);
    assert.ok(r.has("real_action"));
    assert.ok(!r.has("fake_action"));
  });

  test("strips /* block */ comments", () => {
    const src = `
/*
  case "block_commented": never
*/
case "real_action": return;
`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 1);
    assert.ok(r.has("real_action"));
    assert.ok(!r.has("block_commented"));
  });

  test("deduplicates repeats (case repeated in same file)", () => {
    // Fixture must satisfy SK filter (length>=4 + has underscore) for dedup to apply
    const src = `case "calc_x": return a; /* later */ case "calc_x": return b;`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 1);
    assert.ok(r.has("calc_x"));
  });

  test("rejects non-lowercase identifiers (case 'X' won't match lowercase regex)", () => {
    const src = `case "MIXED_case": return; case "lowercase_only": return;`;
    const r = extractActionsFromDispatcherSource(src);
    // Our regex requires [a-z] start; "MIXED_case" should NOT match.
    assert.ok(r.has("lowercase_only"));
    assert.ok(!r.has("MIXED_case"));
  });

  test("empty / null / non-string input → empty Set", () => {
    assert.equal(extractActionsFromDispatcherSource("").size, 0);
    assert.equal(extractActionsFromDispatcherSource(null).size, 0);
    assert.equal(extractActionsFromDispatcherSource(undefined).size, 0);
    assert.equal(extractActionsFromDispatcherSource(42).size, 0);
  });

  test("real dispatcher fragment (mixed real-world syntax)", () => {
    const src = `
import { z } from "zod";
const ACTIONS = z.enum(["calc_force", "calc_taylor"] as const);
async function dispatch(action, params) {
  switch (action) {
    case "calc_force": {
      result = computeForce(params);
      break;
    }
    case "calc_taylor":
      result = computeTaylor(params);
      break;
    // case "deprecated_action": removed in v3
    case "calc_chip_thinning":
      result = chipThinning(params);
      break;
  }
}`;
    const r = extractActionsFromDispatcherSource(src);
    assert.equal(r.size, 3);
    assert.ok(r.has("calc_force"));
    assert.ok(r.has("calc_taylor"));
    assert.ok(r.has("calc_chip_thinning"));
    assert.ok(!r.has("deprecated_action"));
  });
});

describe("extractFormulasFromPhysicsSource — pure parser", () => {
  test("export const UPPER_SNAKE = ... → captured", () => {
    const src = `
export const KIENZLE_KC1_P = 1800;
export const TAYLOR_C_HSS = 60;
`;
    const r = extractFormulasFromPhysicsSource(src);
    assert.equal(r.size, 2);
    assert.ok(r.has("KIENZLE_KC1_P"));
    assert.ok(r.has("TAYLOR_C_HSS"));
  });

  test("lowercase / camelCase NOT captured (utility funcs, not constants)", () => {
    const src = `
export const kienzleForce = (a, b) => a * b;
export const taylor_tool_life = (v) => v;
`;
    const r = extractFormulasFromPhysicsSource(src);
    assert.equal(r.size, 0);
  });

  test("type annotation form: const X: number = ...", () => {
    const src = `export const HMAC_TOLERANCE: number = 0.001;`;
    const r = extractFormulasFromPhysicsSource(src);
    assert.equal(r.size, 1);
    assert.ok(r.has("HMAC_TOLERANCE"));
  });

  test("empty/null input → empty Set", () => {
    assert.equal(extractFormulasFromPhysicsSource("").size, 0);
    assert.equal(extractFormulasFromPhysicsSource(null).size, 0);
  });

  test("multiple constants mixed with functions", () => {
    const src = `
export const KC1_M = 2100;
export function multiply(a, b) { return a * b; }
export const KC1_K = 1100;
export const computeForce = () => 0;
`;
    const r = extractFormulasFromPhysicsSource(src);
    assert.equal(r.size, 2);
    assert.ok(r.has("KC1_M"));
    assert.ok(r.has("KC1_K"));
  });
});

describe("walkDir — filesystem walker", () => {
  test("returns empty for missing root", () => {
    const r = walkDir("/this/does/not/exist/anywhere", () => true);
    assert.deepEqual(r, []);
  });

  test("walks files matching predicate", () => {
    const dir = path.join(os.tmpdir(), `walkdir-test-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "match.md"), "x");
      fs.writeFileSync(path.join(dir, "skip.txt"), "x");
      const sub = path.join(dir, "sub");
      fs.mkdirSync(sub);
      fs.writeFileSync(path.join(sub, "also-match.md"), "x");
      const r = walkDir(dir, (name) => name.endsWith(".md"));
      assert.equal(r.length, 2);
      assert.ok(r.some((p) => p.endsWith("match.md")));
      assert.ok(r.some((p) => p.endsWith("also-match.md")));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("skips node_modules, .git, hidden dirs", () => {
    const dir = path.join(os.tmpdir(), `walkdir-skip-test-${Date.now()}`);
    try {
      fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
      fs.writeFileSync(path.join(dir, "node_modules", "hidden.md"), "x");
      fs.mkdirSync(path.join(dir, ".git"));
      fs.writeFileSync(path.join(dir, ".git", "hidden.md"), "x");
      fs.writeFileSync(path.join(dir, "visible.md"), "x");
      const r = walkDir(dir, (name) => name.endsWith(".md"));
      assert.equal(r.length, 1);
      assert.ok(r[0].endsWith("visible.md"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("respects maxDepth opt", () => {
    const dir = path.join(os.tmpdir(), `walkdir-depth-${Date.now()}`);
    try {
      const deep = path.join(dir, "a", "b", "c", "d");
      fs.mkdirSync(deep, { recursive: true });
      fs.writeFileSync(path.join(dir, "depth0.md"), "x");
      fs.writeFileSync(path.join(dir, "a", "depth1.md"), "x");
      fs.writeFileSync(path.join(deep, "depth4.md"), "x");
      const r = walkDir(dir, (n) => n.endsWith(".md"), { maxDepth: 1 });
      // depth 0 + depth 1 only
      const names = r.map((p) => path.basename(p));
      assert.ok(names.includes("depth0.md"));
      assert.ok(names.includes("depth1.md"));
      assert.ok(!names.includes("depth4.md"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });
});

describe("extractAllSkills — basename extraction", () => {
  test("collects basenames sans .md, deduplicates", () => {
    const dir1 = path.join(os.tmpdir(), `skills-test-1-${Date.now()}`);
    const dir2 = path.join(os.tmpdir(), `skills-test-2-${Date.now()}`);
    try {
      fs.mkdirSync(dir1, { recursive: true });
      fs.mkdirSync(dir2, { recursive: true });
      fs.writeFileSync(path.join(dir1, "alpha.md"), "x");
      fs.writeFileSync(path.join(dir1, "beta.md"), "x");
      fs.writeFileSync(path.join(dir2, "alpha.md"), "x"); // duplicate (same basename)
      fs.writeFileSync(path.join(dir2, "gamma.md"), "x");
      const r = extractAllSkills([dir1, dir2]);
      assert.equal(r.size, 3); // alpha, beta, gamma
      assert.ok(r.has("alpha"));
      assert.ok(r.has("beta"));
      assert.ok(r.has("gamma"));
    } finally {
      try { fs.rmSync(dir1, { recursive: true, force: true }); } catch { /* ignore */ }
      try { fs.rmSync(dir2, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("skips files starting with . or _ (private/system)", () => {
    const dir = path.join(os.tmpdir(), `skills-private-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "_private.md"), "x");
      fs.writeFileSync(path.join(dir, "public.md"), "x");
      const r = extractAllSkills([dir]);
      assert.equal(r.size, 1);
      assert.ok(r.has("public"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("missing dir → silently skipped (no throw)", () => {
    const r = extractAllSkills(["/this/does/not/exist", "/also/not"]);
    assert.equal(r.size, 0);
  });
});

describe("extractAllActions + extractAllFormulas — directory scanners", () => {
  test("extractAllActions skips .test.ts + .d.ts files", () => {
    const dir = path.join(os.tmpdir(), `actions-test-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "real.ts"), 'case "real_action": return;');
      fs.writeFileSync(path.join(dir, "fake.test.ts"), 'case "fake_test_action": return;');
      fs.writeFileSync(path.join(dir, "skip.d.ts"), 'case "skip_dts_action": return;');
      const r = extractAllActions(dir);
      assert.ok(r.has("real_action"));
      assert.ok(!r.has("fake_test_action"));
      assert.ok(!r.has("skip_dts_action"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("extractAllFormulas — only .ts, skips .test.ts", () => {
    const dir = path.join(os.tmpdir(), `formulas-test-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "constants.ts"), "export const KC1_P = 1800;");
      fs.writeFileSync(path.join(dir, "constants.test.ts"), "export const FAKE_TEST_CONST = 0;");
      const r = extractAllFormulas(dir);
      assert.ok(r.has("KC1_P"));
      assert.ok(!r.has("FAKE_TEST_CONST"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("missing directories return empty Sets", () => {
    assert.equal(extractAllActions("/nope").size, 0);
    assert.equal(extractAllFormulas("/nope").size, 0);
  });
});
