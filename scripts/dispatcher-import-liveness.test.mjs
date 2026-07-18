/**
 * dispatcher-import-liveness tests -- import extraction, export parsing, the live/dead/
 * indeterminate classifier, and a real-tree smoke that MUST flag the algorithmGatewayEngine
 * P0 this tool was built to catch.
 *
 * DISCOVERY-EFFICIENCY/U-DISPATCHER-IMPORT-LIVENESS (slot:tango, 2026-06-15).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractNamedImports,
  parseModuleExports,
  isNameUsed,
  resolveTargetPath,
  analyzeDispatcher,
  scanDispatchers,
} from "./dispatcher-import-liveness.mjs";

// -- extractNamedImports --

test("extractNamedImports: lazy await-import destructure", () => {
  const src = `const { algorithmGatewayEngine } = await import("../../engines/AlgorithmGatewayEngine.js");`;
  const got = extractNamedImports(src);
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].bindings, [{ imported: "algorithmGatewayEngine", local: "algorithmGatewayEngine" }]);
  assert.equal(got[0].modPath, "../../engines/AlgorithmGatewayEngine.js");
  assert.equal(got[0].kind, "lazy");
});

test("extractNamedImports: static named import + multi-name + `as` alias tracks imported AND local", () => {
  const src = `import { FooEngine, barFn as bar } from "../../engines/Foo.js";`;
  const got = extractNamedImports(src);
  assert.equal(got.length, 1);
  // alias MUST keep both: imported=export-side name, local=call-site binding.
  assert.deepEqual(got[0].bindings, [
    { imported: "FooEngine", local: "FooEngine" },
    { imported: "barFn", local: "bar" },
  ]);
  assert.equal(got[0].kind, "static");
});

test("extractNamedImports: type-only import is skipped (erased at runtime)", () => {
  const src = `import type { Server } from "@modelcontextprotocol/sdk/server/index.js";`;
  assert.deepEqual(extractNamedImports(src), []);
});

test("extractNamedImports: inline `type` member is dropped", () => {
  const src = `import { realThing, type OnlyAType } from "../x.js";`;
  const got = extractNamedImports(src);
  assert.deepEqual(got[0].bindings, [{ imported: "realThing", local: "realThing" }]);
});

test("extractNamedImports: empty/null -> []", () => {
  assert.deepEqual(extractNamedImports(""), []);
  assert.deepEqual(extractNamedImports(null), []);
});

// -- parseModuleExports --

test("parseModuleExports: declaration exports (const/function/class/interface/type)", () => {
  const src = `
    export const fooEngine = new Foo();
    export function bar() {}
    export async function baz() {}
    export class QuxEngine {}
    export interface IThing {}
    export type Alias = number;
  `;
  const { names } = parseModuleExports(src);
  for (const n of ["fooEngine", "bar", "baz", "QuxEngine", "IThing", "Alias"]) {
    assert.ok(names.has(n), `expected export ${n}`);
  }
});

test("parseModuleExports: export-list with `as` exports the post-as name", () => {
  const { names } = parseModuleExports(`export { ACTIONS as ALGORITHM_ACTIONS, foo };`);
  assert.ok(names.has("ALGORITHM_ACTIONS"));
  assert.ok(names.has("foo"));
  assert.ok(!names.has("ACTIONS")); // ACTIONS is the local, not the exported name
});

test("parseModuleExports: wildcard + default flags", () => {
  const w = parseModuleExports(`export * from "./barrel.js";`);
  assert.equal(w.hasWildcard, true);
  const d = parseModuleExports(`export default class X {}`);
  assert.equal(d.hasDefault, true);
});

test("parseModuleExports: the real bug shape -- algorithmGateway exported, algorithmGatewayEngine NOT", () => {
  const src = `
    export function algorithmGateway(action, params) { return {}; }
    export function algorithmSelect(i) { return {}; }
  `;
  const { names } = parseModuleExports(src);
  assert.ok(names.has("algorithmGateway"));
  assert.ok(!names.has("algorithmGatewayEngine")); // <- the P0
});

// -- isNameUsed --

test("isNameUsed: member access / call / index count as used; bare mention does not", () => {
  assert.equal(isNameUsed(`x.foo()`, "x"), true);
  assert.equal(isNameUsed(`y(1)`, "y"), true);
  assert.equal(isNameUsed(`z[0]`, "z"), true);
  assert.equal(isNameUsed(`// just a comment about w being nice`, "w"), false);
  assert.equal(isNameUsed(``, "w"), false);
});

// -- resolveTargetPath --

test("resolveTargetPath: relative .js -> .ts candidates; bare specifier -> null", () => {
  const from = "/repo/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts";
  const got = resolveTargetPath("../../engines/AlgorithmGatewayEngine.js", from);
  assert.ok(Array.isArray(got));
  assert.ok(got[0].replace(/\\/g, "/").endsWith("mcp-server/src/engines/AlgorithmGatewayEngine.ts"));
  assert.equal(resolveTargetPath("@modelcontextprotocol/sdk/server/index.js", from), null);
});

// -- analyzeDispatcher (the classifier) --

const DISPATCHER_SRC = `
  async function handler({ action, params }) {
    const { goodEngine } = await import("../../engines/Good.js");
    const { missingEngine } = await import("../../engines/Bad.js");
    const { unusedEngine } = await import("../../engines/Unused.js");
    const { viaBarrel } = await import("../../engines/Barrel.js");
    switch (action) {
      case "a": return goodEngine.run(params);
      case "b": return missingEngine.run(params);
      case "c": return viaBarrel.run(params);
    }
  }
`;

function fakeReadFile(p) {
  const u = p.replace(/\\/g, "/");
  if (u.endsWith("engines/Good.ts")) return `export const goodEngine = {};`;
  if (u.endsWith("engines/Bad.ts")) return `export function somethingElse() {}`; // no missingEngine
  if (u.endsWith("engines/Unused.ts")) return `export function alsoElse() {}`;   // no unusedEngine, but unused
  if (u.endsWith("engines/Barrel.ts")) return `export * from "./real.js";`;      // wildcard -> indeterminate
  return null;
}

test("analyzeDispatcher: classifies LIVE / DEAD / INDETERMINATE correctly", () => {
  const res = analyzeDispatcher({
    file: "/repo/mcp-server/src/tools/dispatchers/x.ts",
    src: DISPATCHER_SRC,
    readFile: fakeReadFile,
  });
  // goodEngine -> live
  assert.equal(res.liveCount, 1);
  // missingEngine -> DEAD (used in case "b", target readable, not exported, no wildcard)
  assert.equal(res.dead.length, 1);
  assert.equal(res.dead[0].name, "missingEngine");
  // unusedEngine (not exported but never used) + viaBarrel (wildcard) -> indeterminate
  const indNames = res.indeterminate.map((i) => i.name).sort();
  assert.deepEqual(indNames, ["unusedEngine", "viaBarrel"]);
  const reasons = Object.fromEntries(res.indeterminate.map((i) => [i.name, i.reason]));
  assert.equal(reasons.unusedEngine, "imported-but-unused");
  assert.equal(reasons.viaBarrel, "wildcard-reexport-in-target");
});

test("analyzeDispatcher: unreadable target -> indeterminate (target-unreadable), never DEAD", () => {
  const res = analyzeDispatcher({
    file: "/repo/x.ts",
    src: `const { gone } = await import("../../engines/Gone.js"); gone.run();`,
    readFile: () => null,
  });
  assert.equal(res.dead.length, 0);
  assert.equal(res.indeterminate[0].reason, "target-unreadable");
});

// FAIL-ON-REVERT ORACLE (scrutiny-caught P0): an aliased import `orig as local` whose target
// exports the ORIGINAL `orig` (not the alias `local`) is LIVE, not DEAD. Conflating the two
// mis-flagged every working alias -- the dataDispatcher false positives. This test fails if
// the imported/local split regresses.
test("analyzeDispatcher: aliased import resolves on the IMPORTED name -> LIVE, not DEAD", () => {
  const src = `
    import { getCatalogSummary as getWorkholdingSummary } from "../../data/workholding-catalog.js";
    function handler() { return getWorkholdingSummary({}); }
  `;
  const readFile = (p) =>
    p.replace(/\\/g, "/").endsWith("data/workholding-catalog.ts")
      ? `export function getCatalogSummary(opts) { return {}; }`
      : null;
  const res = analyzeDispatcher({
    file: "/repo/mcp-server/src/tools/dispatchers/dataDispatcher.ts",
    src,
    readFile,
  });
  assert.equal(res.dead.length, 0, `alias of a real export must be LIVE, got DEAD: ${JSON.stringify(res.dead)}`);
  assert.equal(res.liveCount, 1);
});

test("analyzeDispatcher: aliased import whose IMPORTED name is genuinely absent -> DEAD (still catches real bugs)", () => {
  const src = `import { notExported as local } from "../../data/x.js"; local();`;
  const readFile = () => `export function somethingElse() {}`;
  const res = analyzeDispatcher({ file: "/repo/x.ts", src, readFile });
  assert.equal(res.dead.length, 1);
  assert.equal(res.dead[0].name, "notExported"); // reports the missing EXPORT name
  assert.equal(res.dead[0].local, "local");      // plus the call-site binding for context
});

// -- scanDispatchers (hermetic) --

test("scanDispatchers: hermetic dir scan rolls up DEAD across dispatchers", () => {
  const readDir = () => ["aDispatcher.ts", "bDispatcher.ts", "notes.ts", "aDispatcher.test.ts"];
  const readFile = (p) => {
    const u = p.replace(/\\/g, "/");
    if (u.endsWith("aDispatcher.ts")) return `const { x } = await import("../../engines/E.js"); x.go();`;
    if (u.endsWith("bDispatcher.ts")) return `const { y } = await import("../../engines/E.js"); y.go();`;
    if (u.endsWith("engines/E.ts")) return `export const x = {};`; // exports x, not y
    return null;
  };
  const res = scanDispatchers({ dir: "/d", readDir, readFile });
  assert.equal(res.scanned, 2); // notes.ts (no "dispatcher") + .test.ts excluded
  assert.equal(res.deadTotal, 1);
  assert.equal(res.dead[0].name, "y");
  assert.equal(res.dead[0].file, "bDispatcher.ts");
});

// -- real-tree smoke: MUST catch the P0 this tool exists for --

test("REAL TREE: algorithmGatewayEngine is flagged DEAD in algorithmDispatcher.ts (true positive)", () => {
  const res = scanDispatchers(); // live mcp-server/src/tools/dispatchers
  assert.ok(res.scanned > 50, `expected to scan many dispatchers, got ${res.scanned}`);
  const hit = res.dead.find(
    (d) => d.file === "algorithmDispatcher.ts" && d.name === "algorithmGatewayEngine"
  );
  assert.ok(hit, "algorithmGatewayEngine MUST be flagged DEAD (the P0 this tool catches)");
  assert.equal(hit.modPath, "../../engines/AlgorithmGatewayEngine.js");
});

// Negative assertion (scrutiny-caught P0 regression guard): dataDispatcher.ts imports
// findHolders/recommendHolder/getCatalogSummary via `as` alias -- those are LIVE and must
// NOT appear as DEAD. If the imported/local split regresses they reappear as false positives.
test("REAL TREE: aliased dataDispatcher imports are NOT false-flagged DEAD", () => {
  const res = scanDispatchers();
  const falsePositives = res.dead.filter((d) =>
    ["findDaishowaHolders", "recommendDaishowaHolder", "getWorkholdingSummary"].includes(d.name)
  );
  assert.deepEqual(falsePositives, [], `aliased imports must resolve LIVE, got false DEAD: ${JSON.stringify(falsePositives)}`);
});
