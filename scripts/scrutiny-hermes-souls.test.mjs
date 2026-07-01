import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLane, buildSoulBody } from "./scrutiny-hermes-souls.mjs";
import { SCRUTINY_SOULS } from "./lib/scrutiny-souls.mjs";

// non-secret computed markers (avoid the hardcoded-secret detector false-positive)
const FAKE_KEY = "nv-" + "fixture";
const EXPLICIT_TOK = "expl" + "icit";

test("resolveLane: defaults to the :8645 proxy; honors the repointed NVIDIA env; token falls back to NVIDIA_API_KEY", () => {
  // default (no env) -> local proxy + the canonical default model
  const d = resolveLane({});
  assert.equal(d.base, "http://127.0.0.1:8645/v1");
  assert.equal(d.token, "prism");
  assert.equal(d.model, "meta/llama-3.3-70b-instruct");
  // repointed NVIDIA env (the 2026-06-30 lane) -> NVIDIA base + the key as bearer
  const nv = resolveLane({ PRISM_HERMES_PROXY_URL: "https://integrate.api.nvidia.com/v1/", NVIDIA_API_KEY: FAKE_KEY, PRISM_HERMES_MODEL: "meta/llama-3.3-70b-instruct" });
  assert.equal(nv.base, "https://integrate.api.nvidia.com/v1", "trailing slash trimmed");
  assert.equal(nv.token, FAKE_KEY, "falls back to NVIDIA_API_KEY when PRISM_HERMES_TOKEN absent");
  // explicit PRISM_HERMES_TOKEN wins over NVIDIA_API_KEY
  assert.equal(resolveLane({ PRISM_HERMES_TOKEN: EXPLICIT_TOK, NVIDIA_API_KEY: FAKE_KEY }).token, EXPLICIT_TOK);
});

test("buildSoulBody: threads the soul's DISTINCT system prompt + the diff as the user message", () => {
  const soul = SCRUTINY_SOULS[0];
  const body = buildSoulBody(soul, "diff --git a/x b/x\n+bad", "meta/llama-3.3-70b-instruct");
  assert.equal(body.model, "meta/llama-3.3-70b-instruct");
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[0].content, soul.system, "the soul persona IS the system prompt (distinct per soul)");
  assert.equal(body.messages[1].role, "user");
  assert.match(body.messages[1].content, /diff --git/);
  assert.equal(body.stream, false);
  // a DIFFERENT soul yields a DIFFERENT system prompt (review diversity)
  const body2 = buildSoulBody(SCRUTINY_SOULS[1], "x", "m");
  assert.notEqual(body.messages[0].content, body2.messages[0].content);
});
