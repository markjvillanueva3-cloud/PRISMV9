// Tests for cad-text-to-cadquery.mjs (U-CAD-TEXT-BRIDGE, slot:zulu 2026-06-12).
// R9 intent: this bridge is the LLM caller the CadQueryCodeGeneratorEngine
// pipeline documents but never had. The pins that matter: (1) the JM doctrine
// (inch units / spark gap / no periodic splines) is HARD-CODED into every
// prompt, (2) the engine's canonical prompt is consumed when loadable and the
// bridge degrades cleanly when not, (3) structurally non-CAD generations are
// rejected before staging (a prose answer must never land as model.py).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify, buildPrompt, extractPythonCode, codeInvalidReason, loadEnginePrompt,
} from "./cad-text-to-cadquery.mjs";

const GOOD_CODE = [
  "import build123d as bd",
  "IN = 25.4  # inch -> mm",
  "side = 1.0 * IN",
  "hole_d = 0.25 * IN",
  "with bd.BuildPart() as p:",
  "    bd.Box(side, side, side)",
  "    bd.Hole(radius=hole_d / 2)",
  "import os",
  "bd.export_step(p.part, os.environ.get('OUTPUT_STEP', 'out.step'))",
].join("\n");

test("slugify: filesystem-safe, bounded, never empty", () => {
  assert.equal(slugify("A 1\" cube w/ 0.25in hole!"), "a-1-cube-w-0-25in-hole");
  assert.equal(slugify(""), "cad-request");
  assert.ok(slugify("x".repeat(200)).length <= 48);
});

test("buildPrompt: JM doctrine HARD-CODED in every prompt (inch 25.4, spark gap, periodic-spline ban, code-only)", () => {
  const p = buildPrompt("a 2 inch round punch");
  assert.match(p, /INCHES unless explicitly metric/);
  assert.match(p, /25\.4/);
  assert.match(p, /0\.0015 inch per side/);
  assert.match(p, /periodic B-spline/);
  assert.match(p, /ONLY one python code block/);
  assert.match(p, /REQUEST: a 2 inch round punch/);
});

test("buildPrompt: engine canonical prompt PREPENDED when given; template names appended when present", () => {
  const p = buildPrompt("x", ["trilobe", "punch-step"], "ENGINE-CANON-PROMPT");
  assert.ok(p.startsWith("ENGINE-CANON-PROMPT"), "engine prompt must lead");
  assert.match(p, /trilobe, punch-step/);
  const bare = buildPrompt("x");
  assert.ok(!bare.includes("ENGINE-CANON-PROMPT"));
  assert.ok(!/feature templates/.test(bare), "no template line when none available");
});

test("extractPythonCode: fenced code extracted; prose-only -> null (never staged)", () => {
  assert.equal(extractPythonCode("Here you go:\n```python\nimport cadquery\n```\nEnjoy!"), "import cadquery");
  assert.equal(extractPythonCode("I cannot generate that part."), null);
  assert.equal(extractPythonCode(""), null);
});

test("codeInvalidReason: real build123d script passes; missing import / STEP / inch-conversion each rejected", () => {
  assert.equal(codeInvalidReason(GOOD_CODE), null);
  assert.match(codeInvalidReason("print('hello world this is long enough padding')"), /no build123d\/cadquery import/);
  assert.match(codeInvalidReason("import build123d\n# lots of geometry code here but no export at all, padding padding"), /no STEP export/);
  assert.match(codeInvalidReason("import cadquery\n# make a box and export step somehow, padding padding padding"), /no inch->mm conversion/);
  assert.match(codeInvalidReason(""), /empty/);
});

test("loadEnginePrompt: consumes a loadable engine; FAIL-SOFT null on import failure (bridge never blocks on dist)", async () => {
  const viaFake = await loadEnginePrompt(async () => ({
    cadQueryCodeGeneratorEngine: { getCodeGenPrompt: () => "CANON ".repeat(20) },
  }));
  assert.ok(viaFake && viaFake.startsWith("CANON"));
  const onThrow = await loadEnginePrompt(async () => { throw new Error("no dist"); });
  assert.equal(onThrow, null);
  const onShortJunk = await loadEnginePrompt(async () => ({ cadQueryCodeGeneratorEngine: { getCodeGenPrompt: () => "x" } }));
  assert.equal(onShortJunk, null, "trivial/placeholder prompt rejected");
});
