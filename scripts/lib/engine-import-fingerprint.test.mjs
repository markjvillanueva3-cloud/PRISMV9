/**
 * Tests for engine-import-fingerprint.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
 * the import-parse, normalization, IDF formula, or text-projection regresses.
 * Pure functions tested on synthetic source; one live-data invariant test against
 * the real mcp-server/src/engines dir. Mirrors engine-action-surface.test.mjs
 * conventions exactly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractNonEngineImports,
  buildImportFingerprintMap,
  buildImportIdfMap,
  importFingerprintText,
} from "./engine-import-fingerprint.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_ENGINES_DIR = path.resolve(HERE, "..", "..", "mcp-server", "src", "engines");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Realistic engine .ts source with static + dynamic imports, including one
// engine->engine import that MUST be dropped.
const SRC_HAPPY = `
/**
 * KienzleForceEngine -- computes cutting forces via Kienzle.
 * @milestone CALC-MS0
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { MATERIAL_KC11 } from "../../physics/constants.js";
import { kienzleFormula } from "../lib/kienzle-formula.js";
import { chipThickness } from "../../lib/chip-thickness.mjs";
import { OtherEngine } from "../../engines/calc/OtherEngine.js"; // must be DROPPED
const dyn = await import("../../lib/some-util.js");

export class KienzleForceEngine {
  compute(params) { return kienzleFormula(params); }
}
`;

// Source with ONLY engine->engine imports -- all should be dropped.
const SRC_ALL_ENGINE = `
import { FooEngine } from "../../engines/foo/FooEngine.js";
import { BarEngine } from "../../engines/bar/BarEngine.js";
`;

// Source with dynamic import only.
const SRC_DYN_ONLY = `
const mod = await import("../../lib/gcode-formatter.mjs");
`;

// Source whose imports are all universal (will produce idf=0 in a 1-doc corpus).
// (In a multi-doc corpus where every doc has "node/fs", it gets idf=0.)
const SRC_UNIVERSAL = `
import fs from "node:fs";
import path from "node:path";
`;

// ---------------------------------------------------------------------------
// extractNonEngineImports -- happy path
// ---------------------------------------------------------------------------

test("extractNonEngineImports happy: finds static + dynamic imports; drops /engines/ paths", () => {
  const tokens = extractNonEngineImports(SRC_HAPPY);
  // Must include non-engine imports
  assert.ok(tokens.includes("node/fs") || tokens.some((t) => t.includes("fs")), "node:fs must survive");
  // physics/constants and lib imports must survive
  assert.ok(tokens.some((t) => t.includes("constants")), "physics/constants import must survive");
  assert.ok(tokens.some((t) => t.includes("kienzle-formula")), "kienzle-formula must survive");
  assert.ok(tokens.some((t) => t.includes("some-util")), "dynamic import must survive");
  // engine->engine import must be DROPPED
  assert.ok(!tokens.some((t) => t.includes("otherengine") || t.includes("other")),
    "engine->engine import (contains /engines/) must be dropped");
});

test("extractNonEngineImports happy: returns deduplicated tokens (no duplicate path)", () => {
  const src = `
    import { a } from "../../lib/kienzle-formula.js";
    import { b } from "../../lib/kienzle-formula.js";
  `;
  const tokens = extractNonEngineImports(src);
  const count = tokens.filter((t) => t.includes("kienzle-formula")).length;
  assert.equal(count, 1, "duplicate import path must appear once");
});

test("extractNonEngineImports happy: normalization -- strip ./ ../ + suffix + lowercase", () => {
  const src = `
    import { x } from "./MyHelper.ts";
    import { y } from "../utils/GcodeFormatter.mjs";
    import { z } from "../../lib/UPPER-CASE.js";
  `;
  const tokens = extractNonEngineImports(src);
  // ./MyHelper.ts -> "myhelper"
  assert.ok(tokens.includes("myhelper"), `expected "myhelper", got: ${JSON.stringify(tokens)}`);
  // ../utils/GcodeFormatter.mjs -> "utils/gcodeformatter"
  assert.ok(tokens.includes("utils/gcodeformatter"), `expected "utils/gcodeformatter", got: ${JSON.stringify(tokens)}`);
  // ../../lib/UPPER-CASE.js -> "lib/upper-case"
  assert.ok(tokens.includes("lib/upper-case"), `expected "lib/upper-case", got: ${JSON.stringify(tokens)}`);
});

test("extractNonEngineImports happy: bare package imports kept (no leading slash)", () => {
  const src = `import { z } from "zod"; import express from "express";`;
  const tokens = extractNonEngineImports(src);
  assert.ok(tokens.includes("zod"), "bare package 'zod' must survive");
  assert.ok(tokens.includes("express"), "bare package 'express' must survive");
});

test("extractNonEngineImports happy: dynamic import() captured", () => {
  const tokens = extractNonEngineImports(SRC_DYN_ONLY);
  assert.ok(tokens.some((t) => t.includes("gcode-formatter")),
    `dynamic import gcode-formatter must be captured; got: ${JSON.stringify(tokens)}`);
});

// ---------------------------------------------------------------------------
// extractNonEngineImports -- failure modes
// ---------------------------------------------------------------------------

test("extractNonEngineImports failure 1: all /engines/ imports dropped -> []", () => {
  const tokens = extractNonEngineImports(SRC_ALL_ENGINE);
  assert.equal(tokens.length, 0, "all engine->engine imports must be dropped");
});

test("extractNonEngineImports failure 2: non-string / null / undefined -> []", () => {
  assert.deepEqual(extractNonEngineImports(null), []);
  assert.deepEqual(extractNonEngineImports(undefined), []);
  assert.deepEqual(extractNonEngineImports(42), []);
  assert.deepEqual(extractNonEngineImports(""), []);
});

test("extractNonEngineImports failure 3: source with no import statements -> []", () => {
  const src = `export class Foo { compute() { return 1; } }`;
  assert.deepEqual(extractNonEngineImports(src), []);
});

// ---------------------------------------------------------------------------
// extractNonEngineImports -- adversarial inputs
// ---------------------------------------------------------------------------

test("extractNonEngineImports adversarial 1: /engines/ path inside any context is ALWAYS dropped", () => {
  // The key leak-free invariant: no matter how an /engines/ path appears (static import,
  // dynamic import, string literal that happens to match the dynamic-import regex), the
  // normalizePath guard drops it. Our regex is intentionally broad (it can match import-shaped
  // text in comments/strings) -- the /engines/ drop is the safety net in all cases.
  const src = `
    import { real } from "../../lib/real-lib.js";
    import { bad } from "../../engines/calc/BadEngine.js";
    const dyn = await import("../../engines/cam/OtherEngine.js");
  `;
  const tokens = extractNonEngineImports(src);
  // real-lib must be present
  assert.ok(tokens.some((t) => t.includes("real-lib")), "real import must be captured");
  // all /engines/ paths must be dropped regardless of import form
  assert.ok(!tokens.some((t) => t.includes("badengine") || t.includes("otherengine")),
    "/engines/ paths must be dropped in both static and dynamic import forms");
  // confirm the engines guard applies to any path segment containing /engines/
  const srcDeep = `import { x } from "../../something/engines/nested/Foo.js";`;
  const tokensDeep = extractNonEngineImports(srcDeep);
  assert.deepEqual(tokensDeep, [], "any path containing /engines/ must be dropped");
});

test("extractNonEngineImports adversarial 2: path with >2 segments normalized to last 2", () => {
  const src = `import { x } from "../../very/deep/nested/path/my-lib.ts";`;
  const tokens = extractNonEngineImports(src);
  // last-2 segments of "very/deep/nested/path/my-lib" -> "path/my-lib"
  assert.ok(tokens.includes("path/my-lib"),
    `expected last-2-segment "path/my-lib", got: ${JSON.stringify(tokens)}`);
});

// ---------------------------------------------------------------------------
// buildImportFingerprintMap (DI'd fs)
// ---------------------------------------------------------------------------

test("buildImportFingerprintMap: builds map from fake fs; skips .test.ts + .d.ts; fail-soft on bad dir", () => {
  const files = {
    "KienzleEngine.ts": `import { x } from "../../lib/kienzle-formula.js"; import { y } from "../../lib/chip-thickness.js";`,
    "ThermalEngine.ts": `import { z } from "../../lib/thermal-model.js"; import { w } from "../../lib/material-props.js";`,
    "KienzleEngine.test.ts": `import { bad } from "../../lib/should-not-count.js";`,
    "Declaration.d.ts": `export declare class X {}`,
  };
  const fakeFs = {
    readdirSync: (d, _opts) => {
      if (d !== "/engines") throw new Error("ENOENT");
      return Object.keys(files).map((name) => ({
        name,
        isDirectory: () => false,
        isFile: () => true,
      }));
    },
    readFileSync: (p, _enc) => {
      const name = p.split(/[\\/]/).pop();
      const v = files[name];
      if (v == null) throw new Error("ENOENT");
      return v;
    },
  };

  const map = buildImportFingerprintMap("/engines", fakeFs);

  // Two real .ts files should be present (lowercased stems).
  assert.ok(map.has("kienzleengine"), "KienzleEngine.ts stem must be in map");
  assert.ok(map.has("thermalengine"), "ThermalEngine.ts stem must be in map");
  // .test.ts must be skipped.
  assert.ok(!map.has("kienzleengine.test"), ".test.ts must not appear in map");
  // .d.ts must be skipped.
  assert.ok(!map.has("declaration"), ".d.ts must be skipped");

  // Tokens for KienzleEngine must include kienzle-formula and chip-thickness
  const kTokens = map.get("kienzleengine");
  assert.ok(Array.isArray(kTokens), "tokens must be an array");
  assert.ok(kTokens.some((t) => t.includes("kienzle-formula")), "kienzle-formula token expected");
  assert.ok(kTokens.some((t) => t.includes("chip-thickness")), "chip-thickness token expected");

  // shouldnotcount must NOT appear (it is from the .test.ts which is skipped).
  const all = [...map.values()].flat();
  assert.ok(!all.some((t) => t.includes("should-not-count")), ".test.ts tokens must not appear");

  // fail-soft: bad dir -> empty map.
  const emptyMap = buildImportFingerprintMap("/nope", fakeFs);
  assert.equal(emptyMap.size, 0, "unreadable dir must return empty map");
});

test("buildImportFingerprintMap: FLAT same-dir engine->engine import is DROPPED (ruled-out adjacency)", () => {
  // The engines tree is flat, so an engine importing a sibling engine writes `./BEngine.js`
  // (NO /engines/ substring) -> normalizePath yields the bare stem `bengine`. That token IS
  // an engine stem (a map key), so the second-pass keyset filter must remove it. A genuine
  // non-engine lib import in the SAME file must survive. Regression for the arm-B P1.
  const files = {
    "AEngine.ts": `import { b } from "./BEngine.js"; import { lib } from "../../lib/kinematics-chain.js";`,
    "BEngine.ts": `import { c } from "../../lib/material-props.js";`,
  };
  const fakeFs = {
    readdirSync: (d, _opts) => {
      if (d !== "/engines") throw new Error("ENOENT");
      return Object.keys(files).map((name) => ({ name, isDirectory: () => false, isFile: () => true }));
    },
    readFileSync: (p, _enc) => {
      const v = files[p.split(/[\\/]/).pop()];
      if (v == null) throw new Error("ENOENT");
      return v;
    },
  };
  const map = buildImportFingerprintMap("/engines", fakeFs);
  const aTokens = map.get("aengine");
  assert.ok(Array.isArray(aTokens), "AEngine tokens must be an array");
  // The same-dir engine->engine token must be dropped (it equals the BEngine stem key).
  assert.ok(!aTokens.includes("bengine"), "same-dir ./BEngine.js engine->engine token must be dropped");
  // The genuine non-engine lib import must survive.
  assert.ok(aTokens.some((t) => t.includes("kinematics-chain")), "non-engine lib import must survive");
});

test("buildImportFingerprintMap: first-wins collision -- second file with same stem is ignored", () => {
  // Two files with the same lowercased stem (different subdirs via flat listing).
  const fakeFs = {
    readdirSync: (_d, _opts) => [
      { name: "FooEngine.ts", isDirectory: () => false, isFile: () => true },
      { name: "FooEngine.ts", isDirectory: () => false, isFile: () => true }, // dup
    ],
    readFileSync: (_p, _enc) => `import { x } from "../../lib/alpha.js";`,
  };
  const map = buildImportFingerprintMap("/engines", fakeFs);
  assert.equal(map.size, 1, "collision: only one entry for fooengine");
});

// ---------------------------------------------------------------------------
// buildImportIdfMap -- algebraic invariants
// ---------------------------------------------------------------------------

test("buildImportIdfMap: token in every doc -> idf=0; token in 1 of N docs -> ln(N)", () => {
  // 3 engines: "common" appears in all 3; "rare" in only 1; "two" in 2 of 3.
  const map = new Map([
    ["eng_a", ["common", "rare"]],
    ["eng_b", ["common", "two"]],
    ["eng_c", ["common", "two"]],
  ]);
  const idf = buildImportIdfMap(map);

  // "common" in all 3 -> ln(3/3) = ln(1) = 0
  assert.equal(idf.get("common"), 0, "universal token must have idf=0");
  // "rare" in 1 of 3 -> ln(3/1) = ln(3) ~= 1.0986
  const rareExpected = Math.log(3 / 1);
  assert.ok(Math.abs((idf.get("rare") ?? NaN) - rareExpected) < 1e-10,
    `rare token idf must be ln(3)=${rareExpected.toFixed(6)}, got ${idf.get("rare")}`);
  // "two" in 2 of 3 -> ln(3/2) ~= 0.4055
  const twoExpected = Math.log(3 / 2);
  assert.ok(Math.abs((idf.get("two") ?? NaN) - twoExpected) < 1e-10,
    `two-doc token idf must be ln(3/2)=${twoExpected.toFixed(6)}, got ${idf.get("two")}`);
});

test("buildImportIdfMap: single-doc corpus -> ln(1/1)=0 for that token", () => {
  const map = new Map([["eng_a", ["only-token"]]]);
  const idf = buildImportIdfMap(map);
  // N=1, df=1 -> ln(1/1)=0
  assert.equal(idf.get("only-token"), 0, "single-doc token in a 1-doc corpus: ln(1/1)=0");
});

test("buildImportIdfMap: non-Map input -> empty Map", () => {
  const idf = buildImportIdfMap(null);
  assert.ok(idf instanceof Map && idf.size === 0, "non-Map input must return empty Map");
  const idf2 = buildImportIdfMap([["eng_a", ["x"]]]);
  assert.ok(idf2 instanceof Map && idf2.size === 0, "plain array must return empty Map");
});

test("buildImportIdfMap: empty map -> empty idf map", () => {
  const idf = buildImportIdfMap(new Map());
  assert.ok(idf instanceof Map && idf.size === 0, "empty input must return empty idf map");
});

// ---------------------------------------------------------------------------
// importFingerprintText
// ---------------------------------------------------------------------------

test("importFingerprintText: top-K by idf desc; drops idf<=0; ties by first occurrence", () => {
  // 3-engine corpus: "common" idf=0, "rare" idf=ln(3), "mid" idf=ln(3/2)
  const corpus = new Map([
    ["eng_a", ["common", "rare", "mid"]],
    ["eng_b", ["common", "mid"]],
    ["eng_c", ["common"]],
  ]);
  const idf = buildImportIdfMap(corpus);

  // For eng_a with k=2: should return "rare mid" (idf desc; "common" dropped as idf=0)
  const text = importFingerprintText(["common", "rare", "mid"], idf, 2);
  assert.equal(text, "rare mid",
    `expected "rare mid" (top-2 by idf, common dropped), got: "${text}"`);

  // k=1: only the top token
  const text1 = importFingerprintText(["common", "rare", "mid"], idf, 1);
  assert.equal(text1, "rare", `expected "rare" for k=1, got: "${text1}"`);

  // All tokens have idf<=0 -> ""
  const textEmpty = importFingerprintText(["common"], idf, 12);
  assert.equal(textEmpty, "", `expected "" when all tokens idf<=0, got: "${textEmpty}"`);
});

test("importFingerprintText: non-array importPaths -> ''", () => {
  const idf = new Map([["x", 1.0]]);
  assert.equal(importFingerprintText(null, idf), "");
  assert.equal(importFingerprintText(undefined, idf), "");
  assert.equal(importFingerprintText("not-an-array", idf), "");
});

test("importFingerprintText: non-Map idfMap -> ''", () => {
  assert.equal(importFingerprintText(["x"], null), "");
  assert.equal(importFingerprintText(["x"], { get: () => 1.0 }), "",
    "plain object with get() is not a Map");
});

test("importFingerprintText: empty importPaths -> ''", () => {
  const idf = new Map([["x", 1.0]]);
  assert.equal(importFingerprintText([], idf), "");
});

test("importFingerprintText: k=0 -> ''", () => {
  const idf = new Map([["rare", 2.0]]);
  assert.equal(importFingerprintText(["rare"], idf, 0), "");
});

test("importFingerprintText adversarial 1: duplicate tokens in input -- only first occurrence scored", () => {
  // "rare" appears twice in the input; must appear once in output
  const idf = new Map([["rare", 2.0], ["mid", 1.0]]);
  const text = importFingerprintText(["rare", "mid", "rare"], idf, 5);
  const parts = text.split(" ");
  const rareCount = parts.filter((t) => t === "rare").length;
  assert.equal(rareCount, 1, "duplicate token must appear only once");
  assert.equal(parts.length, 2, "only 2 unique tokens with idf>0");
});

test("importFingerprintText adversarial 2: non-string elements in importPaths are skipped", () => {
  const idf = new Map([["real", 2.0]]);
  // eslint-disable-next-line no-sparse-arrays
  const text = importFingerprintText(["real", null, 42, undefined, ""], idf, 5);
  assert.equal(text, "real", "non-string + empty elements must be skipped gracefully");
});

// ---------------------------------------------------------------------------
// Live-data invariant -- real mcp-server/src/engines dir
// ---------------------------------------------------------------------------

test("buildImportFingerprintMap on the REAL engines dir: size > 20 (full codebase coverage)", () => {
  const map = buildImportFingerprintMap(REAL_ENGINES_DIR);
  assert.ok(map.size > 20,
    `expected >20 engines in the real engines dir, got ${map.size}`);
  // Every value must be an array (possibly empty for engines with no non-engine imports).
  for (const [stem, tokens] of map) {
    assert.ok(Array.isArray(tokens), `engine ${stem} must map to an array, got ${typeof tokens}`);
  }
  // The IDF map over the real corpus must suppress truly universal tokens.
  const idf = buildImportIdfMap(map);
  assert.ok(idf instanceof Map && idf.size > 0, "real idf map must be non-empty");
  // "node/fs" or "node/path" appears in many engines -> its idf should be low (close to 0)
  // We just verify the IDF formula is sane: no negative values.
  for (const [tok, score] of idf) {
    assert.ok(score >= 0, `idf for "${tok}" must be >= 0, got ${score}`);
  }
  // importFingerprintText over a real engine must return a non-empty string if it has
  // any non-universal imports.
  let foundNonEmpty = false;
  for (const [, tokens] of map) {
    const text = importFingerprintText(tokens, idf, 12);
    if (text.length > 0) { foundNonEmpty = true; break; }
  }
  assert.ok(foundNonEmpty, "at least one real engine must produce non-empty importFingerprintText");
});
