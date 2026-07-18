// Tests for dream-llm-annotate.mjs — the optional local-LLM rationale pass for
// the Hermes dream-cycle. Real assertions on name normalization, prompt content,
// reply cleaning (the vault-safety filter), top-N selection, and fail-open (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readableName,
  buildConnectionPrompt,
  cleanRationale,
  annotateConnections,
} from "./dream-llm-annotate.mjs";

const conn = (aName, bName, jaccard, shared = ["x", "y"]) => ({
  a: { name: aName, type: "reference" },
  b: { name: bName, type: "reference" },
  jaccard,
  shared,
});

// ── readableName ──────────────────────────────────────────────────────────
test("readableName: strips .md, type prefix, trailing date, de-kebabs", () => {
  assert.equal(readableName("reference_xray_ocr_gpu_concurrency_2026_05_31.md"), "xray ocr gpu concurrency");
  assert.equal(readableName("feedback_check_units_first.md"), "check units first");
  assert.equal(readableName("project_jm_die_languages.md"), "jm die languages");
});
test("readableName: empty / null → empty string (never throws)", () => {
  assert.equal(readableName(""), "");
  assert.equal(readableName(null), "");
  assert.equal(readableName(undefined), "");
});

// ── buildConnectionPrompt ──────────────────────────────────────────────────
test("buildConnectionPrompt: includes both readable names, shared concepts, NONE escape", () => {
  const p = buildConnectionPrompt(conn("reference_kienzle_force.md", "reference_mill_spindle_load.md", 0.4, ["force", "spindle"]));
  assert.ok(p.includes("kienzle force"), "note A readable name");
  assert.ok(p.includes("mill spindle load"), "note B readable name");
  assert.ok(p.includes("force, spindle"), "shared concepts listed");
  assert.ok(/reply exactly: NONE/.test(p), "NONE escape hatch present");
  assert.ok(/ONE concise sentence/.test(p), "one-sentence constraint");
});

// ── cleanRationale (the vault-safety filter) ───────────────────────────────
test("cleanRationale: keeps a normal one-liner", () => {
  assert.equal(cleanRationale("Both describe spindle-load limits under high feed."),
    "Both describe spindle-load limits under high feed.");
});
test("cleanRationale: NONE / empty / whitespace → dropped", () => {
  assert.equal(cleanRationale("NONE"), "");
  assert.equal(cleanRationale("none — unrelated"), "");
  assert.equal(cleanRationale(""), "");
  assert.equal(cleanRationale("   "), "");
  assert.equal(cleanRationale(null), "");
});
test("cleanRationale: first line only; wrapping quotes stripped", () => {
  assert.equal(cleanRationale('"They share a calibration step."\nExtra rambling line.'),
    "They share a calibration step.");
});
test("cleanRationale: over-long (rambled) reply dropped", () => {
  const long = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
  assert.equal(cleanRationale(long, 30), "");
  assert.equal(cleanRationale("five short words here ok", 30), "five short words here ok");
});

// ── annotateConnections ─────────────────────────────────────────────────────
test("annotateConnections: no callFn → connections returned unchanged (no rationale)", async () => {
  const cs = [conn("a.md", "b.md", 0.5)];
  const out = await annotateConnections(cs, {});
  assert.equal(out[0].rationale, undefined);
});

test("annotateConnections: annotates the top-N by Jaccard, leaves the rest bare", async () => {
  const c1 = conn("a.md", "b.md", 0.5);
  const c2 = conn("c.md", "d.md", 0.3);
  const c3 = conn("e.md", "f.md", 0.1);
  let calls = 0;
  const callFn = async () => { calls++; return "Shared calibration discipline."; };
  // pass in non-sorted order to prove it ranks by jaccard, not input order
  const out = await annotateConnections([c3, c1, c2], { callFn, topN: 2 });
  assert.equal(calls, 2, "only top-2 edges call the model");
  assert.equal(c1.rationale, "Shared calibration discipline.", "highest jaccard annotated");
  assert.equal(c2.rationale, "Shared calibration discipline.", "2nd-highest annotated");
  assert.equal(c3.rationale, undefined, "below top-N → bare");
  assert.equal(out.length, 3, "returns the full set");
});

test("annotateConnections: model 'NONE' → edge stays bare", async () => {
  const c1 = conn("a.md", "b.md", 0.5);
  await annotateConnections([c1], { callFn: async () => "NONE", topN: 5 });
  assert.equal(c1.rationale, undefined);
});

test("annotateConnections: fail-open — a throwing callFn leaves edges bare, never throws", async () => {
  const c1 = conn("a.md", "b.md", 0.5);
  const out = await annotateConnections([c1], { callFn: async () => { throw new Error("ollama down"); }, topN: 5 });
  assert.equal(c1.rationale, undefined);
  assert.equal(out.length, 1);
});

test("annotateConnections: empty / non-array input is safe", async () => {
  assert.deepEqual(await annotateConnections([], { callFn: async () => "x" }), []);
  assert.equal(await annotateConnections(null, { callFn: async () => "x" }), null);
});
