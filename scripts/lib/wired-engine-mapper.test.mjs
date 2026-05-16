#!/usr/bin/env node
/**
 * wired-engine-mapper.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS2/U-SIBLING-INFER
 * Run: node --test scripts/lib/wired-engine-mapper.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractEngineImports,
  buildEngineDispatcherMap,
  dispatcherFileToNamespace,
  inferDispatcherBySibling,
  commonPrefixLen,
  DISPATCHER_NAMESPACE_OVERRIDES,
} from "./wired-engine-mapper.mjs";

describe("commonPrefixLen", () => {
  test("identical strings → full length", () => {
    assert.equal(commonPrefixLen("MillForce", "MillForce"), 9);
  });
  test("partial prefix match", () => {
    assert.equal(commonPrefixLen("MillForceEngine", "MillDeflectionEngine"), 4); // 'Mill'
  });
  test("no shared prefix", () => {
    assert.equal(commonPrefixLen("Alpha", "Beta"), 0);
  });
  test("empty / non-string → 0", () => {
    assert.equal(commonPrefixLen("", ""), 0);
    assert.equal(commonPrefixLen(null, "X"), 0);
    assert.equal(commonPrefixLen("X", undefined), 0);
  });
  test("case-sensitive", () => {
    assert.equal(commonPrefixLen("mill", "Mill"), 0);
  });
});

describe("extractEngineImports", () => {
  test("static import with .js", () => {
    const src = `import { Foo } from "../../engines/FooEngine.js";`;
    assert.deepEqual(extractEngineImports(src), ["FooEngine"]);
  });
  test("dynamic import with await", () => {
    const src = `const m = await import("../../engines/BarEngine.js");`;
    assert.deepEqual(extractEngineImports(src), ["BarEngine"]);
  });
  test("multiple imports deduplicated", () => {
    const src = `
import { A } from "../../engines/Shared.js";
const m = await import("../../engines/Shared.js");
`;
    assert.deepEqual(extractEngineImports(src), ["Shared"]);
  });
  test("requires uppercase first letter (class name)", () => {
    const src = `from "../../engines/lowercase.js"`;
    assert.deepEqual(extractEngineImports(src), []);
  });
  test("empty / non-string → []", () => {
    assert.deepEqual(extractEngineImports(""), []);
    assert.deepEqual(extractEngineImports(null), []);
    assert.deepEqual(extractEngineImports(undefined), []);
  });
  test("multiple distinct engines", () => {
    const src = `
import { A } from "../../engines/AlphaEngine.js";
import type { B } from "../../engines/BravoEngine.js";
const c = await import("../../engines/CharlieEngine.js");
`;
    const r = extractEngineImports(src);
    assert.equal(r.length, 3);
    assert.ok(r.includes("AlphaEngine"));
    assert.ok(r.includes("BravoEngine"));
    assert.ok(r.includes("CharlieEngine"));
  });
});

describe("dispatcherFileToNamespace", () => {
  test("known override (calcDispatcher → prism_calc)", () => {
    assert.equal(dispatcherFileToNamespace("calcDispatcher.ts"), "prism_calc");
  });
  test("known override (millDispatcher → prism_cam)", () => {
    assert.equal(dispatcherFileToNamespace("millDispatcher.ts"), "prism_cam");
  });
  test("generic pattern: <X>Dispatcher → prism_<x>", () => {
    assert.equal(dispatcherFileToNamespace("blueprintDispatcher.ts"), "prism_blueprint");
  });
  test("override applies regardless of .ts/.js suffix", () => {
    assert.equal(dispatcherFileToNamespace("calcDispatcher.js"), "prism_calc");
    assert.equal(dispatcherFileToNamespace("calcDispatcher"), "prism_calc");
  });
  test("non-dispatcher file → null", () => {
    assert.equal(dispatcherFileToNamespace("randomFile.ts"), null);
    assert.equal(dispatcherFileToNamespace(""), null);
    assert.equal(dispatcherFileToNamespace(null), null);
  });
  test("overrides table is frozen", () => {
    assert.throws(() => { DISPATCHER_NAMESPACE_OVERRIDES.fake = "x"; });
  });
});

describe("buildEngineDispatcherMap", () => {
  test("scans .ts files only, skips .d.ts and .test.ts", () => {
    const dir = path.join(os.tmpdir(), `mapper-test-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "calcDispatcher.ts"), `from "../../engines/AlphaEngine.js"`);
      fs.writeFileSync(path.join(dir, "test-junk.test.ts"), `from "../../engines/SkipMe.js"`);
      fs.writeFileSync(path.join(dir, "type-only.d.ts"), `from "../../engines/SkipMeToo.js"`);
      const r = buildEngineDispatcherMap(dir);
      assert.ok(r.has("AlphaEngine"));
      assert.ok(!r.has("SkipMe"));
      assert.ok(!r.has("SkipMeToo"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("returns Map, multi-dispatcher engines collect all sources", () => {
    const dir = path.join(os.tmpdir(), `mapper-multi-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "calcDispatcher.ts"), `from "../../engines/SharedEngine.js"`);
      fs.writeFileSync(path.join(dir, "camDispatcher.ts"), `from "../../engines/SharedEngine.js"`);
      const r = buildEngineDispatcherMap(dir);
      const shared = r.get("SharedEngine");
      assert.ok(shared);
      assert.ok(shared.has("prism_calc"));
      assert.ok(shared.has("prism_cam"));
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("missing dir → empty Map (no throw)", () => {
    const r = buildEngineDispatcherMap("/nope/missing");
    assert.equal(r.size, 0);
  });

  test("skips files whose namespace is unmappable", () => {
    const dir = path.join(os.tmpdir(), `mapper-skip-${Date.now()}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      // "randomThing.ts" — not a dispatcher, namespace mapper returns null
      fs.writeFileSync(path.join(dir, "randomThing.ts"), `from "../../engines/X.js"`);
      const r = buildEngineDispatcherMap(dir);
      assert.equal(r.size, 0);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });
});

describe("inferDispatcherBySibling", () => {
  const buildMap = (entries) => new Map(entries.map(([k, v]) => [k, new Set(Array.isArray(v) ? v : [v])]));

  test("longest-prefix sibling wins", () => {
    const wired = buildMap([
      ["MillForceEngine", "prism_calc"],
      ["MillDeflectionEngine", "prism_calc"],
      ["AlphaUnrelated", "prism_session"],
    ]);
    const r = inferDispatcherBySibling("MillThermalEngine", wired);
    assert.ok(r);
    assert.equal(r.dispatcher, "prism_calc");
    assert.match(r.reason, /sibling-prefix/);
    assert.ok(r.confidence >= 0.4 && r.confidence <= 0.65);
  });

  test("most-common dispatcher wins when siblings disagree", () => {
    const wired = buildMap([
      ["LatheGrooveEngine", "prism_turning"],
      ["LatheThreadEngine", "prism_turning"],
      ["LatheBackgroundUtility", "prism_dev"],
    ]);
    const r = inferDispatcherBySibling("LatheChipEngine", wired);
    assert.equal(r.dispatcher, "prism_turning");
  });

  test("returns null when no sibling has min-prefix overlap", () => {
    const wired = buildMap([["AlphaEngine", "prism_x"]]);
    const r = inferDispatcherBySibling("ZebraEngine", wired);
    assert.equal(r, null);
  });

  test("returns null on empty / non-string input", () => {
    const wired = buildMap([["A", "x"]]);
    assert.equal(inferDispatcherBySibling("", wired), null);
    assert.equal(inferDispatcherBySibling(null, wired), null);
    assert.equal(inferDispatcherBySibling("X", wired), null); // shorter than minPrefix
  });

  test("returns null when wiredMap is invalid", () => {
    assert.equal(inferDispatcherBySibling("MillFoo", null), null);
    assert.equal(inferDispatcherBySibling("MillFoo", {}), null);
  });

  test("custom minPrefix opt", () => {
    const wired = buildMap([["XyEngine", "prism_x"]]);
    // Default minPrefix=4 would reject "XyAB" (prefix "Xy" is len 2)
    assert.equal(inferDispatcherBySibling("XyAB", wired), null);
    // With minPrefix=2, "Xy" shared (len 2) is acceptable
    const r = inferDispatcherBySibling("XyAB", wired, { minPrefix: 2 });
    assert.ok(r);
    assert.equal(r.dispatcher, "prism_x");
  });

  test("self-skip: don't match self in map", () => {
    const wired = buildMap([["MillFoo", "prism_x"], ["MillBar", "prism_y"]]);
    const r = inferDispatcherBySibling("MillFoo", wired);
    // Should match MillBar (not self), so dispatcher = prism_y
    assert.ok(r);
    assert.equal(r.dispatcher, "prism_y");
  });

  test("confidence increases with prefix length", () => {
    const wired = buildMap([["MillAndThenSome", "prism_x"]]);
    const rShort = inferDispatcherBySibling("MillBar", wired); // 4-char shared
    const rLong = inferDispatcherBySibling("MillAndThenStuff", wired); // longer shared
    assert.ok(rShort && rLong);
    assert.ok(rLong.confidence >= rShort.confidence);
  });
});
