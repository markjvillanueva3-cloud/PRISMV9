// tier: T4
// Tests for scripts/lib/host-aware-synthesis-model.mjs
// (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE + U-BW-RESEARCH-REFINE).
//
// node:test (not vitest) — matches the sibling scripts/lib/*.test.mjs convention
// and is immune to the repo's vitest/config resolution bug.
//
// Fixtures model the POST-retirement world (BLACKWELL-MODEL-UPGRADE-PLAN, 2026-06-04):
// the small coders (3b/7b/14b) + deepseek-r1:14b were DELETED, so no fixture names
// them — the kept floor is qwen2.5-coder:32b and the pulled best is gpt-oss:120b/20b.
//
// Run: node --test H:/prism/scripts/lib/host-aware-synthesis-model.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSynthesisModel,
  fetchInstalledModels,
  OLLAMA_TAGS_URL,
} from "./host-aware-synthesis-model.mjs";

// The kept floor + embed: what the Blackwell holds right now (gpt-oss pull pending).
const BLACKWELL_INSTALL = ["qwen2.5-coder:32b", "nomic-embed-text:latest"];
// The target install once golf's pull lands: gpt-oss:120b is the best-tier winner.
const BLACKWELL_FULL = ["gpt-oss:120b", "gpt-oss:20b", "qwen2.5-coder:32b", "nomic-embed-text:latest"];
// A floor every test passes as the fail-soft fallback (the kept model).
const FLOOR = "qwen2.5-coder:32b";

// ── resolveSynthesisModel ────────────────────────────────────────────────────

test("explicit override always wins (operator intent), no host/IO touched", async () => {
  let touched = false;
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    override: "  gpt-oss:120b  ",
    detectHostClassFn: () => { touched = true; return "home_blackwell"; },
    fetchModelsFn: async () => { touched = true; return BLACKWELL_FULL; },
  });
  assert.equal(r.model, "gpt-oss:120b"); // trimmed
  assert.equal(r.source, "override");
  assert.equal(touched, false, "override must short-circuit before any IO");
});

test("blackwell + only the 32B held → synthesis routes to the 32B best tier", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    available: BLACKWELL_INSTALL,
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.source, "blackwell-best");
  assert.equal(r.tier, "best");
});

test("blackwell + gpt-oss:120b held → routes to the 120B MoE (research winner, best tier)", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    available: BLACKWELL_FULL,
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:120b"); // best[0] — preferred ahead of the 32B
  assert.equal(r.source, "blackwell-best");
  assert.equal(r.tier, "best");
});

test("blackwell WITHOUT a best-tier model held → honest degrade to strong (gpt-oss:20b), source=router", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    available: ["gpt-oss:20b"], // strong tier only, no best
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.source, "router"); // NOT blackwell-best — no best-tier model fired
});

test("weak host (no profile) with a balanced model resolves balanced, source=router", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    available: ["qwen2.5:7b"], // a kept balanced-tier model
    hardware: null, // unknown host — no Blackwell promotion
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.source, "router");
});

test("ollama down (no installed models) → conservative fallback, never crashes", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    fetchModelsFn: async () => [], // simulate /api/tags empty / unreachable
    hardware: "home_blackwell",
  });
  assert.equal(r.model, FLOOR);
  assert.equal(r.source, "fallback");
  assert.match(r.reason, /no installed models/);
});

test("detectHostClassFn is used when hardware is not passed", async () => {
  const r = await resolveSynthesisModel({
    fallback: FLOOR,
    available: BLACKWELL_INSTALL,
    detectHostClassFn: () => "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.source, "blackwell-best");
});

test("missing fallback is a programmer error → throws", async () => {
  await assert.rejects(
    () => resolveSynthesisModel({ available: BLACKWELL_INSTALL, hardware: "home_blackwell" }),
    /non-empty string `fallback`/,
  );
  await assert.rejects(
    () => resolveSynthesisModel({ fallback: "", available: BLACKWELL_INSTALL }),
    /non-empty string `fallback`/,
  );
});

test("only a tiny model installed on blackwell → router picks the installed model, never a phantom fallback", async () => {
  // search_synthesis base tier is `balanced`; with only a cheap model held the
  // router falls back to the sole installed model rather than returning an
  // uninstalled floor that would cold-load-fail. Resolver surfaces that honestly.
  const r = await resolveSynthesisModel({
    fallback: FLOOR, // NOT installed in this scenario
    available: ["qwen2.5:3b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5:3b"); // installed-and-served, not the phantom floor
  assert.equal(r.source, "router");
});

// ── fetchInstalledModels (fail-soft /api/tags reader) ────────────────────────

test("fetchInstalledModels parses the /api/tags shape", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ models: [{ name: "qwen2.5-coder:32b" }, { name: "nomic-embed-text:latest" }] }),
  });
  const got = await fetchInstalledModels({ fetchImpl });
  assert.deepEqual(got, ["qwen2.5-coder:32b", "nomic-embed-text:latest"]);
});

test("fetchInstalledModels returns [] on non-ok response", async () => {
  const got = await fetchInstalledModels({ fetchImpl: async () => ({ ok: false }) });
  assert.deepEqual(got, []);
});

test("fetchInstalledModels returns [] when fetch throws (ollama down)", async () => {
  const got = await fetchInstalledModels({ fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.deepEqual(got, []);
});

test("fetchInstalledModels tolerates a malformed body (no models array / non-string names)", async () => {
  const got = await fetchInstalledModels({
    fetchImpl: async () => ({ ok: true, json: async () => ({ models: [{ noName: 1 }, "garbage", { name: "qwen2.5-coder:32b" }] }) }),
  });
  assert.deepEqual(got, ["qwen2.5-coder:32b"]); // drops the junk, keeps the valid name
});

test("OLLAMA_TAGS_URL defaults to the local Ollama endpoint", () => {
  assert.match(OLLAMA_TAGS_URL, /\/api\/tags$/);
});
