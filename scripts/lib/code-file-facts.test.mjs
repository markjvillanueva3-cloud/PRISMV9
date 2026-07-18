#!/usr/bin/env node
/**
 * code-file-facts.test.mjs -- real-fixture oracle for the pure code-fact extractor.
 * Fixtures mirror the actual PRISM engine idiom; asserts are on concrete extracted
 * values (R9 -- a test that fails if the parse logic breaks), never toBeDefined stubs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify, extractHeaderJsdoc, extractExports, extractPrimarySymbol,
  extractMethods, extractDeps, importsPhysicsConstants, galaxyFromPath, extractFacts,
} from "./code-file-facts.mjs";

// A representative engine fixture (header JSDoc, class, methods, sibling + constants import).
const ENGINE_SRC = `/**
 * KienzleForceEngine -- cutting-force model via the Kienzle equation.
 * Second line of the header.
 */
import { KC11_BY_ISO } from "../physics/constants.js";
import { ChipThinningEngine } from "./ChipThinningEngine.js";
import { clamp } from "../util/math.js";

export class KienzleForceEngine {
  constructor(opts) { this.opts = opts; }
  computeForce(ap, fz) { return this._raw(ap, fz); }
  async predictWear(t) { return t; }
  _raw(a, b) { return a * b; }
}

export const KIENZLE_VERSION = "1.0";
`;

test("slugify: lowercase alnum, strips extension + punctuation", () => {
  assert.equal(slugify("KienzleForceEngine.ts"), "kienzleforceengine");
  assert.equal(slugify("Foo-Bar_Baz.mjs"), "foobarbaz");
  assert.equal(slugify(""), "");
  assert.equal(slugify(null), "");
});

test("extractHeaderJsdoc: top /** */ block, stars stripped", () => {
  const j = extractHeaderJsdoc(ENGINE_SRC);
  assert.match(j, /KienzleForceEngine -- cutting-force model/);
  assert.match(j, /Second line of the header\./);
  assert.doesNotMatch(j, /\*/);
});

test("extractHeaderJsdoc: ANCHORED -- ignores a deep inline block when file leads with code (P1 fix)", () => {
  // File leads with an import (code), then an inline /** */ documenting a const. The
  // header is NOT that inline block -> must return "" (was: misattributed as the header).
  const src = `import { x } from "./y.js";\n\n/** ASK_OLLAMA is the ollama path. */\nexport const ASK_OLLAMA = "z";\nexport function triggerCommandPipeline(){}`;
  assert.equal(extractHeaderJsdoc(src), "");
});

test("extractHeaderJsdoc: // line-comment header at top (shebang skipped)", () => {
  const src = `#!/usr/bin/env node\n// trigger-command-pipeline.mjs -- routes a command.\n// Second header line.\nimport x from "y";`;
  const j = extractHeaderJsdoc(src);
  assert.match(j, /trigger-command-pipeline\.mjs -- routes a command/);
  assert.match(j, /Second header line/);
  assert.doesNotMatch(j, /import/); // stops at first code line
});

test("extractExports: class + const, deduped, in order", () => {
  const ex = extractExports(ENGINE_SRC);
  const names = ex.map((e) => e.name);
  assert.deepEqual(names, ["KienzleForceEngine", "KIENZLE_VERSION"]);
  assert.equal(ex[0].kind, "class");
  assert.equal(ex[1].kind, "const");
});

test("extractPrimarySymbol: class wins; else basename-matching export; else first export", () => {
  assert.equal(extractPrimarySymbol(ENGINE_SRC), "KienzleForceEngine");
  // No class, no basename -> first export.
  assert.equal(extractPrimarySymbol(`export const A = 1;\nexport function b(){}`), "A");
  assert.equal(extractPrimarySymbol("// nothing"), null);
  // No class, basename given -> prefer the export matching the file basename (P1 fix:
  // trigger-command-pipeline.mjs titles as triggerCommandPipeline, not ASK_OLLAMA).
  const src = `export const ASK_OLLAMA = "z";\nexport function triggerCommandPipeline(){}`;
  assert.equal(extractPrimarySymbol(src, undefined, "trigger-command-pipeline.mjs"), "triggerCommandPipeline");
  // Basename with no matching export -> null (caller titles by the FILE, not a random
  // first export -- P1 fix: an entry-point script isn't titled by its ASK_OLLAMA const).
  assert.equal(extractPrimarySymbol(src, undefined, "unrelated-name.mjs"), null);
});

test("extractMethods: public methods only; excludes ctor, keywords, private", () => {
  const m = extractMethods(ENGINE_SRC);
  assert.ok(m.includes("computeForce"));
  assert.ok(m.includes("predictWear"));
  assert.ok(!m.includes("constructor"));
  assert.ok(!m.includes("_raw"), "private _-prefixed excluded");
  assert.ok(!m.includes("if") && !m.includes("return"), "keywords excluded");
});

test("extractDeps: sibling engine as slug wikilink target; util import dropped", () => {
  const deps = extractDeps(ENGINE_SRC);
  const slugs = deps.map((d) => d.slug);
  assert.ok(slugs.includes("chipthinningengine"), "sibling engine kept");
  assert.ok(!slugs.some((s) => s.includes("clamp") || s === "math"), "lowercase util dropped");
});

test("importsPhysicsConstants: true when physics/constants imported", () => {
  assert.equal(importsPhysicsConstants(ENGINE_SRC), true);
  assert.equal(importsPhysicsConstants(`import { x } from "./y.js";`), false);
});

test("galaxyFromPath: extracts galaxy subdir, else null", () => {
  assert.equal(galaxyFromPath("mcp-server/src/engines/mill/KienzleForceEngine.ts"), "mill");
  assert.equal(galaxyFromPath("mcp-server/src/engines/KienzleForceEngine.ts"), null);
  assert.equal(galaxyFromPath("mcp-server/src/algorithms/Foo.ts"), null);
});

test("extractFacts: full object, fail-soft on empty", () => {
  const f = extractFacts("mcp-server/src/engines/mill/KienzleForceEngine.ts", ENGINE_SRC, "engine");
  assert.equal(f.kind, "engine");
  assert.equal(f.primary, "KienzleForceEngine");
  assert.equal(f.galaxy, "mill");
  assert.equal(f.basename, "KienzleForceEngine.ts");
  assert.equal(f.importsPhysicsConstants, true);
  assert.ok(f.loc > 10);
  // Fail-soft: empty text -> valid sparse object, no throw.
  const e = extractFacts("x/y.ts", "", "schema");
  assert.equal(e.primary, null);
  assert.equal(e.loc, 0);
  assert.deepEqual(e.exports, []);
});
