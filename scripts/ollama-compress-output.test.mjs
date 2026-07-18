// scripts/ollama-compress-output.test.mjs
// R9 tests for U-OAB-U4. The load-bearing guard is the fail-CLOSED safety denylist (a lossy summary
// of G-code/units/physics output is a correctness hazard) and the fail-OPEN LLM path (a down/slow
// Ollama must never block or corrupt the pipe). IO (fetch) is injected -- no live Ollama needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  containsSafetyCritical,
  decideCompress,
  qualityOk,
  compressViaOllama,
  runCompress,
} from "./ollama-compress-output.mjs";

const big = (s) => s.repeat(Math.ceil((9 * 1024) / s.length)); // > 8KB
const SAFE_BIG = big("INFO build step completed in 12 seconds; 0 errors, 3 warnings. ");
const SAFETY_BIG = SAFE_BIG + "\nG1 X1.5 Y2.0 F300\nS5000 M03\n"; // same bulk + a G-code/feed tail

test("containsSafetyCritical: G-code / units / feed-speed / physics markers -> true (fail-closed triggers)", () => {
  assert.equal(containsSafetyCritical("G1 X1.5 Y2.0 F300"), true);       // motion + feed
  assert.equal(containsSafetyCritical("G21 ; program in metric"), true); // units mm
  assert.equal(containsSafetyCritical("G20 ; inch"), true);              // units inch
  assert.equal(containsSafetyCritical("S5000 M03 spindle on"), true);    // spindle address
  assert.equal(containsSafetyCritical("kienzle cutting force = 1800"), true);
  assert.equal(containsSafetyCritical("spindle speed 5000 rpm"), true);
  assert.equal(containsSafetyCritical("chip load 0.002 ipr"), true);
  assert.equal(containsSafetyCritical("kc1.1 = 1800"), true);     // Kienzle coefficient WITHOUT the word "kienzle"
  assert.equal(containsSafetyCritical("spindle at 5000"), true);  // spindle near a number (prose, no rpm/S-word)
});

test("containsSafetyCritical: ordinary command output -> false (don't over-block real logs)", () => {
  assert.equal(containsSafetyCritical("INFO build completed in 12 seconds"), false);
  assert.equal(containsSafetyCritical("ERROR: module not found at index.js"), false);
  assert.equal(containsSafetyCritical("deleted 3 orphan files, freed 1.2 GB"), false);
  assert.equal(containsSafetyCritical("warning: unused variable in parser"), false);
  assert.equal(containsSafetyCritical(""), false);
  assert.equal(containsSafetyCritical(null), false);
});

test("decideCompress: small input -> no (size gate)", () => {
  const d = decideCompress("tiny log");
  assert.equal(d.compress, false);
  assert.match(d.reason, /size gate/);
});

test("decideCompress: large + safety markers -> no (fail-closed denylist)", () => {
  const d = decideCompress(SAFETY_BIG);
  assert.equal(d.compress, false);
  assert.match(d.reason, /safety-critical/);
});

test("decideCompress: large + safe -> yes", () => {
  const d = decideCompress(SAFE_BIG);
  assert.equal(d.compress, true);
});

test("qualityOk: shorter-than-ratio non-empty summary -> true; near-raw or empty -> false", () => {
  const raw = "x".repeat(1000);
  assert.equal(qualityOk(raw, "short gist"), true);          // 10 bytes << 850
  assert.equal(qualityOk(raw, "y".repeat(900)), false);      // 900 >= 0.85*1000
  assert.equal(qualityOk(raw, "   "), false);                // whitespace-only
  assert.equal(qualityOk(raw, ""), false);
});

test("compressViaOllama: FAIL-OPEN -> null on throw / non-200 / empty response", async () => {
  assert.equal(await compressViaOllama("x", { fetchImpl: async () => { throw new Error("down"); } }), null);
  assert.equal(await compressViaOllama("x", { fetchImpl: async () => ({ ok: false, status: 500 }) }), null);
  assert.equal(await compressViaOllama("x", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: "" }) }) }), null);
});

test("compressViaOllama: returns the trimmed summary on a good response", async () => {
  const out = await compressViaOllama("big output", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: "  the gist  " }) }) });
  assert.equal(out, "the gist");
});

test("runCompress: small input -> passthrough verbatim (size gate)", async () => {
  const r = await runCompress({ input: "small", fetchImpl: async () => ({ ok: true, json: async () => ({ response: "X" }) }) });
  assert.equal(r.action, "passthrough");
  assert.equal(r.output, "small"); // byte-identical
});

test("runCompress: large SAFETY output -> passthrough VERBATIM, LLM never called (fail-closed)", async () => {
  let called = false;
  const r = await runCompress({ input: SAFETY_BIG, fetchImpl: async () => { called = true; return { ok: true, json: async () => ({ response: "lossy" }) }; } });
  assert.equal(r.action, "passthrough");
  assert.equal(r.output, SAFETY_BIG);   // exact bytes preserved -- no lossy compression of G-code/feed
  assert.equal(called, false);          // the model was never even asked
});

test("runCompress: large safe output + good LLM -> compress with footer", async () => {
  const r = await runCompress({ input: SAFE_BIG, fetchImpl: async () => ({ ok: true, json: async () => ({ response: "- build ok\n- 0 errors\n- 3 warnings" }) }) });
  assert.equal(r.action, "compress");
  assert.match(r.output, /build ok/);
  assert.match(r.output, /SUMMARY ONLY/);              // honest footer
  assert.ok(r.output.length < SAFE_BIG.length);        // actually shorter
});

test("runCompress: large safe output + LLM down -> passthrough raw (FAIL-OPEN, never blocks the pipe)", async () => {
  const r = await runCompress({ input: SAFE_BIG, fetchImpl: async () => { throw new Error("ollama down"); } });
  assert.equal(r.action, "passthrough");
  assert.equal(r.output, SAFE_BIG);
  assert.match(r.reason, /fail-open/);
});

test("runCompress: summary not meaningfully shorter -> passthrough raw (quality floor)", async () => {
  // LLM echoes near-raw length -> below quality floor -> raw passes
  const r = await runCompress({ input: SAFE_BIG, fetchImpl: async () => ({ ok: true, json: async () => ({ response: SAFE_BIG }) }) });
  assert.equal(r.action, "passthrough");
  assert.match(r.reason, /quality floor/);
});

// --- reviewer P0/P1: the bypass class -- lowercase + no-space posts must STILL fail-closed ---
// The original denylist (trailing \b, no /i) let "g01x1.5f300" / "s5000m03" / "m8" / "t01" through ->
// a real NC stream would have been lossy-summarised. These lock the fix; they FAIL against that denylist.
const SAFETY_LOWER_NOSPACE = SAFE_BIG + "\ng1x1.5y2.0f300\ns5000m03\n";

test("containsSafetyCritical: lowercase + no-space posts (the P0 bypass class) -> true", () => {
  assert.equal(containsSafetyCritical("g01x1.5y2.0f300"), true); // no-space motion+feed
  assert.equal(containsSafetyCritical("s5000m03"), true);        // no-space spindle+M
  assert.equal(containsSafetyCritical("m8"), true);              // lowercase coolant
  assert.equal(containsSafetyCritical("g21"), true);             // lowercase units mm
  assert.equal(containsSafetyCritical("t01 ; tool"), true);      // lowercase tool
  assert.equal(containsSafetyCritical("f12.5"), true);           // lowercase feed
});

test("runCompress: lowercase/no-space SAFETY output -> passthrough VERBATIM, LLM never called", async () => {
  let called = false;
  const r = await runCompress({ input: SAFETY_LOWER_NOSPACE, fetchImpl: async () => { called = true; return { ok: true, json: async () => ({ response: "lossy" }) }; } });
  assert.equal(r.action, "passthrough");
  assert.equal(r.output, SAFETY_LOWER_NOSPACE); // exact bytes -- the bypass is closed
  assert.equal(called, false);                  // model never invoked on safety data
});

test("runCompress: input over maxSendBytes -> footer DISCLOSES truncation (R12 honesty)", async () => {
  // SAFE_BIG (~9KB) with a 1KB send cap -> truncated before the LLM saw the tail.
  const r = await runCompress({ input: SAFE_BIG, maxSendBytes: 1024, fetchImpl: async () => ({ ok: true, json: async () => ({ response: "tiny gist" }) }) });
  assert.equal(r.action, "compress");
  assert.match(r.output, /INPUT TRUNCATED to 1KB/);
  assert.match(r.output, /tail was NOT seen/);
});
