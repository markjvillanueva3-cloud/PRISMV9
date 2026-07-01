// scripts/mine-india-transcripts.test.mjs -- node:test for the india transcript-miner's pure filters.
// Covers the two DELTAS from the hotel miner: AI-topic discovery (isIndiaTopic / INDIA_TOPIC_RE) and
// the anchored harness-noise filter (isNoise). The Ollama/fs map-reduce shell is integration-tested
// via a --limit 1 live dry-run (see the commit), not here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isIndiaTopic, isNoise, INDIA_TOPIC_RE, makeLimiter, buildVaultDoc, parseCoverage } from "./mine-india-transcripts.mjs";

// -- isIndiaTopic: discovery spans india-slot UNION AI-systems topics ---------
test("matches slot:india handoffs", () => {
  assert.equal(isIndiaTopic("HANDOFF-claude-abcd1234-india-foo.md"), "abcd1234");
  assert.equal(isIndiaTopic("HANDOFF-claude-ABCD1234-india.md"), "abcd1234"); // lowercased
});

test("matches AI-systems topics regardless of slot (the whole point of the delta)", () => {
  assert.equal(isIndiaTopic("HANDOFF-claude-7bfff7a4-blackwell-ai-ms0.md"), "7bfff7a4");
  assert.equal(isIndiaTopic("HANDOFF-claude-deadbeef-nn-graph-ms2.md"), "deadbeef");
  assert.equal(isIndiaTopic("HANDOFF-claude-cafe0001-psn-octopus-fleet-synergy.md"), "cafe0001");
  assert.equal(isIndiaTopic("HANDOFF-claude-cafe0002-system-viz-brain.md"), "cafe0002");
  assert.equal(isIndiaTopic("HANDOFF-claude-cafe0003-rag-upgrade.md"), "cafe0003");
});

test("rejects non-AI topics + malformed names (no false positives)", () => {
  assert.equal(isIndiaTopic("HANDOFF-claude-11112222-quoting-synergy.md"), null);
  assert.equal(isIndiaTopic("HANDOFF-claude-11113333-payroll-wire.md"), null);
  // "storage" contains "rag" but NOT as a -_/boundary token -> must NOT match (anchored).
  assert.equal(isIndiaTopic("HANDOFF-claude-11114444-storage-fix.md"), null);
  assert.equal(isIndiaTopic("HANDOFF-golf-golf-cad-fusion-live.md"), null); // not the claude-<8hex> shape
  assert.equal(isIndiaTopic("random.md"), null);
});

test("INDIA_TOPIC_RE is word-anchored (boundary, not bare substring)", () => {
  assert.ok(INDIA_TOPIC_RE.test("gnn"));
  assert.ok(INDIA_TOPIC_RE.test("lora-finetune"));
  assert.ok(INDIA_TOPIC_RE.test("foo-psn-bar"));
  assert.equal(INDIA_TOPIC_RE.test("storage"), false); // 'rag' substring, not bounded
  assert.equal(INDIA_TOPIC_RE.test("quoting"), false);
});

// -- isNoise: anchored boilerplate filter, keeps prose that merely MENTIONS a phrase --
test("flags harness boilerplate by anchored prefix", () => {
  assert.equal(isNoise("<system-reminder>\nfoo"), true);
  assert.equal(isNoise("UserPromptSubmit hook additional context: ..."), true);
  assert.equal(isNoise("PreToolUse:Read hook ..."), true);
  assert.equal(isNoise("# claudeMd\n..."), true);
  assert.equal(isNoise(""), true);
  assert.equal(isNoise("   "), true);
});

test("keeps real assistant prose that MENTIONS a hook name mid-sentence (anchored, not free includes)", () => {
  // This is the exact tribal-reasoning the miner must NOT drop (hotel reviewer P1).
  assert.equal(isNoise("I analyzed the PreToolUse hook and found the gate blocks on uncommitted changes."), false);
  assert.equal(isNoise("The system-reminder injection pattern is what we route through."), false);
  assert.equal(isNoise("Wired the GNN tier-5 classifier; AUROC 0.808 selective-deploy."), false);
});

// -- makeLimiter: the concurrency cap that keeps Ollama in-flight <= OLLAMA_NUM_PARALLEL --
test("makeLimiter caps in-flight to max and runs every task, results in call order", async () => {
  const limit = makeLimiter(2);
  let active = 0, maxActive = 0;
  const task = (v) => limit(async () => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 15));
    active--; return v;
  });
  const results = await Promise.all([1, 2, 3, 4, 5].map(task));
  assert.deepEqual(results, [1, 2, 3, 4, 5]);
  assert.ok(maxActive <= 2, `maxActive ${maxActive} must be <= 2`);
  assert.equal(active, 0);
});

test("makeLimiter(1) serializes -- the second task cannot start until the first finishes", async () => {
  const limit = makeLimiter(1);
  const order = [];
  await Promise.all([
    limit(async () => { order.push("a-start"); await new Promise((r) => setTimeout(r, 10)); order.push("a-end"); }),
    limit(async () => { order.push("b-start"); order.push("b-end"); }),
  ]);
  assert.deepEqual(order, ["a-start", "a-end", "b-start", "b-end"]);
});

test("makeLimiter propagates a rejection without wedging the queue", async () => {
  const limit = makeLimiter(1);
  await assert.rejects(() => limit(async () => { throw new Error("boom"); }), /boom/);
  assert.equal(await limit(async () => 42), 42); // queue still pumps after a rejection
});

test("makeLimiter handles a SYNCHRONOUS throw inside fn (routed via .then(fn)) without wedging", async () => {
  const limit = makeLimiter(1);
  await assert.rejects(() => limit(() => { throw new Error("sync-boom"); }), /sync-boom/);
  assert.equal(await limit(async () => 7), 7); // slot released even on a sync throw
});

// -- vault doc: honest coverage frontmatter + the shrink-guard's machine-readable input --
test("buildVaultDoc emits tribal-embeddable frontmatter with HONEST machine-readable coverage", () => {
  const doc = buildVaultDoc("BODYTEXT", 2, 84, "2026-06-09");
  assert.match(doc, /name: reference_india_transcript_synthesis/);
  assert.match(doc, /node_type: memory/);
  assert.match(doc, /type: reference/);
  assert.match(doc, /coverage_sessions: 2/);
  assert.match(doc, /mineable_sessions: 84/);
  assert.match(doc, /2 of 84 mineable sessions/); // partial coverage stated in the body header (R12)
  assert.ok(doc.includes("BODYTEXT"));
});

test("parseCoverage round-trips buildVaultDoc + returns 0 when absent (shrink-guard input)", () => {
  assert.equal(parseCoverage(buildVaultDoc("x", 7, 84, "d")), 7);
  assert.equal(parseCoverage("no frontmatter here"), 0);
  assert.equal(parseCoverage(null), 0);
});
