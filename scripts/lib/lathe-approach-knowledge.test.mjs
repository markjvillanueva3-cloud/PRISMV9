// scripts/lib/lathe-approach-knowledge.test.mjs
// Run: node scripts/lib/lathe-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  LATHE_OPERATIONS,
  KNOWN_OKUMA_OSP,
  _internals,
} from "./lathe-approach-knowledge.mjs";

const gotchaIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gotchas.map((g) => g.id) : [];
};

// ---- taxonomy + sourcing integrity ----

test("LATHE_OPERATIONS is a non-empty frozen list of distinct ops", () => {
  assert.ok(Array.isArray(LATHE_OPERATIONS) && LATHE_OPERATIONS.length >= 12);
  assert.equal(LATHE_OPERATIONS.length, new Set(LATHE_OPERATIONS).size);
  assert.ok(Object.isFrozen(LATHE_OPERATIONS));
});

test("every gotcha cites a source + names an enforcing engine (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GOTCHAS)) {
    assert.ok(g.cite && g.cite.length > 0, `gotcha ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gotcha ${id} missing enforcedBy`);
    assert.ok(["verified", "unverified"].includes(g.confidence), `gotcha ${id} bad confidence`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0, `gotcha ${id} fires for no ops`);
    // every op a gotcha references must be in the canonical taxonomy
    for (const op of g.ops) assert.ok(LATHE_OPERATIONS.includes(op), `gotcha ${id} references unknown op ${op}`);
  }
});

test("no inlined cutting constant leaks beyond the canonical-source pointer", () => {
  // The kienzle/taylor gotcha names the canonical kc1.1 set as a POINTER to constants.ts;
  // no OTHER gotcha rule should restate a numeric kc/Taylor value (would be an inline copy).
  for (const [id, g] of Object.entries(_internals.GOTCHAS)) {
    if (id === "kienzle_taylor_canonical") continue;
    assert.ok(!/kc1\.1|taylor\s*c\b/i.test(g.rule), `gotcha ${id} restates a cutting constant`);
  }
});

// ---- safety-intent firing (R9: the test fails if the wrong knowledge fires) ----

test("OD threading fires position-lock + infeed-angle (the thread safety rails)", () => {
  const r = fireForApproach({ operations: ["od_thread"] });
  const ids = gotchaIds(r, "od_thread");
  assert.ok(ids.includes("thread_position_lock"), "missing thread_position_lock");
  assert.ok(ids.includes("thread_infeed_angle"), "missing thread_infeed_angle");
  // and the universal workholding + unit rails
  assert.ok(ids.includes("chuck_centrifugal_grip"));
  assert.ok(ids.includes("feed_ipr_not_ipm"));
});

test("boring fires boring-bar deflection; part_off fires chip-clearance + bar remnant", () => {
  const r = fireForApproach({ operations: ["bore", "part_off"] });
  assert.ok(gotchaIds(r, "bore").includes("boring_bar_deflection"));
  const po = gotchaIds(r, "part_off");
  assert.ok(po.includes("parting_chip_clearance"));
  assert.ok(po.includes("bar_remnant_min"));
});

test("CSS-cap fires for turning ops but NOT for sub_spindle_transfer", () => {
  const r = fireForApproach({ operations: ["od_turn", "sub_spindle_transfer"] });
  assert.ok(gotchaIds(r, "od_turn").includes("css_g50_cap"));
  assert.ok(!gotchaIds(r, "sub_spindle_transfer").includes("css_g50_cap"));
  // sub-spindle fires its phase-alignment rail instead
  assert.ok(gotchaIds(r, "sub_spindle_transfer").includes("sub_spindle_phase"));
});

// ---- machine-availability conditioning ----

test("Okuma in fleet fires OSP dialect (G78/G176 not G76 for threads)", () => {
  const r = fireForApproach({ operations: ["od_thread"], machines: ["LTH-03"] });
  assert.equal(r.fleetHasOkuma, true);
  const o = r.operations.find((x) => x.operation === "od_thread");
  assert.ok(o.okumaDialect.length > 0, "no okuma dialect fired");
  assert.ok(o.okumaDialect.some((d) => /G78|G176/.test(d.rule)), "missing OSP threading dialect");
});

test("non-Okuma fleet fires NO OSP dialect", () => {
  const r = fireForApproach({ operations: ["od_thread"], machines: ["Haas ST-30"] });
  assert.equal(r.fleetHasOkuma, false);
  const o = r.operations.find((x) => x.operation === "od_thread");
  assert.equal(o.okumaDialect.length, 0);
});

test("fleetHasOkuma matches LTH- ids, 'okuma', 'multus', 'osp'; rejects others", () => {
  assert.equal(fireForApproach({ operations: ["face"], machines: ["LTH-07"] }).fleetHasOkuma, true);
  assert.equal(fireForApproach({ operations: ["face"], machines: ["MULTUS-B250"] }).fleetHasOkuma, true);
  assert.equal(fireForApproach({ operations: ["face"], machines: ["an okuma genos"] }).fleetHasOkuma, true);
  assert.equal(fireForApproach({ operations: ["face"], machines: ["Mazak QTN"] }).fleetHasOkuma, false);
  assert.equal(fireForApproach({ operations: ["face"], machines: [] }).fleetHasOkuma, false);
});

// ---- tooling-availability conditioning ----

test("tooling absent from the available set -> blocker on that op", () => {
  const r = fireForApproach({ operations: ["bore"], tooling: ["parting", "od_turn"] });
  const o = r.operations.find((x) => x.operation === "bore");
  assert.equal(o.tooling.needs, "boring_bar");
  assert.equal(o.tooling.available, false);
  assert.ok(o.tooling.blocker && /boring_bar/.test(o.tooling.blocker));
  assert.ok(r.summary.includes("BLOCKERS"));
});

test("tooling present -> available true, no blocker", () => {
  const r = fireForApproach({ operations: ["bore"], tooling: ["boring_bar"] });
  const o = r.operations.find((x) => x.operation === "bore");
  assert.equal(o.tooling.available, true);
  assert.ok(!o.tooling.blocker);
});

test("no tooling list supplied -> available is null (unknown, not a blocker)", () => {
  const r = fireForApproach({ operations: ["part_off"] });
  const o = r.operations.find((x) => x.operation === "part_off");
  assert.equal(o.tooling.available, null);
  assert.ok(!r.summary.includes("BLOCKERS"));
});

test("sub_spindle_transfer requires a sub_spindle machine/tool", () => {
  const r = fireForApproach({ operations: ["sub_spindle_transfer"], tooling: ["od_turn"] });
  const o = r.operations.find((x) => x.operation === "sub_spindle_transfer");
  assert.equal(o.tooling.needs, "sub_spindle");
  assert.equal(o.tooling.available, false);
});

// ---- normalization + adversarial ----

test("unknown ops are dropped, dupes collapsed, case-insensitive", () => {
  const r = fireForApproach({ operations: ["OD_THREAD", "od_thread", "frobnicate", " bore "] });
  const got = r.operations.map((o) => o.operation).sort();
  assert.deepEqual(got, ["bore", "od_thread"]);
});

test("ADVERSARIAL: null/empty/non-array ctx never throws, returns empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: null }, { operations: "od_turn" }, { operations: [123, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations));
    assert.equal(r.operations.length, 0);
    assert.ok(typeof r.summary === "string");
  }
});

test("KNOWN_OKUMA_OSP lists the 7 JM lathes + the Multus", () => {
  assert.ok(KNOWN_OKUMA_OSP.length >= 8);
  assert.ok(KNOWN_OKUMA_OSP.includes("LTH-01") && KNOWN_OKUMA_OSP.includes("MULTUS-B250"));
});

// ---- detectOperations (the print-reading op parser the hook uses) ----

test("detectOperations parses ops from print-reading text", () => {
  assert.deepEqual(detectOperations("OD threading on the part"), ["od_thread"]);
  assert.deepEqual(detectOperations("internal thread then bore the ID").sort(), ["bore", "id_thread"].sort());
  assert.deepEqual(detectOperations("part off the bar"), ["part_off"]);
  assert.deepEqual(detectOperations("facing and OD turning").sort(), ["face", "od_turn"].sort());
  assert.deepEqual(detectOperations("sub-spindle pickoff for back-work"), ["sub_spindle_transfer"]);
});

test("detectOperations: internal thread -> id_thread (not od_thread); plain thread -> od_thread", () => {
  assert.ok(detectOperations("internal threading").includes("id_thread"));
  assert.ok(!detectOperations("internal threading").includes("od_thread"));
  assert.ok(detectOperations("single point threading").includes("od_thread"));
});

test("detectOperations: returns taxonomy-ordered, deduped; empty/non-string -> []", () => {
  const r = detectOperations("thread, thread, bore, bore");
  assert.equal(r.length, new Set(r).size);
  assert.deepEqual(detectOperations(""), []);
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(42), []);
  // a non-lathe prompt yields nothing
  assert.deepEqual(detectOperations("write me a quoting frontend in react"), []);
});

test("detectOperations output feeds fireForApproach end-to-end", () => {
  const ops = detectOperations("bore the ID and part off, on an Okuma");
  const r = fireForApproach({ operations: ops, machines: ["LTH-02"] });
  assert.ok(r.operations.some((o) => o.operation === "bore"));
  assert.ok(r.operations.some((o) => o.operation === "part_off"));
  assert.equal(r.fleetHasOkuma, true);
});
