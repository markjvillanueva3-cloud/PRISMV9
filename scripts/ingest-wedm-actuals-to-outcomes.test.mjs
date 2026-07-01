// Tests for scripts/ingest-wedm-actuals-to-outcomes.mjs (FLEET-CLOSEDLOOP-MS0/U-CL-WEDM).
// Run: node --test scripts/ingest-wedm-actuals-to-outcomes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { wedmEntryToEmitOpts, contentKey } from "./ingest-wedm-actuals-to-outcomes.mjs";
import { buildOutcomeEvent } from "./lib/outcome-actual-emit.mjs";
import { outcomeToAlpaca } from "./lib/outcome-to-alpaca-converter.mjs";

const realEntry = () => ({
  type: "entry",
  jobId: "job-001",
  finishedAt: "2026-04-20T12:00:00.000Z",
  material: "D2",
  thicknessMm: 20,
  wireDiameterMm: 0.25,
  wireMaterial: "brass",
  controller: "mitsubishi",
  predicted: { raUm: 1.2, cycleTimeMin: 45, wireBreaks: 0.1 },
  actual: { raUm: 1.3, cycleTimeMin: 48, wireBreaks: 0 },
  recipe: { peakCurrentA: 8, pulseOnUs: 4, pulseOffUs: 24, wireTensionN: 12, skimPasses: 3 },
});

test("wedmEntryToEmitOpts: header / non-entry / missing material / empty recipe -> null", () => {
  assert.equal(wedmEntryToEmitOpts({ type: "header", description: "x" }), null);
  assert.equal(wedmEntryToEmitOpts(null), null);
  assert.equal(wedmEntryToEmitOpts({ type: "entry", recipe: { a: 1 } }), null); // no material
  assert.equal(wedmEntryToEmitOpts({ type: "entry", material: "D2", recipe: {} }), null); // empty recipe
  assert.equal(wedmEntryToEmitOpts({ type: "entry", material: "D2" }), null); // no recipe
});

test("wedmEntryToEmitOpts: real record -> correct emit opts (recommended=recipe, actual=measured)", () => {
  const o = wedmEntryToEmitOpts(realEntry());
  assert.equal(o.domain, "wedm");
  assert.equal(o.kind, "surface_finish_ra");
  assert.equal(o.source, "import");
  assert.equal(o.lineage_id, "job-001");
  assert.equal(o.timestamp, "2026-04-20T12:00:00.000Z");
  assert.equal(o.context.material, "D2");
  assert.equal(o.context.machine_id, "mitsubishi");
  assert.match(o.context.operation, /wire-edm t=20mm wire=0\.25mm brass/);
  // recommended = the recipe (training OUTPUT a wizard learns)
  assert.deepEqual(o.recommended, { peakCurrentA: 8, pulseOnUs: 4, pulseOffUs: 24, wireTensionN: 12, skimPasses: 3 });
  // actual = measured outcome with snake_case keys
  assert.deepEqual(o.actual, { ra_um: 1.3, cycle_time_min: 48, wire_breaks: 0 });
  assert.deepEqual(o.delta, { predicted: { raUm: 1.2, cycleTimeMin: 45, wireBreaks: 0.1 } });
  assert.equal(o.confidence, 0.9); // clean run (0 wire breaks)
});

test("wedmEntryToEmitOpts: a run with wire breaks gets lower confidence (outcome-quality weighting)", () => {
  const e = realEntry();
  e.actual.wireBreaks = 2;
  const o = wedmEntryToEmitOpts(e);
  assert.equal(o.confidence, 0.5);
  assert.equal(o.actual.wire_breaks, 2);
});

test("wedmEntryToEmitOpts: missing optional fields degrade gracefully (no thickness/controller/actual)", () => {
  const o = wedmEntryToEmitOpts({ type: "entry", jobId: "j2", material: "A2", recipe: { peakCurrentA: 6 } });
  assert.equal(o.context.operation, "wire-edm"); // no thickness/wire suffix
  assert.equal(o.context.machine_id, undefined);
  assert.equal(o.actual, undefined); // no measured block -> recommended-only is still valid
  assert.equal(o.confidence, undefined);
  assert.equal(o.delta, undefined);
});

test("contentKey: stable on content, blind to event_id, distinguishes distinct content under a reused jobId", () => {
  const a = wedmEntryToEmitOpts(realEntry());
  const a2 = wedmEntryToEmitOpts(realEntry());
  assert.equal(contentKey(a), contentKey(a2), "same content -> same key (re-run idempotent)");
  // SAME jobId, DIFFERENT recipe -> MUST be a different key (the jobId-only bug this fixes).
  const diff = realEntry();
  diff.recipe = { ...diff.recipe, peakCurrentA: 12 };
  assert.notEqual(contentKey(a), contentKey(wedmEntryToEmitOpts(diff)), "reused jobId + new recipe -> distinct key");
  // A parsed STORED event and the originating opts hash identically (cross-shape stability).
  const ev = buildOutcomeEvent({ ...a, event_id: "x", uuid: () => "y" });
  assert.equal(contentKey(ev), contentKey(a), "stored event and opts share the content key");
});

test("wedmEntryToEmitOpts: output builds a valid event AND converts to a real training pair", () => {
  const o = wedmEntryToEmitOpts(realEntry());
  const ev = buildOutcomeEvent({ ...o, uuid: () => "00000000-0000-0000-0000-000000000000" });
  assert.equal(ev.domain, "wedm");
  assert.equal(ev.lineage_id, "job-001");
  const pair = outcomeToAlpaca(ev);
  assert.ok(pair, "converter accepts the event");
  assert.match(pair.instruction, /material=D2/);
  assert.match(pair.instruction, /operation=wire-edm t=20mm wire=0\.25mm brass/);
  // recommended wins for output -> the recipe is the training target
  assert.match(pair.output, /peakCurrentA=8/);
  assert.match(pair.output, /skimPasses=3/);
});
