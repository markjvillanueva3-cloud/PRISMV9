// tsc-route-by-owner.test.mjs -- hermetic tests for the tsc owner-router (slot:papa 2026-06-18).
// Real reference-value asserts (R9): parsing, the load-bearing ORDERING traps, grouping,
// summary sort, markdown shape, and the injected-fetch Ollama classifier (happy + failure modes).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OWNERS, OWNER_RULES, parseTscErrors, ownerForFile, routeByOwner,
  summarize, renderMarkdown, classifyViaOllama, readEngineDocstring,
} from "./tsc-route-by-owner.mjs";

const SAMPLE_LOG = [
  "src/engines/WEDMSafetyEnvelopeEngine.ts(62,5): error TS2740: Type missing fields",
  "\x1b[96msrc/engines/SolidWorksCodeGeneratorEngine.ts\x1b[0m(223,7): \x1b[91merror TS2741\x1b[0m: cadSystem missing",
  "src/engines/SolidWorksCodeGeneratorEngine.ts(539,9): error TS2881: never nullish",
  "src/engines/ChatterStabilityLobeEngine.ts(341,11): error TS2351: not constructable",
  "src/engines/LatheMasterOrchestratorFacadeEngine.ts(477,3): error TS2554: arity",
  "src/engines/ReinforcementLearningCAMFeedbackEngine.ts(302,3): error TS2554: arity",
  "src/engines/MastercamCodeGeneratorEngine.ts(163,5): error TS2739: cadSystem missing",
  "src/hooks/index.ts(102,1): error TS2308: duplicate export",
  "some unrelated line with no error",
  "src/engines/WEDMSafetyEnvelopeEngine.ts(62,5): error TS2740: Type missing fields",
].join("\n");

test("parseTscErrors: extracts records, strips ANSI, dedups by location", () => {
  const errs = parseTscErrors(SAMPLE_LOG);
  assert.equal(errs.length, 8); // 9 error lines minus 1 exact dup
  const sw = errs.find((e) => e.file.includes("SolidWorks") && e.line === 223);
  assert.equal(sw.code, "TS2741");
  assert.equal(sw.col, 7);
  assert.equal(sw.file, "src/engines/SolidWorksCodeGeneratorEngine.ts"); // ANSI stripped
  assert.match(sw.msg, /cadSystem missing/);
});

test("parseTscErrors: empty / null -> []", () => {
  assert.deepEqual(parseTscErrors(""), []);
  assert.deepEqual(parseTscErrors(null), []);
  assert.deepEqual(parseTscErrors("no errors here"), []);
});

test("ownerForFile: ORDERING TRAPS are handled (the load-bearing invariants)", () => {
  // CAM before MILL: "hyperMILL" contains "MILL" but must route to kilo, not foxtrot.
  assert.equal(ownerForFile("hyperMILLPostEngine.ts").owner, "kilo");
  // RL before CAM: "ReinforcementLearningCAMFeedback" contains "CAM" but is india.
  assert.equal(ownerForFile("ReinforcementLearningCAMFeedbackEngine.ts").owner, "india");
  // WEDM before bare CAD/EDM.
  assert.equal(ownerForFile("WEDMSafetyEnvelopeEngine.ts").owner, "mike");
  // CAD generators -> delta; Mastercam=CAM beats CodeGenerator -> kilo.
  assert.equal(ownerForFile("SolidWorksCodeGeneratorEngine.ts").owner, "delta");
  assert.equal(ownerForFile("MastercamCodeGeneratorEngine.ts").owner, "kilo");
  // speed-feed / chatter physics -> oscar.
  assert.equal(ownerForFile("ChatterStabilityLobeEngine.ts").owner, "oscar");
  assert.equal(ownerForFile("GilbertEconomicSpeedEngine.ts").owner, "oscar");
  // lathe -> whiskey.
  assert.equal(ownerForFile("LatheMasterOrchestratorFacadeEngine.ts").owner, "whiskey");
  // build-infra -> papa.
  assert.equal(ownerForFile("hookDispatcher.ts").owner, "papa");
  assert.equal(ownerForFile("HookDAGValidatorEngine.ts").owner, "papa");
  // dir-fallback: basename "index.ts" matches no rule, but src/hooks/ -> papa.
  assert.equal(ownerForFile("src/hooks/index.ts").owner, "papa");
  assert.equal(ownerForFile("src/routes/python-api.ts").owner, "papa");
  // genuinely unmatched -> UNKNOWN.
  assert.equal(ownerForFile("QuantumFluxCapacitorEngine.ts").owner, "UNKNOWN");
});

test("routeByOwner + summarize: grouping, counts, files, UNKNOWN-last sort", () => {
  const routed = routeByOwner(parseTscErrors(SAMPLE_LOG));
  assert.equal(routed.delta.count, 2); // SolidWorks x2
  assert.equal(routed.delta.files.length, 1);
  assert.equal(routed.mike.count, 1);
  assert.equal(routed.kilo.count, 1); // Mastercam
  assert.equal(routed.india.count, 1); // RLCAMFeedback
  assert.equal(routed.papa.count, 1); // hooks/index
  const sum = summarize(routed);
  assert.equal(sum[0].count >= sum[sum.length - 1].count, true); // desc by count
  for (const s of sum) assert.ok(OWNERS.includes(s.owner) || s.owner === "UNKNOWN");
});

test("renderMarkdown: has summary table + per-owner sections + error lines (ASCII only)", () => {
  const routed = routeByOwner(parseTscErrors(SAMPLE_LOG));
  const md = renderMarkdown(routed, { total: 8 });
  assert.match(md, /# TSC Routing by Owner/);
  assert.match(md, /\| Owner \| Errors \| Files \|/);
  assert.match(md, /## delta \(2\)/);
  assert.match(md, /:223 TS2741/);
  assert.equal(/[^\x00-\x7f]/.test(md), false, "rendered markdown must be ASCII");
});

test("classifyViaOllama: injected fetch -> valid owner; bad/non-ok -> null (fail-soft)", async () => {
  const ok = (owner) => async () => ({ ok: true, json: async () => ({ response: owner + "\n" }) });
  assert.equal(await classifyViaOllama("FooEngine.ts", OWNERS, { fetchImpl: ok("mike") }), "mike");
  assert.equal(await classifyViaOllama("FooEngine.ts", OWNERS, { fetchImpl: ok("banana") }), null);
  assert.equal(await classifyViaOllama("FooEngine.ts", OWNERS, { fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal(await classifyViaOllama("FooEngine.ts", OWNERS, { fetchImpl: async () => { throw new Error("ECONNREFUSED"); } }), null);
  assert.equal(await classifyViaOllama("FooEngine.ts", OWNERS, { fetchImpl: null }), null);
});

test("classifyViaOllama: sends the filename + owner list in the prompt", async () => {
  let sentBody = null;
  const spy = async (_url, init) => { sentBody = JSON.parse(init.body); return { ok: true, json: async () => ({ response: "delta" }) }; };
  await classifyViaOllama("MysteryCadThing.ts", OWNERS, { fetchImpl: spy });
  assert.match(sentBody.prompt, /MysteryCadThing\.ts/);
  assert.match(sentBody.prompt, /delta/);
  assert.equal(sentBody.stream, false);
});

test("readEngineDocstring: injected reader returns capped header; miss/null -> empty", () => {
  const fake = "/**\n * FooEngine -- does foo for the bar domain\n */\nexport class FooEngine {}";
  const doc = readEngineDocstring("src/engines/FooEngine.ts", { readImpl: () => fake });
  assert.match(doc, /does foo for the bar domain/);
  assert.ok(doc.length <= 1200);
  assert.equal(readEngineDocstring("src/engines/Nope.ts", { readImpl: () => "" }), "");
  assert.equal(readEngineDocstring("x", { readImpl: null }), "");
});

test("classifyViaOllama: includes the docstring in the prompt when provided (stronger signal)", async () => {
  let body = null;
  const spy = async (_u, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ response: "kilo" }) }; };
  const out = await classifyViaOllama("ProcessIntelligenceRouterEngine.ts", OWNERS, {
    fetchImpl: spy,
    docstring: "top-level cross-process CAM router unifying the 4 bridges",
  });
  assert.equal(out, "kilo");
  assert.match(body.prompt, /cross-process CAM router/);
  assert.match(body.prompt, /header documentation/);
});

test("OWNER_RULES: every rule names a known owner; frozen", () => {
  for (const r of OWNER_RULES) assert.ok(OWNERS.includes(r.owner), `rule owner ${r.owner} is known`);
  assert.ok(Object.isFrozen(OWNER_RULES));
});
