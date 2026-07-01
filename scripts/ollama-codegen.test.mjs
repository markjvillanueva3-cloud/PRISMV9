// scripts/ollama-codegen.test.mjs
// R9 tests for the coding-offload helper (U-OAB-U6). Pure-logic ONLY -- the live
// qwen2.5-coder generation is integration-validated by a live smoke at ship time, not here
// (hermetic: no network, no Ollama). These lock the two things that must be CORRECT for the
// offload to be safe: (1) extractExports finds exactly the exported symbols a reviewer must
// see covered, and (2) each prompt builder carries the guardrails that keep a local draft a
// DRAFT -- the TODO-placeholder rule (so gen-test output can't masquerade as real assertions),
// the [SCOPE]/U-ID form + "do not invent" (so commit-msg stays factual).
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractExports, genTestPrompt, commitMsgPrompt, explainPrompt, resolveCodeModel } from "./ollama-codegen.mjs";

test("extractExports: finds function/const/class/async/let/var exports, in order", () => {
  const src = [
    "export function alpha() {}",
    "export const bravo = 1;",
    "export class Charlie {}",
    "export async function delta() {}",
    "export let echo = 2;",
    "export var foxtrot = 3;",
  ].join("\n");
  assert.deepEqual(extractExports(src), ["alpha", "bravo", "Charlie", "delta", "echo", "foxtrot"]);
});

test("extractExports: ignores NON-exported declarations (the intent -- only the public surface)", () => {
  const src = "function privateHelper() {}\nconst internal = 5;\nexport function publicOne() {}";
  // privateHelper + internal are not exported -> a reviewer doesn't need tests for them
  assert.deepEqual(extractExports(src), ["publicOne"]);
});

test("extractExports: de-duplicates a re-declared name", () => {
  const src = "export function dup() {}\nexport function dup() {}"; // pathological, but must not double-list
  assert.deepEqual(extractExports(src), ["dup"]);
});

test("extractExports: empty / null source -> [] (no throw -- fail-soft on a missing read)", () => {
  assert.deepEqual(extractExports(""), []);
  assert.deepEqual(extractExports(null), []);
  assert.deepEqual(extractExports(undefined), []);
});

test("extractExports: a bare `export { x }` re-export is NOT a declaration (correctly skipped)", () => {
  // adversarial: re-export syntax has no function/const/class keyword -> must not false-match
  assert.deepEqual(extractExports("const x = 1;\nexport { x };"), []);
});

test("genTestPrompt: demands node:test + the TODO-placeholder rule (so a draft can't fake assertions)", () => {
  const p = genTestPrompt("scripts/foo.mjs", ["doThing", "helper"], "export function doThing(){}");
  assert.match(p, /node:test/);
  assert.match(p, /node:assert\/strict/);
  assert.match(p, /doThing, helper/);                 // the exports to cover
  assert.match(p, /TODO\(claude\): real reference value/); // R9 guard travels in the prompt
  assert.match(p, /scripts\/foo\.mjs/);
  assert.match(p, /export function doThing/);          // source slice included
});

test("genTestPrompt: no detected exports -> instructs the model to infer (never silently empty)", () => {
  const p = genTestPrompt("scripts/foo.mjs", [], "// no exports here");
  assert.match(p, /none detected -- infer from the source/);
});

test("commitMsgPrompt: carries the [SCOPE]/U-ID form + the anti-fabrication guard + the diff", () => {
  const p = commitMsgPrompt("diff --git a/x b/x\n+added line");
  assert.match(p, /\[SCOPE\]\/U-ID/);
  assert.match(p, /do not invent changes not in the diff/i);
  assert.match(p, /\+added line/);
});

test("explainPrompt: one-paragraph, cite-symbols, includes the source (read-offload contract)", () => {
  const p = explainPrompt("scripts/foo.mjs", "export const k = 1;");
  assert.match(p, /ONE paragraph/);
  assert.match(p, /cite symbol names/);
  assert.match(p, /scripts\/foo\.mjs/);
  assert.match(p, /export const k = 1;/);
});

// U-OAB-120B: gpt-oss:120b is the operator-set default coding-offload model (the strongest resident
// model); PRISM_CODEGEN_MODEL is the fleet/settings-wide override (e.g. to the qwen code-specialist).
test("resolveCodeModel: defaults to gpt-oss:120b; PRISM_CODEGEN_MODEL overrides fleet-wide", () => {
  assert.equal(resolveCodeModel({}), "gpt-oss:120b");                                                 // operator default
  assert.equal(resolveCodeModel({ PRISM_CODEGEN_MODEL: "qwen2.5-coder:32b" }), "qwen2.5-coder:32b");  // override to code-specialist
  assert.equal(resolveCodeModel({ PRISM_CODEGEN_MODEL: "gpt-oss:20b" }), "gpt-oss:20b");
});
