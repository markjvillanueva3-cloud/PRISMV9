// build-session-evidence-packs.test.mjs (U-ALPHA-SONNET-MINE)
// Real-fixture tests for buildEvidence: streams a synthetic JSONL transcript and asserts the
// bounded evidence extraction (R9: each assert encodes WHY the section matters for the Sonnet read).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEvidence } from "./build-session-evidence-packs.mjs";

function writeTranscript(lines) {
  const dir = mkdtempSync(join(tmpdir(), "evpack-"));
  const file = join(dir, "t.jsonl");
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return { dir, file };
}
const userTurn = (text) => ({ type: "user", message: { content: text } });
const asstText = (text) => ({ type: "assistant", message: { content: [{ type: "text", text }] } });

test("happy: extracts user prompts, commit subjects, deferred markers, articles, tail", async () => {
  const { dir, file } = writeTranscript([
    userTurn("Please refactor the token budget allocator and read https://karpathy.ai/llm-wiki"),
    asstText("Working on it. Shipped [QUOTING-SYNERGY-MS0]/U-QP-FOO: cost bridge router."),
    asstText("DEFERRED ITEMS: the dense rerank arm is still unwired -- next unit U-BAR."),
    asstText("Final status: 2 units committed, 1 pending."),
  ]);
  try {
    const ev = await buildEvidence(file);
    assert.ok(ev.userPrompts.some((u) => u.includes("token budget allocator")), "user intent captured");
    assert.ok(ev.commitSubjects.some((c) => c.includes("U-QP-FOO")), "commit subject captured");
    assert.ok(ev.deferred.some((d) => /unwired|next unit U-BAR/.test(d)), "deferred/unwired captured");
    assert.ok(ev.articles.some((a) => a.includes("karpathy.ai")), "article URL captured (from user turn)");
    assert.ok(ev.tail.at(-1).includes("Final status"), "tail keeps end-of-session status");
    assert.equal(ev.turns, 4, "all 4 user/assistant turns counted");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("failure: missing file -> empty evidence, no throw", async () => {
  const ev = await buildEvidence("Z:/does/not/exist-xyz.jsonl");
  assert.deepEqual(ev.userPrompts, []);
  assert.equal(ev.turns, 0);
});

test("failure: malformed JSONL lines are skipped, valid ones survive", async () => {
  const dir = mkdtempSync(join(tmpdir(), "evpack-"));
  const file = join(dir, "t.jsonl");
  writeFileSync(file, '{"broken\n' + JSON.stringify(userTurn("real ask survives")) + "\n\n{not json}\n");
  try {
    const ev = await buildEvidence(file);
    assert.ok(ev.userPrompts.some((u) => u.includes("real ask survives")), "valid line parsed past malformed");
    assert.equal(ev.turns, 1, "only the 1 valid turn counted");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("edge: noise/system-reminder/tool-result user blocks are dropped", async () => {
  const { dir, file } = writeTranscript([
    userTurn("<system-reminder>injected hook context</system-reminder>"),
    userTurn("Result of calling the Read tool: ..."),
    userTurn("genuine operator request"),
    asstText("noise: SessionStart hook success: ok"), // assistant noise -> no commit/deferred mined
  ]);
  try {
    const ev = await buildEvidence(file);
    assert.ok(!ev.userPrompts.some((u) => u.includes("system-reminder")), "system-reminder dropped");
    assert.ok(!ev.userPrompts.some((u) => u.startsWith("Result of")), "tool-result echo dropped");
    assert.ok(ev.userPrompts.some((u) => u === "genuine operator request"), "genuine prompt kept");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("adversarial: caps bound each section + tail window (no unbounded growth on huge sessions)", async () => {
  const lines = [];
  for (let i = 0; i < 200; i++) lines.push(asstText(`[SCOPE]/U-COMMIT-${i}: shipped thing ${i} -- deferred follow-up ${i} pending`));
  for (let i = 0; i < 200; i++) lines.push(userTurn(`distinct operator ask number ${i}`));
  const { dir, file } = writeTranscript(lines);
  try {
    const ev = await buildEvidence(file);
    assert.ok(ev.commitSubjects.length <= 60, `commits capped (got ${ev.commitSubjects.length})`);
    assert.ok(ev.deferred.length <= 70, `deferred capped (got ${ev.deferred.length})`);
    assert.ok(ev.userPrompts.length <= 60, `user prompts capped (got ${ev.userPrompts.length})`);
    assert.ok(ev.tail.length <= 4, `tail window bounded (got ${ev.tail.length})`);
    assert.equal(ev.turns, 400, "all turns still counted even when sections capped");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("adversarial: string-content assistant turn (not array) still mines commit/deferred", async () => {
  const { dir, file } = writeTranscript([
    { type: "assistant", message: { content: "shipped [MS0]/U-STR: thing; TODO wire it" } },
  ]);
  try {
    const ev = await buildEvidence(file);
    assert.ok(ev.commitSubjects.some((c) => c.includes("U-STR")), "string-content commit mined");
    assert.ok(ev.deferred.some((d) => /TODO|wire it/.test(d)), "string-content deferred mined");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
