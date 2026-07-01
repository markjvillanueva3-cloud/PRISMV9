// audit-unwired-engines.test.mjs
// Tests engineReferencedInConsumer — the wiring-detection predicate of
// audit-unwired-engines.mjs. Covers static imports, literal dynamic imports,
// table-driven ACTION_MAP wiring (the false-UNWIRED blind spot fixed 2026-05-18),
// substring-safety guards, and a real-file E2E against mechanicalDesignDispatcher.
//
// Run: node --test scripts/audit-unwired-engines.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { engineReferencedInConsumer, applyConsumerClassification, applyDormantBridgeClassification, isTypeOnlyModule } from "./audit-unwired-engines.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..");

// ── DORMANT-BRIDGE: gated module-load boot path (BACKEND-COMPLETION-TRIAGE #1b) ──
// A realistic boot fixture mirroring reactive-chains-boot.ts: an *_ENABLE gate literal + a
// REGISTRATION_MODULES array of "./<Engine>.js" specifiers.
const BOOT_SRC = `
export const REACTIVE_CHAINS_ENV = "PRISM_REACTIVE_CHAINS_ENABLE";
export const REGISTRATION_MODULES = [
  "./reactiveChainBootstrap.js",
  "./cycleSchedulingBridge.js",
] as const;
export function reactiveChainsEnabled(env) { return env["PRISM_REACTIVE_CHAINS_ENABLE"] === "1"; }
`;
const BOOT_BASE = "reactive-chains-boot";
const engMap = (entries) => new Map(entries.map(([n, classified, reasons = []]) => [n, { classified, reasons }]));

// ── TYPE-ONLY import exclusion (U-AUDIT-TYPE-ONLY-IMPORT 2026-06-21) ──
test("engineReferencedInConsumer: a runtime VALUE import wires the engine", () => {
  assert.equal(engineReferencedInConsumer("EntitlementOverrideStore", `import { entitlementOverrideStore } from "../engines/EntitlementOverrideStore.js";`), true);
  assert.equal(engineReferencedInConsumer("FooEngine", `await import("../engines/FooEngine.js");`), true);
  assert.equal(engineReferencedInConsumer("FooEngine", `import { fooEngine, barEngine } from "../engines/FooEngine.js";`), true);
});
test("engineReferencedInConsumer: a TYPE-ONLY import is NOT wiring (erased at runtime)", () => {
  assert.equal(engineReferencedInConsumer("FooEngine", `import type { FooEngine } from "../engines/FooEngine.js";`), false);
  assert.equal(engineReferencedInConsumer("FooEngine", `import type FooEngine from "../engines/FooEngine.js";`), false);
  assert.equal(engineReferencedInConsumer("FooEngine", `import type{FooEngine} from "../engines/FooEngine.js";`), false);
});
test("engineReferencedInConsumer: inline `import { type X }` (value statement) still wires -- only leading `import type` is excluded", () => {
  assert.equal(engineReferencedInConsumer("FooEngine", `import { type FooEngine } from "../engines/FooEngine.js";`), true);
});

test("DORMANT-BRIDGE: an UNWIRED registration module is reclassified", () => {
  const engines = engMap([["cycleSchedulingBridge", "UNWIRED", []]]);
  const r = applyDormantBridgeClassification(engines, BOOT_SRC, BOOT_BASE);
  assert.equal(engines.get("cycleSchedulingBridge").classified, "DORMANT-BRIDGE");
  assert.deepEqual(r.reclassified, ["cycleSchedulingBridge"]);
  assert.equal(r.gateEnv, "PRISM_REACTIVE_CHAINS_ENABLE");
});

test("DORMANT-BRIDGE: a SOLELY-boot-wired (WIRED-VIA-ENGINE via the boot module) registration module is reclassified", () => {
  const engines = engMap([["cycleSchedulingBridge", "WIRED-VIA-ENGINE", ["WIRED-VIA-ENGINE:engines/reactive-chains-boot.ts"]]]);
  applyDormantBridgeClassification(engines, BOOT_SRC, BOOT_BASE);
  assert.equal(engines.get("cycleSchedulingBridge").classified, "DORMANT-BRIDGE");
});

test("DORMANT-BRIDGE: a WIRE-EXEMPT registration module is NEVER overridden (highest-priority class)", () => {
  const engines = engMap([["reactiveChainBootstrap", "WIRE-EXEMPT", ["exempt: load-time bootstrap"]]]);
  const r = applyDormantBridgeClassification(engines, BOOT_SRC, BOOT_BASE);
  assert.equal(engines.get("reactiveChainBootstrap").classified, "WIRE-EXEMPT");
  assert.ok(!r.reclassified.includes("reactiveChainBootstrap"));
});

test("DORMANT-BRIDGE: a registration module ALSO wired by a real dispatcher (non-boot reason) stays as-is (genuinely active)", () => {
  const engines = engMap([["cycleSchedulingBridge", "WIRED-DIRECT", ["WIRED-DIRECT:tools/dispatchers/erpDispatcher.ts"]]]);
  applyDormantBridgeClassification(engines, BOOT_SRC, BOOT_BASE);
  assert.equal(engines.get("cycleSchedulingBridge").classified, "WIRED-DIRECT");
});

test("DORMANT-BRIDGE: an UNGATED boot (no *_ENABLE literal) leaves modules untouched (genuinely active)", () => {
  const ungated = `export const REGISTRATION_MODULES = ["./cycleSchedulingBridge.js"];`;
  const engines = engMap([["cycleSchedulingBridge", "UNWIRED", []]]);
  const r = applyDormantBridgeClassification(engines, ungated, BOOT_BASE);
  assert.equal(r.gateEnv, null);
  assert.equal(engines.get("cycleSchedulingBridge").classified, "UNWIRED");
  assert.deepEqual(r.reclassified, []);
});

test("DORMANT-BRIDGE: absent/empty boot source is a no-op", () => {
  const engines = engMap([["cycleSchedulingBridge", "UNWIRED", []]]);
  assert.deepEqual(applyDormantBridgeClassification(engines, null, BOOT_BASE).reclassified, []);
  assert.deepEqual(applyDormantBridgeClassification(engines, BOOT_SRC, "").reclassified, []);
  assert.equal(engines.get("cycleSchedulingBridge").classified, "UNWIRED");
});

test("DORMANT-BRIDGE: extracts module basenames from the REGISTRATION_MODULES array", () => {
  const engines = engMap([]);
  const r = applyDormantBridgeClassification(engines, BOOT_SRC, BOOT_BASE);
  assert.deepEqual(r.modules, ["reactiveChainBootstrap", "cycleSchedulingBridge"]);
});

// ── Form 1: static import ──────────────────────────────────────────
test("static named import with .js extension → wired", () => {
  const c = `import { fooEngine } from "../../engines/FooEngine.js";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("static named import without extension (TS source) → wired", () => {
  const c = `import { FooEngine } from "../../engines/FooEngine";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("multi-symbol static import line → wired", () => {
  const c = `import { FooEngine, FooEngineInput } from "../../engines/FooEngine.js";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

// ── Form 2: literal dynamic import ─────────────────────────────────
test("literal dynamic import await import('...Engine.js') → wired", () => {
  const c = `const m = await import("../../engines/FooEngine.js");`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("route-map lazy loader () => import('...Engine.js') WITHOUT await → wired", () => {
  // Regression for the 2026-06-18 false-UNWIRED blind spot: `Record<string, () => import(...)>`
  // dispatch maps (XPROC_ROUTES, etc.) wire engines with NO `await`. The Form-2 regex required
  // `await import(` and so missed every route-map-only engine (e.g. XProcNeuralAutoFireEngine,
  // wired via xproc_autofire_* in aiReasoningDispatcher yet flagged UNWIRED). Fails-on-revert.
  const c = `  xproc_autofire_activate: () => import("../../engines/FooEngine.js").then(m => m.fooDispatch),`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

// ── Comment-stripping: a commented import must NOT false-WIRE a real orphan (arm-C P2) ──
test("commented-out literal import (// ... import('...Engine.js')) → NOT wired", () => {
  const c = `  // const m = await import("../../engines/FooEngine.js"); // disabled`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("import inside a block comment (body line NOT *-prefixed) → NOT wired (true block-strip discriminator)", () => {
  // The import line has NO leading '*', so ONLY line-anchored block-removal can strip it
  // (the *-line filter cannot). Fails-on-revert of the block-removal regex.
  const c = [
    "/*",
    `   import("../../engines/FooEngine.js")`,
    "*/",
    "const x = 1;",
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("in-string block tokens do NOT strip a real import (string-literal footgun guard)", () => {
  // A block-open token inside a string + a block-close token inside a later string must NOT
  // open a strip span that eats the REAL import between them. The block regex is line-start
  // anchored, so a mid-line in-string block-open is ignored. Fails-on-revert to an unanchored
  // block regex (which ate 100+ real lines in ppDispatcher.ts -- caught by scrutiny 2026-06-18).
  const c = [
    `const GLOB = "x/*y";`,
    `await import("../../engines/FooEngine.js");`,
    `const Z = "a*/b";`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("URL-footgun guard: a real import on a code line near http:// stays wired", () => {
  // Only WHOLE comment lines + block comments are removed; a code line is never mid-line
  // stripped, so a `//` inside `http://` cannot eat a real import (the sibling-fix footgun).
  const c = [
    `fetch("http://example.com/api"); // see http://docs`,
    `const m = await import("../../engines/FooEngine.js");`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

// ── Form 3: table-driven ACTION_MAP (the fixed blind spot) ─────────
test("table-driven: templated dynamic import + double-quoted token → wired", () => {
  const c = [
    `const ACTION_MAP = { foo_calc: ["FooEngine", "fooEngine", "calculate"] };`,
    "const mod = await import(`../../engines/${file}.js`);",
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("table-driven: single-quoted token also detected → wired", () => {
  const c = [
    `const ACTION_MAP = { foo_calc: ['FooEngine', 'fooEngine', 'calculate'] };`,
    "const mod = await import(`../../engines/${name}.js`);",
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), true);
});

test("table-driven without a templated import → NOT wired (guard)", () => {
  // quoted token present but no `await import(`...${`)` — not a wiring.
  const c = `const LABEL = "FooEngine"; // just a string constant`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("templated import present but engine name not quoted → NOT wired", () => {
  const c = [
    "const mod = await import(`../../engines/${file}.js`);",
    "// FooEngine is documented elsewhere",
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("table-driven: exact-quoted name in a COMMENT (no trailing comma) → NOT wired", () => {
  // Form-3 false-positive guard: the engine name is quoted exactly but is a
  // prose mention, not an ACTION_MAP tuple element — no comma follows. A file
  // with an unrelated templated import must NOT mark it wired. Fails-on-revert
  // if Form 3 drops the trailing-comma requirement.
  const c = [
    "const mod = await import(`../../engines/${file}.js`);",
    `// the "GhostEngine" adapter is deprecated and slated for removal`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("GhostEngine", c), false);
});

test("table-driven: quoted name at end-of-statement (no comma) → NOT wired", () => {
  const c = [
    "const mod = await import(`../../engines/${file}.js`);",
    `const label = "GhostEngine";`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("GhostEngine", c), false);
});

// ── Negative: prose / error-message mentions must not count ────────
test("comment-only mention → NOT wired", () => {
  const c = `// FooEngine does the foo calculation, see docs`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("error-message substring (quoted phrase, not a bare token) → NOT wired", () => {
  const c = [
    "const mod = await import(`../../engines/${file}.js`);",
    `throw new Error("FooEngine not found in registry");`,
  ].join("\n");
  // "FooEngine not found..." — char after FooEngine is a space, not a quote.
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

// ── Substring-safety guards ────────────────────────────────────────
test("substring guard: short name not matched inside a longer import path", () => {
  const c = `import { fooBar } from "../../engines/FooBarEngine.js";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("substring guard: short name not matched as a SUFFIX of a longer segment", () => {
  // `FooEngine` must not match inside the path segment `SuperFooEngine.js` —
  // the literal-path regex anchors the basename to a segment start (`/` or
  // the opening quote). Fails-on-revert if that anchor is removed.
  const c = `import { x } from "../../engines/SuperFooEngine.js";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("substring guard: short name not matched inside a longer quoted token", () => {
  const c = [
    `const ACTION_MAP = { x: ["FooBarEngine", "fooBarEngine", "calculate"] };`,
    "const mod = await import(`../../engines/${file}.js`);",
  ].join("\n");
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("absent engine name → NOT wired", () => {
  const c = `import { barEngine } from "../../engines/BarEngine.js";`;
  assert.equal(engineReferencedInConsumer("FooEngine", c), false);
});

test("empty / falsy inputs → NOT wired (no throw)", () => {
  assert.equal(engineReferencedInConsumer("", "content"), false);
  assert.equal(engineReferencedInConsumer("FooEngine", ""), false);
  assert.equal(engineReferencedInConsumer("FooEngine", null), false);
  assert.equal(engineReferencedInConsumer("FooEngine", undefined), false);
  assert.equal(engineReferencedInConsumer(null, "content"), false);
});

// ── Real-file E2E — fail-on-revert oracle ──────────────────────────
// mechanicalDesignDispatcher wires 51 engines via a table-driven ACTION_MAP.
// Before the 2026-05-18 fix these were all reported UNWIRED. This test reads
// the live dispatcher and fails if the table-driven detection regresses.
test("E2E: real mechanicalDesignDispatcher wires SpringCalcEngine via ACTION_MAP", () => {
  const disp = path.join(
    PRISM_ROOT,
    "mcp-server/src/tools/dispatchers/mechanicalDesignDispatcher.ts",
  );
  if (!existsSync(disp)) {
    // Skip-loud: the dispatcher must exist in a normal checkout.
    assert.fail(`expected dispatcher not found: ${disp}`);
  }
  const content = readFileSync(disp, "utf8");
  assert.equal(
    engineReferencedInConsumer("SpringCalcEngine", content),
    true,
    "SpringCalcEngine is in mechanicalDesignDispatcher ACTION_MAP — must detect as wired",
  );
  assert.equal(
    engineReferencedInConsumer("BallScrewSelectionEngine", content),
    true,
    "BallScrewSelectionEngine is in the ACTION_MAP — must detect as wired",
  );
  assert.equal(
    engineReferencedInConsumer("CamProfileEngine", content),
    true,
    "CamProfileEngine is in the ACTION_MAP — must detect as wired",
  );
  assert.equal(
    engineReferencedInConsumer("ZzDefinitelyNotAnEngineXyz", content),
    false,
    "a name absent from the dispatcher must not be detected as wired",
  );
});

// === applyConsumerClassification -- the WIRED-VIA-ENGINE library-layer pass ===
// (U-AUDIT-WIRED-VIA-ENGINE, 2026-06-10): engines consumed only by ANOTHER
// engine were mis-counted UNWIRED (the consumer set was dispatcher/route/
// registry/orch/hook/singleton -- plain engine->engine consumption was invisible,
// so library engines like QdrantVectorStoreEngine showed dormant + were chased
// as false dispatcher-wiring targets). These tests fail-on-revert if the
// engine-consumer pass, its lowest-priority ordering, or self-exclusion regress.

function mkEngines(names) {
  const m = new Map();
  for (const n of names) m.set(n, { classified: null, reasons: [] });
  return m;
}

test("WIRED-VIA-ENGINE: engine consumed only by another engine is NOT dormant", () => {
  const engines = mkEngines(["QdrantVectorStoreEngine", "MemoryRecallEngine"]);
  // MemoryRecallEngine imports QdrantVectorStoreEngine as a library dependency.
  const engineConsumers = [
    {
      rel: "engines/MemoryRecallEngine.ts",
      content: `import { qdrantVectorStoreEngine } from "../engines/QdrantVectorStoreEngine.js";`,
      engineName: "MemoryRecallEngine",
    },
    {
      rel: "engines/QdrantVectorStoreEngine.ts",
      content: "export class QdrantVectorStoreEngine {}",
      engineName: "QdrantVectorStoreEngine",
    },
  ];
  applyConsumerClassification(engines, engineConsumers, "WIRED-VIA-ENGINE", { excludeSelf: true });
  assert.equal(
    engines.get("QdrantVectorStoreEngine").classified,
    "WIRED-VIA-ENGINE",
    "library engine consumed by another engine must classify WIRED-VIA-ENGINE, not stay UNWIRED",
  );
  // Nothing imports MemoryRecallEngine here -> it stays unclassified (UNWIRED in main()).
  assert.equal(engines.get("MemoryRecallEngine").classified, null);
});

test("priority: dispatcher wiring is not downgraded by a later engine-consumer pass", () => {
  const engines = mkEngines(["FooEngine"]);
  applyConsumerClassification(
    engines,
    [{ rel: "tools/dispatchers/fooDispatcher.ts", content: `await import("../../engines/FooEngine.js");`, engineName: "fooDispatcher" }],
    "WIRED-DIRECT",
  );
  applyConsumerClassification(
    engines,
    [{ rel: "engines/BarEngine.ts", content: `import { fooEngine } from "../engines/FooEngine.js";`, engineName: "BarEngine" }],
    "WIRED-VIA-ENGINE",
    { excludeSelf: true },
  );
  assert.equal(engines.get("FooEngine").classified, "WIRED-DIRECT", "first (highest-priority) match wins");
  assert.ok(
    engines.get("FooEngine").reasons.some((r) => r.startsWith("WIRED-VIA-ENGINE:")),
    "the secondary engine-consumer reason is still recorded as evidence",
  );
});

test("WIRED-VIA-MIDDLEWARE: an engine consumed only by request middleware is wired, not UNWIRED", () => {
  // models EntitlementOverrideStore <- attachUserPlan middleware (U-AUDIT-WIRED-VIA-MIDDLEWARE 2026-06-21)
  const engines = mkEngines(["EntitlementOverrideStore"]);
  applyConsumerClassification(
    engines,
    [{ rel: "middleware/attachUserPlan.ts", content: `import { entitlementOverrideStore } from "../engines/EntitlementOverrideStore.js";`, engineName: "attachUserPlan" }],
    "WIRED-VIA-MIDDLEWARE",
  );
  assert.equal(engines.get("EntitlementOverrideStore").classified, "WIRED-VIA-MIDDLEWARE");
});

test("priority: a route consumer (higher) wins over middleware for the same engine", () => {
  // the live case: the billing route + attachUserPlan middleware both consume EntitlementOverrideStore;
  // route is 2nd in priority, middleware 3rd, so route wins and middleware is recorded as evidence.
  const engines = mkEngines(["FooStore"]);
  applyConsumerClassification(engines, [{ rel: "routes/billing.ts", content: `import { fooStore } from "../engines/FooStore.js";`, engineName: "billing" }], "WIRED-VIA-ROUTE");
  applyConsumerClassification(engines, [{ rel: "middleware/x.ts", content: `import { fooStore } from "../engines/FooStore.js";`, engineName: "x" }], "WIRED-VIA-MIDDLEWARE");
  assert.equal(engines.get("FooStore").classified, "WIRED-VIA-ROUTE", "first match (route) wins");
  assert.ok(engines.get("FooStore").reasons.some((r) => r.startsWith("WIRED-VIA-MIDDLEWARE:")), "middleware still recorded as evidence");
});

test("self-exclusion: an engine's own file never marks it WIRED-VIA-ENGINE", () => {
  const engines = mkEngines(["SelfRefEngine"]);
  const own = {
    rel: "engines/SelfRefEngine.ts",
    content: `import { x } from "../engines/SelfRefEngine.js";`,
    engineName: "SelfRefEngine",
  };
  applyConsumerClassification(engines, [own], "WIRED-VIA-ENGINE", { excludeSelf: true });
  assert.equal(engines.get("SelfRefEngine").classified, null, "a self-import must not classify the engine as wired");
});

test("WIRE-EXEMPT engines are never reclassified by a consumer pass", () => {
  const engines = mkEngines(["ExemptEngine"]);
  engines.get("ExemptEngine").classified = "WIRE-EXEMPT";
  applyConsumerClassification(
    engines,
    [{ rel: "engines/Consumer.ts", content: `import { exemptEngine } from "../engines/ExemptEngine.js";`, engineName: "Consumer" }],
    "WIRED-VIA-ENGINE",
    { excludeSelf: true },
  );
  assert.equal(engines.get("ExemptEngine").classified, "WIRE-EXEMPT");
  // Fail-on-revert of the `classified === "WIRE-EXEMPT"` skip itself (not just the
  // priority guard): if the skip is removed, the consumer reference still pushes a
  // spurious "WIRED-VIA-ENGINE:" reason onto an exempt engine. The empty-reasons
  // assertion is what actually fails when the exempt-skip regresses.
  assert.deepEqual(
    engines.get("ExemptEngine").reasons,
    [],
    "an exempt engine must accrue NO consumer reason -- proves the WIRE-EXEMPT skip ran",
  );
});

test("truly dormant engine (zero consumers) stays unclassified -> UNWIRED in main()", () => {
  const engines = mkEngines(["DormantEngine"]);
  applyConsumerClassification(
    engines,
    [{ rel: "engines/Unrelated.ts", content: `import { other } from "../engines/OtherEngine.js";`, engineName: "Unrelated" }],
    "WIRED-VIA-ENGINE",
    { excludeSelf: true },
  );
  assert.equal(engines.get("DormantEngine").classified, null, "an engine with no consumers must remain dormant");
});

// === isTypeOnlyModule -- TYPE-ONLY false-positive exclusion (U-AUDIT-TYPE-ONLY 2026-06-22) ===
// A module that exports ONLY TS types/interfaces (e.g. IEngine.ts, `export type { ... } from`)
// erases to zero runtime JS and can NEVER be wired to a dispatcher. The name-based `.types.ts`
// filter in main() misses a conventionally-named type-only file, so it was flagged UNWIRED --
// a false-positive that inflates the actionable orphan count + sends the fleet chasing a phantom
// wiring target. CONSERVATIVE by design (R12): only true when there is a POSITIVE type-export AND
// zero runtime-export signals -- a real engine must NEVER be wrongly excluded (the dangerous dir).

// ── HAPPY: genuinely type-only modules → true ──
test("isTypeOnlyModule: `export type { ... } from` (the IEngine.ts shape) → true", () => {
  assert.equal(isTypeOnlyModule(`export type { EngineInfo, EngineCapability } from "./BaseEngine.js";`), true);
});
test("isTypeOnlyModule: `export interface` and `export type Foo =` → true", () => {
  assert.equal(isTypeOnlyModule(`export interface Foo { x: number; y: string }`), true);
  assert.equal(isTypeOnlyModule(`export type Vec = readonly [number, number];`), true);
});
test("isTypeOnlyModule: `export type * from` (star type re-export) → true", () => {
  assert.equal(isTypeOnlyModule(`export type * from "./shapes.js";`), true);
});
test("isTypeOnlyModule: JSDoc block + type-only export (comment stripped) → true", () => {
  const src = ["/**", " * IEngine -- type re-exports for convenience.", " */", `export type { EngineInfo } from "./BaseEngine.js";`].join("\n");
  assert.equal(isTypeOnlyModule(src), true);
});

// ── FAILURE: any runtime export → false (must NOT exclude a real engine) ──
test("isTypeOnlyModule: `export class` → false", () => {
  assert.equal(isTypeOnlyModule(`export class FooEngine { run() { return 1; } }`), false);
});
test("isTypeOnlyModule: `export const`/`export function`/`export default` (runtime values) → false", () => {
  assert.equal(isTypeOnlyModule(`export const fooEngine = new FooEngine();`), false);
  assert.equal(isTypeOnlyModule(`export function calc(x) { return x * 2; }`), false);
  assert.equal(isTypeOnlyModule(`export async function load() {}`), false);
  assert.equal(isTypeOnlyModule(`const e = {}; export default e;`), false);
});
test("isTypeOnlyModule: `export enum` (emits runtime) → false (conservative)", () => {
  assert.equal(isTypeOnlyModule(`export enum Color { Red, Green }`), false);
  assert.equal(isTypeOnlyModule(`export const enum Dir { Up, Down }`), false);
});
test("isTypeOnlyModule: value re-export `export { x } from` / `export * from` → false", () => {
  assert.equal(isTypeOnlyModule(`export { fooEngine } from "./FooEngine.js";`), false);
  assert.equal(isTypeOnlyModule(`export * from "./barrel.js";`), false);
});
test("isTypeOnlyModule: CommonJS runtime export → false", () => {
  assert.equal(isTypeOnlyModule(`module.exports = { fooEngine };`), false);
  assert.equal(isTypeOnlyModule(`exports.fooEngine = makeEngine();`), false);
});
test("isTypeOnlyModule: a file with NO exports (side-effect / empty) is NOT type-only → false", () => {
  assert.equal(isTypeOnlyModule(`import "./register.js";\nconsole.log("boot");`), false);
  assert.equal(isTypeOnlyModule(``), false);
  assert.equal(isTypeOnlyModule(null), false);
  assert.equal(isTypeOnlyModule(undefined), false);
});

// ── ADVERSARIAL: the dangerous direction (a real engine wrongly excluded) ──
test("isTypeOnlyModule: ADVERSARIAL mixed file -- type export at top, runtime export later → false", () => {
  // THE critical guard: a file that LOOKS type-only in its head but has a runtime export
  // below MUST NOT be excluded. The detector runs over the FULL source for exactly this reason.
  const src = [
    `export type Cfg = { n: number };`,
    `// ... 40 lines of type aliases ...`,
    `export const defaultCfg: Cfg = { n: 1 };`,
  ].join("\n");
  assert.equal(isTypeOnlyModule(src), false);
});
test("isTypeOnlyModule: ADVERSARIAL commented-out runtime export does NOT rescue a real-runtime file", () => {
  // A real `export const` with a type export above: the commented twin must not flip the verdict,
  // and the live `export const` must keep it false.
  const src = [`export type Cfg = { n: number };`, `// export const x = 1;  (disabled)`, `export const live = 2;`].join("\n");
  assert.equal(isTypeOnlyModule(src), false);
});
test("isTypeOnlyModule: ADVERSARIAL inline-type bare export `export { type Foo }` → false (conservative, never wrongly drops)", () => {
  // TS 4.5 inline-type syntax uses `export {` (a value-reexport shape). We treat it as runtime so
  // we never wrongly exclude -- the SAFE direction (a missed type-only is harmless; a dropped real
  // engine hides a wiring gap). Documents the conservative choice.
  assert.equal(isTypeOnlyModule(`export { type Foo } from "./shapes.js";`), false);
});
test("isTypeOnlyModule: ADVERSARIAL a comment mentioning `export const` does NOT make a type-only file runtime", () => {
  const src = [`// this module used to export const FOO -- now type-only`, `export type Foo = number;`].join("\n");
  assert.equal(isTypeOnlyModule(src), true);
});

// ── Real-file E2E -- fail-on-revert oracle (ties the fix to live files) ──
test("E2E: the live IEngine.ts is detected TYPE-ONLY (the actual false-positive this fix removes)", () => {
  const p = path.join(PRISM_ROOT, "mcp-server/src/engines/IEngine.ts");
  if (!existsSync(p)) assert.fail(`expected type-only file not found: ${p}`);
  assert.equal(isTypeOnlyModule(readFileSync(p, "utf8")), true, "IEngine.ts exports only types -> must be TYPE-ONLY, not UNWIRED");
});
test("E2E: a real runtime module (this audit script, full of `export function`) is NOT type-only", () => {
  const p = path.join(PRISM_ROOT, "scripts/audit-unwired-engines.mjs");
  assert.equal(isTypeOnlyModule(readFileSync(p, "utf8")), false, "a module with runtime exports must never be classified TYPE-ONLY");
});

// ── Form 4: module-specifier array + VARIABLE dynamic import ───────────
// (U-AUDIT-ENTRY-CONSUMER, 2026-06-18): engines booted via a path-string array
// imported through a variable (`const MODS=["./EngineA.js"]; for(m of MODS) import(m)`)
// were a false-UNWIRED blind spot -- Forms 1-2 need a literal `import("...EngineA.js")`,
// which never appears. Motivating case: reactive-chains-boot's REGISTRATION_MODULES
// booting reactiveChainBootstrap + cycleSchedulingBridge.
test("Form 4: module-specifier array + variable dynamic import -> wired", () => {
  const c = [
    `const REGISTRATION_MODULES = ["./reactiveChainBootstrap.js", "./cycleSchedulingBridge.js"];`,
    `for (const m of REGISTRATION_MODULES) await import(m);`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("reactiveChainBootstrap", c), true);
  assert.equal(engineReferencedInConsumer("cycleSchedulingBridge", c), true);
});

test("Form 4: importer(m) wrapping import(m) over a path-string array -> wired (reactive-chains-boot shape)", () => {
  const c = [
    `export const REGISTRATION_MODULES = ["./reactiveChainBootstrap.js"];`,
    `const importer = (m) => import(m);`,
    `for (const moduleSpecifier of REGISTRATION_MODULES) { await importer(moduleSpecifier); }`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("reactiveChainBootstrap", c), true);
});

test("Form 4 guard: a path-like string with NO variable dynamic import -> NOT wired", () => {
  const c = `const DOCS = "see ./reactiveChainBootstrap.js for details";`;
  assert.equal(engineReferencedInConsumer("reactiveChainBootstrap", c), false);
});

test("Form 4 guard: variable import present but engine named only in a NON-path quoted string -> NOT wired", () => {
  // The mandatory leading slash excludes a bare quoted mention with no path form.
  const c = [
    `for (const m of MODS) await import(m);`,
    `const label = "reactiveChainBootstrap";`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("reactiveChainBootstrap", c), false);
});

test("Form 4 substring guard: short name not matched as a prefix of a longer path basename", () => {
  // basename in the path is reactiveChainBootstrapV2 -- the trailing anchor (.js
  // or closing quote) must stop a prefix-only match. Fails-on-revert of the anchor.
  const c = [
    `const MODS = ["./reactiveChainBootstrapV2.js"];`,
    `for (const m of MODS) await import(m);`,
  ].join("\n");
  assert.equal(engineReferencedInConsumer("reactiveChainBootstrap", c), false);
});

// ── WIRED-VIA-ENTRY: server-entry (index.ts) boot classification ───────
// (U-AUDIT-ENTRY-CONSUMER): index.ts boots engines via `await import("./engines/X.js")`
// but was MISSING from the consumer set, so entry-only-booted engines (reactive-chains-boot)
// were falsely UNWIRED. The pass mechanics are generic; main() feeds it index.ts.
test("WIRED-VIA-ENTRY: an engine booted only by the server entry classifies WIRED-VIA-ENTRY", () => {
  const engines = mkEngines(["reactive-chains-boot"]);
  applyConsumerClassification(
    engines,
    [{ rel: "index.ts", content: `const { bootReactiveChains } = await import("./engines/reactive-chains-boot.js");`, engineName: "index" }],
    "WIRED-VIA-ENTRY",
  );
  assert.equal(
    engines.get("reactive-chains-boot").classified,
    "WIRED-VIA-ENTRY",
    "an engine booted only by index.ts must be WIRED-VIA-ENTRY, not UNWIRED",
  );
});

test("priority: WIRED-VIA-ENTRY (entry boot) ranks above the later WIRED-VIA-ENGINE pass", () => {
  const engines = mkEngines(["reactive-chains-boot"]);
  applyConsumerClassification(
    engines,
    [{ rel: "index.ts", content: `await import("./engines/reactive-chains-boot.js");`, engineName: "index" }],
    "WIRED-VIA-ENTRY",
  );
  applyConsumerClassification(
    engines,
    [{ rel: "engines/SomeEngine.ts", content: `await import("../engines/reactive-chains-boot.js");`, engineName: "SomeEngine" }],
    "WIRED-VIA-ENGINE",
    { excludeSelf: true },
  );
  assert.equal(engines.get("reactive-chains-boot").classified, "WIRED-VIA-ENTRY", "entry-boot label wins over the later engine-consumer pass");
  assert.ok(
    engines.get("reactive-chains-boot").reasons.some((r) => r.startsWith("WIRED-VIA-ENGINE:")),
    "the secondary engine-consumer reason is still recorded as evidence",
  );
});
