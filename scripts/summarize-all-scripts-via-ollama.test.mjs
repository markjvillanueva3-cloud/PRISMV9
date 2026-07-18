// Hermetic test for summarize-all-scripts-via-ollama.mjs host-aware-model wiring.
// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-CONSUMERS.
//
// Verifies the resolver-wiring INTENT (not a stub-assert):
//   (a) an explicit --model flag overrides the host-aware resolver,
//   (b) the DEFAULT_MODEL fallback is preserved when the resolver yields nothing
//       (Ollama down / router empty),
//   (c) the resolved model is threaded into the synth+preflight call (one model
//       identity for the whole run), and
//   (d) the cold-load timeout was raised to >= 120000ms for 32b.
//
// `explicitModelArg` is imported directly. `resolveSynthesisModel` is exercised
// through its injectable stubs (no GPU / Ollama / real hostname needed). The
// thread-through + timeout are asserted structurally against the source, because
// main() calls process.exit and is guarded against import.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { explicitModelArg } from "./summarize-all-scripts-via-ollama.mjs";
import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "summarize-all-scripts-via-ollama.mjs"), "utf8");

const DEFAULT_MODEL = "qwen2.5-coder:32b"; // mirrors the script's fallback const (post BLACKWELL-MODEL-UPGRADE-PLAN)

// node argv shape: [execPath, scriptPath, ...userArgs]
const argv = (...userArgs) => ["node", "summarize-all-scripts-via-ollama.mjs", ...userArgs];

test("explicitModelArg: --model <value> detected from raw argv", () => {
  assert.equal(explicitModelArg(argv("--model", "qwen2.5-coder:32b")), "qwen2.5-coder:32b");
});

test("explicitModelArg: --model=<value> form detected", () => {
  assert.equal(explicitModelArg(argv("--model=llama3.1:70b")), "llama3.1:70b");
});

test("explicitModelArg: returns null when no --model flag present", () => {
  // CRITICAL: must NOT confuse a parseArgs default with an explicit flag.
  assert.equal(explicitModelArg(argv("--dry-run", "--limit=5")), null);
  assert.equal(explicitModelArg(argv()), null);
});

test("explicitModelArg: --model with empty/missing value yields null (no false override)", () => {
  assert.equal(explicitModelArg(argv("--model")), null);
  assert.equal(explicitModelArg(argv("--model", "")), null);
  assert.equal(explicitModelArg(argv("--model=")), null);
});

test("(a) explicit --model override wins over host routing", async () => {
  const override = explicitModelArg(argv("--model", "qwen2.5-coder:32b"));
  const { model, source } = await resolveSynthesisModel({
    fallback: DEFAULT_MODEL,
    override,
    // these stubs would route to something else if override didn't win:
    detectHostClassFn: () => "home_blackwell",
    fetchModelsFn: async () => ["qwen2.5-coder:32b", "gpt-oss:120b"],
  });
  assert.equal(model, "qwen2.5-coder:32b");
  assert.equal(source, "override");
});

test("(b) DEFAULT_MODEL fallback preserved when resolver yields nothing (Ollama down)", async () => {
  const override = explicitModelArg(argv()); // null — no explicit flag
  const { model, source } = await resolveSynthesisModel({
    fallback: DEFAULT_MODEL,
    override,
    detectHostClassFn: () => "home_blackwell",
    fetchModelsFn: async () => [], // Ollama down → no installed models
  });
  assert.equal(model, DEFAULT_MODEL);
  assert.equal(source, "fallback");
});

test("(b2) Blackwell host with gpt-oss:120b installed upgrades past the 32b floor", async () => {
  const { model } = await resolveSynthesisModel({
    fallback: DEFAULT_MODEL, // qwen2.5-coder:32b — the kept floor
    override: null,
    detectHostClassFn: () => "home_blackwell",
    fetchModelsFn: async () => ["qwen2.5-coder:32b", "gpt-oss:120b"],
  });
  // The whole point of the wiring: on Blackwell we do NOT stay pinned to the
  // 32b floor when the bigger gpt-oss:120b (best tier) is resident.
  assert.equal(model, "gpt-oss:120b");
  assert.notEqual(model, DEFAULT_MODEL);
});

test("(c) source imports the resolver and resolves once in main()", () => {
  assert.match(
    SRC,
    /import\s*\{\s*resolveSynthesisModel\s*\}\s*from\s*["']\.\/lib\/host-aware-synthesis-model\.mjs["']/,
    "must import resolveSynthesisModel from sibling lib/"
  );
  assert.match(
    SRC,
    /resolveSynthesisModel\(\{[\s\S]*?fallback:\s*DEFAULT_MODEL[\s\S]*?override:\s*explicitModelArg\(process\.argv\)/,
    "must resolve with fallback=DEFAULT_MODEL and override from raw argv"
  );
});

test("(c2) resolved model is threaded into the synth call (not the hardcoded const)", () => {
  // The call site passes resolvedModel as the 3rd arg.
  assert.match(
    SRC,
    /ollamaSummarize\(path\.basename\(file\),\s*content,\s*resolvedModel\)/,
    "ollamaSummarize must receive the resolved model"
  );
  // The fetch body must use the `model` parameter, NOT a re-inlined OLLAMA_MODEL const.
  assert.match(
    SRC,
    /JSON\.stringify\(\{\s*model,\s*prompt,/,
    "synth request body must use the threaded `model` param"
  );
  assert.doesNotMatch(
    SRC,
    /body:\s*JSON\.stringify\(\{\s*model:\s*OLLAMA_MODEL/,
    "must not reference the removed OLLAMA_MODEL const in the request body"
  );
});

test("(d) cold-load timeout raised to >= 120000ms for 32b", () => {
  const m = SRC.match(/OLLAMA_TIMEOUT_MS\s*=\s*([\d_]+)/);
  assert.ok(m, "OLLAMA_TIMEOUT_MS const must be present");
  const ms = Number(m[1].replace(/_/g, ""));
  assert.ok(ms >= 120000, `timeout must be >= 120000ms, got ${ms}`);
});
