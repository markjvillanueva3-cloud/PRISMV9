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
  slugify, buildPrompt, extractPythonCode, codeInvalidReason, requestIsMetric, offlineSelfCheck, loadEnginePrompt,
  classifyGenerationOutcome, buildGenerationOutcomeRecord, ingestGenerationOutcome,
  loadTribalTips, loadLearnedRisk,
  hasExplicitDims, classifyRequestPartClass, loadClassDimPrior,
  classifyRequestArchetype, loadArchetypeRecipe,
  offlineMfgLogic,
} from "./cad-text-to-cadquery.mjs";

test("offlineMfgLogic: prismatic request -> mill stock body + vise workholding; round -> lathe + chuck; unparseable -> applicable:false", () => {
  const plate = offlineMfgLogic("a 2.0 inch square plate 0.375 inch thick");
  assert.equal(plate.applicable, true);
  assert.equal(plate.process, "mill", "prismatic shape infers mill");
  assert.equal(plate.stock.applicable, true);
  assert.ok(plate.stock.stockDims.every((d) => d > 0), "stock body is larger than finished, never fabricated");
  assert.match(plate.workholding.method, /vise/i);

  const disc = offlineMfgLogic("a 1.5 inch diameter disc 0.5 inch thick");
  assert.equal(disc.process, "lathe", "round shape infers lathe");
  assert.match(disc.workholding.method, /chuck/i);

  // soul rule: a dimensionless request never fabricates a stock/workholding plan
  assert.equal(offlineMfgLogic("a typical die plate").applicable, false);
  assert.equal(offlineMfgLogic("").applicable, false);
});

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
  assert.match(p, /INCHES\s+unless the request explicitly states metric/);
  assert.match(p, /NEVER DIVIDE a dimension by IN/, "the 25.4x-undersize mm-request bug is warned");
  assert.match(p, /25\.4/);
  assert.match(p, /0\.0015 inch per side/);
  assert.match(p, /periodic B-spline/);
  assert.match(p, /ONLY one python code block/);
  assert.match(p, /REQUEST: a 2 inch round punch/);
});

test("buildPrompt: spark-gap allowance is ELECTRODE-ONLY + warns the inch/mm units bug (U-DELTA-CADGEN-SPARKGAP-FIX)", () => {
  // Root-caused 2026-06-28: the dim-correction producer found ~16% of GEN parts undersized ~1.94mm
  // because the LLM applied the spark gap to plain plates AND with the units bug `(2.0 - 0.003*IN)*IN`.
  const p = buildPrompt("a 2.0 inch by 1.0 inch by 0.5 inch rectangular plate");
  assert.match(p, /EXACT nominal/, "leads with exact-nominal-dimensions");
  assert.match(p, /ONLY when the request EXPLICITLY names/, "allowance gated to explicit electrodes");
  assert.match(p, /NO allowance/, "plain parts get no allowance");
  assert.match(p, /units bug that systematically mis-sizes/, "warns the exact observed inch/mm units bug");
});

test("loadTribalTips: electrode-only spark-gap tip is GATED OUT for plain parts, KEPT for electrodes (P1, arm C)", async () => {
  // arm C found the PRODUCTION path (loadTribalTips -> buildPrompt) re-injected the electrode spark-gap
  // tip onto a plain plate via a stopword overlap, undercutting the buildPrompt 'NO allowance' doctrine.
  const fakeImport = async (url) => {
    if (/CADTribalDrawInjectionEngine/.test(url)) return {
      cadTribalDrawInjectionEngine: { recommend: () => ({ applied: [
        { tip: "Topology before tolerance: BRep first." },
        { tip: "JM sinker-EDM electrode spark gap = -.003in total (-.0015/side). Undersize the electrode by the spark gap." },
      ] }) },
    };
    if (/cadDrawTribalTips/.test(url)) return { CAD_DRAW_TRIBAL_TIPS: [{ id: "x" }] };
    return {};
  };
  const plain = await loadTribalTips("a 2.0 inch by 1.0 inch by 0.5 inch rectangular plate", fakeImport);
  assert.ok(!plain.some((t) => /spark gap|electrode/i.test(t)), "plain part must NOT carry the electrode spark-gap tip");
  assert.ok(plain.some((t) => /Topology/.test(t)), "non-electrode tips still pass through");
  const elec = await loadTribalTips("a sinker-EDM electrode for a cavity", fakeImport);
  assert.ok(elec.some((t) => /spark gap|electrode/i.test(t)), "an explicit electrode request KEEPS the spark-gap tip");
});

test("hasExplicitDims: detects a number+unit; under-specified requests are false (U-DELTA-CADGEN-DIMPRIOR)", () => {
  assert.equal(hasExplicitDims("a 2.0 inch by 1.0 inch plate"), true);
  assert.equal(hasExplicitDims("a 50mm cube"), true);
  assert.equal(hasExplicitDims('a 1.5" bore bushing'), true);
  assert.equal(hasExplicitDims("a typical bushing"), false);
  assert.equal(hasExplicitDims("a die plate for a stamping"), false);
  assert.equal(hasExplicitDims(""), false);
  // 3-of-3 arm-B P1: hyphenated/spaced-hyphen dims MUST count as explicit (the gate failed open here)
  assert.equal(hasExplicitDims("a 2-inch cube"), true);
  assert.equal(hasExplicitDims("a 2 - inch cube"), true);
  assert.equal(hasExplicitDims("a 0.5-in shaft"), true);
  // a bare hyphen before a NON-unit word must NOT false-positive
  assert.equal(hasExplicitDims("a 3-jaw chuck fixture"), false);
  assert.equal(hasExplicitDims("a 2-axis bracket"), false);
  // 3-of-3 arm-B P1 round 2: the MULTI-AXIS "NxM unit" form MUST count as explicit (it bypassed before)
  assert.equal(hasExplicitDims("a 2x1 inch plate"), true);
  assert.equal(hasExplicitDims("a 2.0 x 1.0 x 0.5 inch block"), true);
  // glued / short / feet forms
  assert.equal(hasExplicitDims("a 2in dowel"), true);
  assert.equal(hasExplicitDims("a 2 ft bar"), true);
  assert.equal(hasExplicitDims("a 4-40 tapped hole part"), false); // thread spec, no length unit -> under-spec
});

test("hasExplicitDims: LINEAR -- a long whitespace run with no unit does NOT backtrack (arm-C ReDoS P1)", () => {
  const start = process.hrtime.bigint();
  // 50k chars: a digit then a huge space run then no unit -- the old \\s*-?\\s* was O(n^2) here
  hasExplicitDims("2" + " ".repeat(50000) + "widget");
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(ms < 50, `hasExplicitDims must be linear; took ${ms.toFixed(1)}ms on a 50k whitespace run`);
});

test("loadClassDimPrior: PREFERS the KERNEL-GT dataset over the point-cloud dataset; falls back when absent", () => {
  const cls = 'classified as "casing"';
  const kernelRow = JSON.stringify({ instruction: `CAD generation from print -- a part ${cls}. envelope?`, output: 'A "casing" part envelope ~64 x 51 x 51 mm KERNEL.' });
  const pointRow = JSON.stringify({ instruction: `CAD generation from print -- a part ${cls}. envelope?`, output: 'A "casing" part envelope ~64 x 51 x 0 mm POINTCLOUD.' });
  // radii dataset absent here -> isolate the ENVELOPE trust-order behavior (radii always-append tested separately)
  const envOpts = { datasetPath: "ds.jsonl", kernelDatasetPath: "ds-kernel.jsonl", radiiDatasetPath: "ds-radii.jsonl" };
  const both = (p) => { const s = String(p); if (s.includes("radii")) throw new Error("ENOENT"); return s.includes("kernel") ? kernelRow : pointRow; };
  const out = loadClassDimPrior("a typical casing", { readFileImpl: both, ...envOpts });
  assert.equal(out.length, 1);
  assert.match(out[0], /KERNEL/);
  assert.doesNotMatch(out[0], /POINTCLOUD/, "kernel dataset must win over point-cloud");
  // kernel dataset absent -> falls back to the point-cloud dataset
  const noKernel = (p) => { const s = String(p); if (s.includes("kernel") || s.includes("radii")) throw new Error("ENOENT"); return pointRow; };
  const out2 = loadClassDimPrior("a typical casing", { readFileImpl: noKernel, ...envOpts });
  assert.equal(out2.length, 1);
  assert.match(out2[0], /POINTCLOUD/, "absent kernel dataset -> point-cloud fallback");
});

test("loadClassDimPrior: trust order kernel > PRISMATIC corpus > legacy point (U-DELTA-CADGEN-CORPUS-HARVEST)", () => {
  const cls = 'classified as "die"';
  const mk = (tag) => JSON.stringify({ instruction: `CAD generation from print -- a part ${cls}. envelope?`, output: `A "die" part envelope ~50 x 25 x 15 mm ${tag}.` });
  const rows = { kernel: mk("KERNEL"), prismatic: mk("PRISMATIC"), point: mk("LEGACYPOINT") };
  const pick = (p) => { const s = String(p); return s.includes("kernel") ? rows.kernel : s.includes("prismatic") ? rows.prismatic : rows.point; };
  const opts = { datasetPath: "ds.jsonl", kernelDatasetPath: "ds-kernel.jsonl", prismaticDatasetPath: "ds-prismatic.jsonl" };
  // all three present -> kernel wins
  assert.match(loadClassDimPrior("a typical die", { readFileImpl: pick, ...opts })[0], /KERNEL/);
  // kernel absent -> PRISMATIC corpus wins over legacy point (the whole point of the harvest)
  const noKernel = (p) => { if (String(p).includes("kernel")) throw new Error("ENOENT"); return pick(p); };
  const out = loadClassDimPrior("a typical die", { readFileImpl: noKernel, ...opts });
  assert.match(out[0], /PRISMATIC/, "absent kernel -> prismatic-corpus dataset must beat legacy point");
  assert.doesNotMatch(out[0], /LEGACYPOINT/);
  // kernel + prismatic absent -> legacy point is the last resort
  const onlyPoint = (p) => { if (/kernel|prismatic/.test(String(p))) throw new Error("ENOENT"); return rows.point; };
  assert.match(loadClassDimPrior("a typical die", { readFileImpl: onlyPoint, ...opts })[0], /LEGACYPOINT/);
});

test("loadClassDimPrior: radii prior ALWAYS appended, independent of envelope source (U-DELTA-CADGEN-RADII-PRIOR)", () => {
  const cls = 'classified as "die"';
  const envRow = JSON.stringify({ instruction: `CAD generation -- a part ${cls}. envelope?`, output: 'A "die" envelope ~50 x 25 x 15 mm ENVPRIOR.' });
  const radiiRow = JSON.stringify({ instruction: `CAD generation -- a part ${cls}. radii?`, output: 'A "die" radii span ~2-12 mm RADIIPRIOR.' });
  const opts = { datasetPath: "ds.jsonl", kernelDatasetPath: "ds-kernel.jsonl", prismaticDatasetPath: "ds-prismatic.jsonl", radiiDatasetPath: "ds-radii.jsonl" };
  // kernel envelope wins AND radii appended
  const pick = (p) => { const s = String(p); if (s.includes("radii")) return radiiRow; if (s.includes("kernel")) return envRow; throw new Error("ENOENT"); };
  const out = loadClassDimPrior("a typical die", { readFileImpl: pick, ...opts });
  assert.equal(out.length, 2, "envelope (kernel) + radii both present");
  assert.ok(out.some((o) => /ENVPRIOR/.test(o)) && out.some((o) => /RADIIPRIOR/.test(o)), "radii appended even though a kernel envelope won");
  // radii present even when NO envelope dataset has the class
  const radiiOnly = (p) => { if (String(p).includes("radii")) return radiiRow; throw new Error("ENOENT"); };
  const out2 = loadClassDimPrior("a typical die", { readFileImpl: radiiOnly, ...opts });
  assert.equal(out2.length, 1);
  assert.match(out2[0], /RADIIPRIOR/);
  // explicit dims still suppress EVERYTHING (radii included) -- the spark-gap-class guard
  assert.deepEqual(loadClassDimPrior("a 2 inch die", { readFileImpl: pick, ...opts }), []);
});

test("loadClassDimPrior: SAFETY -- a MULTI-AXIS explicit dim ('2x1 inch plate') suppresses the prior (arm-B P1 r2)", () => {
  const ds = '{"instruction":"CAD generation from print -- a part classified as \\"plate\\". What is the typical overall part envelope (bounding box) in mm?","output":"A plate envelope is typically ~99 x 61 x 38 mm."}';
  assert.deepEqual(loadClassDimPrior("a 2x1 inch plate", { readFileImpl: () => ds }), [], "multi-axis explicit dim must suppress the contradicting plate prior");
});

test("loadClassDimPrior: SAFETY -- a HYPHENATED explicit dim ('2-inch cube') suppresses the prior (arm-B P1 regression)", () => {
  const ds = '{"instruction":"CAD generation from print -- a part classified as \\"general\\". What is the typical overall part envelope (bounding box) in mm?","output":"A general envelope is typically ~99 x 61 x 38 mm."}';
  assert.deepEqual(loadClassDimPrior("a 2-inch cube", { readFileImpl: () => ds }), [], "explicit hyphenated dim must suppress the (contradicting) general prior");
});

test("classifyRequestPartClass: keyword -> part_class, fallback general", () => {
  assert.equal(classifyRequestPartClass("a die plate"), "die");
  assert.equal(classifyRequestPartClass("a bronze bushing"), "bushing");
  assert.equal(classifyRequestPartClass("a valve body casting"), "valve_body");
  assert.equal(classifyRequestPartClass("a 2 inch cube"), "general");
});

test("loadClassDimPrior: SAFETY -- returns [] when the request states explicit dims; injects the class prior only when UNDER-SPECIFIED", () => {
  const fakeDataset = [
    '{"instruction":"CAD generation from print -- a part classified as \\"bushing\\". What is the typical overall part envelope (bounding box) in mm?","output":"A bushing envelope is typically ~25 x 25 x 32 mm."}',
    '{"instruction":"CAD generation from print -- a part classified as \\"die\\". What is the typical overall part envelope (bounding box) in mm?","output":"A die envelope is typically ~133 x 86 x 40 mm."}',
  ].join("\n");
  // path-aware: only the envelope datasets serve this fixture; the radii dataset is absent (radii
  // always-append is covered by its own test) so this isolates the envelope class-match behavior.
  const readImpl = (p) => { if (String(p).includes("radii")) throw new Error("ENOENT"); return fakeDataset; };
  // explicit dims -> NO prior (explicit dims win by construction)
  assert.deepEqual(loadClassDimPrior("a 1.0 inch bore bushing 1.25 inch long", { readFileImpl: readImpl }), []);
  // under-specified -> the matched class prior is offered
  const p = loadClassDimPrior("a typical bushing", { readFileImpl: readImpl });
  assert.equal(p.length, 1);
  assert.match(p[0], /bushing envelope/i);
  // under-specified but a different class -> only THAT class's prior
  assert.ok(loadClassDimPrior("a stamping die", { readFileImpl: readImpl })[0].includes("die envelope"));
  // fail-soft: a read error -> []
  assert.deepEqual(loadClassDimPrior("a typical bushing", { readFileImpl: () => { throw new Error("no file"); } }), []);
});

test("buildPrompt: LEARNED SHOP DIMENSIONS section appears with the explicit-dims-win safety framing when priors given; absent when empty", () => {
  const p = buildPrompt("a typical bushing", [], null, [], [], ["A bushing envelope is typically ~25 x 25 x 32 mm."]);
  assert.match(p, /LEARNED SHOP DIMENSIONS/);
  assert.match(p, /states EXPLICITLY always wins/);
  assert.match(p, /bushing envelope/i);
  assert.ok(!/LEARNED SHOP DIMENSIONS/.test(buildPrompt("a 2 inch cube")), "no section when no priors");
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

test("codeInvalidReason: METRIC request -> a correct mm script (no IN) PASSES (was wrongly rejected, forcing the /IN bug)", () => {
  // A purely-mm part is mm-native -> CadQuery uses the value directly; requiring inch evidence rejected it
  // and pushed the LLM to add `101.6 / IN`. With requestIsMetric the correct mm script is accepted.
  const mmCode = [
    "import cadquery as cq",
    "length = 101.6", "width = 23.88", "height = 22.4",
    "result = cq.Workplane('XY').box(length, width, height)",
    "from cadquery import exporters", "import os",
    "exporters.export(result, os.environ.get('OUTPUT_STEP', 'out.step'))",
  ].join("\n");
  assert.equal(codeInvalidReason(mmCode, { requestIsMetric: true }), null, "correct mm script accepted for a metric request");
  assert.match(codeInvalidReason(mmCode, { requestIsMetric: false }), /no inch->mm conversion/, "inch request still needs the conversion");
});
test("codeInvalidReason: a DIMENSION divided by IN/25.4 is REJECTED (the 25.4x-undersize bug the sweep caught)", () => {
  const buggy = [
    "import cadquery as cq", "IN = 25.4",
    "length_mm = 101.6 / IN", // <-- the exact observed bug -> 4.0mm part
    "result = cq.Workplane('XY').box(length_mm, 10, 10)",
    "from cadquery import exporters", "exporters.export(result, 'out.step')",
  ].join("\n");
  assert.match(codeInvalidReason(buggy, { requestIsMetric: true }), /divided by IN\/25\.4 -- 25\.4x-undersize/);
  // a legitimate divide (radius = diameter/2) is NOT a units bug -> not rejected on that ground
  assert.equal(codeInvalidReason(GOOD_CODE.replace("hole_d / 2", "hole_d / 2.0")), null);
});
test("codeInvalidReason: a METRIC dim MULTIPLIED by IN is rejected (25.4x-OVERSIZE inverse bug); inch *IN is fine", () => {
  const oversize = [
    "import cadquery as cq", "IN = 25.4",
    "length = 14.5 * IN", // <-- mm value scaled by IN -> 368mm (the sweep saw 321.82 for a 12.67mm part)
    "result = cq.Workplane('XY').box(length, 10, 10)",
    "from cadquery import exporters", "exporters.export(result, 'out.step')",
  ].join("\n");
  assert.match(codeInvalidReason(oversize, { requestIsMetric: true }), /multiplied by IN -- 25\.4x-oversize/);
  // the SAME `* IN` is CORRECT for an INCH request (2.0 inch -> 50.8mm) -> not rejected
  assert.equal(codeInvalidReason(GOOD_CODE, { requestIsMetric: false }), null, "inch request: side = 1.0 * IN is correct");
});
test("requestIsMetric: purely-mm/cm requests true; any inch or mixed -> false (mm only when unambiguous)", () => {
  assert.equal(requestIsMetric("a 101.6 mm by 23.88 mm by 22.4 mm rectangular plate"), true);
  assert.equal(requestIsMetric("a 30cm bar"), true);
  assert.equal(requestIsMetric("a 1.0 inch cube"), false);
  assert.equal(requestIsMetric("a 50mm plate with a 0.25 inch hole"), false, "mixed -> not purely metric (keep inch conversion valid)");
  assert.equal(requestIsMetric("a featureless blob"), false);
});

test("offlineSelfCheck: no-parseable-dims request -> {accurate:null}; valid request + empty STEP -> not accurate", async () => {
  const fs = await import("node:fs");
  assert.equal(offlineSelfCheck("a typical die plate", "anything").accurate, null, "dimensionless request -> no verdict, never a false pass");
  assert.match(offlineSelfCheck("make a thing", "").reason, /no parseable dimensions/);
  // a valid request graded against an EMPTY STEP (no part dims) -> the features are all missing -> not accurate
  const empty = offlineSelfCheck("a 50mm by 30mm by 20mm rectangular plate with a 10mm diameter hole", "");
  assert.equal(empty.accurate, false, "an empty part fails the self-check (never fabricates a pass)");
  // real staged cube STEP (if present) -> accurate; skip-loud if the corpus artifact is absent
  const cubeStep = "state/shared/cad-text-gen/a-1-0-inch-cube-1782445953393/model.step";
  if (fs.existsSync(cubeStep)) {
    const v = offlineSelfCheck("a 1.0 inch cube", fs.readFileSync(cubeStep, "utf8"));
    assert.equal(v.accurate, true, "1in cube STEP matches the deciphered 1in-cube print");
    assert.equal(v.bboxReliable, true);
  } else { process.stderr.write("  (cube STEP corpus artifact absent -> live-data leg skipped)\n"); }
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

// U-CAD-TEXT-TRIBAL-INJECT: the text->CAD prompt carries the CAD-draw tribal corpus
// (the same delta tips the cad_learning_* recommendations inject) so local-LLM
// generations are tribal-aware, not just doctrine-aware.

test("buildPrompt: tribalTips rendered as a SHOP TRIBAL KNOWLEDGE section; absent when empty", () => {
  const tips = ["always convert inch to mm with IN = 25.4", "topology before tolerance"];
  const p = buildPrompt("a 1 inch pin", [], null, tips);
  assert.match(p, /SHOP TRIBAL KNOWLEDGE/);
  assert.match(p, /- always convert inch to mm with IN = 25\.4/);
  assert.match(p, /- topology before tolerance/);
  // tips precede the REQUEST line (context-before-ask)
  assert.ok(p.indexOf("SHOP TRIBAL KNOWLEDGE") < p.indexOf("REQUEST:"));
  // empty / default -> no section (backward compatible with 3-arg callers)
  assert.ok(!/SHOP TRIBAL KNOWLEDGE/.test(buildPrompt("x")));
  assert.ok(!/SHOP TRIBAL KNOWLEDGE/.test(buildPrompt("x", [], null, [])));
});

test("buildPrompt: tribalTips filters non-string/blank entries and caps at 5", () => {
  const tips = ["valid one", "", "   ", null, 42, "valid two", "t3", "t4", "t5", "t6 dropped"];
  const p = buildPrompt("x", [], null, tips);
  assert.match(p, /- valid one/);
  assert.match(p, /- valid two/);
  assert.ok(!/- t6 dropped/.test(p), "capped at 5 valid tips");
  assert.ok(!/-\s*$/m.test(p.replace(/REQUEST.*/s, "")), "no empty bullet from blank/null entries");
});

test("loadTribalTips: ranks the corpus via the injected engine and returns tip strings (no disk)", async () => {
  const fakeImport = async (url) => {
    if (url.includes("CADTribalDrawInjectionEngine")) {
      return {
        cadTribalDrawInjectionEngine: {
          recommend: (ctx, corpus) => {
            // assert the loader passes a real DrawContext + the corpus through
            assert.equal(ctx.operation, "generate");
            assert.ok(typeof ctx.query === "string" && ctx.query.includes("pin"));
            // corpus = the 2 injected base tips + any cad-knowledge-synth.jsonl entries merged from disk
            // (U-DELTA-CAD-KNOWLEDGE-SYNTH). Assert the base tips flow through; the synth count is data-dependent.
            assert.ok(Array.isArray(corpus) && corpus.length >= 2 && corpus.some((c) => c.id === "a") && corpus.some((c) => c.id === "b"));
            return { applied: [
              { id: "delta-tribal-004", tip: "topology before tolerance", relevanceScore: 0.9 },
              { id: "delta-tribal-001", tip: "inch units IN = 25.4", relevanceScore: 0.6 },
            ] };
          },
        },
      };
    }
    if (url.includes("cadDrawTribalTips")) return { CAD_DRAW_TRIBAL_TIPS: [{ id: "a" }, { id: "b" }] };
    throw new Error(`unexpected import ${url}`);
  };
  const tips = await loadTribalTips("a 2 inch alignment pin", fakeImport);
  assert.deepEqual(tips, ["topology before tolerance", "inch units IN = 25.4"]);
});

test("loadTribalTips: fail-soft -- import throw, missing engine, or non-array corpus all yield []", async () => {
  assert.deepEqual(await loadTribalTips("x", async () => { throw new Error("no dist"); }), []);
  // engine present but no recommend()
  const noRecommend = async (url) =>
    url.includes("CADTribalDrawInjectionEngine") ? { cadTribalDrawInjectionEngine: {} } : { CAD_DRAW_TRIBAL_TIPS: [] };
  assert.deepEqual(await loadTribalTips("x", noRecommend), []);
  // non-array corpus
  const badCorpus = async (url) =>
    url.includes("CADTribalDrawInjectionEngine")
      ? { cadTribalDrawInjectionEngine: { recommend: () => ({ applied: [] }) } }
      : { CAD_DRAW_TRIBAL_TIPS: "not-an-array" };
  assert.deepEqual(await loadTribalTips("x", badCorpus), []);
});

// U-CAD-TEXT-LEARN-LOOP: each generation outcome feeds the CAD learning ledger
// (closing the predictions->outcomes loop the cad_learning_* recommendations read).

test("classifyGenerationOutcome: pass/fail/error mapped; env-gap yields NO signal (never a false failure)", () => {
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0 } }), { status: "pass" });
  assert.equal(classifyGenerationOutcome({ status: { executed: true, analysisExit: 1 } }).status, "fail");
  assert.equal(classifyGenerationOutcome({ invalidReason: "no STEP export present" }).status, "error");
  // cadquery-not-installed is an ENV gap, not a generation failure: no signal, ledger never polluted.
  assert.equal(classifyGenerationOutcome({ status: { executed: false, evaluated: false, reason: "not installed" } }), null);
  // executed:false WITHOUT evaluated:false is a real run failure (script threw / produced no STEP).
  assert.equal(classifyGenerationOutcome({ status: { executed: false, reason: "python exit 1" } }).status, "fail");
  assert.equal(classifyGenerationOutcome({}), null);
});

test("classifyGenerationOutcome: KERNEL accuracy overrides the structural pass (U-DELTA-CADGEN-KERNEL-LEARN)", () => {
  // executes + analyzes fine BUT wrong size -> FAIL (the real signal the structural check misses)
  const wrong = classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, kernelAccuracy: { accurate: false, maxRelErr: 0.5, kernelDims: [100, 60, 40], requestedDims: [50, 30, 20] } } });
  assert.equal(wrong.status, "fail");
  assert.match(wrong.reason, /kernel dims off 50\.0%/);
  // executes + dimensionally accurate -> pass
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, kernelAccuracy: { accurate: true, maxRelErr: 0 } } }), { status: "pass" });
  // kernel verdict skipped (Fusion down / no explicit dims) -> falls back to the structural pass (no false fail)
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, kernelAccuracy: { accurate: null, reason: "fusion down" } } }), { status: "pass" });
  // absent kernelAccuracy -> unchanged behavior (backward compat)
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0 } }), { status: "pass" });
});

test("classifyGenerationOutcome: offline SELF-CHECK fails a reliable-prismatic part; curved/advisory NOT failed (U-DELTA-CADGEN-SELFCHECK-LEARN)", () => {
  // no kernel verdict (Fusion-free) + a RELIABLE-bbox prismatic part graded inaccurate -> FAIL (learnable defect)
  const bad = classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, selfCheck: { accurate: false, bboxReliable: true, bboxAdvisory: false, missingCount: 1, extraCount: 0, dimAccuracy: 1 } } });
  assert.equal(bad.status, "fail");
  assert.match(bad.reason, /self-check off: 1 missing/);
  // a CURVED part (bboxReliable=false) is NOT failed -- the offline check is unreliable there
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, selfCheck: { accurate: false, bboxReliable: false, bboxAdvisory: true, missingCount: 0, extraCount: 6 } } }), { status: "pass" });
  // an accurate self-check -> pass
  assert.deepEqual(classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, selfCheck: { accurate: true, bboxReliable: true } } }), { status: "pass" });
  // the AUTHORITATIVE kernel verdict still wins over the self-check when both present
  const k = classifyGenerationOutcome({ status: { executed: true, analysisExit: 0, kernelAccuracy: { accurate: false, maxRelErr: 0.5, kernelDims: [1], requestedDims: [2] }, selfCheck: { accurate: true, bboxReliable: true } } });
  assert.match(k.reason, /kernel dims off/);
});

test("buildGenerationOutcomeRecord: maps to a RegenerationOutcome; reasoning vs coder model named; error truncated", () => {
  const rec = buildGenerationOutcomeRecord("a 2 inch punch", "qwen2.5-coder:32b", { status: "pass" });
  assert.equal(rec.testId, "cadtext-a-2-inch-punch");
  assert.equal(rec.originalPath, "text://a-2-inch-punch");
  assert.equal(rec.status, "pass");
  assert.equal(rec.generator, "cadquery-text");
  assert.ok(!("error" in rec), "no error field on a pass");
  const r2 = buildGenerationOutcomeRecord("x", "deepseek-r1:32b", { status: "error", reason: "z".repeat(500) });
  assert.equal(r2.generator, "cadquery-reasoning");
  assert.equal(r2.error.length, 300);
});

test("ingestGenerationOutcome: null signal skips the engine; real signal ingests the record; import error swallowed (fail-soft)", async () => {
  // null classification (env gap) must NOT even attempt the engine import.
  assert.deepEqual(
    await ingestGenerationOutcome("x", "m", null, () => { throw new Error("should not import"); }),
    { ingested: false, reason: "no-signal" },
  );
  // a real signal ingests the built record into the injected fake engine (no disk I/O).
  let captured = null;
  const fakeMod = { cadTrialErrorLearningEngine: { ingest: (o) => { captured = o; } } };
  const res = await ingestGenerationOutcome("a punch", "qwen2.5-coder:32b", { status: "fail", reason: "bad step" }, async () => fakeMod);
  assert.equal(res.ingested, true);
  assert.equal(captured.status, "fail");
  assert.equal(captured.testId, "cadtext-a-punch");
  assert.equal(captured.error, "bad step");
  // an import/ingest failure is swallowed -- the generation path never breaks.
  const onThrow = await ingestGenerationOutcome("y", "m", { status: "pass" }, async () => { throw new Error("no dist"); });
  assert.equal(onThrow.ingested, false);
  assert.match(onThrow.reason, /ingest-failed/);
});

// U-CAD-TEXT-LEARN-PROMPT: the REVERSE arrow -- learned failure modes from the cad-failure
// ledger steer the next generation (closes generate -> outcome -> ledger -> LEARN -> next gen).

test("buildPrompt: learnedRisk rendered as a LEARNED FAILURE MODES section; absent when empty (backward compatible with <=4-arg callers)", () => {
  const learned = ["emit a single manifold solid (topology_mismatch is the #1 historical failure)", "avoid feature_count drift"];
  const p = buildPrompt("a 1 inch pin", [], null, [], learned);
  assert.match(p, /LEARNED FAILURE MODES/);
  assert.match(p, /- emit a single manifold solid/);
  assert.match(p, /- avoid feature_count drift/);
  // learned section precedes the REQUEST line (context-before-ask)
  assert.ok(p.indexOf("LEARNED FAILURE MODES") < p.indexOf("REQUEST:"));
  // <=4-arg callers (no learnedRisk) + empty array -> no section (backward compatible)
  assert.ok(!/LEARNED FAILURE MODES/.test(buildPrompt("x", [], null, ["a tip"])));
  assert.ok(!/LEARNED FAILURE MODES/.test(buildPrompt("x", [], null, [], [])));
});

test("buildPrompt: learnedRisk filters non-string/blank and caps at 5; tribal + learned coexist", () => {
  const learned = ["L1", "", "   ", null, 7, "L2", "L3", "L4", "L5", "L6 dropped"];
  const p = buildPrompt("x", [], null, ["a real tip"], learned);
  assert.match(p, /SHOP TRIBAL KNOWLEDGE/); // both sections present, independently
  assert.match(p, /LEARNED FAILURE MODES/);
  assert.match(p, /- L1/);
  assert.match(p, /- L5/);
  assert.ok(!/- L6 dropped/.test(p), "capped at 5 learned items");
  // ordering: tribal precedes learned, both precede the request (context-before-ask)
  assert.ok(p.indexOf("SHOP TRIBAL KNOWLEDGE") < p.indexOf("LEARNED FAILURE MODES"));
  assert.ok(p.indexOf("LEARNED FAILURE MODES") < p.indexOf("REQUEST:"));
});

test("loadLearnedRisk: reads the CALIBRATED recommendation; suggestions preferred, topRiskCategories fallback; partType from slug", async () => {
  // suggestions present -> guidance = "action (rationale)"; asserts calibrate:true + slug-derived partType.
  const withSuggestions = async (url) => {
    if (!url.includes("CADTrialErrorLearningEngine")) throw new Error(`unexpected import ${url}`);
    return {
      cadTrialErrorLearningEngine: {
        recommendAdjustments: (candidate, opts) => {
          assert.equal(opts.calibrate, true, "must request the calibrated risk (U-CAD-LEARN-CALIBRATE)");
          assert.equal(candidate.partType, "a-2-inch-alignment-pin", "partType derived from the request slug");
          return {
            riskScore: 0.6,
            topRiskCategories: [{ category: "topology_mismatch", rate: 0.62 }],
            suggestions: [{ category: "topology_mismatch", action: "emit a single manifold solid", rationale: "62% historical fail" }],
          };
        },
      },
    };
  };
  assert.deepEqual(await loadLearnedRisk("a 2 inch alignment pin", withSuggestions), ["emit a single manifold solid (62% historical fail)"]);

  // no suggestions -> fall back to topRiskCategories with rounded historical rate
  const fallback = async () => ({
    cadTrialErrorLearningEngine: {
      recommendAdjustments: () => ({ riskScore: 0.5, topRiskCategories: [{ category: "code_error", rate: 0.41 }], suggestions: [] }),
    },
  });
  assert.deepEqual(await loadLearnedRisk("x", fallback), ["avoid code_error -- historical fail rate 41%"]);

  // truncation bound: a >24-char request yields a 24-char partType key, aligned with the
  // ingest record's slug.slice(0,24) so the learned read-key matches the ingested write-key.
  let capturedPartType = null;
  const longReq = "a very long descriptive alignment part name well past twenty four chars";
  await loadLearnedRisk(longReq, async () => ({
    cadTrialErrorLearningEngine: {
      recommendAdjustments: (c) => { capturedPartType = c.partType; return { suggestions: [], topRiskCategories: [] }; },
    },
  }));
  assert.equal(capturedPartType.length, 24);
  assert.equal(capturedPartType, slugify(longReq).slice(0, 24));
});

test("loadLearnedRisk: fail-soft -- import throw, missing method, or non-object result all yield []", async () => {
  assert.deepEqual(await loadLearnedRisk("x", async () => { throw new Error("no dist"); }), []);
  assert.deepEqual(await loadLearnedRisk("x", async () => ({ cadTrialErrorLearningEngine: {} })), []);
  assert.deepEqual(await loadLearnedRisk("x", async () => ({ cadTrialErrorLearningEngine: { recommendAdjustments: () => null } })), []);
});

// --- U-DELTA-CADGEN-RECIPE-INJECT: archetype build-recipe injection -------------------------------
// A controlled recipe doc mirroring ARCHETYPE-RECIPES.json shape (op + platform-specific fn). The fn
// names here are the ADVERSARIAL probe: loadArchetypeRecipe must emit ONLY op verbs, never these fns.
const FAKE_RECIPES = JSON.stringify({
  recipes: {
    "flat-plate": {
      fusion360: [
        { op: "sketch.create-plane", platform: "fusion360", fn: "constructionPlanes.add", args: [] },
        { op: "sketch.rect-2pt", platform: "fusion360", fn: "addTwoPointRectangle", args: [] },
        { op: "op.extrude", platform: "fusion360", fn: "extrudeFeatures.addSimple", args: [] },
        { op: "op.extrude", platform: "fusion360", fn: "extrudeFeatures.addSimple", args: [] }, // duplicate op
      ],
      openscad: [
        { op: "sketch.rect-2pt", platform: "openscad", fn: "square", args: [] },
        { op: "op.extrude", platform: "openscad", fn: "linear_extrude", args: [] },
      ],
    },
    unknown: { fusion360: [] },
  },
});

test("classifyRequestArchetype: keyword -> archetype, specific-first priority, default unknown", () => {
  assert.equal(classifyRequestArchetype("a flat steel plate"), "flat-plate");
  assert.equal(classifyRequestArchetype("a stepped shaft"), "shaft");
  assert.equal(classifyRequestArchetype("a hollow casing"), "shell");
  assert.equal(classifyRequestArchetype("a revolved ring spacer"), "revolve");
  assert.equal(classifyRequestArchetype("a 1 inch cube"), "extrude");
  assert.equal(classifyRequestArchetype("a counterbore pocket"), "pocket");
  assert.equal(classifyRequestArchetype("a lofted transition duct"), "loft-sweep");
  assert.equal(classifyRequestArchetype("a turbine blisk"), "complex-organic");
  assert.equal(classifyRequestArchetype("a tapped M6x1.0 bolt-hole boss"), "threaded");
  assert.equal(classifyRequestArchetype("an assembly of two mating components"), "assembly");
  // specific wins over general: a threaded plate is threaded, not flat-plate (threaded is earlier)
  assert.equal(classifyRequestArchetype("a threaded plate"), "threaded");
  // no archetype keyword -> unknown
  assert.equal(classifyRequestArchetype("a nondescript widget"), "unknown");
  assert.equal(classifyRequestArchetype(""), "unknown");
});

test("loadArchetypeRecipe: emits the op-SEQUENCE only (dedup, order-preserving) -- NEVER platform fn names", () => {
  const r = loadArchetypeRecipe("a flat plate", { readFileImpl: () => FAKE_RECIPES });
  assert.deepEqual(r, ["flat-plate part -- build order: sketch.create-plane -> sketch.rect-2pt -> op.extrude"]);
  // the whole design rationale: the build123d/cadquery target must NOT see Fusion API calls
  assert.ok(!r[0].includes("addSimple"), "must not leak the platform fn name");
  assert.ok(!r[0].includes("extrudeFeatures"), "must not leak the platform fn name");
  assert.ok(!r[0].includes("addTwoPointRectangle"), "must not leak the platform fn name");
});

test("loadArchetypeRecipe: platform param routes; absent platform falls back to fusion360", () => {
  // requested openscad -> that platform's (shorter) op list
  assert.deepEqual(
    loadArchetypeRecipe("a flat plate", { readFileImpl: () => FAKE_RECIPES, platform: "openscad" }),
    ["flat-plate part -- build order: sketch.rect-2pt -> op.extrude"],
  );
  // a platform absent for this archetype -> fusion360 fallback (op verbs are platform-invariant anyway)
  assert.deepEqual(
    loadArchetypeRecipe("a flat plate", { readFileImpl: () => FAKE_RECIPES, platform: "no-such-platform" }),
    ["flat-plate part -- build order: sketch.create-plane -> sketch.rect-2pt -> op.extrude"],
  );
});

test("loadArchetypeRecipe: unknown archetype + failure modes all yield [] (advisory, never blocks)", () => {
  // 'unknown' short-circuits BEFORE any read (its op-sequence is empty by design)
  assert.deepEqual(loadArchetypeRecipe("a nondescript widget", { readFileImpl: () => FAKE_RECIPES }), []);
  // a recognised archetype whose recipe is missing/empty/malformed
  assert.deepEqual(loadArchetypeRecipe("a flat plate", { readFileImpl: () => { throw new Error("no file"); } }), []);
  assert.deepEqual(loadArchetypeRecipe("a flat plate", { readFileImpl: () => "not json" }), []);
  assert.deepEqual(loadArchetypeRecipe("a flat plate", { readFileImpl: () => JSON.stringify({ recipes: { "flat-plate": { fusion360: [] } } }) }), []);
  assert.deepEqual(loadArchetypeRecipe("a flat plate", { readFileImpl: () => JSON.stringify({ recipes: {} }) }), []);
});

test("loadArchetypeRecipe: LIVE -- loads the REAL ARCHETYPE-RECIPES.json (op-only, no fn leak)", () => {
  // default path (cwd-independent, anchored to REPO_ROOT) -> the real shipped recipe corpus
  const r = loadArchetypeRecipe("a flat steel plate");
  assert.equal(r.length, 1);
  assert.ok(r[0].startsWith("flat-plate part -- build order:"), `unexpected: ${r[0]}`);
  assert.ok(r[0].includes("op.extrude"), "live recipe must carry the extrude op");
  assert.ok(!/features\.|addSimple|addTwoPointRectangle/.test(r[0]), "live recipe must not leak Fusion fn names");
});

test("buildPrompt: injects the REFERENCE BUILD RECIPE section when a recipe is present; omits it otherwise (back-compat)", () => {
  const withRec = buildPrompt("a plate", [], null, [], [], [], ["flat-plate part -- build order: sketch.rect-2pt -> op.extrude"]);
  assert.ok(withRec.includes("REFERENCE BUILD RECIPE"), "recipe section must appear");
  assert.ok(withRec.includes("build order: sketch.rect-2pt -> op.extrude"), "recipe line must appear");
  // existing 6-arg (and fewer) callers are unaffected -- no recipe -> no section
  assert.ok(!buildPrompt("a plate").includes("REFERENCE BUILD RECIPE"), "absent recipe must not inject the section");
  assert.ok(!buildPrompt("a plate", [], null, [], [], []).includes("REFERENCE BUILD RECIPE"), "explicit empty recipe must not inject");
});
