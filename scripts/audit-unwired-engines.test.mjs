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
import { engineReferencedInConsumer, applyConsumerClassification } from "./audit-unwired-engines.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..");

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
