/**
 * Tests for grok-capability-rank.mjs -- the "grok highest capability" resolver.
 * R9: every assert encodes WHY -- the resolved id must be the most capable model, not
 * the first listed, and must preserve the codebase's documented capability ordering.
 * Run: node scripts/lib/grok-capability-rank.test.mjs   (node:test auto-runs on exit)
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  rankGrokModel,
  pickHighestCapabilityGrok,
  resolveHighestCapabilityModel,
  isGrokId,
  isNonChatModel,
  pickServedChatModel,
  GROK_CAPABILITY_DEFAULT,
} from "./grok-capability-rank.mjs";

// The live id set the operator's proxy could serve (every id appears in the repo today:
// GrokClientEngine lineup + ask-hermes fallback + octopus multimodel tests).
const LIVE_IDS = [
  "grok-3",
  "grok-4",
  "grok-4.3",
  "grok-4.20-0309-reasoning",
  "grok-4-mini",
  "grok-code-fast-1",
];

test("rankGrokModel: version dominates -- grok-4.3 > grok-4 > grok-3", () => {
  assert.ok(rankGrokModel("grok-4.3") > rankGrokModel("grok-4"), "minor version raises capability");
  assert.ok(rankGrokModel("grok-4") > rankGrokModel("grok-3"), "major version raises capability");
});

test("rankGrokModel: documented order grok-4 > grok-4-mini > grok-3 > grok-3-mini > grok-code-fast-1", () => {
  // EXACTLY the GrokClientEngine.ts:22 descending lineup -- the ranker must not reorder it.
  const order = ["grok-4", "grok-4-mini", "grok-3", "grok-3-mini", "grok-code-fast-1"];
  for (let i = 0; i < order.length - 1; i++) {
    assert.ok(
      rankGrokModel(order[i]) > rankGrokModel(order[i + 1]),
      `${order[i]} must out-rank ${order[i + 1]}`,
    );
  }
});

test("rankGrokModel: a reasoning tier out-ranks the plain same-version sibling", () => {
  assert.ok(
    rankGrokModel("grok-4.20-0309-reasoning") > rankGrokModel("grok-4.20-0309"),
    "reasoning variant is the more-capable tier",
  );
  // and it tops the whole live set (highest minor + reasoning bonus)
  assert.equal(pickHighestCapabilityGrok(LIVE_IDS), "grok-4.20-0309-reasoning");
});

test("rankGrokModel: a small variant is penalised below its full sibling but a newer-gen mini still beats an older full", () => {
  assert.ok(rankGrokModel("grok-4") > rankGrokModel("grok-4-mini"), "mini < full of same gen");
  assert.ok(rankGrokModel("grok-4-mini") > rankGrokModel("grok-3"), "newer mini > older full (matches docs)");
});

test("rankGrokModel: non-grok is selectable-but-last; blank/non-string is never selectable", () => {
  assert.ok(rankGrokModel("llama-3.1") > -Infinity, "a real non-grok id is a finite last resort");
  assert.ok(rankGrokModel("grok-3") > rankGrokModel("llama-3.1"), "any grok out-ranks a non-grok");
  assert.equal(rankGrokModel(""), -Infinity);
  assert.equal(rankGrokModel("   "), -Infinity);
  assert.equal(rankGrokModel(null), -Infinity);
  assert.equal(rankGrokModel(undefined), -Infinity);
  assert.equal(rankGrokModel(42), -Infinity);
});

test("rankGrokModel: non-reasoning variant does NOT earn the reasoning bonus (real xAI grok-4-fast family)", () => {
  // grok-4-fast-reasoning vs grok-4-fast-non-reasoning -- both real xAI ids; the bare
  // 'reasoning' inside 'non-reasoning' must not tie them.
  assert.ok(
    rankGrokModel("grok-4-fast-reasoning") > rankGrokModel("grok-4-fast-non-reasoning"),
    "the reasoning variant must out-rank its non-reasoning sibling",
  );
  assert.equal(
    pickHighestCapabilityGrok(["grok-4-fast-non-reasoning", "grok-4-fast-reasoning"]),
    "grok-4-fast-reasoning",
    "even when the non-reasoning id is listed first, reasoning wins",
  );
});

test("rankGrokModel: each small marker is penalised (grok-3-mini-fast < grok-3-mini)", () => {
  assert.ok(
    rankGrokModel("grok-3-mini") > rankGrokModel("grok-3-mini-fast"),
    "two small markers penalise more than one",
  );
  assert.ok(rankGrokModel("grok-3-mini-fast") > rankGrokModel("grok-code-fast-1"), "still a real grok");
});

test("pickHighestCapabilityGrok: picks the max, not the first listed (the whole point)", () => {
  // grok-3 is FIRST -- the old resolvers returned it; we must return the most capable instead.
  assert.equal(pickHighestCapabilityGrok(["grok-3", "grok-4.3"]), "grok-4.3");
  assert.equal(pickHighestCapabilityGrok(["grok-3", "grok-3-mini"]), "grok-3");
});

test("pickHighestCapabilityGrok: stable on a tie -- first id at top score wins", () => {
  assert.equal(pickHighestCapabilityGrok(["grok-4", "grok-4"]), "grok-4");
  // identical score, different ids -> first wins
  assert.equal(pickHighestCapabilityGrok(["grok-4.3", "grok-04.3"]), "grok-4.3");
});

test("pickHighestCapabilityGrok: only non-grok listed -> still returns one (never drops a served model)", () => {
  assert.equal(pickHighestCapabilityGrok(["llama-3.1", "qwen2.5-coder:32b"]), "llama-3.1");
});

test("pickHighestCapabilityGrok: empty / non-array / all-blank -> null", () => {
  assert.equal(pickHighestCapabilityGrok([]), null);
  assert.equal(pickHighestCapabilityGrok(null), null);
  assert.equal(pickHighestCapabilityGrok("grok-4"), null); // a bare string is not a list
  assert.equal(pickHighestCapabilityGrok(["", "  ", null]), null);
});

test("resolveHighestCapabilityModel: explicit per-call --model wins over everything", () => {
  const r = resolveHighestCapabilityModel({
    explicit: "grok-pinned",
    preferred: "grok-4.20-0309-reasoning",
    listed: ["grok-4.3"],
    fallback: GROK_CAPABILITY_DEFAULT,
  });
  assert.deepEqual(r, { model: "grok-pinned", source: "explicit" });
});

test("resolveHighestCapabilityModel: preferred pin wins over auto-ranking but not over explicit", () => {
  const r = resolveHighestCapabilityModel({
    preferred: "grok-5-superduper", // a future id the operator named; not in the list yet
    listed: ["grok-3", "grok-4.3"],
    fallback: GROK_CAPABILITY_DEFAULT,
  });
  assert.deepEqual(r, { model: "grok-5-superduper", source: "preferred" });
});

test("resolveHighestCapabilityModel: no explicit/preferred -> highest of the live list", () => {
  const r = resolveHighestCapabilityModel({ listed: LIVE_IDS, fallback: GROK_CAPABILITY_DEFAULT });
  assert.deepEqual(r, { model: "grok-4.20-0309-reasoning", source: "listed" });
});

test("resolveHighestCapabilityModel: nothing listed -> configured fallback (proxy-down path)", () => {
  const r = resolveHighestCapabilityModel({ listed: [], fallback: GROK_CAPABILITY_DEFAULT });
  assert.deepEqual(r, { model: "grok-4.3", source: "fallback" });
});

test("resolveHighestCapabilityModel: single-string listed back-compat (old first-id resolvers)", () => {
  // old pickModel({explicit:null, listed:'llama', fallback}) -> 'llama' via listed
  const r = resolveHighestCapabilityModel({ listed: "llama", fallback: "grok-4.3" });
  assert.deepEqual(r, { model: "llama", source: "listed" });
});

test("resolveHighestCapabilityModel: blank explicit/listed -> fallback (no crash)", () => {
  const r = resolveHighestCapabilityModel({ explicit: "", listed: "", fallback: "grok-4.3" });
  assert.deepEqual(r, { model: "grok-4.3", source: "fallback" });
});

test("resolveHighestCapabilityModel: nothing at all -> {null, none}", () => {
  assert.deepEqual(resolveHighestCapabilityModel({}), { model: null, source: "none" });
});

test("isGrokId / isNonChatModel: pure lane classifiers (chat models never flagged non-chat)", () => {
  assert.equal(isGrokId("grok-4.3"), true);
  assert.equal(isGrokId("Grok-3-mini"), true);
  assert.equal(isGrokId("meta/llama-3.3-70b-instruct"), false);
  assert.equal(isGrokId(null), false);
  assert.equal(isNonChatModel("baai/bge-m3"), true);
  assert.equal(isNonChatModel("nvidia/embed-qa-4"), true);
  assert.equal(isNonChatModel("nvidia/llama-3.1-nemoguard-8b-content-safety"), true);
  assert.equal(isNonChatModel("meta/llama-guard-4-12b"), true);
  assert.equal(isNonChatModel("meta/llama-3.3-70b-instruct"), false);
  assert.equal(isNonChatModel("01-ai/yi-large"), false);
});

test("isNonChatModel: whole-token boundary -- a chat id that merely STARTS with a marker token is NOT flagged", () => {
  // right-boundary fix: 'guard'/'parse'/'embed' must be a whole id SEGMENT, not a prefix, so a future
  // chat model whose id begins with a marker token is not wrongly excluded.
  assert.equal(isNonChatModel("xai/guardrails-chat"), false, "guard-prefix is not a guard segment");
  assert.equal(isNonChatModel("acme/parser-assistant"), false, "parse-prefix is not a parse segment");
  assert.equal(isNonChatModel("acme/embedded-agent-chat"), false, "embed-prefix is not an embed segment");
  // regression: every real whole-segment non-chat id is STILL flagged (no false negatives from the boundary)
  assert.equal(isNonChatModel("nvidia/embed-qa-4"), true);
  assert.equal(isNonChatModel("nvidia/nv-embedqa-e5-v5"), true);
  assert.equal(isNonChatModel("meta/llama-guard-4-12b"), true);
  assert.equal(isNonChatModel("baai/bge-m3"), true);
  assert.equal(isNonChatModel("nvidia/nemotron-parse"), true);
  assert.equal(isNonChatModel("snowflake/arctic-embed-l"), true);
  assert.equal(isNonChatModel("nvidia/llama-3.1-nemoguard-8b-content-safety"), true);
});

test("pickServedChatModel: served fallback > first served chat > fallback last-resort", () => {
  assert.equal(pickServedChatModel(["a", "meta/llama-3.3-70b-instruct"], "meta/llama-3.3-70b-instruct"), "meta/llama-3.3-70b-instruct");
  assert.equal(pickServedChatModel(["baai/bge-m3", "meta/llama-3.1-8b-instruct"], "unserved/x"), "meta/llama-3.1-8b-instruct");
  assert.equal(pickServedChatModel(["baai/bge-m3", "nvidia/embed-qa-4"], "cfg/fallback"), "cfg/fallback");
  assert.equal(pickServedChatModel([], "cfg/fallback"), "cfg/fallback");
});

test("resolveHighestCapabilityModel: NON-grok lane (NVIDIA) resolves to the served model, never a non-chat first-listed id (ask-hermes no-model-404 fix)", () => {
  // REGRESSION (R9): the realistic NVIDIA list LEADS with an embedding; the OLD resolver returned it
  // (nvidia/embed-qa-4 -> 404). The fix returns the configured served meta/llama-3.3-70b-instruct.
  const nvidia = ["nvidia/embed-qa-4", "01-ai/yi-large", "meta/llama-3.3-70b-instruct", "baai/bge-m3"];
  assert.deepEqual(
    resolveHighestCapabilityModel({ listed: nvidia, fallback: "meta/llama-3.3-70b-instruct" }),
    { model: "meta/llama-3.3-70b-instruct", source: "listed" },
  );
  // fallback NOT served + a non-chat model listed first -> first served CHAT model (skips the embedding)
  assert.deepEqual(
    resolveHighestCapabilityModel({ listed: ["baai/bge-m3", "meta/llama-3.1-8b-instruct"], fallback: "unserved/x" }),
    { model: "meta/llama-3.1-8b-instruct", source: "listed" },
  );
  // ONLY non-chat models served -> last-resort configured fallback (source 'fallback', never an embedding)
  assert.deepEqual(
    resolveHighestCapabilityModel({ listed: ["baai/bge-m3", "nvidia/embed-qa-4"], fallback: "meta/llama-3.3-70b-instruct" }),
    { model: "meta/llama-3.3-70b-instruct", source: "fallback" },
  );
  // grok lane UNCHANGED: a list containing grok still ranks the highest-capability grok
  assert.deepEqual(
    resolveHighestCapabilityModel({ listed: ["grok-3", "grok-4.3", "meta/llama-3.3-70b-instruct"], fallback: "x" }),
    { model: "grok-4.3", source: "listed" },
  );
});

test("GROK_CAPABILITY_DEFAULT is the proven served id", () => {
  assert.equal(GROK_CAPABILITY_DEFAULT, "grok-4.3");
});
