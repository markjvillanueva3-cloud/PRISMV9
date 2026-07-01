// scripts/lib/ollama-verified-offload.test.mjs
// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the wrapper must (1) accept an
// Ollama result ONLY when the code verifier passes, (2) fall back to the trusted
// path on EVERY failure mode (run-throw, run-empty, verify-fail, verify-throw),
// (3) never swallow a real fallback error, (4) require a fallback (misuse guard).
// Real reference values (R9), no network -- run/verify/fallback are injected.
import { test } from "node:test";
import assert from "node:assert/strict";

import { verifiedOffload, enumMember, jsonShape, nonEmptyText } from "./ollama-verified-offload.mjs";

const FB = "FALLBACK_VALUE";
const fb = async () => FB;

// ---- verifiedOffload: the happy path ----
test("verified pass (verify true) -> uses the Ollama raw result, source ollama", async () => {
  const r = await verifiedOffload({ run: async () => "raw-out", verify: () => true, fallback: fb });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.equal(r.fellBack, false);
  assert.equal(r.value, "raw-out");
});

test("verify {ok,value} -> returns the validated/transformed value, not the raw", async () => {
  const r = await verifiedOffload({ run: async () => '{"n":5}', verify: () => ({ ok: true, value: { n: 5 } }), fallback: fb });
  assert.equal(r.source, "ollama");
  assert.deepEqual(r.value, { n: 5 });
});

// ---- every failure mode must fall back to the trusted path ----
test("verify FALSE -> falls back (the core safety property)", async () => {
  const r = await verifiedOffload({ run: async () => "garbage", verify: () => false, fallback: fb });
  assert.equal(r.source, "fallback");
  assert.equal(r.verified, false);
  assert.equal(r.fellBack, true);
  assert.equal(r.reason, "verify-failed");
  assert.equal(r.value, FB);
});

test("run THROWS -> falls back (ollama unreachable / error)", async () => {
  const r = await verifiedOffload({ run: async () => { throw new Error("ECONNREFUSED"); }, verify: () => true, fallback: fb });
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "run-threw");
  assert.equal(r.value, FB);
});

test("run returns EMPTY (null / '' / undefined) -> falls back", async () => {
  for (const empty of [null, undefined, ""]) {
    const r = await verifiedOffload({ run: async () => empty, verify: () => true, fallback: fb });
    assert.equal(r.source, "fallback", `empty=${JSON.stringify(empty)}`);
    assert.equal(r.reason, "run-empty");
  }
});

test("verify THROWS -> treated as a fail, falls back (never trust on verifier error)", async () => {
  const r = await verifiedOffload({ run: async () => "x", verify: () => { throw new Error("bad verifier"); }, fallback: fb });
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "verify-threw");
});

test("a FALSE result value (0 / false) still counts as non-empty and is verifiable", async () => {
  // run returning 0 must NOT be mistaken for empty (0 is a real value)
  const r = await verifiedOffload({ run: async () => 0, verify: (raw) => ({ ok: raw === 0, value: raw }), fallback: fb });
  assert.equal(r.source, "ollama");
  assert.equal(r.value, 0);
});

// ---- contract guards ----
test("a fallback that THROWS propagates (the trusted path failing is a real error, not swallowed)", async () => {
  await assert.rejects(
    () => verifiedOffload({ run: async () => "x", verify: () => false, fallback: async () => { throw new Error("real failure"); } }),
    /real failure/,
  );
});

test("missing fallback -> throws (no safe auto-offload without a trusted path)", async () => {
  await assert.rejects(() => verifiedOffload({ run: async () => "x", verify: () => true }), /fallback is REQUIRED/);
});

test("non-function run/verify -> throws (misuse guard)", async () => {
  await assert.rejects(() => verifiedOffload({ run: "nope", verify: () => true, fallback: fb }), /run must be a function/);
  await assert.rejects(() => verifiedOffload({ run: async () => "x", verify: null, fallback: fb }), /verify must be a function/);
});

test("onResult telemetry fires with the outcome (and a telemetry throw never breaks the offload)", async () => {
  const seen = [];
  const r = await verifiedOffload({ run: async () => "x", verify: () => true, fallback: fb, label: "lbl",
    onResult: (rec) => { seen.push(rec); throw new Error("telemetry boom"); } });
  assert.equal(r.value, "x"); // telemetry throw did NOT break it
  assert.equal(seen.length, 1);
  assert.equal(seen[0].label, "lbl");
  assert.equal(seen[0].source, "ollama");
});

// ---- the ready-made verifiers ----
test("enumMember: snaps a case/space near-match to the canonical member; rejects non-members", async () => {
  const v = enumMember(["prism_calc", "prism_cam", "prism_ai"]);
  assert.deepEqual(v("  PRISM_CAM "), { ok: true, value: "prism_cam" }); // canonical snap
  assert.equal(v("prism_nonsense"), false); // hallucinated value rejected -> would fall back
  assert.equal(v(null), false);
});

test("jsonShape: parses + predicate-validates, returns the parsed object; bad JSON -> false", async () => {
  const v = jsonShape((o) => Array.isArray(o.units) && o.units.length >= 1);
  assert.deepEqual(v('{"units":["U-A","U-B"]}'), { ok: true, value: { units: ["U-A", "U-B"] } });
  assert.equal(v("{not json"), false);
  assert.equal(v('{"units":[]}'), false); // predicate fails -> fall back
  assert.equal(v('{"x":1}'), false); // predicate throws on missing .units -> caught -> false
});

test("nonEmptyText: enforces a min length, trims; too-short -> false", async () => {
  const v = nonEmptyText(5);
  assert.deepEqual(v("  hello world  "), { ok: true, value: "hello world" });
  assert.equal(v("hi"), false);
  assert.equal(v(42), false); // non-string
});

test("end-to-end: enumMember verifier in verifiedOffload -- hallucinated unit falls back to the real picker", async () => {
  const realPick = async () => "U-REAL-FALLBACK";
  // ollama hallucinates a non-existent unit -> enumMember rejects -> fall back
  const r1 = await verifiedOffload({ run: async () => "U-HALLUCINATED", verify: enumMember(["U-A", "U-B"]), fallback: realPick });
  assert.equal(r1.value, "U-REAL-FALLBACK");
  assert.equal(r1.source, "fallback");
  // ollama picks a real one -> accepted
  const r2 = await verifiedOffload({ run: async () => "U-B", verify: enumMember(["U-A", "U-B"]), fallback: realPick });
  assert.equal(r2.value, "U-B");
  assert.equal(r2.source, "ollama");
});
